import type { AppState, ProductUniverseItem } from "@/lib/types";
import { createId } from "@/lib/services/service-utils";

export function addProductUniverseItem(
  state: AppState,
  input: Omit<ProductUniverseItem, "id" | "createdAt" | "updatedAt">
): AppState {
  const now = new Date().toISOString();
  const item: ProductUniverseItem = {
    ...input,
    id: createId("instrument"),
    createdAt: now,
    updatedAt: now
  };

  return {
    ...state,
    productUniverse: [item, ...state.productUniverse]
  };
}

export function updateProductUniverseItem(
  state: AppState,
  instrumentId: string,
  updates: Partial<ProductUniverseItem>
): AppState {
  const now = new Date().toISOString();

  return {
    ...state,
    productUniverse: state.productUniverse.map((item) =>
      item.id === instrumentId
        ? {
            ...item,
            ...updates,
            id: item.id,
            createdAt: item.createdAt,
            updatedAt: now
          }
        : item
    )
  };
}

export function setProductUniverseItemActive(
  state: AppState,
  instrumentId: string,
  isActive: boolean
): AppState {
  return updateProductUniverseItem(state, instrumentId, { isActive });
}

export function findProductUniverseItem(
  state: AppState,
  instrumentId: string
) {
  return state.productUniverse.find((item) => item.id === instrumentId);
}
