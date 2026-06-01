import { REQUIRED_DISCLAIMER } from "@/lib/constants/disclaimer";

export function cashShortageWarningTemplate() {
  const subject = "Yield Balance 현금성 자산 비중 안내";
  const bodyText = [
    "안녕하세요.",
    "",
    "현금성 자산 비중이 설정한 최소 기준보다 낮습니다. 신규 투자금 배분 시 현금성 자산 확보를 먼저 확인해 주세요.",
    "",
    "리밸런싱 참고 보기: /rebalance",
    "",
    REQUIRED_DISCLAIMER
  ].join("\n");

  return {
    subject,
    bodyText,
    bodyHtml: `<p>안녕하세요.</p><p>현금성 자산 비중이 설정한 최소 기준보다 낮습니다. 신규 투자금 배분 시 현금성 자산 확보를 먼저 확인해 주세요.</p><p><a href="/rebalance">리밸런싱 참고 보기</a></p><p>${REQUIRED_DISCLAIMER}</p>`
  };
}
