import { getDefaultTaxRate } from "@/lib/constants/tax-rates";
import { calculateRiskScoreLimit } from "@/lib/engines/risk-score-engine";
import type {
  AppState,
  Asset,
  InvestorProfile,
  PrivateTradingFlags,
  PrivateTradingRiskLimits,
  ProductUniverseItem,
  RebalancingPolicy,
  RebalancingRule,
  UserNotificationSettings,
  UserProfile
} from "@/lib/types";
import { createAssetFromInput } from "@/lib/utils/asset-factory";

export const DEFAULT_PROFILE: UserProfile = {
  name: "게스트",
  email: "guest@example.com",
  targetReturn: 0.1,
  riskTolerance: "moderate",
  lossTolerance: -0.1,
  riskScoreLimit: calculateRiskScoreLimit(-0.1),
  minCashRatio: 0.05,
  monthlyInvestment: 1_000_000,
  investmentHorizon: "three_to_five",
  defaultAccountType: "general"
};

export function createDefaultNotificationSettings(): UserNotificationSettings {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    inAppEnabled: true,
    emailEnabled: false,
    monthlyUpdateEnabled: true,
    monthlyReportEnabled: true,
    riskWarningEnabled: true,
    targetGapWarningEnabled: true,
    illusionWarningEnabled: true,
    updateDayOfMonth: 1,
    createdAt: now,
    updatedAt: now
  };
}

export function createDefaultPrivateTradingFlags(): PrivateTradingFlags {
  const now = new Date().toISOString();

  return {
    privateUseMode: true,
    publicReleaseMode: false,
    recommendationsEnabled: true,
    paperTradingEnabled: true,
    brokerSandboxEnabled: true,
    liveTradingEnabled: false,
    autoTradingEnabled: false,
    rebalancingEnabled: true,
    autoRebalancingEnabled: false,
    paperRebalancingEnabled: true,
    sandboxRebalancingEnabled: true,
    liveRebalancingEnabled: false,
    brokerOrderApiConfigured: false,
    brokerConnectionActive: false,
    userTradingConsentAccepted: false,
    userAutoTradingConsentAccepted: false,
    userRebalancingConsentAccepted: false,
    userAutoRebalancingConsentAccepted: false,
    riskProfileCompleted: false,
    principalLossAcknowledged: false,
    autoTradingRiskAcknowledged: false,
    autoRebalancingRiskAcknowledged: false,
    killSwitchActive: false,
    updatedAt: now
  };
}

export function createDefaultPrivateTradingRiskLimits(): PrivateTradingRiskLimits {
  const now = new Date().toISOString();

  return {
    maxOrderAmountKrw: 1_000_000,
    maxDailyOrderAmountKrw: 3_000_000,
    maxMonthlyOrderAmountKrw: 10_000_000,
    maxOrdersPerDay: 5,
    minimumCashRatioAfterTrade: 0.05,
    maxRiskScoreAfterTrade: 80,
    staleDataMaxHours: 24,
    allowedInstrumentKinds: ["stock", "etf", "fund", "bond", "cash"],
    blockedInstrumentKinds: [
      "crypto",
      "derivative",
      "option",
      "future",
      "leveraged_etf",
      "illiquid_asset"
    ],
    blockedTickers: [],
    createdAt: now,
    updatedAt: now
  };
}

export function createDefaultInvestorProfile(): InvestorProfile {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    riskProfileCompleted: false,
    experienceLevel: "intermediate",
    investmentObjective: "balanced",
    maxLossTolerance: 0.1,
    liquidityNeedMonths: 6,
    preferredAssetTypes: ["cash", "govt_bond", "dividend", "growth"],
    allowedMarkets: ["KRX", "NYSE", "NASDAQ"],
    updatedAt: now
  };
}

