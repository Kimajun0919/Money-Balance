import type { AppState, WatchlistItem } from "@/lib/types";
import { createId } from "@/lib/services/service-utils";

export function addRecommendationToWatchlist(
  state: AppState,
  recommendationId: string,
  note = ""
): AppState {
  const recommendation = state.recommendations.find(
    (item) => item.id === recommendationId
  );
  if (!recommendation) return state;

  const existing = state.watchlist.find(
    (item) => item.instrumentId === recommendation.instrumentId
  );
  if (existing) {
    return {
      ...state,
      watchlist: state.watchlist.map((item) =>
        item.id === existing.id
          ? {
              ...item,
              isActive: true,
              priority: recommendation.score >= 20 ? "high" : item.priority,
              note: note || item.note,
              updatedAt: new Date().toISOString()
            }
          : item
      )
    };
  }

  const now = new Date().toISOString();
  const watchlistItem: WatchlistItem = {
    id: createId("watch"),
    instrumentId: recommendation.instrumentId,
    ticker: recommendation.ticker,
    instrumentName: recommendation.instrumentName,
    priority:
      recommendation.score >= 20
        ? "high"
        : recommendation.score >= 10
          ? "medium"
          : "low",
    note,
    addedFromRecommendationId: recommendationId,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };

  return {
    ...state,
    watchlist: [watchlistItem, ...state.watchlist]
  };
}

export function setWatchlistItemActive(
  state: AppState,
  watchlistItemId: string,
  isActive: boolean
): AppState {
  const now = new Date().toISOString();

  return {
    ...state,
    watchlist: state.watchlist.map((item) =>
      item.id === watchlistItemId ? { ...item, isActive, updatedAt: now } : item
    )
  };
}
