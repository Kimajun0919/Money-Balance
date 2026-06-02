import type {
  BrokerProvider,
  BrokerSyncResult
} from "@/lib/providers/broker/broker-provider";
import {
  KIS_BROKER_NAME,
  KIS_BROKER_PROVIDER_NAME
} from "@/lib/providers/broker/broker-provider-constants";
import type {
  FinancialDataProvider,
  FinancialProviderPermissionScope,
  FinancialProviderPayload,
  FinancialProviderSyncPreview,
  ProviderAccountPayload,
  ProviderHoldingPayload
} from "@/lib/services/providers/account/account-provider";

function holdingAccountType(rawAssetType?: string): ProviderHoldingPayload["accountType"] {
  const normalized = rawAssetType?.toLowerCase() ?? "";
  if (normalized.includes("etf")) return "etf";
  if (normalized.includes("bond")) return "bond";
  if (normalized.includes("overseas")) return "overseas_stock";
  return "domestic_stock";
}

export function normalizeKisBrokerSyncResult(
  syncResult: BrokerSyncResult,
  options: {
    institutionName?: string;
    brokerName?: string;
  } = {}
): FinancialProviderPayload {
  const institutionName = options.institutionName ?? KIS_BROKER_NAME;
  const brokerName = options.brokerName ?? KIS_BROKER_NAME;
  const accountsById = new Map<string, ProviderAccountPayload>();

  for (const cash of syncResult.cashBalances) {
    accountsById.set(cash.externalAssetId, {
      externalAccountId: cash.externalAssetId,
      institutionName,
      accountAlias: cash.accountAlias ?? "KIS 예수금",
      accountType: "securities_cash",
      currency: cash.currency,
      balance: cash.amount,
      rawData: { provider: KIS_BROKER_PROVIDER_NAME, source: "cash_balance" }
    });
  }

  for (const holding of syncResult.holdings) {
    const accountId = holding.accountAlias ?? "kis-holdings";
    if (!accountsById.has(accountId)) {
      const valuationAmount =
        holding.valuationAmount ??
        (holding.quantity ?? 0) * (holding.currentPrice ?? 0);
      accountsById.set(accountId, {
        externalAccountId: accountId,
        institutionName,
        accountAlias: holding.accountAlias ?? "KIS 보유상품",
        accountType: holdingAccountType(holding.rawAssetType),
      currency: holding.currency,
      balance: valuationAmount,
      exchangeRate: holding.exchangeRate,
      rawData: { provider: KIS_BROKER_PROVIDER_NAME, source: "holding_total" }
      });
    }
  }

  return {
    fetchedAt: syncResult.fetchedAt,
    accounts: [...accountsById.values()],
    holdings: syncResult.holdings.map((holding) => ({
      externalAssetId: holding.externalAssetId,
      externalAccountId: holding.accountAlias ?? "kis-holdings",
      institutionName,
      accountAlias: holding.accountAlias ?? "KIS 보유상품",
      assetName: holding.assetName,
      accountType: holdingAccountType(holding.rawAssetType),
      ticker: holding.ticker,
      market: holding.market,
      brokerName,
      currency: holding.currency,
      quantity: holding.quantity,
      currentPrice: holding.currentPrice,
      valuationAmount: holding.valuationAmount,
      exchangeRate: holding.exchangeRate,
      rawAssetType: holding.rawAssetType,
      rawData: { provider: KIS_BROKER_PROVIDER_NAME, source: "holding" }
    })),
    warnings: syncResult.warnings
  };
}

export class KisAccountProvider implements FinancialDataProvider {
  readonly providerId = KIS_BROKER_PROVIDER_NAME;
  readonly providerName = KIS_BROKER_NAME;
  readonly providerType = "broker" as const;
  readonly permissionScope: FinancialProviderPermissionScope[] = [
    "read_accounts",
    "read_balances",
    "read_holdings"
  ];

  constructor(private readonly brokerProvider: BrokerProvider) {}

  async checkConnectionStatus() {
    return {
      status: "connected" as const,
      message: "KIS 서버 관리 환경변수 기반 읽기 연결입니다."
    };
  }

  async fetchAccounts() {
    const syncResult = await this.brokerProvider.sync("server-managed-kis");
    return normalizeKisBrokerSyncResult(syncResult).accounts;
  }

  async fetchBalances() {
    return this.fetchAccounts();
  }

  async fetchHoldings() {
    const syncResult = await this.brokerProvider.sync("server-managed-kis");
    return normalizeKisBrokerSyncResult(syncResult).holdings;
  }

  async previewSync(): Promise<FinancialProviderSyncPreview> {
    const syncResult = await this.brokerProvider.sync("server-managed-kis");
    const payload = normalizeKisBrokerSyncResult(syncResult);
    return {
      providerId: this.providerId,
      fetchedAt: payload.fetchedAt,
      payload,
      warnings: payload.warnings
    };
  }

  normalizePayload(payload: FinancialProviderPayload) {
    return payload;
  }

  async disconnect() {
    return undefined;
  }
}
