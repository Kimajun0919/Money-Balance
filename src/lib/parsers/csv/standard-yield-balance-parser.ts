import type {
  BrokerCsvParser,
  ParsedBrokerCsvResult
} from "@/lib/parsers/csv/broker-csv-parser";
import { parseGenericCsv } from "@/lib/parsers/csv/generic-csv-parser";

export const STANDARD_YIELD_BALANCE_COLUMNS = [
  "asset_name",
  "asset_type",
  "ticker",
  "market",
  "valuation_amount",
  "currency",
  "exchange_rate",
  "quantity",
  "purchase_unit_price",
  "purchase_amount",
  "purchase_date",
  "income_yield",
  "expected_capital_return",
  "price_change_rate",
  "price_change_period_type",
  "price_change_start_date",
  "price_change_end_date",
  "fx_change_rate",
  "income_tax_rate",
  "capital_gain_tax_rate",
  "account_type",
  "broker_name",
  "account_alias"
];

export class StandardYieldBalanceCsvParser implements BrokerCsvParser {
  brokerName = "Yield Balance 표준";

  detect(fileSample: string) {
    return STANDARD_YIELD_BALANCE_COLUMNS.slice(0, 6).every((column) =>
      fileSample.includes(column)
    );
  }

  async parse(fileText: string): Promise<ParsedBrokerCsvResult> {
    const rows = parseGenericCsv(fileText).map((row) => ({
      rowNumber: row.rowNumber,
      rawData: row.rawData,
      normalizedData: row.rawData
    }));

    return {
      brokerName: this.brokerName,
      rows,
      detectedColumns: Object.keys(rows[0]?.rawData ?? {}),
      warnings: [],
      errors: []
    };
  }
}
