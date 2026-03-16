import { memo, useCallback } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Bell, BellRing } from 'lucide-react-native';
import type { AiringAnime } from '@shiroani/shared';
import { Text } from '@/components/ui/text';
import {
  formatTime,
  getAnimeTitle,
  getCoverUrl,
  formatEpisodeProgress,
} from '@/lib/schedule-utils';
import { colors } from '@/lib/theme';

interface AiringEntryCardProps {
  anime: AiringAnime;
  subscribed: boolean;
  onToggleSubscription: (anime: AiringAnime) => void;
}

function AiringEntryCardInner({ anime, subscribed, onToggleSubscription }: AiringEntryCardProps) {
  const title = getAnimeTitle(anime.media);
  const coverUrl = getCoverUrl(anime.media);
  const episodeText = formatEpisodeProgress(anime.episode, anime.media.episodes ?? undefined);
  const timeText = formatTime(anime.airingAt);

  const handleToggle = useCallback(() => {
    onToggleSubscription(anime);
  }, [anime, onToggleSubscription]);

  const BellIcon = subscribed ? BellRing : Bell;

  return (
    <View style={styles.card}>
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          style={styles.cover}
          accessibilityLabel={`Okładka: ${title}`}
        />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Text style={styles.placeholderText}>?</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.episode}>{episodeText}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.time}>{timeText}</Text>
          {anime.media.format && (
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>{anime.media.format}</Text>
            </View>
          )}
          {anime.media.averageScore != null && (
            <Text style={styles.score}>★ {(anime.media.averageScore / 10).toFixed(1)}</Text>
          )}
        </View>
      </View>

      <Pressable
        onPress={handleToggle}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={
          subscribed ? `Wyłącz powiadomienia: ${title}` : `Włącz powiadomienia: ${title}`
        }
        style={styles.bellButton}
      >
        <BellIcon size={20} color={subscribed ? colors.primary : colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

export const AiringEntryCard = memo(AiringEntryCardInner);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cover: {
    width: 48,
    height: 68,
    borderRadius: 6,
    marginRight: 12,
  },
  coverPlaceholder: {
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  episode: {
    marginTop: 2,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  formatBadge: {
    backgroundColor: colors.muted,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  formatText: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  score: {
    fontSize: 11,
    color: colors.gold,
    fontWeight: '500',
  },
  bellButton: {
    padding: 8,
  },
});
