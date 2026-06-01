import {
  ASSET_TYPE_SETTINGS,
  CASH_EQUIVALENT_ASSET_TYPES
} from "@/lib/constants/asset-types";
import {
  findTargetAllocationTemplate,
  TARGET_RETURN_BANDS
} from "@/lib/constants/target-allocation-matrix";
import type {
  AssetType,
  InvestmentHorizon,
  RiskTolerance,
  TargetAllocationItem,
  TargetAllocationResult
} from "@/lib/types";
import { formatPercent, formatPoint, roundTo } from "@/lib/utils/percentage";

export interface TargetAllocationInput {
  targetReturn: number;
  riskTolerance: RiskTolerance;
  minCashRatio: number;
  investmentHorizon?: InvestmentHorizon;
  lossTolerance?: number;
}

export function mapTargetReturnToBand(targetReturn: number) {
  return TARGET_RETURN_BANDS.reduce<(typeof TARGET_RETURN_BANDS)[number]>(
    (selectedBand, band) => {
      const selectedDiff = Math.abs(targetReturn - selectedBand);
      const bandDiff = Math.abs(targetReturn - band);
      if (bandDiff < selectedDiff) return band;
      if (bandDiff === selectedDiff && band > selectedBand) return band;
      return selectedBand;
    },
    TARGET_RETURN_BANDS[0]
  );
}

function withTargetRanges(items: TargetAllocationItem[]) {
  return items.map((item) => ({
    ...item,
    minRatio: Math.max(0, item.targetRatio - 0.03),
    maxRatio: Math.min(1, item.targetRatio + 0.03)
  }));
}

function applyMinimumCashRatio(
  allocations: TargetAllocationItem[],
  minCashRatio: number
) {
  const cashEquivalentRatio = allocations
    .filter((item) => CASH_EQUIVALENT_ASSET_TYPES.includes(item.assetType))
    .reduce((sum, item) => sum + item.targetRatio, 0);

  if (minCashRatio <= cashEquivalentRatio) {
    return {
      allocations,
      applied: false
    };
  }

  const neededRatio = minCashRatio - cashEquivalentRatio;
  const reducibleItems = allocations.filter(
    (item) =>
      !CASH_EQUIVALENT_ASSET_TYPES.includes(item.assetType) &&
      item.targetRatio > 0
  );
  const reducibleTotal = reducibleItems.reduce(
    (sum, item) => sum + item.targetRatio,
    0
  );
  const reductionRatio =
    reducibleTotal > 0
      ? Math.max(0, (reducibleTotal - neededRatio) / reducibleTotal)
      : 0;

  const adjusted = allocations.map((item) => {
    if (item.assetType === "cash") {
      return { ...item, targetRatio: item.targetRatio + neededRatio };
    }

    if (!CASH_EQUIVALENT_ASSET_TYPES.includes(item.assetType)) {
      return {
        ...item,
        targetRatio: roundTo(item.targetRatio * reductionRatio, 6)
      };
    }

    return item;
  });

  const adjustedSum = adjusted.reduce((sum, item) => sum + item.targetRatio, 0);
  const normalized = adjusted.map((item) => ({
    ...item,
    targetRatio: roundTo(item.targetRatio / adjustedSum, 6)
  }));

  return {
    allocations: normalized,
    applied: true
  };
}

export function calculateReferenceExpectedReturn(
  allocations: TargetAllocationItem[]
) {
  return roundTo(
    allocations.reduce((sum, item) => {
      const expectedReturn =
        ASSET_TYPE_SETTINGS[item.assetType].defaultExpectedReturn;
      return sum + item.targetRatio * expectedReturn;
    }, 0),
    4
  );
}

export function calculateCompositionRisk(
  allocations: TargetAllocationItem[]
) {
  return Math.round(
    allocations.reduce((sum, item) => {
      const coefficient = ASSET_TYPE_SETTINGS[item.assetType].riskCoefficient;
      return sum + item.targetRatio * 100 * coefficient;
    }, 0)
  );
}

