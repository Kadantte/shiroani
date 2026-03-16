import { useCallback } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { ExternalLink, Github } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Switch } from '@/components/ui/switch';
import { useSettings, type TitleLanguage } from '@/hooks/useSettings';
import { colors } from '@/lib/theme';
import { APP_NAME, GITHUB_RELEASES_URL } from '@shiroani/shared';

const mascotIcon = require('@/assets/images/mascot-wave.png');

const TITLE_LANGUAGES: { value: TitleLanguage; label: string }[] = [
  { value: 'romaji', label: 'Romaji' },
  { value: 'english', label: 'English' },
  { value: 'native', label: '日本語' },
];

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SettingsRow({
  label,
  description,
  right,
}: {
  label: string;
  description?: string;
  right: React.ReactNode;
}) {
  return (
    <View style={s.row}>
      <View style={s.rowLeft}>
        <Text style={s.rowLabel}>{label}</Text>
        {description && <Text style={s.rowDescription}>{description}</Text>}
      </View>
      {right}
    </View>
  );
}

export default function SettingsScreen() {
  const { settings, update } = useSettings();
  const appVersion = Constants.expoConfig?.version ?? '0.1.0';

  const handleGithub = useCallback(() => {
    Linking.openURL(GITHUB_RELEASES_URL);
  }, []);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* Hero Card */}
        <View style={s.heroCard}>
          <Image source={mascotIcon} style={s.heroMascot} resizeMode="contain" />
          <View style={s.heroInfo}>
            <Text style={s.heroTitle}>{APP_NAME}</Text>
            <Text style={s.heroVersion}>v{appVersion}</Text>
            <Text style={s.heroTagline}>Twój mobilny tracker anime</Text>
          </View>
        </View>

        {/* Appearance */}
        <SettingsCard title="Wygląd">
          <SettingsRow
            label="Pokaż etykiety"
            description="Nazwy pod ikonami w pasku nawigacji"
            right={
              <Switch
                checked={settings.showLabels}
                onCheckedChange={val => update('showLabels', val)}
                accessibilityLabel="Pokaż etykiety"
              />
            }
          />
        </SettingsCard>

        {/* Anime Titles */}
        <SettingsCard title="Tytuły anime">
          <Text style={s.sectionDescription}>Preferowany język tytułów w harmonogramie</Text>
          <View style={s.languageRow}>
            {TITLE_LANGUAGES.map(lang => (
              <Pressable
                key={lang.value}
                onPress={() => update('titleLanguage', lang.value)}
                style={[
                  s.languageChip,
                  settings.titleLanguage === lang.value && s.languageChipActive,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: settings.titleLanguage === lang.value }}
              >
                <Text
                  style={[
                    s.languageChipText,
                    settings.titleLanguage === lang.value && s.languageChipTextActive,
                  ]}
                >
                  {lang.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </SettingsCard>

        {/* Notifications */}
        <SettingsCard title="Powiadomienia">
          <SettingsRow
            label="Włącz powiadomienia"
            description="Przypomnienia o nowych odcinkach"
            right={
              <Switch
                checked={settings.notificationsEnabled}
                onCheckedChange={val => update('notificationsEnabled', val)}
                accessibilityLabel="Włącz powiadomienia"
              />
            }
          />
        </SettingsCard>

        {/* About */}
        <SettingsCard title="Informacje">
          <Pressable onPress={handleGithub} style={s.linkRow}>
            <Github size={18} color={colors.mutedForeground} />
            <Text style={s.linkText}>GitHub</Text>
            <ExternalLink size={14} color={colors.mutedForeground} />
          </Pressable>
        </SettingsCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 16,
  },
  heroMascot: {
    width: 72,
    height: 72,
  },
  heroInfo: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.foreground,
  },
  heroVersion: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  heroTagline: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.foreground,
  },
  rowDescription: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  sectionDescription: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  languageChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.muted,
  },
  languageChipActive: {
    backgroundColor: colors.primary,
  },
  languageChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  languageChipTextActive: {
    color: '#fff',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
  },
});
