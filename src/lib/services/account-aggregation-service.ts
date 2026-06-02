import {
  getAccountFreshnessWarnings,
  type AccountFreshnessWarning
} from "@/lib/services/account-freshness-service";
import { calculateNetWorth } from "@/lib/services/net-worth-service";
import type {
  AppState,
  FinancialAccount,
  FinancialInstitution,
  NetWorthSummary
} from "@/lib/types";

export interface AccountSummaryItem {
  account: FinancialAccount;
  institution?: FinancialInstitution;
  displayValueKrw: number;
  warnings: string[];
}

export interface InstitutionSummaryItem {
  institution: FinancialInstitution;
  accountCount: number;
  assetValueKrw: number;
  liabilityValueKrw: number;
  netValueKrw: number;
  lastSyncedAt?: string;
  status: "connected" | "disconnected" | "error" | "disabled" | "manual";
}

export interface AccountAggregationDashboardData {
  netWorth: NetWorthSummary;
  totalNetWorthKrw: number;
  grossAssetsKrw: number;
  totalLiabilitiesKrw: number;
  cashTotalKrw: number;
  investmentTotalKrw: number;
  bankTotalKrw: number;
  securitiesTotalKrw: number;
  pensionTotalKrw: number;
  assetClassSummary: Record<string, number>;
  institutionSummary: InstitutionSummaryItem[];
  accountSummary: AccountSummaryItem[];
  staleDataWarnings: AccountFreshnessWarning[];
  connectionWarnings: AccountFreshnessWarning[];
}

function accountAssetValue(account: FinancialAccount) {
  return account.isLiability ? 0 : account.valuationAmountKrw;
}

function accountLiabilityValue(account: FinancialAccount) {
  return account.isLiability
    ? Math.max(
        Math.abs(account.liabilityAmountKrw ?? 0),
        Math.abs(account.balance),
        Math.abs(account.valuationAmountKrw)
      )
    : 0;
}

function latestTimestamp(values: Array<string | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function institutionStatus(
  state: AppState,
  institution: FinancialInstitution
): InstitutionSummaryItem["status"] {
  if (!institution.isActive) return "disabled";
  if (institution.providerType === "manual") return "manual";
  const relatedConnections = state.externalConnections.filter(
    (connection) =>
      connection.providerType === institution.providerType ||
      connection.providerName === institution.providerId
  );
  if (relatedConnections.some((connection) => connection.status === "failed")) {
    return "error";
  }
  if (relatedConnections.some((connection) => connection.status === "connected")) {
    return "connected";
  }
  return institution.providerType === "bank" || institution.providerType === "securities"
    ? "connected"
    : "disconnected";
}

export function buildAccountAggregationDashboard(
  state: AppState
): AccountAggregationDashboardData {
  const netWorth = calculateNetWorth(state);
  const activeAccounts = state.financialAccounts.filter(
    (account) => !account.isArchived
  );
  const warnings = getAccountFreshnessWarnings(state);
  const warningMap = new Map<string, string[]>();

  for (const warning of warnings) {
    if (!warning.sourceId) continue;
    warningMap.set(warning.sourceId, [
      ...(warningMap.get(warning.sourceId) ?? []),
      warning.message
    ]);
  }

  const institutionSummary = state.financialInstitutions
    .filter((institution) => institution.isActive)
    .map<InstitutionSummaryItem>((institution) => {
      const accounts = activeAccounts.filter(
        (account) => account.institutionId === institution.id
      );
      const assetValueKrw = accounts.reduce(
        (total, account) => total + accountAssetValue(account),
        0
      );
      const liabilityValueKrw = accounts.reduce(
        (total, account) => total + accountLiabilityValue(account),
        0
      );

      return {
        institution,
        accountCount: accounts.length,
        assetValueKrw,
        liabilityValueKrw,
        netValueKrw: assetValueKrw - liabilityValueKrw,
        lastSyncedAt: latestTimestamp(accounts.map((account) => account.lastSyncedAt)),
        status: institutionStatus(state, institution)
      };
    });

  const accountSummary = activeAccounts.map<AccountSummaryItem>((account) => ({
    account,
    institution: state.financialInstitutions.find(
      (institution) => institution.id === account.institutionId
    ),
    displayValueKrw: account.isLiability
      ? accountLiabilityValue(account)
      : accountAssetValue(account),
    warnings: warningMap.get(account.id) ?? account.warningCodes
  }));

  const bankTotalKrw = institutionSummary
    .filter((item) => item.institution.institutionType === "bank")
    .reduce((total, item) => total + item.assetValueKrw, 0);
  const securitiesTotalKrw = institutionSummary
    .filter(
      (item) =>
        item.institution.institutionType === "securities" ||
        item.institution.institutionType === "broker"
    )
    .reduce((total, item) => total + item.assetValueKrw, 0);

  return {
    netWorth,
    totalNetWorthKrw: netWorth.netWorthKrw,
    grossAssetsKrw: netWorth.totalAssetsKrw,
    totalLiabilitiesKrw: netWorth.totalLiabilitiesKrw,
    cashTotalKrw: netWorth.liquidCashKrw,
    investmentTotalKrw: netWorth.investmentAssetsKrw,
    bankTotalKrw,
    securitiesTotalKrw,
    pensionTotalKrw: netWorth.pensionAssetsKrw,
    assetClassSummary: netWorth.assetClassExposure,
    institutionSummary,
    accountSummary,
    staleDataWarnings: warnings.filter(
      (warning) => warning.sourceType !== "connection"
    ),
    connectionWarnings: warnings.filter(
      (warning) => warning.sourceType === "connection"
    )
  };
}
