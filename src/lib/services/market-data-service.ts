import { MockMarketDataProvider } from "@/lib/providers/market-data/mock-market-data-provider";
import type {
  HistoricalPriceResult,
  MarketDataProvider,
  MarketPriceResult
} from "@/lib/providers/market-data/market-data-provider";
import { logKpiEvent } from "@/lib/kpi/event-logger";
import type { AppState, Asset, MarketPriceSnapshot } from "@/lib/types";
import { createId } from "@/lib/services/service-utils";
import { updateAssetValuation } from "@/lib/services/valuation-service";

export interface MarketDataRefreshItem {
  assetId: string;
  assetName: string;
  price?: MarketPriceResult;
  historicalPrices?: HistoricalPriceResult;
  warnings: string[];
}

export interface MarketDataRefreshResult {
  state: AppState;
  items: MarketDataRefreshItem[];
  warnings: string[];
}

function toMarketPriceSnapshot(price: MarketPriceResult): MarketPriceSnapshot {
  return {
    id: createId("price"),
    ticker: price.ticker,
    market: price.market,
    currency: price.currency,
    price: price.price,
    priceDate: price.priceDate,
    source: price.source,
    fetchedAt: price.fetchedAt,
    isDelayed: price.isDelayed,
    delayMinutes: price.delayMinutes,
    rawData: price.rawResponseOptional,
    createdAt: new Date().toISOString()
  };
}

function canLookupPrice(asset: Asset) {
  return Boolean(asset.ticker && asset.market);
}

export async function refreshMarketPrices(
  state: AppState,
  provider: MarketDataProvider = new MockMarketDataProvider()
): Promise<MarketDataRefreshResult> {
  logKpiEvent("market_price_refresh_started", {
    provider: provider.providerName
  });

  const items: MarketDataRefreshItem[] = [];
  const snapshots: MarketPriceSnapshot[] = [];
  const updatedAssets: Asset[] = [];
  const warnings: string[] = [];

  for (const asset of state.assets) {
    if (!canLookupPrice(asset)) {
      updatedAssets.push(asset);
      if (asset.ticker && !asset.market) {
        warnings.push(`${asset.assetName}: 거래시장이 없어 시세 조회를 건너뛰었습니다.`);
      }
      continue;
    }

    try {
      const price = await provider.getCurrentPrice({
        ticker: asset.ticker ?? "",
        market: asset.market ?? "",
        currency: asset.currency,
        assetType: asset.assetType
      });
      const historicalPrices = await provider.getHistoricalPrices({
        ticker: asset.ticker ?? "",
        market: asset.market ?? "",
        currency: asset.currency,
        assetType: asset.assetType,
        period: asset.priceChangePeriodType ?? "1y"
      });
      const valuation = updateAssetValuation({
        asset,
        marketPrice: price,
        historicalPrices
      });
      snapshots.push(toMarketPriceSnapshot(price));
      updatedAssets.push(valuation.asset);
      items.push({
        assetId: asset.id,
        assetName: asset.assetName,
        price,
        historicalPrices,
        warnings: valuation.warnings
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "시세 조회 중 알 수 없는 오류가 발생했습니다.";
      warnings.push(`${asset.assetName}: ${message}`);
      updatedAssets.push(asset);
      items.push({
        assetId: asset.id,
        assetName: asset.assetName,
        warnings: [message]
      });
    }
  }

  const nextState: AppState = {
    ...state,
    assets: updatedAssets,
    marketPriceSnapshots: [...snapshots, ...state.marketPriceSnapshots],
    assetPriceLinks: updatedAssets.map((asset) => {
      const existing = state.assetPriceLinks.find((link) => link.assetId === asset.id);
      if (!asset.ticker || !asset.market) return existing;
      const now = new Date().toISOString();
      return {
        id: existing?.id ?? createId("assetprice"),
        assetId: asset.id,
        ticker: asset.ticker,
        market: asset.market,
        priceSource: asset.priceSource ?? provider.providerName,
        fxSource: asset.fxSource,
        autoPriceEnabled: true,
        autoFxEnabled: asset.currency.toUpperCase() !== "KRW",
        lastPriceUpdatedAt: asset.lastPriceUpdatedAt,
        lastFxUpdatedAt: asset.lastFxUpdatedAt,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      };
    }).filter((link): link is AppState["assetPriceLinks"][number] => Boolean(link))
  };

  logKpiEvent("market_price_refresh_completed", {
    provider: provider.providerName,
    updatedCount: snapshots.length,
    warningCount: warnings.length
  });

  return { state: nextState, items, warnings };
}
