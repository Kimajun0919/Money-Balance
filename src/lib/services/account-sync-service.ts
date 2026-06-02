import { appendAccountAuditLog } from "@/lib/services/account-audit-service";
import {
  findDuplicateFinancialAccount,
  findDuplicateHoldingAsset,
  summarizeAccountDuplicates
} from "@/lib/services/account-deduplication-service";
import {
  normalizeFinancialProviderPayload,
  type NormalizedAccountPayload
} from "@/lib/services/account-normalization-service";
import { createId } from "@/lib/services/service-utils";
import type {
  FinancialDataProvider,
  FinancialProviderPayload
} from "@/lib/services/providers/account/account-provider";
import type {
  AccountSyncItem,
  AccountSyncJob,
  AppState,
  Asset,
  FinancialAccount
} from "@/lib/types";

export interface AccountSyncPreview {
  id: string;
  providerId: string;
  providerName: string;
  providerType: FinancialDataProvider["providerType"];
  externalConnectionId?: string;
  fetchedAt: string;
  normalized: NormalizedAccountPayload;
  duplicateAccountIds: Record<string, string>;
  duplicateAssetIds: Record<string, string>;
  warnings: string[];
  rawPayload: FinancialProviderPayload;
}

function createJob(params: {
  preview: AccountSyncPreview;
  status: AccountSyncJob["status"];
  syncType: AccountSyncJob["syncType"];
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  duplicateCount: number;
  warningCount: number;
  errorCount: number;
  errorMessage?: string;
}): AccountSyncJob {
  const now = new Date().toISOString();
  return {
    id: createId("acctsync"),
    externalConnectionId: params.preview.externalConnectionId,
    providerType: params.preview.providerType,
    syncType: params.syncType,
    status: params.status,
    startedAt: params.preview.fetchedAt,
    completedAt: now,
    accountCount: params.preview.normalized.accounts.length,
    assetCount: params.preview.normalized.assets.length,
    createdCount: params.createdCount,
    updatedCount: params.updatedCount,
    skippedCount: params.skippedCount,
    duplicateCount: params.duplicateCount,
    warningCount: params.warningCount,
    errorCount: params.errorCount,
    errorMessage: params.errorMessage,
    rawResponseSnapshot: {
      accountCount: params.preview.rawPayload.accounts.length,
      holdingCount: params.preview.rawPayload.holdings.length,
      warnings: params.preview.rawPayload.warnings
    },
    createdAt: now
  };
}

function toSyncItem(params: {
  jobId: string;
  itemType: AccountSyncItem["itemType"];
  action: AccountSyncItem["action"];
  status: AccountSyncItem["status"];
  normalizedPayload: Record<string, unknown>;
  warningCodes?: string[];
  createdAccountId?: string;
  createdAssetId?: string;
  updatedAccountId?: string;
  updatedAssetId?: string;
}): AccountSyncItem {
  return {
    id: createId("acctsyncitem"),
    accountSyncJobId: params.jobId,
    itemType: params.itemType,
    action: params.action,
    status: params.status,
    normalizedPayload: params.normalizedPayload,
    warningCodes: params.warningCodes ?? [],
    createdAccountId: params.createdAccountId,
    createdAssetId: params.createdAssetId,
    updatedAccountId: params.updatedAccountId,
    updatedAssetId: params.updatedAssetId,
    createdAt: new Date().toISOString()
  };
}

function mapToRecord(map: Map<string, string>) {
  return Object.fromEntries(map.entries());
}

export async function previewAccountSync(
  state: AppState,
  provider: FinancialDataProvider,
  options: {
    externalConnectionId?: string;
  } = {}
): Promise<{ state: AppState; preview: AccountSyncPreview }> {
  const providerPreview = await provider.previewSync();
  const payload = provider.normalizePayload(providerPreview.payload);
  const normalized = normalizeFinancialProviderPayload(state, payload, {
    providerType: provider.providerType,
    providerId: provider.providerId,
    externalConnectionId: options.externalConnectionId
  });
  const duplicates = summarizeAccountDuplicates(
    state,
    normalized.accounts,
    normalized.assets
  );

  return {
    state,
    preview: {
      id: createId("acctpreview"),
      providerId: provider.providerId,
      providerName: provider.providerName,
      providerType: provider.providerType,
      externalConnectionId: options.externalConnectionId,
      fetchedAt: providerPreview.fetchedAt,
      normalized,
      duplicateAccountIds: mapToRecord(duplicates.duplicateAccountIds),
      duplicateAssetIds: mapToRecord(duplicates.duplicateAssetIds),
      warnings: [...providerPreview.warnings, ...normalized.warnings],
      rawPayload: payload
    }
  };
}

