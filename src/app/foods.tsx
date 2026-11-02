import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PetSprite } from '../components/PetSprite';
import { Button } from '../components/ui';
import { useT } from '../lib/i18n';
import { markFed } from '../lib/overlay';
import { setState } from '../lib/store';
import { colors, FOOD_EMOJI, radius } from '../lib/theme';

type Phase = 'choose' | 'cooking' | 'happy';

/** FoodsActivity: pick one of the 9 foods → cooking → "I'm full and happy!" */
export default function Foods() {
  const t = useT();
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const pid = Number(petId) || 1;
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState(0);
  const [phase, setPhase] = useState<Phase>('choose');
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (phase !== 'cooking') return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true }));
    loop.start();
    const to = setTimeout(() => {
      setState({ lastFed: Date.now() });
      markFed();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setPhase('happy');
    }, 3000);
    return () => {
      loop.stop();
      clearTimeout(to);
    };
  }, [phase, spin]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  if (phase === 'cooking') {
    const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '12deg'] });
    return (
      <SafeAreaView style={[styles.wrap, styles.center]}>
        <Animated.Text style={[styles.bigFood, { transform: [{ rotate }] }]}>🍳</Animated.Text>
        <Text style={styles.msg}>{t.cookingText}</Text>
        <Text style={styles.bigFood}>{FOOD_EMOJI[selected]}</Text>
      </SafeAreaView>
    );
  }

  if (phase === 'happy') {
    const stage = { width: width - 40, height: 300 };
    return (
      <SafeAreaView style={[styles.wrap, styles.center]}>
        <Text style={styles.msg}>{t.happyText} 💕</Text>
        <View style={[styles.stage, stage]}>
          <PetSprite petId={pid} area={stage} size={1.4} speed={2} />
        </View>
        <Button title={t.goHome} style={{ alignSelf: 'stretch', marginTop: 24 }} onPress={() => router.replace('/home')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={leave} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{t.foods}</Text>
      </View>
      <View style={styles.grid}>
        {FOOD_EMOJI.map((e, i) => (
          <Pressable key={i} style={[styles.food, selected === i && styles.foodOn]} onPress={() => setSelected(i)}>
            <Text style={styles.foodEmoji}>{e}</Text>
            <Text style={styles.foodName}>{t.foodNames[i]}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <Button title={t.feed} onPress={() => setPhase('cooking')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { fontSize: 36, color: colors.primary, marginTop: -6 },
  title: { fontSize: 24, fontWeight: '900', color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 16 },
  food: {
    width: '31.5%',
    aspectRatio: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  foodOn: { borderColor: colors.primary, backgroundColor: '#fff8f4' },
  foodEmoji: { fontSize: 44 },
  foodName: { fontWeight: '700', color: colors.text, marginTop: 4, fontSize: 13 },
  bigFood: { fontSize: 72, marginVertical: 12 },
  msg: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 16 },
  stage: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
});
