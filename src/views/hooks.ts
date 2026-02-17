import { useSyncExternalStore } from "react";
import { store } from "@core/store";
import type { AppState } from "@core/types";

export function useStore(): AppState {
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getState()
  );
}
