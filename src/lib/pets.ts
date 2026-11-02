/**
 * Pet catalogue. Built-in pets ship as bundled PNGs; users can import any classic
 * Shimeji pack (.zip containing shime1.png … shime46.png), stored exactly like the
 * original app's `cacheDir/data_<id>/shimeN.png` layout (names lowercased, spaces
 * and underscores removed — DataUtils.unzip).
 */
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { unzipSync } from 'fflate';
import type { ImageSourcePropType } from 'react-native';

import { BUILTIN_PETS } from '../data/builtinPets';
import { AppState, getState, ImportedPet, setState } from './store';

export const FRAME_COUNT = 46;
export const SPRITE_PX = 128;

export interface Pet {
  id: number;
  name: string;
  category: string;
  builtin: boolean;
}

export function allPets(s: AppState = getState()): Pet[] {
  return [
    ...BUILTIN_PETS.map((p) => ({ id: p.id, name: p.name, category: p.category, builtin: true })),
    ...s.imported.map((p) => ({ ...p, builtin: false })),
  ];
}

export function findPet(id: number, s: AppState = getState()): Pet | undefined {
  return allPets(s).find((p) => p.id === id);
}

const petsRoot = () => new Directory(Paths.document, 'pets');
export const petDir = (id: number) => new Directory(Paths.document, 'pets', `data_${id}`);

/** Image sources for all 46 frames; missing frames of imported packs fall back to frame 1. */
const sourceCache = new Map<number, ImageSourcePropType[]>();

export function frameSources(id: number): ImageSourcePropType[] {
  const builtin = BUILTIN_PETS.find((p) => p.id === id);
  if (builtin) return builtin.frames as unknown as ImageSourcePropType[];
  const cached = sourceCache.get(id);
  if (cached) return cached;
  const dir = petDir(id);
  const first = new File(dir, 'shime1.png').uri;
  const list = Array.from({ length: FRAME_COUNT }, (_, i) => {
    const f = new File(dir, `shime${i + 1}.png`);
    return { uri: f.exists ? f.uri : first };
  });
  sourceCache.set(id, list);
  return list;
}

export const thumbSource = (id: number) => frameSources(id)[0];

/** Normalise a zip entry the way the original unzip() did and return the frame number, if any. */
function frameNumberOf(entry: string): number | null {
  const base = entry.split('/').pop()!.toLowerCase().replace(/[ _]/g, '');
  const m = /^shime(\d+)\.png$/.exec(base);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= FRAME_COUNT ? n : null;
}

export type ImportResult = { ok: true; pet: ImportedPet } | { ok: false; reason: 'cancelled' | 'invalid' | 'error' };

export async function importPack(): Promise<ImportResult> {
  try {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/zip', 'application/x-zip-compressed', '*/*'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return { ok: false, reason: 'cancelled' };
    const picked = res.assets[0];
    const bytes = new Uint8Array(await new File(picked.uri).arrayBuffer());
    const entries = unzipSync(bytes, { filter: (f) => frameNumberOf(f.name) != null });
    const frames = new Map<number, Uint8Array>();
    for (const [name, data] of Object.entries(entries)) {
      const n = frameNumberOf(name);
      if (n != null && !frames.has(n)) frames.set(n, data);
    }
    if (!frames.has(1)) return { ok: false, reason: 'invalid' };

    const s = getState();
    const id = Math.max(1000, ...s.imported.map((p) => p.id)) + 1;
    const dir = petDir(id);
    dir.create({ intermediates: true, idempotent: true });
    for (const [n, data] of frames) {
      const f = new File(dir, `shime${n}.png`);
      f.create({ overwrite: true });
      f.write(data);
    }
    const name = (picked.name ?? `Pet ${id}`).replace(/\.zip$/i, '').replace(/[_-]+/g, ' ').trim() || `Pet ${id}`;
    const pet: ImportedPet = { id, name, category: 'My Pets' };
    setState((st) => ({ imported: [...st.imported, pet] }));
    return { ok: true, pet };
  } catch (e) {
    console.warn('importPack failed', e);
    return { ok: false, reason: 'error' };
  }
}

export function deleteImportedPet(id: number) {
  sourceCache.delete(id);
  try {
    const dir = petDir(id);
    if (dir.exists) dir.delete();
  } catch {}
  setState((s) => ({
    imported: s.imported.filter((p) => p.id !== id),
    slots: s.slots.map((x) => (x === id ? null : x)),
  }));
}

export function ensurePetsRoot() {
  petsRoot().create({ intermediates: true, idempotent: true });
}
