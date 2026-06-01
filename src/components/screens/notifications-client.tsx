"use client";

import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { logKpiEvent } from "@/lib/kpi/event-logger";
import {
  markAllNotificationsRead,
  markNotificationRead
} from "@/lib/services/notification-service";
import { useAppState } from "@/hooks/use-app-state";
import {
  NOTIFICATION_PRIORITY_LABELS,
  NOTIFICATION_TYPE_LABELS
} from "@/lib/utils/labels";

export function NotificationsClient() {
  const { state, updateState, loaded } = useAppState();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const notifications = state.notifications.filter((notification) =>
    unreadOnly ? !notification.isRead : true
  );

  useEffect(() => {
    if (loaded) logKpiEvent("notification_viewed");
  }, [loaded]);

  function read(notificationId: string) {
    updateState(markNotificationRead(state, notificationId));
  }

  function readAll() {
    updateState(markAllNotificationsRead(state));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">알림</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">서비스 알림 센터</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setUnreadOnly((current) => !current)}
            className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-neutral-700"
          >
            {unreadOnly ? "전체 알림" : "읽지 않은 알림"}
          </button>
          <button
            type="button"
            onClick={readAll}
            className="inline-flex items-center gap-2 rounded-md bg-mint px-4 py-2 text-sm font-semibold text-white"
          >
            <CheckCheck size={17} aria-hidden="true" />
            모두 읽음 처리
          </button>
        </div>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="space-y-3">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`rounded-md border p-4 ${
                notification.isRead
                  ? "border-line bg-neutral-50"
                  : "border-mint/30 bg-teal-50"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-neutral-500">
                    {NOTIFICATION_TYPE_LABELS[notification.type]} ·{" "}
                    {NOTIFICATION_PRIORITY_LABELS[notification.priority]}
                  </p>
                  <h2 className="mt-1 font-bold text-ink">{notification.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-700">
                    {notification.message}
                  </p>
                  <p className="mt-2 text-xs text-neutral-500">
                    {notification.createdAt.slice(0, 10)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={notification.linkUrl}
                    className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-neutral-700"
                  >
                    자세히 보기
                  </Link>
                  {!notification.isRead ? (
                    <button
                      type="button"
                      onClick={() => read(notification.id)}
                      className="rounded-md bg-mint px-3 py-2 text-sm font-semibold text-white"
                    >
                      읽음 처리
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500">
              표시할 알림이 없습니다.
            </p>
          ) : null}
        </div>
      </section>

      <DisclaimerNote />
    </div>
  );
}
