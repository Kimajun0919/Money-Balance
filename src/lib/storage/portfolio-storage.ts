"use client";

import { buildPortfolioReview } from "@/lib/engines/portfolio-review-engine";
import type { AppState, StoredSnapshot } from "@/lib/types";
import { createDefaultState } from "@/lib/storage/default-state";

const STORAGE_KEY = "yield-balance-state-v1";

export function loadAppState(): AppState {
  if (typeof window === "undefined") return createDefaultState();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return createDefaultState();

  try {
    return {
      ...createDefaultState(),
      ...JSON.parse(raw)
    };
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

  return {
    id: crypto.randomUUID(),
    snapshotDate: now.slice(0, 10),
    totalAssetAmountKrw: review.returns.totalAssetAmountKrw,
    targetReturn: state.profile.targetReturn,
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
    items: review.rebalance.items,
    createdAt: now
  };
}
