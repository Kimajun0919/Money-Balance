"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { RISK_TOLERANCE_LABELS } from "@/lib/constants/asset-types";
import { calculateTargetAllocation } from "@/lib/engines/target-allocation-engine";
import { calculateRiskScoreLimit } from "@/lib/engines/risk-score-engine";
import type {
  AccountType,
  InvestmentHorizon,
  RiskTolerance,
  UserProfile
} from "@/lib/types";
import { ACCOUNT_LABELS, INVESTMENT_HORIZON_LABELS } from "@/lib/utils/labels";
import {
  formatPercent,
  fromPercentValue,
  toPercentValue
} from "@/lib/utils/percentage";
import { validateOnboardingInput } from "@/lib/validators/onboarding-validator";
import { useAppState } from "@/hooks/use-app-state";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { logKpiEvent } from "@/lib/kpi/event-logger";

const targetReturnOptions = [0.05, 0.07, 0.1, 0.12];
const riskToleranceOptions: RiskTolerance[] = [
  "conservative",
  "moderate",
  "growth",
  "aggressive"
];
const lossToleranceOptions = [-0.05, -0.1, -0.2, -0.3];
const horizonOptions: InvestmentHorizon[] = [
  "under_1y",
  "one_to_three",
  "three_to_five",
  "five_plus"
];
const accountOptions: AccountType[] = [
  "general",
  "isa",
  "pension",
  "irp",
  "tax_free",
  "unknown"
];

export function OnboardingClient() {
  const router = useRouter();
  const { state, updateState, loaded } = useAppState();
  const [draft, setDraft] = useState<UserProfile>(state.profile);
  const normalizedDraft = useMemo(
    () => ({
      ...draft,
      riskScoreLimit: calculateRiskScoreLimit(draft.lossTolerance)
    }),
    [draft]
  );
  const validation = validateOnboardingInput(normalizedDraft);
  const targetAllocation = calculateTargetAllocation({
    targetReturn: normalizedDraft.targetReturn,
    riskTolerance: normalizedDraft.riskTolerance,
    minCashRatio: normalizedDraft.minCashRatio,
    investmentHorizon: normalizedDraft.investmentHorizon,
    lossTolerance: normalizedDraft.lossTolerance
  });

  useEffect(() => {
    if (loaded) setDraft(state.profile);
  }, [loaded, state.profile]);

  function updateDraft(next: Partial<UserProfile>) {
    setDraft((current) => ({
      ...current,
      ...next
    }));
  }

  function saveProfile() {
    if (!validation.valid || targetAllocation.blocked) return;
    const nextState = {
      ...state,
      profile: normalizedDraft
    };
    updateState(nextState);
    logKpiEvent("onboarding_completed", {
      targetReturn: normalizedDraft.targetReturn,
      riskTolerance: normalizedDraft.riskTolerance
    });
    router.push("/assets");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-mint">온보딩</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">
          목표수익률과 위험 기준 설정
        </h1>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">이름</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
              value={draft.name}
              onChange={(event) => updateDraft({ name: event.target.value })}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              월 신규 투자금
            </span>
            <input
              type="number"
              min={0}
              step={100000}
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
              value={draft.monthlyInvestment}
              onChange={(event) =>
                updateDraft({ monthlyInvestment: Number(event.target.value) })
              }
            />
          </label>
        </div>

        <div className="mt-6">
          <span className="text-sm font-medium text-neutral-700">
            연 목표수익률
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {targetReturnOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`h-10 rounded-md border px-4 text-sm font-semibold ${
                  draft.targetReturn === option
                    ? "border-mint bg-mint text-white"
                    : "border-line bg-white text-neutral-700"
                }`}
                onClick={() => updateDraft({ targetReturn: option })}
              >
                {formatPercent(option, 0)}
              </button>
            ))}
            <label className="flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm">
              직접 입력
              <input
                type="number"
                min={1}
                max={20}
                step={0.1}
                className="h-8 w-24 rounded border border-line px-2"
                value={toPercentValue(draft.targetReturn)}
                onChange={(event) =>
                  updateDraft({
                    targetReturn: fromPercentValue(Number(event.target.value))
                  })
                }
              />
              %
            </label>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <span className="text-sm font-medium text-neutral-700">
              위험허용도
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {riskToleranceOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`h-10 rounded-md border px-3 text-sm font-semibold ${
                    draft.riskTolerance === option
                      ? "border-mint bg-mint text-white"
                      : "border-line bg-white text-neutral-700"
                  }`}
                  onClick={() => updateDraft({ riskTolerance: option })}
                >
                  {RISK_TOLERANCE_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm font-medium text-neutral-700">
              손실 허용폭
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {lossToleranceOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`h-10 rounded-md border px-3 text-sm font-semibold ${
                    draft.lossTolerance === option
                      ? "border-mint bg-mint text-white"
                      : "border-line bg-white text-neutral-700"
                  }`}
                  onClick={() => updateDraft({ lossTolerance: option })}
                >
                  {option === -0.3 ? "-30% 이상" : formatPercent(option, 0)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              투자 기간
            </span>
            <select
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
              value={draft.investmentHorizon}
              onChange={(event) =>
                updateDraft({
                  investmentHorizon: event.target.value as InvestmentHorizon
                })
              }
            >
              {horizonOptions.map((option) => (
                <option key={option} value={option}>
                  {INVESTMENT_HORIZON_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              최소 현금성 자산 비중
            </span>
            <input
              type="number"
              min={5}
              max={50}
              step={1}
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
              value={toPercentValue(draft.minCashRatio)}
              onChange={(event) =>
                updateDraft({
                  minCashRatio: fromPercentValue(Number(event.target.value))
                })
              }
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              기본 계좌 유형
            </span>
            <select
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
              value={draft.defaultAccountType}
              onChange={(event) =>
                updateDraft({
                  defaultAccountType: event.target.value as AccountType
                })
              }
            >
              {accountOptions.map((option) => (
                <option key={option} value={option}>
                  {ACCOUNT_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">기준 포트폴리오 확인</h2>
        {targetAllocation.blocked ? (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {targetAllocation.blockReason}
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-line p-3">
              <p className="text-sm text-neutral-500">적용 밴드</p>
              <p className="mt-1 text-xl font-bold">
                {formatPercent(targetAllocation.mappedBand)}
              </p>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="text-sm text-neutral-500">기준 기대수익률</p>
              <p className="mt-1 text-xl font-bold">
                {formatPercent(targetAllocation.expectedReturn)}
              </p>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="text-sm text-neutral-500">위험점수 상한</p>
              <p className="mt-1 text-xl font-bold">
                {normalizedDraft.riskScoreLimit}점
              </p>
            </div>
          </div>
        )}

        {[...validation.errors, ...targetAllocation.warnings, ...validation.warnings].length > 0 ? (
          <div className="mt-4 space-y-2">
            {validation.errors.map((error) => (
              <p
                key={error}
                className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
              >
                {error}
              </p>
            ))}
            {[...targetAllocation.warnings, ...validation.warnings].map(
              (warning) => (
                <p
                  key={warning}
                  className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                >
                  {warning}
                </p>
              )
            )}
          </div>
        ) : null}
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveProfile}
          disabled={!validation.valid || targetAllocation.blocked}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-mint px-5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          <Save size={18} aria-hidden="true" />
          설정 저장
        </button>
      </div>

      <DisclaimerNote />
    </div>
  );
}
