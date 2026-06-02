import type {
  BrokerCashBalance,
  BrokerConnectionRequest,
  BrokerConnectionResult,
  BrokerHolding,
  BrokerProvider,
  BrokerSyncResult
} from "@/lib/providers/broker/broker-provider";
import {
  KIS_BROKER_NAME,
  KIS_BROKER_PROVIDER_NAME
} from "@/lib/providers/broker/broker-provider-constants";

type KisEnv = "real" | "demo";

interface KisConfig {
  env: KisEnv;
  baseUrl: string;
  appKey: string;
  appSecret: string;
  accountNumber: string;
  accountProductCode: string;
  accountAlias?: string;
  userAgent: string;
  syncOverseas: boolean;
  overseasExchanges: string[];
  overseasCurrencies: string[];
  defaultExchangeRates: Record<string, number>;
}

interface KisConfigOverrides {
  accountAlias?: string;
}

export interface KoreaInvestmentBrokerProviderOptions {
  accountAlias?: string;
}

interface KisTokenCache {
  cacheKey: string;
  token: string;
  expiresAtMs: number;
}

interface KisFetchResult {
  body: Record<string, unknown>;
  trCont: string;
}

interface KisBalancePayload {
  output1: Record<string, unknown>[];
  output2: Record<string, unknown>[];
}

let tokenCache: KisTokenCache | null = null;

function envValue(name: string) {
  return process.env[name]?.trim() ?? "";
}

function parseBoolean(value: string, fallback = false) {
  if (!value) return fallback;
  return ["1", "true", "yes", "y"].includes(value.toLowerCase());
}

