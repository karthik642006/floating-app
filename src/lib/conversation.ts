import { getState, setState } from './store';

export type PetAction =
  | { type: 'walk' }
  | { type: 'jump' }
  | { type: 'sit' }
  | { type: 'hide' }
  | { type: 'show' }
  | { type: 'feed' }
  | { type: 'open'; screen: 'home' | 'settings' | 'collection' };

export type PetExpression = 'neutral' | 'happy' | 'surprised' | 'thinking' | 'speaking';

export interface ConversationTurn {
  id: string;
  role: 'user' | 'pet';
  text: string;
  createdAt: number;
  action?: PetAction;
}

export interface ConversationResult {
  text: string;
  action?: PetAction;
  expression: PetExpression;
  source: 'offline' | 'tinytalk';
}

const MAX_TURNS = 20;

const normalize = (text: string) =>
  text
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export function parseOfflineCommand(text: string): PetAction | null {
  const value = normalize(text);
  if (/\b(hide|disappear|go away)\b/.test(value)) return { type: 'hide' };
  if (/\b(show|come back|appear)\b/.test(value)) return { type: 'show' };
  if (/\b(jump|hop)\b/.test(value)) return { type: 'jump' };
  if (/\b(sit|rest)\b/.test(value)) return { type: 'sit' };
  if (/\b(walk|move|run)\b/.test(value)) return { type: 'walk' };
  if (/\b(feed|hungry|eat)\b/.test(value)) return { type: 'feed' };
  if (/\b(settings|preferences)\b/.test(value)) return { type: 'open', screen: 'settings' };
  if (/\b(collection|pets)\b/.test(value)) return { type: 'open', screen: 'collection' };
  if (/\b(home)\b/.test(value)) return { type: 'open', screen: 'home' };
  return null;
}

export function offlineResponse(text: string, action: PetAction | null): ConversationResult {
  if (action?.type === 'hide') return { text: 'I will hide for a little while.', action, expression: 'happy', source: 'offline' };
  if (action?.type === 'show') return { text: 'I am back!', action, expression: 'happy', source: 'offline' };
  if (action?.type === 'jump') return { text: 'Boing!', action, expression: 'surprised', source: 'offline' };
  if (action?.type === 'sit') return { text: 'Okay, I will rest.', action, expression: 'neutral', source: 'offline' };
  if (action?.type === 'walk') return { text: 'Let us go!', action, expression: 'happy', source: 'offline' };
  if (action?.type === 'feed') return { text: 'Yum! Thank you.', action, expression: 'happy', source: 'offline' };
  if (action?.type === 'open') return { text: `Opening ${action.screen}.`, action, expression: 'neutral', source: 'offline' };
  return {
    text: `I heard you say "${text}". I can walk, jump, sit, hide, show, or eat.`,
    expression: 'thinking',
    source: 'offline',
  };
}

export function getConversationMemory(): ConversationTurn[] {
  return getState().conversation;
}

export function appendConversationTurn(turn: Omit<ConversationTurn, 'id' | 'createdAt'>) {
  const next = [
    ...getState().conversation,
    { ...turn, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, createdAt: Date.now() },
  ].slice(-MAX_TURNS);
  setState({ conversation: next });
}

export function clearConversationMemory() {
  setState({ conversation: [] });
}

export const conversationMemoryLimit = MAX_TURNS;
