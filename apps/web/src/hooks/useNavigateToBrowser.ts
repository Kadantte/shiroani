import { useCallback } from 'react';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useAppStore } from '@/stores/useAppStore';

export function useNavigateToBrowser() {
  const openTab = useBrowserStore(s => s.openTab);
  const navigateTo = useAppStore(s => s.navigateTo);

  return useCallback(
    (url?: string) => {
      openTab(url);
      navigateTo('browser');
    },
    [openTab, navigateTo]
  );
}
