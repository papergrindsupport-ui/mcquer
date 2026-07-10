import { useEffect, useRef, useState } from "react";

export function usePersistedState<T>(
  key: string,
  initial: T,
  validate?: (v: unknown) => v is T,
): [T, (v: T | ((prev: T) => T)) => void] {
  // Lazy initializer reads localStorage synchronously on mount so the very
  // first render already has the restored value. This avoids a race where a
  // write effect would fire with the default value before an async load
  // effect could restore the persisted one, clobbering the saved data on
  // client-side navigation back to a page.
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initial;
      const parsed = JSON.parse(raw);
      if (validate && !validate(parsed)) return initial;
      return parsed as T;
    } catch {
      return initial;
    }
  });

  // Track the last key we wrote for, so a key change re-hydrates instead of
  // writing the previous key's value under the new key.
  const lastKey = useRef(key);
  useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return;
      const parsed = JSON.parse(raw);
      if (validate && !validate(parsed)) return;
      setValue(parsed as T);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent("igv:persist", { detail: { key } }));
    } catch {}
  }, [key, value]);


  return [value, setValue];
}
