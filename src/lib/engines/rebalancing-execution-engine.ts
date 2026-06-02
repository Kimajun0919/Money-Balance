import type { AppState, RebalancingExecutionMode } from "@/lib/types";

export function describeRebalancingExecutionMode(
  mode: RebalancingExecutionMode
) {
  const labels: Record<RebalancingExecutionMode, string> = {
    paper: "모의 리밸런싱",
    sandbox: "샌드박스 리밸런싱",
    live_manual: "수동 실거래 리밸런싱",
    live_auto: "자동 실거래 리밸런싱"
  };

  return labels[mode];
}

export function hasActiveRebalancingKillSwitch(state: AppState) {
  return state.privateTradingFlags.killSwitchActive;
}
