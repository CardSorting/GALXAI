import type { RollingContextMessage } from '../router/GalxRollingContextEngine';

export const MAX_CHAT_BODY_BYTES = 16 * 1024 * 1024;
export const MAX_CHAT_MESSAGES = 10_000;
export const MAX_CONVERSATION_ID_LENGTH = 64;

const ALLOWED_ROLES = new Set(['system', 'developer', 'user', 'assistant', 'tool']);
const RESOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

export class ChatRequestValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = 'ChatRequestValidationError';
  }
}

function assertBodySize(byteLength: number): void {
  if (byteLength > MAX_CHAT_BODY_BYTES) {
    throw new ChatRequestValidationError(
      `Request body exceeds the ${MAX_CHAT_BODY_BYTES / (1024 * 1024)} MiB gateway limit.`,
      'request_body_too_large',
      413
    );
  }
}

export async function parseChatJsonBody(request: Request): Promise<Record<string, any>> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength >= 0) assertBodySize(declaredLength);

  const text = await request.text();
  assertBodySize(new TextEncoder().encode(text).byteLength);
  if (!text.trim()) {
    throw new ChatRequestValidationError('Request body must be a non-empty JSON object.', 'missing_request_body');
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ChatRequestValidationError('Request body must contain valid JSON.', 'invalid_json');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ChatRequestValidationError('Request body must be a JSON object.', 'invalid_request_body');
  }
  return body as Record<string, any>;
}

function normalizeContent(content: unknown, index: number): unknown {
  if (typeof content === 'string' || content === null) return content;
  if (!Array.isArray(content)) {
    throw new ChatRequestValidationError(
      `messages[${index}].content must be a string, null, or an array of content parts.`,
      'invalid_message_content'
    );
  }

  return content.map((part, partIndex) => {
    if (!part || typeof part !== 'object' || Array.isArray(part) || typeof (part as any).type !== 'string') {
      throw new ChatRequestValidationError(
        `messages[${index}].content[${partIndex}] must be an object with a string type.`,
        'invalid_content_part'
      );
    }
    return { ...(part as Record<string, unknown>) };
  });
}

function normalizeMessage(rawMessage: unknown, index: number): RollingContextMessage {
  if (typeof rawMessage === 'string') return { role: 'user', content: rawMessage };
  if (!rawMessage || typeof rawMessage !== 'object' || Array.isArray(rawMessage)) {
    throw new ChatRequestValidationError(`messages[${index}] must be an object.`, 'invalid_message');
  }

  const raw = rawMessage as Record<string, any>;
  const role = String(raw.role || '').trim().toLowerCase();
  if (!ALLOWED_ROLES.has(role)) {
    throw new ChatRequestValidationError(
      `messages[${index}].role must be one of: system, developer, user, assistant, tool.`,
      'invalid_message_role'
    );
  }

  const content = normalizeContent(raw.content !== undefined ? raw.content : (raw.text ?? ''), index);
  if (role === 'tool' && (typeof raw.tool_call_id !== 'string' || !raw.tool_call_id.trim())) {
    throw new ChatRequestValidationError(
      `messages[${index}] with role "tool" requires tool_call_id.`,
      'missing_tool_call_id'
    );
  }
  if (raw.tool_calls !== undefined && !Array.isArray(raw.tool_calls)) {
    throw new ChatRequestValidationError(
      `messages[${index}].tool_calls must be an array.`,
      'invalid_tool_calls'
    );
  }

  const message: RollingContextMessage = { role, content };
  if (raw.name !== undefined) {
    if (typeof raw.name !== 'string' || raw.name.length > 64 || !/^[A-Za-z0-9_-]+$/.test(raw.name)) {
      throw new ChatRequestValidationError(
        `messages[${index}].name must contain at most 64 letters, numbers, underscores, or hyphens.`,
        'invalid_message_name'
      );
    }
    message.name = raw.name;
  }
  if (raw.tool_calls) message.tool_calls = raw.tool_calls;
  if (raw.tool_call_id) message.tool_call_id = raw.tool_call_id;
  return message;
}

