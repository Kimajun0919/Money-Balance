import type {
  AccountType,
  CsvImportStatus,
  EmailStatus,
  IllusionWarningLevel,
  InvestmentHorizon,
  NotificationPriority,
  NotificationType,
  PeriodFilter,
  RebalanceStatus,
  RiskGrade,
  SnapshotSource,
  SuggestionStatus
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

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  suggested: "제안",
  viewed: "확인",
  deferred: "보류",
  applied: "반영"
};

export const SNAPSHOT_SOURCE_LABELS: Record<SnapshotSource, string> = {
  manual: "수동 저장",
  reminder_based: "알림 기반",
  imported: "CSV 가져오기",
  system_generated: "시스템 생성"
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  monthly_update_request: "월간 업데이트",
  cash_shortage: "현금성 부족",
  risk_score_excess: "위험 초과",
  target_gap_warning: "목표 괴리",
  illusion_warning: "고분배 착시",
  rebalancing_needed: "리밸런싱 필요",
  report_ready: "리포트 생성"
};

export const NOTIFICATION_PRIORITY_LABELS: Record<NotificationPriority, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
  critical: "긴급"
};

export const PERIOD_FILTER_LABELS: Record<PeriodFilter, string> = {
  "3m": "최근 3개월",
  "6m": "최근 6개월",
  "12m": "최근 12개월",
  all: "전체"
};

export const EMAIL_STATUS_LABELS: Record<EmailStatus, string> = {
  pending: "대기",
  sent: "발송",
  failed: "실패",
  skipped: "건너뜀",
  mock_sent: "모의 발송"
};

export const CSV_IMPORT_STATUS_LABELS: Record<CsvImportStatus, string> = {
  uploaded: "업로드",
  parsed: "파싱",
  validated: "검증 완료",
  imported: "가져오기 완료",
  failed: "실패",
  canceled: "취소"
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
