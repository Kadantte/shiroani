import { DarkTheme, type Theme } from '@react-navigation/native';

const colors = {
  background: 'hsl(300 10% 5%)',
  foreground: 'hsl(350 20% 92%)',
  card: 'hsl(350 8% 11%)',
  cardForeground: 'hsl(350 20% 92%)',
  primary: 'hsl(345 60% 55%)',
  primaryForeground: 'hsl(0 0% 100%)',
  gold: 'hsl(42 55% 58%)',
  muted: 'hsl(350 7% 14%)',
  mutedForeground: 'hsl(350 10% 40%)',
  border: 'hsl(350 7% 18%)',
  destructive: 'hsl(0 100% 71%)',
};

export const NAV_THEME: Theme = {
  ...DarkTheme,
  colors: {
    background: colors.background,
    border: colors.border,
    card: colors.card,
    notification: colors.destructive,
    primary: colors.primary,
    text: colors.foreground,
  },
};

export { colors };
