export type AssetType =
  | "cash"
  | "savings"
  | "govt_bond"
  | "high_yield_bond"
  | "dividend"
  | "reit"
  | "covered_call"
  | "growth"
  | "alternative"
  | "etc";

export type RiskLevel = "low" | "medium" | "high" | "very_high";
export type LiquidityLevel = "high" | "medium" | "low";

export type RiskTolerance =
  | "conservative"
  | "moderate"
  | "growth"
  | "aggressive";

export type InvestmentHorizon =
  | "under_1y"
  | "one_to_three"
  | "three_to_five"
  | "five_plus";

export type AccountType =
  | "general"
  | "isa"
  | "pension"
  | "irp"
  | "tax_free"
  | "unknown";

export type PriceChangePeriodType =
  | "1m"
  | "3m"
  | "6m"
  | "1y"
  | "since_purchase"
  | "custom";

export type RiskGrade = "low" | "medium" | "high" | "very_high";

export type RebalanceStatus =
  | "cash_shortage"
  | "risk_excess"
  | "illusion_warning"
  | "allocation_gap"
  | "return_gap"
  | "maintain";

export type IllusionWarningLevel = "none" | "caution" | "warning" | "danger";
export type SnapshotSource =
  | "manual"
  | "reminder_based"
  | "imported"
  | "broker_sync"
  | "system_generated";
export type DuplicateSnapshotPolicy = "new" | "replace" | "cancel";
export type AllocationGapStatus = "below" | "above" | "within";
export type SuggestionStatus = "suggested" | "viewed" | "deferred" | "applied";
export type NotificationType =
  | "monthly_update_request"
  | "cash_shortage"
  | "risk_score_excess"
  | "target_gap_warning"
  | "illusion_warning"
  | "rebalancing_needed"
  | "report_ready";
export type NotificationPriority = "low" | "medium" | "high" | "critical";
export type EmailType =
  | "monthly_update_reminder"
  | "monthly_report_ready"
  | "cash_shortage_warning"
  | "risk_score_warning"
  | "target_gap_warning"
  | "illusion_warning";
export type EmailStatus = "pending" | "sent" | "failed" | "skipped" | "mock_sent";
export type PeriodFilter = "3m" | "6m" | "12m" | "all";
export type CsvImportStatus =
  | "uploaded"
  | "parsed"
  | "mapped"
  | "validated"
  | "imported"
  | "failed"
  | "canceled";
export type CsvRowValidationStatus = "valid" | "warning" | "invalid";
export type CsvImportType = "standard" | "generic" | "broker_specific";
export type DuplicateAssetPolicy = "skip" | "add" | "replace" | "merge";
export type DuplicateAssetStatus = "none" | "possible" | "confirmed";
export type ValuationSource =
  | "manual"
  | "csv_import"
  | "broker_sync"
  | "market_price"
  | "mixed";
export type ExternalProviderType = "market_data" | "fx_rate" | "broker";
export type ExternalConnectionStatus =
  | "connected"
  | "disconnected"
  | "failed"
  | "deleted";
export type ExternalSyncStatus =
  | "started"
  | "previewed"
  | "applied"
  | "success"
  | "partial_success"
  | "failed";
export type ExternalSyncType =
  | "market_price"
  | "fx_rate"
  | "csv_import"
  | "broker_connection"
  | "broker_holdings"
  | "broker_cash"
  | "broker_delete";
export type MappingSource = "auto" | "user" | "system_default" | "broker_metadata";
export type DataFreshnessType =
  | "market_price"
  | "fx_rate"
  | "broker_holdings"
  | "csv_import"
  | "manual";
export type TradingInstrumentKind =
  | "stock"
  | "etf"
  | "fund"
  | "bond"
  | "cash"
  | "crypto"
  | "derivative"
  | "option"
  | "future"
  | "leveraged_etf"
  | "illiquid_asset"
  | "unknown";
export type TradingRecommendationAction = "buy" | "hold" | "reduce" | "watch";
export type TradingOrderSide = "buy" | "sell";
export type TradingOrderType = "market" | "limit";
export type TradingExecutionMode = "paper" | "sandbox" | "live";
export type TradingOrderProposalStatus =
  | "draft"
  | "blocked"
  | "proposed"
  | "confirmed"
  | "submitted"
  | "canceled";
export type TradingAcknowledgementType =
  | "risk_profile"
  | "principal_loss"
  | "live_trading"
  | "auto_trading";
export type TradingAuditEventType =
  | "investor_profile_completed"
  | "trading_acknowledgement_accepted"
  | "recommendation_generated"
  | "recommendation_viewed"
  | "order_proposal_created"
  | "order_proposal_confirmed"
  | "order_blocked"
  | "paper_order_submitted"
  | "sandbox_order_submitted"
  | "live_order_submitted"
  | "auto_trading_rule_created"
  | "auto_trading_rule_enabled"
  | "auto_trading_rule_disabled"
  | "auto_trade_triggered"
  | "kill_switch_activated"
  | "kill_switch_deactivated";
export type AutoTradingRuleStatus = "disabled" | "enabled" | "blocked";
export type AutoTradingStrategyType = "target_gap" | "watchlist_signal";
export type RebalancingMode =
  | "analysis_only"
  | "paper_rebalancing"
  | "sandbox_rebalancing"
  | "live_manual_rebalancing"
  | "live_auto_rebalancing";
export type RebalancingType =
  | "scheduled"
  | "threshold"
  | "cash_based"
  | "contribution"
  | "withdrawal"
  | "full_portfolio";
export type RebalancingTradingMode = "analysis" | "paper" | "sandbox" | "live";
export type RebalancingRuleType =
  | "scheduled"
  | "threshold"
  | "cash_deposit"
  | "cash_ratio"
  | "portfolio_drift"
  | "risk_score"
  | "manual_trigger";
export type RebalancingPlanType = RebalancingType | "manual";
export type RebalancingPlanStatus =
  | "draft"
  | "generated"
  | "review_required"
  | "approved"
  | "rejected"
  | "blocked_by_safety_gate"
  | "blocked_by_risk"
  | "paper_executed"
  | "sandbox_executed"
  | "live_order_proposed"
  | "live_executed"
  | "partially_executed"
  | "failed"
  | "canceled";
export type RebalancingPlanItemSide = "buy" | "sell" | "hold";
export type RebalancingPlanItemStatus =
  | "proposed"
  | "blocked"
  | "requires_review"
  | "approved"
  | "converted_to_order_proposal"
  | "paper_executed"
  | "sandbox_executed"
  | "live_executed"
  | "failed"
  | "canceled";
export type RebalancingExecutionMode =
  | "paper"
  | "sandbox"
  | "live_manual"
  | "live_auto";
export type RebalancingExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "partially_completed"
  | "failed"
  | "canceled"
  | "blocked";
export type RebalancingEventType =
  | "snapshot_created"
  | "drift_detected"
  | "no_rebalance_needed"
  | "plan_generated"
  | "plan_blocked"
  | "plan_approved"
  | "plan_rejected"
  | "order_proposal_created"
  | "paper_rebalance_started"
  | "paper_rebalance_completed"
  | "sandbox_rebalance_started"
  | "sandbox_rebalance_completed"
  | "live_rebalance_proposed"
  | "live_rebalance_started"
  | "live_rebalance_completed"
  | "auto_rebalance_triggered"
  | "auto_rebalance_blocked"
  | "kill_switch_blocked"
  | "risk_check_failed"
  | "execution_failed"
  | "execution_canceled";
export type RebalancingAuditEventType =
  | "rebalancing_snapshot_created"
  | "rebalancing_drift_detected"
  | "rebalancing_plan_generated"
  | "rebalancing_plan_viewed"
  | "rebalancing_plan_approved"
  | "rebalancing_plan_rejected"
  | "rebalancing_order_proposal_created"
  | "rebalancing_order_blocked"
  | "paper_rebalancing_executed"
  | "sandbox_rebalancing_executed"
  | "live_rebalancing_order_submitted"
  | "auto_rebalancing_rule_created"
  | "auto_rebalancing_rule_enabled"
  | "auto_rebalancing_rule_disabled"
  | "auto_rebalancing_triggered"
  | "auto_rebalancing_blocked"
  | "rebalancing_kill_switch_blocked";
export type RebalancingSchedulerRunType =
  | "scheduled"
  | "threshold_check"
  | "manual_check"
  | "cash_trigger_check";
export type RebalancingSchedulerRunStatus =
  | "started"
  | "completed"
  | "no_op"
  | "blocked"
  | "failed";
export type RebalancingAcknowledgementType =
  | "manual_rebalancing"
  | "auto_rebalancing"
  | "sell_order"
  | "large_order"
  | "live_rebalancing";

