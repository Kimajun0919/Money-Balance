import type {
  Asset,
  AssetReturnDetail,
  IllusionWarning,
  IllusionWarningLevel,
  PortfolioReturnResult
} from "@/lib/types";
import { formatPercent, roundTo } from "@/lib/utils/percentage";

export function calculateAssetExpectedReturn(params: {
  incomeYield: number;
  expectedCapitalReturn: number;
}) {
  return roundTo(params.incomeYield + params.expectedCapitalReturn, 6);
}

export function calculateAssetAfterTaxExpectedReturn(params: {
  incomeYield: number;
  expectedCapitalReturn: number;
  incomeTaxRate: number;
  capitalGainTaxRate: number;
}) {
  const afterTaxIncomeYield = params.incomeYield * (1 - params.incomeTaxRate);
  const afterTaxCapitalReturn =
    params.expectedCapitalReturn > 0
      ? params.expectedCapitalReturn * (1 - params.capitalGainTaxRate)
      : params.expectedCapitalReturn;

  return roundTo(afterTaxIncomeYield + afterTaxCapitalReturn, 6);
}

export function calculateAssetTotalReturn(params: {
  incomeYield: number;
  priceChangeRateAnnualized: number;
  fxChangeRate: number;
}) {
  return roundTo(
    params.incomeYield +
      params.priceChangeRateAnnualized +
      params.fxChangeRate,
    6
  );
}

export function detectIllusionWarningForAsset(asset: Asset): {
  level: IllusionWarningLevel;
  totalReturn: number;
  message?: string;
} {
  const totalReturn = calculateAssetTotalReturn({
    incomeYield: asset.incomeYield,
    priceChangeRateAnnualized: asset.priceChangeRateAnnualized,
    fxChangeRate: asset.fxChangeRate
  });

  if (asset.incomeYield >= 0.12 && totalReturn < 0) {
    return {
      level: "danger",
      totalReturn,
      message:
        "인컴수익률은 높지만 가격 변동을 반영한 총수익률이 낮아 고분배 착시 위험이 큽니다."
    };
  }

  if (asset.incomeYield >= 0.1 && asset.priceChangeRateAnnualized <= -0.1) {
    return {
      level: "warning",
      totalReturn,
      message:
        "높은 인컴수익률과 큰 가격 하락이 함께 나타나 분배금 중심 판단을 주의해야 합니다."
    };
  }

  if (asset.incomeYield >= 0.08 && totalReturn < 0) {
    return {
      level: "caution",
      totalReturn,
      message:
        "인컴수익률은 높지만 총수익률이 낮아 실제 성과를 함께 확인해야 합니다."
    };
  }

  return {
    level: "none",
    totalReturn
  };
}

function buildIllusionWarning(asset: Asset): IllusionWarning | null {
  const detection = detectIllusionWarningForAsset(asset);
  if (detection.level === "none") return null;

  return {
    assetId: asset.id,
    assetName: asset.assetName,
    assetType: asset.assetType,
    level: detection.level,
    incomeYield: asset.incomeYield,
    totalReturn: detection.totalReturn,
    priceChangeRateAnnualized: asset.priceChangeRateAnnualized,
    message:
      detection.message ??
      `인컴수익률 ${formatPercent(
        asset.incomeYield
      )}와 총수익률 ${formatPercent(detection.totalReturn)}을 함께 확인해야 합니다.`
  };
}

export function calculatePortfolioReturns(
  assets: Asset[]
): PortfolioReturnResult {
  const totalAssetAmountKrw = assets.reduce(
    (sum, asset) => sum + asset.valuationAmountKrw,
    0
  );

  if (totalAssetAmountKrw <= 0) {
    return {
      totalAssetAmountKrw: 0,
      expectedReturn: 0,
      expectedCapitalReturn: 0,
      incomeYield: 0,
      annualIncomeAmount: 0,
      monthlyIncomeAmount: 0,
      afterTaxExpectedReturn: 0,
      totalReturn: 0,
      details: [],
      illusionWarnings: []
    };
  }

  const details: AssetReturnDetail[] = assets.map((asset) => {
    const weight = asset.valuationAmountKrw / totalAssetAmountKrw;
    const expectedReturn = calculateAssetExpectedReturn({
      incomeYield: asset.incomeYield,
      expectedCapitalReturn: asset.expectedCapitalReturn
    });
    const afterTaxExpectedReturn = calculateAssetAfterTaxExpectedReturn({
      incomeYield: asset.incomeYield,
      expectedCapitalReturn: asset.expectedCapitalReturn,
      incomeTaxRate: asset.incomeTaxRate,
      capitalGainTaxRate: asset.capitalGainTaxRate
    });
    const totalReturn = calculateAssetTotalReturn({
      incomeYield: asset.incomeYield,
      priceChangeRateAnnualized: asset.priceChangeRateAnnualized,
      fxChangeRate: asset.fxChangeRate
    });

    return {
      assetId: asset.id,
      assetName: asset.assetName,
      assetType: asset.assetType,
      weight,
      expectedReturn,
      incomeYield: asset.incomeYield,
      expectedCapitalReturn: asset.expectedCapitalReturn,
      afterTaxExpectedReturn,
      totalReturn,
      annualIncomeAmount: asset.valuationAmountKrw * asset.incomeYield
    };
  });

  const annualIncomeAmount = details.reduce(
    (sum, detail) => sum + detail.annualIncomeAmount,
    0
  );
  const illusionWarnings = assets
    .map(buildIllusionWarning)
    .filter((warning): warning is IllusionWarning => warning !== null);

  return {
    totalAssetAmountKrw,
    expectedReturn: roundTo(
      details.reduce(
        (sum, detail) => sum + detail.weight * detail.expectedReturn,
        0
      ),
      6
    ),
    expectedCapitalReturn: roundTo(
      details.reduce(
        (sum, detail) => sum + detail.weight * detail.expectedCapitalReturn,
        0
      ),
      6
    ),
    incomeYield: roundTo(annualIncomeAmount / totalAssetAmountKrw, 6),
    annualIncomeAmount,
    monthlyIncomeAmount: annualIncomeAmount / 12,
    afterTaxExpectedReturn: roundTo(
      details.reduce(
        (sum, detail) => sum + detail.weight * detail.afterTaxExpectedReturn,
        0
      ),
      6
    ),
    totalReturn: roundTo(
      details.reduce((sum, detail) => sum + detail.weight * detail.totalReturn, 0),
      6
    ),
    details,
    illusionWarnings
  };
}
