"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppState } from "@/lib/types";
import { createDefaultState } from "@/lib/storage/default-state";
import { loadAppState, saveAppState } from "@/lib/storage/portfolio-storage";

export function useAppState() {
  const [state, setState] = useState<AppState>(() => createDefaultState());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setState(loadAppState());
    setLoaded(true);
  }, []);

  const updateState = useCallback((nextState: AppState) => {
    setState(nextState);
    saveAppState(nextState);
  }, []);

  return {
    state,
    updateState,
    loaded
  };
}
