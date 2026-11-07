import type { ConversationResult, ConversationTurn, PetAction, PetExpression } from './conversation';

export interface TinyTalkConfig {
  baseUrl: string;
  timeoutMs?: number;
}

interface TinyTalkResponse {
  text?: unknown;
  action?: PetAction;
  expression?: PetExpression;
}

export async function askTinyTalk(
  config: TinyTalkConfig,
  text: string,
  history: ConversationTurn[],
  signal?: AbortSignal,
): Promise<ConversationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 8000);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, history }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`TinyTalk request failed (${response.status})`);
    const payload = (await response.json()) as TinyTalkResponse;
    if (typeof payload.text !== 'string' || payload.text.trim().length === 0) {
      throw new Error('TinyTalk returned no response text');
    }
    return {
      text: payload.text,
      action: payload.action,
      expression: payload.expression ?? 'neutral',
      source: 'tinytalk',
    };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}
