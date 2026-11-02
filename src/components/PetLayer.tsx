import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useT } from '../lib/i18n';
import { findPet } from '../lib/pets';
import { getState, pickRandomPets, useAppState } from '../lib/store';
import { colors, radius } from '../lib/theme';
import { PetSprite } from './PetSprite';

/**
 * In-app equivalent of ShimejiService: the chosen pets roam over every screen of the app.
 * When the native overlay is running the pets live there instead, so this layer hides.
 */
export function PetLayer() {
  const t = useT();
  const { width, height } = useWindowDimensions();
  // when the floating service runs, the pets live there — never render them twice
  const enabled = useAppState((s) => s.enabled && s.onboarded && !s.overlayActive);
  const slots = useAppState((s) => s.slots);
  const count = useAppState((s) => s.numberOnScreen);
  const size = useAppState((s) => s.size);
  const speed = useAppState((s) => s.speed);
  const timeChange = useAppState((s) => s.timeChange);
  const [shuffle, setShuffle] = useState(0);
  const [menu, setMenu] = useState<{ x: number; y: number; w: number } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // re-pick every `timeChange` minutes (ChangeShimejiWorker)
  useEffect(() => {
    const iv = setInterval(() => setShuffle((n) => n + 1), timeChange * 60_000);
    return () => clearInterval(iv);
  }, [timeChange]);

  // pick `count` pets at random from the home slots
  const ids = useMemo(
    () => (enabled ? pickRandomPets(getState()).filter((id) => findPet(id)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, slots, count, shuffle]
  );

  const onTap = useCallback((p: { x: number; y: number; w: number }) => {
    setMenu(p);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setMenu(null), 5000);
  }, []);

  if (!ids.length) return null;
  const area = { width, height };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {ids.map((id, i) => (
        <PetSprite key={`${id}-${i}`} petId={id} area={area} size={size} speed={speed} onTap={onTap} />
      ))}
      {menu && (
        <View
          style={[
            styles.menu,
            { left: Math.min(Math.max(8, menu.x + menu.w / 2 - 70), width - 148), top: Math.max(40, menu.y - 56) },
          ]}
        >
          <Pressable
            style={styles.menuBtn}
            onPress={() => {
              setMenu(null);
              router.navigate('/home');
            }}
          >
            <Text style={styles.menuIcon}>🏠</Text>
            <Text style={styles.menuText}>{t.home}</Text>
          </Pressable>
          <Pressable
            style={styles.menuBtn}
            onPress={() => {
              setMenu(null);
              router.navigate('/settings');
            }}
          >
            <Text style={styles.menuIcon}>⚙️</Text>
            <Text style={styles.menuText}>{t.settings}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    width: 140,
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: 6,
    gap: 6,
    elevation: 6,
  },
  menuBtn: { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: radius.sm, backgroundColor: colors.bg },
  menuIcon: { fontSize: 18 },
  menuText: { fontSize: 11, color: colors.text, fontWeight: '600' },
});
