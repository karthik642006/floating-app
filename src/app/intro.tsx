import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PetSprite } from '../components/PetSprite';
import { useT } from '../lib/i18n';
import { colors, radius } from '../lib/theme';

export default function Intro() {
  const t = useT();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const list = useRef<FlatList>(null);
  const pages: { title: string; body: string; pets: number[] }[] = [
    { title: t.intro1, body: t.intro1Content, pets: [1] },
    { title: t.intro2, body: t.intro2Content, pets: [3, 4] },
    { title: t.intro3, body: t.intro3Content, pets: [5, 6, 7] },
  ];
  const stage = { width: width - 48, height: 300 };

  const next = () => {
    if (page < pages.length - 1) list.current?.scrollToIndex({ index: page + 1 });
    else router.replace('/get-started');
  };

  return (
    <SafeAreaView style={styles.wrap}>
      <FlatList
        ref={list}
        data={pages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width, padding: 24 }}>
            <View style={[styles.stage, stage]}>
              {item.pets.map((id: number) => (
                <PetSprite key={id} petId={id} area={stage} size={1.3} speed={1.5} interactive={false} />
              ))}
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={styles.dots}>
          {pages.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
        <Pressable onPress={next} hitSlop={12}>
          <Text style={styles.next}>{page < pages.length - 1 ? t.next : t.start}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  stage: { backgroundColor: colors.bg, borderRadius: radius.lg, overflow: 'hidden', marginTop: 24 },
  title: { fontSize: 26, fontWeight: '900', color: colors.primary, textAlign: 'center', marginTop: 32 },
  body: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.tabInactive },
  dotOn: { width: 24, backgroundColor: colors.primary },
  next: { fontSize: 18, fontWeight: '800', color: colors.primary },
});
