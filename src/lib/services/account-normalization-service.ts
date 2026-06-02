import { getDefaultTaxRate } from "@/lib/constants/tax-rates";
import {
  hashExternalIdentifier
} from "@/lib/services/account-deduplication-service";
import { createId } from "@/lib/services/service-utils";
import type {
  FinancialProviderPayload,
  ProviderAccountPayload,
  ProviderHoldingPayload
} from "@/lib/services/providers/account/account-provider";
import type {
  AppState,
  Asset,
  AssetType,
  ExternalProviderType,
  FinancialAccount,
  FinancialAccountAssetLink,
  FinancialAccountType,
  FinancialInstitution,
  Liability
} from "@/lib/types";
import { createAssetFromInput } from "@/lib/utils/asset-factory";

export interface NormalizedAccountPayload {
  institutions: FinancialInstitution[];
  accounts: FinancialAccount[];
  assets: Asset[];
  liabilities: Liability[];
  links: FinancialAccountAssetLink[];
  warnings: string[];
}

function normalizeCurrency(value: string) {
  return value.trim().toUpperCase() || "KRW";
}

function exchangeRateFor(payload: { currency: string; exchangeRate?: number }) {
  return normalizeCurrency(payload.currency) === "KRW"
    ? 1
    : payload.exchangeRate ?? 1;
}

function accountIsLiability(payload: ProviderAccountPayload) {
  return (
    payload.isLiability === true ||
    payload.accountType === "loan" ||
    payload.accountType === "other_liability"
  );
}

function accountValueKrw(payload: ProviderAccountPayload) {
  return Math.abs(payload.balance) * exchangeRateFor(payload);
}

function financialTypeToAssetType(
  accountType: FinancialAccountType,
  rawAssetType?: string
): AssetType {
  const raw = rawAssetType?.toLowerCase() ?? "";
  if (accountType === "cash" || accountType === "securities_cash") return "cash";
  if (
    accountType === "bank_checking" ||
    accountType === "bank_savings" ||
    accountType === "installment_savings"
  ) {
    return accountType === "bank_checking" ? "cash" : "savings";
  }
  if (accountType === "bond" || raw.includes("bond")) return "govt_bond";
  if (raw.includes("reit")) return "reit";
  if (raw.includes("covered")) return "covered_call";
  if (accountType === "pension") return "etc";
  if (accountType === "etf" || raw.includes("etf")) return "growth";
  if (accountType === "domestic_stock" || accountType === "overseas_stock") {
    return "growth";
  }
  return "etc";
}

function providerTypeToInstitutionType(
  providerType: ExternalProviderType
): FinancialInstitution["institutionType"] {
  if (providerType === "broker") return "broker";
  if (providerType === "securities") return "securities";
  if (providerType === "bank") return "bank";
  if (providerType === "open_banking") return "open_banking";
  if (providerType === "mydata") return "mydata";
  if (providerType === "csv_import") return "csv";
  if (providerType === "manual") return "manual";
  if (providerType === "market_data") return "market_data";
  if (providerType === "fx_rate") return "fx_rate";
  return "other";
}

function findOrCreateInstitution(
  state: AppState,
  institutions: FinancialInstitution[],
  params: {
    institutionName: string;
    providerType: ExternalProviderType;
    providerId: string;
    now: string;
  }
) {
  const existing =
    state.financialInstitutions.find(
      (institution) =>
        institution.providerId === params.providerId &&
        institution.displayName === params.institutionName
    ) ??
    institutions.find(
      (institution) =>
        institution.providerId === params.providerId &&
        institution.displayName === params.institutionName
    );
  if (existing) return existing;

  const institution: FinancialInstitution = {
    id: createId("institution"),
    name: params.institutionName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-"),
    displayName: params.institutionName,
    institutionType: providerTypeToInstitutionType(params.providerType),
    countryCode: "KR",
    providerType: params.providerType,
    providerId: params.providerId,
    isActive: true,
    createdAt: params.now,
    updatedAt: params.now
  };
  institutions.push(institution);
  return institution;
}

function normalizeAccount(
  payload: ProviderAccountPayload,
  params: {
    institutionId: string;
    providerType: ExternalProviderType;
    providerId: string;
    externalConnectionId?: string;
    syncedAt: string;
  }
): FinancialAccount {
  const isLiability = accountIsLiability(payload);
  const valueKrw = accountValueKrw(payload);

  return {
    id: createId("finacct"),
    institutionId: params.institutionId,
    externalConnectionId: params.externalConnectionId,
    externalAccountIdHash: hashExternalIdentifier(
      `${params.providerId}:${payload.externalAccountId}`
    ),
    accountAlias: payload.accountAlias,
    accountType: payload.accountType,
    accountSubtype: payload.accountSubtype,
    currency: normalizeCurrency(payload.currency),
    balance: payload.balance,
    principalAmount: payload.principalAmount,
    valuationAmountKrw: isLiability ? 0 : Number(valueKrw.toFixed(2)),
    liabilityAmountKrw: isLiability ? Number(valueKrw.toFixed(2)) : undefined,
    isLiability,
    isManual: false,
    valuationSource: "external_balance",
    syncSource: params.providerType,
    lastSyncedAt: params.syncedAt,
    lastSuccessfulSyncAt: params.syncedAt,
    syncStatus: "synced",
    staleStatus: "fresh",
    warningCodes: [],
    isArchived: false,
    createdAt: params.syncedAt,
    updatedAt: params.syncedAt
  };
}

