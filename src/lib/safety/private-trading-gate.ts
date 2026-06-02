import type { PrivateTradingFlags } from "@/lib/types";

export const PRIVATE_TRADING_FLAGS: PrivateTradingFlags = {
  privateUseMode: true,
  publicReleaseMode: false,
  recommendationsEnabled: true,
  paperTradingEnabled: true,
  brokerSandboxEnabled: true,
  liveTradingEnabled: false,
  autoTradingEnabled: false,
  rebalancingEnabled: true,
  autoRebalancingEnabled: false,
  paperRebalancingEnabled: true,
  sandboxRebalancingEnabled: true,
  liveRebalancingEnabled: false,
  brokerOrderApiConfigured: false,
  brokerConnectionActive: false,
  userTradingConsentAccepted: false,
  userAutoTradingConsentAccepted: false,
  userRebalancingConsentAccepted: false,
  userAutoRebalancingConsentAccepted: false,
  riskProfileCompleted: false,
  principalLossAcknowledged: false,
  autoTradingRiskAcknowledged: false,
  autoRebalancingRiskAcknowledged: false,
  killSwitchActive: false,
  updatedAt: "1970-01-01T00:00:00.000Z"
};

export interface PrivateTradingGateResult {
  allowed: boolean;
  reasons: string[];
}

function gateResult(reasons: string[]): PrivateTradingGateResult {
  return {
    allowed: reasons.length === 0,
    reasons
  };
}

export function evaluateRecommendationGate(
  flags: PrivateTradingFlags
): PrivateTradingGateResult {
  const reasons: string[] = [];

  if (!flags.privateUseMode) reasons.push("개인 사용 모드가 꺼져 있습니다.");
  if (flags.publicReleaseMode) reasons.push("공개 서비스 모드에서는 차단됩니다.");
  if (!flags.recommendationsEnabled) {
    reasons.push("추천 기능이 꺼져 있습니다.");
  }
  if (!flags.riskProfileCompleted) {
    reasons.push("투자자 프로필 확인이 필요합니다.");
  }
  if (!flags.principalLossAcknowledged) {
    reasons.push("원금 손실 가능성 확인이 필요합니다.");
  }
  if (flags.killSwitchActive) {
    reasons.push("중지 스위치가 활성화되어 있습니다.");
  }

  return gateResult(reasons);
}

export function evaluatePaperTradingGate(
  flags: PrivateTradingFlags,
  tradeRiskCheckPassed: boolean
): PrivateTradingGateResult {
  const reasons: string[] = [];

  if (!flags.privateUseMode) reasons.push("개인 사용 모드가 꺼져 있습니다.");
  if (!flags.paperTradingEnabled) reasons.push("모의투자가 꺼져 있습니다.");
  if (flags.killSwitchActive) {
    reasons.push("중지 스위치가 활성화되어 있습니다.");
  }
  if (!tradeRiskCheckPassed) {
    reasons.push("거래 위험 점검을 통과하지 못했습니다.");
  }

  return gateResult(reasons);
}

export function evaluateBrokerSandboxGate(
  flags: PrivateTradingFlags,
  tradeRiskCheckPassed: boolean
): PrivateTradingGateResult {
  const reasons: string[] = [];

  if (!flags.privateUseMode) reasons.push("개인 사용 모드가 꺼져 있습니다.");
  if (!flags.brokerSandboxEnabled) {
    reasons.push("증권사 샌드박스 모드가 꺼져 있습니다.");
  }
  if (!flags.brokerOrderApiConfigured) {
    reasons.push("주문 API 설정이 없습니다.");
  }
  if (!flags.brokerConnectionActive) {
    reasons.push("활성 증권사 연결이 없습니다.");
  }
  if (flags.killSwitchActive) {
    reasons.push("중지 스위치가 활성화되어 있습니다.");
  }
  if (!tradeRiskCheckPassed) {
    reasons.push("거래 위험 점검을 통과하지 못했습니다.");
  }

  return gateResult(reasons);
}

