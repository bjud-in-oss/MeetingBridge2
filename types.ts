
export interface TranscriptItem {
  id: string;
  groupId: number; // For grouping interactions (Input #1 -> Output #1)
  role: 'user' | 'model'; // 'user' is the speaker, 'model' is the interpreter
  text: string;
  timestamp: Date;
  isPartial?: boolean;
  workerIndex?: number; // 0, 1, 2
  workerName?: string; // Puck, Kore, Fenrir
}

export interface AudioConfig {
  sampleRate: number;
}

// Converted to POJO (Plain Old JavaScript Object) for better compatibility
export const ConnectionStatus = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
} as const;

export type ConnectionStatus = typeof ConnectionStatus[keyof typeof ConnectionStatus];
