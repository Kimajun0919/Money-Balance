"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { getReportList } from "@/lib/services/report-service";
import { sendEmail } from "@/lib/services/email-service";
import { useAppState } from "@/hooks/use-app-state";
import { formatKrw } from "@/lib/utils/currency";
import { formatPoint } from "@/lib/utils/percentage";

export function ReportsClient() {
  const { state, updateState } = useAppState();
  const reports = getReportList(state);

  function sendReportEmail(reportId: string) {
    const report = state.monthlyReports.find((item) => item.id === reportId);
    if (!report) return;
    const result = sendEmail(state, {
      emailType: "monthly_report_ready",
      report
    });
    updateState(result.state);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-mint">월간 리포트</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">
          스냅샷 기반 월간 변화 분석
        </h1>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">리포트 목록</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">월</th>
                <th className="py-3 pr-3 text-right">총자산 변화</th>
                <th className="py-3 pr-3 text-right">기대수익률 변화</th>
                <th className="py-3 pr-3 text-right">위험점수 변화</th>
                <th className="py-3 pr-3">요약</th>
                <th className="py-3 pr-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-line/70">
                  <td className="py-3 pr-3 font-medium">{report.reportMonth}</td>
                  <td className="py-3 pr-3 text-right">
                    {report.totalAssetChangeAmount === undefined
                      ? "기준 없음"
                      : formatKrw(report.totalAssetChangeAmount)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {report.expectedReturnChange === undefined
                      ? "기준 없음"
                      : formatPoint(report.expectedReturnChange)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {report.riskScoreChange === undefined
                      ? "기준 없음"
                      : `${report.riskScoreChange.toFixed(1)}점`}
                  </td>
                  <td className="max-w-md py-3 pr-3 text-neutral-600">
                    {report.summary}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/reports/${report.id}`}
                        className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-neutral-700"
                      >
                        상세 보기
                      </Link>
                      <button
                        type="button"
                        onClick={() => sendReportEmail(report.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-neutral-600"
                        title="이메일 mock 생성"
                      >
                        <Mail size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500">
                    생성된 월간 리포트가 없습니다. 스냅샷을 저장하면 리포트가 생성됩니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <DisclaimerNote />
    </div>
  );
}
