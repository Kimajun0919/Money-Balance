import type {
  AssetType,
  AssetTypeSetting,
  LiquidityLevel,
  RiskLevel,
  RiskTolerance
} from "@/lib/types";

export const ASSET_TYPE_ORDER: AssetType[] = [
  "cash",
  "savings",
  "govt_bond",
  "high_yield_bond",
  "dividend",
  "reit",
  "covered_call",
  "growth",
  "alternative",
  "etc"
];

export const CASH_EQUIVALENT_ASSET_TYPES: AssetType[] = ["cash", "savings"];

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
  very_high: "매우 높음"
};

export const LIQUIDITY_LEVEL_LABELS: Record<LiquidityLevel, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음"
};

export const RISK_TOLERANCE_LABELS: Record<RiskTolerance, string> = {
  conservative: "보수형",
  moderate: "중립형",
  growth: "성장형",
  aggressive: "공격형"
};

export const ASSET_TYPE_SETTINGS: Record<AssetType, AssetTypeSetting> = {
  cash: {
    assetType: "cash",
    label: "현금",
    defaultIncomeYield: 0.028,
    defaultCapitalReturn: 0,
    defaultExpectedReturn: 0.028,
    riskCoefficient: 0,
    riskLevel: "low",
    liquidityLevel: "high",
    liquidityScore: 0,
    description: "원화 현금, CMA, 파킹성 잔액",
    isActive: true
  },
  savings: {
    assetType: "savings",
    label: "예금·적금",
    defaultIncomeYield: 0.033,
    defaultCapitalReturn: 0,
    defaultExpectedReturn: 0.033,
    riskCoefficient: 0.05,
    riskLevel: "low",
    liquidityLevel: "medium",
    liquidityScore: 40,
    description: "정기예금과 적금 성격의 현금성 자산",
    isActive: true
  },
  govt_bond: {
    assetType: "govt_bond",
    label: "국공채",
    defaultIncomeYield: 0.038,
    defaultCapitalReturn: 0.005,
    defaultExpectedReturn: 0.043,
    riskCoefficient: 0.2,
    riskLevel: "medium",
    liquidityLevel: "medium",
    liquidityScore: 40,
    description: "국채 및 투자등급 채권 자산군",
    isActive: true
  },
  high_yield_bond: {
    assetType: "high_yield_bond",
    label: "하이일드채권",
    defaultIncomeYield: 0.075,
    defaultCapitalReturn: 0,
    defaultExpectedReturn: 0.075,
    riskCoefficient: 0.6,
    riskLevel: "high",
    liquidityLevel: "low",
    liquidityScore: 70,
    description: "신용위험이 높은 채권 자산군",
    isActive: true
  },
  dividend: {
    assetType: "dividend",
    label: "배당자산",
    defaultIncomeYield: 0.035,
    defaultCapitalReturn: 0.045,
    defaultExpectedReturn: 0.08,
    riskCoefficient: 0.55,
    riskLevel: "high",
    liquidityLevel: "medium",
    liquidityScore: 40,
    description: "배당주와 배당형 주식 자산군",
    isActive: true
  },
  reit: {
    assetType: "reit",
    label: "리츠",
    defaultIncomeYield: 0.05,
    defaultCapitalReturn: 0.025,
    defaultExpectedReturn: 0.075,
    riskCoefficient: 0.6,
    riskLevel: "high",
    liquidityLevel: "low",
    liquidityScore: 70,
    description: "부동산 임대수익 기반 상장 리츠 자산군",
    isActive: true
  },
  covered_call: {
    assetType: "covered_call",
    label: "커버드콜",
    defaultIncomeYield: 0.1,
    defaultCapitalReturn: -0.015,
    defaultExpectedReturn: 0.085,
    riskCoefficient: 0.65,
    riskLevel: "high",
    liquidityLevel: "low",
    liquidityScore: 70,
    description: "높은 인컴수익률과 가격 하락 가능성을 함께 보는 자산군",
    isActive: true
  },
  growth: {
    assetType: "growth",
    label: "성장자산",
    defaultIncomeYield: 0.01,
    defaultCapitalReturn: 0.09,
    defaultExpectedReturn: 0.1,
    riskCoefficient: 0.9,
    riskLevel: "very_high",
    liquidityLevel: "medium",
    liquidityScore: 40,
    description: "주식형 성장 자산군",
    isActive: true
  },
  alternative: {
    assetType: "alternative",
    label: "대체자산",
    defaultIncomeYield: 0.005,
    defaultCapitalReturn: 0.045,
    defaultExpectedReturn: 0.05,
    riskCoefficient: 0.55,
    riskLevel: "high",
    liquidityLevel: "low",
    liquidityScore: 70,
    description: "금, 달러, 원자재 등 대체 성격의 자산군",
    isActive: true
  },
  etc: {
    assetType: "etc",
    label: "기타",
    defaultIncomeYield: 0.02,
    defaultCapitalReturn: 0.02,
    defaultExpectedReturn: 0.04,
    riskCoefficient: 0.5,
    riskLevel: "medium",
    liquidityLevel: "medium",
    liquidityScore: 40,
    description: "사용자가 직접 성격을 정하는 자산군",
    isActive: true
  }
};

export function getAssetTypeSetting(assetType: AssetType): AssetTypeSetting {
  return ASSET_TYPE_SETTINGS[assetType];
}
