import { logKpiEvent } from "@/lib/kpi/event-logger";
import type { AppState, EmailLog, EmailType, MonthlyReport } from "@/lib/types";
import { createId } from "@/lib/services/service-utils";
import { cashShortageWarningTemplate } from "@/lib/emails/templates/cash-shortage-warning";
import { illusionWarningTemplate } from "@/lib/emails/templates/illusion-warning";
import { monthlyReportReadyTemplate } from "@/lib/emails/templates/monthly-report-ready";
import { monthlyUpdateReminderTemplate } from "@/lib/emails/templates/monthly-update-reminder";
import { riskScoreWarningTemplate } from "@/lib/emails/templates/risk-score-warning";
import { targetGapWarningTemplate } from "@/lib/emails/templates/target-gap-warning";

export function renderEmailTemplate(
  emailType: EmailType,
  context: { report?: MonthlyReport } = {}
) {
  switch (emailType) {
    case "monthly_update_reminder":
      return monthlyUpdateReminderTemplate();
    case "monthly_report_ready":
      return monthlyReportReadyTemplate(context.report);
    case "cash_shortage_warning":
      return cashShortageWarningTemplate();
    case "risk_score_warning":
      return riskScoreWarningTemplate();
    case "target_gap_warning":
      return targetGapWarningTemplate();
    case "illusion_warning":
      return illusionWarningTemplate();
  }
}

export function sendEmail(
  state: AppState,
  params: {
    emailType: EmailType;
    toEmail?: string;
    report?: MonthlyReport;
  }
): { state: AppState; emailLog: EmailLog } {
  const now = new Date().toISOString();
  const template = renderEmailTemplate(params.emailType, {
    report: params.report
  });
  const toEmail = params.toEmail ?? state.profile.email ?? "";
  const disabled = !state.notificationSettings.emailEnabled || !toEmail;
  const emailLog: EmailLog = {
    id: createId("email"),
    emailType: params.emailType,
    toEmail,
    subject: template.subject,
    bodyHtml: template.bodyHtml,
    bodyText: template.bodyText,
    status: disabled ? "skipped" : "mock_sent",
    providerMessageId: disabled ? undefined : createId("mock"),
    errorMessage: disabled
      ? "이메일 알림이 비활성화되어 발송하지 않았습니다."
      : undefined,
    createdAt: now,
    sentAt: disabled ? undefined : now
  };

  if (disabled) {
    logKpiEvent("email_failed", {
      emailType: params.emailType,
      reason: "disabled_or_missing_email"
    });
  } else {
    logKpiEvent("email_mock_sent", {
      emailType: params.emailType,
      toEmail
    });
    if (process.env.NODE_ENV !== "production") {
      console.info("[Yield Balance 이메일 mock]", template.subject, toEmail);
    }
  }

  return {
    state: {
      ...state,
      emailLogs: [emailLog, ...state.emailLogs]
    },
    emailLog
  };
}
