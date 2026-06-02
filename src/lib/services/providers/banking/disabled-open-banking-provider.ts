import type {
  FinancialDataProvider,
  FinancialProviderPermissionScope,
  FinancialProviderPayload,
  FinancialProviderSyncPreview
} from "@/lib/services/providers/account/account-provider";

export class DisabledOpenBankingProvider implements FinancialDataProvider {
  readonly providerId = "open-banking-disabled";
  readonly providerName = "오픈뱅킹";
  readonly providerType = "open_banking" as const;
  readonly permissionScope: FinancialProviderPermissionScope[] = [
    "read_accounts",
    "read_balances",
    "read_transactions"
  ];
  readonly requiredEnvironmentVariables = [
    "ENABLE_OPEN_BANKING_PROVIDER",
    "OPEN_BANKING_CLIENT_ID",
    "OPEN_BANKING_CLIENT_SECRET",
    "OPEN_BANKING_REDIRECT_URI"
  ];

  async checkConnectionStatus() {
    return {
      status: "unsupported" as const,
      message:
        "공식 오픈뱅킹 접근 권한과 자격 증명이 설정되지 않아 비활성화되어 있습니다."
    };
  }

  async fetchAccounts() {
    return [];
  }

  async fetchBalances() {
    return [];
  }

  async fetchHoldings() {
    return [];
  }

  async fetchTransactions() {
    return [];
  }

  async previewSync(): Promise<FinancialProviderSyncPreview> {
    const payload: FinancialProviderPayload = {
      fetchedAt: new Date().toISOString(),
      accounts: [],
      holdings: [],
      transactions: [],
      warnings: [
        "오픈뱅킹은 공식 접근 권한과 자격 증명이 필요합니다. 실제 데이터를 모의로 생성하지 않습니다."
      ]
    };

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
