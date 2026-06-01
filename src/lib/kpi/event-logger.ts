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
  | "csv_import_mapped"
  | "csv_import_validated"
  | "csv_import_completed"
  | "csv_import_failed"
  | "market_price_refresh_started"
  | "market_price_refresh_completed"
  | "market_price_refresh_failed"
  | "fx_rate_refresh_started"
  | "fx_rate_refresh_completed"
  | "fx_rate_refresh_failed"
  | "broker_connection_started"
  | "broker_connection_completed"
  | "broker_connection_failed"
  | "broker_sync_started"
  | "broker_sync_preview_viewed"
  | "broker_sync_applied"
  | "broker_sync_failed"
  | "broker_disconnected"
  | "external_data_deleted"
  | "asset_classification_confirmed"
  | "data_freshness_warning_viewed"
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
