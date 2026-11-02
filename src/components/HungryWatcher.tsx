import { router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../lib/i18n';
import { thumbSource } from '../lib/pets';
import { activePetIds, getState, setState, useAppState } from '../lib/store';
import { colors, radius } from '../lib/theme';

/** In-app version of PopupHungryView: checks every 5 s whether it is time to feed. */
export function HungryWatcher() {
  const t = useT();
  const path = usePathname();
  // the floating service has its own hungry popup
  const enabled = useAppState((s) => s.enabled && s.onboarded && !s.overlayActive);
  const [petId, setPetId] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      const s = getState();
      if (!s.hungryMinutes) return;
      if (path === '/hungry' || path === '/foods') return;
      if (Date.now() - s.lastFed < s.hungryMinutes * 60_000) return;
      const ids = activePetIds(s);
      if (ids.length) setPetId((cur) => cur ?? ids[Math.floor(Math.random() * ids.length)]);
    };
    check();
    const iv = setInterval(check, 5000);
    return () => clearInterval(iv);
  }, [enabled, path]);

  if (petId == null) return null;
  const close = () => {
    setState({ lastFed: Date.now() });
    setPetId(null);
  };
  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable style={styles.close} onPress={close} hitSlop={12}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <Image source={thumbSource(petId)} style={styles.pet} />
          <Text style={styles.text}>{t.hungryText}</Text>
          <Pressable
            style={styles.btn}
            onPress={() => {
              const id = petId;
              setPetId(null);
              setState({ lastFed: Date.now() });
              router.push({ pathname: '/hungry', params: { petId: String(id) } });
            }}
          >
            <Text style={styles.btnText}>{t.feed} 🍔</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0006', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, backgroundColor: colors.card, borderRadius: radius.lg, padding: 20, alignItems: 'center' },
  close: { position: 'absolute', right: 14, top: 10 },
  closeText: { fontSize: 18, color: colors.muted },
  pet: { width: 120, height: 120 },
  text: { textAlign: 'center', fontSize: 16, color: colors.text, marginVertical: 12, fontWeight: '600' },
  btn: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 36, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
