export interface WakeWordDetector {
  start(onDetected: () => void): Promise<void>;
  stop(): Promise<void>;
}

/**
 * The detector is intentionally injected because Android's standard
 * SpeechRecognizer does not provide a reliable always-on wake-word engine.
 * A local detector can be added later without changing conversation orchestration.
 */
export class UnconfiguredWakeWordDetector implements WakeWordDetector {
  async start(_onDetected: () => void) {
    throw new Error('Wake-word detection is not configured for this build.');
  }

  async stop() {
    return;
  }
}
