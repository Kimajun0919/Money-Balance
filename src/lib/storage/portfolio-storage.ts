"use client";

import { buildPortfolioReview } from "@/lib/engines/portfolio-review-engine";
import type { AppState, SnapshotItem, StoredSnapshot } from "@/lib/types";
import { createDefaultState } from "@/lib/storage/default-state";

const STORAGE_KEY = "yield-balance-state-v1";

function normalizeState(parsed: Partial<AppState>): AppState {
  const defaults = createDefaultState();

  return {
    ...defaults,
    ...parsed,
    profile: {
      ...defaults.profile,
      ...parsed.profile
    },
    notificationSettings: {
      ...defaults.notificationSettings,
      ...parsed.notificationSettings
    },
    privateTradingFlags: {
      ...defaults.privateTradingFlags,
      ...parsed.privateTradingFlags
    },
    privateTradingRiskLimits: {
      ...defaults.privateTradingRiskLimits,
      ...parsed.privateTradingRiskLimits,
      allowedInstrumentKinds:
        parsed.privateTradingRiskLimits?.allowedInstrumentKinds ??
        defaults.privateTradingRiskLimits.allowedInstrumentKinds,
      blockedInstrumentKinds:
        parsed.privateTradingRiskLimits?.blockedInstrumentKinds ??
        defaults.privateTradingRiskLimits.blockedInstrumentKinds,
      blockedTickers:
        parsed.privateTradingRiskLimits?.blockedTickers ??
        defaults.privateTradingRiskLimits.blockedTickers
    },
    investorProfile: {
      ...defaults.investorProfile,
      ...parsed.investorProfile,
      preferredAssetTypes:
        parsed.investorProfile?.preferredAssetTypes ??
        defaults.investorProfile.preferredAssetTypes,
      allowedMarkets:
        parsed.investorProfile?.allowedMarkets ??
        defaults.investorProfile.allowedMarkets
    },
    assets: parsed.assets ?? defaults.assets,
    snapshots: parsed.snapshots ?? defaults.snapshots,
    monthlyReports: parsed.monthlyReports ?? defaults.monthlyReports,
    monthlyAllocationPlans:
      parsed.monthlyAllocationPlans ?? defaults.monthlyAllocationPlans,
    rebalanceSuggestions:
      parsed.rebalanceSuggestions ?? defaults.rebalanceSuggestions,
    notifications: parsed.notifications ?? defaults.notifications,
    emailLogs: parsed.emailLogs ?? defaults.emailLogs,
    csvImportJobs: parsed.csvImportJobs ?? defaults.csvImportJobs,
    csvImportRows: parsed.csvImportRows ?? defaults.csvImportRows,
    marketPriceSnapshots:
      parsed.marketPriceSnapshots ?? defaults.marketPriceSnapshots,
    fxRateSnapshots: parsed.fxRateSnapshots ?? defaults.fxRateSnapshots,
    assetPriceLinks: parsed.assetPriceLinks ?? defaults.assetPriceLinks,
    externalAssetMappings:
      parsed.externalAssetMappings ?? defaults.externalAssetMappings,
    externalConnections:
      parsed.externalConnections ?? defaults.externalConnections,
    externalSyncLogs: parsed.externalSyncLogs ?? defaults.externalSyncLogs,
    productUniverse: parsed.productUniverse ?? defaults.productUniverse,
    recommendations: parsed.recommendations ?? defaults.recommendations,
    watchlist: parsed.watchlist ?? defaults.watchlist,
    orderProposals: parsed.orderProposals ?? defaults.orderProposals,
    orderEventLogs: parsed.orderEventLogs ?? defaults.orderEventLogs,
    tradingAuditLogs: parsed.tradingAuditLogs ?? defaults.tradingAuditLogs,
    tradingAcknowledgements:
      parsed.tradingAcknowledgements ?? defaults.tradingAcknowledgements,
    autoTradingRules: parsed.autoTradingRules ?? defaults.autoTradingRules
  };
}

export function loadAppState(): AppState {
  if (typeof window === "undefined") return createDefaultState();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return createDefaultState();

  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
}

export function saveAppState(state: AppState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetAppState() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function createSnapshotFromState(state: AppState): StoredSnapshot {
  const review = buildPortfolioReview(state.profile, state.assets);
  const now = new Date().toISOString();
  const items: SnapshotItem[] = review.rebalance.items.map((item) => {
    const allocation = review.targetAllocation.allocations.find(
      (targetItem) => targetItem.assetType === item.assetType
    );
    const minRatio = allocation?.minRatio ?? Math.max(0, item.targetRatio - 0.03);
    const maxRatio = allocation?.maxRatio ?? Math.min(1, item.targetRatio + 0.03);
    const allocationGapStatus =
      item.currentRatio < minRatio
        ? "below"
        : item.currentRatio > maxRatio
          ? "above"
          : "within";

    return {
      ...item,
      minRatio,
      maxRatio,
      allocationGapStatus
    };
  });

  return {
    id: crypto.randomUUID(),
    snapshotDate: now.slice(0, 10),
    totalAssetAmountKrw: review.returns.totalAssetAmountKrw,
    targetReturn: state.profile.targetReturn,
    referencePortfolioExpectedReturn: review.targetAllocation.expectedReturn,
    portfolioExpectedReturn: review.returns.expectedReturn,
    portfolioIncomeYield: review.returns.incomeYield,
    portfolioIncomeAmount: review.returns.annualIncomeAmount,
    monthlyIncomeAmount: review.returns.monthlyIncomeAmount,
    afterTaxExpectedReturn: review.returns.afterTaxExpectedReturn,
    totalReturn: review.returns.totalReturn,
    riskScore: review.risk.totalScore,
    riskScoreLimit: state.profile.riskScoreLimit,
    cashRatio: review.risk.cashRatio,
    compositionRisk: review.targetAllocation.compositionRisk,
    targetGap: review.targetAllocation.targetGap,
    primaryStatus: review.rebalance.primaryStatus,
    activeFlags: review.rebalance.activeFlags,
    snapshotSource: "manual",
    isArchived: false,
    items,
    createdAt: now
  };
}
