import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { ExternalLink, Github } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Switch } from '@/components/ui/switch';
import { colors } from '@/lib/theme';
import { APP_NAME, GITHUB_RELEASES_URL } from '@shiroani/shared';

type TitleLanguage = 'romaji' | 'english' | 'native';

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
  const [showLabels, setShowLabels] = useState(true);
  const [titleLanguage, setTitleLanguage] = useState<TitleLanguage>('romaji');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const appVersion = Constants.expoConfig?.version ?? '0.1.0';

  const handleGithub = useCallback(() => {
    Linking.openURL(GITHUB_RELEASES_URL);
  }, []);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* Appearance */}
        <SettingsCard title="Wygląd">
          <SettingsRow
            label="Pokaż etykiety"
            description="Nazwy pod ikonami w pasku nawigacji"
            right={
              <Switch
                checked={showLabels}
                onCheckedChange={setShowLabels}
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
                onPress={() => setTitleLanguage(lang.value)}
                style={[s.languageChip, titleLanguage === lang.value && s.languageChipActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: titleLanguage === lang.value }}
              >
                <Text
                  style={[
                    s.languageChipText,
                    titleLanguage === lang.value && s.languageChipTextActive,
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
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
                accessibilityLabel="Włącz powiadomienia"
              />
            }
          />
        </SettingsCard>

        {/* About */}
        <SettingsCard title="Informacje">
          <SettingsRow label="Wersja" description={`${APP_NAME} v${appVersion}`} right={null} />

          <Pressable onPress={handleGithub} style={s.linkRow}>
            <Github size={18} color={colors.mutedForeground} />
            <Text style={s.linkText}>GitHub</Text>
            <ExternalLink size={14} color={colors.mutedForeground} />
          </Pressable>
        </SettingsCard>

        <View style={s.footer}>
          <Text style={s.footerText}>{APP_NAME} — Twój tracker anime</Text>
        </View>
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 4,
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
    fontSize: 14,
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
    paddingHorizontal: 14,
    paddingVertical: 6,
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
    paddingVertical: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
