"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { updateNotificationSettings } from "@/lib/services/notification-service";
import { useAppState } from "@/hooks/use-app-state";
import type { UserNotificationSettings } from "@/lib/types";

export function NotificationSettingsClient() {
  const { state, updateState, loaded } = useAppState();
  const [draft, setDraft] = useState<UserNotificationSettings>(
    state.notificationSettings
  );

  useEffect(() => {
    if (loaded) setDraft(state.notificationSettings);
  }, [loaded, state.notificationSettings]);

  function updateDraft(next: Partial<UserNotificationSettings>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  function save() {
    updateState(updateNotificationSettings(state, draft));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-mint">알림 설정</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">
          월간 관리 알림 기준
        </h1>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-2">
          <Toggle
            label="서비스 내 알림"
            checked={draft.inAppEnabled}
            onChange={(checked) => updateDraft({ inAppEnabled: checked })}
          />
          <Toggle
            label="이메일 알림"
            checked={draft.emailEnabled}
            onChange={(checked) => updateDraft({ emailEnabled: checked })}
          />
          <Toggle
            label="월간 자산 업데이트 알림"
            checked={draft.monthlyUpdateEnabled}
            onChange={(checked) => updateDraft({ monthlyUpdateEnabled: checked })}
          />
          <Toggle
            label="월간 리포트 알림"
            checked={draft.monthlyReportEnabled}
            onChange={(checked) => updateDraft({ monthlyReportEnabled: checked })}
          />
          <Toggle
            label="위험 경고 알림"
            checked={draft.riskWarningEnabled}
            onChange={(checked) => updateDraft({ riskWarningEnabled: checked })}
          />
          <Toggle
            label="목표 괴리 알림"
            checked={draft.targetGapWarningEnabled}
            onChange={(checked) =>
              updateDraft({ targetGapWarningEnabled: checked })
            }
          />
          <Toggle
            label="고분배 착시 알림"
            checked={draft.illusionWarningEnabled}
            onChange={(checked) => updateDraft({ illusionWarningEnabled: checked })}
          />
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              자산 업데이트 기준일
            </span>
            <input
              type="number"
              min={1}
              max={28}
              value={draft.updateDayOfMonth}
              onChange={(event) =>
                updateDraft({ updateDayOfMonth: Number(event.target.value) })
              }
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={save}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white"
          >
            <Save size={17} aria-hidden="true" />
            설정 저장
          </button>
        </div>
      </section>

      <DisclaimerNote />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-line px-4">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5"
      />
    </label>
  );
}
