import type {
  BrokerCashBalance,
  BrokerHolding
} from "@/lib/providers/broker/broker-provider";
import { classifyAsset } from "@/lib/services/asset-classification-service";
import type { Asset, AssetClassificationResult, AssetType } from "@/lib/types";
import { createAssetFromInput } from "@/lib/utils/asset-factory";
import type { AssetInput } from "@/lib/validators/asset-validator";

export interface ExternalAssetLike {
  externalAssetId: string;
  assetName: string;
  ticker?: string;
  market?: string;
  currency: string;
  quantity?: number;
  currentPrice?: number;
  valuationAmount?: number;
  exchangeRate?: number;
  purchaseAmount?: number;
  purchaseUnitPrice?: number;
  purchaseDate?: string;
  brokerName?: string;
  accountAlias?: string;
  rawAssetType?: string;
  brokerProductType?: string;
  suggestedAssetType?: AssetType;
  rawData: Record<string, unknown>;
}

export interface NormalizedExternalAsset {
  externalAssetId: string;
  assetInput: AssetInput;
  asset: Asset;
  classification: AssetClassificationResult;
  warnings: string[];
  rawData: Record<string, unknown>;
}

function toValuationAmount(raw: ExternalAssetLike) {
  if (raw.valuationAmount !== undefined) return raw.valuationAmount;
  if (raw.quantity !== undefined && raw.currentPrice !== undefined) {
    return raw.quantity * raw.currentPrice;
  }
  return 0;
}

export function normalizeExternalAsset(
  raw: ExternalAssetLike,
  options: {
    brokerName?: string;
    externalConnectionId?: string;
    syncedAt?: string;
    fallbackAssetType?: AssetType;
  } = {}
): NormalizedExternalAsset {
  const warnings: string[] = [];
  const currency = raw.currency.toUpperCase();
  const valuationAmount = toValuationAmount(raw);
  const exchangeRate = currency === "KRW" ? 1 : raw.exchangeRate ?? 0;
  const classification = classifyAsset({
    assetName: raw.assetName,
    ticker: raw.ticker,
    market: raw.market,
    brokerProductType: raw.brokerProductType,
    rawAssetType: raw.rawAssetType,
    currency,
    userSelectedAssetType: raw.suggestedAssetType ?? options.fallbackAssetType
  });

  if (!raw.ticker) {
    warnings.push("종목코드가 없어 수동 평가금액 또는 증권사 제공 평가금액을 사용했습니다.");
  }
  if (currency !== "KRW" && !raw.exchangeRate) {
    warnings.push("외화 환율이 없어 저장 전 환율 확인이 필요합니다.");
  }
  if (valuationAmount <= 0) {
    warnings.push("평가금액을 계산할 수 없어 이 행은 저장 전에 확인해야 합니다.");
  }

  const assetInput: AssetInput = {
    assetName: raw.assetName,
    assetType: classification.suggestedAssetType,
    ticker: raw.ticker,
    market: raw.market,
    brokerName: raw.brokerName ?? options.brokerName,
    accountAlias: raw.accountAlias,
    externalConnectionId: options.externalConnectionId,
    externalAssetId: raw.externalAssetId,
    valuationAmount,
    currency,
    exchangeRate,
    quantity: raw.quantity,
    purchaseUnitPrice: raw.purchaseUnitPrice,
    purchaseAmount: raw.purchaseAmount,
    purchaseDate: raw.purchaseDate,
    incomeYield: classification.suggestedAssetType === "covered_call" ? 0.1 : 0,
    expectedCapitalReturn:
      classification.suggestedAssetType === "growth" ? 0.09 : 0,
    priceChangeRate: 0,
    priceChangePeriodType: "1y",
    fxChangeRate: 0,
    incomeTaxRate: 0.154,
    capitalGainTaxRate: 0.154,
    accountType: "general",
    valuationSource: "broker_sync",
    priceSource: raw.currentPrice ? "broker_sync" : undefined,
    fxSource: raw.exchangeRate ? "broker_sync" : undefined,
    lastSyncedAt: options.syncedAt,
    lastPriceUpdatedAt: raw.currentPrice ? options.syncedAt : undefined,
    lastFxUpdatedAt: raw.exchangeRate ? options.syncedAt : undefined,
    isAutoImported: true,
    userConfirmedAssetType: Boolean(raw.suggestedAssetType)
  };

  return {
    externalAssetId: raw.externalAssetId,
    assetInput,
    asset: createAssetFromInput(assetInput),
    classification,
    warnings,
    rawData: raw.rawData
  };
}

export function normalizeBrokerHolding(
  holding: BrokerHolding,
  options: {
    brokerName: string;
    externalConnectionId: string;
    syncedAt: string;
  }
) {
  return normalizeExternalAsset(
    {
      ...holding,
      brokerName: options.brokerName
    },
    options
  );
}

export function normalizeBrokerCashBalance(
  cashBalance: BrokerCashBalance,
  options: {
    brokerName: string;
    externalConnectionId: string;
    syncedAt: string;
  }
) {
  return normalizeExternalAsset(
    {
      externalAssetId: cashBalance.externalAssetId,
      assetName: cashBalance.assetName,
      currency: cashBalance.currency,
      valuationAmount: cashBalance.amount,
      exchangeRate: cashBalance.exchangeRate,
      accountAlias: cashBalance.accountAlias,
      brokerName: options.brokerName,
      suggestedAssetType: "cash",
      rawData: cashBalance.rawData
    },
    options
  );
}
