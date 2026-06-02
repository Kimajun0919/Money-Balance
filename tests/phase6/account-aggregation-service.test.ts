import { describe, expect, it } from "vitest";
import { buildAccountAggregationDashboard } from "@/lib/services/account-aggregation-service";
import { createDefaultState } from "@/lib/storage/default-state";
import type { AppState, FinancialAccount, FinancialInstitution } from "@/lib/types";

const now = "2026-06-02T00:00:00.000Z";
const stale = "2026-05-30T00:00:00.000Z";

function institution(id: string, displayName: string): FinancialInstitution {
  return {
    id,
    name: id,
    displayName,
    institutionType: id.includes("bank") ? "bank" : "securities",
    countryCode: "KR",
    providerType: id.includes("bank") ? "bank" : "securities",
    providerId: id,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };
}

function account(overrides: Partial<FinancialAccount>): FinancialAccount {
  return {
    id: overrides.id ?? "account",
    institutionId: overrides.institutionId,
    accountAlias: overrides.accountAlias ?? "계좌",
    accountType: overrides.accountType ?? "bank_checking",
    currency: overrides.currency ?? "KRW",
    balance: overrides.balance ?? 0,
    valuationAmountKrw: overrides.valuationAmountKrw ?? 0,
    liabilityAmountKrw: overrides.liabilityAmountKrw,
    isLiability: overrides.isLiability ?? false,
    isManual: overrides.isManual ?? false,
    valuationSource: overrides.valuationSource ?? "external_balance",
    syncSource: overrides.syncSource ?? "bank",
    lastSyncedAt: overrides.lastSyncedAt ?? now,
    lastSuccessfulSyncAt: overrides.lastSuccessfulSyncAt ?? now,
    syncStatus: overrides.syncStatus ?? "synced",
    staleStatus: overrides.staleStatus ?? "fresh",
    warningCodes: overrides.warningCodes ?? [],
    isArchived: false,
    createdAt: now,
    updatedAt: now
  };
}

function state(): AppState {
  return {
    ...createDefaultState(),
    assets: [],
    financialInstitutions: [
      institution("bank-main", "주거래 은행"),
      institution("sec-main", "주거래 증권")
    ],
    financialAccounts: [
      account({
        id: "checking",
        institutionId: "bank-main",
        accountAlias: "입출금",
        accountType: "bank_checking",
        balance: 1_000_000,
        valuationAmountKrw: 1_000_000
      }),
      account({
        id: "usd",
        institutionId: "sec-main",
        accountAlias: "해외주식",
        accountType: "overseas_stock",
        currency: "USD",
        balance: 1_000,
        valuationAmountKrw: 1_350_000,
        valuationSource: "mixed",
        syncSource: "securities",
        lastSyncedAt: stale
      }),
      account({
        id: "loan",
        institutionId: "bank-main",
        accountAlias: "대출",
        accountType: "loan",
        balance: -500_000,
        valuationAmountKrw: 0,
        liabilityAmountKrw: 500_000,
        isLiability: true
      })
    ],
    liabilities: [
      {
        id: "liability",
        financialAccountId: "loan",
        name: "대출",
        liabilityType: "credit_loan",
        currency: "KRW",
        principalAmount: 500_000,
        currentBalance: 500_000,
        valuationAmountKrw: 500_000,
        isManual: false,
        createdAt: now,
        updatedAt: now
      }
    ],
    externalConnections: [
      {
        id: "failed-connection",
        providerType: "bank",
        providerName: "failed-bank",
        scopes: ["read_accounts"],
        status: "failed",
        lastError: "테스트 실패",
        createdAt: now,
        updatedAt: now
      }
    ]
  };
}

describe("phase6 account aggregation", () => {
  it("calculates assets, liabilities, net worth, and summaries", () => {
    const dashboard = buildAccountAggregationDashboard(state());

    expect(dashboard.grossAssetsKrw).toBe(2_350_000);
    expect(dashboard.totalLiabilitiesKrw).toBe(500_000);
    expect(dashboard.totalNetWorthKrw).toBe(1_850_000);
    expect(dashboard.cashTotalKrw).toBe(1_000_000);
    expect(dashboard.investmentTotalKrw).toBe(1_350_000);
    expect(dashboard.institutionSummary).toHaveLength(2);
    expect(dashboard.accountSummary).toHaveLength(3);
    expect(dashboard.assetClassSummary.cash).toBe(1_000_000);
    expect(dashboard.assetClassSummary.overseas_stocks).toBe(1_350_000);
  });

  it("reports stale account and failed connection warnings", () => {
    const dashboard = buildAccountAggregationDashboard(state());

    expect(
      dashboard.staleDataWarnings.some(
        (warning) => warning.code === "account_balance_stale"
      )
    ).toBe(true);
    expect(
      dashboard.connectionWarnings.some(
        (warning) => warning.code === "connection_failed"
      )
    ).toBe(true);
  });
});
