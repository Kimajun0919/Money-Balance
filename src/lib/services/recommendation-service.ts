import { ASSET_TYPE_SETTINGS } from "@/lib/constants/asset-types";
import { buildPortfolioReview } from "@/lib/engines/portfolio-review-engine";
import { evaluateRecommendationGate } from "@/lib/safety/private-trading-gate";
import { createId } from "@/lib/services/service-utils";
import { appendTradingAuditLog } from "@/lib/services/trading-audit-service";
import type {
  AppState,
  InstrumentRecommendation,
  ProductUniverseItem,
  TradingRecommendationAction
} from "@/lib/types";
import { formatKrw } from "@/lib/utils/currency";
import { roundTo } from "@/lib/utils/percentage";

export interface RecommendationGenerationResult {
  state: AppState;
  recommendations: InstrumentRecommendation[];
  blockedReasons: string[];
}

function getAction(params: {
  item: ProductUniverseItem;
  adjustmentAmount: number;
  hasAllocationGap: boolean;
}): TradingRecommendationAction {
  if (params.adjustmentAmount > 0) return "buy";
  if (params.adjustmentAmount < 0 && params.hasAllocationGap) return "reduce";
  if (params.item.incomeYield > 0.05 || params.item.expectedReturn > 0.06) {
    return "watch";
  }
  return "hold";
}

function buildProductBlockReasons(state: AppState, item: ProductUniverseItem) {
  const limits = state.privateTradingRiskLimits;
  const reasons: string[] = [];

  if (!item.isActive) reasons.push("비활성 상품입니다.");
  if (!item.isTradable) reasons.push("거래 가능 상품으로 표시되지 않았습니다.");
  if (!limits.allowedInstrumentKinds.includes(item.instrumentKind)) {
    reasons.push("허용된 상품 유형이 아닙니다.");
  }
  if (limits.blockedInstrumentKinds.includes(item.instrumentKind)) {
    reasons.push("안전 설정에서 차단된 상품 유형입니다.");
  }
  if (
    limits.blockedTickers
      .map((ticker) => ticker.toUpperCase())
      .includes(item.ticker.toUpperCase())
  ) {
    reasons.push("차단 목록에 있는 종목입니다.");
  }

  return reasons;
}

