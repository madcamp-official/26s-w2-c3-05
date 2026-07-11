export type Screen = 'login' | 'lobby' | 'waiting' | 'game' | 'result';

export interface Room {
  name: string;
  hanja: string;
  host: string;
  count: number;
  cap: number;
  open: boolean;
}

export interface Bot {
  name: string;
  title: string;
}

export type ChatKind = 'system' | 'self' | 'other';

export interface ChatMsg {
  kind: ChatKind;
  text: string;
  who?: string;
  crown?: boolean;
}

export type Scores = Record<string, number>;
