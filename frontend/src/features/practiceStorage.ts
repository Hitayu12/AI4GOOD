import { useCallback, useEffect, useState, type SetStateAction } from 'react';

export function learnerStorageKey(key: string, accountId?: string) {
  return accountId && accountId !== 'guest' ? `${key}:${accountId}` : key;
}

export function readPractice<T>(key: string, isValid: (value: unknown) => value is T): T | undefined {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`fw-practice:v1:${key}`) ?? 'null');
    return isValid(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function writePractice(key: string, value: unknown) {
  try {
    localStorage.setItem(`fw-practice:v1:${key}`, JSON.stringify(value));
  } catch {
    // Practice stays available if the browser blocks storage or its quota is full.
  }
}

export function useStoredPractice<T>(key: string | undefined, initial: () => T) {
  const [entry, setEntry] = useState(() => ({ key, value: initial() }));
  if (entry.key !== key) setEntry({ key, value: initial() });
  useEffect(() => {
    if (!key || entry.key !== key) return;
    writePractice(key, entry.value);
  }, [key, entry]);
  const setValue = useCallback((update: SetStateAction<T>) => setEntry((current) => {
    if (current.key !== key) return current;
    const value = typeof update === 'function' ? (update as (previous: T) => T)(current.value) : update;
    return Object.is(value, current.value) ? current : { key, value };
  }), [key]);
  return [entry.value, setValue] as const;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
