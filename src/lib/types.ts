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
  items: RebalanceItem[];
  createdAt: string;
}

export interface AppState {
  profile: UserProfile;
  assets: Asset[];
  snapshots: StoredSnapshot[];
}
