import type {
  AccountType,
  IllusionWarningLevel,
  InvestmentHorizon,
  RebalanceStatus,
  RiskGrade
} from "@/lib/types";

export const INVESTMENT_HORIZON_LABELS: Record<InvestmentHorizon, string> = {
  under_1y: "1년 미만",
  one_to_three: "1~3년",
  three_to_five: "3~5년",
  five_plus: "5년 이상"
};

export const LOSS_TOLERANCE_LABELS: Record<string, string> = {
  "-0.05": "-5%",
  "-0.1": "-10%",
  "-0.2": "-20%",
  "-0.3": "-30% 이상"
};

export const ACCOUNT_LABELS: Record<AccountType, string> = {
  general: "일반",
  isa: "ISA",
  pension: "연금",
  irp: "IRP",
  tax_free: "비과세",
  unknown: "미정"
};

export const STATUS_LABELS: Record<RebalanceStatus, string> = {
  cash_shortage: "현금성 부족",
  risk_excess: "위험 초과",
  illusion_warning: "고분배 착시",
  allocation_gap: "배분 차이",
  return_gap: "목표 괴리",
  maintain: "유지"
};

export const RISK_GRADE_LABELS: Record<RiskGrade, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
  very_high: "매우 높음"
};

export const ILLUSION_LEVEL_LABELS: Record<
  Exclude<IllusionWarningLevel, "none">,
  string
> = {
  caution: "주의",
  warning: "경고",
  danger: "위험"
};