export function evaluateLiveTradingGate(
  flags: PrivateTradingFlags,
  params: {
    tradeRiskCheckPassed: boolean;
    userConfirmedOrder: boolean;
  }
): PrivateTradingGateResult {
  const reasons: string[] = [];

  if (!flags.privateUseMode) reasons.push("개인 사용 모드가 꺼져 있습니다.");
  if (!flags.liveTradingEnabled) reasons.push("실거래 기능이 꺼져 있습니다.");
  if (!flags.brokerOrderApiConfigured) {
    reasons.push("주문 API 설정이 없습니다.");
  }
  if (!flags.brokerConnectionActive) {
    reasons.push("활성 증권사 연결이 없습니다.");
  }
  if (!flags.userTradingConsentAccepted) {
    reasons.push("실거래 사용자 확인이 필요합니다.");
  }
  if (!flags.principalLossAcknowledged) {
    reasons.push("원금 손실 가능성 확인이 필요합니다.");
  }
  if (flags.killSwitchActive) {
    reasons.push("중지 스위치가 활성화되어 있습니다.");
  }
  if (!params.tradeRiskCheckPassed) {
    reasons.push("거래 위험 점검을 통과하지 못했습니다.");
  }
  if (!params.userConfirmedOrder) {
    reasons.push("주문별 최종 확인이 필요합니다.");
  }

  return gateResult(reasons);
}

export function evaluateAutoTradingGate(
  flags: PrivateTradingFlags,
  params: {
    strategyRiskLimitsPassed: boolean;
    tradeRiskCheckPassed: boolean;
  }
): PrivateTradingGateResult {
  const reasons: string[] = [];

  if (!flags.privateUseMode) reasons.push("개인 사용 모드가 꺼져 있습니다.");
  if (!flags.autoTradingEnabled) reasons.push("자동매매 기능이 꺼져 있습니다.");
  if (!flags.userAutoTradingConsentAccepted) {
    reasons.push("자동매매 사용자 확인이 필요합니다.");
  }
  if (!flags.autoTradingRiskAcknowledged) {
    reasons.push("자동매매 위험 확인이 필요합니다.");
  }
  if (!flags.brokerConnectionActive) {
    reasons.push("활성 증권사 연결이 없습니다.");
  }
  if (!flags.brokerOrderApiConfigured) {
    reasons.push("주문 API 설정이 없습니다.");
  }
  if (flags.killSwitchActive) {
    reasons.push("중지 스위치가 활성화되어 있습니다.");
  }
  if (!params.strategyRiskLimitsPassed) {
    reasons.push("전략별 위험 한도를 통과하지 못했습니다.");
  }
  if (!params.tradeRiskCheckPassed) {
    reasons.push("거래 위험 점검을 통과하지 못했습니다.");
  }

  return gateResult(reasons);
}

export function evaluateRebalancingAnalysisGate(
  flags: PrivateTradingFlags
): PrivateTradingGateResult {
  const reasons: string[] = [];

  if (!flags.privateUseMode) reasons.push("개인 사용 모드가 꺼져 있습니다.");
  if (flags.publicReleaseMode) reasons.push("공개 서비스 모드에서는 차단됩니다.");
  if (!flags.rebalancingEnabled) {
    reasons.push("리밸런싱 기능이 꺼져 있습니다.");
  }
  if (!flags.riskProfileCompleted) {
    reasons.push("투자자 프로필 확인이 필요합니다.");
  }
  if (flags.killSwitchActive) {
    reasons.push("중지 스위치가 활성화되어 있습니다.");
  }

  return gateResult(reasons);
}

export function evaluatePaperRebalancingGate(
  flags: PrivateTradingFlags,
  riskCheckPassed: boolean
): PrivateTradingGateResult {
  const reasons: string[] = [];

  if (!flags.privateUseMode) reasons.push("개인 사용 모드가 꺼져 있습니다.");
  if (!flags.rebalancingEnabled) {
    reasons.push("리밸런싱 기능이 꺼져 있습니다.");
  }
  if (!flags.paperRebalancingEnabled || !flags.paperTradingEnabled) {
    reasons.push("모의 리밸런싱 기능이 꺼져 있습니다.");
  }
  if (flags.killSwitchActive) {
    reasons.push("중지 스위치가 활성화되어 있습니다.");
  }
  if (!riskCheckPassed) {
    reasons.push("리밸런싱 위험 점검을 통과하지 못했습니다.");
  }

  return gateResult(reasons);
}

