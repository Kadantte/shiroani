import { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '@/lib/theme';

function SkeletonBox({
  width,
  height,
  style,
}: {
  width: number | string;
  height: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius: 6, backgroundColor: colors.card, opacity },
        style,
      ]}
    />
  );
}

function SkeletonCard({ titleWidth }: { titleWidth: number }) {
  return (
    <View style={s.card}>
      <SkeletonBox width={48} height={68} style={{ borderRadius: 6 }} />
      <View style={s.info}>
        <SkeletonBox width={titleWidth} height={16} />
        <SkeletonBox width={80} height={12} style={{ marginTop: 6 }} />
        <View style={s.metaRow}>
          <SkeletonBox width={40} height={12} />
          <SkeletonBox width={28} height={16} style={{ borderRadius: 4 }} />
        </View>
      </View>
      <SkeletonBox width={20} height={20} style={{ borderRadius: 10 }} />
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
