import { memo, useEffect, useMemo, useState } from 'react';
import { Image, PanResponder, PixelRatio, StyleSheet, View } from 'react-native';

import { USED_FRAMES } from '../engine/animations';
import { Mascot, TICK_MS } from '../engine/mascot';
import { frameSources, SPRITE_PX } from '../lib/pets';

interface Props {
  petId: number;
  /** playground in dp, relative to the parent view */
  area: { width: number; height: number };
  size: number;
  speed: number;
  /** false = purely decorative (no touch handling) */
  interactive?: boolean;
  onTap?: (pos: { x: number; y: number; w: number; h: number }) => void;
}

/** Public wrapper: a new engine instance is created whenever the sprite size changes. */
export const PetSprite = memo(function PetSprite(props: Props) {
  return <PetSpriteInner key={`${props.petId}-${props.size}`} {...props} />;
});

/**
 * Renders one pet driven by the Shimeji engine. All frames the engine can use are
 * mounted once and toggled with opacity, which avoids image reload flicker.
 */
function PetSpriteInner({ petId, area, size, speed, interactive = true, onTap }: Props) {
  const pr = PixelRatio.get();
  const spritePx = Math.round(SPRITE_PX * size);
  const spriteDp = spritePx / pr;
  const sources = useMemo(() => frameSources(petId), [petId]);

  const [mascot] = useState(
    () => new Mascot(spritePx, spritePx, { top: 0, left: 0, bottom: Math.round(area.height * pr), right: Math.round(area.width * pr) }, speed)
  );
  const [view, setView] = useState({ x: mascot.x, y: mascot.y, frame: mascot.frame, left: mascot.facingLeft });

  useEffect(() => {
    mascot.setSpeed(speed);
  }, [mascot, speed]);

  // keep the playground in sync with layout changes (rotation, stage resize)
  useEffect(() => {
    mascot.resize({ top: 0, left: 0, bottom: Math.round(area.height * pr), right: Math.round(area.width * pr) });
  }, [mascot, area.width, area.height, pr]);

  useEffect(() => {
    const id = setInterval(() => {
      mascot.tick();
      setView({ x: mascot.x, y: mascot.y, frame: mascot.frame, left: mascot.facingLeft });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [mascot]);

  const pan = useMemo(() => {
    const g = { startX: 0, startY: 0, t: 0, moved: false };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        Object.assign(g, { startX: mascot.x, startY: mascot.y, t: e.nativeEvent.timestamp, moved: false });
      },
      onPanResponderMove: (_e, s) => {
        if (Math.abs(s.dx) + Math.abs(s.dy) > 6) g.moved = true;
        if (g.moved) mascot.dragTo(g.startX + s.dx * pr, g.startY + s.dy * pr);
      },
      onPanResponderRelease: (e, s) => {
        if (!g.moved && e.nativeEvent.timestamp - g.t < 400) {
          mascot.stopDrag();
          onTap?.({ x: mascot.x / pr, y: mascot.y / pr, w: spriteDp, h: spriteDp });
          return;
        }
        // PanResponder velocities are dp/ms -> convert to px/s
        mascot.release(s.vx * 1000 * pr, s.vy * 1000 * pr);
      },
      onPanResponderTerminate: () => mascot.stopDrag(),
    });
  }, [mascot, onTap, pr, spriteDp]);

  return (
    <View
      {...(interactive ? pan.panHandlers : {})}
      pointerEvents={interactive ? 'auto' : 'none'}
      style={[styles.sprite, { width: spriteDp, height: spriteDp, transform: [{ translateX: view.x / pr }, { translateY: view.y / pr }] }]}
    >
      <View style={[StyleSheet.absoluteFill, { transform: [{ scaleX: view.left ? 1 : -1 }] }]}>
        {USED_FRAMES.map((f) => (
          <Image
            key={f}
            source={sources[f]}
            fadeDuration={0}
            style={[StyleSheet.absoluteFill, { opacity: f === view.frame ? 1 : 0 }]}
            resizeMode="contain"
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sprite: { position: 'absolute', left: 0, top: 0 },
});
