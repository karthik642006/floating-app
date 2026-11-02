import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { useT } from '../../lib/i18n';
import { colors } from '../../lib/theme';

const icon = (glyph: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: colors.line, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 12 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t.home, tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="collection" options={{ title: t.collection, tabBarIcon: icon('🐾') }} />
      <Tabs.Screen name="settings" options={{ title: t.settings, tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
