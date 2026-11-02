import { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { colors } from '../lib/theme';

interface Props {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}

/** Rounded seek bar like the original CustomSeekBarView. */
export function SeekBar({ min, max, step, value, onChange }: Props) {
  const [width, setWidth] = useState(1);

  // children ignore touches, so locationX is always relative to the bar itself
  const pan = useMemo(() => {
    const toValue = (x: number) => {
      const ratio = Math.max(0, Math.min(1, x / width));
      return Math.round(Math.round((min + ratio * (max - min)) / step) * step * 100) / 100;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => onChange(toValue(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => onChange(toValue(e.nativeEvent.locationX)),
    });
  }, [width, min, max, step, onChange]);

  const ratio = (value - min) / (max - min);
  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} {...pan.panHandlers}>
      <View style={styles.track} pointerEvents="none">
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
      <View pointerEvents="none" style={[styles.thumb, { left: ratio * width - 12 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 36, justifyContent: 'center' },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 10, backgroundColor: colors.primary },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: colors.primary,
  },
});
