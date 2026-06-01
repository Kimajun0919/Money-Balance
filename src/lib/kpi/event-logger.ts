export type KpiEventName =
  | "onboarding_completed"
  | "asset_created"
  | "target_allocation_viewed"
  | "dashboard_viewed"
  | "rebalance_suggestion_viewed"
  | "monthly_allocation_calculated"
  | "snapshot_created"
  | "target_gap_card_clicked"
  | "risk_score_detail_viewed"
  | "illusion_warning_viewed"
  | "rebalance_status_applied";

export function logKpiEvent(
  eventName: KpiEventName,
  payload: Record<string, unknown> = {}
) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[Yield Balance KPI]", eventName, payload);
  }
}
