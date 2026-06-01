import type { AccountType, AssetType } from "@/lib/types";

export interface BrokerConnectionRequest {
  accessToken: string;
  accountAlias?: string;
  consentAccepted: boolean;
}

export interface BrokerConnectionResult {
  providerName: string;
  brokerName: string;
  accountIdentifierMasked: string;
  scopes: string[];
  connectedAt: string;
}

export interface BrokerHolding {
  externalAssetId: string;
  assetName: string;
  ticker?: string;
  market?: string;
  currency: string;
  quantity?: number;
  currentPrice?: number;
  valuationAmount?: number;
  exchangeRate?: number;
  purchaseAmount?: number;
  purchaseUnitPrice?: number;
  purchaseDate?: string;
  brokerProductType?: string;
  rawAssetType?: string;
  accountAlias?: string;
  accountType?: AccountType;
  suggestedAssetType?: AssetType;
  rawData: Record<string, unknown>;
}

export interface BrokerCashBalance {
  externalAssetId: string;
  assetName: string;
  currency: string;
  amount: number;
  exchangeRate?: number;
  accountAlias?: string;
  rawData: Record<string, unknown>;
}

export interface BrokerSyncResult {
  fetchedAt: string;
  holdings: BrokerHolding[];
  cashBalances: BrokerCashBalance[];
  warnings: string[];
}

export interface BrokerProvider {
  readonly providerName: string;
  readonly brokerName: string;
  readonly readOnlyScopes: string[];
  connect(input: BrokerConnectionRequest): Promise<BrokerConnectionResult>;
  fetchHoldings(connectionId: string): Promise<BrokerHolding[]>;
  fetchCashBalances(connectionId: string): Promise<BrokerCashBalance[]>;
  sync(connectionId: string): Promise<BrokerSyncResult>;
  disconnect(connectionId: string): Promise<void>;
}
