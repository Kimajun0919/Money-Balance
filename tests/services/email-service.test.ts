import { describe, expect, it } from "vitest";
import { REQUIRED_DISCLAIMER } from "@/lib/constants/disclaimer";
import { createDefaultState } from "@/lib/storage/default-state";
import { sendEmail } from "@/lib/services/email-service";
import { updateNotificationSettings } from "@/lib/services/notification-service";

describe("email-service", () => {
  it("이메일 설정이 꺼져 있으면 로그를 skipped로 저장한다", () => {
    const result = sendEmail(createDefaultState(), {
      emailType: "monthly_update_reminder"
    });

    expect(result.emailLog.status).toBe("skipped");
  });

  it("mock 모드에서 한국어 제목과 필수 고지를 포함한 이메일 로그를 저장한다", () => {
    const enabled = updateNotificationSettings(createDefaultState(), {
      emailEnabled: true
    });
    const result = sendEmail(enabled, {
      emailType: "monthly_report_ready",
      toEmail: "user@example.com"
    });

    expect(result.emailLog.status).toBe("mock_sent");
    expect(result.emailLog.subject).toContain("월간 리포트");
    expect(result.emailLog.bodyText).toContain(REQUIRED_DISCLAIMER);
  });
});
