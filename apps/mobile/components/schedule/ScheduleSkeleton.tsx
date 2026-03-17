import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/lib/theme';

function SkeletonBox({
  width,
  height,
  radius = 6,
  style,
}: {
  width: number;
  height: number;
  radius?: number;
  style?: object;
}) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.8, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.border },
        animatedStyle,
        style,
      ]}
    />
  );
}

function SkeletonCard({ titleWidth }: { titleWidth: number }) {
  return (
    <View style={s.card}>
      <SkeletonBox width={48} height={68} radius={6} />
      <View style={s.info}>
        <SkeletonBox width={titleWidth} height={14} />
        <SkeletonBox width={80} height={10} style={{ marginTop: 6 }} />
        <View style={s.metaRow}>
          <SkeletonBox width={40} height={10} />
          <SkeletonBox width={28} height={14} radius={4} />
        </View>
      </View>
      <SkeletonBox width={20} height={20} radius={10} />
    </View>
  );
}

function ScheduleSkeletonInner() {
  const widths = [200, 160, 240, 180, 220, 150];

  return (
    <View style={s.container}>
      {widths.map((w, i) => (
        <SkeletonCard key={i} titleWidth={w} />
      ))}
    </View>
  );
}

export const ScheduleSkeleton = memo(ScheduleSkeletonInner);

const s = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 16,
  },
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
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
});
