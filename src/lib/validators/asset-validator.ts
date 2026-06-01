import type { AccountType, AssetType, PriceChangePeriodType } from "@/lib/types";

export interface AssetInput {
  assetName: string;
  assetType: AssetType;
  ticker?: string;
  market?: string;
  brokerName?: string;
  accountAlias?: string;
  externalConnectionId?: string;
  externalAssetId?: string;
  valuationSource?: "manual" | "csv_import" | "broker_sync" | "market_price" | "mixed";
  priceSource?: string;
  fxSource?: string;
  lastSyncedAt?: string;
  lastPriceUpdatedAt?: string;
  lastFxUpdatedAt?: string;
  isAutoImported?: boolean;
  userConfirmedAssetType?: boolean;
  valuationAmount: number;
  currency: string;
  exchangeRate: number;
  quantity?: number;
  purchaseUnitPrice?: number;
  purchaseAmount?: number;
  purchaseDate?: string;
  incomeYield: number;
  expectedCapitalReturn: number;
  priceChangeRate: number;
  priceChangePeriodType?: PriceChangePeriodType;
  priceChangeStartDate?: string;
  priceChangeEndDate?: string;
  fxChangeRate: number;
  incomeTaxRate: number;
  capitalGainTaxRate: number;
  accountType: AccountType;
}

export interface AssetValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  confirmations: string[];
}

export function validateAssetInput(input: AssetInput): AssetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const confirmations: string[] = [];

  if (!input.assetName.trim()) {
    errors.push("자산 이름을 입력해야 합니다.");
  }

  if (input.valuationAmount <= 0) {
    errors.push("평가금액은 0보다 커야 합니다.");
  }

  if (input.currency.toUpperCase() !== "KRW" && input.exchangeRate <= 0) {
    errors.push("외화 자산은 환율을 0보다 크게 입력해야 합니다.");
  }

  if (!input.currency.trim()) {
    errors.push("통화 코드는 필수입니다.");
  }

  if (input.ticker && !input.market?.trim()) {
    errors.push("종목코드를 입력한 경우 거래시장을 함께 입력해야 합니다.");
  }

  if (input.ticker && !/^[A-Z0-9.\-]{1,20}$/i.test(input.ticker.trim())) {
    warnings.push("종목코드 형식이 일반적인 티커 형식과 다릅니다.");
  }

  if (input.valuationAmount * input.exchangeRate < 0) {
    errors.push("원화 환산 평가금액은 음수가 될 수 없습니다.");
  }

  if (input.incomeYield < -0.1 || input.incomeYield > 0.3) {
    errors.push("인컴수익률은 -10% 이상 30% 이하로 입력해야 합니다.");
  }

  if (
    input.expectedCapitalReturn < -0.5 ||
    input.expectedCapitalReturn > 0.5
  ) {
    errors.push("기대 가격수익률은 -50% 이상 50% 이하로 입력해야 합니다.");
  }

  if (input.priceChangeRate < -0.9 || input.priceChangeRate > 3) {
    errors.push("가격 변화율은 -90% 이상 300% 이하로 입력해야 합니다.");
  }

  if (input.fxChangeRate < -0.5 || input.fxChangeRate > 1) {
    errors.push("환율 변화율은 -50% 이상 100% 이하로 입력해야 합니다.");
  }

  if (
    input.incomeTaxRate < 0 ||
    input.incomeTaxRate > 1 ||
    input.capitalGainTaxRate < 0 ||
    input.capitalGainTaxRate > 1
  ) {
    errors.push("세율은 0% 이상 100% 이하로 입력해야 합니다.");
  }

  if (input.quantity !== undefined && input.quantity <= 0) {
    errors.push("수량을 입력한 경우 0보다 커야 합니다.");
  }

  if (
    input.purchaseUnitPrice !== undefined &&
    input.purchaseUnitPrice <= 0
  ) {
    errors.push("매입 단가를 입력한 경우 0보다 커야 합니다.");
  }

  if (input.priceChangeRate !== 0 && !input.priceChangePeriodType) {
    errors.push("가격 변화율을 입력한 경우 기간을 선택해야 합니다.");
  }

  if (input.incomeYield > 0.15) {
    warnings.push("인컴수익률이 15%를 초과합니다. 가격 변화와 총수익률을 함께 확인해야 합니다.");
  }

  if (input.incomeYield > 0.3) {
    confirmations.push("인컴수익률이 30%를 초과합니다. 저장 전 재확인이 필요합니다.");
  }

  if (input.priceChangeRate <= -0.5) {
    warnings.push("가격 변화율이 -50% 이하입니다. 손실 가능성을 별도로 확인해야 합니다.");
  }

  if (input.priceChangeRate >= 1) {
    confirmations.push("가격 변화율이 100% 이상입니다. 이상치 여부를 확인해야 합니다.");
  }

  if (input.valuationAmount * input.exchangeRate >= 1_000_000_000) {
    confirmations.push("원화 환산 평가금액이 10억 원 이상입니다. 입력 금액을 확인해야 합니다.");
  }

  if (input.incomeTaxRate === 0 || input.capitalGainTaxRate === 0) {
    confirmations.push("세율 0% 입력은 비과세 또는 과세 제외 여부를 확인한 값이어야 합니다.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    confirmations
  };
}
