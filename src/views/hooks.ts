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

export function useStore<T>(
  selector: (s: AppState) => T,
  equals: (a: T, b: T) => boolean = Object.is
): T {
  const lastResult = useRef<{ value: T } | null>(null);

  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => {
      const next = selector(store.getState());
      if (lastResult.current !== null && equals(lastResult.current.value, next)) {
        return lastResult.current.value; // referência estável → sem re-render
      }
      lastResult.current = { value: next };
      return next;
    }
  );
}


export function useSidebarStore() {
  const lastResult = useRef<Set<string> | null>(null);

  return useSyncExternalStore(
    (cb) => sidebarStore.subscribe(cb),
    () => {
      const next = sidebarStore.getState();
      if (lastResult.current !== null && shallowEqual(lastResult.current, next)) {
        return lastResult.current; // referência estável → sem re-render
      }
      lastResult.current = next;
      return next;
    }
  );
}