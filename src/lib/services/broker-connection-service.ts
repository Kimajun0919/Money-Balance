import { MockBrokerProvider } from "@/lib/providers/broker/mock-broker-provider";
import type { BrokerProvider } from "@/lib/providers/broker/broker-provider";
import { logKpiEvent } from "@/lib/kpi/event-logger";
import type { AppState, ExternalConnection } from "@/lib/types";
import { createId } from "@/lib/services/service-utils";
import { encryptToken, maskToken } from "@/lib/services/token-encryption-service";

export interface BrokerConnectionPublicView {
  id: string;
  providerName: string;
  brokerName?: string;
  accountAlias?: string;
  accountIdentifierMasked?: string;
  scopes: string[];
  status: ExternalConnection["status"];
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function toBrokerConnectionPublicView(
  connection: ExternalConnection
): BrokerConnectionPublicView {
  return {
    id: connection.id,
    providerName: connection.providerName,
    brokerName: connection.brokerName,
    accountAlias: connection.accountAlias,
    accountIdentifierMasked: connection.accountIdentifierMasked,
    scopes: connection.scopes,
    status: connection.status,
    lastSyncedAt: connection.lastSyncedAt,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt
  };
}

export async function connectBroker(
  state: AppState,
  params: {
    accessToken: string;
    accountAlias?: string;
    consentAccepted: boolean;
  },
  provider: BrokerProvider = new MockBrokerProvider()
): Promise<{ state: AppState; connection: BrokerConnectionPublicView }> {
  logKpiEvent("broker_connection_started", {
    provider: provider.providerName
  });

  const result = await provider.connect({
    accessToken: params.accessToken,
    accountAlias: params.accountAlias,
    consentAccepted: params.consentAccepted
  });
  const now = new Date().toISOString();
  const connection: ExternalConnection = {
    id: createId("conn"),
    providerType: "broker",
    providerName: result.providerName,
    brokerName: result.brokerName,
    accountAlias: params.accountAlias,
    accountIdentifierMasked: result.accountIdentifierMasked,
    encryptedAccessToken: await encryptToken(params.accessToken),
    tokenPreview: maskToken(params.accessToken),
    scopes: result.scopes,
    status: "connected",
    consentAcceptedAt: result.connectedAt,
    createdAt: now,
    updatedAt: now
  };

  logKpiEvent("broker_connection_completed", {
    provider: provider.providerName,
    connectionId: connection.id
  });

  return {
    state: {
      ...state,
      externalConnections: [connection, ...state.externalConnections]
    },
    connection: toBrokerConnectionPublicView(connection)
  };
}

export function disconnectBroker(
  state: AppState,
  connectionId: string
): AppState {
  const now = new Date().toISOString();
  logKpiEvent("broker_disconnected", { connectionId });

  return {
    ...state,
    externalConnections: state.externalConnections.map((connection) =>
      connection.id === connectionId
        ? { ...connection, status: "disconnected", updatedAt: now }
        : connection
    ),
    externalSyncLogs: [
      {
        id: createId("synclog"),
        connectionId,
        providerType: "broker",
        providerName: "broker",
        syncType: "broker_connection",
        status: "success",
        startedAt: now,
        completedAt: now,
        totalItems: 0,
        successItems: 0,
        failedItems: 0,
        warningItems: 0
      },
      ...state.externalSyncLogs
    ]
  };
}

export function deleteSyncedBrokerData(
  state: AppState,
  connectionId: string
): AppState {
  const now = new Date().toISOString();
  const removedAssets = state.assets.filter(
    (asset) => asset.externalConnectionId === connectionId
  );
  logKpiEvent("external_data_deleted", {
    connectionId,
    removedAssetCount: removedAssets.length
  });

  return {
    ...state,
    assets: state.assets.filter(
      (asset) => asset.externalConnectionId !== connectionId
    ),
    snapshots: state.snapshots.map((snapshot) =>
      snapshot.snapshotSource === "broker_sync"
        ? { ...snapshot, isArchived: true }
        : snapshot
    ),
    externalConnections: state.externalConnections.map((connection) =>
      connection.id === connectionId
        ? { ...connection, status: "deleted", updatedAt: now }
        : connection
    ),
    externalSyncLogs: [
      {
        id: createId("synclog"),
        connectionId,
        providerType: "broker",
        providerName: "broker",
        syncType: "broker_delete",
        status: "success",
        startedAt: now,
        completedAt: now,
        totalItems: removedAssets.length,
        successItems: removedAssets.length,
        failedItems: 0,
        warningItems: 0
      },
      ...state.externalSyncLogs
    ]
  };
}
