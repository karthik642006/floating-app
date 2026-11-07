import * as Speech from 'expo-speech';
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

interface NativeVoice {
  listen(): Promise<string>;
  speak(text: string, language: string): void;
  stopSpeaking(): void;
}

const nativeVoice =
  Platform.OS === 'android' ? requireOptionalNativeModule<NativeVoice>('PetOverlay') : null;

export const voiceAvailable = nativeVoice != null;

export async function listen(): Promise<string> {
  if (!nativeVoice) {
    throw new Error('Voice input requires an Android development or production build.');
  }
  return nativeVoice.listen();
}

export function speak(text: string, language = 'en-US') {
  if (nativeVoice) {
    nativeVoice.speak(text, language);
    return;
  }
  Speech.speak(text, { language, onStart: () => undefined });
}

export function stopSpeaking() {
  if (nativeVoice) {
    nativeVoice.stopSpeaking();
  } else {
    void Speech.stop();
  }
}
