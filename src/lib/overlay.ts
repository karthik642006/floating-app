/**
 * Bridge to the native floating-pet service (modules/pet-overlay).
 * In Expo Go the native module does not exist, so every call degrades gracefully
 * and the app falls back to the in-app pet layer.
 *
 * The store's `overlayActive` / `overlayHidden` are the single source of truth the UI
 * reads, so the in-app layer never renders pets while the floating service does.
 */
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

import { BUILTIN_PETS } from '../data/builtinPets';
import { petDir } from './pets';
import { getState, setState } from './store';

interface PetOverlayNative {
  canDrawOverlays(): boolean;
  requestOverlayPermission(): void;
  start(configJson: string): void;
  stop(): void;
  hide(): void;
  show(): void;
  isRunning(): boolean;
  consumeStoppedByUser(): boolean;
  isHidden(): boolean;
  markFed(): void;
}

const native = Platform.OS === 'android' ? requireOptionalNativeModule<PetOverlayNative>('PetOverlay') : null;

export const overlayAvailable = native != null;

export function canDrawOverlays() {
  return native?.canDrawOverlays() ?? false;
}

export function requestOverlayPermission() {
  native?.requestOverlayPermission();
}

/** Built-in sprites ship inside the APK assets; imported packs live in the documents folder. */
const spriteDir = (id: number) => (BUILTIN_PETS.some((p) => p.id === id) ? `builtin:${id}` : petDir(id).uri);

/** (Re)starts the floating service with the current settings. */
export function startOverlay() {
  if (!native || !native.canDrawOverlays()) return false;
  const s = getState();
  const ids = s.slots.filter((x): x is number => x != null);
  native.start(
    JSON.stringify({
      pets: ids.map((id) => ({ id, dir: spriteDir(id) })),
      count: s.numberOnScreen,
      size: s.size,
      speed: s.speed,
      timeChangeMinutes: s.timeChange,
      hungryMinutes: s.hungryMinutes,
      lastFed: s.lastFed,
    })
  );
  setState({ overlayActive: true, overlayHidden: false });
  return true;
}

/** Restart only if the service is already showing pets (after settings / slot changes). */
export function refreshOverlay() {
  if (getState().overlayActive) startOverlay();
}

export function stopOverlay() {
  native?.stop();
  setState({ overlayActive: false, overlayHidden: false });
}

export function hideOverlay() {
  native?.hide();
  setState({ overlayHidden: true });
}

export function showOverlay() {
  native?.show();
  setState({ overlayHidden: false });
}

/** Tell the floating service the pets were fed, so its hunger timer resets. */
export function markFed() {
  native?.markFed();
}

/**
 * Reconcile app state with the native service. Called at startup and whenever the
 * app returns to the foreground (e.g. back from the overlay-permission screen or
 * after "Stop" was pressed in the notification).
 */
export function syncOverlay() {
  if (!native) return;
  const s = getState();
  if (!s.enabled) {
    if (native.isRunning()) native.stop();
    setState({ overlayActive: false, overlayHidden: false });
    return;
  }
  // Switch is on in the app but the user pressed Stop in the notification.
  if (native.consumeStoppedByUser()) {
    setState({ enabled: false, overlayActive: false, overlayHidden: false });
    return;
  }
  if (!native.canDrawOverlays()) {
    // Permission missing or revoked: fall back to in-app pets; Home shows a "Grant" card.
    setState({ overlayActive: false, overlayHidden: false });
    return;
  }
  if (!native.isRunning()) {
    startOverlay(); // permission recovery / first start after granting
    return;
  }
  setState({ overlayActive: true, overlayHidden: native.isHidden() });
}
