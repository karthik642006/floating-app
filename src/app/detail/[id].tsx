import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PetSprite } from '../../components/PetSprite';
import { Button, Dialog } from '../../components/ui';
import { useT } from '../../lib/i18n';
import { refreshOverlay } from '../../lib/overlay';
import { deleteImportedPet, findPet } from '../../lib/pets';
import { setState, useAppState } from '../../lib/store';
import { colors, radius } from '../../lib/theme';

/** DetailShimejiActivity: live preview + add/remove from the 9 home slots. */
export default function Detail() {
  const t = useT();
  const { id, slot } = useLocalSearchParams<{ id: string; slot?: string }>();
  const petId = Number(id);
  const pet = findPet(petId);
  const slots = useAppState((s) => s.slots);
  const size = useAppState((s) => s.size);
  const speed = useAppState((s) => s.speed);
  const { width } = useWindowDimensions();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const stage = { width: width - 32, height: 340 };

  if (!pet) return null;
  const onHome = slots.includes(petId);


  const add = () => {
    const target = slot != null && slots[Number(slot)] == null ? Number(slot) : slots.findIndex((x) => x == null);
    if (target < 0) {
      Alert.alert('', t.slotsFull);
      return;
    }
    setState((s) => ({ slots: s.slots.map((x, i) => (i === target ? petId : x)) }));
    refreshOverlay();
    router.navigate('/home');
  };

  const remove = () => {
    setState((s) => ({ slots: s.slots.map((x) => (x === petId ? null : x)) }));
    refreshOverlay();
    router.back();
  };

  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{pet.name}</Text>
          <Text style={styles.cat}>{pet.category}</Text>
        </View>
        {!pet.builtin && (
          <Pressable onPress={() => setConfirmDelete(true)} hitSlop={12}>
            <Text style={styles.trash}>🗑️</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.preview}>{t.preview}</Text>
      <View style={[styles.stage, stage]}>
        <PetSprite petId={petId} area={stage} size={Math.min(size, 1.8)} speed={speed} />
      </View>
      <Text style={styles.hint}>{t.tapPet}</Text>

      <View style={{ flex: 1 }} />
      {onHome ? (
        <Button title={t.removeFromHome} variant="outline" onPress={remove} />
      ) : (
        <Button title={t.addToHome} onPress={add} />
      )}

      <Dialog visible={confirmDelete} title={t.deleteTitle} message={t.deleteContent} onClose={() => setConfirmDelete(false)}>
        <Button title={t.cancel} variant="outline" style={{ flex: 1 }} onPress={() => setConfirmDelete(false)} />
        <Button
          title={t.delete}
          variant="danger"
          style={{ flex: 1 }}
          onPress={() => {
            setConfirmDelete(false);
            deleteImportedPet(petId);
            refreshOverlay();
            router.back();
          }}
        />
      </Dialog>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { fontSize: 36, color: colors.primary, marginTop: -6 },
  name: { fontSize: 22, fontWeight: '900', color: colors.text },
  cat: { fontSize: 14, color: colors.muted },
  trash: { fontSize: 22 },
  preview: { marginTop: 16, marginBottom: 8, fontWeight: '800', color: colors.primary },
  stage: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 2, borderColor: colors.line },
  hint: { textAlign: 'center', color: colors.muted, marginTop: 10 },
});
