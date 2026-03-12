import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const STORAGE_KEY = 'onboarding-completed';

interface OnboardingState {
  /** Whether the user has completed onboarding */
  completed: boolean;
  /** Mark onboarding as completed */
  setCompleted: () => void;
  /** Reset onboarding so it shows again */
  reset: () => void;
}

function getPersistedValue(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export const useOnboardingStore = create<OnboardingState>()(
  devtools(
    (set) => ({
      completed: getPersistedValue(),

      setCompleted: () => {
        set({ completed: true }, undefined, 'onboarding/setCompleted');
        try {
          localStorage.setItem(STORAGE_KEY, 'true');
        } catch {
          // Storage unavailable — state still in memory
        }
      },

      reset: () => {
        set({ completed: false }, undefined, 'onboarding/reset');
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Storage unavailable
        }
      },
    }),
    { name: 'onboarding' },
  ),
);
