export interface SequenceItem {
  id: number;
  action: string;
}

export interface SequenceState {
  items: SequenceItem[];
  history: SequenceItem[][]; // previous versions, newest last, for undo
  nextId: number;
  maxLength: number;
}

export type SequenceCommand =
  | { type: "add"; action: string }
  | { type: "remove"; index: number }
  | { type: "move"; index: number; offset: -1 | 1 }
  | { type: "replace"; index: number; action: string }
  | { type: "load"; actions: string[] }
  | { type: "reset" }
  | { type: "undo" };

const HISTORY_LIMIT = 100;

export function createSequence(actions: string[] = [], maxLength = 30): SequenceState {
  const items = actions.slice(0, maxLength).map((action, index) => ({ id: index + 1, action }));
  return { items, history: [], nextId: items.length + 1, maxLength };
}

function commit(state: SequenceState, items: SequenceItem[], nextId = state.nextId): SequenceState {
  const history = [...state.history, state.items].slice(-HISTORY_LIMIT);
  return { ...state, items, history, nextId };
}

export function sequenceReducer(state: SequenceState, command: SequenceCommand): SequenceState {
  const { items } = state;
  switch (command.type) {
    case "add":
      if (items.length >= state.maxLength) return state;
      return commit(state, [...items, { id: state.nextId, action: command.action }], state.nextId + 1);
    case "remove":
      if (!items[command.index]) return state;
      return commit(state, items.filter((_, index) => index !== command.index));
    case "move": {
      const target = command.index + command.offset;
      if (!items[command.index] || target < 0 || target >= items.length) return state;
      const next = [...items];
      [next[command.index], next[target]] = [next[target], next[command.index]];
      return commit(state, next);
    }
    case "replace":
      if (!items[command.index] || items[command.index].action === command.action) return state;
      return commit(state, items.map((item, index) => (index === command.index ? { ...item, action: command.action } : item)));
    case "load": {
      const loaded = command.actions.slice(0, state.maxLength).map((action, offset) => ({ id: state.nextId + offset, action }));
      return commit(state, loaded, state.nextId + loaded.length);
    }
    case "reset":
      if (items.length === 0) return state;
      return commit(state, []);
    case "undo": {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1];
      return { ...state, items: previous, history: state.history.slice(0, -1) };
    }
  }
}

export function sequenceActions(state: SequenceState): string[] {
  return state.items.map((item) => item.action);
}

/** Share links keep the sequence in the URL: ?seq=login,check_balance */
export function encodeSequence(actions: string[]): string {
  return actions.join(",");
}

export function decodeSequence(value: string | null, known: Set<string>, maxLength: number): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => known.has(part))
    .slice(0, maxLength);
}
