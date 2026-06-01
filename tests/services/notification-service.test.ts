import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/lib/storage/default-state";
import {
  createNotification,
  markNotificationRead,
  updateNotificationSettings
} from "@/lib/services/notification-service";

describe("notification-service", () => {
  it("알림을 생성하고 읽음 처리할 수 있다", () => {
    const created = createNotification(createDefaultState(), {
      type: "monthly_update_request",
      message: "자산 업데이트가 필요합니다."
    });
    const read = markNotificationRead(
      created.state,
      created.notification!.id
    );

    expect(created.notification?.isRead).toBe(false);
    expect(read.notifications[0].isRead).toBe(true);
  });

  it("서비스 내 알림 설정이 꺼져 있으면 알림을 만들지 않는다", () => {
    const disabled = updateNotificationSettings(createDefaultState(), {
      inAppEnabled: false
    });
    const result = createNotification(disabled, {
      type: "cash_shortage",
      message: "현금성 자산 비중 확인"
    });

    expect(result.notification).toBeUndefined();
    expect(result.state.notifications).toHaveLength(0);
  });
});
