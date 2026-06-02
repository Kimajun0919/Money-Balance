import { describe, expect, it } from "vitest";
import {
  applyAccountSyncPreview,
  createFailedAccountSyncJob,
  deleteSyncedAccountData,
  previewAccountSync
} from "@/lib/services/account-sync-service";
import {
  connectMockProvider,
  disconnectInstitutionConnection
} from "@/lib/services/institution-connection-service";
import { MockBankProvider } from "@/lib/services/providers/banking/mock-bank-provider";
import { MockSecuritiesProvider } from "@/lib/services/providers/broker/mock-securities-provider";
import { createDefaultState } from "@/lib/storage/default-state";
import type { AppState } from "@/lib/types";

function emptyState(): AppState {
  return {
    ...createDefaultState(),
    assets: [],
    financialInstitutions: [],
    financialAccounts: [],
    financialAccountAssetLinks: [],
    liabilities: [],
    accountSyncJobs: [],
    accountSyncItems: [],
    externalConnections: [],
    accountAuditLogs: []
  };
}

describe("phase6 account sync", () => {
  it("preview does not mutate state and apply creates synced records", async () => {
    const state = emptyState();
    const provider = new MockBankProvider();
    const connected = connectMockProvider(state, provider);
    const preview = await previewAccountSync(connected.state, provider, {
      externalConnectionId: connected.connection.id
    });

    expect(preview.state.financialAccounts).toHaveLength(0);

    const applied = applyAccountSyncPreview(connected.state, {
      preview: preview.preview
    });

    expect(applied.state.financialAccounts.length).toBeGreaterThan(0);
    expect(applied.state.accountSyncJobs[0].status).toBe("applied");
    expect(applied.state.accountSyncItems.length).toBeGreaterThan(0);
  });

  it("detects duplicate accounts and holdings on a second preview", async () => {
    const provider = new MockSecuritiesProvider();
    const connected = connectMockProvider(emptyState(), provider);
    const firstPreview = await previewAccountSync(connected.state, provider, {
      externalConnectionId: connected.connection.id
    });
    const applied = applyAccountSyncPreview(connected.state, {
      preview: firstPreview.preview
    });
    const secondPreview = await previewAccountSync(applied.state, provider, {
      externalConnectionId: connected.connection.id
    });

    expect(Object.keys(secondPreview.preview.duplicateAccountIds).length).toBeGreaterThan(0);
    expect(Object.keys(secondPreview.preview.duplicateAssetIds).length).toBeGreaterThan(0);
  });

  it("records failed sync jobs", () => {
    const failed = createFailedAccountSyncJob(emptyState(), {
      providerType: "bank",
      providerName: "mock-bank",
      errorMessage: "테스트 실패"
    });

    expect(failed.accountSyncJobs[0].status).toBe("failed");
    expect(failed.accountSyncJobs[0].errorMessage).toBe("테스트 실패");
  });

  it("deletes synced data and disconnects provider", async () => {
    const provider = new MockBankProvider();
    const connected = connectMockProvider(emptyState(), provider);
    const preview = await previewAccountSync(connected.state, provider, {
      externalConnectionId: connected.connection.id
    });
    const applied = applyAccountSyncPreview(connected.state, {
      preview: preview.preview
    });
    const deleted = deleteSyncedAccountData(applied.state, {
      externalConnectionId: connected.connection.id,
      providerType: "bank"
    });
    const disconnected = disconnectInstitutionConnection(
      applied.state,
      connected.connection.id
    );

    expect(deleted.financialAccounts).toHaveLength(0);
    expect(deleted.accountSyncJobs[0].syncType).toBe("delete");
    expect(
      disconnected.externalConnections.find(
        (connection) => connection.id === connected.connection.id
      )?.status
    ).toBe("disconnected");
  });
});
