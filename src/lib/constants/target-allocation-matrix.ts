import type {
  AssetType,
  RiskTolerance,
  TargetAllocationTemplate
} from "@/lib/types";

type MatrixAllocation = Record<Exclude<AssetType, "etc">, number>;

const templateVersion = "2026-06-phase0";

function allocationItems(values: MatrixAllocation) {
  return Object.entries(values).map(([assetType, targetRatio]) => ({
    assetType: assetType as AssetType,
    targetRatio,
    minRatio: Math.max(0, targetRatio - 0.03),
    maxRatio: Math.min(1, targetRatio + 0.03)
  }));
}

function template(
  targetReturnBand: number,
  riskTolerance: RiskTolerance,
  expectedReturn: number,
  compositionRisk: number,
  allocations: MatrixAllocation
): TargetAllocationTemplate {
  return {
    targetReturnBand,
    riskTolerance,
    expectedReturn,
    compositionRisk,
    templateVersion,
    isActive: true,
    allocations: allocationItems(allocations)
  };
}

export const TARGET_RETURN_BANDS = [0.05, 0.07, 0.1, 0.12] as const;

export const TARGET_ALLOCATION_TEMPLATES: TargetAllocationTemplate[] = [
  template(0.05, "conservative", 0.05, 28, {
    cash: 0.1,
    savings: 0.2,
    govt_bond: 0.35,
    high_yield_bond: 0.1,
    dividend: 0.1,
    reit: 0.1,
    covered_call: 0,
    growth: 0,
    alternative: 0.05
  }),
  template(0.05, "moderate", 0.053, 31, {
    cash: 0.1,
    savings: 0.15,
    govt_bond: 0.35,
    high_yield_bond: 0.1,
    dividend: 0.1,
    reit: 0.1,
    covered_call: 0.05,
    growth: 0,
    alternative: 0.05
  }),
  template(0.05, "growth", 0.058, 37, {
    cash: 0.1,
    savings: 0.1,
    govt_bond: 0.3,
    high_yield_bond: 0.1,
    dividend: 0.15,
    reit: 0.1,
    covered_call: 0.05,
    growth: 0.05,
    alternative: 0.05
  }),
  template(0.05, "aggressive", 0.061, 40, {
    cash: 0.05,
    savings: 0.1,
    govt_bond: 0.3,
    high_yield_bond: 0.1,
    dividend: 0.15,
    reit: 0.1,
    covered_call: 0.1,
    growth: 0.05,
    alternative: 0.05
  }),
  template(0.07, "conservative", 0.069, 51, {
    cash: 0,
    savings: 0.05,
    govt_bond: 0.15,
    high_yield_bond: 0.15,
    dividend: 0.2,
    reit: 0.15,
    covered_call: 0.2,
    growth: 0,
    alternative: 0.1
  }),
  template(0.07, "moderate", 0.074, 58, {
    cash: 0,
    savings: 0,
    govt_bond: 0.1,
    high_yield_bond: 0.2,
    dividend: 0.2,
    reit: 0.15,
    covered_call: 0.15,
    growth: 0.1,
    alternative: 0.1
  }),
  template(0.07, "growth", 0.077, 62, {
    cash: 0,
    savings: 0,
    govt_bond: 0.05,
    high_yield_bond: 0.2,
    dividend: 0.2,
    reit: 0.15,
    covered_call: 0.15,
    growth: 0.15,
    alternative: 0.1
  }),
  template(0.07, "aggressive", 0.079, 64, {
    cash: 0,
    savings: 0,
    govt_bond: 0,
    high_yield_bond: 0.2,
    dividend: 0.2,
    reit: 0.15,
    covered_call: 0.2,
    growth: 0.15,
    alternative: 0.1
  }),
  template(0.1, "conservative", 0.071, 54, {
    cash: 0,
    savings: 0.05,
    govt_bond: 0.1,
    high_yield_bond: 0.2,
    dividend: 0.2,
    reit: 0.15,
    covered_call: 0.15,
    growth: 0.05,
    alternative: 0.1
  }),
  template(0.1, "moderate", 0.083, 68, {
    cash: 0,
    savings: 0,
    govt_bond: 0,
    high_yield_bond: 0.2,
    dividend: 0.15,
    reit: 0.15,
    covered_call: 0.2,
    growth: 0.25,
    alternative: 0.05
  }),
  template(0.1, "growth", 0.085, 70, {
    cash: 0,
    savings: 0,
    govt_bond: 0,
    high_yield_bond: 0.15,
    dividend: 0.15,
    reit: 0.15,
    covered_call: 0.15,
    growth: 0.35,
    alternative: 0.05
  }),
  template(0.1, "aggressive", 0.087, 73, {
    cash: 0,
    savings: 0,
    govt_bond: 0,
    high_yield_bond: 0.1,
    dividend: 0.15,
    reit: 0.1,
    covered_call: 0.15,
    growth: 0.45,
    alternative: 0.05
  }),
  template(0.12, "growth", 0.088, 75, {
    cash: 0,
    savings: 0,
    govt_bond: 0,
    high_yield_bond: 0.1,
    dividend: 0.1,
    reit: 0.1,
    covered_call: 0.15,
    growth: 0.5,
    alternative: 0.05
  }),
  template(0.12, "aggressive", 0.091, 78, {
    cash: 0,
    savings: 0,
    govt_bond: 0,
    high_yield_bond: 0.05,
    dividend: 0.1,
    reit: 0.05,
    covered_call: 0.15,
    growth: 0.6,
    alternative: 0.05
  })
];

export function findTargetAllocationTemplate(
  targetReturnBand: number,
  riskTolerance: RiskTolerance
) {
  return TARGET_ALLOCATION_TEMPLATES.find(
    (templateItem) =>
      templateItem.targetReturnBand === targetReturnBand &&
      templateItem.riskTolerance === riskTolerance
  );
}