export function createDefaultProductUniverse(): ProductUniverseItem[] {
  const now = new Date().toISOString();

  return [
    {
      id: "instrument_krw_cash",
      instrumentName: "원화 현금 대기",
      ticker: "KRW-CASH",
      market: "KRW",
      currency: "KRW",
      instrumentKind: "cash",
      assetType: "cash",
      expectedReturn: 0.028,
      incomeYield: 0.028,
      riskScore: 5,
      riskLevel: "low",
      liquidityLevel: "high",
      liquidityScore: 0,
      lastPrice: 1,
      lastPriceUpdatedAt: now,
      isActive: true,
      isTradable: true,
      isAutoTradingAllowed: false,
      notes: "현금성 비중 보정용 대기 항목",
      createdAt: now,
      updatedAt: now
    },
    {
      id: "instrument_spy",
      instrumentName: "SPDR S&P 500 ETF",
      ticker: "SPY",
      market: "NYSE",
      currency: "USD",
      instrumentKind: "etf",
      assetType: "growth",
      expectedReturn: 0.08,
      incomeYield: 0.012,
      riskScore: 72,
      riskLevel: "very_high",
      liquidityLevel: "high",
      liquidityScore: 15,
      lastPrice: 520,
      lastPriceUpdatedAt: now,
      isActive: true,
      isTradable: true,
      isAutoTradingAllowed: false,
      notes: "성장 자산군 대표 ETF 예시",
      createdAt: now,
      updatedAt: now
    },
    {
      id: "instrument_schd",
      instrumentName: "Schwab US Dividend Equity ETF",
      ticker: "SCHD",
      market: "NYSE",
      currency: "USD",
      instrumentKind: "etf",
      assetType: "dividend",
      expectedReturn: 0.065,
      incomeYield: 0.035,
      riskScore: 58,
      riskLevel: "high",
      liquidityLevel: "high",
      liquidityScore: 20,
      lastPrice: 80,
      lastPriceUpdatedAt: now,
      isActive: true,
      isTradable: true,
      isAutoTradingAllowed: false,
      notes: "배당 자산군 대표 ETF 예시",
      createdAt: now,
      updatedAt: now
    },
    {
      id: "instrument_tlt",
      instrumentName: "iShares 20+ Year Treasury Bond ETF",
      ticker: "TLT",
      market: "NASDAQ",
      currency: "USD",
      instrumentKind: "etf",
      assetType: "govt_bond",
      expectedReturn: 0.045,
      incomeYield: 0.038,
      riskScore: 45,
      riskLevel: "medium",
      liquidityLevel: "high",
      liquidityScore: 20,
      lastPrice: 92,
      lastPriceUpdatedAt: now,
      isActive: true,
      isTradable: true,
      isAutoTradingAllowed: false,
      notes: "국공채 자산군 대표 ETF 예시",
      createdAt: now,
      updatedAt: now
    },
    {
      id: "instrument_jepi",
      instrumentName: "JPMorgan Equity Premium Income ETF",
      ticker: "JEPI",
      market: "NYSE",
      currency: "USD",
      instrumentKind: "etf",
      assetType: "covered_call",
      expectedReturn: 0.07,
      incomeYield: 0.075,
      riskScore: 68,
      riskLevel: "high",
      liquidityLevel: "medium",
      liquidityScore: 35,
      lastPrice: 57,
      lastPriceUpdatedAt: now,
      isActive: true,
      isTradable: true,
      isAutoTradingAllowed: false,
      notes: "커버드콜 자산군 대표 ETF 예시",
      createdAt: now,
      updatedAt: now
    }
  ];
}

export function createDefaultRebalancingPolicy(): RebalancingPolicy {
  const now = new Date().toISOString();

  return {
    id: "rebalancing_policy_default",
    policyName: "기본 리밸런싱 정책",
    enabled: true,
    defaultMode: "analysis_only",
    rebalanceType: "threshold",
    driftThresholdPercent: 0.03,
    assetClassThresholdPercent: 0.03,
    instrumentThresholdPercent: 0.05,
    minTradeAmount: 50_000,
    maxTradeAmount: 1_000_000,
    maxTotalRebalanceAmount: 3_000_000,
    maxDailyRebalanceAmount: 3_000_000,
    maxMonthlyRebalanceAmount: 10_000_000,
    maxOrdersPerRebalance: 5,
    maxOrdersPerDay: 5,
    minCashRatioAfterRebalance: 0.05,
    maxCashRatioAfterRebalance: 0.35,
    allowBuyOrders: true,
    allowSellOrders: false,
    allowFractionalQuantity: true,
    preferCashFirst: true,
    preferLimitOrders: true,
    avoidTaxableSales: true,
    avoidHighVolatilityAssets: true,
    cooldownHours: 24,
    requireConfirmationForLiveOrders: true,
    requireConfirmationForSellOrders: true,
    requireConfirmationForLargeOrders: true,
    largeOrderThresholdAmount: 1_000_000,
    tradingMode: "analysis",
    createdAt: now,
    updatedAt: now
  };
}

