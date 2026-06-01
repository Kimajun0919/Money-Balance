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
import {
  CSV_IMPORT_STATUS_LABELS,
  CSV_IMPORT_TYPE_LABELS
} from "@/lib/utils/labels";
import type { AssetType, CsvImportType } from "@/lib/types";
import { ASSET_TYPE_ORDER, ASSET_TYPE_SETTINGS } from "@/lib/constants/asset-types";

const importTypes: Array<{ value: CsvImportType; label: string }> = [
  { value: "standard", label: "Yield Balance 표준 CSV" },
  { value: "generic", label: "일반 CSV 매핑" },
  { value: "broker_specific", label: "증권사 CSV" }
];

export function CsvImportClient() {
  const { state, updateState } = useAppState();
  const [filename, setFilename] = useState("assets.csv");
  const [csvText, setCsvText] = useState(getCsvTemplate());
  const [importType, setImportType] = useState<CsvImportType>("standard");
  const [brokerName, setBrokerName] = useState("");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [confirmedAssetTypes, setConfirmedAssetTypes] = useState<
    Record<string, AssetType>
  >({});
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
    const result = previewCsvImport(state, {
      filename,
      csvText,
      importType,
      brokerName: brokerName || undefined
    });
    updateState(result.state);
    setCurrentJobId(result.job.id);
    setConfirmedAssetTypes(
      result.rows.reduce<Record<string, AssetType>>((acc, row) => {
        if (row.classificationSuggestion) {
          acc[row.id] = row.classificationSuggestion.suggestedAssetType;
        }
        return acc;
      }, {})
    );
  }

  function confirmImport(createSnapshot: boolean) {
    if (!currentJobId) return;
    const result = confirmCsvImport(state, {
      jobId: currentJobId,
      createSnapshot,
      confirmedAssetTypes
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
            <span className="text-sm font-medium text-neutral-700">
              가져오기 유형
            </span>
            <select
              value={importType}
              onChange={(event) =>
                setImportType(event.target.value as CsvImportType)
              }
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
            >
              {importTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              증권사 이름
            </span>
            <input
              value={brokerName}
              onChange={(event) => setBrokerName(event.target.value)}
              placeholder="예: 모의증권"
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">파일 업로드</span>
            <input
              type="file"
              accept=".csv,.txt,text/csv"
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
        <p className="mt-3 text-sm text-neutral-500">
          Excel 파일은 현재 브라우저에서 CSV로 저장한 뒤 업로드하는 방식으로 지원합니다.
          일반 CSV는 표준 컬럼명으로 맞추거나 매핑 UI에서 같은 의미의 컬럼을 선택해 사용할 수 있습니다.
        </p>
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
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-neutral-500">
                  <th className="py-3 pr-3">행</th>
                  <th className="py-3 pr-3">상태</th>
                  <th className="py-3 pr-3">자산 이름</th>
                  <th className="py-3 pr-3">자산군</th>
                  <th className="py-3 pr-3">종목코드</th>
                  <th className="py-3 pr-3">분류 확인</th>
                  <th className="py-3 pr-3">중복</th>
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
                    <td className="py-3 pr-3">
                      {row.rawData.ticker
                        ? `${row.rawData.ticker} · ${row.rawData.market}`
                        : "-"}
                    </td>
                    <td className="py-3 pr-3">
                      <select
                        value={
                          confirmedAssetTypes[row.id] ??
                          row.classificationSuggestion?.suggestedAssetType ??
                          "etc"
                        }
                        onChange={(event) =>
                          setConfirmedAssetTypes((current) => ({
                            ...current,
                            [row.id]: event.target.value as AssetType
                          }))
                        }
                        className="h-9 rounded-md border border-line px-2"
                      >
                        {ASSET_TYPE_ORDER.map((assetType) => (
                          <option key={assetType} value={assetType}>
                            {ASSET_TYPE_SETTINGS[assetType].label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 max-w-64 text-xs text-neutral-500">
                        {row.classificationSuggestion?.reason}
                      </p>
                    </td>
                    <td className="py-3 pr-3">
                      {row.duplicateAssetId ? "확인 필요" : "-"}
                    </td>
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
                <th className="py-3 pr-3">유형</th>
                <th className="py-3 pr-3">상태</th>
                <th className="py-3 pr-3 text-right">전체</th>
                <th className="py-3 pr-3 text-right">정상</th>
                <th className="py-3 pr-3 text-right">오류</th>
                <th className="py-3 pr-3 text-right">중복</th>
                <th className="py-3 pr-3">완료일</th>
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
                  <td className="py-3 pr-3 text-right">
                    {job.duplicateRows ?? 0}
                  </td>
                  <td className="py-3 pr-3">
                    {job.completedAt?.slice(0, 10) ?? "-"}
                  </td>
                </tr>
              ))}
              {state.csvImportJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-500">
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