export interface PrivateTradingFlags {
  privateUseMode: boolean;
  publicReleaseMode: boolean;
  recommendationsEnabled: boolean;
  paperTradingEnabled: boolean;
  brokerSandboxEnabled: boolean;
  liveTradingEnabled: boolean;
  autoTradingEnabled: boolean;
  rebalancingEnabled: boolean;
  autoRebalancingEnabled: boolean;
  paperRebalancingEnabled: boolean;
  sandboxRebalancingEnabled: boolean;
  liveRebalancingEnabled: boolean;
  brokerOrderApiConfigured: boolean;
  brokerConnectionActive: boolean;
  userTradingConsentAccepted: boolean;
  userAutoTradingConsentAccepted: boolean;
  userRebalancingConsentAccepted: boolean;
  userAutoRebalancingConsentAccepted: boolean;
  riskProfileCompleted: boolean;
  principalLossAcknowledged: boolean;
  autoTradingRiskAcknowledged: boolean;
  autoRebalancingRiskAcknowledged: boolean;
  killSwitchActive: boolean;
  updatedAt: string;
}

export interface PrivateTradingRiskLimits {
  maxOrderAmountKrw: number;
  maxDailyOrderAmountKrw: number;
  maxMonthlyOrderAmountKrw: number;
  maxOrdersPerDay: number;
  minimumCashRatioAfterTrade: number;
  maxRiskScoreAfterTrade: number;
  staleDataMaxHours: number;
  allowedInstrumentKinds: TradingInstrumentKind[];
  blockedInstrumentKinds: TradingInstrumentKind[];
  blockedTickers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InvestorProfile {
  id: string;
  riskProfileCompleted: boolean;
  experienceLevel: "beginner" | "intermediate" | "advanced";
  investmentObjective: "income" | "balanced" | "growth";
  maxLossTolerance: number;
  liquidityNeedMonths: number;
  preferredAssetTypes: AssetType[];
  allowedMarkets: string[];
  completedAt?: string;
  updatedAt: string;
}

export interface ProductUniverseItem {
  id: string;
  instrumentName: string;
  ticker: string;
  market: string;
  currency: string;
  instrumentKind: TradingInstrumentKind;
  assetType: AssetType;
  expectedReturn: number;
  incomeYield: number;
  riskScore: number;
  riskLevel: RiskLevel;
  liquidityLevel: LiquidityLevel;
  liquidityScore: number;
  lastPrice: number;
  lastPriceUpdatedAt: string;
  isActive: boolean;
  isTradable: boolean;
  isAutoTradingAllowed: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstrumentRecommendation {
  id: string;
  instrumentId: string;
  ticker: string;
  instrumentName: string;
  assetType: AssetType;
  action: TradingRecommendationAction;
  score: number;
  rank: number;
  suggestedOrderAmountKrw: number;
  allocationGap: number;
  expectedReturn: number;
  riskScoreBefore: number;
  riskScoreAfterEstimate: number;
  reasons: string[];
  warnings: string[];
  blocked: boolean;
  blockReasons: string[];
  privateTradingFlagsSnapshot: PrivateTradingFlags;
  createdAt: string;
  viewedAt?: string;
}

export interface WatchlistItem {
  id: string;
  instrumentId: string;
  ticker: string;
  instrumentName: string;
  priority: "low" | "medium" | "high";
  note: string;
  addedFromRecommendationId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TradeRiskCheckResult {
  passed: boolean;
  messages: string[];
  projectedCashRatio: number;
  projectedRiskScore: number;
  dailyOrderAmountKrw: number;
  monthlyOrderAmountKrw: number;
  ordersToday: number;
}

export interface OrderProposal {
  id: string;
  recommendationId?: string;
  instrumentId: string;
  ticker: string;
  instrumentName: string;
  side: TradingOrderSide;
  orderType: TradingOrderType;
  executionMode: TradingExecutionMode;
  amountKrw: number;
  quantity?: number;
  limitPrice?: number;
  currency: string;
  estimatedPrice: number;
  estimatedFeesKrw: number;
  status: TradingOrderProposalStatus;
  riskCheckPassed: boolean;
  riskCheckMessages: string[];
  userConfirmedOrder: boolean;
  privateTradingFlagsSnapshot: PrivateTradingFlags;
  createdAt: string;
  confirmedAt?: string;
  submittedAt?: string;
}

export interface OrderEventLog {
  id: string;
  orderProposalId?: string;
  eventType:
    | "order_proposal_created"
    | "order_proposal_confirmed"
    | "order_blocked"
    | "paper_order_submitted"
    | "sandbox_order_submitted"
    | "live_order_submitted";
  executionMode: TradingExecutionMode;
  instrumentId?: string;
  ticker?: string;
  amountKrw?: number;
  status: "success" | "blocked" | "failed";
  message: string;
  privateTradingFlagsSnapshot: PrivateTradingFlags;
  createdAt: string;
}

export interface TradingAuditLog {
  id: string;
  eventType: TradingAuditEventType;
  entityType?: string;
  entityId?: string;
  summary: string;
  metadata: Record<string, unknown>;
  privateTradingFlagsSnapshot: PrivateTradingFlags;
  createdAt: string;
}

export interface TradingAcknowledgement {
  id: string;
  acknowledgementType: TradingAcknowledgementType;
  text: string;
  acceptedAt: string;
}

export interface AutoTradingRule {
  id: string;
  name: string;
  strategyType: AutoTradingStrategyType;
  instrumentId: string;
  ticker: string;
  instrumentName: string;
  side: TradingOrderSide;
  status: AutoTradingRuleStatus;
  enabled: boolean;
  maxOrderAmountKrw: number;
  maxDailyOrderAmountKrw: number;
  maxOrdersPerDay: number;
  minimumCashRatioAfterTrade: number;
  maxRiskScoreAfterTrade: number;
  privateTradingFlagsSnapshot: PrivateTradingFlags;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
}

export interface RebalancingPolicy {
  id: string;
  policyName: string;
  enabled: boolean;
  defaultMode: RebalancingMode;
  rebalanceType: RebalancingType;
  targetAllocationId?: string;
  driftThresholdPercent: number;
  assetClassThresholdPercent: number;
  instrumentThresholdPercent: number;
  minTradeAmount: number;
  maxTradeAmount: number;
  maxTotalRebalanceAmount: number;
  maxDailyRebalanceAmount: number;
  maxMonthlyRebalanceAmount: number;
  maxOrdersPerRebalance: number;
  maxOrdersPerDay: number;
  minCashRatioAfterRebalance: number;
  maxCashRatioAfterRebalance: number;
  allowBuyOrders: boolean;
  allowSellOrders: boolean;
  allowFractionalQuantity: boolean;
  preferCashFirst: boolean;
  preferLimitOrders: boolean;
  avoidTaxableSales: boolean;
  avoidHighVolatilityAssets: boolean;
  cooldownHours: number;
  requireConfirmationForLiveOrders: boolean;
  requireConfirmationForSellOrders: boolean;
  requireConfirmationForLargeOrders: boolean;
  largeOrderThresholdAmount: number;
  tradingMode: RebalancingTradingMode;
  createdAt: string;
  updatedAt: string;
}

export interface RebalancingRule {
  id: string;
  policyId: string;
  ruleName: string;
  enabled: boolean;
  ruleType: RebalancingRuleType;
  scheduleCron?: string;
  scheduleTimezone: string;
  driftThresholdPercent: number;
  assetClassThresholdPercent: number;
  instrumentThresholdPercent: number;
  cashTriggerAmount: number;
  contributionTriggerEnabled: boolean;
  withdrawalTriggerEnabled: boolean;
  targetAssetClasses: AssetType[];
  excludedAssetClasses: AssetType[];
  allowedInstrumentIds: string[];
  excludedInstrumentIds: string[];
  maxOrderAmount: number;
  maxTotalOrderAmount: number;
  maxOrdersPerRun: number;
  maxOrdersPerDay: number;
  minCashRatioAfterTrade: number;
  maxRiskScoreAfterTrade: number;
  cooldownHours: number;
  requireManualReview: boolean;
  lastCheckedAt?: string;
  lastTriggeredAt?: string;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RebalancingDriftItem {
  assetType: AssetType;
  currentAmount: number;
  currentWeight: number;
  targetWeight: number;
  driftPercent: number;
  absoluteDriftPercent: number;
  status: "underweight" | "overweight" | "within";
}

export interface InstrumentDriftItem {
  instrumentId?: string;
  ticker?: string;
  instrumentName: string;
  assetType: AssetType;
  currentAmount: number;
  currentWeight: number;
  targetWeight: number;
  driftPercent: number;
  absoluteDriftPercent: number;
}

export interface RebalancingDriftResult {
  currentAllocation: Record<string, number>;
  targetAllocation: Record<string, number>;
  driftByAssetClass: RebalancingDriftItem[];
  driftByInstrument: InstrumentDriftItem[];
  maxDriftAssetType?: AssetType;
  maxDriftPercent: number;
  underweightAssetTypes: AssetType[];
  overweightAssetTypes: AssetType[];
  rebalanceNeeded: boolean;
  summary: string;
}

export interface RebalancingSnapshot {
  id: string;
  portfolioSnapshotId?: string;
  targetAllocationId?: string;
  currentTotalValue: number;
  currentCashValue: number;
  currentCashRatio: number;
  targetCashRatio: number;
  currentAllocationJson: Record<string, number>;
  targetAllocationJson: Record<string, number>;
  driftJson: RebalancingDriftItem[];
  maxDriftAssetType?: AssetType;
  maxDriftPercent: number;
  riskScoreBefore: number;
  createdAt: string;
}

export interface RebalancingPlanItem {
  id: string;
  planId: string;
  instrumentId?: string;
  assetType: AssetType;
  side: RebalancingPlanItemSide;
  reason: string;
  currentWeight: number;
  targetWeight: number;
  driftPercent: number;
  proposedAmount: number;
  proposedQuantity?: number;
  estimatedPrice: number;
  estimatedFee: number;
  estimatedTotalAmount: number;
  orderType: TradingOrderType;
  priority: number;
  riskWarnings: string[];
  blockingReasons: string[];
  status: RebalancingPlanItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RebalancingPlan {
  id: string;
  policyId: string;
  ruleId?: string;
  snapshotId: string;
  planName: string;
  planType: RebalancingPlanType;
  tradingMode: RebalancingTradingMode;
  status: RebalancingPlanStatus;
  currentTotalValue: number;
  estimatedTotalTradeAmount: number;
  estimatedFeeAmount: number;
  estimatedCashAfter: number;
  estimatedCashRatioAfter: number;
  riskScoreBefore: number;
  riskScoreAfter: number;
  driftBeforeJson: RebalancingDriftItem[];
  driftAfterJson: RebalancingDriftItem[];
  summary: string;
  explanation: string;
  warnings: string[];
  blockingReasons: string[];
  privateTradingFlagsSnapshot: PrivateTradingFlags;
  createdAt: string;
  updatedAt: string;
}

export interface RebalancingRiskCheckResult {
  allowed: boolean;
  blockingReasons: string[];
  warnings: string[];
  postRebalanceRiskScore: number;
  postRebalanceCashRatio: number;
  postRebalanceAllocation: Record<string, number>;
}

export interface RebalancingExecution {
  id: string;
  planId: string;
  executionMode: RebalancingExecutionMode;
  status: RebalancingExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  totalOrdersAttempted: number;
  totalOrdersSuccessful: number;
  totalOrdersFailed: number;
  totalTradeAmount: number;
  totalFeeAmount: number;
  cashBefore: number;
  cashAfter: number;
  riskScoreBefore: number;
  riskScoreAfter: number;
  driftBeforeJson: RebalancingDriftItem[];
  driftAfterJson: RebalancingDriftItem[];
  rawResultJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RebalancingEvent {
  id: string;
  planId?: string;
  ruleId?: string;
  executionId?: string;
  eventType: RebalancingEventType;
  statusBefore?: string;
  statusAfter?: string;
  message: string;
  rawData: Record<string, unknown>;
  createdAt: string;
}

export interface RebalancingAuditLog {
  id: string;
  eventType: RebalancingAuditEventType;
  entityType: string;
  entityId: string;
  inputJson: Record<string, unknown>;
  outputJson: Record<string, unknown>;
  privateTradingFlagsSnapshot: PrivateTradingFlags;
  riskCheckResult?: RebalancingRiskCheckResult;
  userConsentSnapshot: Record<string, boolean>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface RebalancingSchedulerRun {
  id: string;
  ruleId: string;
  runType: RebalancingSchedulerRunType;
  status: RebalancingSchedulerRunStatus;
  startedAt: string;
  completedAt?: string;
  checkedPortfolioSnapshotId?: string;
  driftDetected: boolean;
  rebalancingNeeded: boolean;
  generatedPlanId?: string;
  executionId?: string;
  noOpReason?: string;
  failureReason?: string;
  rawResultJson: Record<string, unknown>;
  createdAt: string;
}

export interface RebalancingUserAcknowledgement {
  id: string;
  acknowledgementType: RebalancingAcknowledgementType;
  accepted: boolean;
  acceptedAt: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface UserProfile {
  id?: string;
  email?: string;
  name: string;
  targetReturn: number;
  riskTolerance: RiskTolerance;
  lossTolerance: number;
  riskScoreLimit: number;
  minCashRatio: number;
  monthlyInvestment: number;
  investmentHorizon: InvestmentHorizon;
  defaultAccountType: AccountType;
}

export interface Asset {
  id: string;
  userId?: string;
  assetName: string;
  assetType: AssetType;
  ticker?: string;
  market?: string;
  brokerName?: string;
  accountAlias?: string;
  externalConnectionId?: string;
  externalAssetId?: string;
  valuationAmount: number;
  currency: string;
  exchangeRate: number;
  valuationAmountKrw: number;
  quantity?: number;
  purchaseUnitPrice?: number;
  purchaseAmount?: number;
  purchaseDate?: string;
  incomeYield: number;
  expectedCapitalReturn: number;
  expectedReturn: number;
  priceChangeRate: number;
  priceChangePeriodType?: PriceChangePeriodType;
  priceChangeStartDate?: string;
  priceChangeEndDate?: string;
  priceChangeRateAnnualized: number;
  fxChangeRate: number;
  incomeTaxRate: number;
  capitalGainTaxRate: number;
  accountType: AccountType;
  riskLevel: RiskLevel;
  riskCoefficient: number;
  liquidityLevel: LiquidityLevel;
  liquidityScore: number;
  valuationSource?: ValuationSource;
  priceSource?: string;
  fxSource?: string;
  lastSyncedAt?: string;
  lastPriceUpdatedAt?: string;
  lastFxUpdatedAt?: string;
  isAutoImported?: boolean;
  userConfirmedAssetType?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssetTypeSetting {
  assetType: AssetType;
  label: string;
  defaultIncomeYield: number;
  defaultCapitalReturn: number;
  defaultExpectedReturn: number;
  riskCoefficient: number;
  riskLevel: RiskLevel;
  liquidityLevel: LiquidityLevel;
  liquidityScore: number;
  description: string;
  isActive: boolean;
}

export interface TargetAllocationItem {
  assetType: AssetType;
  targetRatio: number;
  minRatio?: number;
  maxRatio?: number;
}

export interface TargetAllocationTemplate {
  targetReturnBand: number;
  riskTolerance: RiskTolerance;
  expectedReturn: number;
  compositionRisk: number;
  templateVersion: string;
  isActive: boolean;
  allocations: TargetAllocationItem[];
}

export interface TargetAllocationResult {
  requestedTargetReturn: number;
  mappedBand: number;
  riskTolerance: RiskTolerance;
  expectedReturn: number;
  targetGap: number;
  compositionRisk: number;
  allocations: TargetAllocationItem[];
  warnings: string[];
  blocked: boolean;
  blockReason?: string;
  appliedMinCashAdjustment: boolean;
}

export interface AssetReturnDetail {
  assetId: string;
  assetName: string;
  assetType: AssetType;
  weight: number;
  expectedReturn: number;
  incomeYield: number;
  expectedCapitalReturn: number;
  afterTaxExpectedReturn: number;
  totalReturn: number;
  annualIncomeAmount: number;
}

export interface IllusionWarning {
  assetId: string;
  assetName: string;
  assetType: AssetType;
  level: Exclude<IllusionWarningLevel, "none">;
  incomeYield: number;
  totalReturn: number;
  priceChangeRateAnnualized: number;
  message: string;
}

export interface PortfolioReturnResult {
  totalAssetAmountKrw: number;
  expectedReturn: number;
  expectedCapitalReturn: number;
  incomeYield: number;
  annualIncomeAmount: number;
  monthlyIncomeAmount: number;
  afterTaxExpectedReturn: number;
  totalReturn: number;
  details: AssetReturnDetail[];
  illusionWarnings: IllusionWarning[];
}

export interface RiskScoreResult {
  totalScore: number;
  grade: RiskGrade;
  exceedsLimit: boolean;
  riskScoreLimit: number;
  cashRatio: number;
  components: {
    assetCompositionScore: number;
    concentrationScore: number;
    cashShortageScore: number;
    priceDeclineScore: number;
    fxExposureScore: number;
    liquidityRiskScore: number;
  };
  portfolioPriceChangeRate: number;
  foreignAssetRatio: number;
}

export interface RebalanceItem {
  assetType: AssetType;
  currentAmount: number;
  currentRatio: number;
  targetRatio: number;
  targetAmount: number;
  adjustmentAmount: number;
  gapRatio: number;
  hasAllocationGap: boolean;
}

export interface SnapshotItem extends RebalanceItem {
  minRatio: number;
  maxRatio: number;
  allocationGapStatus: AllocationGapStatus;
}

export interface RebalanceResult {
  totalAssetAmountKrw: number;
  items: RebalanceItem[];
  primaryStatus: RebalanceStatus;
  activeFlags: RebalanceStatus[];
  priorityAction: string;
  allocationGapExists: boolean;
  actionData: Record<string, unknown>;
}

export interface MonthlyAllocationItem {
  assetType: AssetType;
  amount: number;
  step: "cash_first" | "shortage_weighted" | "fallback_cash";
  shortageAmount: number;
  weight: number;
  reason: string;
}

export interface MonthlyAllocationResult {
  totalAllocated: number;
  cashFirstAllocated: number;
  shortageWeightedAllocated: number;
  remainingUnallocated: number;
  items: MonthlyAllocationItem[];
  cashShortageAmount: number;
}

export interface PortfolioReview {
  targetAllocation: TargetAllocationResult;
  returns: PortfolioReturnResult;
  risk: RiskScoreResult;
  rebalance: RebalanceResult;
  monthlyAllocation: MonthlyAllocationResult;
}

export interface StoredSnapshot {
  id: string;
  snapshotDate: string;
  totalAssetAmountKrw: number;
  targetReturn: number;
  referencePortfolioExpectedReturn: number;
  portfolioExpectedReturn: number;
  portfolioIncomeYield: number;
  portfolioIncomeAmount: number;
  monthlyIncomeAmount: number;
  afterTaxExpectedReturn: number;
  totalReturn: number;
  riskScore: number;
  riskScoreLimit: number;
  cashRatio: number;
  compositionRisk: number;
  targetGap: number;
  primaryStatus: RebalanceStatus;
  activeFlags: RebalanceStatus[];
  snapshotSource: SnapshotSource;
  isArchived: boolean;
  replacedBySnapshotId?: string;
  items: SnapshotItem[];
  createdAt: string;
}

export interface MonthlyReportDetail {
  assetChange: {
    current: number;
    previous?: number;
    changeAmount?: number;
    changeRate?: number;
  };
  returnChange: {
    currentExpectedReturn: number;
    previousExpectedReturn?: number;
    change?: number;
  };
  riskChange: {
    currentRiskScore: number;
    previousRiskScore?: number;
    change?: number;
  };
  allocationChanges: Array<{
    assetType: AssetType;
    currentRatio: number;
    previousRatio?: number;
    change?: number;
  }>;
  illusionWarningCount: number;
  rebalancingSuggestionIds: string[];
  monthlyAllocationPlanIds: string[];
  messages: string[];
}

export interface MonthlyReport {
  id: string;
  userId?: string;
  currentSnapshotId: string;
  previousSnapshotId?: string;
  reportMonth: string;
  totalAssetChangeAmount?: number;
  totalAssetChangeRate?: number;
  expectedReturnChange?: number;
  targetGapChange?: number;
  incomeAmountChange?: number;
  riskScoreChange?: number;
  cashRatioChange?: number;
  summary: string;
  detailJson: MonthlyReportDetail;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyAllocationPlan {
  id: string;
  userId?: string;
  snapshotId?: string;
  monthlyInvestmentAmount: number;
  cashFirstAmount: number;
  remainingInvestmentAmount: number;
  allocationData: MonthlyAllocationItem[];
  excludedAssetTypes: AssetType[];
  summary: string;
  status: SuggestionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RebalanceSuggestionRecord {
  id: string;
  userId?: string;
  snapshotId?: string;
  reportId?: string;
  suggestionType: RebalanceStatus;
  targetReturn: number;
  currentExpectedReturn: number;
  riskScore: number;
  cashRatio: number;
  summary: string;
  detail: string;
  actionData: Record<string, unknown>;
  status: SuggestionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl: string;
  isRead: boolean;
  priority: NotificationPriority;
  createdAt: string;
  readAt?: string;
}

export interface EmailLog {
  id: string;
  userId?: string;
  emailType: EmailType;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  status: EmailStatus;
  providerMessageId?: string;
  errorMessage?: string;
  createdAt: string;
  sentAt?: string;
}

export interface UserNotificationSettings {
  id: string;
  userId?: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  monthlyUpdateEnabled: boolean;
  monthlyReportEnabled: boolean;
  riskWarningEnabled: boolean;
  targetGapWarningEnabled: boolean;
  illusionWarningEnabled: boolean;
  updateDayOfMonth: number;
  createdAt: string;
  updatedAt: string;
}

export interface CsvImportJob {
  id: string;
  userId?: string;
  filename: string;
  importType?: CsvImportType;
  brokerName?: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warningRows: number;
  duplicateRows?: number;
  status: CsvImportStatus;
  errorSummary?: string;
  createdSnapshotId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CsvImportRow {
  id: string;
  importJobId: string;
  rowNumber: number;
  rawData: Record<string, string>;
  parsedData?: Partial<Asset>;
  mappedData?: Partial<Asset>;
  validationStatus: CsvRowValidationStatus;
  errors: string[];
  warnings: string[];
  duplicateStatus?: DuplicateAssetStatus;
  duplicateAssetId?: string;
  createdAssetId?: string;
  classificationSuggestion?: AssetClassificationResult;
  createdAt: string;
}

export interface MarketPriceSnapshot {
  id: string;
  ticker: string;
  market: string;
  currency: string;
  price: number;
  priceDate: string;
  source: string;
  fetchedAt: string;
  isDelayed: boolean;
  delayMinutes: number;
  rawData?: Record<string, unknown>;
  createdAt: string;
}

export interface FxRateSnapshot {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  rateDate: string;
  source: string;
  fetchedAt: string;
  isEstimated: boolean;
  rawData?: Record<string, unknown>;
  createdAt: string;
}

export interface AssetPriceLink {
  id: string;
  assetId: string;
  ticker: string;
  market: string;
  priceSource: string;
  fxSource?: string;
  autoPriceEnabled: boolean;
  autoFxEnabled: boolean;
  lastPriceUpdatedAt?: string;
  lastFxUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalAssetMapping {
  id: string;
  provider: string;
  externalAssetId: string;
  assetName: string;
  ticker?: string;
  market?: string;
  currency: string;
  rawAssetType?: string;
  mappedAssetType: AssetType;
  confidenceScore: number;
  mappingSource: MappingSource;
  userConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalConnection {
  id: string;
  userId?: string;
  providerType: ExternalProviderType;
  providerName: string;
  brokerName?: string;
  accountAlias?: string;
  accountIdentifierMasked?: string;
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  tokenPreview?: string;
  scopes: string[];
  status: ExternalConnectionStatus;
  consentAcceptedAt?: string;
  lastSyncedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalSyncLog {
  id: string;
  userId?: string;
  connectionId?: string;
  providerType: ExternalProviderType;
  providerName: string;
  syncType: ExternalSyncType;
  status: ExternalSyncStatus;
  startedAt: string;
  completedAt?: string;
  totalItems: number;
  successItems: number;
  failedItems: number;
  warningItems: number;
  errorMessage?: string;
  snapshotId?: string;
  rawSummary?: Record<string, unknown>;
}

export interface AssetClassificationResult {
  suggestedAssetType: AssetType;
  confidenceScore: number;
  reason: string;
}

export interface DataFreshnessWarning {
  type: DataFreshnessType;
  assetId?: string;
  assetName?: string;
  source?: string;
  fetchedAt?: string;
  stale: boolean;
  message: string;
}

export interface AppState {
  profile: UserProfile;
  assets: Asset[];
  snapshots: StoredSnapshot[];
  monthlyReports: MonthlyReport[];
  monthlyAllocationPlans: MonthlyAllocationPlan[];
  rebalanceSuggestions: RebalanceSuggestionRecord[];
  notifications: Notification[];
  emailLogs: EmailLog[];
  notificationSettings: UserNotificationSettings;
  csvImportJobs: CsvImportJob[];
  csvImportRows: CsvImportRow[];
  marketPriceSnapshots: MarketPriceSnapshot[];
  fxRateSnapshots: FxRateSnapshot[];
  assetPriceLinks: AssetPriceLink[];
  externalAssetMappings: ExternalAssetMapping[];
  externalConnections: ExternalConnection[];
  externalSyncLogs: ExternalSyncLog[];
  privateTradingFlags: PrivateTradingFlags;
  privateTradingRiskLimits: PrivateTradingRiskLimits;
  investorProfile: InvestorProfile;
  productUniverse: ProductUniverseItem[];
  recommendations: InstrumentRecommendation[];
  watchlist: WatchlistItem[];
  orderProposals: OrderProposal[];
  orderEventLogs: OrderEventLog[];
  tradingAuditLogs: TradingAuditLog[];
  tradingAcknowledgements: TradingAcknowledgement[];
  autoTradingRules: AutoTradingRule[];
  rebalancingPolicies: RebalancingPolicy[];
  rebalancingRules: RebalancingRule[];
  rebalancingSnapshots: RebalancingSnapshot[];
  rebalancingPlans: RebalancingPlan[];
  rebalancingPlanItems: RebalancingPlanItem[];
  rebalancingExecutions: RebalancingExecution[];
  rebalancingEvents: RebalancingEvent[];
  rebalancingAuditLogs: RebalancingAuditLog[];
  rebalancingSchedulerRuns: RebalancingSchedulerRun[];
  rebalancingUserAcknowledgements: RebalancingUserAcknowledgement[];
}
