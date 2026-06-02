import { calculateRebalancingDrift } from "@/lib/engines/rebalancing-drift-engine";
import { generateAndStoreRebalancingPlan } from "@/lib/services/rebalancing-plan-service";
import type { AppState } from "@/lib/types";

export function getActiveRebalancingPolicy(state: AppState) {
  return state.rebalancingPolicies.find((policy) => policy.enabled) ??
    state.rebalancingPolicies[0];
}

export function getLatestRebalancingPlan(state: AppState) {
  return [...state.rebalancingPlans].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

export function getRebalancingDashboardData(state: AppState) {
  const policy = getActiveRebalancingPolicy(state);
  const drift = calculateRebalancingDrift(state, policy);
  const latestPlan = getLatestRebalancingPlan(state);

  return {
    policy,
    drift,
    latestPlan
  };
}

export function runManualRebalancingCheck(state: AppState) {
  const policy = getActiveRebalancingPolicy(state);
  return generateAndStoreRebalancingPlan(state, { policyId: policy.id });
}
