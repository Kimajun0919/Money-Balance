import { afterEach, describe, expect, it, vi } from "vitest";
import { KoreaInvestmentBrokerProvider } from "@/lib/providers/broker/kis-broker-provider";

const originalFetch = globalThis.fetch;
const kisEnvKeys = [
  "KIS_ENV",
  "KIS_APP_KEY",
  "KIS_APP_SECRET",
  "KIS_PAPER_APP_KEY",
  "KIS_PAPER_APP_SECRET",
  "KIS_ACCOUNT_NUMBER",
  "KIS_ACCOUNT_PRODUCT_CODE",
  "KIS_ENABLE_ORDER_API",
  "KIS_ENABLE_REAL_ORDER_API",
  "KIS_ENABLE_SELL_ORDER_API",
  "KIS_ORDER_CONFIRMATION_TEXT",
  "KIS_ORDER_USD_KRW_RATE",
  "KIS_DEFAULT_USD_KRW_RATE",
  "KIS_DOMESTIC_ORDER_EXCHANGE"
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

function configureOrderEnv(appKey: string) {
  process.env.KIS_ENV = "demo";
  process.env.KIS_APP_KEY = appKey;
  process.env.KIS_APP_SECRET = "unit-secret";
  process.env.KIS_PAPER_APP_KEY = appKey;
  process.env.KIS_PAPER_APP_SECRET = "unit-paper-secret";
  process.env.KIS_ACCOUNT_NUMBER = "12345678";
  process.env.KIS_ACCOUNT_PRODUCT_CODE = "01";
  process.env.KIS_ENABLE_ORDER_API = "true";
  process.env.KIS_ORDER_CONFIRMATION_TEXT = "KIS_REAL_ORDER_EXECUTE";
  delete process.env.KIS_ENABLE_REAL_ORDER_API;
  delete process.env.KIS_ENABLE_SELL_ORDER_API;
  delete process.env.KIS_DOMESTIC_ORDER_EXCHANGE;
  delete process.env.KIS_ORDER_USD_KRW_RATE;
  delete process.env.KIS_DEFAULT_USD_KRW_RATE;
}

function mockKisOrderFetch() {
  const calls: KisFetchCall[] = [];
  globalThis.fetch = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof URL ? input.toString() : String(input);
      calls.push({ url, init });

      if (url.endsWith("/oauth2/tokenP")) {
        return new Response(
          JSON.stringify({
            access_token: "unit-order-token",
            expires_in: "86400"
          }),
          { status: 200 }
        );
      }

      if (url.includes("/uapi/domestic-stock/v1/trading/order-cash")) {
        return new Response(
          JSON.stringify({
            rt_cd: "0",
            output: {
              KRX_FWDG_ORD_ORGNO: "001",
              ODNO: "1234567890",
              ORD_TMD: "101500"
            }
          }),
          { status: 200 }
        );
      }

      if (url.includes("/uapi/overseas-stock/v1/trading/order")) {
        return new Response(
          JSON.stringify({
            rt_cd: "0",
            output: {
              ODNO: "OVRS12345",
              ORD_TMD: "231500"
            }
          }),
          { status: 200 }
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

function bodyOf(call: KisFetchCall | undefined) {
  return JSON.parse(String(call?.init?.body ?? "{}")) as Record<string, string>;
}

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
  restoreKisEnv();
});

describe("kis broker order integration", () => {
  it("KIS 주문 API는 env opt-in 없이는 호출되지 않는다", async () => {
    configureOrderEnv("unit-order-disabled");
    delete process.env.KIS_ENABLE_ORDER_API;
    const calls = mockKisOrderFetch();

    await expect(
      new KoreaInvestmentBrokerProvider().submitOrder({
        ticker: "005930",
        market: "KRX",
        currency: "KRW",
        side: "buy",
        orderType: "limit",
        amountKrw: 150000,
        limitPrice: 75000,
        userConfirmedOrder: true,
        confirmationText: "KIS_REAL_ORDER_EXECUTE"
      })
    ).rejects.toThrow("KIS 주문 API가 비활성화");

    expect(calls).toHaveLength(0);
  });

  it("국내주식 지정가 매수 주문을 KIS 현금주문 endpoint로 전송한다", async () => {
    configureOrderEnv("unit-order-domestic-buy");
    const calls = mockKisOrderFetch();

    const result = await new KoreaInvestmentBrokerProvider().submitOrder({
      proposalId: "order_1",
      ticker: "005930",
      market: "KRX",
      currency: "KRW",
      side: "buy",
      orderType: "limit",
      amountKrw: 150000,
      limitPrice: 75000,
      userConfirmedOrder: true,
      confirmationText: "KIS_REAL_ORDER_EXECUTE"
    });

    const orderCall = calls.find((call) =>
      call.url.includes("/uapi/domestic-stock/v1/trading/order-cash")
    );
    const body = bodyOf(orderCall);

    expect(result).toMatchObject({
      proposalId: "order_1",
      orderId: "1234567890",
      trId: "VTTC0012U",
      ticker: "005930",
      side: "buy",
      quantity: 2,
      orderPrice: 75000
    });
    expect(headersOf(orderCall)?.tr_id).toBe("VTTC0012U");
    expect(headersOf(orderCall)?.authorization).toBe("Bearer unit-order-token");
    expect(body).toMatchObject({
      CANO: "12345678",
      ACNT_PRDT_CD: "01",
      PDNO: "005930",
      ORD_DVSN: "00",
      ORD_QTY: "2",
      ORD_UNPR: "75000",
      EXCG_ID_DVSN_CD: "KRX"
    });
  });

  it("매도 주문은 별도 env opt-in 후에만 전송한다", async () => {
    configureOrderEnv("unit-order-domestic-sell");
    const blockedCalls = mockKisOrderFetch();

    await expect(
      new KoreaInvestmentBrokerProvider().submitOrder({
        ticker: "005930",
        market: "KRX",
        currency: "KRW",
        side: "sell",
        orderType: "limit",
        quantity: 1,
        limitPrice: 75000,
        userConfirmedOrder: true,
        confirmationText: "KIS_REAL_ORDER_EXECUTE"
      })
    ).rejects.toThrow("KIS 매도 주문 API가 비활성화");
    expect(blockedCalls).toHaveLength(0);

    process.env.KIS_ENABLE_SELL_ORDER_API = "true";
    const calls = mockKisOrderFetch();
    const result = await new KoreaInvestmentBrokerProvider().submitOrder({
      ticker: "005930",
      market: "KRX",
      currency: "KRW",
      side: "sell",
      orderType: "limit",
      quantity: 1,
      limitPrice: 75000,
      userConfirmedOrder: true,
      confirmationText: "KIS_REAL_ORDER_EXECUTE"
    });
    const orderCall = calls.find((call) =>
      call.url.includes("/uapi/domestic-stock/v1/trading/order-cash")
    );

    expect(result.trId).toBe("VTTC0011U");
    expect(headersOf(orderCall)?.tr_id).toBe("VTTC0011U");
    expect(bodyOf(orderCall)).toMatchObject({
      ORD_QTY: "1",
      SLL_TYPE: "01"
    });
  });

  it("해외주식 지정가 매수 주문은 거래소별 TR ID와 환율 기반 수량을 사용한다", async () => {
    configureOrderEnv("unit-order-overseas-buy");
    process.env.KIS_DEFAULT_USD_KRW_RATE = "1350";
    const calls = mockKisOrderFetch();

    const result = await new KoreaInvestmentBrokerProvider().submitOrder({
      ticker: "AAPL",
      market: "NASDAQ",
      currency: "USD",
      side: "buy",
      orderType: "limit",
      amountKrw: 540000,
      limitPrice: 200,
      userConfirmedOrder: true,
      confirmationText: "KIS_REAL_ORDER_EXECUTE"
    });

    const orderCall = calls.find((call) =>
      call.url.includes("/uapi/overseas-stock/v1/trading/order")
    );

    expect(result).toMatchObject({
      orderId: "OVRS12345",
      trId: "VTTT1002U",
      market: "NASD",
      ticker: "AAPL",
      quantity: 2,
      orderPrice: 200
    });
    expect(headersOf(orderCall)?.tr_id).toBe("VTTT1002U");
    expect(bodyOf(orderCall)).toMatchObject({
      OVRS_EXCG_CD: "NASD",
      PDNO: "AAPL",
      ORD_QTY: "2",
      OVRS_ORD_UNPR: "200",
      ORD_SVR_DVSN_CD: "0",
      ORD_DVSN: "00"
    });
  });
});