export function generateInstrumentRecommendations(
  state: AppState
): RecommendationGenerationResult {
  const now = new Date().toISOString();
  const gate = evaluateRecommendationGate(state.privateTradingFlags);

  if (!gate.allowed) {
    const blockedState = appendTradingAuditLog(state, {
      eventType: "recommendation_generated",
      summary: "추천 생성이 안전 조건 때문에 차단되었습니다.",
      metadata: { blockedReasons: gate.reasons },
      createdAt: now
    });

    return {
      state: blockedState,
      recommendations: [],
      blockedReasons: gate.reasons
    };
  }

  const review = buildPortfolioReview(state.profile, state.assets);
  const totalAssetAmountKrw = Math.max(review.returns.totalAssetAmountKrw, 1);
  const riskScoreBefore = review.risk.totalScore;
  const activeUniverse = state.productUniverse.filter((item) => item.isActive);

  const ranked = activeUniverse
    .map((item) => {
      const rebalanceItem = review.rebalance.items.find(
        (entry) => entry.assetType === item.assetType
      );
      const adjustmentAmount = rebalanceItem?.adjustmentAmount ?? 0;
      const allocationGap = rebalanceItem?.gapRatio ?? 0;
      const hasAllocationGap = rebalanceItem?.hasAllocationGap ?? false;
      const shortageWeight = Math.max(0, adjustmentAmount) / totalAssetAmountKrw;
      const preferredBonus = state.investorProfile.preferredAssetTypes.includes(
        item.assetType
      )
        ? 8
        : 0;
      const marketBonus = state.investorProfile.allowedMarkets.includes(item.market)
        ? 4
        : 0;
      const riskPenalty =
        item.riskScore > state.privateTradingRiskLimits.maxRiskScoreAfterTrade
          ? 20
          : item.riskScore * 0.08;
      const score = roundTo(
        shortageWeight * 70 +
          item.expectedReturn * 100 +
          item.incomeYield * 25 +
          preferredBonus +
          marketBonus -
          riskPenalty,
        2
      );
      const action = getAction({ item, adjustmentAmount, hasAllocationGap });
      const blockReasons = buildProductBlockReasons(state, item);
      const suggestedOrderAmountKrw =
        action === "buy"
          ? Math.max(
              0,
              Math.min(
                adjustmentAmount,
                state.privateTradingRiskLimits.maxOrderAmountKrw,
                state.profile.monthlyInvestment || adjustmentAmount
              )
            )
          : 0;
      const riskScoreAfterEstimate = roundTo(
        riskScoreBefore +
          (item.riskScore - riskScoreBefore) *
            (suggestedOrderAmountKrw / (totalAssetAmountKrw + suggestedOrderAmountKrw)),
        2
      );
      const assetLabel = ASSET_TYPE_SETTINGS[item.assetType].label;
      const reasons = [
        `${assetLabel} 목표비중 대비 참고 차이 ${formatKrw(adjustmentAmount)}`,
        `예상수익률 ${(item.expectedReturn * 100).toFixed(1)}%, 위험점수 ${item.riskScore}점`
      ];
      const warnings = [
        item.currency !== "KRW" ? "외화 상품은 환율 변동 영향을 받습니다." : "",
        item.riskLevel === "very_high" ? "위험등급이 매우 높습니다." : ""
      ].filter(Boolean);

      return {
        item,
        action,
        score,
        allocationGap,
        suggestedOrderAmountKrw,
        riskScoreAfterEstimate,
        reasons,
        warnings,
        blockReasons
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const recommendations: InstrumentRecommendation[] = ranked.map(
    (entry, index) => ({
      id: createId("rec"),
      instrumentId: entry.item.id,
      ticker: entry.item.ticker,
      instrumentName: entry.item.instrumentName,
      assetType: entry.item.assetType,
      action: entry.action,
      score: entry.score,
      rank: index + 1,
      suggestedOrderAmountKrw: roundTo(entry.suggestedOrderAmountKrw, 2),
      allocationGap: entry.allocationGap,
      expectedReturn: entry.item.expectedReturn,
      riskScoreBefore,
      riskScoreAfterEstimate: entry.riskScoreAfterEstimate,
      reasons: entry.reasons,
      warnings: entry.warnings,
      blocked: entry.blockReasons.length > 0,
      blockReasons: entry.blockReasons,
      privateTradingFlagsSnapshot: { ...state.privateTradingFlags },
      createdAt: now
    })
  );

  const nextState: AppState = {
    ...state,
    recommendations: [...recommendations, ...state.recommendations]
  };
  const auditedState = appendTradingAuditLog(nextState, {
    eventType: "recommendation_generated",
    summary: "개인용 종목 추천을 생성했습니다.",
    metadata: {
      recommendationCount: recommendations.length,
      topTicker: recommendations[0]?.ticker
    },
    createdAt: now
  });

  return {
    state: auditedState,
    recommendations,
    blockedReasons: []
  };
}

export function markRecommendationViewed(
  state: AppState,
  recommendationId: string
): AppState {
  const now = new Date().toISOString();
  const recommendation = state.recommendations.find(
    (item) => item.id === recommendationId
  );
  const nextState: AppState = {
    ...state,
    recommendations: state.recommendations.map((item) =>
      item.id === recommendationId ? { ...item, viewedAt: now } : item
    )
  };

  return appendTradingAuditLog(nextState, {
    eventType: "recommendation_viewed",
    entityType: "recommendation",
    entityId: recommendationId,
    summary: "추천 상세를 확인했습니다.",
    metadata: { ticker: recommendation?.ticker },
    createdAt: now
  });
}
