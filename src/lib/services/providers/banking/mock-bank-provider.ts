import type {
  FinancialDataProvider,
  FinancialProviderPermissionScope,
  FinancialProviderPayload,
  FinancialProviderSyncPreview,
  ProviderAccountPayload
} from "@/lib/services/providers/account/account-provider";

export class MockBankProvider implements FinancialDataProvider {
  readonly providerId = "mock-bank";
  readonly providerName = "모의 은행";
  readonly providerType = "bank" as const;
  readonly permissionScope: FinancialProviderPermissionScope[] = [
    "read_accounts",
    "read_balances"
  ];

  async checkConnectionStatus() {
    return {
      status: "connected" as const,
      message: "로컬 개발용 모의 은행 연결입니다."
    };
  }

  async fetchAccounts(): Promise<ProviderAccountPayload[]> {
    return [
      {
        externalAccountId: "mock-bank-checking-001",
        institutionName: this.providerName,
        accountAlias: "생활비 입출금",
        accountType: "bank_checking",
        currency: "KRW",
        balance: 2_000_000,
        rawData: { source: "mock" }
      },
      {
        externalAccountId: "mock-bank-savings-001",
        institutionName: this.providerName,
        accountAlias: "비상금 예금",
        accountType: "bank_savings",
        currency: "KRW",
        balance: 8_000_000,
        principalAmount: 8_000_000,
        rawData: { source: "mock" }
      },
      {
        externalAccountId: "mock-bank-installment-001",
        institutionName: this.providerName,
        accountAlias: "정기 적금",
        accountType: "installment_savings",
        currency: "KRW",
        balance: 3_000_000,
        principalAmount: 3_000_000,
        rawData: { source: "mock" }
      },
      {
        externalAccountId: "mock-bank-loan-001",
        institutionName: this.providerName,
        accountAlias: "모의 신용대출",
        accountType: "loan",
        currency: "KRW",
        balance: -2_000_000,
        principalAmount: 2_000_000,
        isLiability: true,
        rawData: { source: "mock" }
      }
    ];
  }

  async fetchBalances() {
    return this.fetchAccounts();
  }

  async fetchHoldings() {
    return [];
  }

  async previewSync(): Promise<FinancialProviderSyncPreview> {
    const payload: FinancialProviderPayload = {
      fetchedAt: new Date().toISOString(),
      accounts: await this.fetchAccounts(),
      holdings: [],
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