function normalizeLiability(
  account: FinancialAccount,
  payload: ProviderAccountPayload
): Liability | undefined {
  if (!account.isLiability) return undefined;

  return {
    id: createId("liability"),
    financialAccountId: account.id,
    name: account.accountAlias,
    liabilityType: account.accountType === "loan" ? "credit_loan" : "other",
    currency: account.currency,
    principalAmount: payload.principalAmount ?? account.liabilityAmountKrw ?? 0,
    currentBalance: account.liabilityAmountKrw ?? Math.abs(account.balance),
    valuationAmountKrw: account.liabilityAmountKrw ?? Math.abs(account.balance),
    isManual: false,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  };
}

function normalizeHoldingAsset(
  payload: ProviderHoldingPayload,
  params: {
    providerId: string;
    externalConnectionId?: string;
    syncedAt: string;
  }
) {
  const accountType = "general" as const;
  const assetType = financialTypeToAssetType(
    payload.accountType,
    payload.rawAssetType
  );
  const tax = getDefaultTaxRate(accountType, assetType);
  const valuationAmount =
    payload.valuationAmount ??
    (payload.quantity ?? 0) * (payload.currentPrice ?? 0);

  return createAssetFromInput({
    assetName: payload.assetName,
    assetType,
    ticker: payload.ticker,
    market: payload.market,
    brokerName: payload.brokerName,
    accountAlias: payload.accountAlias,
    externalConnectionId: params.externalConnectionId,
    externalAssetId: hashExternalIdentifier(
      `${params.providerId}:${payload.externalAssetId}`
    ),
    valuationSource: "broker_sync",
    priceSource: payload.currentPrice ? params.providerId : undefined,
    fxSource: payload.exchangeRate ? params.providerId : undefined,
    lastSyncedAt: params.syncedAt,
    lastPriceUpdatedAt: payload.currentPrice ? params.syncedAt : undefined,
    lastFxUpdatedAt:
      normalizeCurrency(payload.currency) === "KRW" ? undefined : params.syncedAt,
    isAutoImported: true,
    valuationAmount,
    currency: payload.currency,
    exchangeRate: exchangeRateFor(payload),
    quantity: payload.quantity,
    purchaseUnitPrice: payload.currentPrice,
    incomeYield: 0,
    expectedCapitalReturn: 0,
    priceChangeRate: 0,
    priceChangePeriodType: "1y",
    fxChangeRate: 0,
    incomeTaxRate: tax.incomeTaxRate,
    capitalGainTaxRate: tax.capitalGainTaxRate,
    accountType
  });
}

export function normalizeFinancialProviderPayload(
  state: AppState,
  payload: FinancialProviderPayload,
  params: {
    providerType: ExternalProviderType;
    providerId: string;
    externalConnectionId?: string;
  }
): NormalizedAccountPayload {
  const institutions: FinancialInstitution[] = [];
  const accounts: FinancialAccount[] = [];
  const assets: Asset[] = [];
  const liabilities: Liability[] = [];
  const links: FinancialAccountAssetLink[] = [];
  const accountIdByExternalHash = new Map<string, string>();
  const syncedAt = payload.fetchedAt;

  for (const accountPayload of payload.accounts) {
    const institution = findOrCreateInstitution(state, institutions, {
      institutionName: accountPayload.institutionName,
      providerType: params.providerType,
      providerId: params.providerId,
      now: syncedAt
    });
    const account = normalizeAccount(accountPayload, {
      institutionId: institution.id,
      providerType: params.providerType,
      providerId: params.providerId,
      externalConnectionId: params.externalConnectionId,
      syncedAt
    });
    accounts.push(account);
    accountIdByExternalHash.set(account.externalAccountIdHash ?? "", account.id);
    const liability = normalizeLiability(account, accountPayload);
    if (liability) liabilities.push(liability);
  }

  for (const holdingPayload of payload.holdings) {
    const institution = findOrCreateInstitution(state, institutions, {
      institutionName: holdingPayload.institutionName,
      providerType: params.providerType,
      providerId: params.providerId,
      now: syncedAt
    });
    const accountHash = hashExternalIdentifier(
      `${params.providerId}:${holdingPayload.externalAccountId}`
    );
    if (!accountIdByExternalHash.has(accountHash)) {
      const holdingAccount = normalizeAccount(
        {
          externalAccountId: holdingPayload.externalAccountId,
          institutionName: holdingPayload.institutionName,
          accountAlias: holdingPayload.accountAlias,
          accountType: holdingPayload.accountType,
          currency: holdingPayload.currency,
          balance:
            holdingPayload.valuationAmount ??
            (holdingPayload.quantity ?? 0) * (holdingPayload.currentPrice ?? 0),
          exchangeRate: holdingPayload.exchangeRate,
          rawData: holdingPayload.rawData
        },
        {
          institutionId: institution.id,
          providerType: params.providerType,
          providerId: params.providerId,
          externalConnectionId: params.externalConnectionId,
          syncedAt
        }
      );
      accounts.push(holdingAccount);
      accountIdByExternalHash.set(accountHash, holdingAccount.id);
    }

    const asset = normalizeHoldingAsset(holdingPayload, {
      providerId: params.providerId,
      externalConnectionId: params.externalConnectionId,
      syncedAt
    });
    assets.push(asset);
    links.push({
      id: createId("acctlink"),
      financialAccountId: accountIdByExternalHash.get(accountHash)!,
      assetId: asset.id,
      linkType: "holding",
      createdAt: syncedAt,
      updatedAt: syncedAt
    });
  }

  return {
    institutions,
    accounts,
    assets,
    liabilities,
    links,
    warnings: payload.warnings
  };
}
