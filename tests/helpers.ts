import type { AccountType, Asset, AssetType } from "@/lib/types";
import { createAssetFromInput } from "@/lib/utils/asset-factory";

export function makeAsset(overrides: {
  assetType?: AssetType;
  amount?: number;
  currency?: string;
  exchangeRate?: number;
  incomeYield?: number;
  expectedCapitalReturn?: number;
  priceChangeRate?: number;
  fxChangeRate?: number;
  accountType?: AccountType;
  ticker?: string;
  market?: string;
  quantity?: number;
} = {}): Asset {
  const assetType = overrides.assetType ?? "cash";
  const accountType = overrides.accountType ?? "general";

  return createAssetFromInput({
    assetName: `${assetType}-테스트`,
    assetType,
    valuationAmount: overrides.amount ?? 10_000_000,
    currency: overrides.currency ?? "KRW",
    exchangeRate: overrides.exchangeRate ?? 1,
    ticker: overrides.ticker,
    market: overrides.market,
    quantity: overrides.quantity,
    incomeYield: overrides.incomeYield ?? 0,
    expectedCapitalReturn: overrides.expectedCapitalReturn ?? 0,
    priceChangeRate: overrides.priceChangeRate ?? 0,
    priceChangePeriodType: "1y",
    fxChangeRate: overrides.fxChangeRate ?? 0,
    incomeTaxRate: 0.154,
    capitalGainTaxRate: 0.154,
    accountType
  });
}
