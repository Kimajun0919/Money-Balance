import type {
  AppState,
  OrderEventLog,
  TradingAuditEventType,
  TradingAuditLog,
  TradingExecutionMode
} from "@/lib/types";
import { createId } from "@/lib/services/service-utils";

export function appendTradingAuditLog(
  state: AppState,
  params: {
    eventType: TradingAuditEventType;
    summary: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    createdAt?: string;
  }
): AppState {
  const createdAt = params.createdAt ?? new Date().toISOString();
  const log: TradingAuditLog = {
    id: createId("audit"),
    eventType: params.eventType,
    entityType: params.entityType,
    entityId: params.entityId,
    summary: params.summary,
    metadata: params.metadata ?? {},
    privateTradingFlagsSnapshot: { ...state.privateTradingFlags },
    createdAt
  };

  return {
    ...state,
    tradingAuditLogs: [log, ...state.tradingAuditLogs]
  };
}

export function appendOrderEventLog(
  state: AppState,
  params: {
    eventType: OrderEventLog["eventType"];
    executionMode: TradingExecutionMode;
    message: string;
    status: OrderEventLog["status"];
    orderProposalId?: string;
    instrumentId?: string;
    ticker?: string;
    amountKrw?: number;
    createdAt?: string;
  }
): AppState {
  const createdAt = params.createdAt ?? new Date().toISOString();
  const log: OrderEventLog = {
    id: createId("orderlog"),
    orderProposalId: params.orderProposalId,
    eventType: params.eventType,
    executionMode: params.executionMode,
    instrumentId: params.instrumentId,
    ticker: params.ticker,
    amountKrw: params.amountKrw,
    status: params.status,
    message: params.message,
    privateTradingFlagsSnapshot: { ...state.privateTradingFlags },
    createdAt
  };

  return {
    ...state,
    orderEventLogs: [log, ...state.orderEventLogs]
  };
}
