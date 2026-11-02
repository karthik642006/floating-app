import { router } from 'expo-router';
import { useState } from 'react';
import { Image, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Dialog } from '../../components/ui';
import { useT } from '../../lib/i18n';
import {
  canDrawOverlays,
  hideOverlay,
  overlayAvailable,
  refreshOverlay,
  requestOverlayPermission,
  showOverlay,
  startOverlay,
  stopOverlay,
} from '../../lib/overlay';
import { findPet, thumbSource } from '../../lib/pets';
import { setState, SLOT_COUNT, useAppState } from '../../lib/store';
import { colors, radius } from '../../lib/theme';

export default function Home() {
  const t = useT();
  const enabled = useAppState((s) => s.enabled);
  const slots = useAppState((s) => s.slots);
  const count = useAppState((s) => s.numberOnScreen);
  const overlayActive = useAppState((s) => s.overlayActive);
  const overlayHidden = useAppState((s) => s.overlayHidden);
  useAppState((s) => s.imported); // re-render when imported pets change
  const [askOverlay, setAskOverlay] = useState(false);
  const [pickCount, setPickCount] = useState(false);
  const [info, setInfo] = useState(false);

  const turnOn = async (on: boolean) => {
    if (!on) {
      setState({ enabled: false });
      stopOverlay();
      return;
    }
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS' as never).catch(() => {});
    }
    if (!overlayAvailable) {
      setState({ enabled: true });
      setInfo(true);
      return;
    }
    if (!canDrawOverlays()) {
      setState({ enabled: true });
      setAskOverlay(true);
      return;
    }
    setState({ enabled: true });
    startOverlay();
  };

  // Switch on, real build, but no overlay permission (never granted or revoked) → in-app fallback.
  const needsPermission = enabled && overlayAvailable && !overlayActive && !canDrawOverlays();

  const onSlot = (i: number) => {
    const id = slots[i];
    if (id == null) router.push({ pathname: '/collection', params: { slot: String(i) } });
    else router.push({ pathname: '/detail/[id]', params: { id: String(id), slot: String(i) } });
  };

  return (
    <SafeAreaView style={styles.wrap} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text style={styles.title}>{t.appTitle}</Text>

        <View style={styles.switchCard}>
          <Text style={styles.switchLabel}>{t.petOnScreen}</Text>
          <Switch
            value={enabled}
            onValueChange={turnOn}
            thumbColor="#fff"
            trackColor={{ false: colors.tabInactive, true: colors.primary }}
          />
        </View>

        {overlayActive && (
          <Pressable style={styles.hidePill} onPress={() => (overlayHidden ? showOverlay() : hideOverlay())}>
            <Text style={styles.hidePillText}>{overlayHidden ? `👀 ${t.showPets}` : `🙈 ${t.hidePets}`}</Text>
          </Pressable>
        )}

        {needsPermission && (
          <Pressable style={styles.permCard} onPress={() => setAskOverlay(true)}>
            <Text style={styles.permTitle}>⚠️ {t.permissionNeeded}</Text>
            <Text style={styles.permText}>{t.restrictedHint}</Text>
          </Pressable>
        )}

        <Pressable style={styles.countCard} onPress={() => setPickCount(true)}>
          <Text style={styles.countText}>{t.onScreenCount[count - 1]}</Text>
          <Text style={styles.chev}>▾</Text>
        </Pressable>

        <View style={styles.grid}>
          {Array.from({ length: SLOT_COUNT }, (_, i) => {
            const id = slots[i];
            const pet = id != null ? findPet(id) : undefined;
            return (
              <Pressable key={i} style={styles.slot} onPress={() => onSlot(i)}>
                {pet ? (
                  <>
                    <Image source={thumbSource(pet.id)} style={styles.slotImg} />
                    <Text numberOfLines={1} style={styles.slotName}>{pet.name}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.plus}>＋</Text>
                    <Text style={styles.slotEmpty}>{t.emptySlot}</Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>{t.tapPet}</Text>
      </ScrollView>

      <Dialog visible={pickCount} title={t.petOnScreen} onClose={() => setPickCount(false)}>
        <View style={{ flex: 1, gap: 8 }}>
          {t.onScreenCount.map((label, i) => (
            <Pressable
              key={i}
              style={[styles.countOpt, count === i + 1 && styles.countOptOn]}
              onPress={() => {
                setState({ numberOnScreen: i + 1 });
                setPickCount(false);
                refreshOverlay();
              }}
            >
              <Text style={[styles.countOptText, count === i + 1 && { color: '#fff' }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Dialog>

      <Dialog visible={askOverlay} title={t.overlayTitle} message={t.overlayContent} onClose={() => setAskOverlay(false)}>
        <Button title={t.cancel} variant="outline" style={{ flex: 1 }} onPress={() => setAskOverlay(false)} />
        <Button
          title={t.allow}
          style={{ flex: 1 }}
          onPress={() => {
            setAskOverlay(false);
            requestOverlayPermission();
          }}
        />
      </Dialog>

      <Dialog visible={info} title={t.petOnScreen} message={t.overlayUnavailable} onClose={() => setInfo(false)}>
        <Button title="OK" style={{ flex: 1 }} onPress={() => setInfo(false)} />
      </Dialog>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 26, fontWeight: '900', color: colors.primary, textAlign: 'center', marginBottom: 16 },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  switchLabel: { flex: 1, fontSize: 19, fontWeight: '800', color: '#fff' },
  countCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    marginTop: 12,
    borderWidth: 2,
    borderColor: colors.line,
  },
  countText: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  chev: { fontSize: 18, color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 16, rowGap: 12 },
  slot: {
    width: '31.5%',
    aspectRatio: 0.85,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderWidth: 2,
    borderColor: colors.line,
  },
  slotImg: { width: '90%', height: '75%', resizeMode: 'contain' },
  slotName: { fontSize: 12, fontWeight: '700', color: colors.text },
  plus: { fontSize: 34, color: colors.primary },
  slotEmpty: { fontSize: 12, color: colors.muted },
  hint: { textAlign: 'center', color: colors.muted, marginTop: 20 },
  hidePill: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary },
  hidePillText: { fontWeight: '800', color: colors.primary },
  permCard: { marginTop: 12, padding: 14, borderRadius: radius.md, backgroundColor: '#fff4e5', borderWidth: 2, borderColor: '#f5b14c' },
  permTitle: { fontWeight: '800', color: colors.text, fontSize: 15 },
  permText: { color: colors.muted, marginTop: 4 },
  countOpt: { padding: 12, borderRadius: radius.sm, backgroundColor: colors.bg },
  countOptOn: { backgroundColor: colors.primary },
  countOptText: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center' },
});
