export type KpiEventName =
  | "onboarding_completed"
  | "asset_created"
  | "target_allocation_viewed"
  | "dashboard_viewed"
  | "rebalance_suggestion_viewed"
  | "monthly_allocation_calculated"
  | "snapshot_created"
  | "snapshot_replaced"
  | "monthly_report_created"
  | "monthly_report_viewed"
  | "monthly_allocation_plan_saved"
  | "notification_viewed"
  | "notification_marked_read"
  | "email_mock_sent"
  | "email_sent"
  | "email_failed"
  | "rebalance_history_viewed"
  | "rebalance_history_filtered"
  | "rebalance_status_deferred"
  | "trend_dashboard_viewed"
  | "csv_import_started"
  | "csv_import_validated"
  | "csv_import_completed"
  | "csv_import_failed"
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
