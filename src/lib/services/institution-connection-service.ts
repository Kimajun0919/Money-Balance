import { appendAccountAuditLog } from "@/lib/services/account-audit-service";
import { deleteSyncedAccountData } from "@/lib/services/account-sync-service";
import { createId } from "@/lib/services/service-utils";
import type {
  BrokerConnectionResult
} from "@/lib/providers/broker/broker-provider";
import type {
  FinancialDataProvider
} from "@/lib/services/providers/account/account-provider";
import type { AppState, ExternalConnection, ExternalProviderType } from "@/lib/types";

export interface ConnectionCenterItem {
  id: string;
  providerId: string;
  providerName: string;
  providerType: ExternalProviderType;
  category: string;
  permissionState: "read_only" | "trading" | "disabled";
  status: ExternalConnection["status"] | "disabled";
  lastSuccessfulSync?: string;
  lastFailedSync?: string;
  failureReason?: string;
}

function connectionForProvider(
  state: AppState,
  providerType: ExternalProviderType,
  providerName: string
) {
  return state.externalConnections.find(
    (connection) =>
      connection.providerType === providerType &&
      connection.providerName === providerName &&
      connection.status !== "deleted"
  );
}

export function connectMockProvider(
  state: AppState,
  provider: FinancialDataProvider
): { state: AppState; connection: ExternalConnection } {
  const existing = connectionForProvider(
    state,
    provider.providerType,
    provider.providerId
  );
  const now = new Date().toISOString();
  const connection: ExternalConnection = existing
    ? {
        ...existing,
        status: "connected",
        scopes: provider.permissionScope,
        updatedAt: now
      }
    : {
        id: createId("conn"),
        providerType: provider.providerType,
        providerName: provider.providerId,
        brokerName:
          provider.providerType === "broker" ||
          provider.providerType === "securities"
            ? provider.providerName
            : undefined,
        accountAlias: provider.providerName,
        accountIdentifierMasked: "MOCK-****",
        tokenPreview: "mock-readonly",
        scopes: provider.permissionScope,
        status: "connected",
        consentAcceptedAt: now,
        createdAt: now,
        updatedAt: now
      };
  const nextState: AppState = {
    ...state,
    externalConnections: existing
      ? state.externalConnections.map((item) =>
          item.id === existing.id ? connection : item
        )
      : [connection, ...state.externalConnections]
  };

  return {
    connection,
    state: appendAccountAuditLog(nextState, {
      eventType: "connection_created",
      entityType: "external_connection",
      entityId: connection.id,
      summary: `${provider.providerName} 모의 연결을 생성했습니다.`,
      metadata: { providerType: provider.providerType }
    })
  };
}

export function connectKisProviderUsingServerEnv(
  state: AppState,
  params: {
    accountAlias?: string;
    consentAccepted: boolean;
    connectionResult: BrokerConnectionResult;
  }
): { state: AppState; connection: ExternalConnection } {
  if (!params.consentAccepted) {
    throw new Error("KIS 잔고 조회 연결에는 명시적 동의가 필요합니다.");
  }
  const now = new Date().toISOString();
  const connection: ExternalConnection = {
    id: createId("conn"),
    providerType: "broker",
    providerName: params.connectionResult.providerName,
    brokerName: params.connectionResult.brokerName,
    accountAlias: params.accountAlias,
    accountIdentifierMasked: params.connectionResult.accountIdentifierMasked,
    tokenPreview: "server-managed",
    scopes: params.connectionResult.scopes,
    status: "connected",
    consentAcceptedAt: params.connectionResult.connectedAt,
    createdAt: now,
    updatedAt: now
  };
  const nextState: AppState = {
    ...state,
    externalConnections: [connection, ...state.externalConnections]
  };

  return {
    connection,
    state: appendAccountAuditLog(nextState, {
      eventType: "connection_created",
      entityType: "external_connection",
      entityId: connection.id,
      summary: "KIS 서버 관리 연결을 생성했습니다.",
      metadata: { scopes: connection.scopes }
    })
  };
}

export function createDisabledOpenBankingConnectionPlaceholder(
  state: AppState
): AppState {
  return createDisabledConnectionPlaceholder(state, {
    providerType: "open_banking",
    providerName: "open-banking-disabled",
    accountAlias: "오픈뱅킹 비활성",
    reason: "공식 오픈뱅킹 접근 권한과 자격 증명이 필요합니다."
  });
}

export function createDisabledMyDataConnectionPlaceholder(
  state: AppState
): AppState {
  return createDisabledConnectionPlaceholder(state, {
    providerType: "mydata",
    providerName: "mydata-disabled",
    accountAlias: "마이데이터 비활성",
    reason: "공식 마이데이터 승인과 접근 권한이 필요합니다."
  });
}

function createDisabledConnectionPlaceholder(
  state: AppState,
  params: {
    providerType: ExternalProviderType;
    providerName: string;
    accountAlias: string;
    reason: string;
  }
): AppState {
  if (connectionForProvider(state, params.providerType, params.providerName)) {
    return state;
  }
  const now = new Date().toISOString();
  const connection: ExternalConnection = {
    id: createId("conn"),
    providerType: params.providerType,
    providerName: params.providerName,
    accountAlias: params.accountAlias,
    scopes: [],
    status: "disconnected",
    lastError: params.reason,
    createdAt: now,
    updatedAt: now
  };

  return {
    ...state,
    externalConnections: [connection, ...state.externalConnections]
  };
}

