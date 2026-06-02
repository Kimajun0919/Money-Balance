import { buildPortfolioReview } from "@/lib/engines/portfolio-review-engine";
import type {
  AppState,
  RebalancingPlanItem,
  RebalancingPolicy,
  RebalancingRiskCheckResult
} from "@/lib/types";
import { formatKrw } from "@/lib/utils/currency";
import { clamp, roundTo } from "@/lib/utils/percentage";

function getPlanTotal(items: RebalancingPlanItem[]) {
  return items
    .filter((item) => item.side !== "hold")
    .reduce((sum, item) => sum + item.proposedAmount, 0);
}

function isSameDay(left: Date, right: Date) {
  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

function isSameMonth(left: Date, right: Date) {
  return left.toISOString().slice(0, 7) === right.toISOString().slice(0, 7);
}

function getRecentExecutionAmount(
  state: AppState,
  now: Date,
  matcher: (date: Date) => boolean
) {
  return state.rebalancingExecutions
    .filter((execution) => execution.completedAt && matcher(new Date(execution.completedAt)))
    .reduce((sum, execution) => sum + execution.totalTradeAmount, 0);
}

function getSubmittedOrderCountToday(state: AppState, now: Date) {
  return state.orderProposals.filter(
    (proposal) =>
      proposal.submittedAt && isSameDay(new Date(proposal.submittedAt), now)
  ).length;
}

function getLatestPlanCreatedAt(state: AppState) {
  const latest = [...state.rebalancingPlans].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
  return latest?.createdAt;
}

export function evaluateRebalancingRisk(
  state: AppState,
  policy: RebalancingPolicy,
  items: RebalancingPlanItem[],
  params: {
    estimatedCashAfter: number;
    currentTotalValue: number;
    now?: Date;
    ignoreCooldown?: boolean;
  }
): RebalancingRiskCheckResult {
  const now = params.now ?? new Date();
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const planTotal = getPlanTotal(items);
  const buyTotal = items
    .filter((item) => item.side === "buy")
    .reduce((sum, item) => sum + item.proposedAmount, 0);
  const sellTotal = items
    .filter((item) => item.side === "sell")
    .reduce((sum, item) => sum + item.proposedAmount, 0);
  const postRebalanceCashRatio =
    params.currentTotalValue > 0
      ? params.estimatedCashAfter / params.currentTotalValue
      : 0;
  const review = buildPortfolioReview(state.profile, state.assets);
  const averageRiskScore =
    items.length > 0
      ? items.reduce((sum, item) => {
          const instrument = state.productUniverse.find(
            (entry) => entry.id === item.instrumentId
          );
          return sum + (instrument?.riskScore ?? review.risk.totalScore);
        }, 0) / items.length
      : review.risk.totalScore;
  const riskTradeWeight =
    params.currentTotalValue + buyTotal > 0
      ? buyTotal / (params.currentTotalValue + buyTotal)
      : 0;
  const postRebalanceRiskScore = roundTo(
    clamp(
      review.risk.totalScore +
        (averageRiskScore - review.risk.totalScore) * riskTradeWeight,
      0,
      100
    ),
    2
  );
  const postRebalanceAllocation: Record<string, number> = {};

  for (const item of items) {
    if (item.side === "hold") continue;
    if (item.proposedAmount < policy.minTradeAmount) {
      warnings.push(
        `${item.assetType} 주문 금액이 최소 거래 금액보다 작아 제외될 수 있습니다.`
      );
    }
    if (item.proposedAmount > policy.maxTradeAmount) {
      blockingReasons.push(
        `주문 금액이 1회 한도 ${formatKrw(policy.maxTradeAmount)}를 초과했습니다.`
      );
    }
    if (!policy.allowSellOrders && item.side === "sell") {
      blockingReasons.push("매도 주문은 기본 정책에서 허용되지 않습니다.");
    }
    const instrument = state.productUniverse.find(
      (entry) => entry.id === item.instrumentId
    );
    if (instrument) {
      const staleHours =
        (now.getTime() - new Date(instrument.lastPriceUpdatedAt).getTime()) /
        (1000 * 60 * 60);
      if (!Number.isFinite(staleHours) || staleHours > state.privateTradingRiskLimits.staleDataMaxHours) {
        blockingReasons.push(`${instrument.ticker} 가격 기준 시각이 오래되었습니다.`);
      }
      if (
        state.privateTradingRiskLimits.blockedInstrumentKinds.includes(
          instrument.instrumentKind
        )
      ) {
        blockingReasons.push(`${instrument.ticker} 상품 유형은 차단되어 있습니다.`);
      }
    }
  }

  if (state.privateTradingFlags.killSwitchActive) {
    blockingReasons.push("중지 스위치가 활성화되어 있습니다.");
  }
  if (postRebalanceCashRatio < policy.minCashRatioAfterRebalance) {
    blockingReasons.push(
      "리밸런싱 후 현금성 자산 비중이 최소 기준보다 낮아져 계획이 차단되었습니다."
    );
  }
  if (postRebalanceCashRatio > policy.maxCashRatioAfterRebalance) {
    warnings.push("리밸런싱 후 현금성 자산 비중이 설정 상한보다 높습니다.");
  }
  if (planTotal > policy.maxTotalRebalanceAmount) {
    blockingReasons.push(
      `이번 리밸런싱 주문 총액이 설정된 최대 한도 ${formatKrw(
        policy.maxTotalRebalanceAmount
      )}를 초과했습니다.`
    );
  }
  if (items.filter((item) => item.side !== "hold").length > policy.maxOrdersPerRebalance) {
    blockingReasons.push("이번 리밸런싱 주문 개수가 설정 한도를 초과했습니다.");
  }
  const dailyAmount =
    getRecentExecutionAmount(state, now, (date) => isSameDay(date, now)) +
    planTotal;
  if (dailyAmount > policy.maxDailyRebalanceAmount) {
    blockingReasons.push("일 리밸런싱 금액 한도를 초과했습니다.");
  }
  const monthlyAmount =
    getRecentExecutionAmount(state, now, (date) => isSameMonth(date, now)) +
    planTotal;
  if (monthlyAmount > policy.maxMonthlyRebalanceAmount) {
    blockingReasons.push("월 리밸런싱 금액 한도를 초과했습니다.");
  }
  if (getSubmittedOrderCountToday(state, now) + items.length > policy.maxOrdersPerDay) {
    blockingReasons.push("일 주문 횟수 한도를 초과했습니다.");
  }
  if (postRebalanceRiskScore > state.privateTradingRiskLimits.maxRiskScoreAfterTrade) {
    blockingReasons.push("리밸런싱 후 예상 위험점수가 안전 한도를 초과합니다.");
  }
  if (sellTotal > 0) {
    warnings.push(
      "이 계획에는 보유 자산 매도 주문이 포함되어 있습니다. 매도 전 손익, 수수료, 세금 가능성, 포트폴리오 변화를 반드시 확인해 주세요."
    );
  }
  const latestPlanCreatedAt = params.ignoreCooldown
    ? undefined
    : getLatestPlanCreatedAt(state);
  if (latestPlanCreatedAt) {
    const cooldownHours =
      (now.getTime() - new Date(latestPlanCreatedAt).getTime()) /
      (1000 * 60 * 60);
    if (cooldownHours < policy.cooldownHours) {
      blockingReasons.push(
        "최근 리밸런싱 이후 설정된 대기 시간이 지나지 않아 자동 리밸런싱이 차단되었습니다."
      );
    }
  }

  return {
    allowed: blockingReasons.length === 0,
    blockingReasons,
    warnings,
    postRebalanceRiskScore,
    postRebalanceCashRatio: roundTo(postRebalanceCashRatio, 6),
    postRebalanceAllocation
  };
}
