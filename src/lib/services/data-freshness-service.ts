import type {
  AppState,
  Asset,
  DataFreshnessType,
  DataFreshnessWarning
} from "@/lib/types";

const FRESHNESS_LIMIT_HOURS: Record<DataFreshnessType, number | null> = {
  market_price: 24,
  fx_rate: 24,
  broker_holdings: 24 * 7,
  csv_import: null,
  manual: null
};

export function hoursSince(timestamp?: string, now = new Date()) {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY;
  return (now.getTime() - parsed.getTime()) / (1000 * 60 * 60);
}

export function isDataStale(
  type: DataFreshnessType,
  timestamp?: string,
  now = new Date()
) {
  const limit = FRESHNESS_LIMIT_HOURS[type];
  if (limit === null) return false;
  return hoursSince(timestamp, now) > limit;
}

function warningMessage(type: DataFreshnessType, assetName?: string) {
  const prefix = assetName ? `${assetName}: ` : "";
  if (type === "market_price") {
    return `${prefix}시세 데이터가 최신이 아닐 수 있습니다. 최신 가격으로 다시 조회해 주세요.`;
  }
  if (type === "fx_rate") {
    return `${prefix}환율 데이터가 최신이 아닐 수 있습니다. 원화 환산 금액을 확인해 주세요.`;
  }
  if (type === "broker_holdings") {
    return `${prefix}증권사 잔고 동기화가 7일 이상 진행되지 않았습니다. 최신 잔고 확인을 위해 다시 동기화해 주세요.`;
  }
  if (type === "manual") {
    return `${prefix}이 자산은 수동 입력값을 기준으로 계산하고 있습니다.`;
  }
  return `${prefix}가져온 데이터의 기준일을 확인해 주세요.`;
}

export function getAssetFreshnessWarnings(
  asset: Asset,
  now = new Date()
): DataFreshnessWarning[] {
  const warnings: DataFreshnessWarning[] = [];

  if (asset.valuationSource === "market_price" || asset.valuationSource === "mixed") {
    const stale = isDataStale("market_price", asset.lastPriceUpdatedAt, now);
    if (stale) {
      warnings.push({
        type: "market_price",
        assetId: asset.id,
        assetName: asset.assetName,
        source: asset.priceSource,
        fetchedAt: asset.lastPriceUpdatedAt,
        stale,
        message: warningMessage("market_price", asset.assetName)
      });
    }
  }

  if (asset.currency.toUpperCase() !== "KRW") {
    const stale = isDataStale("fx_rate", asset.lastFxUpdatedAt, now);
    if (asset.fxSource && stale) {
      warnings.push({
        type: "fx_rate",
        assetId: asset.id,
        assetName: asset.assetName,
        source: asset.fxSource,
        fetchedAt: asset.lastFxUpdatedAt,
        stale,
        message: warningMessage("fx_rate", asset.assetName)
      });
    }
  }

  if (asset.valuationSource === "broker_sync") {
    const stale = isDataStale("broker_holdings", asset.lastSyncedAt, now);
    if (stale) {
      warnings.push({
        type: "broker_holdings",
        assetId: asset.id,
        assetName: asset.assetName,
        source: asset.brokerName,
        fetchedAt: asset.lastSyncedAt,
        stale,
        message: warningMessage("broker_holdings", asset.assetName)
      });
    }
  }

  if (!asset.valuationSource || asset.valuationSource === "manual") {
    warnings.push({
      type: "manual",
      assetId: asset.id,
      assetName: asset.assetName,
      stale: false,
      message: warningMessage("manual", asset.assetName)
    });
  }

  return warnings;
}

export function summarizeDataFreshness(
  state: AppState,
  now = new Date()
): DataFreshnessWarning[] {
  return state.assets.flatMap((asset) => getAssetFreshnessWarnings(asset, now));
}
