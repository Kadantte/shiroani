import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { colors } from '@/lib/theme';

const mascotThink = require('@/assets/images/mascot-think.png');

// ============================================
// Timing constants (matching desktop)
// ============================================

const MIN_DISPLAY_MS = 3000;
const EXIT_DURATION_MS = 600;
const SPINNER_DELAY_MS = 600;
const MESSAGE_ROTATE_MS = 1400;

const LOADING_MESSAGES = [
  'Shiro-chan się przeciąga~ nyaa...',
  'Szukam pilota od anime...',
  'Shiro rysuje plan na dziś...',
  'Podkradamy ciastka z kuchni...',
  'Shiro sprawdza co nowego...',
  'Jeszcze jedna drzemka... zzz',
  'Shiro-chan jest prawie gotowa!',
  'Układamy pluszaki na kanapie...',
  'Shiro goni motylka... zaraz wracam!',
  'Nastawiamy czajnik na herbatkę...',
];

// ============================================
// Sparkle particle
// ============================================

const SPARKLE_COUNT = 10;

interface SparkleData {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

function generateSparkles(): SparkleData[] {
  return Array.from({ length: SPARKLE_COUNT }, (_, i) => {
    const angle = (i / SPARKLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
    const radius = 50 + Math.random() * 60;
    return {
      id: i,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 2000,
      duration: 1500 + Math.random() * 1500,
    };
  });
}

function Sparkle({ data }: { data: SparkleData }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      data.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: data.duration / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: data.duration / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
    scale.value = withDelay(
      data.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: data.duration / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: data.duration / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [opacity, scale, data.delay, data.duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: '50%',
          top: '50%',
          marginLeft: data.x - data.size / 2,
          marginTop: data.y - data.size / 2,
          width: data.size,
          height: data.size,
          borderRadius: data.size / 2,
          backgroundColor: colors.primary,
        },
        animatedStyle,
      ]}
    />
  );
}

// ============================================
// Spinner (rotating circle)
// ============================================

function Spinner() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[s.spinner, animatedStyle]}>
      <View style={s.spinnerArc} />
    </Animated.View>
  );
}

// ============================================
// Main AnimatedSplash
// ============================================

interface AnimatedSplashProps {
  ready: boolean;
  onDismissed: () => void;
}

function AnimatedSplashInner({ ready, onDismissed }: AnimatedSplashProps) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [messageIndex, setMessageIndex] = useState(() =>
    Math.floor(Math.random() * LOADING_MESSAGES.length)
  );
  const [isVisible, setIsVisible] = useState(true);

  const sparkles = useMemo(generateSparkles, []);

  // Mascot animations
  const mascotScale = useSharedValue(0);
  const mascotTranslateY = useSharedValue(20);
  const floatY = useSharedValue(0);

  // Branding animations
  const brandingOpacity = useSharedValue(0);
  const brandingTranslateY = useSharedValue(8);

  // Exit animation
  const containerOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);

  // Entrance animations
  useEffect(() => {
    // Mascot bounce-in with spring
    mascotScale.value = withSpring(1, {
      damping: 8,
      stiffness: 100,
      mass: 0.8,
    });
    mascotTranslateY.value = withSpring(0, {
      damping: 8,
      stiffness: 100,
      mass: 0.8,
    });

    // Start floating after entrance (delay ~700ms)
    floatY.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(6, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // Branding fade-up (delayed 300ms)
    brandingOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) })
    );
    brandingTranslateY.value = withDelay(
      300,
      withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) })
    );
  }, [mascotScale, mascotTranslateY, floatY, brandingOpacity, brandingTranslateY]);

  // Minimum display timer
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Spinner delay
  useEffect(() => {
    const timer = setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Rotate loading messages
  useEffect(() => {
    const timer = setInterval(
      () => setMessageIndex(i => (i + 1) % LOADING_MESSAGES.length),
      MESSAGE_ROTATE_MS
    );
    return () => clearInterval(timer);
  }, []);

  // Dismiss handler
  const handleDismissComplete = useCallback(() => {
    setIsVisible(false);
    onDismissed();
  }, [onDismissed]);

  // Exit sequence
  useEffect(() => {
    if (!ready || !minTimeElapsed) return;

    containerOpacity.value = withTiming(0, {
      duration: EXIT_DURATION_MS,
      easing: Easing.out(Easing.ease),
    });
    containerScale.value = withTiming(1.02, {
      duration: EXIT_DURATION_MS,
      easing: Easing.out(Easing.ease),
    });

    const timer = setTimeout(handleDismissComplete, EXIT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [ready, minTimeElapsed, containerOpacity, containerScale, handleDismissComplete]);

  // Animated styles
  const mascotStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: mascotScale.value },
      { translateY: mascotTranslateY.value + floatY.value },
    ],
  }));

  const brandingStyle = useAnimatedStyle(() => ({
    opacity: brandingOpacity.value,
    transform: [{ translateY: brandingTranslateY.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  if (!isVisible) return null;

  return (
    <Animated.View style={[s.container, containerStyle]}>
      <View style={s.center}>
        {/* Mascot with sparkles */}
        <View style={s.mascotArea}>
          {/* Soft glow */}
          <View style={s.glow} />

          {/* Sparkle particles */}
          {sparkles.map(sp => (
            <Sparkle key={sp.id} data={sp} />
          ))}

          {/* Mascot image */}
          <Animated.View style={mascotStyle}>
            <Image source={mascotThink} style={s.mascotImage} resizeMode="contain" />
          </Animated.View>
        </View>

        {/* Branding */}
        <Animated.View style={[s.branding, brandingStyle]}>
          <Text style={s.brandingJp}>白アニ</Text>
          <Text style={s.brandingSub}>SHIROANI</Text>
        </Animated.View>

        {/* Spinner + loading message */}
        {showSpinner && (
          <Animated.View entering={FadeIn.duration(400)} style={s.statusRow}>
            <Spinner />
            <Animated.View
              key={messageIndex}
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
            >
              <Text style={s.statusText}>{LOADING_MESSAGES[messageIndex]}</Text>
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

export const AnimatedSplash = memo(AnimatedSplashInner);

// ============================================
// Styles
// ============================================

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    gap: 12,
  },
  mascotArea: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.primary,
    opacity: 0.08,
  },
  mascotImage: {
    width: 160,
    height: 160,
  },
  branding: {
    alignItems: 'center',
    gap: 2,
  },
  brandingJp: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  brandingSub: {
    fontSize: 10,
    color: colors.mutedForeground,
    opacity: 0.5,
    letterSpacing: 4,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  statusText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  spinner: {
    width: 16,
    height: 16,
  },
  spinnerArc: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: colors.primary,
    borderRightColor: colors.primary,
  },
});
