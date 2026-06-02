"use client";

import { Play, Plus, Power } from "lucide-react";
import { useState } from "react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { useAppState } from "@/hooks/use-app-state";
import {
  acceptRebalancingAcknowledgement,
  createRebalancingRule,
  setRebalancingRuleEnabled
} from "@/lib/services/rebalancing-rule-service";
import { runRebalancingRuleCheck } from "@/lib/services/rebalancing-scheduler-service";
import { formatKrw } from "@/lib/utils/currency";
import { formatPercent } from "@/lib/utils/percentage";

export function RebalancingRules() {
  const { state, updateState } = useAppState();
  const [ruleName, setRuleName] = useState("드리프트 자동 점검");
  const [message, setMessage] = useState("");
  const policy = state.rebalancingPolicies[0];

  function createRule() {
    let nextState = acceptRebalancingAcknowledgement(state, "auto_rebalancing");
    const result = createRebalancingRule(nextState, {
      policyId: policy.id,
      ruleName,
      ruleType: "portfolio_drift",
      requireManualReview: true
    });
    updateState(result.state);
    setMessage("자동 리밸런싱 규칙을 생성했습니다.");
  }

  function toggle(ruleId: string, enabled: boolean) {
    updateState(setRebalancingRuleEnabled(state, ruleId, enabled));
    setMessage(enabled ? "규칙 활성화를 요청했습니다." : "규칙을 비활성화했습니다.");
  }

  function run(ruleId: string) {
    updateState(runRebalancingRuleCheck(state, ruleId, "manual_check"));
    setMessage("규칙 점검을 실행했습니다.");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-mint">자동 규칙</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">리밸런싱 규칙</h1>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={ruleName}
            onChange={(event) => setRuleName(event.target.value)}
            className="h-10 rounded-md border border-line px-3 text-sm"
          />
          <button
            type="button"
            onClick={createRule}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white"
          >
            <Plus size={17} aria-hidden="true" />
            규칙 생성
          </button>
        </div>
        {message ? (
          <p className="mt-4 rounded-md border border-line bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
            {message}
          </p>
        ) : null}
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">규칙 목록</h2>
        <p className="mt-2 text-sm text-neutral-600">
          자동 리밸런싱 규칙은 사용자가 설정한 조건과 한도 내에서만 실행됩니다.
        </p>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">규칙</th>
                <th className="py-3 pr-3">유형</th>
                <th className="py-3 pr-3 text-right">기준</th>
                <th className="py-3 pr-3 text-right">한도</th>
                <th className="py-3 pr-3">상태</th>
                <th className="py-3 pr-3 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {state.rebalancingRules.map((rule) => (
                <tr key={rule.id} className="border-b border-line/70">
                  <td className="py-3 pr-3 font-medium">{rule.ruleName}</td>
                  <td className="py-3 pr-3">{rule.ruleType}</td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(rule.driftThresholdPercent)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatKrw(rule.maxTotalOrderAmount)}
                  </td>
                  <td className="py-3 pr-3">
                    {rule.enabled ? "활성" : "비활성"}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => toggle(rule.id, !rule.enabled)}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-line px-2 text-xs font-semibold text-neutral-700"
                      >
                        <Power size={14} aria-hidden="true" />
                        {rule.enabled ? "끄기" : "켜기"}
                      </button>
                      <button
                        type="button"
                        onClick={() => run(rule.id)}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-line px-2 text-xs font-semibold text-neutral-700"
                      >
                        <Play size={14} aria-hidden="true" />
                        점검
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <DisclaimerNote />
    </div>
  );
}