export function recordAccountSyncPreview(
  state: AppState,
  preview: AccountSyncPreview
): AppState {
  const duplicateCount =
    Object.keys(preview.duplicateAccountIds).length +
    Object.keys(preview.duplicateAssetIds).length;
  const job = createJob({
    preview,
    status: "previewed",
    syncType: "preview",
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    duplicateCount,
    warningCount: preview.warnings.length,
    errorCount: 0
  });
  const nextState: AppState = {
    ...state,
    accountSyncJobs: [job, ...state.accountSyncJobs]
  };

  return appendAccountAuditLog(nextState, {
    eventType: "sync_previewed",
    entityType: "account_sync_job",
    entityId: job.id,
    summary: `${preview.providerName} 계좌 동기화 미리보기를 생성했습니다.`,
    metadata: {
      accountCount: preview.normalized.accounts.length,
      assetCount: preview.normalized.assets.length,
      duplicateCount
    }
  });
}

function retainAccounts(
  existing: FinancialAccount[],
  preview: AccountSyncPreview,
  replaceDuplicates: boolean
) {
  if (!replaceDuplicates) return existing;
  const duplicateExistingIds = new Set(
    Object.values(preview.duplicateAccountIds)
  );
  return existing.filter((account) => !duplicateExistingIds.has(account.id));
}

function retainAssets(
  existing: Asset[],
  preview: AccountSyncPreview,
  replaceDuplicates: boolean
) {
  if (!replaceDuplicates) return existing;
  const duplicateExistingIds = new Set(Object.values(preview.duplicateAssetIds));
  return existing.filter((asset) => !duplicateExistingIds.has(asset.id));
}

function filterDuplicateAccounts(
  state: AppState,
  accounts: FinancialAccount[],
  replaceDuplicates: boolean
) {
  if (replaceDuplicates) return accounts;
  return accounts.filter(
    (account) => !findDuplicateFinancialAccount(state.financialAccounts, account)
  );
}

function filterDuplicateAssets(
  state: AppState,
  assets: Asset[],
  replaceDuplicates: boolean
) {
  if (replaceDuplicates) return assets;
  return assets.filter((asset) => !findDuplicateHoldingAsset(state.assets, asset));
}

export function applyAccountSyncPreview(
  state: AppState,
  params: {
    preview: AccountSyncPreview;
    replaceDuplicates?: boolean;
    dryRun?: boolean;
  }
): { state: AppState; job: AccountSyncJob; items: AccountSyncItem[] } {
  const replaceDuplicates = params.replaceDuplicates ?? true;
  const duplicateCount =
    Object.keys(params.preview.duplicateAccountIds).length +
    Object.keys(params.preview.duplicateAssetIds).length;
  const accountsToCreate = filterDuplicateAccounts(
    state,
    params.preview.normalized.accounts,
    replaceDuplicates
  );
  const assetsToCreate = filterDuplicateAssets(
    state,
    params.preview.normalized.assets,
    replaceDuplicates
  );
  const createdCount =
    accountsToCreate.length +
    assetsToCreate.length +
    params.preview.normalized.liabilities.length;
  const skippedCount =
    params.preview.normalized.accounts.length -
    accountsToCreate.length +
    params.preview.normalized.assets.length -
    assetsToCreate.length;
  const job = createJob({
    preview: params.preview,
    status: params.dryRun ? "previewed" : "applied",
    syncType: params.dryRun ? "preview" : "apply",
    createdCount: params.dryRun ? 0 : createdCount,
    updatedCount: replaceDuplicates ? duplicateCount : 0,
    skippedCount,
    duplicateCount,
    warningCount: params.preview.warnings.length,
    errorCount: 0
  });
  const items: AccountSyncItem[] = [
    ...params.preview.normalized.accounts.map((account) =>
      toSyncItem({
        jobId: job.id,
        itemType: "account",
        action: params.preview.duplicateAccountIds[account.id]
          ? replaceDuplicates
            ? "update"
            : "duplicate"
          : "create",
        status:
          params.preview.duplicateAccountIds[account.id] && !replaceDuplicates
            ? "skipped"
            : "success",
        normalizedPayload: account as unknown as Record<string, unknown>,
        warningCodes: account.warningCodes,
        createdAccountId: account.id,
        updatedAccountId: params.preview.duplicateAccountIds[account.id]
      })
    ),
    ...params.preview.normalized.assets.map((asset) =>
      toSyncItem({
        jobId: job.id,
        itemType: "asset",
        action: params.preview.duplicateAssetIds[asset.id]
          ? replaceDuplicates
            ? "update"
            : "duplicate"
          : "create",
        status:
          params.preview.duplicateAssetIds[asset.id] && !replaceDuplicates
            ? "skipped"
            : "success",
        normalizedPayload: asset as unknown as Record<string, unknown>,
        createdAssetId: asset.id,
        updatedAssetId: params.preview.duplicateAssetIds[asset.id]
      })
    )
  ];

  if (params.dryRun) {
    return { state, job, items };
  }

  const nextState: AppState = {
    ...state,
    financialInstitutions: [
      ...params.preview.normalized.institutions.filter(
        (institution) =>
          !state.financialInstitutions.some(
            (existing) =>
              existing.providerId === institution.providerId &&
              existing.displayName === institution.displayName
          )
      ),
      ...state.financialInstitutions
    ],
    financialAccounts: [
      ...retainAccounts(state.financialAccounts, params.preview, replaceDuplicates),
      ...accountsToCreate
    ],
    assets: [...retainAssets(state.assets, params.preview, replaceDuplicates), ...assetsToCreate],
    liabilities: [
      ...params.preview.normalized.liabilities,
      ...state.liabilities.filter(
        (liability) =>
          !params.preview.normalized.liabilities.some(
            (created) =>
              created.financialAccountId &&
              created.financialAccountId === liability.financialAccountId
          )
      )
    ],
    financialAccountAssetLinks: [
      ...params.preview.normalized.links,
      ...state.financialAccountAssetLinks
    ],
    accountSyncJobs: [job, ...state.accountSyncJobs],
    accountSyncItems: [...items, ...state.accountSyncItems],
    externalConnections: state.externalConnections.map((connection) =>
      connection.id === params.preview.externalConnectionId
        ? {
            ...connection,
            lastSyncedAt: params.preview.fetchedAt,
            status: "connected",
            updatedAt: new Date().toISOString()
          }
        : connection
    )
  };

  return {
    state: appendAccountAuditLog(nextState, {
      eventType: "sync_applied",
      entityType: "account_sync_job",
      entityId: job.id,
      summary: `${params.preview.providerName} 계좌 동기화를 반영했습니다.`,
      metadata: {
        accountCount: accountsToCreate.length,
        assetCount: assetsToCreate.length,
        duplicateCount
      }
    }),
    job,
    items
  };
}

