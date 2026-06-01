export interface ParsedBrokerCsvRow {
  rowNumber: number;
  rawData: Record<string, string>;
  normalizedData: Record<string, string>;
}

export interface ParsedBrokerCsvResult {
  brokerName: string;
  rows: ParsedBrokerCsvRow[];
  detectedColumns: string[];
  warnings: string[];
  errors: string[];
}

export interface BrokerCsvParser {
  brokerName: string;
  detect(fileSample: string): boolean;
  parse(fileText: string): Promise<ParsedBrokerCsvResult>;
}