export function normalizeChatMessages(body: Record<string, any>): RollingContextMessage[] {
  const normalized: RollingContextMessage[] = [];

  if (body.system !== undefined) {
    const systemContent = Array.isArray(body.system)
      ? body.system.map((item: any) => item?.text || '').join('\n')
      : String(body.system);
    if (systemContent.trim()) normalized.push({ role: 'system', content: systemContent });
  }

  if (body.messages !== undefined) {
    const rawMessages = Array.isArray(body.messages) ? body.messages : [body.messages];
    if (rawMessages.length > MAX_CHAT_MESSAGES) {
      throw new ChatRequestValidationError(
        `messages may contain at most ${MAX_CHAT_MESSAGES.toLocaleString()} items.`,
        'too_many_messages',
        413
      );
    }
    rawMessages.forEach((message, index) => normalized.push(normalizeMessage(message, index)));
  } else {
    const fallback = body.prompt ?? body.input ?? body.text ?? body.content;
    if (fallback !== undefined) {
      const text = Array.isArray(fallback) ? fallback.join('\n') : String(fallback);
      normalized.push({ role: 'user', content: text });
    }
  }

  if (normalized.length === 0 || !normalized.some((message) => message.role === 'user' || message.role === 'tool')) {
    throw new ChatRequestValidationError(
      'At least one user or tool message is required.',
      'missing_messages'
    );
  }

  const firstConversationMessage = normalized.find((message) =>
    message.role !== 'system' && message.role !== 'developer'
  );
  if (firstConversationMessage?.role === 'tool') {
    throw new ChatRequestValidationError(
      'A conversation cannot begin with a tool result.',
      'orphaned_tool_message'
    );
  }

  let pendingToolCallIds = new Set<string>();
  for (let index = 0; index < normalized.length; index++) {
    const message = normalized[index];
    if (message.role === 'assistant' && message.tool_calls?.length) {
      if (pendingToolCallIds.size > 0) {
        throw new ChatRequestValidationError(
          `messages[${index}] starts new tool calls before all prior tool results were provided.`,
          'incomplete_tool_sequence'
        );
      }
      pendingToolCallIds = new Set(
        message.tool_calls
          .map((call) => call?.id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      );
      if (pendingToolCallIds.size !== message.tool_calls.length) {
        throw new ChatRequestValidationError(
          `messages[${index}].tool_calls entries must each contain a unique string id.`,
          'invalid_tool_call_id'
        );
      }
      continue;
    }

    if (message.role === 'tool') {
      if (!message.tool_call_id || !pendingToolCallIds.delete(message.tool_call_id)) {
        throw new ChatRequestValidationError(
          `messages[${index}].tool_call_id does not match a pending assistant tool call.`,
          'orphaned_tool_message'
        );
      }
      continue;
    }

    if (pendingToolCallIds.size > 0) {
      throw new ChatRequestValidationError(
        `messages[${index}] appears before all assistant tool calls received results.`,
        'incomplete_tool_sequence'
      );
    }
  }
  if (pendingToolCallIds.size > 0) {
    throw new ChatRequestValidationError(
      'Every assistant tool call must have a matching tool result before inference resumes.',
      'incomplete_tool_sequence'
    );
  }

  return normalized;
}

export function normalizeConversationId(value: unknown): string | undefined {
  return normalizeChatResourceId(value, 'conversation_id');
}

export function normalizeChatResourceId(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new ChatRequestValidationError(`${field} must be a string.`, `invalid_${field}`);
  }
  const id = value.trim();
  if (id.length > MAX_CONVERSATION_ID_LENGTH || !RESOURCE_ID_PATTERN.test(id)) {
    throw new ChatRequestValidationError(
      `${field} must be 1-${MAX_CONVERSATION_ID_LENGTH} URL-safe characters.`,
      `invalid_${field}`
    );
  }
  return id;
}

export function optionalFiniteNumber(
  value: unknown,
  field: string,
  options: { min: number; max: number; integer?: boolean }
): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < options.min || parsed > options.max || (options.integer && !Number.isInteger(parsed))) {
    throw new ChatRequestValidationError(
      `${field} must be ${options.integer ? 'an integer' : 'a finite number'} between ${options.min} and ${options.max}.`,
      `invalid_${field.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`
    );
  }
  return parsed;
}
