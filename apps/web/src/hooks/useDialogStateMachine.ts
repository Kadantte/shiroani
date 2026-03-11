import { useState, useCallback } from 'react';

type StepState<TSteps extends string> = { step: TSteps } & Record<string, unknown>;

export function useDialogStateMachine<TState extends StepState<string>>(
  initialState: TState & { step: TState['step'] }
) {
  const [state, setState] = useState<TState>(initialState);

  const transition = useCallback((next: TState) => {
    setState(next);
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, [initialState]);

  const updateState = useCallback((updater: (prev: TState) => TState) => {
    setState(updater);
  }, []);

  return { state, transition, reset, updateState } as const;
}
