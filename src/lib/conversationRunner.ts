import { appendConversationTurn, offlineResponse, parseOfflineCommand, type ConversationResult } from './conversation';
import { performPetAction } from './overlay';
import { askTinyTalk } from './tinytalk';
import { listen, speak } from './voice';
import { getState, setState } from './store';
import { router } from 'expo-router';

const tinyTalkUrl = process.env.EXPO_PUBLIC_TINYTALK_URL;

export async function listenAndRespond(): Promise<ConversationResult> {
  const transcript = await listen();
  return respondToText(transcript);
}

export async function respondToText(text: string): Promise<ConversationResult> {
  const action = parseOfflineCommand(text);
  let result = offlineResponse(text, action);

  appendConversationTurn({ role: 'user', text, action: action ?? undefined });
  if (!action && tinyTalkUrl) {
    try {
      result = await askTinyTalk({ baseUrl: tinyTalkUrl }, text, getState().conversation);
    } catch {
      // Offline response remains available when TinyTalk is unavailable.
    }
  }
  if (result.action?.type === 'open') {
    router.push(`/${result.action.screen}`);
  } else if (result.action) {
    performPetAction(result.action);
  }
  appendConversationTurn({ role: 'pet', text: result.text, action: result.action });
  setState({ petExpression: 'speaking' });
  setTimeout(() => setState({ petExpression: result.expression }), 1200);
  speak(result.text, getState().language === 'es' ? 'es-ES' : 'en-US');
  return result;
}
