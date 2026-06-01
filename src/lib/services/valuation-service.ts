import type {
  HistoricalPriceResult,
  MarketPriceResult
} from "@/lib/providers/market-data/market-data-provider";
import type { FxRateResult } from "@/lib/providers/fx-rate/fx-rate-provider";
import type { Asset, ValuationSource } from "@/lib/types";
import { annualizePriceChangeRate } from "@/lib/utils/annualize";
import { calculateAssetExpectedReturn } from "@/lib/engines/return-calculation-engine";

export interface ValuationUpdateResult {
  asset: Asset;
  warnings: string[];
  usedManualValuation: boolean;
}

function calculatePriceChangeRate(
  currentPrice: number,
  historicalPrices?: HistoricalPriceResult
) {
  const firstPrice = historicalPrices?.prices[0]?.price;
  if (!firstPrice || firstPrice <= 0) return undefined;
  return (currentPrice - firstPrice) / firstPrice;
}

function resolveValuationSource(params: {
  usedMarketPrice: boolean;
  usedFxRate: boolean;
  previous?: ValuationSource;
}): ValuationSource {
  if (params.usedMarketPrice && params.usedFxRate) return "market_price";
  if (params.usedMarketPrice || params.usedFxRate) return "mixed";
  return params.previous ?? "manual";
}

export function updateAssetValuation(params: {
  asset: Asset;
  marketPrice?: MarketPriceResult;
  historicalPrices?: HistoricalPriceResult;
  fxRate?: FxRateResult;
}): ValuationUpdateResult {
  const { asset, marketPrice, historicalPrices, fxRate } = params;
  const warnings: string[] = [];
  const hasQuantity = asset.quantity !== undefined && asset.quantity > 0;
  const canUseMarketPrice = Boolean(asset.ticker && hasQuantity && marketPrice);
  const currency = asset.currency.toUpperCase();
  const usedFxRate = Boolean(currency !== "KRW" && fxRate);
  const exchangeRate = currency === "KRW" ? 1 : fxRate?.rate ?? asset.exchangeRate;
  let valuationAmount = asset.valuationAmount;
  let priceChangeRate = asset.priceChangeRate;
  let priceChangePeriodType = asset.priceChangePeriodType;
  let priceChangeStartDate = asset.priceChangeStartDate;
  let priceChangeEndDate = asset.priceChangeEndDate;

  if (canUseMarketPrice && marketPrice) {
    valuationAmount = Number(((asset.quantity ?? 0) * marketPrice.price).toFixed(2));
    const calculatedPriceChangeRate = calculatePriceChangeRate(
      marketPrice.price,
      historicalPrices
    );
    if (calculatedPriceChangeRate !== undefined) {
      priceChangeRate = calculatedPriceChangeRate;
      priceChangePeriodType = historicalPrices?.period ?? asset.priceChangePeriodType;
      priceChangeStartDate = historicalPrices?.startDate ?? asset.priceChangeStartDate;
      priceChangeEndDate = historicalPrices?.endDate ?? marketPrice.priceDate;
    }
  } else if (asset.ticker && !hasQuantity) {
    warnings.push(
      "종목코드는 있지만 수량 정보가 없어 수동 평가금액을 유지했습니다."
    );
  } else if (!asset.ticker) {
    warnings.push(
      "종목코드가 없어 수동 평가금액을 유지했습니다."
    );
  }

  if (currency !== "KRW" && !fxRate) {
    warnings.push("환율 데이터가 없어 기존 환율을 유지했습니다.");
  }

  const priceChangeRateAnnualized = annualizePriceChangeRate({
    priceChangeRate,
    periodType: priceChangePeriodType,
    startDate: priceChangeStartDate,
    endDate: priceChangeEndDate
  });
  const valuationAmountKrw = Number((valuationAmount * exchangeRate).toFixed(2));
  const usedMarketPrice = canUseMarketPrice;
  const valuationSource = resolveValuationSource({
    usedMarketPrice,
    usedFxRate,
    previous: asset.valuationSource
  });

  return {
    asset: {
      ...asset,
      valuationAmount,
      exchangeRate,
      valuationAmountKrw,
      priceChangeRate,
      priceChangePeriodType,
      priceChangeStartDate,
      priceChangeEndDate,
      priceChangeRateAnnualized,
      expectedReturn: calculateAssetExpectedReturn({
        incomeYield: asset.incomeYield,
        expectedCapitalReturn: asset.expectedCapitalReturn
      }),
      valuationSource,
      priceSource: usedMarketPrice ? marketPrice?.source : asset.priceSource,
      fxSource: usedFxRate ? fxRate?.source : asset.fxSource,
      lastPriceUpdatedAt: usedMarketPrice
        ? marketPrice?.fetchedAt
        : asset.lastPriceUpdatedAt,
      lastFxUpdatedAt: usedFxRate ? fxRate?.fetchedAt : asset.lastFxUpdatedAt,
      updatedAt: new Date().toISOString()
    },
    warnings,
    usedManualValuation: !usedMarketPrice
  };
}
