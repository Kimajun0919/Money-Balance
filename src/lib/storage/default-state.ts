import { getDefaultTaxRate } from "@/lib/constants/tax-rates";
import { calculateRiskScoreLimit } from "@/lib/engines/risk-score-engine";
import type { AppState, Asset, UserProfile } from "@/lib/types";
import { createAssetFromInput } from "@/lib/utils/asset-factory";

export const DEFAULT_PROFILE: UserProfile = {
  name: "게스트",
  targetReturn: 0.1,
  riskTolerance: "moderate",
  lossTolerance: -0.1,
  riskScoreLimit: calculateRiskScoreLimit(-0.1),
  minCashRatio: 0.05,
  monthlyInvestment: 1_000_000,
  investmentHorizon: "three_to_five",
  defaultAccountType: "general"
};

export function createSampleAssets(): Asset[] {
  const accountType = "general";
  const tax = getDefaultTaxRate(accountType, "covered_call");

  return [
    createAssetFromInput({
      assetName: "현금성 계좌",
      assetType: "cash",
      valuationAmount: 5_000_000,
      currency: "KRW",
      exchangeRate: 1,
      incomeYield: 0.028,
      expectedCapitalReturn: 0,
      priceChangeRate: 0,
      priceChangePeriodType: "1y",
      fxChangeRate: 0,
      incomeTaxRate: 0.154,
      capitalGainTaxRate: 0.154,
      accountType
    }),
    createAssetFromInput({
      assetName: "배당 자산군",
      assetType: "dividend",
      valuationAmount: 18_000_000,
      currency: "KRW",
      exchangeRate: 1,
      incomeYield: 0.035,
      expectedCapitalReturn: 0.045,
      priceChangeRate: -0.03,
      priceChangePeriodType: "1y",
      fxChangeRate: 0,
      incomeTaxRate: 0.154,
      capitalGainTaxRate: 0.154,
      accountType
    }),
    createAssetFromInput({
      assetName: "커버드콜 자산군",
      assetType: "covered_call",
      valuationAmount: 12_000_000,
      currency: "KRW",
      exchangeRate: 1,
      incomeYield: 0.11,
      expectedCapitalReturn: -0.015,
      priceChangeRate: -0.12,
      priceChangePeriodType: "1y",
      fxChangeRate: 0,
      incomeTaxRate: tax.incomeTaxRate,
      capitalGainTaxRate: tax.capitalGainTaxRate,
      accountType
    }),
    createAssetFromInput({
      assetName: "성장 자산군",
      assetType: "growth",
      valuationAmount: 15_000,
      currency: "USD",
      exchangeRate: 1350,
      incomeYield: 0.01,
      expectedCapitalReturn: 0.09,
      priceChangeRate: 0.06,
      priceChangePeriodType: "1y",
      fxChangeRate: 0.02,
      incomeTaxRate: 0.154,
      capitalGainTaxRate: 0.22,
      accountType
    })
  ];
}

export function createDefaultState(): AppState {
  return {
    profile: DEFAULT_PROFILE,
    assets: [],
    snapshots: []
  };
}
