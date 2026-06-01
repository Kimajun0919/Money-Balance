import type { RiskTolerance, UserProfile } from "@/lib/types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateOnboardingInput(
  profile: UserProfile
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (profile.targetReturn <= 0 || profile.targetReturn > 0.2) {
    errors.push("목표수익률은 0% 초과 20% 이하로 입력해야 합니다.");
  }

  if (profile.minCashRatio < 0.05 || profile.minCashRatio > 0.5) {
    errors.push("최소 현금성 자산 비중은 5% 이상 50% 이하로 입력해야 합니다.");
  }

  if (profile.monthlyInvestment < 0) {
    errors.push("월 신규 투자금은 음수로 입력할 수 없습니다.");
  }

  if (profile.targetReturn >= 0.12 && blocksTwelvePercentBand(profile.riskTolerance)) {
    errors.push("보수형 또는 중립형은 12% 이상 목표수익률 배분표를 적용할 수 없습니다.");
  }

  if (profile.targetReturn >= 0.1) {
    warnings.push("목표수익률이 높아질수록 손실 가능성과 목표 괴리를 함께 확인해야 합니다.");
  }

  if (Math.abs(profile.lossTolerance) <= 0.05 && profile.targetReturn >= 0.1) {
    warnings.push("손실 허용폭이 낮아 위험점수 상한을 먼저 확인해야 합니다.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function blocksTwelvePercentBand(riskTolerance: RiskTolerance) {
  return riskTolerance === "conservative" || riskTolerance === "moderate";
}
