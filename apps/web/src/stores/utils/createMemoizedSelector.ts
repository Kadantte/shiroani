import { shallow } from 'zustand/shallow';

/**
 * Creates a memoized selector that returns a stable reference when the result
 * is shallowly equal to the previous result. This prevents unnecessary
 * re-renders when selectors return new array/object references with the
 * same contents (e.g., from .filter() or .map()).
 *
 * @example
 * export const selectFilteredEntries = createMemoizedSelector(
 *   (state: LibraryStore) => state.entries.filter(e => e.status === 'watching')
 * );
 */
export function createMemoizedSelector<S, R>(selector: (state: S) => R): (state: S) => R {
  let lastInput: S | undefined;
  let lastResult: R;
  let hasResult = false;

  return (state: S) => {
    // Skip computation entirely if the input state reference is the same
    if (hasResult && lastInput === state) return lastResult;
    const result = selector(state);
    if (hasResult && shallow(lastResult, result)) {
      lastInput = state;
      return lastResult;
    }
    hasResult = true;
    lastInput = state;
    lastResult = result;
    return result;
  };
}
