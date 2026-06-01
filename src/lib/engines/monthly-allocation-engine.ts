import {
  ASSET_TYPE_SETTINGS,
  CASH_EQUIVALENT_ASSET_TYPES
} from "@/lib/constants/asset-types";
import { calculateCurrentAmountByAssetType } from "@/lib/engines/rebalance-engine";
import type {
  Asset,
  AssetType,
  MonthlyAllocationItem,
  MonthlyAllocationResult,
  TargetAllocationItem
} from "@/lib/types";
import { roundTo } from "@/lib/utils/percentage";

export function calculateMonthlyAllocation(params: {
  assets: Asset[];
  targetAllocations: TargetAllocationItem[];
  monthlyInvestment: number;
  minCashRatio: number;
  excludedAssetTypes?: AssetType[];
  riskScore?: number;
  riskScoreLimit?: number;
}): MonthlyAllocationResult {
  const monthlyInvestment = Math.max(0, params.monthlyInvestment);
  const totalAssetAmountKrw = params.assets.reduce(
    (sum, asset) => sum + asset.valuationAmountKrw,
    0
  );
  const currentAmountMap = calculateCurrentAmountByAssetType(params.assets);
  const currentCashAmount = CASH_EQUIVALENT_ASSET_TYPES.reduce(
    (sum, assetType) => sum + (currentAmountMap[assetType] ?? 0),
    0
  );
  const currentCashRatio =
    totalAssetAmountKrw > 0 ? currentCashAmount / totalAssetAmountKrw : 0;
  const cashShortageAmount =
    currentCashRatio < params.minCashRatio
      ? (params.minCashRatio - currentCashRatio) * totalAssetAmountKrw
      : 0;
  const cashFirstAllocated = Math.min(monthlyInvestment, cashShortageAmount);
  let remainingInvestment = monthlyInvestment - cashFirstAllocated;
  const items: MonthlyAllocationItem[] = [];

  if (cashFirstAllocated > 0) {
    items.push({
      assetType: "cash",
      amount: cashFirstAllocated,
      step: "cash_first",
      shortageAmount: cashShortageAmount,
      weight: monthlyInvestment > 0 ? cashFirstAllocated / monthlyInvestment : 0,
      reason: "최소 현금성 자산 비중을 우선 충족하기 위한 배분입니다."
    });
  }

  const excludedAssetTypes = new Set(params.excludedAssetTypes ?? []);
  const targetRatioMap = params.targetAllocations.reduce<Record<string, number>>(
    (acc, allocation) => {
      acc[allocation.assetType] = allocation.targetRatio;
      return acc;
    },
    {}
  );
  const baseTotalAssets = totalAssetAmountKrw + monthlyInvestment;
  const eligibleShortages = params.targetAllocations
    .filter((allocation) => {
      if (CASH_EQUIVALENT_ASSET_TYPES.includes(allocation.assetType)) {
        return false;
      }
      if (excludedAssetTypes.has(allocation.assetType)) return false;
      if (
        params.riskScore !== undefined &&
        params.riskScoreLimit !== undefined &&
        params.riskScore >= params.riskScoreLimit &&
        ASSET_TYPE_SETTINGS[allocation.assetType].riskCoefficient >= 0.55
      ) {
        return false;
      }
      return allocation.targetRatio > 0;
    })
    .map((allocation) => {
      const currentAmount = currentAmountMap[allocation.assetType] ?? 0;
      const targetAmount = baseTotalAssets * allocation.targetRatio;
      return {
        assetType: allocation.assetType,
        shortageAmount: Math.max(0, targetAmount - currentAmount)
      };
    })
    .filter((shortage) => shortage.shortageAmount > 0);

  const shortageTotal = eligibleShortages.reduce(
    (sum, shortage) => sum + shortage.shortageAmount,
    0
  );

  if (remainingInvestment > 0 && shortageTotal > 0) {
    const weightedItems = eligibleShortages.map((shortage) => {
      const weight = shortage.shortageAmount / shortageTotal;
      return {
        assetType: shortage.assetType,
        amount: remainingInvestment * weight,
        step: "shortage_weighted" as const,
        shortageAmount: shortage.shortageAmount,
        weight,
        reason: "목표비중 대비 부족 금액 비율에 따른 배분입니다."
      };
    });

    const allocated = weightedItems.reduce((sum, item) => sum + item.amount, 0);
    const roundingGap = remainingInvestment - allocated;
    if (weightedItems.length > 0) {
      weightedItems[weightedItems.length - 1].amount += roundingGap;
    }
    items.push(...weightedItems);
    remainingInvestment = 0;
  }

  if (remainingInvestment > 0) {
    items.push({
      assetType: "cash",
      amount: remainingInvestment,
      step: "fallback_cash",
      shortageAmount: 0,
      weight: monthlyInvestment > 0 ? remainingInvestment / monthlyInvestment : 0,
      reason: "배분 가능한 부족 자산군이 없어 현금 대기 금액으로 남깁니다."
    });
    remainingInvestment = 0;
  }

  const totalAllocated = items.reduce((sum, item) => sum + item.amount, 0);
  const shortageWeightedAllocated = items
    .filter((item) => item.step === "shortage_weighted")
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    totalAllocated: roundTo(totalAllocated, 2),
    cashFirstAllocated: roundTo(cashFirstAllocated, 2),
    shortageWeightedAllocated: roundTo(shortageWeightedAllocated, 2),
    remainingUnallocated: roundTo(Math.max(0, monthlyInvestment - totalAllocated), 2),
    items,
    cashShortageAmount: roundTo(cashShortageAmount, 2)
  };
}