export function createDefaultRebalancingRule(
  policyId = "rebalancing_policy_default"
): RebalancingRule {
  const now = new Date().toISOString();

  return {
    id: "rebalancing_rule_manual_check",
    policyId,
    ruleName: "수동 점검 규칙",
    enabled: false,
    ruleType: "manual_trigger",
    scheduleTimezone: "Asia/Seoul",
    driftThresholdPercent: 0.03,
    assetClassThresholdPercent: 0.03,
    instrumentThresholdPercent: 0.05,
    cashTriggerAmount: 500_000,
    contributionTriggerEnabled: true,
    withdrawalTriggerEnabled: false,
    targetAssetClasses: [],
    excludedAssetClasses: [],
    allowedInstrumentIds: [],
    excludedInstrumentIds: [],
    maxOrderAmount: 1_000_000,
    maxTotalOrderAmount: 3_000_000,
    maxOrdersPerRun: 5,
    maxOrdersPerDay: 5,
    minCashRatioAfterTrade: 0.05,
    maxRiskScoreAfterTrade: 80,
    cooldownHours: 24,
    requireManualReview: true,
    createdAt: now,
    updatedAt: now
  };
}

export function createSampleAssets(): Asset[] {
  const accountType = "general";
  const tax = getDefaultTaxRate(accountType, "covered_call");

  return [
    createAssetFromInput({
      assetName: "현금성 계좌",
      assetType: "cash",
      valuationAmount: 5_000_000,
      currency: "KRW",
      exchangeRate: 1,
      incomeYield: 0.028,
      expectedCapitalReturn: 0,
      priceChangeRate: 0,
      priceChangePeriodType: "1y",
      fxChangeRate: 0,
      incomeTaxRate: 0.154,
      capitalGainTaxRate: 0.154,
      accountType
    }),
    createAssetFromInput({
      assetName: "배당 자산군",
      assetType: "dividend",
      valuationAmount: 18_000_000,
      currency: "KRW",
      exchangeRate: 1,
      incomeYield: 0.035,
      expectedCapitalReturn: 0.045,
      priceChangeRate: -0.03,
      priceChangePeriodType: "1y",
      fxChangeRate: 0,
      incomeTaxRate: 0.154,
      capitalGainTaxRate: 0.154,
      accountType
    }),
    createAssetFromInput({
      assetName: "커버드콜 자산군",
      assetType: "covered_call",
      valuationAmount: 12_000_000,
      currency: "KRW",
      exchangeRate: 1,
      incomeYield: 0.11,
      expectedCapitalReturn: -0.015,
      priceChangeRate: -0.12,
      priceChangePeriodType: "1y",
      fxChangeRate: 0,
      incomeTaxRate: tax.incomeTaxRate,
      capitalGainTaxRate: tax.capitalGainTaxRate,
      accountType
    }),
    createAssetFromInput({
      assetName: "성장 자산군",
      assetType: "growth",
      ticker: "SPY",
      market: "NYSE",
      valuationAmount: 15_000,
      currency: "USD",
      exchangeRate: 1350,
      quantity: 30,
      incomeYield: 0.01,
      expectedCapitalReturn: 0.09,
      priceChangeRate: 0.06,
      priceChangePeriodType: "1y",
      fxChangeRate: 0.02,
      incomeTaxRate: 0.154,
      capitalGainTaxRate: 0.22,
      accountType
    })
  ];
}

export function createDefaultState(): AppState {
  return {
    profile: DEFAULT_PROFILE,
    assets: [],
    snapshots: [],
    monthlyReports: [],
    monthlyAllocationPlans: [],
    rebalanceSuggestions: [],
    notifications: [],
    emailLogs: [],
    notificationSettings: createDefaultNotificationSettings(),
    csvImportJobs: [],
    csvImportRows: [],
    marketPriceSnapshots: [],
    fxRateSnapshots: [],
    assetPriceLinks: [],
    externalAssetMappings: [],
    externalConnections: [],
    externalSyncLogs: [],
    privateTradingFlags: createDefaultPrivateTradingFlags(),
    privateTradingRiskLimits: createDefaultPrivateTradingRiskLimits(),
    investorProfile: createDefaultInvestorProfile(),
    productUniverse: createDefaultProductUniverse(),
    recommendations: [],
    watchlist: [],
    orderProposals: [],
    orderEventLogs: [],
    tradingAuditLogs: [],
    tradingAcknowledgements: [],
    autoTradingRules: [],
    rebalancingPolicies: [createDefaultRebalancingPolicy()],
    rebalancingRules: [createDefaultRebalancingRule()],
    rebalancingSnapshots: [],
    rebalancingPlans: [],
    rebalancingPlanItems: [],
    rebalancingExecutions: [],
    rebalancingEvents: [],
    rebalancingAuditLogs: [],
    rebalancingSchedulerRuns: [],
    rebalancingUserAcknowledgements: []
  };
}
