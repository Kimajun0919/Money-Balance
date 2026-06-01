import { REQUIRED_DISCLAIMER } from "@/lib/constants/disclaimer";

export function riskScoreWarningTemplate() {
  const subject = "Yield Balance 위험점수 안내";
  const bodyText = [
    "안녕하세요.",
    "",
    "현재 포트폴리오 위험점수가 사용자가 설정한 상한을 초과했습니다. 자산군별 위험 노출을 먼저 확인해 주세요.",
    "",
    "리밸런싱 참고 보기: /rebalance",
    "",
    REQUIRED_DISCLAIMER
  ].join("\n");

  return {
    subject,
    bodyText,
    bodyHtml: `<p>안녕하세요.</p><p>현재 포트폴리오 위험점수가 사용자가 설정한 상한을 초과했습니다. 자산군별 위험 노출을 먼저 확인해 주세요.</p><p><a href="/rebalance">리밸런싱 참고 보기</a></p><p>${REQUIRED_DISCLAIMER}</p>`
  };
}
