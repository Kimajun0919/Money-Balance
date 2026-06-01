import type {
  BrokerCashBalance,
  BrokerConnectionRequest,
  BrokerConnectionResult,
  BrokerHolding,
  BrokerProvider,
  BrokerSyncResult
} from "@/lib/providers/broker/broker-provider";

export class MockBrokerProvider implements BrokerProvider {
  readonly providerName: string = "mock-broker-readonly";
  readonly brokerName: string = "모의 증권사";
  readonly readOnlyScopes = ["read_holdings", "read_cash"];

  async connect(
    input: BrokerConnectionRequest
  ): Promise<BrokerConnectionResult> {
    if (!input.consentAccepted) {
      throw new Error("읽기 전용 연동 동의가 필요합니다.");
    }
    if (!input.accessToken.trim()) {
      throw new Error("모의 토큰을 입력해야 합니다.");
    }

    return {
      providerName: this.providerName,
      brokerName: this.brokerName,
      accountIdentifierMasked: "MOCK-****-1024",
      scopes: this.readOnlyScopes,
      connectedAt: new Date().toISOString()
    };
  }

  async fetchHoldings(_connectionId: string): Promise<BrokerHolding[]> {
    return [
      {
        externalAssetId: "mock-spy",
        assetName: "SPDR S&P 500 ETF",
        ticker: "SPY",
        market: "NYSE",
        currency: "USD",
        quantity: 10,
        currentPrice: 520,
        exchangeRate: 1350,
        purchaseAmount: 4800,
        purchaseUnitPrice: 480,
        brokerProductType: "ETF",
        rawAssetType: "equity_etf",
        accountAlias: "모의 종합계좌",
        accountType: "general",
        rawData: { source: "mock", id: "mock-spy" }
      },
      {
        externalAssetId: "mock-qyld",
        assetName: "Global X Nasdaq 100 Covered Call ETF",
        ticker: "QYLD",
        market: "NASDAQ",
        currency: "USD",
        quantity: 150,
        currentPrice: 17.5,
        exchangeRate: 1350,
        purchaseAmount: 2700,
        purchaseUnitPrice: 18,
        brokerProductType: "covered call ETF",
        rawAssetType: "option_income",
        accountAlias: "모의 종합계좌",
        accountType: "general",
        rawData: { source: "mock", id: "mock-qyld" }
      }
    ];
  }

  async fetchCashBalances(_connectionId: string): Promise<BrokerCashBalance[]> {
    return [
      {
        externalAssetId: "mock-krw-cash",
        assetName: "예수금",
        currency: "KRW",
        amount: 1_500_000,
        exchangeRate: 1,
        accountAlias: "모의 종합계좌",
        rawData: { source: "mock", id: "mock-krw-cash" }
      }
    ];
  }

  async sync(connectionId: string): Promise<BrokerSyncResult> {
    const [holdings, cashBalances] = await Promise.all([
      this.fetchHoldings(connectionId),
      this.fetchCashBalances(connectionId)
    ]);

    return {
      fetchedAt: new Date().toISOString(),
      holdings,
      cashBalances,
      warnings: []
    };
  }

  async disconnect(_connectionId: string): Promise<void> {
    return undefined;
  }
}
