import {
  ASSET_TYPE_ORDER,
  CASH_EQUIVALENT_ASSET_TYPES
} from "@/lib/constants/asset-types";
import type {
  Asset,
  IllusionWarning,
  RebalanceItem,
  RebalanceResult,
  RebalanceStatus,
  TargetAllocationItem
} from "@/lib/types";
import { formatKrw } from "@/lib/utils/currency";
import { formatPercent, roundTo } from "@/lib/utils/percentage";

const ALLOCATION_GAP_TOLERANCE = 0.03;

export function calculateCurrentAmountByAssetType(assets: Asset[]) {
  return ASSET_TYPE_ORDER.reduce<Record<string, number>>((acc, assetType) => {
    acc[assetType] = assets
      .filter((asset) => asset.assetType === assetType)
      .reduce((sum, asset) => sum + asset.valuationAmountKrw, 0);
    return acc;
  }, {});
}

export function calculateRebalanceItems(params: {
  assets: Asset[];
  targetAllocations: TargetAllocationItem[];
}): RebalanceItem[] {
  const totalAssetAmountKrw = params.assets.reduce(
    (sum, asset) => sum + asset.valuationAmountKrw,
    0
  );
  const currentAmountMap = calculateCurrentAmountByAssetType(params.assets);
  const targetRatioMap = params.targetAllocations.reduce<Record<string, number>>(
    (acc, allocation) => {
      acc[allocation.assetType] = allocation.targetRatio;
      return acc;
    },
    {}
  );

  return ASSET_TYPE_ORDER.map((assetType) => {
    const currentAmount = currentAmountMap[assetType] ?? 0;
    const currentRatio =
      totalAssetAmountKrw > 0 ? currentAmount / totalAssetAmountKrw : 0;
    const targetRatio = targetRatioMap[assetType] ?? 0;
    const targetAmount = totalAssetAmountKrw * targetRatio;
    const adjustmentAmount = targetAmount - currentAmount;
    const gapRatio = currentRatio - targetRatio;

    return {
      assetType,
      currentAmount,
      currentRatio: roundTo(currentRatio, 6),
      targetRatio,
      targetAmount,
      adjustmentAmount,
      gapRatio: roundTo(gapRatio, 6),
      hasAllocationGap: Math.abs(gapRatio) > ALLOCATION_GAP_TOLERANCE
    };
  }).filter((item) => item.currentAmount > 0 || item.targetRatio > 0);
}

function buildPriorityAction(primaryStatus: RebalanceStatus) {
  const actions: Record<RebalanceStatus, string> = {
    cash_shortage:
      "현금성 자산 비중이 최소 기준보다 낮습니다. 신규 투자금은 먼저 현금성 자산 확보에 배분됩니다.",
    risk_excess:
      "위험점수가 허용 상한을 초과했습니다. 목표수익률보다 위험 노출 점검이 우선입니다.",
    illusion_warning:
      "인컴수익률이 높지만 총수익률이 낮은 자산을 확인해야 합니다.",
    allocation_gap:
      "목표비중과 현재비중 차이가 큰 자산군을 중심으로 조정 필요 금액을 확인합니다.",
    return_gap:
      "목표수익률과 기준 기대수익률 사이에 차이가 있습니다. 추가 위험 수용 여부를 별도로 검토해야 합니다.",
    maintain: "현재 입력값 기준으로 우선 조정 신호가 크지 않습니다."
  };
  return actions[primaryStatus];
}

export function determineRebalanceStatuses(params: {
  cashRatio: number;
  minCashRatio: number;
  riskScore: number;
  riskScoreLimit: number;
  illusionWarnings: IllusionWarning[];
  allocationGapExists: boolean;
  portfolioExpectedReturn: number;
  targetReturn: number;
}) {
  const activeFlags: RebalanceStatus[] = [];

  if (params.cashRatio < params.minCashRatio) {
    activeFlags.push("cash_shortage");
  }

  if (params.riskScore > params.riskScoreLimit) {
    activeFlags.push("risk_excess");
  }

  if (params.illusionWarnings.length > 0) {
    activeFlags.push("illusion_warning");
  }

  if (params.allocationGapExists) {
    activeFlags.push("allocation_gap");
  }

  if (
    params.portfolioExpectedReturn < params.targetReturn &&
    params.riskScore <= params.riskScoreLimit
  ) {
    activeFlags.push("return_gap");
  }

  if (activeFlags.length === 0) {
    activeFlags.push("maintain");
  }

  return {
    primaryStatus: activeFlags[0],
    activeFlags
  };
}

export function calculateRebalance(params: {
  assets: Asset[];
  targetAllocations: TargetAllocationItem[];
  targetReturn: number;
  portfolioExpectedReturn: number;
  riskScore: number;
  riskScoreLimit: number;
  cashRatio: number;
  minCashRatio: number;
  illusionWarnings: IllusionWarning[];
}): RebalanceResult {
  const totalAssetAmountKrw = params.assets.reduce(
    (sum, asset) => sum + asset.valuationAmountKrw,
    0
  );
  const items = calculateRebalanceItems({
    assets: params.assets,
    targetAllocations: params.targetAllocations
  });
  const allocationGapExists = items.some((item) => item.hasAllocationGap);
  const statuses = determineRebalanceStatuses({
    cashRatio: params.cashRatio,
    minCashRatio: params.minCashRatio,
    riskScore: params.riskScore,
    riskScoreLimit: params.riskScoreLimit,
    illusionWarnings: params.illusionWarnings,
    allocationGapExists,
    portfolioExpectedReturn: params.portfolioExpectedReturn,
    targetReturn: params.targetReturn
  });
  const largestShortage = items
    .filter(
      (item) =>
        !CASH_EQUIVALENT_ASSET_TYPES.includes(item.assetType) &&
        item.adjustmentAmount > 0
    )
    .sort((a, b) => b.adjustmentAmount - a.adjustmentAmount)[0];

  return {
    totalAssetAmountKrw,
    items,
    primaryStatus: statuses.primaryStatus,
    activeFlags: statuses.activeFlags,
    priorityAction: buildPriorityAction(statuses.primaryStatus),
    allocationGapExists,
    actionData: {
      cashRatio: params.cashRatio,
      minCashRatio: params.minCashRatio,
      riskScore: params.riskScore,
      riskScoreLimit: params.riskScoreLimit,
      largestShortage: largestShortage
        ? {
            assetType: largestShortage.assetType,
            amount: largestShortage.adjustmentAmount,
            message: `${formatKrw(
              largestShortage.adjustmentAmount
            )}만큼 ${formatPercent(
              largestShortage.targetRatio
            )} 목표 대비 부족합니다.`
          }
        : null
    }
  };
}
