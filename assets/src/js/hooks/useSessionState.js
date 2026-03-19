import { useState, useCallback } from 'react';

const store = new Map();

export function useSessionState(key, initialValue) {
  const [value, setValue] = useState(() => store.has(key) ? store.get(key) : initialValue);

  const set = useCallback((v) => {
    const next = typeof v === 'function' ? v(store.get(key) ?? initialValue) : v;
    store.set(key, next);
    setValue(next);
  }, [key, initialValue]);

  return [value, set];
}