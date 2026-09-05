export interface PersistedChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  modelId: string;
  personaId?: string;
  isPinned?: boolean;
  isArchived?: boolean;
}

export interface PersistedChatAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  textContent?: string;
}

export interface PersistedChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  alternativeContents?: string[];
  activeIndex?: number;
  createdAt: number;
  modelId?: string;
  thinkingContent?: string;
  personaId?: string;
  attachments?: PersistedChatAttachment[];
  metrics?: {
    ttftMs?: number;
    throughputTokSec?: number;
    tokens?: number;
    cacheSavings?: string;
    compacted?: boolean;
    compactedTurns?: number;
  };
}
