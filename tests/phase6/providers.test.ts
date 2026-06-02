import { describe, expect, it } from "vitest";
import { MockBankProvider } from "@/lib/services/providers/banking/mock-bank-provider";
import { MockSecuritiesProvider } from "@/lib/services/providers/broker/mock-securities-provider";
import { DisabledOpenBankingProvider } from "@/lib/services/providers/banking/disabled-open-banking-provider";
import { DisabledMyDataProvider } from "@/lib/services/providers/mydata/disabled-mydata-provider";
import { normalizeKisBrokerSyncResult } from "@/lib/services/providers/broker/kis-account-provider";
import { connectKisProviderUsingServerEnv } from "@/lib/services/institution-connection-service";
import { createDefaultState } from "@/lib/storage/default-state";

describe("phase6 providers", () => {
  it("returns mock bank accounts", async () => {
    const payload = await new MockBankProvider().previewSync();

    expect(payload.payload.accounts.map((account) => account.accountType)).toEqual(
      expect.arrayContaining([
        "bank_checking",
        "bank_savings",
        "installment_savings",
        "loan"
      ])
    );
  });

  it("returns mock securities holdings", async () => {
    const payload = await new MockSecuritiesProvider().previewSync();

    expect(payload.payload.holdings.map((holding) => holding.ticker)).toEqual(
      expect.arrayContaining(["005930", "SPY"])
    );
    expect(payload.payload.accounts.some((account) => account.currency === "USD")).toBe(true);
  });

  it("keeps Open Banking disabled without official access", async () => {
    const provider = new DisabledOpenBankingProvider();
    const status = await provider.checkConnectionStatus();
    const preview = await provider.previewSync();

    expect(status.status).toBe("unsupported");
    expect(preview.payload.accounts).toHaveLength(0);
    expect(preview.warnings[0]).toContain("공식");
  });

  it("keeps MyData disabled without official access", async () => {
    const provider = new DisabledMyDataProvider();
    const status = await provider.checkConnectionStatus();
    const preview = await provider.previewSync();

    expect(status.status).toBe("unsupported");
    expect(preview.payload.holdings).toHaveLength(0);
    expect(preview.warnings[0]).toContain("공식");
  });

  it("normalizes mocked KIS balances without exposing secrets", () => {
    const payload = normalizeKisBrokerSyncResult({
      fetchedAt: "2026-06-02T00:00:00.000Z",
      holdings: [
        {
          externalAssetId: "kis-domestic-005930",
          assetName: "삼성전자",
          ticker: "005930",
          market: "KRX",
          currency: "KRW",
          quantity: 10,
          currentPrice: 80_000,
          valuationAmount: 800_000,
          rawAssetType: "domestic_stock",
          accountAlias: "KIS 종합계좌",
          rawData: { accountNumber: "raw-should-not-pass" }
        }
      ],
      cashBalances: [
        {
          externalAssetId: "kis-cash",
          assetName: "예수금",
          currency: "KRW",
          amount: 100_000,
          accountAlias: "KIS 종합계좌",
          rawData: { accountNumber: "raw-should-not-pass" }
        }
      ],
      warnings: []
    });

    const serialized = JSON.stringify(payload);
    expect(payload.accounts.length).toBeGreaterThan(0);
    expect(payload.holdings[0].ticker).toBe("005930");
    expect(serialized).not.toContain("KIS_APP_SECRET");
    expect(serialized).not.toContain("KIS_ACCOUNT_NUMBER");
  });

  it("stores KIS server-managed connection without browser-visible secrets", () => {
    const result = connectKisProviderUsingServerEnv(createDefaultState(), {
      accountAlias: "KIS",
      consentAccepted: true,
      connectionResult: {
        providerName: "kis-broker",
        brokerName: "한국투자증권",
        accountIdentifierMasked: "KIS-******12-01",
        scopes: ["read_holdings", "read_cash"],
        connectedAt: "2026-06-02T00:00:00.000Z"
      }
    });

    expect(result.connection.tokenPreview).toBe("server-managed");
    expect(result.connection.encryptedAccessToken).toBeUndefined();
    expect(JSON.stringify(result.connection)).not.toContain("secret");
  });
});
