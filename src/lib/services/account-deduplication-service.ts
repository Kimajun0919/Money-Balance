import type {
  AppState,
  Asset,
  FinancialAccount,
  FinancialAccountType
} from "@/lib/types";

function normalizePart(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

export function hashExternalIdentifier(value: string) {
  let hash = 0x811c9dc5;
  const normalized = value.trim().toLowerCase();

  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `h_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function buildFinancialAccountDedupKey(params: {
  providerType: string;
  institutionName?: string;
  externalAccountIdHash?: string;
  accountAlias?: string;
  accountType?: FinancialAccountType;
  currency?: string;
}) {
  return [
    params.providerType,
    params.institutionName,
    params.externalAccountIdHash,
    params.accountAlias,
    params.accountType,
    params.currency
  ]
    .map((item) => normalizePart(item))
    .join("|");
}

export function findDuplicateFinancialAccount(
  accounts: FinancialAccount[],
  candidate: Pick<
    FinancialAccount,
    | "externalAccountIdHash"
    | "accountAlias"
    | "accountType"
    | "currency"
    | "syncSource"
    | "institutionId"
  >
) {
  return accounts.find((account) => {
    if (account.isArchived) return false;
    if (
      account.externalAccountIdHash &&
      candidate.externalAccountIdHash &&
      account.externalAccountIdHash === candidate.externalAccountIdHash
    ) {
      return true;
    }

    return (
      account.institutionId === candidate.institutionId &&
      account.syncSource === candidate.syncSource &&
      normalizePart(account.accountAlias) ===
        normalizePart(candidate.accountAlias) &&
      account.accountType === candidate.accountType &&
      account.currency.toUpperCase() === candidate.currency.toUpperCase()
    );
  });
}

export function findDuplicateHoldingAsset(
  assets: Asset[],
  candidate: {
    ticker?: string;
    market?: string;
    brokerName?: string;
    accountAlias?: string;
    externalAssetId?: string;
  }
) {
  return assets.find((asset) => {
    if (
      asset.externalAssetId &&
      candidate.externalAssetId &&
      asset.externalAssetId === candidate.externalAssetId
    ) {
      return true;
    }

    return (
      normalizePart(asset.ticker) === normalizePart(candidate.ticker) &&
      normalizePart(asset.market) === normalizePart(candidate.market) &&
      normalizePart(asset.brokerName) === normalizePart(candidate.brokerName) &&
      normalizePart(asset.accountAlias) === normalizePart(candidate.accountAlias)
    );
  });
}

export function summarizeAccountDuplicates(
  state: AppState,
  accounts: FinancialAccount[],
  assets: Asset[] = []
) {
  const duplicateAccountIds = new Map<string, string>();
  const duplicateAssetIds = new Map<string, string>();

  for (const account of accounts) {
    const duplicate = findDuplicateFinancialAccount(
      state.financialAccounts,
      account
    );
    if (duplicate) duplicateAccountIds.set(account.id, duplicate.id);
  }

  for (const asset of assets) {
    const duplicate = findDuplicateHoldingAsset(state.assets, asset);
    if (duplicate) duplicateAssetIds.set(asset.id, duplicate.id);
  }

  return { duplicateAccountIds, duplicateAssetIds };
}
