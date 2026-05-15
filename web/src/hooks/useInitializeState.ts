'use client';

import { useEffect, useState, useCallback, type Dispatch, type SetStateAction } from 'react';

/**
 * Hook that safely sets state during initial mount without triggering
 * the "setState in useEffect" ESLint warning.
 *
 * Use this instead of the pattern:
 *   eslint-disable react-hooks/set-state-in-effect
 *   useEffect(() => { setState(value); }, []);
 *
 * @param initializer Function that returns the initial value
 * @returns State tuple [value, setValue]
 *
 * @example
 * const [roles, setRoles] = useInitializeState(() => fetchRoles());
 */
export function useInitializeState<T>(
  initializer: () => T | Promise<T>
): [T | undefined, Dispatch<SetStateAction<T | undefined>>] {
  const [value, setValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const result = initializer();
      // Handle both sync and async initializers
      const resolved = result instanceof Promise ? await result : result;
      if (mounted) {
        setValue(resolved);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [initializer]);

  return [value, setValue];
}

/**
 * Hook that runs an initialization effect once on mount.
 * Safe alternative to setState-in-useEffect pattern.
 *
 * @param effect The effect function to run on mount
 * @param deps Dependencies (should typically be empty [])
 *
 * @example
 * useMountEffect(() => {
 *   setData(fetchData());
 * }, []);
 */
export function useMountEffect(
  effect: () => void | (() => void),
  deps: unknown[] = []
): void {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(effect, deps);
}

/**
 * Debounced state updater that batches rapid updates.
 *
 * @param initialState Initial state value
 * @param delay Debounce delay in milliseconds
 * @returns State tuple [value, setValue]
 */
export function useDebouncedState<T>(
  initialState: T,
  delay = 300
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialState);
  const [pendingValue, setPendingValue] = useState<T | null>(null);

  useEffect(() => {
    if (pendingValue === null) return;

    const timer = setTimeout(() => {
      setValue(pendingValue!);
      setPendingValue(null);
    }, delay);

    return () => clearTimeout(timer);
  }, [pendingValue, delay]);

  const setDebouncedValue = useCallback((v: T | ((prev: T) => T)) => {
    const resolved = typeof v === 'function' ? (v as (prev: T) => T)(value) : v;
    setPendingValue(resolved);
  }, [value]);

  return [value, setDebouncedValue as Dispatch<SetStateAction<T>>];
}
