import { afterEach, describe, expect, it, vi } from "vitest";
import { KoreaInvestmentBrokerProvider } from "@/lib/providers/broker/kis-broker-provider";
import { KIS_BROKER_PROVIDER_NAME } from "@/lib/providers/broker/broker-provider-constants";
import { validateKisServerRouteRequest } from "@/lib/providers/broker/kis-route-guard";
import { createDefaultState } from "@/lib/storage/default-state";
import { connectServerManagedBroker } from "@/lib/services/broker-connection-service";
import { createBrokerSyncPreviewFromResult } from "@/lib/services/broker-sync-service";

const originalFetch = globalThis.fetch;
const kisEnvKeys = [
  "KIS_ENV",
  "KIS_APP_KEY",
  "KIS_APP_SECRET",
  "KIS_ACCOUNT_NUMBER",
  "KIS_ACCOUNT_PRODUCT_CODE",
  "KIS_ACCOUNT_ALIAS",
  "KIS_ALLOW_NON_LOCAL_SERVER_ROUTES",
  "KIS_SYNC_OVERSEAS",
  "KIS_DEFAULT_USD_KRW_RATE"
];
const originalKisEnv = new Map(
  kisEnvKeys.map((key) => [key, process.env[key]])
);

interface KisFetchCall {
  url: string;
  init?: RequestInit;
}

function restoreKisEnv() {
  for (const key of kisEnvKeys) {
    const value = originalKisEnv.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function configureKisEnv(appKey: string) {
  process.env.KIS_ENV = "real";
  process.env.KIS_APP_KEY = appKey;
  process.env.KIS_APP_SECRET = "unit-secret";
  process.env.KIS_ACCOUNT_NUMBER = "12345678";
  process.env.KIS_ACCOUNT_PRODUCT_CODE = "01";
  process.env.KIS_ACCOUNT_ALIAS = "환경변수 계좌";
  delete process.env.KIS_ALLOW_NON_LOCAL_SERVER_ROUTES;
  delete process.env.KIS_SYNC_OVERSEAS;
  delete process.env.KIS_DEFAULT_USD_KRW_RATE;
}

function mockKisFetch() {
  const calls: KisFetchCall[] = [];
  globalThis.fetch = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof URL ? input.toString() : String(input);
      calls.push({ url, init });

      if (url.endsWith("/oauth2/tokenP")) {
        return new Response(
          JSON.stringify({
            access_token: "unit-token",
            expires_in: "86400"
          }),
          { status: 200 }
        );
      }

      if (url.includes("/uapi/domestic-stock/v1/trading/inquire-balance")) {
        return new Response(
          JSON.stringify({
            rt_cd: "0",
            output1: [
              {
                pdno: "005930",
                prdt_name: "삼성전자",
                hldg_qty: "2",
                prpr: "75000",
                evlu_amt: "150000",
                pchs_amt: "140000",
                pchs_avg_pric: "70000",
                trad_dvsn_name: "국내주식"
              }
            ],
            output2: [{ dnca_tot_amt: "12345" }],
            ctx_area_fk100: "",
            ctx_area_nk100: ""
          }),
          { headers: { tr_cont: "" }, status: 200 }
        );
      }

      if (url.includes("/uapi/overseas-stock/v1/trading/inquire-balance")) {
        return new Response(
          JSON.stringify({
            rt_cd: "0",
            output1: [
              {
                ovrs_pdno: "AAPL",
                ovrs_item_name: "Apple Inc",
                ovrs_cblc_qty: "3",
                now_pric2: "200",
                ovrs_stck_evlu_amt: "600",
                tr_crcy_cd: "USD",
                ovrs_excg_cd: "NASD",
                frcr_pchs_amt1: "540",
                pchs_avg_pric: "180"
              }
            ],
            output2: [{ tot_evlu_pfls_amt: "60" }],
            ctx_area_fk200: "",
            ctx_area_nk200: ""
          }),
          { headers: { tr_cont: "" }, status: 200 }
        );
      }

      return new Response(JSON.stringify({ rt_cd: "1", msg1: "unexpected" }), {
        status: 404
      });
    }
  ) as unknown as typeof fetch;
  return calls;
}

function headersOf(call: KisFetchCall | undefined) {
  return call?.init?.headers as Record<string, string> | undefined;
}

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
  restoreKisEnv();
});

