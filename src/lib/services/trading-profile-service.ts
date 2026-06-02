import type {
  AppState,
  InvestorProfile,
  PrivateTradingFlags,
  TradingAcknowledgement,
  TradingAcknowledgementType
} from "@/lib/types";
import { createId } from "@/lib/services/service-utils";
import { appendTradingAuditLog } from "@/lib/services/trading-audit-service";

export const TRADING_ACKNOWLEDGEMENT_TEXT: Record<
  TradingAcknowledgementType,
  string
> = {
  risk_profile: "투자자 프로필과 위험 한도를 개인 사용 목적으로 확인했습니다.",
  principal_loss:
    "투자 수익은 보장되지 않으며 원금 손실 가능성이 있음을 확인했습니다.",
  live_trading:
    "실제 주문의 종목, 수량, 가격, 수수료, 현금 영향을 직접 확인하고 최종 책임이 본인에게 있음을 확인했습니다.",
  auto_trading:
    "자동매매는 직접 설정한 조건과 한도 안에서만 작동하며 언제든 중지할 수 있음을 확인했습니다."
};

export function completeInvestorProfile(
  state: AppState,
  updates: Partial<InvestorProfile>
): AppState {
  const now = new Date().toISOString();
  const investorProfile: InvestorProfile = {
    ...state.investorProfile,
    ...updates,
    riskProfileCompleted: true,
    completedAt: state.investorProfile.completedAt ?? now,
    updatedAt: now
  };
  const nextState: AppState = {
    ...state,
    investorProfile,
    privateTradingFlags: {
      ...state.privateTradingFlags,
      riskProfileCompleted: true,
      updatedAt: now
    }
  };

  return appendTradingAuditLog(nextState, {
    eventType: "investor_profile_completed",
    entityType: "investor_profile",
    entityId: investorProfile.id,
    summary: "투자자 프로필을 확인했습니다.",
    metadata: {
      experienceLevel: investorProfile.experienceLevel,
      investmentObjective: investorProfile.investmentObjective
    },
    createdAt: now
  });
}

export function acceptTradingAcknowledgement(
  state: AppState,
  acknowledgementType: TradingAcknowledgementType
): AppState {
  const now = new Date().toISOString();
  const text = TRADING_ACKNOWLEDGEMENT_TEXT[acknowledgementType];
  const acknowledgement: TradingAcknowledgement = {
    id: createId("ack"),
    acknowledgementType,
    text,
    acceptedAt: now
  };
  const flagUpdates: Partial<PrivateTradingFlags> = {};

  if (acknowledgementType === "risk_profile") {
    flagUpdates.riskProfileCompleted = true;
  }
  if (acknowledgementType === "principal_loss") {
    flagUpdates.principalLossAcknowledged = true;
  }
  if (acknowledgementType === "live_trading") {
    flagUpdates.userTradingConsentAccepted = true;
  }
  if (acknowledgementType === "auto_trading") {
    flagUpdates.userAutoTradingConsentAccepted = true;
    flagUpdates.autoTradingRiskAcknowledged = true;
  }

  const nextState: AppState = {
    ...state,
    tradingAcknowledgements: [acknowledgement, ...state.tradingAcknowledgements],
    privateTradingFlags: {
      ...state.privateTradingFlags,
      ...flagUpdates,
      updatedAt: now
    }
  };

  return appendTradingAuditLog(nextState, {
    eventType: "trading_acknowledgement_accepted",
    entityType: "trading_acknowledgement",
    entityId: acknowledgement.id,
    summary: "개인 거래 확인 문구를 저장했습니다.",
    metadata: { acknowledgementType },
    createdAt: now
  });
}

export function setLiveTradingEnabled(
  state: AppState,
  enabled: boolean
): AppState {
  const now = new Date().toISOString();
  const canEnable =
    !enabled ||
    (state.privateTradingFlags.userTradingConsentAccepted &&
      state.privateTradingFlags.principalLossAcknowledged);

  return {
    ...state,
    privateTradingFlags: {
      ...state.privateTradingFlags,
      liveTradingEnabled: canEnable ? enabled : false,
      updatedAt: now
    }
  };
}

export function setAutoTradingEnabled(
  state: AppState,
  enabled: boolean
): AppState {
  const now = new Date().toISOString();
  const canEnable =
    !enabled ||
    (state.privateTradingFlags.userAutoTradingConsentAccepted &&
      state.privateTradingFlags.autoTradingRiskAcknowledged);

  return {
    ...state,
    privateTradingFlags: {
      ...state.privateTradingFlags,
      autoTradingEnabled: canEnable ? enabled : false,
      updatedAt: now
    }
  };
}

export function setBrokerOrderConnectionActive(
  state: AppState,
  active: boolean
): AppState {
  const now = new Date().toISOString();

  return {
    ...state,
    privateTradingFlags: {
      ...state.privateTradingFlags,
      brokerOrderApiConfigured: active,
      brokerConnectionActive: active,
      updatedAt: now
    }
  };
}

export function activateKillSwitch(state: AppState): AppState {
  const now = new Date().toISOString();
  const nextState: AppState = {
    ...state,
    privateTradingFlags: {
      ...state.privateTradingFlags,
      killSwitchActive: true,
      liveTradingEnabled: false,
      autoTradingEnabled: false,
      updatedAt: now
    },
    autoTradingRules: state.autoTradingRules.map((rule) => ({
      ...rule,
      enabled: false,
      status: "disabled",
      updatedAt: now
    }))
  };

  return appendTradingAuditLog(nextState, {
    eventType: "kill_switch_activated",
    summary: "중지 스위치를 활성화했습니다.",
    metadata: {},
    createdAt: now
  });
}

export function deactivateKillSwitch(state: AppState): AppState {
  const now = new Date().toISOString();
  const nextState: AppState = {
    ...state,
    privateTradingFlags: {
      ...state.privateTradingFlags,
      killSwitchActive: false,
      updatedAt: now
    }
  };

  return appendTradingAuditLog(nextState, {
    eventType: "kill_switch_deactivated",
    summary: "중지 스위치를 해제했습니다.",
    metadata: {},
    createdAt: now
  });
}
