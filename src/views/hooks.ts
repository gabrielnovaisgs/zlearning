import { useRef } from "react";
import { useSyncExternalStore } from "react";
import { store } from "@core/store";
import { sidebarStore } from "@core/sidebar-store";
import type { AppState } from "@core/types";

export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) =>
    Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
  );
}


export function useSidebarStore() {
  return useSyncExternalStore(
    (cb) => sidebarStore.subscribe(cb),
    () => sidebarStore.getState()
  );
}