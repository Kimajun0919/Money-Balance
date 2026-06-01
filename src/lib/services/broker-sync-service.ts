import { MockBrokerProvider } from "@/lib/providers/broker/mock-broker-provider";
import type { BrokerProvider } from "@/lib/providers/broker/broker-provider";
import { logKpiEvent } from "@/lib/kpi/event-logger";
import {
  normalizeBrokerCashBalance,
  normalizeBrokerHolding,
  type NormalizedExternalAsset
} from "@/lib/services/asset-normalization-service";
import { createMonthlySnapshot } from "@/lib/services/snapshot-service";
import { createId } from "@/lib/services/service-utils";
import type {
  AppState,
  Asset,
  ExternalAssetMapping,
  ExternalSyncLog
} from "@/lib/types";

export interface BrokerSyncPreview {
  connectionId: string;
  fetchedAt: string;
  rows: NormalizedExternalAsset[];
  duplicateAssetIds: Record<string, string>;
  warnings: string[];
}

function detectExternalDuplicate(assets: Asset[], row: NormalizedExternalAsset) {
  return assets.find((asset) => {
    if (
      asset.externalAssetId &&
      asset.externalAssetId === row.externalAssetId
    ) {
      return true;
    }
    return (
      asset.ticker &&
      row.assetInput.ticker &&
      asset.ticker === row.assetInput.ticker &&
      asset.accountAlias === row.assetInput.accountAlias
    );
  });
}

export async function createBrokerSyncPreview(
  state: AppState,
  connectionId: string,
  provider: BrokerProvider = new MockBrokerProvider()
): Promise<{ state: AppState; preview: BrokerSyncPreview }> {
  const connection = state.externalConnections.find(
    (item) => item.id === connectionId && item.status === "connected"
  );
  if (!connection) {
    throw new Error("연결된 증권사 정보를 찾을 수 없습니다.");
  }

  logKpiEvent("broker_sync_started", {
    provider: provider.providerName,
    connectionId
  });
  const startedAt = new Date().toISOString();
  const syncResult = await provider.sync(connectionId);
  const rows = [
    ...syncResult.holdings.map((holding) =>
      normalizeBrokerHolding(holding, {
        brokerName: connection.brokerName ?? provider.brokerName,
        externalConnectionId: connectionId,
        syncedAt: syncResult.fetchedAt
      })
    ),
    ...syncResult.cashBalances.map((cashBalance) =>
      normalizeBrokerCashBalance(cashBalance, {
        brokerName: connection.brokerName ?? provider.brokerName,
        externalConnectionId: connectionId,
        syncedAt: syncResult.fetchedAt
      })
    )
  ];
  const duplicateAssetIds = rows.reduce<Record<string, string>>((acc, row) => {
    const duplicate = detectExternalDuplicate(state.assets, row);
    if (duplicate) acc[row.externalAssetId] = duplicate.id;
    return acc;
  }, {});
  const warningItems = rows.filter((row) => row.warnings.length > 0).length;
  const log: ExternalSyncLog = {
    id: createId("synclog"),
    connectionId,
    providerType: "broker",
    providerName: connection.providerName,
    syncType: "broker_holdings",
    status: "previewed",
    startedAt,
    completedAt: new Date().toISOString(),
    totalItems: rows.length,
    successItems: rows.length,
    failedItems: 0,
    warningItems,
    rawSummary: {
      holdings: syncResult.holdings.length,
      cashBalances: syncResult.cashBalances.length
    }
  };

  logKpiEvent("broker_sync_preview_viewed", {
    connectionId,
    totalItems: rows.length
  });

  return {
    state: {
      ...state,
      externalSyncLogs: [log, ...state.externalSyncLogs]
    },
    preview: {
      connectionId,
      fetchedAt: syncResult.fetchedAt,
      rows,
      duplicateAssetIds,
      warnings: [
        ...syncResult.warnings,
        ...rows.flatMap((row) => row.warnings)
      ]
    }
  };
}

export function applyBrokerSyncPreview(
  state: AppState,
  params: {
    preview: BrokerSyncPreview;
    createSnapshot?: boolean;
    replaceDuplicates?: boolean;
  }
): { state: AppState; createdAssets: Asset[]; snapshotId?: string } {
  const now = new Date().toISOString();
  const createdAssets = params.preview.rows.map((row) => row.asset);
  const duplicateIds = new Set(Object.values(params.preview.duplicateAssetIds));
  const retainedAssets = params.replaceDuplicates
    ? state.assets.filter((asset) => !duplicateIds.has(asset.id))
    : state.assets;
  let nextState: AppState = {
    ...state,
    assets: [...retainedAssets, ...createdAssets],
    externalConnections: state.externalConnections.map((connection) =>
      connection.id === params.preview.connectionId
        ? { ...connection, lastSyncedAt: params.preview.fetchedAt, updatedAt: now }
        : connection
    ),
    externalAssetMappings: [
      ...params.preview.rows.map<ExternalAssetMapping>((row) => ({
        id: createId("mapping"),
        provider:
          state.externalConnections.find(
            (connection) => connection.id === params.preview.connectionId
          )?.providerName ?? "broker",
        externalAssetId: row.externalAssetId,
        assetName: row.assetInput.assetName,
        ticker: row.assetInput.ticker,
        market: row.assetInput.market,
        currency: row.assetInput.currency,
        rawAssetType: String(row.rawData.rawAssetType ?? ""),
        mappedAssetType: row.assetInput.assetType,
        confidenceScore: row.classification.confidenceScore,
        mappingSource: row.assetInput.userConfirmedAssetType
          ? "user"
          : "auto",
        userConfirmed: Boolean(row.assetInput.userConfirmedAssetType),
        createdAt: now,
        updatedAt: now
      })),
      ...state.externalAssetMappings
    ]
  };

  let snapshotId: string | undefined;
  if (params.createSnapshot && createdAssets.length > 0) {
    const snapshotResult = createMonthlySnapshot(nextState, {
      source: "broker_sync",
      duplicatePolicy: "new"
    });
    nextState = snapshotResult.state;
    snapshotId = snapshotResult.snapshot?.id;
  }

  nextState = {
    ...nextState,
    externalSyncLogs: [
      {
        id: createId("synclog"),
        connectionId: params.preview.connectionId,
        providerType: "broker",
        providerName:
          nextState.externalConnections.find(
            (connection) => connection.id === params.preview.connectionId
          )?.providerName ?? "broker",
        syncType: "broker_holdings",
        status: "applied",
        startedAt: params.preview.fetchedAt,
        completedAt: now,
        totalItems: createdAssets.length,
        successItems: createdAssets.length,
        failedItems: 0,
        warningItems: params.preview.warnings.length,
        snapshotId
      },
      ...nextState.externalSyncLogs
    ]
  };

  logKpiEvent("broker_sync_applied", {
    connectionId: params.preview.connectionId,
    createdAssets: createdAssets.length,
    snapshotId
  });

  return { state: nextState, createdAssets, snapshotId };
}
