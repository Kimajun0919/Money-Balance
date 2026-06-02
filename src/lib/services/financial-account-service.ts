import { appendAccountAuditLog } from "@/lib/services/account-audit-service";
import { createId } from "@/lib/services/service-utils";
import type {
  AppState,
  FinancialAccount,
  FinancialAccountAssetLink,
  FinancialAccountType
} from "@/lib/types";

export interface ManualFinancialAccountInput {
  institutionId?: string;
  accountAlias: string;
  accountType: FinancialAccountType;
  accountSubtype?: string;
  currency: string;
  balance: number;
  valuationAmountKrw?: number;
  liabilityAmountKrw?: number;
  principalAmount?: number;
  warningCodes?: string[];
}

function isLiabilityType(accountType: FinancialAccountType) {
  return accountType === "loan" || accountType === "other_liability";
}

export function buildManualFinancialAccount(
  input: ManualFinancialAccountInput
): FinancialAccount {
  const now = new Date().toISOString();
  const isLiability = isLiabilityType(input.accountType);
  const fallbackKrw = Math.abs(input.balance);

  return {
    id: createId("finacct"),
    institutionId: input.institutionId,
    accountAlias: input.accountAlias,
    accountType: input.accountType,
    accountSubtype: input.accountSubtype,
    currency: input.currency.toUpperCase(),
    balance: input.balance,
    principalAmount: input.principalAmount,
    valuationAmountKrw: isLiability
      ? 0
      : input.valuationAmountKrw ?? fallbackKrw,
    liabilityAmountKrw: isLiability
      ? input.liabilityAmountKrw ?? fallbackKrw
      : input.liabilityAmountKrw,
    isLiability,
    isManual: true,
    valuationSource: "manual",
    syncSource: "manual",
    syncStatus: "never_synced",
    staleStatus: "manual",
    warningCodes: input.warningCodes ?? [],
    isArchived: false,
    createdAt: now,
    updatedAt: now
  };
}

export function createFinancialAccount(
  state: AppState,
  input: ManualFinancialAccountInput
): { state: AppState; account: FinancialAccount } {
  const account = buildManualFinancialAccount(input);
  const nextState: AppState = {
    ...state,
    financialAccounts: [account, ...state.financialAccounts]
  };

  return {
    account,
    state: appendAccountAuditLog(nextState, {
      eventType: "manual_account_created",
      entityType: "financial_account",
      entityId: account.id,
      summary: `${account.accountAlias} 수동 계좌를 추가했습니다.`,
      metadata: { accountType: account.accountType, currency: account.currency }
    })
  };
}

export function updateFinancialAccount(
  state: AppState,
  accountId: string,
  updates: Partial<ManualFinancialAccountInput>
): AppState {
  const now = new Date().toISOString();
  const previous = state.financialAccounts.find((account) => account.id === accountId);
  if (!previous || !previous.isManual) return state;

  const nextAccount: FinancialAccount = {
    ...previous,
    institutionId: updates.institutionId ?? previous.institutionId,
    accountAlias: updates.accountAlias ?? previous.accountAlias,
    accountType: updates.accountType ?? previous.accountType,
    accountSubtype: updates.accountSubtype ?? previous.accountSubtype,
    currency: (updates.currency ?? previous.currency).toUpperCase(),
    balance: updates.balance ?? previous.balance,
    principalAmount: updates.principalAmount ?? previous.principalAmount,
    valuationAmountKrw:
      updates.valuationAmountKrw ?? previous.valuationAmountKrw,
    liabilityAmountKrw:
      updates.liabilityAmountKrw ?? previous.liabilityAmountKrw,
    warningCodes: updates.warningCodes ?? previous.warningCodes,
    isLiability: updates.accountType
      ? isLiabilityType(updates.accountType)
      : previous.isLiability,
    updatedAt: now
  };

  const nextState: AppState = {
    ...state,
    financialAccounts: state.financialAccounts.map((account) =>
      account.id === accountId ? nextAccount : account
    )
  };

  return appendAccountAuditLog(nextState, {
    eventType: "manual_account_updated",
    entityType: "financial_account",
    entityId: accountId,
    summary: `${nextAccount.accountAlias} 수동 계좌를 수정했습니다.`,
    metadata: { updates: Object.keys(updates) }
  });
}

export function archiveFinancialAccount(
  state: AppState,
  accountId: string
): AppState {
  const now = new Date().toISOString();
  const account = state.financialAccounts.find((item) => item.id === accountId);
  if (!account) return state;
  const nextState: AppState = {
    ...state,
    financialAccounts: state.financialAccounts.map((item) =>
      item.id === accountId
        ? { ...item, isArchived: true, updatedAt: now }
        : item
    )
  };

  return appendAccountAuditLog(nextState, {
    eventType: "account_archived",
    entityType: "financial_account",
    entityId: accountId,
    summary: `${account.accountAlias} 계좌를 보관 처리했습니다.`
  });
}

export function linkAccountToAsset(
  state: AppState,
  financialAccountId: string,
  assetId: string,
  linkType: FinancialAccountAssetLink["linkType"] = "manual"
): AppState {
  if (
    state.financialAccountAssetLinks.some(
      (link) =>
        link.financialAccountId === financialAccountId && link.assetId === assetId
    )
  ) {
    return state;
  }
  const now = new Date().toISOString();
  const link: FinancialAccountAssetLink = {
    id: createId("acctlink"),
    financialAccountId,
    assetId,
    linkType,
    createdAt: now,
    updatedAt: now
  };

  return {
    ...state,
    financialAccountAssetLinks: [link, ...state.financialAccountAssetLinks]
  };
}

export function unlinkAccountFromAsset(
  state: AppState,
  financialAccountId: string,
  assetId: string
): AppState {
  return {
    ...state,
    financialAccountAssetLinks: state.financialAccountAssetLinks.filter(
      (link) =>
        !(
          link.financialAccountId === financialAccountId &&
          link.assetId === assetId
        )
    )
  };
}

export function markFinancialAccountStale(
  state: AppState,
  accountId: string,
  warningCode = "account_balance_stale"
): AppState {
  return {
    ...state,
    financialAccounts: state.financialAccounts.map((account) =>
      account.id === accountId
        ? {
            ...account,
            staleStatus: "stale",
            warningCodes: [...new Set([...account.warningCodes, warningCode])],
            updatedAt: new Date().toISOString()
          }
        : account
    )
  };
}

export function markFinancialAccountSynced(
  state: AppState,
  accountId: string,
  syncedAt = new Date().toISOString()
): AppState {
  return {
    ...state,
    financialAccounts: state.financialAccounts.map((account) =>
      account.id === accountId
        ? {
            ...account,
            syncStatus: "synced",
            staleStatus: "fresh",
            lastSyncedAt: syncedAt,
            lastSuccessfulSyncAt: syncedAt,
            warningCodes: account.warningCodes.filter(
              (warning) => warning !== "account_balance_stale"
            ),
            updatedAt: syncedAt
          }
        : account
    )
  };
}

export function markFinancialAccountError(
  state: AppState,
  accountId: string,
  warningCode = "sync_failed"
): AppState {
  const now = new Date().toISOString();
  return {
    ...state,
    financialAccounts: state.financialAccounts.map((account) =>
      account.id === accountId
        ? {
            ...account,
            syncStatus: "failed",
            staleStatus: "stale",
            lastFailedSyncAt: now,
            warningCodes: [...new Set([...account.warningCodes, warningCode])],
            updatedAt: now
          }
        : account
    )
  };
}
