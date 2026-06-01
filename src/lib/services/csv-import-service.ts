import type {
  AppState,
  Asset,
  AssetType,
  CsvImportJob,
  CsvImportRow,
  PriceChangePeriodType
} from "@/lib/types";
import { createMonthlySnapshot } from "@/lib/services/snapshot-service";
import { createId } from "@/lib/services/service-utils";
import { createAssetFromInput } from "@/lib/utils/asset-factory";
import { fromPercentValue } from "@/lib/utils/percentage";
import type { AssetInput } from "@/lib/validators/asset-validator";
import { validateAssetInput } from "@/lib/validators/asset-validator";
import { ASSET_TYPE_ORDER } from "@/lib/constants/asset-types";
import { logKpiEvent } from "@/lib/kpi/event-logger";

const ACCOUNT_TYPES = ["general", "isa", "pension", "irp", "tax_free", "unknown"];
const PRICE_PERIOD_TYPES: PriceChangePeriodType[] = [
  "1m",
  "3m",
  "6m",
  "1y",
  "since_purchase",
  "custom"
];

export const CSV_TEMPLATE_HEADERS = [
  "asset_name",
  "asset_type",
  "valuation_amount",
  "currency",
  "exchange_rate",
  "account_type",
  "income_yield",
  "expected_capital_return",
  "price_change_rate",
  "price_change_period_type",
  "fx_change_rate",
  "income_tax_rate",
  "capital_gain_tax_rate",
  "purchase_date",
  "purchase_amount"
];

export function getCsvTemplate() {
  return `${CSV_TEMPLATE_HEADERS.join(",")}\n현금성 계좌,cash,1000000,KRW,1,general,2.8,0,0,1y,0,15.4,15.4,,`;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

export function parseCsv(csvText: string) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    return {
      rowNumber: index + 2,
      rawData: headers.reduce<Record<string, string>>((acc, header, valueIndex) => {
        acc[header] = values[valueIndex] ?? "";
        return acc;
      }, {})
    };
  });
}

function numberFromCsv(value: string | undefined, fallback = 0) {
  if (!value) return fallback;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCsvRowToAssetInput(
  rawData: Record<string, string>
): AssetInput | null {
  const assetType = rawData.asset_type as AssetType;
  if (!ASSET_TYPE_ORDER.includes(assetType)) return null;
  const currency = (rawData.currency || "KRW").toUpperCase();
  const priceChangeRate = fromPercentValue(
    numberFromCsv(rawData.price_change_rate, 0)
  );

  return {
    assetName: rawData.asset_name ?? "",
    assetType,
    valuationAmount: numberFromCsv(rawData.valuation_amount),
    currency,
    exchangeRate:
      currency === "KRW" ? 1 : numberFromCsv(rawData.exchange_rate, 0),
    accountType:
      rawData.account_type === "isa" ||
      rawData.account_type === "pension" ||
      rawData.account_type === "irp" ||
      rawData.account_type === "tax_free" ||
      rawData.account_type === "unknown"
        ? rawData.account_type
        : "general",
    incomeYield: fromPercentValue(numberFromCsv(rawData.income_yield, 0)),
    expectedCapitalReturn: fromPercentValue(
      numberFromCsv(rawData.expected_capital_return, 0)
    ),
    priceChangeRate,
    priceChangePeriodType:
      priceChangeRate !== 0
        ? (rawData.price_change_period_type as PriceChangePeriodType)
        : undefined,
    fxChangeRate: fromPercentValue(numberFromCsv(rawData.fx_change_rate, 0)),
    incomeTaxRate: fromPercentValue(numberFromCsv(rawData.income_tax_rate, 15.4)),
    capitalGainTaxRate: fromPercentValue(
      numberFromCsv(rawData.capital_gain_tax_rate, 15.4)
    ),
    purchaseDate: rawData.purchase_date || undefined,
    purchaseAmount: rawData.purchase_amount
      ? numberFromCsv(rawData.purchase_amount)
      : undefined
  };
}

export function detectDuplicateAsset(assets: Asset[], input: AssetInput) {
  return assets.find(
    (asset) =>
      asset.assetName === input.assetName &&
      asset.assetType === input.assetType &&
      asset.accountType === input.accountType &&
      (asset.purchaseDate ?? "") === (input.purchaseDate ?? "") &&
      (asset.purchaseAmount ?? 0) === (input.purchaseAmount ?? 0)
  );
}

export function previewCsvImport(
  state: AppState,
  params: { filename: string; csvText: string }
): { state: AppState; job: CsvImportJob; rows: CsvImportRow[] } {
  logKpiEvent("csv_import_started", { filename: params.filename });
  const parsedRows = parseCsv(params.csvText);
  const now = new Date().toISOString();
  const jobId = createId("csv");
  const rows: CsvImportRow[] = parsedRows.map((row) => {
    const input = parseCsvRowToAssetInput(row.rawData);
    const errors: string[] = [];
    const warnings: string[] = [];
    let duplicateAssetId: string | undefined;

    if (!input) {
      errors.push("asset_type은 공식 자산군 코드 중 하나여야 합니다.");
    } else {
      if (!ACCOUNT_TYPES.includes(row.rawData.account_type)) {
        errors.push("account_type은 공식 계좌 유형 코드 중 하나여야 합니다.");
      }
      if (
        numberFromCsv(row.rawData.price_change_rate, 0) !== 0 &&
        !row.rawData.price_change_period_type
      ) {
        errors.push("price_change_rate를 입력한 경우 price_change_period_type이 필요합니다.");
      }
      if (
        row.rawData.price_change_period_type &&
        !PRICE_PERIOD_TYPES.includes(
          row.rawData.price_change_period_type as PriceChangePeriodType
        )
      ) {
        errors.push("price_change_period_type 값이 공식 코드와 일치하지 않습니다.");
      }
      const validation = validateAssetInput(input);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings, ...validation.confirmations);
      const duplicate = detectDuplicateAsset(state.assets, input);
      if (duplicate) {
        duplicateAssetId = duplicate.id;
        warnings.push(
          "동일한 자산으로 보이는 항목이 이미 등록되어 있습니다. 기존 자산을 유지할지 새 항목을 추가할지 확인해 주세요."
        );
      }
    }

    return {
      id: createId("csvrow"),
      importJobId: jobId,
      rowNumber: row.rowNumber,
      rawData: row.rawData,
      parsedData: input as unknown as Partial<Asset>,
      validationStatus:
        errors.length > 0 ? "invalid" : warnings.length > 0 ? "warning" : "valid",
      errors,
      warnings,
      duplicateAssetId,
      createdAt: now
    };
  });
  const job: CsvImportJob = {
    id: jobId,
    filename: params.filename,
    totalRows: rows.length,
    validRows: rows.filter((row) => row.validationStatus === "valid").length,
    invalidRows: rows.filter((row) => row.validationStatus === "invalid").length,
    warningRows: rows.filter((row) => row.validationStatus === "warning").length,
    status: "validated",
    errorSummary:
      rows.some((row) => row.validationStatus === "invalid")
        ? "검증 오류가 있는 행이 있습니다."
        : undefined,
    createdAt: now
  };

  logKpiEvent("csv_import_validated", {
    totalRows: job.totalRows,
    validRows: job.validRows,
    invalidRows: job.invalidRows
  });

  return {
    state: {
      ...state,
      csvImportJobs: [job, ...state.csvImportJobs],
      csvImportRows: [...rows, ...state.csvImportRows]
    },
    job,
    rows
  };
}

