import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fmt, useT } from '../../lib/i18n';
import { allPets, importPack, thumbSource } from '../../lib/pets';
import { useAppState } from '../../lib/store';
import { colors, radius } from '../../lib/theme';

const PAGE_SIZE = 12; // Remote-config "page_size_collection"

export default function Collection() {
  const t = useT();
  const { slot } = useLocalSearchParams<{ slot?: string }>();
  const imported = useAppState((s) => s.imported);
  const slots = useAppState((s) => s.slots);
  const [category, setCategory] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pets = useMemo(() => allPets(), [imported]);
  const categories = useMemo(() => [...new Set(pets.map((p) => p.category))], [pets]);
  const filtered = category ? pets.filter((p) => p.category === category) : pets;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const onImport = async () => {
    const res = await importPack();
    if (res.ok) {
      Alert.alert(t.imported, res.pet.name);
      setCategory(null);
    } else if (res.reason !== 'cancelled') {
      Alert.alert('', res.reason === 'invalid' ? t.importInvalid : t.importError);
    }
  };

  return (
    <SafeAreaView style={styles.wrap} edges={['top']}>
      <Text style={styles.title}>{slot != null ? t.choosePet : t.collection}</Text>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {[null, ...categories].map((c) => (
            <Pressable
              key={c ?? 'all'}
              style={[styles.chip, category === c && styles.chipOn]}
              onPress={() => {
                setCategory(c);
                setPage(0);
              }}
            >
              <Text style={[styles.chipText, category === c && { color: '#fff' }]}>{c ?? t.all}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={shown}
        numColumns={3}
        keyExtractor={(p) => String(p.id)}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListFooterComponent={
          <Pressable style={styles.importBtn} onPress={onImport}>
            <Text style={styles.importText}>📦 {t.importPack}</Text>
          </Pressable>
        }
        renderItem={({ item }) => {
          const onHome = slots.includes(item.id);
          return (
            <Pressable
              style={[styles.item, onHome && styles.itemOn]}
              onPress={() =>
                router.push({ pathname: '/detail/[id]', params: slot != null ? { id: String(item.id), slot } : { id: String(item.id) } })
              }
            >
              <Image source={thumbSource(item.id)} style={styles.thumb} />
              <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
              {onHome && <Text style={styles.badge}>✓</Text>}
            </Pressable>
          );
        }}
      />

      <View style={styles.pager}>
        <Pressable disabled={page === 0} onPress={() => setPage(page - 1)} style={[styles.pageBtn, page === 0 && { opacity: 0.3 }]}>
          <Text style={styles.pageArrow}>‹</Text>
        </Pressable>
        <Text style={styles.pageText}>{fmt(t.page, page + 1, pageCount)}</Text>
        <Pressable
          disabled={page >= pageCount - 1}
          onPress={() => setPage(page + 1)}
          style={[styles.pageBtn, page >= pageCount - 1 && { opacity: 0.3 }]}
        >
          <Text style={styles.pageArrow}>›</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '900', color: colors.primary, textAlign: 'center', marginTop: 16, marginBottom: 8 },
  chips: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '700', color: colors.text },
  item: { flex: 1 / 3, backgroundColor: colors.card, borderRadius: radius.md, alignItems: 'center', padding: 8, borderWidth: 2, borderColor: 'transparent' },
  itemOn: { borderColor: colors.primary },
  thumb: { width: 84, height: 84 },
  name: { fontWeight: '700', color: colors.text, fontSize: 13 },
  badge: { position: 'absolute', top: 6, right: 8, color: colors.primary, fontWeight: '900' },
  importBtn: { marginTop: 8, padding: 16, borderRadius: radius.md, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary, alignItems: 'center' },
  importText: { color: colors.primary, fontWeight: '800' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 8 },
  pageBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pageArrow: { color: '#fff', fontSize: 26, marginTop: -3, fontWeight: '800' },
  pageText: { fontWeight: '800', color: colors.text, fontSize: 15 },
});