export function evaluateSandboxRebalancingGate(
  flags: PrivateTradingFlags,
  riskCheckPassed: boolean
): PrivateTradingGateResult {
  const reasons: string[] = [];

  if (!flags.privateUseMode) reasons.push("개인 사용 모드가 꺼져 있습니다.");
  if (!flags.rebalancingEnabled) {
    reasons.push("리밸런싱 기능이 꺼져 있습니다.");
  }
  if (!flags.sandboxRebalancingEnabled || !flags.brokerSandboxEnabled) {
    reasons.push("샌드박스 리밸런싱 기능이 꺼져 있습니다.");
  }
  if (!flags.brokerOrderApiConfigured) {
    reasons.push("주문 API 설정이 없습니다.");
  }
  if (flags.killSwitchActive) {
    reasons.push("중지 스위치가 활성화되어 있습니다.");
  }
  if (!riskCheckPassed) {
    reasons.push("리밸런싱 위험 점검을 통과하지 못했습니다.");
  }

  return gateResult(reasons);
}

export function evaluateLiveManualRebalancingGate(
  flags: PrivateTradingFlags,
  riskCheckPassed: boolean
): PrivateTradingGateResult {
  const reasons: string[] = [];

  if (!flags.privateUseMode) reasons.push("개인 사용 모드가 꺼져 있습니다.");
  if (!flags.rebalancingEnabled) {
    reasons.push("리밸런싱 기능이 꺼져 있습니다.");
  }
  if (!flags.liveRebalancingEnabled || !flags.liveTradingEnabled) {
    reasons.push("실거래 리밸런싱은 현재 비활성화되어 있습니다.");
  }
  if (!flags.brokerOrderApiConfigured) {
    reasons.push("주문 API 설정이 없습니다.");
  }
  if (!flags.brokerConnectionActive) {
    reasons.push("활성 증권사 연결이 없습니다.");
  }
  if (!flags.userTradingConsentAccepted) {
    reasons.push("실거래 사용자 확인이 필요합니다.");
  }
  if (!flags.userRebalancingConsentAccepted) {
    reasons.push("리밸런싱 사용자 확인이 필요합니다.");
  }
  if (!flags.principalLossAcknowledged) {
    reasons.push("원금 손실 가능성 확인이 필요합니다.");
  }
  if (flags.killSwitchActive) {
    reasons.push("중지 스위치가 활성화되어 있습니다.");
  }
  if (!riskCheckPassed) {
    reasons.push("리밸런싱 위험 점검을 통과하지 못했습니다.");
  }

  return gateResult(reasons);
}

export function evaluateLiveAutoRebalancingGate(
  flags: PrivateTradingFlags,
  params: {
    strategyRiskLimitsPassed: boolean;
    riskCheckPassed: boolean;
  }
): PrivateTradingGateResult {
  const reasons: string[] = [];

  if (!flags.privateUseMode) reasons.push("개인 사용 모드가 꺼져 있습니다.");
  if (!flags.rebalancingEnabled) {
    reasons.push("리밸런싱 기능이 꺼져 있습니다.");
  }
  if (!flags.liveRebalancingEnabled || !flags.autoRebalancingEnabled) {
    reasons.push("자동 실거래 리밸런싱은 현재 비활성화되어 있습니다.");
  }
  if (!flags.liveTradingEnabled || !flags.autoTradingEnabled) {
    reasons.push("실거래 또는 자동매매 기능이 꺼져 있습니다.");
  }
  if (!flags.brokerOrderApiConfigured || !flags.brokerConnectionActive) {
    reasons.push("활성 주문 API 연결이 필요합니다.");
  }
  if (
    !flags.userTradingConsentAccepted ||
    !flags.userAutoTradingConsentAccepted ||
    !flags.userRebalancingConsentAccepted ||
    !flags.userAutoRebalancingConsentAccepted
  ) {
    reasons.push("실거래 자동 리밸런싱 사용자 확인이 필요합니다.");
  }
  if (
    !flags.principalLossAcknowledged ||
    !flags.autoTradingRiskAcknowledged ||
    !flags.autoRebalancingRiskAcknowledged
  ) {
    reasons.push("자동 리밸런싱 위험 확인이 필요합니다.");
  }
  if (flags.killSwitchActive) {
    reasons.push("중지 스위치가 활성화되어 있습니다.");
  }
  if (!params.strategyRiskLimitsPassed) {
    reasons.push("자동 리밸런싱 규칙 한도를 통과하지 못했습니다.");
  }
  if (!params.riskCheckPassed) {
    reasons.push("리밸런싱 위험 점검을 통과하지 못했습니다.");
  }

  return gateResult(reasons);
}