function getTargetAllocationWarnings(params: {
  requestedTargetReturn: number;
  mappedBand: number;
  expectedReturn: number;
  targetGap: number;
  appliedMinCashAdjustment: boolean;
  investmentHorizon?: InvestmentHorizon;
  lossTolerance?: number;
}) {
  const warnings: string[] = [];

  if (params.mappedBand !== params.requestedTargetReturn) {
    warnings.push(
      `입력한 목표수익률과 가장 가까운 ${formatPercent(
        params.mappedBand
      )} 기준 배분표를 적용했습니다.`
    );
  }

  if (params.targetGap > 0.0001) {
    warnings.push(
      `목표수익률은 연 ${formatPercent(
        params.requestedTargetReturn
      )}이지만 기준 포트폴리오의 기대수익률은 연 ${formatPercent(
        params.expectedReturn
      )}입니다. 차이는 ${formatPoint(params.targetGap)}입니다.`
    );
  }

  if (params.requestedTargetReturn >= 0.1) {
    warnings.push(
      "목표수익률이 높을수록 가격 변동과 손실 가능성을 함께 확인해야 합니다."
    );
  }

  if (params.appliedMinCashAdjustment) {
    warnings.push(
      "사용자가 설정한 최소 현금성 자산 비중을 우선 반영해 다른 자산군 비중을 비례 조정했습니다."
    );
  }

  if (
    params.investmentHorizon === "under_1y" &&
    params.requestedTargetReturn >= 0.1
  ) {
    warnings.push(
      "투자 기간이 1년 미만이면 같은 목표수익률에서도 단기 가격 변동 부담이 커질 수 있습니다."
    );
  }

  if (
    params.lossTolerance !== undefined &&
    Math.abs(params.lossTolerance) <= 0.05 &&
    params.requestedTargetReturn >= 0.1
  ) {
    warnings.push(
      "손실 허용폭이 낮게 설정되어 위험점수 상한을 우선 확인해야 합니다."
    );
  }

  return warnings;
}

export function calculateTargetAllocation(
  input: TargetAllocationInput
): TargetAllocationResult {
  const mappedBand = mapTargetReturnToBand(input.targetReturn);

  if (
    mappedBand === 0.12 &&
    (input.riskTolerance === "conservative" ||
      input.riskTolerance === "moderate")
  ) {
    return {
      requestedTargetReturn: input.targetReturn,
      mappedBand,
      riskTolerance: input.riskTolerance,
      expectedReturn: 0,
      targetGap: input.targetReturn,
      compositionRisk: 0,
      allocations: [],
      warnings: [
        "선택한 위험허용도에서는 12% 이상 목표수익률 기준 배분표를 적용하지 않습니다."
      ],
      blocked: true,
      blockReason:
        "보수형 또는 중립형 위험허용도에서는 12% 이상 목표수익률 배분이 제한됩니다.",
      appliedMinCashAdjustment: false
    };
  }

  const template = findTargetAllocationTemplate(mappedBand, input.riskTolerance);

  if (!template) {
    return {
      requestedTargetReturn: input.targetReturn,
      mappedBand,
      riskTolerance: input.riskTolerance,
      expectedReturn: 0,
      targetGap: input.targetReturn,
      compositionRisk: 0,
      allocations: [],
      warnings: ["적용 가능한 목표배분 템플릿을 찾지 못했습니다."],
      blocked: true,
      blockReason: "목표수익률과 위험허용도 조합을 다시 확인해야 합니다.",
      appliedMinCashAdjustment: false
    };
  }

  const adjusted = applyMinimumCashRatio(
    template.allocations,
    input.minCashRatio
  );
  const allocations = withTargetRanges(adjusted.allocations).filter(
    (item) => item.targetRatio > 0
  );
  const expectedReturn = adjusted.applied
    ? calculateReferenceExpectedReturn(allocations)
    : template.expectedReturn;
  const compositionRisk = adjusted.applied
    ? calculateCompositionRisk(allocations)
    : template.compositionRisk;
  const targetGap = roundTo(input.targetReturn - expectedReturn, 4);

  return {
    requestedTargetReturn: input.targetReturn,
    mappedBand,
    riskTolerance: input.riskTolerance,
    expectedReturn,
    targetGap,
    compositionRisk,
    allocations,
    warnings: getTargetAllocationWarnings({
      requestedTargetReturn: input.targetReturn,
      mappedBand,
      expectedReturn,
      targetGap,
      appliedMinCashAdjustment: adjusted.applied,
      investmentHorizon: input.investmentHorizon,
      lossTolerance: input.lossTolerance
    }),
    blocked: false,
    appliedMinCashAdjustment: adjusted.applied
  };
}

export function getTargetRatio(
  allocations: TargetAllocationItem[],
  assetType: AssetType
) {
  return (
    allocations.find((allocation) => allocation.assetType === assetType)
      ?.targetRatio ?? 0
  );
}
