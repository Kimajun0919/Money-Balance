import { calculateMonthlyAllocation } from "@/lib/engines/monthly-allocation-engine";
import { calculateRebalance } from "@/lib/engines/rebalance-engine";
import { calculatePortfolioReturns } from "@/lib/engines/return-calculation-engine";
import { calculatePortfolioRiskScore } from "@/lib/engines/risk-score-engine";
import { calculateTargetAllocation } from "@/lib/engines/target-allocation-engine";
import type { Asset, PortfolioReview, UserProfile } from "@/lib/types";

export function buildPortfolioReview(
  profile: UserProfile,
  assets: Asset[]
): PortfolioReview {
  const targetAllocation = calculateTargetAllocation({
    targetReturn: profile.targetReturn,
    riskTolerance: profile.riskTolerance,
    minCashRatio: profile.minCashRatio,
    investmentHorizon: profile.investmentHorizon,
    lossTolerance: profile.lossTolerance
  });
  const returns = calculatePortfolioReturns(assets);
  const risk = calculatePortfolioRiskScore({
    assets,
    minCashRatio: profile.minCashRatio,
    riskScoreLimit: profile.riskScoreLimit
  });
  const rebalance = calculateRebalance({
    assets,
    targetAllocations: targetAllocation.allocations,
    targetReturn: profile.targetReturn,
    portfolioExpectedReturn: returns.expectedReturn,
    riskScore: risk.totalScore,
    riskScoreLimit: profile.riskScoreLimit,
    cashRatio: risk.cashRatio,
    minCashRatio: profile.minCashRatio,
    illusionWarnings: returns.illusionWarnings
  });
  const monthlyAllocation = calculateMonthlyAllocation({
    assets,
    targetAllocations: targetAllocation.allocations,
    monthlyInvestment: profile.monthlyInvestment,
    minCashRatio: profile.minCashRatio,
    excludedAssetTypes: returns.illusionWarnings.map(
      (warning) => warning.assetType
    ),
    riskScore: risk.totalScore,
    riskScoreLimit: profile.riskScoreLimit
  });

  return {
    targetAllocation,
    returns,
    risk,
    rebalance,
    monthlyAllocation
  };
}
