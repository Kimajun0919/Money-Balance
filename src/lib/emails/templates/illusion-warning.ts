import { REQUIRED_DISCLAIMER } from "@/lib/constants/disclaimer";

export function illusionWarningTemplate() {
  const subject = "Yield Balance 고분배 착시 안내";
  const bodyText = [
    "안녕하세요.",
    "",
    "인컴수익률이 높지만 가격 변화를 반영한 총수익률이 낮은 자산군이 있습니다. 분배금만 기준으로 판단하지 않도록 확인해 주세요.",
    "",
    "대시보드 보기: /dashboard",
    "",
    REQUIRED_DISCLAIMER
  ].join("\n");

  return {
    subject,
    bodyText,
    bodyHtml: `<p>안녕하세요.</p><p>인컴수익률이 높지만 가격 변화를 반영한 총수익률이 낮은 자산군이 있습니다. 분배금만 기준으로 판단하지 않도록 확인해 주세요.</p><p><a href="/dashboard">대시보드 보기</a></p><p>${REQUIRED_DISCLAIMER}</p>`
  };
}
