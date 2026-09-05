import type { PersistedChatMessage as ChatMessage } from './GalxChatPersistenceContracts';
import {
  ChatRequestValidationError,
  normalizeChatResourceId,
} from './GalxChatRequestNormalizer';

export const MAX_CHAT_PERSISTENCE_BATCH = 1_000;
const MAX_STORED_MESSAGE_BYTES = 1024 * 1024;
const STORED_ROLES = new Set(['system', 'user', 'assistant']);

function assertBoundedString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new ChatRequestValidationError(`${field} must be a string.`, `invalid_${field}`);
  }
  if (new TextEncoder().encode(value).byteLength > MAX_STORED_MESSAGE_BYTES) {
    throw new ChatRequestValidationError(
      `${field} exceeds the 1 MiB stored-message limit.`,
      `invalid_${field}`,
      413
    );
  }
  return value;
}

export function normalizeStoredChatMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    throw new ChatRequestValidationError('messages must be an array.', 'invalid_messages');
  }
  if (value.length > MAX_CHAT_PERSISTENCE_BATCH) {
    throw new ChatRequestValidationError(
      `A persistence batch may contain at most ${MAX_CHAT_PERSISTENCE_BATCH.toLocaleString()} messages.`,
      'too_many_messages',
      413
    );
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new ChatRequestValidationError(`messages[${index}] must be an object.`, 'invalid_message');
    }
    const raw = item as Record<string, unknown>;
    const id = normalizeChatResourceId(raw.id, `messages_${index}_id`);
    if (!id) {
      throw new ChatRequestValidationError(`messages[${index}].id is required.`, 'missing_message_id');
    }
    if (typeof raw.role !== 'string' || !STORED_ROLES.has(raw.role)) {
      throw new ChatRequestValidationError(
        `messages[${index}].role must be system, user, or assistant.`,
        'invalid_message_role'
      );
    }
    const content = assertBoundedString(raw.content, `messages_${index}_content`);
    const alternativeContents = raw.alternativeContents === undefined
      ? [content]
      : (Array.isArray(raw.alternativeContents)
        ? raw.alternativeContents.map((alternative, alternativeIndex) =>
            assertBoundedString(alternative, `messages_${index}_alternative_${alternativeIndex}`)
          )
        : null);
    if (!alternativeContents || alternativeContents.length > 20) {
      throw new ChatRequestValidationError(
        `messages[${index}].alternativeContents must contain at most 20 strings.`,
        'invalid_alternative_contents'
      );
    }

    const createdAt = raw.createdAt === undefined ? Date.now() : Number(raw.createdAt);
    if (!Number.isFinite(createdAt) || createdAt < 0) {
      throw new ChatRequestValidationError(
        `messages[${index}].createdAt must be a non-negative finite timestamp.`,
        'invalid_created_at'
      );
    }

    return {
      ...(raw as unknown as ChatMessage),
      id,
      role: raw.role as ChatMessage['role'],
      content,
      alternativeContents,
      activeIndex: Number.isInteger(raw.activeIndex) && Number(raw.activeIndex) >= 0
        ? Number(raw.activeIndex)
        : 0,
      createdAt,
    };
  });
}