export function createFailedAccountSyncJob(
  state: AppState,
  params: {
    providerType: FinancialDataProvider["providerType"];
    providerName: string;
    errorMessage: string;
    externalConnectionId?: string;
  }
): AppState {
  const now = new Date().toISOString();
  const preview: AccountSyncPreview = {
    id: createId("acctpreview"),
    providerId: params.providerName,
    providerName: params.providerName,
    providerType: params.providerType,
    externalConnectionId: params.externalConnectionId,
    fetchedAt: now,
    normalized: {
      institutions: [],
      accounts: [],
      assets: [],
      liabilities: [],
      links: [],
      warnings: []
    },
    duplicateAccountIds: {},
    duplicateAssetIds: {},
    warnings: [params.errorMessage],
    rawPayload: {
      fetchedAt: now,
      accounts: [],
      holdings: [],
      warnings: [params.errorMessage]
    }
  };
  const job = createJob({
    preview,
    status: "failed",
    syncType: "apply",
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    duplicateCount: 0,
    warningCount: 0,
    errorCount: 1,
    errorMessage: params.errorMessage
  });

  return {
    ...state,
    accountSyncJobs: [job, ...state.accountSyncJobs]
  };
}

export function deleteSyncedAccountData(
  state: AppState,
  params: {
    externalConnectionId?: string;
    providerType?: FinancialDataProvider["providerType"];
  }
): AppState {
  const removedAccountIds = new Set(
    state.financialAccounts
      .filter(
        (account) =>
          (params.externalConnectionId &&
            account.externalConnectionId === params.externalConnectionId) ||
          (params.providerType && account.syncSource === params.providerType)
      )
      .map((account) => account.id)
  );
  const removedAssetIds = new Set(
    state.assets
      .filter(
        (asset) =>
          params.externalConnectionId &&
          asset.externalConnectionId === params.externalConnectionId
      )
      .map((asset) => asset.id)
  );
  const now = new Date().toISOString();
  const job: AccountSyncJob = {
    id: createId("acctsync"),
    externalConnectionId: params.externalConnectionId,
    providerType: params.providerType ?? "manual",
    syncType: "delete",
    status: "success",
    startedAt: now,
    completedAt: now,
    accountCount: removedAccountIds.size,
    assetCount: removedAssetIds.size,
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    duplicateCount: 0,
    warningCount: 0,
    errorCount: 0,
    createdAt: now
  };
  const nextState: AppState = {
    ...state,
    financialAccounts: state.financialAccounts.filter(
      (account) => !removedAccountIds.has(account.id)
    ),
    assets: state.assets.filter((asset) => !removedAssetIds.has(asset.id)),
    liabilities: state.liabilities.filter(
      (liability) =>
        !liability.financialAccountId ||
        !removedAccountIds.has(liability.financialAccountId)
    ),
    financialAccountAssetLinks: state.financialAccountAssetLinks.filter(
      (link) =>
        !removedAccountIds.has(link.financialAccountId) &&
        !removedAssetIds.has(link.assetId)
    ),
    accountSyncJobs: [job, ...state.accountSyncJobs]
  };

  return appendAccountAuditLog(nextState, {
    eventType: "synced_data_deleted",
    entityType: "account_sync_job",
    entityId: job.id,
    summary: "동기화된 계좌 데이터를 삭제했습니다.",
    metadata: {
      removedAccountCount: removedAccountIds.size,
      removedAssetCount: removedAssetIds.size
    }
  });
}