export function confirmCsvImport(
  state: AppState,
  params: { jobId: string; createSnapshot?: boolean }
): { state: AppState; job?: CsvImportJob; createdAssets: Asset[] } {
  const rows = state.csvImportRows.filter(
    (row) =>
      row.importJobId === params.jobId && row.validationStatus !== "invalid"
  );
  const createdAssets = rows
    .map((row) => {
      const input = parseCsvRowToAssetInput(row.rawData);
      return input ? createAssetFromInput(input) : null;
    })
    .filter((asset): asset is Asset => asset !== null);
  let nextState: AppState = {
    ...state,
    assets: [...state.assets, ...createdAssets],
    csvImportRows: state.csvImportRows.map((row) => {
      const createdAsset = createdAssets.find((asset) => {
        const input = parseCsvRowToAssetInput(row.rawData);
        return input && asset.assetName === input.assetName;
      });
      return row.importJobId === params.jobId
        ? { ...row, createdAssetId: createdAsset?.id }
        : row;
    })
  };
  let createdSnapshotId: string | undefined;
  if (params.createSnapshot && createdAssets.length > 0) {
    const snapshotResult = createMonthlySnapshot(nextState, {
      source: "imported",
      duplicatePolicy: "new"
    });
    nextState = snapshotResult.state;
    createdSnapshotId = snapshotResult.snapshot?.id;
  }

  const completedAt = new Date().toISOString();
  const job = nextState.csvImportJobs.find((item) => item.id === params.jobId);
  const updatedJob = job
    ? {
        ...job,
        status: "imported" as const,
        createdSnapshotId,
        completedAt
      }
    : undefined;
  nextState = {
    ...nextState,
    csvImportJobs: nextState.csvImportJobs.map((item) =>
      item.id === params.jobId && updatedJob ? updatedJob : item
    )
  };

  logKpiEvent("csv_import_completed", {
    jobId: params.jobId,
    createdAssets: createdAssets.length,
    createdSnapshotId
  });

  return { state: nextState, job: updatedJob, createdAssets };
}
