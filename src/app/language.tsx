import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LANGUAGES, useT } from '../lib/i18n';
import { getState, setState } from '../lib/store';
import { colors, radius } from '../lib/theme';

export default function LanguageScreen() {
  const t = useT();
  const { first } = useLocalSearchParams<{ first?: string }>();
  const [code, setCode] = useState(getState().language);

  const confirm = () => {
    setState({ language: code });
    if (first) router.replace('/intro');
    else router.back();
  };

  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.header}>
        {!first && (
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
        )}
        <Text style={styles.title}>{t.language}</Text>
        <Pressable onPress={confirm} hitSlop={12}>
          <Text style={styles.ok}>✓</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {LANGUAGES.map((l) => (
          <Pressable key={l.code} onPress={() => setCode(l.code)} style={[styles.item, code === l.code && styles.itemOn]}>
            <Text style={styles.flag}>{l.flag}</Text>
            <Text style={styles.label}>{l.label}</Text>
            <View style={[styles.radio, code === l.code && styles.radioOn]} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  back: { fontSize: 34, color: colors.primary, marginTop: -6 },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.text },
  ok: { fontSize: 26, color: colors.primary, fontWeight: '800' },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, padding: 16, borderWidth: 2, borderColor: 'transparent' },
  itemOn: { borderColor: colors.primary },
  flag: { fontSize: 26, marginRight: 14 },
  label: { flex: 1, fontSize: 17, color: colors.text, fontWeight: '600' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.tabInactive },
  radioOn: { borderColor: colors.primary, borderWidth: 7 },
});
