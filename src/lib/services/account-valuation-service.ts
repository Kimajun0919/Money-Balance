import type {
  AppState,
  Asset,
  FinancialAccount,
  FxRateSnapshot,
  MarketPriceSnapshot
} from "@/lib/types";

function latestByDate<T>(
  items: T[],
  getTime: (item: T) => string | undefined
) {
  return [...items].sort((a, b) => {
    const bTime = new Date(getTime(b) ?? 0).getTime();
    const aTime = new Date(getTime(a) ?? 0).getTime();
    return bTime - aTime;
  })[0];
}

function findLatestPrice(
  state: AppState,
  ticker?: string,
  market?: string
): MarketPriceSnapshot | undefined {
  if (!ticker) return undefined;
  return latestByDate(
    state.marketPriceSnapshots.filter(
      (price) =>
        price.ticker.toUpperCase() === ticker.toUpperCase() &&
        (!market || price.market.toUpperCase() === market.toUpperCase())
    ),
    (price) => price.fetchedAt
  );
}

function findLatestFxRate(
  state: AppState,
  baseCurrency: string,
  quoteCurrency = "KRW"
): FxRateSnapshot | undefined {
  if (baseCurrency.toUpperCase() === quoteCurrency.toUpperCase()) {
    return undefined;
  }
  return latestByDate(
    state.fxRateSnapshots.filter(
      (rate) =>
        rate.baseCurrency.toUpperCase() === baseCurrency.toUpperCase() &&
        rate.quoteCurrency.toUpperCase() === quoteCurrency.toUpperCase()
    ),
    (rate) => rate.fetchedAt
  );
}

function isExternalSource(source?: string) {
  return (
    source === "external_balance" ||
    source === "market_price" ||
    source === "fx_rate" ||
    source === "mixed" ||
    source === "broker_sync" ||
    source === "csv_import"
  );
}

export function valueAccountBalance(
  account: FinancialAccount,
  state: AppState
): { account: FinancialAccount; warnings: string[] } {
  const warnings: string[] = [];
  const currency = account.currency.toUpperCase();
  const fxRate = findLatestFxRate(state, currency);
  const exchangeRate = currency === "KRW" ? 1 : fxRate?.rate;

  if (account.valuationSource === "manual" || account.isManual) {
    return { account, warnings };
  }

  if (!exchangeRate) {
    warnings.push(`${currency} 환율 데이터가 없어 기존 원화 평가금액을 유지했습니다.`);
    return {
      account: {
        ...account,
        warningCodes: [...new Set([...account.warningCodes, "missing_fx_rate"])]
      },
      warnings
    };
  }

  const liabilityAmountKrw = account.isLiability
    ? Math.abs(account.balance) * exchangeRate
    : undefined;
  const valuationAmountKrw = account.isLiability
    ? 0
    : Math.max(0, account.balance) * exchangeRate;

  return {
    account: {
      ...account,
      valuationAmountKrw: Number(valuationAmountKrw.toFixed(2)),
      liabilityAmountKrw:
        liabilityAmountKrw === undefined
          ? account.liabilityAmountKrw
          : Number(liabilityAmountKrw.toFixed(2)),
      valuationSource:
        currency === "KRW" ? account.valuationSource : "mixed",
      warningCodes: account.warningCodes.filter(
        (warning) => warning !== "missing_fx_rate"
      ),
      updatedAt: new Date().toISOString()
    },
    warnings
  };
}

export function valueLinkedAsset(
  asset: Asset,
  state: AppState
): { asset: Asset; warnings: string[] } {
  const warnings: string[] = [];
  const currency = asset.currency.toUpperCase();
  const price = findLatestPrice(state, asset.ticker, asset.market);
  const fxRate = findLatestFxRate(state, currency);
  const exchangeRate = currency === "KRW" ? 1 : fxRate?.rate;
  const hasQuantity = asset.quantity !== undefined && asset.quantity > 0;

  if (!isExternalSource(asset.valuationSource)) {
    return { asset, warnings };
  }

  if (asset.ticker && !price) warnings.push(`${asset.ticker} 가격 데이터가 없습니다.`);
  if (currency !== "KRW" && !exchangeRate) {
    warnings.push(`${currency} 환율 데이터가 없습니다.`);
  }

  if (!price || !hasQuantity || !exchangeRate) {
    return { asset, warnings };
  }

  const valuationAmount = Number((asset.quantity! * price.price).toFixed(2));
  return {
    asset: {
      ...asset,
      valuationAmount,
      exchangeRate,
      valuationAmountKrw: Number((valuationAmount * exchangeRate).toFixed(2)),
      priceSource: price.source,
      fxSource: fxRate?.source ?? asset.fxSource,
      lastPriceUpdatedAt: price.fetchedAt,
      lastFxUpdatedAt: fxRate?.fetchedAt ?? asset.lastFxUpdatedAt,
      valuationSource: currency === "KRW" ? "market_price" : "mixed",
      updatedAt: new Date().toISOString()
    },
    warnings
  };
}

export function refreshAccountValuations(state: AppState): {
  state: AppState;
  warnings: string[];
} {
  const accountResults = state.financialAccounts.map((account) =>
    valueAccountBalance(account, state)
  );
  const assetResults = state.assets.map((asset) => valueLinkedAsset(asset, state));

  return {
    state: {
      ...state,
      financialAccounts: accountResults.map((result) => result.account),
      assets: assetResults.map((result) => result.asset)
    },
    warnings: [
      ...accountResults.flatMap((result) => result.warnings),
      ...assetResults.flatMap((result) => result.warnings)
    ]
  };
}
