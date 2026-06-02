import type {
  ExternalProviderType,
  FinancialAccountType
} from "@/lib/types";

export type FinancialProviderPermissionScope =
  | "read_accounts"
  | "read_balances"
  | "read_holdings"
  | "read_transactions"
  | "submit_orders";

export type FinancialProviderConnectionStatus =
  | "connected"
  | "disconnected"
  | "unsupported"
  | "not_configured"
  | "error";

export interface ProviderAccountPayload {
  externalAccountId: string;
  institutionName: string;
  accountAlias: string;
  accountType: FinancialAccountType;
  accountSubtype?: string;
  currency: string;
  balance: number;
  exchangeRate?: number;
  principalAmount?: number;
  isLiability?: boolean;
  rawData?: Record<string, unknown>;
}

export interface ProviderHoldingPayload {
  externalAssetId: string;
  externalAccountId: string;
  institutionName: string;
  accountAlias: string;
  assetName: string;
  accountType: FinancialAccountType;
  ticker?: string;
  market?: string;
  brokerName?: string;
  currency: string;
  quantity?: number;
  currentPrice?: number;
  valuationAmount?: number;
  exchangeRate?: number;
  rawAssetType?: string;
  rawData?: Record<string, unknown>;
}

export interface ProviderTransactionPayload {
  id: string;
  externalAccountId: string;
  transactionDate: string;
  description: string;
  amount: number;
  currency: string;
  rawData?: Record<string, unknown>;
}

export interface FinancialProviderPayload {
  fetchedAt: string;
  accounts: ProviderAccountPayload[];
  holdings: ProviderHoldingPayload[];
  transactions?: ProviderTransactionPayload[];
  warnings: string[];
}

export interface FinancialProviderSyncPreview {
  providerId: string;
  fetchedAt: string;
  payload: FinancialProviderPayload;
  warnings: string[];
}

export interface FinancialDataProvider {
  readonly providerId: string;
  readonly providerName: string;
  readonly providerType: ExternalProviderType;
  readonly permissionScope: FinancialProviderPermissionScope[];
  checkConnectionStatus(): Promise<{
    status: FinancialProviderConnectionStatus;
    message: string;
  }>;
  fetchAccounts(): Promise<ProviderAccountPayload[]>;
  fetchBalances(): Promise<ProviderAccountPayload[]>;
  fetchHoldings(): Promise<ProviderHoldingPayload[]>;
  fetchTransactions?(): Promise<ProviderTransactionPayload[]>;
  previewSync(): Promise<FinancialProviderSyncPreview>;
  normalizePayload(payload: FinancialProviderPayload): FinancialProviderPayload;
  disconnect(): Promise<void>;
}
