import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/ui';
import { useT } from '../lib/i18n';
import { thumbSource } from '../lib/pets';
import { setState } from '../lib/store';
import { colors, radius } from '../lib/theme';

export default function GetStarted() {
  const t = useT();
  const [choice, setChoice] = useState<number | null>(null);
  const options = [t.getStarted1, t.getStarted2, t.getStarted3];

  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.pets}>
        {[2, 1, 4].map((id) => (
          <Image key={id} source={thumbSource(id)} style={styles.pet} />
        ))}
      </View>
      <Text style={styles.title}>{t.getStartedTitle}</Text>
      <View style={{ gap: 12, marginTop: 24 }}>
        {options.map((o, i) => (
          <Pressable key={i} onPress={() => setChoice(i)} style={[styles.opt, choice === i && styles.optOn]}>
            <Text style={[styles.optText, choice === i && { color: colors.primary }]}>{o}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <Button
        title={t.start}
        style={{ opacity: choice == null ? 0.5 : 1 }}
        onPress={() => {
          if (choice == null) return;
          setState({ onboarded: true, enabled: true });
          router.replace('/home');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  pets: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  pet: { width: 100, height: 100, marginHorizontal: -8 },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, textAlign: 'center', marginTop: 16 },
  opt: { backgroundColor: colors.card, borderRadius: radius.md, padding: 18, borderWidth: 2, borderColor: 'transparent' },
  optOn: { borderColor: colors.primary },
  optText: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
});
