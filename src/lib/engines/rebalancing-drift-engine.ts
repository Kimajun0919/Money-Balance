import {
  ASSET_TYPE_ORDER,
  CASH_EQUIVALENT_ASSET_TYPES
} from "@/lib/constants/asset-types";
import { buildPortfolioReview } from "@/lib/engines/portfolio-review-engine";
import type {
  AppState,
  Asset,
  AssetType,
  InstrumentDriftItem,
  RebalancingDriftItem,
  RebalancingDriftResult,
  RebalancingPolicy,
  TargetAllocationItem
} from "@/lib/types";
import { formatPercent, roundTo } from "@/lib/utils/percentage";

function sumByAssetType(assets: Asset[], assetType: AssetType) {
  return assets
    .filter((asset) => asset.assetType === assetType)
    .reduce((sum, asset) => sum + asset.valuationAmountKrw, 0);
}

function targetRatioFor(
  targetAllocations: TargetAllocationItem[],
  assetType: AssetType
) {
  return (
    targetAllocations.find((allocation) => allocation.assetType === assetType)
      ?.targetRatio ?? 0
  );
}

function buildSummary(params: {
  rebalanceNeeded: boolean;
  maxDriftItem?: RebalancingDriftItem;
  threshold: number;
  underweightCount: number;
  overweightCount: number;
}) {
  if (!params.maxDriftItem) {
    return "포트폴리오 데이터가 없어 리밸런싱 필요 여부를 계산할 수 없습니다.";
  }
  const direction =
    params.maxDriftItem.status === "underweight"
      ? "낮고"
      : params.maxDriftItem.status === "overweight"
        ? "높고"
        : "목표 범위 안에 있고";

  if (!params.rebalanceNeeded) {
    return "현재 포트폴리오가 설정된 목표 범위 내에 있어 리밸런싱이 필요하지 않습니다.";
  }

  return `현재 ${params.maxDriftItem.assetType} 비중은 목표비중보다 ${formatPercent(
    params.maxDriftItem.absoluteDriftPercent
  )} ${direction}, 설정된 리밸런싱 기준 ${formatPercent(
    params.threshold
  )}를 초과하여 리밸런싱 검토가 필요합니다. 부족 자산군 ${
    params.underweightCount
  }개, 초과 자산군 ${params.overweightCount}개가 확인되었습니다.`;
}

export function calculateRebalancingDrift(
  state: AppState,
  policy: RebalancingPolicy = state.rebalancingPolicies[0]
): RebalancingDriftResult {
  const review = buildPortfolioReview(state.profile, state.assets);
  const totalAssetAmountKrw = review.returns.totalAssetAmountKrw;
  const targetAllocations = review.targetAllocation.allocations;
  const threshold = policy.assetClassThresholdPercent;
  const currentAllocation: Record<string, number> = {};
  const targetAllocation: Record<string, number> = {};
  const driftByAssetClass: RebalancingDriftItem[] = ASSET_TYPE_ORDER.map(
    (assetType) => {
      const currentAmount = sumByAssetType(state.assets, assetType);
      const currentWeight =
        totalAssetAmountKrw > 0 ? currentAmount / totalAssetAmountKrw : 0;
      const targetWeight = targetRatioFor(targetAllocations, assetType);
      const driftPercent = currentWeight - targetWeight;
      const absoluteDriftPercent = Math.abs(driftPercent);
      const status: RebalancingDriftItem["status"] =
        absoluteDriftPercent < threshold
          ? "within"
          : driftPercent < 0
            ? "underweight"
            : "overweight";

      currentAllocation[assetType] = roundTo(currentWeight, 6);
      targetAllocation[assetType] = roundTo(targetWeight, 6);

      return {
        assetType,
        currentAmount,
        currentWeight: roundTo(currentWeight, 6),
        targetWeight: roundTo(targetWeight, 6),
        driftPercent: roundTo(driftPercent, 6),
        absoluteDriftPercent: roundTo(absoluteDriftPercent, 6),
        status
      };
    }
  ).filter(
    (item) =>
      item.currentAmount > 0 ||
      item.targetWeight > 0 ||
      CASH_EQUIVALENT_ASSET_TYPES.includes(item.assetType)
  );

  const maxDriftItem = [...driftByAssetClass].sort(
    (a, b) => b.absoluteDriftPercent - a.absoluteDriftPercent
  )[0];
  const underweightAssetTypes = driftByAssetClass
    .filter((item) => item.status === "underweight")
    .map((item) => item.assetType);
  const overweightAssetTypes = driftByAssetClass
    .filter((item) => item.status === "overweight")
    .map((item) => item.assetType);
  const rebalanceNeeded = driftByAssetClass.some(
    (item) => item.absoluteDriftPercent >= threshold
  );
  const driftByInstrument: InstrumentDriftItem[] = state.assets.map((asset) => {
    const currentWeight =
      totalAssetAmountKrw > 0 ? asset.valuationAmountKrw / totalAssetAmountKrw : 0;
    const currentAssetTypeAmount = sumByAssetType(state.assets, asset.assetType);
    const targetWeight =
      currentAssetTypeAmount > 0
        ? targetAllocation[asset.assetType] *
          (asset.valuationAmountKrw / currentAssetTypeAmount)
        : 0;
    const driftPercent = currentWeight - targetWeight;

    return {
      instrumentId: asset.externalAssetId ?? asset.id,
      ticker: asset.ticker,
      instrumentName: asset.assetName,
      assetType: asset.assetType,
      currentAmount: asset.valuationAmountKrw,
      currentWeight: roundTo(currentWeight, 6),
      targetWeight: roundTo(targetWeight, 6),
      driftPercent: roundTo(driftPercent, 6),
      absoluteDriftPercent: roundTo(Math.abs(driftPercent), 6)
    };
  });

  return {
    currentAllocation,
    targetAllocation,
    driftByAssetClass,
    driftByInstrument,
    maxDriftAssetType: maxDriftItem?.assetType,
    maxDriftPercent: maxDriftItem?.absoluteDriftPercent ?? 0,
    underweightAssetTypes,
    overweightAssetTypes,
    rebalanceNeeded,
    summary: buildSummary({
      rebalanceNeeded,
      maxDriftItem,
      threshold,
      underweightCount: underweightAssetTypes.length,
      overweightCount: overweightAssetTypes.length
    })
  };
}
