import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { AnimeEntry, AnimeStatus } from '@shiroani/shared';
import {
  getAnimeLibrary,
  getAnimeByStatus,
  addAnime as addAnimeQuery,
  updateAnime as updateAnimeQuery,
  deleteAnime as deleteAnimeQuery,
} from '@/lib/db-queries';

export function useAnimeLibrary(filterStatus?: AnimeStatus) {
  const db = useSQLiteContext();
  const [entries, setEntries] = useState<AnimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = filterStatus
        ? await getAnimeByStatus(db, filterStatus)
        : await getAnimeLibrary(db);
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, [db, filterStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addAnime = useCallback(
    async (data: Omit<AnimeEntry, 'id' | 'addedAt' | 'updatedAt'>) => {
      const entry = await addAnimeQuery(db, data);
      setEntries(prev => [entry, ...prev]);
      return entry;
    },
    [db]
  );

  const updateAnime = useCallback(
    async (id: number, data: Partial<AnimeEntry>) => {
      await updateAnimeQuery(db, id, data);
      await refresh();
    },
    [db, refresh]
  );

  const deleteAnime = useCallback(
    async (id: number) => {
      await deleteAnimeQuery(db, id);
      setEntries(prev => prev.filter(e => e.id !== id));
    },
    [db]
  );

  return { entries, loading, refresh, addAnime, updateAnime, deleteAnime };
}
