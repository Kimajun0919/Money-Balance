import { CASH_EQUIVALENT_ASSET_TYPES } from "@/lib/constants/asset-types";
import { calculateRebalancingDrift } from "@/lib/engines/rebalancing-drift-engine";
import { evaluateRebalancingRisk } from "@/lib/engines/rebalancing-risk-engine";
import { buildPortfolioReview } from "@/lib/engines/portfolio-review-engine";
import { createId } from "@/lib/services/service-utils";
import type {
  AppState,
  Asset,
  ProductUniverseItem,
  RebalancingPlan,
  RebalancingPlanItem,
  RebalancingPolicy,
  RebalancingRiskCheckResult,
  RebalancingRule,
  RebalancingSnapshot
} from "@/lib/types";
import { formatKrw } from "@/lib/utils/currency";
import { roundTo } from "@/lib/utils/percentage";

function getCashAmount(state: AppState) {
  return state.assets
    .filter((asset) => CASH_EQUIVALENT_ASSET_TYPES.includes(asset.assetType))
    .reduce((sum, asset) => sum + asset.valuationAmountKrw, 0);
}

function getCandidateInstrument(
  state: AppState,
  assetType: RebalancingPlanItem["assetType"],
  rule?: RebalancingRule
): ProductUniverseItem | undefined {
  return state.productUniverse
    .filter((item) => {
      if (!item.isActive || !item.isTradable) return false;
      if (item.assetType !== assetType) return false;
      if (rule?.excludedInstrumentIds.includes(item.id)) return false;
      if (
        rule &&
        rule.allowedInstrumentIds.length > 0 &&
        !rule.allowedInstrumentIds.includes(item.id)
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.riskScore - b.riskScore)[0];
}

function getSellCandidateAsset(
  assets: Asset[],
  assetType: RebalancingPlanItem["assetType"]
) {
  return assets
    .filter((asset) => asset.assetType === assetType)
    .sort((a, b) => b.valuationAmountKrw - a.valuationAmountKrw)[0];
}

export function createRebalancingSnapshotFromState(
  state: AppState,
  policy: RebalancingPolicy
): RebalancingSnapshot {
  const now = new Date().toISOString();
  const review = buildPortfolioReview(state.profile, state.assets);
  const drift = calculateRebalancingDrift(state, policy);
  const currentCashValue = getCashAmount(state);

  return {
    id: createId("rebsnap"),
    currentTotalValue: review.returns.totalAssetAmountKrw,
    currentCashValue,
    currentCashRatio: review.risk.cashRatio,
    targetCashRatio: state.profile.minCashRatio,
    currentAllocationJson: drift.currentAllocation,
    targetAllocationJson: drift.targetAllocation,
    driftJson: drift.driftByAssetClass,
    maxDriftAssetType: drift.maxDriftAssetType,
    maxDriftPercent: drift.maxDriftPercent,
    riskScoreBefore: review.risk.totalScore,
    createdAt: now
  };
}

export function generateRebalancingPlanDraft(
  state: AppState,
  policy: RebalancingPolicy,
  rule?: RebalancingRule
): {
  snapshot: RebalancingSnapshot;
  plan: RebalancingPlan;
  items: RebalancingPlanItem[];
  riskCheck: RebalancingRiskCheckResult;
} {
  const now = new Date().toISOString();
  const planId = createId("rebplan");
  const snapshot = createRebalancingSnapshotFromState(state, policy);
  const drift = calculateRebalancingDrift(state, policy);
  const currentCashValue = getCashAmount(state);
  const requiredCashReserve =
    snapshot.currentTotalValue * policy.minCashRatioAfterRebalance;
  let usableCash = policy.preferCashFirst
    ? Math.max(0, currentCashValue - requiredCashReserve)
    : currentCashValue;
  const items: RebalancingPlanItem[] = [];
  let priority = 1;

  for (const driftItem of drift.driftByAssetClass
    .filter((item) => item.status === "underweight")
    .sort((a, b) => b.absoluteDriftPercent - a.absoluteDriftPercent)) {
    if (!policy.allowBuyOrders || usableCash <= 0) continue;
    if (rule?.excludedAssetClasses.includes(driftItem.assetType)) continue;
    if (
      rule &&
      rule.targetAssetClasses.length > 0 &&
      !rule.targetAssetClasses.includes(driftItem.assetType)
    ) {
      continue;
    }
    const shortageAmount =
      snapshot.currentTotalValue *
      Math.max(0, driftItem.targetWeight - driftItem.currentWeight);
    const proposedAmount = Math.min(
      shortageAmount,
      usableCash,
      policy.maxTradeAmount,
      rule?.maxOrderAmount ?? policy.maxTradeAmount
    );
    if (proposedAmount < policy.minTradeAmount) continue;

    const instrument = getCandidateInstrument(state, driftItem.assetType, rule);
    const blockingReasons = instrument ? [] : ["해당 자산군에 사용할 상품이 없습니다."];
    const estimatedPrice = instrument?.lastPrice ?? 1;
    items.push({
      id: createId("rebitem"),
      planId,
      instrumentId: instrument?.id,
      assetType: driftItem.assetType,
      side: "buy",
      reason: "목표비중보다 낮은 자산군에 사용 가능한 현금을 우선 배분합니다.",
      currentWeight: driftItem.currentWeight,
      targetWeight: driftItem.targetWeight,
      driftPercent: driftItem.driftPercent,
      proposedAmount: roundTo(proposedAmount, 2),
      proposedQuantity: roundTo(proposedAmount / estimatedPrice, 6),
      estimatedPrice,
      estimatedFee: Math.round(proposedAmount * 0.001),
      estimatedTotalAmount: roundTo(proposedAmount + proposedAmount * 0.001, 2),
      orderType: policy.preferLimitOrders ? "limit" : "market",
      priority: priority++,
      riskWarnings: instrument?.riskLevel === "very_high" ? ["위험등급이 매우 높습니다."] : [],
      blockingReasons,
      status: blockingReasons.length > 0 ? "blocked" : "proposed",
      createdAt: now,
      updatedAt: now
    });
    if (instrument) {
      usableCash -= proposedAmount;
    }
  }

  if (policy.allowSellOrders) {
    for (const driftItem of drift.driftByAssetClass
      .filter((item) => item.status === "overweight")
      .sort((a, b) => b.absoluteDriftPercent - a.absoluteDriftPercent)) {
      const sellAsset = getSellCandidateAsset(state.assets, driftItem.assetType);
      if (!sellAsset) continue;
      const excessAmount =
        snapshot.currentTotalValue *
        Math.max(0, driftItem.currentWeight - driftItem.targetWeight);
      const proposedAmount = Math.min(excessAmount, policy.maxTradeAmount);
      if (proposedAmount < policy.minTradeAmount) continue;

      items.push({
        id: createId("rebitem"),
        planId,
        instrumentId: sellAsset.externalAssetId ?? sellAsset.id,
        assetType: driftItem.assetType,
        side: "sell",
        reason:
          "목표비중보다 높은 자산군을 줄이는 제안입니다. 매도 주문은 별도 확인이 필요합니다.",
        currentWeight: driftItem.currentWeight,
        targetWeight: driftItem.targetWeight,
        driftPercent: driftItem.driftPercent,
        proposedAmount: roundTo(proposedAmount, 2),
        proposedQuantity: sellAsset.purchaseUnitPrice
          ? roundTo(proposedAmount / sellAsset.purchaseUnitPrice, 6)
          : undefined,
        estimatedPrice: sellAsset.purchaseUnitPrice ?? proposedAmount,
        estimatedFee: Math.round(proposedAmount * 0.001),
        estimatedTotalAmount: roundTo(proposedAmount - proposedAmount * 0.001, 2),
        orderType: policy.preferLimitOrders ? "limit" : "market",
        priority: priority++,
        riskWarnings: [
          "매도 후 손익, 수수료, 세금 가능성, 포트폴리오 변화를 확인해야 합니다."
        ],
        blockingReasons: [],
        status: policy.requireConfirmationForSellOrders
          ? "requires_review"
          : "proposed",
        createdAt: now,
        updatedAt: now
      });
    }
  }

  const executableItems = items.filter(
    (item) => item.blockingReasons.length === 0 && item.status !== "blocked"
  );
  const buyTotal = executableItems
    .filter((item) => item.side === "buy")
    .reduce((sum, item) => sum + item.proposedAmount, 0);
  const sellTotal = executableItems
    .filter((item) => item.side === "sell")
    .reduce((sum, item) => sum + item.proposedAmount, 0);
  const estimatedFeeAmount = executableItems.reduce(
    (sum, item) => sum + item.estimatedFee,
    0
  );
  const estimatedCashAfter = currentCashValue - buyTotal + sellTotal - estimatedFeeAmount;
  const riskCheck = evaluateRebalancingRisk(state, policy, executableItems, {
    estimatedCashAfter,
    currentTotalValue: snapshot.currentTotalValue
  });
  const generatedItems = items.map((item) =>
    riskCheck.blockingReasons.length > 0 && item.status === "proposed"
      ? {
          ...item,
          status: "blocked" as const,
          blockingReasons: [...item.blockingReasons, ...riskCheck.blockingReasons],
          updatedAt: now
        }
      : item
  );
  const planStatus =
    riskCheck.blockingReasons.length > 0
      ? "blocked_by_risk"
      : generatedItems.some((item) => item.status === "requires_review")
        ? "review_required"
        : "generated";
  const plan: RebalancingPlan = {
    id: planId,
    policyId: policy.id,
    ruleId: rule?.id,
    snapshotId: snapshot.id,
    planName: `${now.slice(0, 10)} 리밸런싱 계획`,
    planType: policy.rebalanceType,
    tradingMode: policy.tradingMode,
    status: drift.rebalanceNeeded ? planStatus : "generated",
    currentTotalValue: snapshot.currentTotalValue,
    estimatedTotalTradeAmount: roundTo(buyTotal + sellTotal, 2),
    estimatedFeeAmount,
    estimatedCashAfter: roundTo(estimatedCashAfter, 2),
    estimatedCashRatioAfter: riskCheck.postRebalanceCashRatio,
    riskScoreBefore: snapshot.riskScoreBefore,
    riskScoreAfter: riskCheck.postRebalanceRiskScore,
    driftBeforeJson: drift.driftByAssetClass,
    driftAfterJson: drift.driftByAssetClass,
    summary: drift.rebalanceNeeded
      ? `${generatedItems.length}개 주문 제안, 총 ${formatKrw(
          buyTotal + sellTotal
        )} 규모의 리밸런싱 계획입니다.`
      : "현재 포트폴리오가 설정된 목표 범위 내에 있어 리밸런싱이 필요하지 않습니다.",
    explanation:
      generatedItems.length > 0
        ? "이번 계획은 기존 자산을 매도하지 않고 사용 가능한 현금을 우선 배분하는 방식으로 생성되었습니다."
        : drift.summary,
    warnings: riskCheck.warnings,
    blockingReasons: riskCheck.blockingReasons,
    privateTradingFlagsSnapshot: { ...state.privateTradingFlags },
    createdAt: now,
    updatedAt: now
  };

  return {
    snapshot,
    plan,
    items: generatedItems,
    riskCheck
  };
}
