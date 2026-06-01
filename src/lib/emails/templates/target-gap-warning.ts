import { REQUIRED_DISCLAIMER } from "@/lib/constants/disclaimer";

export function targetGapWarningTemplate() {
  const subject = "Yield Balance 목표 괴리 안내";
  const bodyText = [
    "안녕하세요.",
    "",
    "목표수익률과 기준 기대수익률 사이에 의미 있는 차이가 있습니다. 추가 수익률 추구에는 추가 위험이 동반될 수 있습니다.",
    "",
    "목표 포트폴리오 보기: /target-portfolio",
    "",
    REQUIRED_DISCLAIMER
  ].join("\n");

  return {
    subject,
    bodyText,
    bodyHtml: `<p>안녕하세요.</p><p>목표수익률과 기준 기대수익률 사이에 의미 있는 차이가 있습니다. 추가 수익률 추구에는 추가 위험이 동반될 수 있습니다.</p><p><a href="/target-portfolio">목표 포트폴리오 보기</a></p><p>${REQUIRED_DISCLAIMER}</p>`
  };
}
