import type {
  AssetClassificationResult,
  AssetType
} from "@/lib/types";

export interface AssetClassificationInput {
  assetName: string;
  ticker?: string;
  market?: string;
  brokerProductType?: string;
  rawAssetType?: string;
  currency?: string;
  userSelectedAssetType?: AssetType;
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function classifyAsset(
  input: AssetClassificationInput
): AssetClassificationResult {
  if (input.userSelectedAssetType) {
    return {
      suggestedAssetType: input.userSelectedAssetType,
      confidenceScore: 1,
      reason: "사용자가 자산군을 직접 확인했습니다."
    };
  }

  const text = [
    input.assetName,
    input.ticker,
    input.market,
    input.brokerProductType,
    input.rawAssetType,
    input.currency
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const rules: Array<{
    assetType: AssetType;
    confidenceScore: number;
    keywords: string[];
    reason: string;
  }> = [
    {
      assetType: "cash",
      confidenceScore: 0.94,
      keywords: ["cash", "deposit", "cma", "예수금", "현금", "파킹"],
      reason: "자산명 또는 상품 유형에 현금성 잔액으로 볼 수 있는 단어가 포함되어 있습니다."
    },
    {
      assetType: "savings",
      confidenceScore: 0.9,
      keywords: ["정기예금", "적금", "savings", "time deposit"],
      reason: "예금 또는 적금 관련 단어가 포함되어 있습니다."
    },
    {
      assetType: "govt_bond",
      confidenceScore: 0.86,
      keywords: ["국채", "국공채", "treasury", "government bond", "t-bill"],
      reason: "국공채 또는 treasury 관련 단어가 포함되어 있습니다."
    },
    {
      assetType: "high_yield_bond",
      confidenceScore: 0.84,
      keywords: ["high yield", "하이일드", "junk bond"],
      reason: "하이일드 채권 관련 단어가 포함되어 있습니다."
    },
    {
      assetType: "covered_call",
      confidenceScore: 0.88,
      keywords: ["covered call", "커버드콜", "option income", "qyld"],
      reason: "커버드콜 또는 옵션 인컴 관련 단어가 포함되어 있습니다."
    },
    {
      assetType: "dividend",
      confidenceScore: 0.82,
      keywords: ["dividend", "배당", "schd"],
      reason: "배당 자산으로 볼 수 있는 단어가 포함되어 있습니다."
    },
    {
      assetType: "reit",
      confidenceScore: 0.84,
      keywords: ["reit", "리츠", "real estate", "vnq"],
      reason: "리츠 또는 부동산 자산 관련 단어가 포함되어 있습니다."
    },
    {
      assetType: "alternative",
      confidenceScore: 0.72,
      keywords: ["gold", "commodity", "원자재", "금", "dollar", "달러"],
      reason: "금, 원자재, 달러 등 대체자산 관련 단어가 포함되어 있습니다."
    },
    {
      assetType: "growth",
      confidenceScore: 0.68,
      keywords: ["equity", "stock", "s&p", "nasdaq", "spy", "qqq", "주식"],
      reason: "주식 또는 광범위 주식형 ETF로 볼 수 있는 단어가 포함되어 있습니다."
    }
  ];

  const matchedRule = rules.find((rule) => includesAny(text, rule.keywords));
  if (matchedRule) {
    return {
      suggestedAssetType: matchedRule.assetType,
      confidenceScore: matchedRule.confidenceScore,
      reason: matchedRule.reason
    };
  }

  return {
    suggestedAssetType: "etc",
    confidenceScore: 0.45,
    reason: "명확한 자산군 단서를 찾지 못해 기타 자산군으로 임시 분류했습니다."
  };
}
