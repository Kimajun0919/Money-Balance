import { createId } from "@/lib/services/service-utils";
import type {
  AccountAuditEventType,
  AccountAuditLog,
  AppState
} from "@/lib/types";

export function appendAccountAuditLog(
  state: AppState,
  params: {
    eventType: AccountAuditEventType;
    entityType?: string;
    entityId?: string;
    summary: string;
    metadata?: Record<string, unknown>;
    createdAt?: string;
  }
): AppState {
  const log: AccountAuditLog = {
    id: createId("acctaudit"),
    eventType: params.eventType,
    entityType: params.entityType,
    entityId: params.entityId,
    summary: params.summary,
    metadata: params.metadata ?? {},
    createdAt: params.createdAt ?? new Date().toISOString()
  };

  return {
    ...state,
    accountAuditLogs: [log, ...state.accountAuditLogs]
  };
}
