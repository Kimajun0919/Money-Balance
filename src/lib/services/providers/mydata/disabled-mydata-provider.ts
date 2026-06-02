import type {
  FinancialDataProvider,
  FinancialProviderPermissionScope,
  FinancialProviderPayload,
  FinancialProviderSyncPreview
} from "@/lib/services/providers/account/account-provider";

export class DisabledMyDataProvider implements FinancialDataProvider {
  readonly providerId = "mydata-disabled";
  readonly providerName = "마이데이터";
  readonly providerType = "mydata" as const;
  readonly permissionScope: FinancialProviderPermissionScope[] = [
    "read_accounts",
    "read_balances",
    "read_holdings",
    "read_transactions"
  ];
  readonly requiredApprovalStatus = "공식 마이데이터 사업자 승인 및 API 접근 권한 필요";

  async checkConnectionStatus() {
    return {
      status: "unsupported" as const,
      message:
        "공식 마이데이터 접근 권한과 자격 증명이 설정되지 않아 비활성화되어 있습니다."
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
        "마이데이터는 공식 승인과 접근 권한이 필요합니다. 실제 데이터를 모의로 생성하지 않습니다."
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
