import { memo, useCallback } from 'react';
import { Image, Pressable, View } from 'react-native';
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
    <View className="mx-4 mb-2 flex-row items-center rounded-lg border border-border bg-card p-3">
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          className="mr-3 rounded-md"
          style={{ width: 48, height: 68 }}
          accessibilityLabel={`Okładka: ${title}`}
        />
      ) : (
        <View
          className="mr-3 items-center justify-center rounded-md bg-muted"
          style={{ width: 48, height: 68 }}
        >
          <Text className="text-xs text-muted-foreground">?</Text>
        </View>
      )}

      <View className="flex-1 mr-2">
        <Text className="text-sm font-bold text-foreground" numberOfLines={2}>
          {title}
        </Text>
        <Text className="mt-0.5 text-xs text-muted-foreground">{episodeText}</Text>
        <View className="mt-1 flex-row items-center gap-2">
          <Text className="text-xs font-medium text-primary">{timeText}</Text>
          {anime.media.format && (
            <View className="rounded bg-muted px-1.5 py-0.5">
              <Text className="text-[10px] text-muted-foreground">{anime.media.format}</Text>
            </View>
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
        className="p-2"
      >
        <BellIcon size={20} color={subscribed ? colors.primary : colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

export const AiringEntryCard = memo(AiringEntryCardInner);
