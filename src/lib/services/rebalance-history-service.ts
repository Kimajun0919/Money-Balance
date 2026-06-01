import { logKpiEvent } from "@/lib/kpi/event-logger";
import type {
  AppState,
  RebalanceStatus,
  RebalanceSuggestionRecord,
  SuggestionStatus
} from "@/lib/types";

export function listRebalanceSuggestions(
  state: AppState,
  filters: {
    month?: string;
    suggestionType?: RebalanceStatus | "all";
    status?: SuggestionStatus | "all";
  } = {}
) {
  logKpiEvent("rebalance_history_filtered", filters);

  return state.rebalanceSuggestions
    .filter((suggestion) => {
      if (
        filters.suggestionType &&
        filters.suggestionType !== "all" &&
        suggestion.suggestionType !== filters.suggestionType
      ) {
        return false;
      }
      if (
        filters.status &&
        filters.status !== "all" &&
        suggestion.status !== filters.status
      ) {
        return false;
      }
      if (filters.month) {
        return suggestion.createdAt.slice(0, 7) === filters.month;
      }
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function getRebalanceSuggestionDetail(
  state: AppState,
  suggestionId: string
) {
  return state.rebalanceSuggestions.find(
    (suggestion) => suggestion.id === suggestionId
  );
}

export function updateRebalanceSuggestionStatus(
  state: AppState,
  suggestionId: string,
  status: SuggestionStatus
): AppState {
  const updatedState: AppState = {
    ...state,
    rebalanceSuggestions: state.rebalanceSuggestions.map((suggestion) =>
      suggestion.id === suggestionId
        ? { ...suggestion, status, updatedAt: new Date().toISOString() }
        : suggestion
    )
  };

  if (status === "applied") {
    logKpiEvent("rebalance_status_applied", { suggestionId });
  }
  if (status === "deferred") {
    logKpiEvent("rebalance_status_deferred", { suggestionId });
  }

  return updatedState;
}

export function createSuggestionFromSnapshot(
  suggestion: RebalanceSuggestionRecord
) {
  return suggestion;
}
