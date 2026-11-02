import { router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/ui';
import { useT } from '../lib/i18n';
import { thumbSource } from '../lib/pets';
import { activePetIds, getState } from '../lib/store';
import { colors, radius } from '../lib/theme';

/** HungryActivity — also reachable from the floating overlay via petsonscreen://hungry?petId=N */
export default function Hungry() {
  const t = useT();
  const params = useLocalSearchParams<{ petId?: string }>();
  const petId = Number(params.petId) || activePetIds(getState())[0] || 1;

  return (
    <SafeAreaView style={styles.wrap}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} hitSlop={12}>
        <Text style={styles.back}>‹</Text>
      </Pressable>
      <View style={styles.center}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{t.hungryText}</Text>
        </View>
        <Image source={thumbSource(petId)} style={styles.pet} />
        <Text style={styles.tummy}>🍽️</Text>
      </View>
      <Button title={`${t.feed} 🍔`} onPress={() => router.replace({ pathname: '/foods', params: { petId: String(petId) } })} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  back: { fontSize: 36, color: colors.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bubble: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, borderWidth: 2, borderColor: colors.primary },
  bubbleText: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  pet: { width: 220, height: 220, marginTop: 12 },
  tummy: { fontSize: 40 },
});
