import { memo, useCallback } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Globe } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useBookmarks } from '@/hooks/useBookmarks';
import { colors } from '@/lib/theme';
import type { Bookmark } from '@/lib/db-queries';

const mascotIcon = require('@/assets/images/mascot-wave.png');

interface QuickLink {
  title: string;
  url: string;
  color: string;
  letter: string;
}

const QUICK_LINKS: QuickLink[] = [
  { title: 'Oglądaj Anime', url: 'https://ogladajanime.pl', color: '#e74c3c', letter: 'O' },
  { title: 'Shinden', url: 'https://shinden.pl', color: '#3498db', letter: 'S' },
  { title: 'AniList', url: 'https://anilist.co', color: '#2b2d42', letter: 'A' },
  { title: 'MyAnimeList', url: 'https://myanimelist.net', color: '#2e51a2', letter: 'M' },
  { title: 'YouTube', url: 'https://youtube.com', color: '#ff0000', letter: 'Y' },
  { title: 'Anime Zone', url: 'https://anime-zone.pl', color: '#ff6b35', letter: 'AZ' },
];

function QuickLinkItem({ link, onPress }: { link: QuickLink; onPress: (url: string) => void }) {
  return (
    <Pressable onPress={() => onPress(link.url)} style={s.quickLink}>
      <View style={[s.quickLinkIcon, { backgroundColor: link.color }]}>
        <Text style={s.quickLinkLetter}>{link.letter}</Text>
      </View>
      <Text style={s.quickLinkTitle} numberOfLines={1}>
        {link.title}
      </Text>
    </Pressable>
  );
}

function BookmarkItem({
  bookmark,
  onPress,
}: {
  bookmark: Bookmark;
  onPress: (url: string) => void;
}) {
  return (
    <Pressable onPress={() => onPress(bookmark.url)} style={s.bookmarkItem}>
      <Globe size={16} color={colors.mutedForeground} />
      <View style={s.bookmarkInfo}>
        <Text style={s.bookmarkTitle} numberOfLines={1}>
          {bookmark.title}
        </Text>
        <Text style={s.bookmarkUrl} numberOfLines={1}>
          {bookmark.url.replace(/^https?:\/\//, '')}
        </Text>
      </View>
    </Pressable>
  );
}

interface QuickAccessPageProps {
  onNavigate: (url: string) => void;
}

function QuickAccessPageInner({ onNavigate }: QuickAccessPageProps) {
  const { bookmarks } = useBookmarks();

  const handlePress = useCallback(
    (url: string) => {
      onNavigate(url);
    },
    [onNavigate]
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Hero */}
      <View style={s.hero}>
        <Image source={mascotIcon} style={s.mascot} resizeMode="contain" />
        <Text style={s.heroTitle}>ShiroAni</Text>
        <Text style={s.heroSubtitle}>Dokąd dziś płyniemy?</Text>
      </View>

      {/* Quick Links */}
      <Text style={s.sectionTitle}>Szybki dostęp</Text>
      <View style={s.quickLinksGrid}>
        {QUICK_LINKS.map(link => (
          <QuickLinkItem key={link.url} link={link} onPress={handlePress} />
        ))}
      </View>

      {/* Bookmarks */}
      {bookmarks.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>Zakładki</Text>
          <View style={s.bookmarksList}>
            {bookmarks.slice(0, 10).map(bm => (
              <BookmarkItem key={bm.id} bookmark={bm} onPress={handlePress} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

export const QuickAccessPage = memo(QuickAccessPageInner);

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  mascot: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.foreground,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  quickLink: {
    width: '29%',
    alignItems: 'center',
    gap: 6,
  },
  quickLinkIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkLetter: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  quickLinkTitle: {
    fontSize: 11,
    color: colors.foreground,
    textAlign: 'center',
  },
  bookmarksList: {
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bookmarkInfo: {
    flex: 1,
  },
  bookmarkTitle: {
    fontSize: 14,
    color: colors.foreground,
    fontWeight: '500',
  },
  bookmarkUrl: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 1,
  },
});
