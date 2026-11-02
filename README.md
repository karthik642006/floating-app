# Pets On Screen (Expo rebuild)

A rebuild of the Android app **"Pets On Screen – Desktop Pet"**
(`com.pets.on.phonescreen.desktop.pet`, v111) as an Expo / React Native app. It is based on
a decompilation of the original APK.

## What was reverse-engineered

| Original (decompiled) | Rebuild |
|---|---|
| `shimeji.lib.animations.*`: ~40 animation classes (Walk, Climb, ClimbCeiling, Descend, Jump, Falling, Bounce, Dragging, Flinging, Sit, Wink, Creep, Tripping, Special, Special2…) | `src/engine/animations.ts` (and `Engine.kt` for the native overlay). Same sprite tables, durations, speeds and transition probabilities |
| `Mascot` 30 ms tick loop, `Playground` bounds (sprite may overhang by width/3), speed formula `speed + 0.9` | `src/engine/mascot.ts` |
| 46-frame Shimeji sprite format (`shime1.png … shime46.png`, facing left, mirrored when walking right) | Same format, both for built-in pets and for imported packs |
| `ShimejiService`: foreground service, `TYPE_APPLICATION_OVERLAY` windows, drag / fling / tap, Home/Settings popup, "N at random", re-shuffle every *Time Change* minutes, hungry popup, screen on/off pause, boot receiver | `modules/pet-overlay` (local Expo native module, Kotlin) |
| `SharePreferUtils` defaults: size 1.6 (1.0–2.6), speed 1.5 (1.0–5.0), time change 5 min (1–60), 1 pet on screen, 9 home slots | `src/lib/store.ts` |
| Screens: Splash → Language → Intro (3 pages) → Get Started survey → Main tabs (Home / Collection / Settings), Detail, Hungry → Foods → cooking → "I'm full and happy!" | `src/app/*` (Expo Router) |
| Brand colours `#fc9268` / `#fff3ee` | `src/lib/theme.ts` |

**Not copied on purpose:** ads (AdMob/AppLovin/Pangle/…), IAP, Firebase analytics/remote
config and "watch video to unlock". The original's 1,122 pets are fan-made sprites of
copyrighted characters, served from a private server, so they are not included.
Instead the app ships **7 original pets** drawn by `scripts/generate-sprites.js`. It can
also **import any classic Shimeji pack** (`.zip` with `shime1.png`…`shime46.png`) from the
Collection tab.

## Run in Expo Go (in-app mode)

```bash
npm install
npx expo start          # scan the QR code with Expo Go (Android)
```

In Expo Go the pets walk, climb, fall and can be dragged and flung **over every screen of
the app**. Expo Go cannot load custom native code, so it **cannot draw over other apps**.

## Floating over other apps (development build)

The floating overlay needs `SYSTEM_ALERT_WINDOW` and a foreground service. These live in
the local native module `modules/pet-overlay`, so build a dev client:

```bash
# local (needs Android Studio / SDK + a device or emulator)
npx expo run:android

# or in the cloud with EAS
npx eas-cli@latest build --profile development --platform android
```

Then open Home, switch on **Pet on screen**, and grant the *Display over other apps*
permission. Pets stay on screen after you leave the app. Tap a pet for the Home/Settings
menu, drag it, or fling it at a wall to make it climb.

For a release APK: `npx eas-cli@latest build --platform android --profile preview`.

## Scripts

- `npm run sprites`: regenerate the built-in pet sprites, the app icons and `src/data/builtinPets.ts`
- `npm run typecheck`: TypeScript check
- `npx expo lint`

## Layout

```
src/app/            Expo Router screens
src/engine/         Shimeji state machine + mascot physics (TS)
src/components/     PetSprite, PetLayer (in-app overlay), HungryWatcher, SeekBar, dialogs
src/lib/            store (prefs), pets (catalogue/import), overlay bridge, i18n, theme
modules/pet-overlay Kotlin overlay service + engine port
scripts/            sprite generator
```
