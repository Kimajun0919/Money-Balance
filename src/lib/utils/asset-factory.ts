import { getAssetTypeSetting } from "@/lib/constants/asset-types";
import { getDefaultTaxRate } from "@/lib/constants/tax-rates";
import type { Asset } from "@/lib/types";
import type { AssetInput } from "@/lib/validators/asset-validator";
import { annualizePriceChangeRate } from "@/lib/utils/annualize";
import { calculateAssetExpectedReturn } from "@/lib/engines/return-calculation-engine";

export function createAssetFromInput(input: AssetInput, existingId?: string): Asset {
  const setting = getAssetTypeSetting(input.assetType);
  const now = new Date().toISOString();
  const exchangeRate = input.currency.toUpperCase() === "KRW" ? 1 : input.exchangeRate;
  const priceChangeRateAnnualized = annualizePriceChangeRate({
    priceChangeRate: input.priceChangeRate,
    periodType: input.priceChangePeriodType,
    startDate: input.priceChangeStartDate,
    endDate: input.priceChangeEndDate
  });

  return {
    id: existingId ?? crypto.randomUUID(),
    assetName: input.assetName.trim(),
    assetType: input.assetType,
    valuationAmount: input.valuationAmount,
    currency: input.currency.toUpperCase(),
    exchangeRate,
    valuationAmountKrw: input.valuationAmount * exchangeRate,
    quantity: input.quantity,
    purchaseUnitPrice: input.purchaseUnitPrice,
    purchaseAmount: input.purchaseAmount,
    purchaseDate: input.purchaseDate,
    incomeYield: input.incomeYield,
    expectedCapitalReturn: input.expectedCapitalReturn,
    expectedReturn: calculateAssetExpectedReturn({
      incomeYield: input.incomeYield,
      expectedCapitalReturn: input.expectedCapitalReturn
    }),
    priceChangeRate: input.priceChangeRate,
    priceChangePeriodType: input.priceChangePeriodType,
    priceChangeStartDate: input.priceChangeStartDate,
    priceChangeEndDate: input.priceChangeEndDate,
    priceChangeRateAnnualized,
    fxChangeRate: input.fxChangeRate,
    incomeTaxRate: input.incomeTaxRate,
    capitalGainTaxRate: input.capitalGainTaxRate,
    accountType: input.accountType,
    riskLevel: setting.riskLevel,
    riskCoefficient: setting.riskCoefficient,
    liquidityLevel: setting.liquidityLevel,
    liquidityScore: setting.liquidityScore,
    createdAt: now,
    updatedAt: now
  };
}

export function getDefaultAssetInput(assetType: AssetInput["assetType"], accountType: AssetInput["accountType"]): AssetInput {
  const setting = getAssetTypeSetting(assetType);
  const tax = getDefaultTaxRate(accountType, assetType);

  return {
    assetName: "",
    assetType,
    valuationAmount: 0,
    currency: "KRW",
    exchangeRate: 1,
    incomeYield: setting.defaultIncomeYield,
    expectedCapitalReturn: setting.defaultCapitalReturn,
    priceChangeRate: 0,
    priceChangePeriodType: "1y",
    fxChangeRate: 0,
    incomeTaxRate: tax.incomeTaxRate,
    capitalGainTaxRate: tax.capitalGainTaxRate,
    accountType
  };
}
