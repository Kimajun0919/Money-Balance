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
}
