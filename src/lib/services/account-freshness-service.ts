import { hoursSince } from "@/lib/services/data-freshness-service";
import type {
  AppState,
  ExternalConnection,
  FinancialAccount
} from "@/lib/types";

export interface AccountFreshnessWarning {
  id: string;
  sourceType: "account" | "connection" | "market_price" | "fx_rate";
  sourceId?: string;
  severity: "warning" | "blocking";
  code: string;
  message: string;
  lastUpdatedAt?: string;
}

const DEFAULT_THRESHOLD_HOURS = 24;

function isStale(timestamp?: string, now = new Date()) {
  return hoursSince(timestamp, now) > DEFAULT_THRESHOLD_HOURS;
}

function accountRequiresFreshness(account: FinancialAccount) {
  return !account.isManual && account.syncStatus !== "deleted";
}

export function getAccountFreshnessWarnings(
  state: AppState,
  now = new Date()
): AccountFreshnessWarning[] {
  const warnings: AccountFreshnessWarning[] = [];

  for (const account of state.financialAccounts) {
    if (account.isArchived || !accountRequiresFreshness(account)) continue;
    if (account.syncStatus === "failed") {
      warnings.push({
        id: `account-failed-${account.id}`,
        sourceType: "account",
        sourceId: account.id,
        severity: "blocking",
        code: "account_sync_failed",
        message: `${account.accountAlias} 동기화가 실패했습니다.`,
        lastUpdatedAt: account.lastFailedSyncAt
      });
      continue;
    }
    if (isStale(account.lastSyncedAt, now)) {
      warnings.push({
        id: `account-stale-${account.id}`,
        sourceType: "account",
        sourceId: account.id,
        severity: "warning",
        code: "account_balance_stale",
        message: `${account.accountAlias} 잔고 데이터가 24시간보다 오래되었습니다.`,
        lastUpdatedAt: account.lastSyncedAt
      });
    }
  }

  for (const connection of state.externalConnections) {
    if (connection.status === "failed") {
      warnings.push(connectionFailureWarning(connection));
    }
  }

  for (const price of state.marketPriceSnapshots) {
    if (isStale(price.fetchedAt, now)) {
      warnings.push({
        id: `price-stale-${price.id}`,
        sourceType: "market_price",
        sourceId: price.id,
        severity: "warning",
        code: "market_price_stale",
        message: `${price.ticker} 시세 데이터가 24시간보다 오래되었습니다.`,
        lastUpdatedAt: price.fetchedAt
      });
    }
  }

  for (const rate of state.fxRateSnapshots) {
    if (isStale(rate.fetchedAt, now)) {
      warnings.push({
        id: `fx-stale-${rate.id}`,
        sourceType: "fx_rate",
        sourceId: rate.id,
        severity: "warning",
        code: "fx_rate_stale",
        message: `${rate.baseCurrency}/${rate.quoteCurrency} 환율 데이터가 24시간보다 오래되었습니다.`,
        lastUpdatedAt: rate.fetchedAt
      });
    }
  }

  return warnings;
}

export function connectionFailureWarning(
  connection: ExternalConnection
): AccountFreshnessWarning {
  return {
    id: `connection-failed-${connection.id}`,
    sourceType: "connection",
    sourceId: connection.id,
    severity: "blocking",
    code: "connection_failed",
    message: `${connection.providerName} 연결이 실패했습니다.${
      connection.lastError ? ` 사유: ${connection.lastError}` : ""
    }`,
    lastUpdatedAt: connection.updatedAt
  };
}

export function markAccountFreshness(state: AppState, now = new Date()): AppState {
  return {
    ...state,
    financialAccounts: state.financialAccounts.map((account) => {
      if (account.isManual) return { ...account, staleStatus: "manual" };
      if (account.syncStatus === "failed") {
        return {
          ...account,
          staleStatus: "stale",
          warningCodes: [...new Set([...account.warningCodes, "sync_failed"])]
        };
      }
      const stale = isStale(account.lastSyncedAt, now);
      return {
        ...account,
        staleStatus: stale ? "stale" : "fresh",
        warningCodes: stale
          ? [...new Set([...account.warningCodes, "account_balance_stale"])]
          : account.warningCodes.filter(
              (warning) => warning !== "account_balance_stale"
            )
      };
    })
  };
}
