import { CASH_EQUIVALENT_ASSET_TYPES } from "@/lib/constants/asset-types";
import { buildPortfolioReview } from "@/lib/engines/portfolio-review-engine";
import type {
  AppState,
  ProductUniverseItem,
  TradeRiskCheckResult,
  TradingExecutionMode,
  TradingOrderSide
} from "@/lib/types";
import { formatKrw } from "@/lib/utils/currency";
import { clamp, roundTo } from "@/lib/utils/percentage";

function getCashAmountKrw(state: AppState) {
  return state.assets
    .filter((asset) => CASH_EQUIVALENT_ASSET_TYPES.includes(asset.assetType))
    .reduce((sum, asset) => sum + asset.valuationAmountKrw, 0);
}

function isSameDay(left: Date, right: Date) {
  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

function isSameMonth(left: Date, right: Date) {
  return left.toISOString().slice(0, 7) === right.toISOString().slice(0, 7);
}

function getSubmittedOrders(state: AppState) {
  return state.orderProposals.filter(
    (proposal) => proposal.status === "submitted" && proposal.submittedAt
  );
}

export function evaluateTradeRisk(
  state: AppState,
  params: {
    instrument: ProductUniverseItem;
    side: TradingOrderSide;
    amountKrw: number;
    executionMode: TradingExecutionMode;
    now?: Date;
  }
): TradeRiskCheckResult {
  const now = params.now ?? new Date();
  const messages: string[] = [];
  const limits = state.privateTradingRiskLimits;
  const review = buildPortfolioReview(state.profile, state.assets);
  const totalAssetAmountKrw = review.returns.totalAssetAmountKrw;
  const currentCashAmountKrw = getCashAmountKrw(state);
  const submittedOrders = getSubmittedOrders(state);
  const dailyOrderAmountKrw = submittedOrders
    .filter((order) => order.submittedAt && isSameDay(new Date(order.submittedAt), now))
    .reduce((sum, order) => sum + order.amountKrw, 0);
  const monthlyOrderAmountKrw = submittedOrders
    .filter(
      (order) => order.submittedAt && isSameMonth(new Date(order.submittedAt), now)
    )
    .reduce((sum, order) => sum + order.amountKrw, 0);
  const ordersToday = submittedOrders.filter(
    (order) => order.submittedAt && isSameDay(new Date(order.submittedAt), now)
  ).length;

  if (state.privateTradingFlags.killSwitchActive) {
    messages.push("중지 스위치가 활성화되어 있습니다.");
  }
  if (params.amountKrw <= 0) {
    messages.push("주문 금액은 0원보다 커야 합니다.");
  }
  if (!params.instrument.isActive) {
    messages.push("비활성 상품은 주문할 수 없습니다.");
  }
  if (!params.instrument.isTradable) {
    messages.push("거래 가능 상품으로 표시되지 않았습니다.");
  }
  if (!limits.allowedInstrumentKinds.includes(params.instrument.instrumentKind)) {
    messages.push("허용된 상품 유형이 아닙니다.");
  }
  if (limits.blockedInstrumentKinds.includes(params.instrument.instrumentKind)) {
    messages.push("안전 설정에서 차단된 상품 유형입니다.");
  }
  if (
    limits.blockedTickers
      .map((ticker) => ticker.toUpperCase())
      .includes(params.instrument.ticker.toUpperCase())
  ) {
    messages.push("차단 목록에 있는 종목입니다.");
  }

  const lastPriceDate = new Date(params.instrument.lastPriceUpdatedAt);
  const staleHours =
    (now.getTime() - lastPriceDate.getTime()) / (1000 * 60 * 60);
  if (!Number.isFinite(staleHours) || staleHours > limits.staleDataMaxHours) {
    messages.push("상품 가격 기준 시각이 오래되었습니다.");
  }

  if (params.amountKrw > limits.maxOrderAmountKrw) {
    messages.push(`1회 주문 한도 ${formatKrw(limits.maxOrderAmountKrw)}를 초과했습니다.`);
  }
  if (dailyOrderAmountKrw + params.amountKrw > limits.maxDailyOrderAmountKrw) {
    messages.push(
      `일 주문 한도 ${formatKrw(limits.maxDailyOrderAmountKrw)}를 초과했습니다.`
    );
  }
  if (monthlyOrderAmountKrw + params.amountKrw > limits.maxMonthlyOrderAmountKrw) {
    messages.push(
      `월 주문 한도 ${formatKrw(limits.maxMonthlyOrderAmountKrw)}를 초과했습니다.`
    );
  }
  if (ordersToday + 1 > limits.maxOrdersPerDay) {
    messages.push(`일 주문 횟수 한도 ${limits.maxOrdersPerDay}회를 초과했습니다.`);
  }

  const cashAfterTrade =
    params.side === "buy"
      ? currentCashAmountKrw - params.amountKrw
      : currentCashAmountKrw + params.amountKrw;
  const totalAfterTrade =
    params.side === "buy"
      ? totalAssetAmountKrw
      : Math.max(1, totalAssetAmountKrw);
  const projectedCashRatio =
    totalAfterTrade > 0 ? clamp(cashAfterTrade / totalAfterTrade, 0, 1) : 0;
  const tradeWeight =
    totalAssetAmountKrw + params.amountKrw > 0
      ? params.amountKrw / (totalAssetAmountKrw + params.amountKrw)
      : 0;
  const projectedRiskScore =
    params.side === "buy"
      ? clamp(
          review.risk.totalScore +
            (params.instrument.riskScore - review.risk.totalScore) * tradeWeight,
          0,
          100
        )
      : review.risk.totalScore;

  if (
    params.side === "buy" &&
    projectedCashRatio < limits.minimumCashRatioAfterTrade
  ) {
    messages.push("주문 후 현금성 비중이 안전 한도보다 낮아집니다.");
  }
  if (projectedRiskScore > limits.maxRiskScoreAfterTrade) {
    messages.push("주문 후 예상 위험점수가 안전 한도를 초과합니다.");
  }

  return {
    passed: messages.length === 0,
    messages,
    projectedCashRatio: roundTo(projectedCashRatio, 6),
    projectedRiskScore: roundTo(projectedRiskScore, 2),
    dailyOrderAmountKrw,
    monthlyOrderAmountKrw,
    ordersToday
  };
}
