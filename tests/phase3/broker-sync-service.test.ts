import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/lib/storage/default-state";
import { connectBroker } from "@/lib/services/broker-connection-service";
import {
  applyBrokerSyncPreview,
  createBrokerSyncPreview
} from "@/lib/services/broker-sync-service";

describe("broker-sync-service", () => {
  it("토큰을 암호화해 저장하고 프론트 반환값에는 토큰을 노출하지 않는다", async () => {
    const result = await connectBroker(createDefaultState(), {
      accessToken: "mock-secret-token",
      accountAlias: "테스트 계좌",
      consentAccepted: true
    });
    const stored = result.state.externalConnections[0];

    expect(stored.encryptedAccessToken).toBeDefined();
    expect(stored.encryptedAccessToken).not.toContain("mock-secret-token");
    expect("encryptedAccessToken" in result.connection).toBe(false);
  });

  it("동기화 미리보기는 확인 전까지 자산에 반영하지 않고, 반영 후 스냅샷을 만든다", async () => {
    const connected = await connectBroker(createDefaultState(), {
      accessToken: "mock-secret-token",
      accountAlias: "테스트 계좌",
      consentAccepted: true
    });
    const connectionId = connected.state.externalConnections[0].id;
    const previewResult = await createBrokerSyncPreview(
      connected.state,
      connectionId
    );

    expect(previewResult.state.assets).toHaveLength(0);
    expect(previewResult.preview.rows.length).toBeGreaterThan(0);

    const applied = applyBrokerSyncPreview(previewResult.state, {
      preview: previewResult.preview,
      createSnapshot: true
    });

    expect(applied.createdAssets.length).toBeGreaterThan(0);
    expect(applied.state.assets.length).toBe(applied.createdAssets.length);
    expect(applied.snapshotId).toBeDefined();
    expect(applied.state.rebalanceSuggestions[0].summary).not.toContain("매수");
  });
});
