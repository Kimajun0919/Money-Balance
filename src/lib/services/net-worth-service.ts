import { getAccountFreshnessWarnings } from "@/lib/services/account-freshness-service";
import { createId, getMonthKey } from "@/lib/services/service-utils";
import type {
  AppState,
  Asset,
  FinancialAccount,
  FinancialAccountType,
  NetWorthSnapshot,
  NetWorthSummary
} from "@/lib/types";

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function activeAccounts(state: AppState) {
  return state.financialAccounts.filter((account) => !account.isArchived);
}

function linkedAssetIds(state: AppState) {
  return new Set(state.financialAccountAssetLinks.map((link) => link.assetId));
}

function unlinkedAssets(state: AppState) {
  const linked = linkedAssetIds(state);
  return state.assets.filter((asset) => !linked.has(asset.id));
}

function accountValue(account: FinancialAccount) {
  return account.isLiability ? 0 : Math.max(0, account.valuationAmountKrw);
}

function accountLiabilityValue(account: FinancialAccount) {
  return account.isLiability
    ? Math.max(
        Math.abs(account.liabilityAmountKrw ?? 0),
        Math.abs(account.valuationAmountKrw),
        Math.abs(account.balance)
      )
    : 0;
}

function assetValue(asset: Asset) {
  return Math.max(0, asset.valuationAmountKrw);
}

function accountMatchesType(
  account: FinancialAccount,
  types: FinancialAccountType[]
) {
  return types.includes(account.accountType);
}

function addToBucket(
  bucket: Record<string, number>,
  key: string | undefined,
  value: number
) {
  const normalized = key || "unknown";
  bucket[normalized] = (bucket[normalized] ?? 0) + value;
}

function accountAssetClass(account: FinancialAccount) {
  if (account.isLiability) return "liability";
  if (["cash", "bank_checking", "securities_cash"].includes(account.accountType)) {
    return "cash";
  }
  if (["bank_savings", "installment_savings"].includes(account.accountType)) {
    return "deposits";
  }
  if (account.accountType === "pension") return "pension";
  if (account.accountType === "bond") return "bonds";
  if (account.accountType === "etf") return "etfs";
  if (account.accountType === "domestic_stock") return "domestic_stocks";
  if (account.accountType === "overseas_stock") return "overseas_stocks";
  if (account.accountType === "other_asset") return "other_assets";
  return "investments";
}

export function calculateNetWorth(state: AppState): NetWorthSummary {
  const accounts = activeAccounts(state);
  const assets = unlinkedAssets(state);
  const liabilityAccountIds = new Set(
    state.liabilities
      .map((liability) => liability.financialAccountId)
      .filter((id): id is string => Boolean(id))
  );
  const totalAssetsKrw =
    sum(accounts.map(accountValue)) + sum(assets.map(assetValue));
  const totalLiabilitiesKrw =
    sum(state.liabilities.map((liability) => liability.valuationAmountKrw)) +
    sum(
      accounts
        .filter((account) => !liabilityAccountIds.has(account.id))
        .map(accountLiabilityValue)
    );
  const currencyExposure: Record<string, number> = {};
  const assetClassExposure: Record<string, number> = {};
  const valuationSourceBreakdown: Record<string, number> = {};

  for (const account of accounts) {
    const value = account.isLiability
      ? accountLiabilityValue(account)
      : accountValue(account);
    addToBucket(currencyExposure, account.currency.toUpperCase(), value);
    addToBucket(assetClassExposure, accountAssetClass(account), value);
    addToBucket(valuationSourceBreakdown, account.valuationSource, value);
  }

  for (const asset of assets) {
    const value = assetValue(asset);
    addToBucket(currencyExposure, asset.currency.toUpperCase(), value);
    addToBucket(assetClassExposure, asset.assetType, value);
    addToBucket(valuationSourceBreakdown, asset.valuationSource ?? "manual", value);
  }

  const cashTypes: FinancialAccountType[] = [
    "cash",
    "bank_checking",
    "securities_cash"
  ];
  const depositTypes: FinancialAccountType[] = [
    "bank_savings",
    "installment_savings"
  ];
  const investmentTypes: FinancialAccountType[] = [
    "securities",
    "domestic_stock",
    "overseas_stock",
    "etf",
    "bond"
  ];

  return {
    totalAssetsKrw,
    totalLiabilitiesKrw,
    netWorthKrw: totalAssetsKrw - totalLiabilitiesKrw,
    liquidCashKrw:
      sum(accounts.filter((account) => accountMatchesType(account, cashTypes)).map(accountValue)) +
      sum(assets.filter((asset) => asset.assetType === "cash").map(assetValue)),
    investmentAssetsKrw:
      sum(
        accounts
          .filter((account) => accountMatchesType(account, investmentTypes))
          .map(accountValue)
      ) +
      sum(
        assets
          .filter((asset) => asset.assetType !== "cash" && asset.assetType !== "savings")
          .map(assetValue)
      ),
    depositAssetsKrw:
      sum(
        accounts
          .filter((account) => accountMatchesType(account, depositTypes))
          .map(accountValue)
      ) + sum(assets.filter((asset) => asset.assetType === "savings").map(assetValue)),
    pensionAssetsKrw: sum(
      accounts
        .filter((account) => account.accountType === "pension")
        .map(accountValue)
    ),
    otherAssetsKrw: sum(
      accounts
        .filter((account) => account.accountType === "other_asset")
        .map(accountValue)
    ),
    accountCount: accounts.length,
    institutionCount: new Set(accounts.map((account) => account.institutionId)).size,
    currencyExposure,
    assetClassExposure,
    valuationSourceBreakdown
  };
}

export function createNetWorthSnapshot(
  state: AppState,
  date: Date | string = new Date()
): { state: AppState; snapshot: NetWorthSnapshot } {
  const summary = calculateNetWorth(state);
  const referenceMonth = getMonthKey(date);
  const now = new Date().toISOString();
  const snapshot: NetWorthSnapshot = {
    id: createId("networth"),
    referenceMonth,
    totalAssetsKrw: summary.totalAssetsKrw,
    totalLiabilitiesKrw: summary.totalLiabilitiesKrw,
    netWorthKrw: summary.netWorthKrw,
    cashKrw: summary.liquidCashKrw,
    depositsKrw: summary.depositAssetsKrw,
    investmentsKrw: summary.investmentAssetsKrw,
    pensionKrw: summary.pensionAssetsKrw,
    otherAssetsKrw: summary.otherAssetsKrw,
    accountCount: summary.accountCount,
    institutionCount: summary.institutionCount,
    staleWarningCount: getAccountFreshnessWarnings(state).length,
    createdAt: now
  };

  return {
    state: {
      ...state,
      netWorthSnapshots: [
        snapshot,
        ...state.netWorthSnapshots.filter(
          (item) => item.referenceMonth !== referenceMonth
        )
      ]
    },
    snapshot
  };
}
