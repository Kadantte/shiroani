import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import {
  type Bookmark,
  getBookmarks,
  addBookmark as addBookmarkQuery,
  deleteBookmark as deleteBookmarkQuery,
} from '@/lib/db-queries';

export function useBookmarks(folder?: string) {
  const db = useSQLiteContext();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBookmarks(db, folder);
      setBookmarks(data);
    } finally {
      setLoading(false);
    }
  }, [db, folder]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addBookmark = useCallback(
    async (data: { url: string; title: string; favicon?: string; folder?: string }) => {
      await addBookmarkQuery(db, data);
      await refresh();
    },
    [db, refresh]
  );

  const deleteBookmark = useCallback(
    async (id: number) => {
      await deleteBookmarkQuery(db, id);
      setBookmarks(prev => prev.filter(b => b.id !== id));
    },
    [db]
  );

  return { bookmarks, loading, refresh, addBookmark, deleteBookmark };
}
