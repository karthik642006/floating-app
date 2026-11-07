import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SeekBar } from '../../components/SeekBar';
import { LANGUAGES, useT } from '../../lib/i18n';
import { refreshOverlay } from '../../lib/overlay';
import { setState, useAppState } from '../../lib/store';
import { colors, radius } from '../../lib/theme';
import { listenAndRespond, respondToText } from '../../lib/conversationRunner';
import { clearConversationMemory } from '../../lib/conversation';
import { voiceAvailable } from '../../lib/voice';

const HUNGER_OPTIONS = [0, 15, 30, 60, 120];

export default function Settings() {
  const t = useT();
  const speed = useAppState((s) => s.speed);
  const size = useAppState((s) => s.size);
  const timeChange = useAppState((s) => s.timeChange);
  const hungry = useAppState((s) => s.hungryMinutes);
  const lang = useAppState((s) => s.language);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [command, setCommand] = useState('');

  // Settings apply to the floating service after the user stops dragging.
  const restartOverlay = () => {
    if (restartTimer.current) clearTimeout(restartTimer.current);
    restartTimer.current = setTimeout(refreshOverlay, 600);
  };

  return (
    <SafeAreaView style={styles.wrap} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        <Text style={styles.title}>{t.settings}</Text>

        <View style={styles.voiceCard}>
          <Text style={styles.voiceHint}>
            {voiceAvailable
              ? 'Tap Talk and speak a command, or type one below. The pet can also answer through TinyTalk.'
              : 'Expo Go supports pet speech. Type a command below; voice input is available in an Android development build.'}
          </Text>
          <TextInput
            value={command}
            onChangeText={setCommand}
            placeholder="Try: jump, sit, hide, show, or feed"
            placeholderTextColor={colors.muted}
            style={styles.commandInput}
            returnKeyType="send"
            onSubmitEditing={async () => {
              if (!command.trim()) return;
              try {
                await respondToText(command.trim());
                setCommand('');
              } catch (error) {
                Alert.alert('Pet conversation', error instanceof Error ? error.message : 'Unable to respond right now.');
              }
            }}
          />
          <Pressable
            style={[styles.voiceButton, !voiceAvailable && styles.voiceButtonDisabled]}
            disabled={!voiceAvailable}
            onPress={async () => {
              try {
                await listenAndRespond();
              } catch (error) {
                Alert.alert('Voice input', error instanceof Error ? error.message : 'Unable to listen right now.');
              }
            }}
          >
            <Text style={styles.voiceButtonText}>🎙️ Talk to your pet</Text>
          </Pressable>
          <Pressable
            style={styles.voiceButton}
            onPress={async () => {
              if (!command.trim()) return;
              try {
                await respondToText(command.trim());
                setCommand('');
              } catch (error) {
                Alert.alert('Pet conversation', error instanceof Error ? error.message : 'Unable to respond right now.');
              }
            }}
          >
            <Text style={styles.voiceButtonText}>🔊 Send to pet</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Row label={`🏃 ${t.speed}`} value={speed.toFixed(1)} />
          <SeekBar min={1} max={5} step={0.1} value={speed} onChange={(v) => { setState({ speed: v }); restartOverlay(); }} />
        </View>
        <View style={styles.card}>
          <Row label={`📏 ${t.size}`} value={size.toFixed(1)} />
          <SeekBar min={1} max={2.6} step={0.1} value={size} onChange={(v) => { setState({ size: v }); restartOverlay(); }} />
        </View>
        <View style={styles.card}>
          <Row label={`⏱️ ${t.timeChange}`} value={`${timeChange} ${t.minutes}`} />
          <SeekBar min={1} max={60} step={1} value={timeChange} onChange={(v) => { setState({ timeChange: v }); restartOverlay(); }} />
        </View>
        <View style={styles.card}>
          <Row label={`🍔 ${t.hungerReminder}`} value="" />
          <View style={styles.opts}>
            {HUNGER_OPTIONS.map((m) => (
              <Pressable
                key={m}
                style={[styles.opt, hungry === m && styles.optOn]}
                onPress={() => {
                  setState({ hungryMinutes: m, lastFed: Date.now() });
                  restartOverlay();
                }}
              >
                <Text style={[styles.optText, hungry === m && { color: '#fff' }]}>{m === 0 ? t.off : `${m}m`}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable style={styles.link} onPress={() => router.push('/language')}>
          <Text style={styles.linkText}>🌐 {t.language}</Text>
          <Text style={styles.linkValue}>{LANGUAGES.find((l) => l.code === lang)?.label}</Text>
        </Pressable>
        <Pressable
          style={styles.link}
          onPress={() => {
            clearConversationMemory();
            Alert.alert('Conversation memory', 'Recent conversation memory was cleared.');
          }}
        >
          <Text style={styles.linkText}>🧠 Clear conversation memory</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={() => Share.share({ message: 'Pets On Screen — cute desktop pets for your phone!' })}>
          <Text style={styles.linkText}>📤 {t.shareApp}</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={() => Linking.openURL('mailto:?subject=Pets%20On%20Screen%20feedback')}>
          <Text style={styles.linkText}>💬 {t.feedback}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '900', color: colors.primary, textAlign: 'center', marginBottom: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 16, fontWeight: '800', color: colors.text },
  value: { fontSize: 15, fontWeight: '700', color: colors.primary },
  opts: { flexDirection: 'row', gap: 8, marginTop: 6 },
  opt: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, backgroundColor: colors.bg, alignItems: 'center' },
  optOn: { backgroundColor: colors.primary },
  optText: { fontWeight: '800', color: colors.text },
  link: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, padding: 18 },
  linkText: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  linkValue: { fontSize: 15, color: colors.muted },
  voiceButton: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  voiceButtonDisabled: { opacity: 0.55 },
  voiceButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  voiceCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: 16, gap: 10 },
  voiceHint: { color: colors.text, lineHeight: 20 },
  commandInput: { borderWidth: 1, borderColor: colors.muted, borderRadius: radius.sm, padding: 12, color: colors.text },
});
