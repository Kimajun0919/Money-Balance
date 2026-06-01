import { logKpiEvent } from "@/lib/kpi/event-logger";
import type {
  AppState,
  Notification,
  NotificationPriority,
  NotificationType,
  PortfolioReview,
  StoredSnapshot
} from "@/lib/types";
import { createId } from "@/lib/services/service-utils";
import { formatPoint } from "@/lib/utils/percentage";

const notificationCopy: Record<
  NotificationType,
  {
    title: string;
    linkUrl: string;
    priority: NotificationPriority;
  }
> = {
  monthly_update_request: {
    title: "월간 자산 업데이트 필요",
    linkUrl: "/assets",
    priority: "medium"
  },
  cash_shortage: {
    title: "현금성 자산 비중 확인",
    linkUrl: "/rebalance",
    priority: "high"
  },
  risk_score_excess: {
    title: "위험점수 상한 초과",
    linkUrl: "/rebalance",
    priority: "critical"
  },
  target_gap_warning: {
    title: "목표 괴리 확인",
    linkUrl: "/target-portfolio",
    priority: "high"
  },
  illusion_warning: {
    title: "고분배 착시 확인",
    linkUrl: "/dashboard",
    priority: "high"
  },
  rebalancing_needed: {
    title: "자산군 비중 점검 필요",
    linkUrl: "/rebalance",
    priority: "medium"
  },
  report_ready: {
    title: "월간 리포트 생성 완료",
    linkUrl: "/reports",
    priority: "low"
  }
};

export function createNotification(
  state: AppState,
  params: {
    type: NotificationType;
    message: string;
    linkUrl?: string;
    priority?: NotificationPriority;
  }
): { state: AppState; notification?: Notification } {
  if (!state.notificationSettings.inAppEnabled) {
    return { state };
  }

  const base = notificationCopy[params.type];
  const notification: Notification = {
    id: createId("noti"),
    type: params.type,
    title: base.title,
    message: params.message,
    linkUrl: params.linkUrl ?? base.linkUrl,
    isRead: false,
    priority: params.priority ?? base.priority,
    createdAt: new Date().toISOString()
  };

  return {
    state: {
      ...state,
      notifications: [notification, ...state.notifications]
    },
    notification
  };
}

export function generateNotificationsFromSnapshot(params: {
  state: AppState;
  snapshot: StoredSnapshot;
  review: PortfolioReview;
  reportId?: string;
}) {
  let nextState = params.state;
  const settings = nextState.notificationSettings;

  if (settings.monthlyReportEnabled && params.reportId) {
    nextState = createNotification(nextState, {
      type: "report_ready",
      linkUrl: `/reports/${params.reportId}`,
      message:
        "이번 달 월간 리포트가 생성되었습니다. 총자산, 위험점수, 목표 괴리 변화를 확인해 보세요."
    }).state;
  }

  if (
    settings.monthlyUpdateEnabled &&
    new Date().getDate() >= settings.updateDayOfMonth
  ) {
    nextState = createNotification(nextState, {
      type: "monthly_update_request",
      message:
        "이번 달 자산 업데이트가 필요합니다. 최신 자산 정보를 입력하고 월간 스냅샷을 저장해 주세요."
    }).state;
  }

  if (params.snapshot.cashRatio < params.state.profile.minCashRatio) {
    nextState = createNotification(nextState, {
      type: "cash_shortage",
      message:
        "현금성 자산 비중이 최소 기준보다 낮습니다. 신규 투자금은 현금성 자산 확보를 먼저 고려할 수 있습니다."
    }).state;
  }

  if (
    settings.riskWarningEnabled &&
    params.snapshot.riskScore > params.snapshot.riskScoreLimit
  ) {
    nextState = createNotification(nextState, {
      type: "risk_score_excess",
      message:
        "현재 포트폴리오의 위험점수가 허용 상한을 초과했습니다. 고위험 자산군 비중을 먼저 점검해야 합니다."
    }).state;
  }

  if (
    settings.targetGapWarningEnabled &&
    params.snapshot.targetGap >= 0.02
  ) {
    nextState = createNotification(nextState, {
      type: "target_gap_warning",
      message: `목표수익률과 기준 기대수익률 사이에 ${formatPoint(
        params.snapshot.targetGap
      )}의 괴리가 있습니다.`
    }).state;
  }

  if (
    settings.illusionWarningEnabled &&
    params.review.returns.illusionWarnings.length > 0
  ) {
    nextState = createNotification(nextState, {
      type: "illusion_warning",
      message:
        "인컴수익률이 높지만 총수익률이 낮은 자산군이 있습니다. 분배금만 기준으로 판단하지 않도록 확인이 필요합니다."
    }).state;
  }

  if (params.snapshot.activeFlags.includes("allocation_gap")) {
    nextState = createNotification(nextState, {
      type: "rebalancing_needed",
      message:
        "목표비중과 현재비중 차이가 큰 자산군이 있습니다. 자산군 단위 조정 참고 금액을 확인해 주세요."
    }).state;
  }

  return nextState;
}

export function markNotificationRead(
  state: AppState,
  notificationId: string
): AppState {
  const now = new Date().toISOString();
  logKpiEvent("notification_marked_read", { notificationId });

  return {
    ...state,
    notifications: state.notifications.map((notification) =>
      notification.id === notificationId
        ? { ...notification, isRead: true, readAt: now }
        : notification
    )
  };
}

export function markAllNotificationsRead(state: AppState): AppState {
  const now = new Date().toISOString();
  return {
    ...state,
    notifications: state.notifications.map((notification) => ({
      ...notification,
      isRead: true,
      readAt: notification.readAt ?? now
    }))
  };
}

export function updateNotificationSettings(
  state: AppState,
  nextSettings: Partial<AppState["notificationSettings"]>
): AppState {
  return {
    ...state,
    notificationSettings: {
      ...state.notificationSettings,
      ...nextSettings,
      updatedAt: new Date().toISOString()
    }
  };
}
