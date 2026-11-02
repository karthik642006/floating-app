/**
 * App preferences — mirrors the original `SharePreferUtils` keys and defaults:
 *   getNumberShimeji = 1, getSize = 1.6, getSpeed = 1.5, getTimeChange = 5 (minutes),
 *   getStateMain_0..8 = the 9 home slots, isEnablePet, getTimeHungry.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export interface ImportedPet {
  id: number;
  name: string;
  category: string;
}

export interface AppState {
  hydrated: boolean;
  /** native floating service is running (not persisted) */
  overlayActive: boolean;
  /** floating pets hidden via Hide (not persisted) */
  overlayHidden: boolean;
  onboarded: boolean;
  language: string;
  enabled: boolean;
  numberOnScreen: number;
  size: number;
  speed: number;
  timeChange: number;
  hungryMinutes: number;
  lastFed: number;
  slots: (number | null)[];
  imported: ImportedPet[];
}

const KEY = 'pets_on_screen_state_v1';
export const SLOT_COUNT = 9;

const defaults: AppState = {
  hydrated: false,
  overlayActive: false,
  overlayHidden: false,
  onboarded: false,
  language: 'en',
  enabled: false,
  numberOnScreen: 1,
  size: 1.6,
  speed: 1.5,
  timeChange: 5,
  hungryMinutes: 30,
  lastFed: 0,
  slots: [1, 3, 5, null, null, null, null, null, null],
  imported: [],
};

let state: AppState = defaults;
const listeners = new Set<() => void>();

export function getState() {
  return state;
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  listeners.forEach((l) => l());
  const { hydrated: _h, overlayActive: _a, overlayHidden: _o, ...persisted } = state;
  AsyncStorage.setItem(KEY, JSON.stringify(persisted)).catch(() => {});
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAppState<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}

export async function hydrate() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<AppState>) : {};
    state = { ...defaults, ...saved, hydrated: true, overlayActive: false, overlayHidden: false };
    if (state.lastFed === 0) state.lastFed = Date.now();
  } catch {
    state = { ...defaults, hydrated: true, lastFed: Date.now() };
  }
  listeners.forEach((l) => l());
}

/** Pet ids currently placed in the home slots. */
export const activePetIds = (s: AppState) => s.slots.filter((x): x is number => x != null);

/** Pick `numberOnScreen` pets at random from the home slots (ShimejiService.showShimeji). */
export function pickRandomPets(s: AppState): number[] {
  const ids = [...activePetIds(s)];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, Math.min(s.numberOnScreen, ids.length));
}
