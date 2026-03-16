import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/lib/theme';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

function Switch({ checked, onCheckedChange, disabled, accessibilityLabel }: SwitchProps) {
  const handlePress = useCallback(() => {
    if (!disabled) {
      onCheckedChange(!checked);
    }
  }, [checked, disabled, onCheckedChange]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[s.track, checked ? s.trackChecked : s.trackUnchecked, disabled && s.disabled]}
    >
      <View style={[s.thumb, checked ? s.thumbChecked : s.thumbUnchecked]} />
    </Pressable>
  );
}

export { Switch };

const s = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  trackChecked: {
    backgroundColor: colors.primary,
  },
  trackUnchecked: {
    backgroundColor: colors.muted,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  thumbChecked: {
    alignSelf: 'flex-end',
  },
  thumbUnchecked: {
    alignSelf: 'flex-start',
  },
  disabled: {
    opacity: 0.5,
  },
});
