import { REQUIRED_DISCLAIMER } from "@/lib/constants/disclaimer";
import type { MonthlyReport } from "@/lib/types";

export function monthlyReportReadyTemplate(report?: MonthlyReport) {
  const reportMonth = report?.reportMonth ?? "이번 달";
  const subject = `Yield Balance ${reportMonth} 월간 리포트 안내`;
  const summary =
    report?.summary ??
    "월간 리포트가 생성되었습니다. 총자산, 위험점수, 목표 괴리 변화를 확인할 수 있습니다.";
  const bodyText = [
    "안녕하세요.",
    "",
    `Yield Balance ${reportMonth} 월간 리포트가 생성되었습니다.`,
    "",
    summary,
    "",
    "리포트 확인하기: /reports",
    "",
    REQUIRED_DISCLAIMER
  ].join("\n");

  return {
    subject,
    bodyText,
    bodyHtml: `<p>안녕하세요.</p><p>Yield Balance ${reportMonth} 월간 리포트가 생성되었습니다.</p><p>${summary}</p><p><a href="/reports">리포트 확인하기</a></p><p>${REQUIRED_DISCLAIMER}</p>`
  };
}
