import type {
  FinancialDataProvider,
  FinancialProviderPermissionScope,
  FinancialProviderPayload,
  FinancialProviderSyncPreview,
  ProviderAccountPayload,
  ProviderHoldingPayload
} from "@/lib/services/providers/account/account-provider";

export class MockSecuritiesProvider implements FinancialDataProvider {
  readonly providerId = "mock-securities";
  readonly providerName = "모의 증권";
  readonly providerType = "securities" as const;
  readonly permissionScope: FinancialProviderPermissionScope[] = [
    "read_accounts",
    "read_balances",
    "read_holdings"
  ];

  async checkConnectionStatus() {
    return {
      status: "connected" as const,
      message: "로컬 개발용 모의 증권 연결입니다."
    };
  }

  async fetchAccounts(): Promise<ProviderAccountPayload[]> {
    return [
      {
        externalAccountId: "mock-sec-cash-001",
        institutionName: this.providerName,
        accountAlias: "모의 종합계좌 예수금",
        accountType: "securities_cash",
        currency: "KRW",
        balance: 1_500_000,
        rawData: { source: "mock" }
      },
      {
        externalAccountId: "mock-sec-domestic-001",
        institutionName: this.providerName,
        accountAlias: "국내주식 평가금",
        accountType: "domestic_stock",
        currency: "KRW",
        balance: 4_000_000,
        rawData: { source: "mock" }
      },
      {
        externalAccountId: "mock-sec-overseas-001",
        institutionName: this.providerName,
        accountAlias: "해외주식 평가금",
        accountType: "overseas_stock",
        currency: "USD",
        balance: 5_200,
        exchangeRate: 1350,
        rawData: { source: "mock" }
      }
    ];
  }

  async fetchBalances() {
    return this.fetchAccounts();
  }

  async fetchHoldings(): Promise<ProviderHoldingPayload[]> {
    return [
      {
        externalAssetId: "mock-krx-005930",
        externalAccountId: "mock-sec-domestic-001",
        institutionName: this.providerName,
        accountAlias: "국내주식 평가금",
        assetName: "삼성전자",
        accountType: "domestic_stock",
        ticker: "005930",
        market: "KRX",
        brokerName: this.providerName,
        currency: "KRW",
        quantity: 50,
        currentPrice: 80_000,
        valuationAmount: 4_000_000,
        exchangeRate: 1,
        rawAssetType: "domestic_stock",
        rawData: { source: "mock" }
      },
      {
        externalAssetId: "mock-us-spy",
        externalAccountId: "mock-sec-overseas-001",
        institutionName: this.providerName,
        accountAlias: "해외주식 평가금",
        assetName: "SPDR S&P 500 ETF",
        accountType: "etf",
        ticker: "SPY",
        market: "NYSE",
        brokerName: this.providerName,
        currency: "USD",
        quantity: 10,
        currentPrice: 520,
        valuationAmount: 5_200,
        exchangeRate: 1350,
        rawAssetType: "overseas_etf",
        rawData: { source: "mock" }
      }
    ];
  }

  async previewSync(): Promise<FinancialProviderSyncPreview> {
    const payload: FinancialProviderPayload = {
      fetchedAt: new Date().toISOString(),
      accounts: await this.fetchAccounts(),
      holdings: await this.fetchHoldings(),
      warnings: []
    };

    return {
      providerId: this.providerId,
      fetchedAt: payload.fetchedAt,
      payload,
      warnings: []
    };
  }

  normalizePayload(payload: FinancialProviderPayload) {
    return payload;
  }

  async disconnect() {
    return undefined;
  }
}
