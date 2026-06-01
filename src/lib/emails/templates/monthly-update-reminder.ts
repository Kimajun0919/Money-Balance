import { REQUIRED_DISCLAIMER } from "@/lib/constants/disclaimer";

export function monthlyUpdateReminderTemplate() {
  const subject = "Yield Balance 월간 자산 업데이트 안내";
  const bodyText = [
    "안녕하세요.",
    "",
    "이번 달 자산 업데이트가 필요합니다. 최신 자산 정보를 입력하고 월간 스냅샷을 저장해 주세요.",
    "",
    "자산 업데이트 보기: /assets",
    "",
    REQUIRED_DISCLAIMER
  ].join("\n");

  return {
    subject,
    bodyText,
    bodyHtml: `<p>안녕하세요.</p><p>이번 달 자산 업데이트가 필요합니다. 최신 자산 정보를 입력하고 월간 스냅샷을 저장해 주세요.</p><p><a href="/assets">자산 업데이트 보기</a></p><p>${REQUIRED_DISCLAIMER}</p>`
  };
}
