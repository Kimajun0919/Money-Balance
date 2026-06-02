import { describe, expect, it } from "vitest";
import {
  calculateNetWorth,
  createNetWorthSnapshot
} from "@/lib/services/net-worth-service";
import { createDefaultState } from "@/lib/storage/default-state";
import type { AppState, FinancialAccount, Liability } from "@/lib/types";

const now = "2026-06-02T00:00:00.000Z";

function account(overrides: Partial<FinancialAccount>): FinancialAccount {
  return {
    id: overrides.id ?? "account",
    accountAlias: overrides.accountAlias ?? "계좌",
    accountType: overrides.accountType ?? "bank_checking",
    currency: overrides.currency ?? "KRW",
    balance: overrides.balance ?? 0,
    valuationAmountKrw: overrides.valuationAmountKrw ?? 0,
    liabilityAmountKrw: overrides.liabilityAmountKrw,
    isLiability: overrides.isLiability ?? false,
    isManual: overrides.isManual ?? false,
    valuationSource: "external_balance",
    syncSource: "bank",
    lastSyncedAt: overrides.lastSyncedAt ?? now,
    syncStatus: overrides.syncStatus ?? "synced",
    staleStatus: "fresh",
    warningCodes: [],
    isArchived: false,
    createdAt: now,
    updatedAt: now
  };
}

function state(): AppState {
  const liability: Liability = {
    id: "liability",
    financialAccountId: "loan",
    name: "대출",
    liabilityType: "credit_loan",
    currency: "KRW",
    principalAmount: 300_000,
    currentBalance: 300_000,
    valuationAmountKrw: 300_000,
    isManual: false,
    createdAt: now,
    updatedAt: now
  };
  return {
    ...createDefaultState(),
    assets: [],
    financialInstitutions: [],
    financialAccounts: [
      account({
        id: "cash",
        accountType: "bank_checking",
        balance: 1_000_000,
        valuationAmountKrw: 1_000_000
      }),
      account({
        id: "deposit",
        accountType: "bank_savings",
        balance: 2_000_000,
        valuationAmountKrw: 2_000_000
      }),
      account({
        id: "loan",
        accountType: "loan",
        balance: -300_000,
        valuationAmountKrw: 0,
        liabilityAmountKrw: 300_000,
        isLiability: true
      })
    ],
    liabilities: [liability],
    netWorthSnapshots: []
  };
}

describe("phase6 net worth", () => {
  it("includes liabilities in net worth", () => {
    const summary = calculateNetWorth(state());

    expect(summary.totalAssetsKrw).toBe(3_000_000);
    expect(summary.totalLiabilitiesKrw).toBe(300_000);
    expect(summary.netWorthKrw).toBe(2_700_000);
    expect(summary.depositAssetsKrw).toBe(2_000_000);
  });

  it("creates monthly snapshots and replaces duplicate months", () => {
    const first = createNetWorthSnapshot(state(), new Date("2026-06-02"));
    const second = createNetWorthSnapshot(first.state, new Date("2026-06-20"));

    expect(first.snapshot.referenceMonth).toBe("2026-06");
    expect(second.state.netWorthSnapshots).toHaveLength(1);
    expect(second.state.netWorthSnapshots[0].referenceMonth).toBe("2026-06");
  });

  it("stores stale source warning count", () => {
    const staleState = {
      ...state(),
      financialAccounts: [
        account({
          id: "stale",
          lastSyncedAt: "2026-05-01T00:00:00.000Z",
          balance: 1,
          valuationAmountKrw: 1
        })
      ]
    };
    const result = createNetWorthSnapshot(staleState, new Date("2026-06-02"));

    expect(result.snapshot.staleWarningCount).toBeGreaterThan(0);
  });
});
