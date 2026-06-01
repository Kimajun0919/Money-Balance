"use client";

import { Download, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import {
  confirmCsvImport,
  getCsvTemplate,
  previewCsvImport
} from "@/lib/services/csv-import-service";
import { useAppState } from "@/hooks/use-app-state";
import { CSV_IMPORT_STATUS_LABELS } from "@/lib/utils/labels";

export function CsvImportClient() {
  const { state, updateState } = useAppState();
  const [filename, setFilename] = useState("assets.csv");
  const [csvText, setCsvText] = useState(getCsvTemplate());
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const currentRows = useMemo(
    () =>
      currentJobId
        ? state.csvImportRows.filter((row) => row.importJobId === currentJobId)
        : [],
    [state.csvImportRows, currentJobId]
  );
  const currentJob = currentJobId
    ? state.csvImportJobs.find((job) => job.id === currentJobId)
    : undefined;

  function downloadTemplate() {
    const blob = new Blob([getCsvTemplate()], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "yield_balance_asset_template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function preview() {
    const result = previewCsvImport(state, { filename, csvText });
    updateState(result.state);
    setCurrentJobId(result.job.id);
  }

  function confirmImport(createSnapshot: boolean) {
    if (!currentJobId) return;
    const result = confirmCsvImport(state, {
      jobId: currentJobId,
      createSnapshot
    });
    updateState(result.state);
  }

  function readFile(file?: File) {
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ""));
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">CSV 가져오기</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">
            표준 템플릿 기반 자산 등록
          </h1>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-neutral-700"
        >
          <Download size={17} aria-hidden="true" />
          템플릿 다운로드
        </button>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">파일 업로드</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => readFile(event.target.files?.[0])}
              className="mt-2 block w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">파일명</span>
            <input
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
            />
          </label>
        </div>
        <label className="mt-5 block">
          <span className="text-sm font-medium text-neutral-700">CSV 내용</span>
          <textarea
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            className="mt-2 min-h-48 w-full rounded-md border border-line p-3 font-mono text-sm"
          />
        </label>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={preview}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white"
          >
            <Upload size={17} aria-hidden="true" />
            미리보기 검증
          </button>
          <button
            type="button"
            onClick={() => confirmImport(false)}
            disabled={!currentJob || currentJob.invalidRows > 0}
            className="h-10 rounded-md border border-line bg-white px-4 text-sm font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-100"
          >
            자산 가져오기
          </button>
          <button
            type="button"
            onClick={() => confirmImport(true)}
            disabled={!currentJob || currentJob.invalidRows > 0}
            className="h-10 rounded-md border border-line bg-white px-4 text-sm font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-100"
          >
            가져오기 후 스냅샷 저장
          </button>
        </div>
      </section>

      {currentJob ? (
        <section className="rounded-md border border-line bg-white p-5 shadow-panel">
          <h2 className="text-lg font-bold text-ink">검증 결과</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <Summary label="전체" value={`${currentJob.totalRows}행`} />
            <Summary label="정상" value={`${currentJob.validRows}행`} />
            <Summary label="경고" value={`${currentJob.warningRows}행`} />
            <Summary label="오류" value={`${currentJob.invalidRows}행`} />
          </div>
          <div className="table-scroll mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-neutral-500">
                  <th className="py-3 pr-3">행</th>
                  <th className="py-3 pr-3">상태</th>
                  <th className="py-3 pr-3">자산 이름</th>
                  <th className="py-3 pr-3">자산군</th>
                  <th className="py-3 pr-3">오류</th>
                  <th className="py-3 pr-3">경고</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((row) => (
                  <tr key={row.id} className="border-b border-line/70">
                    <td className="py-3 pr-3">{row.rowNumber}</td>
                    <td className="py-3 pr-3">
                      {row.validationStatus === "valid"
                        ? "정상"
                        : row.validationStatus === "warning"
                          ? "경고"
                          : "오류"}
                    </td>
                    <td className="py-3 pr-3">{row.rawData.asset_name}</td>
                    <td className="py-3 pr-3">{row.rawData.asset_type}</td>
                    <td className="py-3 pr-3 text-rose-700">
                      {row.errors.join(" / ")}
                    </td>
                    <td className="py-3 pr-3 text-amber-800">
                      {row.warnings.join(" / ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">가져오기 이력</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">파일명</th>
                <th className="py-3 pr-3">상태</th>
                <th className="py-3 pr-3 text-right">전체</th>
                <th className="py-3 pr-3 text-right">정상</th>
                <th className="py-3 pr-3 text-right">오류</th>
                <th className="py-3 pr-3">완료일</th>
              </tr>
            </thead>
            <tbody>
              {state.csvImportJobs.map((job) => (
                <tr key={job.id} className="border-b border-line/70">
                  <td className="py-3 pr-3 font-medium">{job.filename}</td>
                  <td className="py-3 pr-3">
                    {CSV_IMPORT_STATUS_LABELS[job.status]}
                  </td>
                  <td className="py-3 pr-3 text-right">{job.totalRows}</td>
                  <td className="py-3 pr-3 text-right">{job.validRows}</td>
                  <td className="py-3 pr-3 text-right">{job.invalidRows}</td>
                  <td className="py-3 pr-3">
                    {job.completedAt?.slice(0, 10) ?? "-"}
                  </td>
                </tr>
              ))}
              {state.csvImportJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500">
                    CSV 가져오기 이력이 없습니다.
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

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-neutral-50 p-3">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
    </div>
  );
}
