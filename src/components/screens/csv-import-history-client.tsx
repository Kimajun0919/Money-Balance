"use client";

import Link from "next/link";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { useAppState } from "@/hooks/use-app-state";
import {
  CSV_IMPORT_STATUS_LABELS,
  CSV_IMPORT_TYPE_LABELS
} from "@/lib/utils/labels";

export function CsvImportHistoryClient() {
  const { state } = useAppState();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">가져오기 이력</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">
            CSV와 증권사 파일 처리 기록
          </h1>
        </div>
        <Link
          href="/import/assets"
          className="inline-flex h-10 items-center rounded-md bg-mint px-4 text-sm font-semibold text-white"
        >
          자산 가져오기
        </Link>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">파일명</th>
                <th className="py-3 pr-3">가져오기 유형</th>
                <th className="py-3 pr-3">상태</th>
                <th className="py-3 pr-3 text-right">전체 행</th>
                <th className="py-3 pr-3 text-right">정상 행</th>
                <th className="py-3 pr-3 text-right">오류 행</th>
                <th className="py-3 pr-3 text-right">경고 행</th>
                <th className="py-3 pr-3 text-right">중복 행</th>
                <th className="py-3 pr-3">연결 스냅샷</th>
              </tr>
            </thead>
            <tbody>
              {state.csvImportJobs.map((job) => (
                <tr key={job.id} className="border-b border-line/70">
                  <td className="py-3 pr-3 font-medium">{job.filename}</td>
                  <td className="py-3 pr-3">
                    {CSV_IMPORT_TYPE_LABELS[job.importType ?? "standard"]}
                  </td>
                  <td className="py-3 pr-3">
                    {CSV_IMPORT_STATUS_LABELS[job.status]}
                  </td>
                  <td className="py-3 pr-3 text-right">{job.totalRows}</td>
                  <td className="py-3 pr-3 text-right">{job.validRows}</td>
                  <td className="py-3 pr-3 text-right">{job.invalidRows}</td>
                  <td className="py-3 pr-3 text-right">{job.warningRows}</td>
                  <td className="py-3 pr-3 text-right">
                    {job.duplicateRows ?? 0}
                  </td>
                  <td className="py-3 pr-3">
                    {job.createdSnapshotId ? (
                      <Link
                        href={`/snapshots/${job.createdSnapshotId}`}
                        className="font-semibold text-mint"
                      >
                        보기
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
              {state.csvImportJobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-neutral-500">
                    가져오기 이력이 없습니다.
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
