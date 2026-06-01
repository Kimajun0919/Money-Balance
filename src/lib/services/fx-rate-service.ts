import { MockFxRateProvider } from "@/lib/providers/fx-rate/mock-fx-rate-provider";
import type {
  FxRateProvider,
  FxRateResult
} from "@/lib/providers/fx-rate/fx-rate-provider";
import { logKpiEvent } from "@/lib/kpi/event-logger";
import type { AppState, Asset, FxRateSnapshot } from "@/lib/types";
import { createId } from "@/lib/services/service-utils";
import { updateAssetValuation } from "@/lib/services/valuation-service";

export interface FxRateRefreshResult {
  state: AppState;
  rates: FxRateResult[];
  warnings: string[];
}

function toFxRateSnapshot(rate: FxRateResult): FxRateSnapshot {
  return {
    id: createId("fx"),
    baseCurrency: rate.baseCurrency,
    quoteCurrency: rate.quoteCurrency,
    rate: rate.rate,
    rateDate: rate.rateDate,
    source: rate.source,
    fetchedAt: rate.fetchedAt,
    isEstimated: rate.isEstimated,
    rawData: rate.rawResponseOptional,
    createdAt: new Date().toISOString()
  };
}

export async function refreshFxRates(
  state: AppState,
  provider: FxRateProvider = new MockFxRateProvider(),
  quoteCurrency = "KRW"
): Promise<FxRateRefreshResult> {
  logKpiEvent("fx_rate_refresh_started", {
    provider: provider.providerName
  });

  const rateMap = new Map<string, FxRateResult>();
  const warnings: string[] = [];

  for (const asset of state.assets) {
    const currency = asset.currency.toUpperCase();
    if (currency === quoteCurrency) continue;
    if (!rateMap.has(currency)) {
      try {
        const rate = await provider.getRate({
          baseCurrency: currency,
          quoteCurrency
        });
        rateMap.set(currency, rate);
      } catch (error) {
        warnings.push(
          `${currency}: ${
            error instanceof Error ? error.message : "환율 조회에 실패했습니다."
          }`
        );
      }
    }
  }

  const updatedAssets: Asset[] = state.assets.map((asset) => {
    const rate = rateMap.get(asset.currency.toUpperCase());
    if (!rate) return asset;
    return updateAssetValuation({ asset, fxRate: rate }).asset;
  });
  const rates = [...rateMap.values()];
  const snapshots = rates.map(toFxRateSnapshot);

  logKpiEvent("fx_rate_refresh_completed", {
    provider: provider.providerName,
    updatedCount: snapshots.length,
    warningCount: warnings.length
  });

  return {
    state: {
      ...state,
      assets: updatedAssets,
      fxRateSnapshots: [...snapshots, ...state.fxRateSnapshots]
    },
    rates,
    warnings
  };
}