export function disconnectInstitutionConnection(
  state: AppState,
  connectionId: string
): AppState {
  const now = new Date().toISOString();
  const connection = state.externalConnections.find((item) => item.id === connectionId);
  if (!connection) return state;
  const nextState: AppState = {
    ...state,
    externalConnections: state.externalConnections.map((item) =>
      item.id === connectionId
        ? { ...item, status: "disconnected", updatedAt: now }
        : item
    )
  };

  return appendAccountAuditLog(nextState, {
    eventType: "connection_disconnected",
    entityType: "external_connection",
    entityId: connectionId,
    summary: `${connection.providerName} 연결을 해제했습니다.`
  });
}

export function deleteInstitutionSyncedData(
  state: AppState,
  connectionId: string
): AppState {
  const connection = state.externalConnections.find((item) => item.id === connectionId);
  const deletedState = deleteSyncedAccountData(state, {
    externalConnectionId: connectionId,
    providerType: connection?.providerType
  });
  return {
    ...deletedState,
    externalConnections: deletedState.externalConnections.map((item) =>
      item.id === connectionId
        ? { ...item, status: "deleted", updatedAt: new Date().toISOString() }
        : item
    )
  };
}

export function rotateConnectionState(
  state: AppState,
  connectionId: string,
  status: ExternalConnection["status"],
  errorMessage?: string
): AppState {
  return {
    ...state,
    externalConnections: state.externalConnections.map((connection) =>
      connection.id === connectionId
        ? {
            ...connection,
            status,
            lastError: errorMessage,
            updatedAt: new Date().toISOString()
          }
        : connection
    )
  };
}

export function checkConnectionStatus(
  state: AppState,
  connectionId: string
): ConnectionCenterItem | undefined {
  const connection = state.externalConnections.find((item) => item.id === connectionId);
  if (!connection) return undefined;

  return {
    id: connection.id,
    providerId: connection.providerName,
    providerName: connection.brokerName ?? connection.providerName,
    providerType: connection.providerType,
    category: connection.providerType,
    permissionState: connection.scopes.includes("submit_orders")
      ? "trading"
      : connection.status === "disconnected" && connection.lastError
        ? "disabled"
        : "read_only",
    status:
      connection.status === "disconnected" && connection.lastError
        ? "disabled"
        : connection.status,
    lastSuccessfulSync: connection.lastSyncedAt,
    lastFailedSync:
      connection.status === "failed" ? connection.updatedAt : undefined,
    failureReason: connection.lastError
  };
}

export function listConnectionCenterItems(state: AppState): ConnectionCenterItem[] {
  const explicit = state.externalConnections.map((connection) =>
    checkConnectionStatus(state, connection.id)
  ).filter((item): item is ConnectionCenterItem => Boolean(item));
  const fixed: ConnectionCenterItem[] = [
    {
      id: "connector-mock-bank",
      providerId: "mock-bank",
      providerName: "모의 은행",
      providerType: "bank",
      category: "banking",
      permissionState: "read_only",
      status:
        explicit.find((item) => item.providerId === "mock-bank")?.status ??
        "connected"
    },
    {
      id: "connector-mock-securities",
      providerId: "mock-securities",
      providerName: "모의 증권",
      providerType: "securities",
      category: "securities",
      permissionState: "read_only",
      status:
        explicit.find((item) => item.providerId === "mock-securities")?.status ??
        "connected"
    },
    {
      id: "connector-kis",
      providerId: "kis-broker",
      providerName: "한국투자증권 KIS",
      providerType: "broker",
      category: "broker",
      permissionState: "read_only",
      status:
        explicit.find((item) => item.providerId.includes("kis"))?.status ??
        "disconnected"
    },
    {
      id: "connector-manual",
      providerId: "manual-account",
      providerName: "수동 계좌",
      providerType: "manual",
      category: "manual",
      permissionState: "read_only",
      status: "connected"
    },
    {
      id: "connector-csv",
      providerId: "csv-import",
      providerName: "CSV 가져오기",
      providerType: "csv_import",
      category: "csv",
      permissionState: "read_only",
      status: "connected"
    },
    {
      id: "connector-open-banking",
      providerId: "open-banking-disabled",
      providerName: "오픈뱅킹",
      providerType: "open_banking",
      category: "banking",
      permissionState: "disabled",
      status: "disabled",
      failureReason: "공식 접근 권한과 자격 증명이 필요합니다."
    },
    {
      id: "connector-mydata",
      providerId: "mydata-disabled",
      providerName: "마이데이터",
      providerType: "mydata",
      category: "mydata",
      permissionState: "disabled",
      status: "disabled",
      failureReason: "공식 승인과 접근 권한이 필요합니다."
    }
  ];

  return [
    ...explicit,
    ...fixed.filter(
      (fixedItem) =>
        !explicit.some((item) => item.providerId === fixedItem.providerId)
    )
  ];
}