function parseCsv(value: string, fallback: string[]) {
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

function parseAccount(rawAccount: string, explicitProductCode: string) {
  const digits = rawAccount.replace(/\D/g, "");
  const accountNumber = digits.slice(0, 8);
  const productCode = explicitProductCode || digits.slice(8, 10) || "01";

  return { accountNumber, productCode };
}

function optionalString(value?: string) {
  return value?.trim() || undefined;
}

function loadKisConfig(overrides: KisConfigOverrides = {}): KisConfig {
  const env: KisEnv = envValue("KIS_ENV") === "demo" ? "demo" : "real";
  const appKey =
    env === "demo"
      ? envValue("KIS_PAPER_APP_KEY") || envValue("KIS_APP_KEY")
      : envValue("KIS_APP_KEY");
  const appSecret =
    env === "demo"
      ? envValue("KIS_PAPER_APP_SECRET") || envValue("KIS_APP_SECRET")
      : envValue("KIS_APP_SECRET");
  const { accountNumber, productCode } = parseAccount(
    envValue("KIS_ACCOUNT_NUMBER"),
    envValue("KIS_ACCOUNT_PRODUCT_CODE")
  );

  const baseUrl =
    envValue("KIS_BASE_URL") ||
    (env === "demo"
      ? "https://openapivts.koreainvestment.com:29443"
      : "https://openapi.koreainvestment.com:9443");

  const missing = [
    ["KIS_APP_KEY", appKey],
    ["KIS_APP_SECRET", appSecret],
    ["KIS_ACCOUNT_NUMBER", accountNumber],
    ["KIS_ACCOUNT_PRODUCT_CODE", productCode]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `한국투자증권 API 설정이 부족합니다: ${missing.join(", ")}`
    );
  }

  return {
    env,
    baseUrl,
    appKey,
    appSecret,
    accountNumber,
    accountProductCode: productCode,
    accountAlias:
      optionalString(overrides.accountAlias) ??
      optionalString(envValue("KIS_ACCOUNT_ALIAS")),
    userAgent: envValue("KIS_USER_AGENT") || "YieldBalance/0.1",
    syncOverseas: parseBoolean(envValue("KIS_SYNC_OVERSEAS"), false),
    overseasExchanges: parseCsv(envValue("KIS_OVERSEAS_EXCHANGES"), ["NASD"]),
    overseasCurrencies: parseCsv(envValue("KIS_OVERSEAS_CURRENCIES"), ["USD"]),
    defaultExchangeRates: {
      USD: toNumber(envValue("KIS_DEFAULT_USD_KRW_RATE")) ?? 0,
      HKD: toNumber(envValue("KIS_DEFAULT_HKD_KRW_RATE")) ?? 0,
      CNY: toNumber(envValue("KIS_DEFAULT_CNY_KRW_RATE")) ?? 0,
      JPY: toNumber(envValue("KIS_DEFAULT_JPY_KRW_RATE")) ?? 0,
      VND: toNumber(envValue("KIS_DEFAULT_VND_KRW_RATE")) ?? 0
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRecordArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  if (isRecord(value) && Object.keys(value).length > 0) {
    return [value];
  }
  return [];
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number") return String(value);
  return undefined;
}

function firstString(
  row: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = toStringValue(row[key]);
    if (value) return value;
  }
  return undefined;
}

function firstNumber(
  row: Record<string, unknown>,
  keys: string[]
): number | undefined {
  for (const key of keys) {
    const value = toNumber(row[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function parseExpiryMs(value: unknown) {
  const fallback = Date.now() + 23 * 60 * 60 * 1000;
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(" ", "T");
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseTokenExpiryMs(body: Record<string, unknown>) {
  const expiresIn = toNumber(body.expires_in);
  if (expiresIn && expiresIn > 0) {
    return Date.now() + expiresIn * 1000;
  }
  return parseExpiryMs(body.access_token_token_expired);
}

function maskAccount(accountNumber: string, productCode: string) {
  const suffix = accountNumber.slice(-2);
  return `KIS-******${suffix}-${productCode}`;
}

function normalizeOverseasMarket(exchangeCode?: string) {
  const code = exchangeCode?.toUpperCase();
  if (code === "NAS" || code === "NASD") return "NASDAQ";
  if (code === "NYS") return "NYSE";
  return code;
}

function exchangeRateFor(
  config: KisConfig,
  currency: string,
  row: Record<string, unknown>
) {
  if (currency === "KRW") return 1;
  return (
    firstNumber(row, ["bass_exrt", "frst_bltn_exrt", "aply_exrt"]) ??
    config.defaultExchangeRates[currency]
  );
}

function hasPositivePosition(quantity?: number, valuationAmount?: number) {
  return (quantity ?? 0) > 0 || (valuationAmount ?? 0) > 0;
}

function domesticRowToHolding(
  row: Record<string, unknown>,
  config: KisConfig
): BrokerHolding | null {
  const ticker = firstString(row, ["pdno"]);
  const quantity = firstNumber(row, ["hldg_qty"]);
  const valuationAmount = firstNumber(row, ["evlu_amt"]);

  if (!ticker || !hasPositivePosition(quantity, valuationAmount)) {
    return null;
  }

  return {
    externalAssetId: `kis-domestic-${ticker}`,
    assetName: firstString(row, ["prdt_name"]) ?? ticker,
    ticker,
    market: "KRX",
    currency: "KRW",
    quantity,
    currentPrice: firstNumber(row, ["prpr"]),
    valuationAmount,
    exchangeRate: 1,
    purchaseAmount: firstNumber(row, ["pchs_amt"]),
    purchaseUnitPrice: firstNumber(row, ["pchs_avg_pric"]),
    brokerProductType: firstString(row, ["trad_dvsn_name"]) ?? "국내주식",
    rawAssetType: "domestic_stock",
    accountAlias: config.accountAlias,
    accountType: "general",
    rawData: row
  };
}

function overseasRowToHolding(
  row: Record<string, unknown>,
  config: KisConfig
): BrokerHolding | null {
  const ticker = firstString(row, ["ovrs_pdno", "pdno"]);
  const quantity = firstNumber(row, ["ovrs_cblc_qty", "hldg_qty"]);
  const valuationAmount = firstNumber(row, [
    "ovrs_stck_evlu_amt",
    "frcr_evlu_amt",
    "evlu_amt"
  ]);
  const currency =
    firstString(row, ["tr_crcy_cd", "crcy_cd"])?.toUpperCase() ?? "USD";

  if (!ticker || !hasPositivePosition(quantity, valuationAmount)) {
    return null;
  }

  return {
    externalAssetId: `kis-overseas-${currency}-${ticker}`,
    assetName:
      firstString(row, ["ovrs_item_name", "prdt_name", "itms_name"]) ?? ticker,
    ticker,
    market: normalizeOverseasMarket(
      firstString(row, ["ovrs_excg_cd", "excg_cd"])
    ),
    currency,
    quantity,
    currentPrice: firstNumber(row, ["now_pric2", "ovrs_now_pric", "prpr"]),
    valuationAmount,
    exchangeRate: exchangeRateFor(config, currency, row),
    purchaseAmount: firstNumber(row, ["frcr_pchs_amt1", "pchs_amt"]),
    purchaseUnitPrice: firstNumber(row, ["pchs_avg_pric"]),
    brokerProductType: "해외주식",
    rawAssetType: "overseas_stock",
    accountAlias: config.accountAlias,
    accountType: "general",
    rawData: row
  };
}

function domesticSummaryToCash(
  row: Record<string, unknown> | undefined,
  config: KisConfig
): BrokerCashBalance[] {
  if (!row) return [];
  const amount = firstNumber(row, ["dnca_tot_amt", "nxdy_excc_amt"]);
  if (!amount || amount <= 0) return [];

  return [
    {
      externalAssetId: "kis-krw-cash",
      assetName: "한국투자 원화 예수금",
      currency: "KRW",
      amount,
      exchangeRate: 1,
      accountAlias: config.accountAlias,
      rawData: row
    }
  ];
}

function getCacheKey(config: KisConfig) {
  return [
    config.env,
    config.baseUrl,
    config.appKey,
    config.accountNumber,
    config.accountProductCode
  ].join(":");
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`KIS API 응답을 JSON으로 해석할 수 없습니다: ${text}`);
  }
}

export class KoreaInvestmentBrokerProvider implements BrokerProvider {
  readonly providerName = KIS_BROKER_PROVIDER_NAME;
  readonly brokerName = KIS_BROKER_NAME;
  readonly readOnlyScopes = ["read_holdings", "read_cash"];

  constructor(
    private readonly options: KoreaInvestmentBrokerProviderOptions = {}
  ) {}

  async connect(
    input: BrokerConnectionRequest
  ): Promise<BrokerConnectionResult> {
    if (!input.consentAccepted) {
      throw new Error("읽기 전용 연동 동의가 필요합니다.");
    }

    const config = loadKisConfig(this.options);
    await this.getAccessToken(config);

    return {
      providerName: this.providerName,
      brokerName: this.brokerName,
      accountIdentifierMasked: maskAccount(
        config.accountNumber,
        config.accountProductCode
      ),
      scopes: this.readOnlyScopes,
      connectedAt: new Date().toISOString()
    };
  }

  async fetchHoldings(_connectionId: string): Promise<BrokerHolding[]> {
    const config = loadKisConfig(this.options);
    const domestic = await this.fetchDomesticBalance(config);
    const overseas = config.syncOverseas
      ? await this.fetchOverseasBalances(config)
      : [];

    return [
      ...domestic.output1
        .map((row) => domesticRowToHolding(row, config))
        .filter((holding): holding is BrokerHolding => Boolean(holding)),
      ...overseas
        .flatMap((payload) => [...payload.output1, ...payload.output2])
        .map((row) => overseasRowToHolding(row, config))
        .filter((holding): holding is BrokerHolding => Boolean(holding))
    ];
  }

  async fetchCashBalances(_connectionId: string): Promise<BrokerCashBalance[]> {
    const config = loadKisConfig(this.options);
    const domestic = await this.fetchDomesticBalance(config);
    return domesticSummaryToCash(domestic.output2[0], config);
  }

  async sync(connectionId: string): Promise<BrokerSyncResult> {
    const config = loadKisConfig(this.options);
    const domestic = await this.fetchDomesticBalance(config);
    const overseas = config.syncOverseas
      ? await this.fetchOverseasBalances(config)
      : [];

    const holdings = [
      ...domestic.output1
        .map((row) => domesticRowToHolding(row, config))
        .filter((holding): holding is BrokerHolding => Boolean(holding)),
      ...overseas
        .flatMap((payload) => [...payload.output1, ...payload.output2])
        .map((row) => overseasRowToHolding(row, config))
        .filter((holding): holding is BrokerHolding => Boolean(holding))
    ];

    const cashBalances = domesticSummaryToCash(domestic.output2[0], config);
    const warnings = config.syncOverseas
      ? []
      : ["해외주식 잔고 조회는 KIS_SYNC_OVERSEAS=true 설정 후 실행됩니다."];

    return {
      fetchedAt: new Date().toISOString(),
      holdings,
      cashBalances,
      warnings: connectionId ? warnings : warnings
    };
  }

  async disconnect(_connectionId: string): Promise<void> {
    return undefined;
  }

  private async getAccessToken(config: KisConfig) {
    const cacheKey = getCacheKey(config);
    const now = Date.now();
    if (
      tokenCache?.cacheKey === cacheKey &&
      tokenCache.expiresAtMs - now > 5 * 60 * 1000
    ) {
      return tokenCache.token;
    }

    const response = await fetch(`${config.baseUrl}/oauth2/tokenP`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/plain",
        charset: "UTF-8",
        "User-Agent": config.userAgent
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: config.appKey,
        appsecret: config.appSecret
      })
    });
    const body = await parseJsonResponse(response);
    if (!response.ok || !body.access_token) {
      throw new Error(
        `한국투자증권 접근토큰 발급에 실패했습니다: ${
          toStringValue(body.msg1) ?? response.status
        }`
      );
    }

    tokenCache = {
      cacheKey,
      token: String(body.access_token),
      expiresAtMs: parseTokenExpiryMs(body)
    };

    return tokenCache.token;
  }

  private async fetchKisJson(
    config: KisConfig,
    apiUrl: string,
    trId: string,
    params: Record<string, string>,
    trCont = ""
  ): Promise<KisFetchResult> {
    const token = await this.getAccessToken(config);
    const url = new URL(`${config.baseUrl}${apiUrl}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/plain",
        charset: "UTF-8",
        "User-Agent": config.userAgent,
        authorization: `Bearer ${token}`,
        appkey: config.appKey,
        appsecret: config.appSecret,
        tr_id: trId,
        custtype: "P",
        tr_cont: trCont
      }
    });
    const body = await parseJsonResponse(response);

    if (!response.ok || body.rt_cd !== "0") {
      throw new Error(
        `한국투자증권 API 호출 실패(${trId}): ${
          toStringValue(body.msg1) ?? response.status
        }`
      );
    }

    return {
      body,
      trCont: (response.headers.get("tr_cont") ?? "").trim()
    };
  }

  private async fetchDomesticBalance(config: KisConfig) {
    const output1: Record<string, unknown>[] = [];
    const output2: Record<string, unknown>[] = [];
    let fk100 = "";
    let nk100 = "";
    let trCont = "";
    const trId = config.env === "demo" ? "VTTC8434R" : "TTTC8434R";

    for (let page = 0; page < 10; page += 1) {
      const result = await this.fetchKisJson(
        config,
        "/uapi/domestic-stock/v1/trading/inquire-balance",
        trId,
        {
          CANO: config.accountNumber,
          ACNT_PRDT_CD: config.accountProductCode,
          AFHR_FLPR_YN: "N",
          OFL_YN: "",
          INQR_DVSN: "01",
          UNPR_DVSN: "01",
          FUND_STTL_ICLD_YN: "N",
          FNCG_AMT_AUTO_RDPT_YN: "N",
          PRCS_DVSN: "00",
          CTX_AREA_FK100: fk100,
          CTX_AREA_NK100: nk100
        },
        trCont
      );

      output1.push(...toRecordArray(result.body.output1));
      output2.push(...toRecordArray(result.body.output2));
      fk100 = toStringValue(result.body.ctx_area_fk100) ?? "";
      nk100 = toStringValue(result.body.ctx_area_nk100) ?? "";
      if (!["M", "F"].includes(result.trCont)) break;
      trCont = "N";
    }

    return { output1, output2 };
  }

  private async fetchOverseasBalances(config: KisConfig) {
    const trId = config.env === "demo" ? "VTTS3012R" : "TTTS3012R";
    const payloads: KisBalancePayload[] = [];

    for (const exchange of config.overseasExchanges) {
      for (const currency of config.overseasCurrencies) {
        const output1: Record<string, unknown>[] = [];
        const output2: Record<string, unknown>[] = [];
        let fk200 = "";
        let nk200 = "";
        let trCont = "";

        for (let page = 0; page < 10; page += 1) {
          const result = await this.fetchKisJson(
            config,
            "/uapi/overseas-stock/v1/trading/inquire-balance",
            trId,
            {
              CANO: config.accountNumber,
              ACNT_PRDT_CD: config.accountProductCode,
              OVRS_EXCG_CD: exchange,
              TR_CRCY_CD: currency,
              CTX_AREA_FK200: fk200,
              CTX_AREA_NK200: nk200
            },
            trCont
          );

          output1.push(...toRecordArray(result.body.output1));
          output2.push(...toRecordArray(result.body.output2));
          fk200 = toStringValue(result.body.ctx_area_fk200) ?? "";
          nk200 = toStringValue(result.body.ctx_area_nk200) ?? "";
          if (!["M", "F"].includes(result.trCont)) break;
          trCont = "N";
        }

        payloads.push({ output1, output2 });
      }
    }

    return payloads;
  }
}
