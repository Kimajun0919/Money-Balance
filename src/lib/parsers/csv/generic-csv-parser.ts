export interface GenericCsvRow {
  rowNumber: number;
  rawData: Record<string, string>;
}

export type CsvColumnMapping = Partial<Record<
  | "asset_name"
  | "asset_type"
  | "ticker"
  | "market"
  | "valuation_amount"
  | "currency"
  | "exchange_rate"
  | "quantity"
  | "purchase_unit_price"
  | "purchase_amount"
  | "purchase_date"
  | "income_yield"
  | "expected_capital_return"
  | "price_change_rate"
  | "price_change_period_type"
  | "fx_change_rate"
  | "income_tax_rate"
  | "capital_gain_tax_rate"
  | "account_type"
  | "broker_name"
  | "account_alias",
  string
>>;

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

export function parseGenericCsv(csvText: string): GenericCsvRow[] {
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

export function applyCsvColumnMapping(
  rawData: Record<string, string>,
  mapping?: CsvColumnMapping
) {
  if (!mapping) return rawData;
  return Object.entries(mapping).reduce<Record<string, string>>(
    (acc, [internalField, sourceField]) => {
      acc[internalField] = sourceField ? rawData[sourceField] ?? "" : "";
      return acc;
    },
    {}
  );
}
