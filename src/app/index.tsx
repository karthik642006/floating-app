import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

import { ensurePetsRoot, thumbSource } from '../lib/pets';
import { getState, useAppState } from '../lib/store';
import { colors } from '../lib/theme';

/** SplashActivity: loading bar, prepare sprite files, then route to onboarding or home. */
export default function Splash() {
  const hydrated = useAppState((s) => s.hydrated);
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 1800, useNativeDriver: false }).start();
  }, [progress]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      const started = Date.now();
      try {
        ensurePetsRoot();
      } catch (e) {
        console.warn('sprite install failed', e);
      }
      await new Promise((r) => setTimeout(r, Math.max(0, 1800 - (Date.now() - started))));
      if (cancelled) return;
      router.replace(getState().onboarded ? '/home' : { pathname: '/language', params: { first: '1' } });
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  return (
    <View style={styles.wrap}>
      <Image source={thumbSource(1)} style={styles.logo} />
      <Text style={styles.title}>Pets On Screen</Text>
      <Text style={styles.sub}>Desktop Pet</Text>
      <View style={styles.bar}>
        <Animated.View style={[styles.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 32 },
  logo: { width: 160, height: 160 },
  title: { fontSize: 30, fontWeight: '900', color: colors.primary, marginTop: 8 },
  sub: { fontSize: 16, color: colors.muted, marginBottom: 40 },
  bar: { width: '70%', height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 10, backgroundColor: colors.primary },
});
