import {
  CASH_EQUIVALENT_ASSET_TYPES
} from "@/lib/constants/asset-types";
import type { Asset, RiskGrade, RiskScoreResult } from "@/lib/types";
import { clamp, roundTo } from "@/lib/utils/percentage";

export function calculateRiskScoreLimit(lossTolerance: number) {
  const absoluteLossTolerance = Math.abs(lossTolerance);
  if (absoluteLossTolerance <= 0.05) return 40;
  if (absoluteLossTolerance <= 0.1) return 60;
  if (absoluteLossTolerance <= 0.2) return 80;
  return 90;
}

export function getRiskGrade(score: number): RiskGrade {
  if (score <= 30) return "low";
  if (score <= 60) return "medium";
  if (score <= 80) return "high";
  return "very_high";
}

export function getRiskGradeLabel(grade: RiskGrade) {
  const labels: Record<RiskGrade, string> = {
    low: "낮음",
    medium: "보통",
    high: "높음",
    very_high: "매우 높음"
  };
  return labels[grade];
}

export function calculatePriceDeclineScore(
  portfolioPriceChangeRate: number
) {
  if (portfolioPriceChangeRate >= 0) return 0;
  if (portfolioPriceChangeRate > -0.03) return 20;
  if (portfolioPriceChangeRate > -0.05) return 40;
  if (portfolioPriceChangeRate > -0.1) return 60;
  if (portfolioPriceChangeRate > -0.2) return 80;
  return 100;
}

export function calculatePortfolioRiskScore(params: {
  assets: Asset[];
  minCashRatio: number;
  riskScoreLimit: number;
}): RiskScoreResult {
  const totalAssetAmountKrw = params.assets.reduce(
    (sum, asset) => sum + asset.valuationAmountKrw,
    0
  );

  if (totalAssetAmountKrw <= 0) {
    return {
      totalScore: 0,
      grade: "low",
      exceedsLimit: false,
      riskScoreLimit: params.riskScoreLimit,
      cashRatio: 0,
      components: {
        assetCompositionScore: 0,
        concentrationScore: 0,
        cashShortageScore: params.minCashRatio > 0 ? 100 : 0,
        priceDeclineScore: 0,
        fxExposureScore: 0,
        liquidityRiskScore: 0
      },
      portfolioPriceChangeRate: 0,
      foreignAssetRatio: 0
    };
  }

  const assetCompositionScore = params.assets.reduce((sum, asset) => {
    const weight = asset.valuationAmountKrw / totalAssetAmountKrw;
    return sum + weight * 100 * asset.riskCoefficient;
  }, 0);
  const largestSingleAssetAmount = Math.max(
    ...params.assets.map((asset) => asset.valuationAmountKrw)
  );
  const largestSingleAssetRatio =
    largestSingleAssetAmount / totalAssetAmountKrw;
  const concentrationScore = clamp(largestSingleAssetRatio / 0.3, 0, 1) * 100;
  const cashAmount = params.assets
    .filter((asset) => CASH_EQUIVALENT_ASSET_TYPES.includes(asset.assetType))
    .reduce((sum, asset) => sum + asset.valuationAmountKrw, 0);
  const cashRatio = cashAmount / totalAssetAmountKrw;
  const cashShortageRatio =
    params.minCashRatio > 0
      ? Math.max(0, params.minCashRatio - cashRatio) / params.minCashRatio
      : 0;
  const cashShortageScore = clamp(cashShortageRatio, 0, 1) * 100;
  const portfolioPriceChangeRate = params.assets.reduce((sum, asset) => {
    const weight = asset.valuationAmountKrw / totalAssetAmountKrw;
    return sum + weight * asset.priceChangeRateAnnualized;
  }, 0);
  const priceDeclineScore = calculatePriceDeclineScore(
    portfolioPriceChangeRate
  );
  const foreignAssetAmount = params.assets
    .filter((asset) => asset.currency.toUpperCase() !== "KRW")
    .reduce((sum, asset) => sum + asset.valuationAmountKrw, 0);
  const foreignAssetRatio = foreignAssetAmount / totalAssetAmountKrw;
  const fxExposureScore = clamp(foreignAssetRatio / 0.5, 0, 1) * 100;
  const liquidityRiskScore = params.assets.reduce((sum, asset) => {
    const weight = asset.valuationAmountKrw / totalAssetAmountKrw;
    return sum + weight * asset.liquidityScore;
  }, 0);

  const totalScore = roundTo(
    assetCompositionScore * 0.3 +
      concentrationScore * 0.2 +
      cashShortageScore * 0.2 +
      priceDeclineScore * 0.15 +
      fxExposureScore * 0.1 +
      liquidityRiskScore * 0.05,
    2
  );

  return {
    totalScore,
    grade: getRiskGrade(totalScore),
    exceedsLimit: totalScore > params.riskScoreLimit,
    riskScoreLimit: params.riskScoreLimit,
    cashRatio: roundTo(cashRatio, 6),
    components: {
      assetCompositionScore: roundTo(assetCompositionScore, 2),
      concentrationScore: roundTo(concentrationScore, 2),
      cashShortageScore: roundTo(cashShortageScore, 2),
      priceDeclineScore,
      fxExposureScore: roundTo(fxExposureScore, 2),
      liquidityRiskScore: roundTo(liquidityRiskScore, 2)
    },
    portfolioPriceChangeRate: roundTo(portfolioPriceChangeRate, 6),
    foreignAssetRatio: roundTo(foreignAssetRatio, 6)
  };
}
