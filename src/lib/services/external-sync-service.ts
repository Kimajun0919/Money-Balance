import type {
  AppState,
  ExternalProviderType,
  ExternalSyncStatus,
  ExternalSyncType
} from "@/lib/types";
import { createId } from "@/lib/services/service-utils";

export function appendExternalSyncLog(
  state: AppState,
  params: {
    connectionId?: string;
    providerType: ExternalProviderType;
    providerName: string;
    syncType: ExternalSyncType;
    status: ExternalSyncStatus;
    totalItems?: number;
    successItems?: number;
    failedItems?: number;
    warningItems?: number;
    errorMessage?: string;
    snapshotId?: string;
    rawSummary?: Record<string, unknown>;
  }
): AppState {
  const now = new Date().toISOString();
  return {
    ...state,
    externalSyncLogs: [
      {
        id: createId("synclog"),
        connectionId: params.connectionId,
        providerType: params.providerType,
        providerName: params.providerName,
        syncType: params.syncType,
        status: params.status,
        startedAt: now,
        completedAt: now,
        totalItems: params.totalItems ?? 0,
        successItems: params.successItems ?? 0,
        failedItems: params.failedItems ?? 0,
        warningItems: params.warningItems ?? 0,
        errorMessage: params.errorMessage,
        snapshotId: params.snapshotId,
        rawSummary: params.rawSummary
      },
      ...state.externalSyncLogs
    ]
  };
}