describe("kis broker readonly integration", () => {
  it("서버관리형 KIS 연결은 토큰 암호문을 브라우저 상태에 저장하지 않는다", () => {
    const result = connectServerManagedBroker(createDefaultState(), {
      accountAlias: "한국투자 종합계좌",
      consentAccepted: true,
      connectionResult: {
        providerName: KIS_BROKER_PROVIDER_NAME,
        brokerName: "한국투자증권",
        accountIdentifierMasked: "KIS-******78-01",
        scopes: ["read_holdings", "read_cash"],
        connectedAt: "2026-06-02T00:00:00.000Z"
      }
    });
    const stored = result.state.externalConnections[0];

    expect(stored.providerName).toBe(KIS_BROKER_PROVIDER_NAME);
    expect(stored.encryptedAccessToken).toBeUndefined();
    expect(stored.tokenPreview).toBe("server-managed");
    expect("encryptedAccessToken" in result.connection).toBe(false);
  });

  it("KIS 잔고 조회 결과를 기존 증권사 동기화 미리보기로 변환한다", () => {
    const connected = connectServerManagedBroker(createDefaultState(), {
      accountAlias: "한국투자 종합계좌",
      consentAccepted: true,
      connectionResult: {
        providerName: KIS_BROKER_PROVIDER_NAME,
        brokerName: "한국투자증권",
        accountIdentifierMasked: "KIS-******78-01",
        scopes: ["read_holdings", "read_cash"],
        connectedAt: "2026-06-02T00:00:00.000Z"
      }
    });
    const connectionId = connected.state.externalConnections[0].id;
    const result = createBrokerSyncPreviewFromResult(
      connected.state,
      connectionId,
      {
        fetchedAt: "2026-06-02T00:00:00.000Z",
        holdings: [
          {
            externalAssetId: "kis-domestic-005930",
            assetName: "삼성전자",
            ticker: "005930",
            market: "KRX",
            currency: "KRW",
            quantity: 10,
            currentPrice: 75000,
            valuationAmount: 750000,
            exchangeRate: 1,
            purchaseAmount: 700000,
            purchaseUnitPrice: 70000,
            brokerProductType: "국내주식",
            rawAssetType: "domestic_stock",
            accountAlias: "한국투자 종합계좌",
            accountType: "general",
            rawData: { pdno: "005930" }
          }
        ],
        cashBalances: [
          {
            externalAssetId: "kis-krw-cash",
            assetName: "한국투자 원화 예수금",
            currency: "KRW",
            amount: 100000,
            exchangeRate: 1,
            accountAlias: "한국투자 종합계좌",
            rawData: { dnca_tot_amt: "100000" }
          }
        ],
        warnings: []
      }
    );

    expect(result.preview.rows).toHaveLength(2);
    expect(result.preview.rows[0].assetInput.brokerName).toBe("한국투자증권");
    expect(result.preview.rows[0].assetInput.valuationAmount).toBe(750000);
    expect(result.state.assets).toHaveLength(0);
  });

  it("KIS provider는 토큰과 국내주식 잔고 조회 endpoint만 호출한다", async () => {
    configureKisEnv("unit-app-key-domestic");
    const calls = mockKisFetch();

    const result = await new KoreaInvestmentBrokerProvider({
      accountAlias: "화면 계좌"
    }).sync("conn_1");

    expect(result.holdings).toHaveLength(1);
    expect(result.holdings[0]).toMatchObject({
      externalAssetId: "kis-domestic-005930",
      accountAlias: "화면 계좌",
      assetName: "삼성전자",
      ticker: "005930",
      valuationAmount: 150000
    });
    expect(result.cashBalances[0]).toMatchObject({
      externalAssetId: "kis-krw-cash",
      accountAlias: "화면 계좌",
      amount: 12345
    });

    const tokenCall = calls.find((call) => call.url.endsWith("/oauth2/tokenP"));
    const domesticCall = calls.find((call) =>
      call.url.includes("/uapi/domestic-stock/v1/trading/inquire-balance")
    );
    expect(tokenCall?.init?.method).toBe("POST");
    expect(domesticCall?.url).toContain("CANO=12345678");
    expect(domesticCall?.url).toContain("ACNT_PRDT_CD=01");
    expect(headersOf(domesticCall)?.tr_id).toBe("TTTC8434R");
    expect(headersOf(domesticCall)?.authorization).toBe("Bearer unit-token");
    expect(
      calls.some((call) =>
        call.url.includes("/uapi/overseas-stock/v1/trading/inquire-balance")
      )
    ).toBe(false);
    expect(calls.some((call) => call.url.includes("order-cash"))).toBe(false);
  });

  it("KIS 해외주식 잔고 조회는 명시적으로 켠 경우에만 실행한다", async () => {
    configureKisEnv("unit-app-key-overseas");
    process.env.KIS_SYNC_OVERSEAS = "true";
    process.env.KIS_DEFAULT_USD_KRW_RATE = "1350";
    const calls = mockKisFetch();

    const result = await new KoreaInvestmentBrokerProvider().sync("conn_1");

    expect(result.holdings).toHaveLength(2);
    expect(result.holdings[1]).toMatchObject({
      externalAssetId: "kis-overseas-USD-AAPL",
      ticker: "AAPL",
      market: "NASDAQ",
      currency: "USD",
      exchangeRate: 1350,
      valuationAmount: 600
    });

    const overseasCall = calls.find((call) =>
      call.url.includes("/uapi/overseas-stock/v1/trading/inquire-balance")
    );
    expect(overseasCall?.url).toContain("OVRS_EXCG_CD=NASD");
    expect(overseasCall?.url).toContain("TR_CRCY_CD=USD");
    expect(headersOf(overseasCall)?.tr_id).toBe("TTTS3012R");
  });

  it("KIS 서버 route는 기본값에서 localhost 요청만 허용한다", () => {
    delete process.env.KIS_ALLOW_NON_LOCAL_SERVER_ROUTES;

    const local = validateKisServerRouteRequest(
      new Request("http://localhost:3000/api/broker/kis/sync", {
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000"
        },
        method: "POST"
      })
    );
    const remote = validateKisServerRouteRequest(
      new Request("https://example.com/api/broker/kis/sync", {
        headers: {
          host: "example.com",
          origin: "https://example.com"
        },
        method: "POST"
      })
    );
    const forwardedRemote = validateKisServerRouteRequest(
      new Request("http://localhost:3000/api/broker/kis/sync", {
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
          "x-forwarded-for": "203.0.113.10"
        },
        method: "POST"
      })
    );

    expect(local.allowed).toBe(true);
    expect(remote.allowed).toBe(false);
    expect(remote.status).toBe(403);
    expect(forwardedRemote.allowed).toBe(false);
  });
});
