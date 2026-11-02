import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius } from '../lib/theme';

export function Button({ title, onPress, variant = 'primary', style }: { title: string; onPress: () => void; variant?: 'primary' | 'outline' | 'danger'; style?: ViewStyle }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        variant === 'outline' && styles.btnOutline,
        variant === 'danger' && { backgroundColor: colors.danger },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      <Text style={[styles.btnText, variant === 'outline' && { color: colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Dialog({ visible, title, message, children, onClose }: { visible: boolean; title: string; message?: string; children: ReactNode; onClose: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.dialog}>
          <Text style={styles.dialogTitle}>{title}</Text>
          {message ? <Text style={styles.dialogMsg}>{message}</Text> : null}
          <View style={styles.dialogActions}>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export const styles = StyleSheet.create({
  btn: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 24, alignItems: 'center' },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 16 },
  backdrop: { flex: 1, backgroundColor: '#0006', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 360, backgroundColor: colors.card, borderRadius: radius.lg, padding: 22 },
  dialogTitle: { fontSize: 19, fontWeight: '800', color: colors.text, textAlign: 'center' },
  dialogMsg: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 10, lineHeight: 21 },
  dialogActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
});
