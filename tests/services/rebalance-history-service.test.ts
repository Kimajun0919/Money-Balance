import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/lib/storage/default-state";
import {
  listRebalanceSuggestions,
  updateRebalanceSuggestionStatus
} from "@/lib/services/rebalance-history-service";
import type { RebalanceSuggestionRecord } from "@/lib/types";

function suggestion(overrides: Partial<RebalanceSuggestionRecord> = {}): RebalanceSuggestionRecord {
  return {
    id: crypto.randomUUID(),
    suggestionType: "allocation_gap",
    targetReturn: 0.1,
    currentExpectedReturn: 0.08,
    riskScore: 50,
    cashRatio: 0.1,
    summary: "자산군 비중 확인",
    detail: "상세",
    actionData: {},
    status: "suggested",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides
  };
}

describe("rebalance-history-service", () => {
  it("유형과 상태로 리밸런싱 이력을 필터링한다", () => {
    const state = {
      ...createDefaultState(),
      rebalanceSuggestions: [
        suggestion({ suggestionType: "risk_excess", status: "deferred" }),
        suggestion({ suggestionType: "allocation_gap", status: "suggested" })
      ]
    };

    const result = listRebalanceSuggestions(state, {
      suggestionType: "risk_excess",
      status: "deferred"
    });

    expect(result).toHaveLength(1);
    expect(result[0].suggestionType).toBe("risk_excess");
  });

  it("리밸런싱 제안 상태를 변경한다", () => {
    const item = suggestion();
    const state = {
      ...createDefaultState(),
      rebalanceSuggestions: [item]
    };
    const updated = updateRebalanceSuggestionStatus(state, item.id, "viewed");

    expect(updated.rebalanceSuggestions[0].status).toBe("viewed");
  });
});
