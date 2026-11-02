import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState as RNAppState, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HungryWatcher } from '../components/HungryWatcher';
import { PetLayer } from '../components/PetLayer';
import { syncOverlay } from '../lib/overlay';
import { hydrate, useAppState } from '../lib/store';
import { colors } from '../lib/theme';

export default function RootLayout() {
  const hydrated = useAppState((s) => s.hydrated);
  useEffect(() => {
    hydrate().then(syncOverlay);
    // back from the overlay-permission screen, notification "Stop", permission revoked…
    const sub = RNAppState.addEventListener('change', (st) => {
      if (st === 'active') syncOverlay();
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.root}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }} />
        {hydrated && <PetLayer />}
        {hydrated && <HungryWatcher />}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg } });
