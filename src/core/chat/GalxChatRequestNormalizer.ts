import type { RollingContextMessage } from '../router/GalxRollingContextEngine';
import type { ReasoningEffortLevel } from '../contracts/GalxContracts';

export const MAX_CHAT_BODY_BYTES = 16 * 1024 * 1024;
export const MAX_CHAT_MESSAGES = 10_000;
export const MAX_CONVERSATION_ID_LENGTH = 64;

export type ChatSessionMode = 'new' | 'continue' | 'stateless';

export interface ResolvedChatIdentity {
  conversationId?: string;
  turnId: string;
  mode: ChatSessionMode;
  modeWasExplicit: boolean;
}

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

export function createChatResourceId(prefix: 'session' | 'agent' | 'turn' = 'session'): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (!randomUuid) {
    throw new Error('A cryptographically secure randomUUID implementation is required.');
  }
  return `${prefix}_${randomUuid}`;
}

export function normalizeChatSessionMode(value: unknown): ChatSessionMode | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new ChatRequestValidationError(
      'session_mode must be one of: new, continue, stateless.',
      'invalid_session_mode'
    );
  }
  const mode = value.trim().toLowerCase();
  if (mode !== 'new' && mode !== 'continue' && mode !== 'stateless') {
    throw new ChatRequestValidationError(
      'session_mode must be one of: new, continue, stateless.',
      'invalid_session_mode'
    );
  }
  return mode;
}

/**
 * Resolves logical conversation identity independently of the HTTP connection or
 * provider credential. A shared transport client may carry many isolated sessions.
 */
export function resolveChatIdentity(params: {
  body: Record<string, any>;
  headers?: Pick<Headers, 'get'>;
}): ResolvedChatIdentity {
  const { body, headers } = params;
  const snakeConversationId = normalizeConversationId(body.conversation_id);
  const camelConversationId = normalizeConversationId(body.conversationId);
  if (snakeConversationId && camelConversationId && snakeConversationId !== camelConversationId) {
    throw new ChatRequestValidationError(
      'conversation_id and conversationId must identify the same conversation.',
      'conflicting_conversation_id'
    );
  }
  const bodyConversationId = snakeConversationId || camelConversationId;
  const headerConversationId = normalizeConversationId(headers?.get('x-galx-session-id'));
  if (bodyConversationId && headerConversationId && bodyConversationId !== headerConversationId) {
    throw new ChatRequestValidationError(
      'conversation_id and X-Galx-Session-Id must identify the same conversation.',
      'conflicting_conversation_id'
    );
  }

  const snakeMode = normalizeChatSessionMode(body.session_mode);
  const camelMode = normalizeChatSessionMode(body.sessionMode);
  if (snakeMode && camelMode && snakeMode !== camelMode) {
    throw new ChatRequestValidationError(
      'session_mode and sessionMode must match.',
      'conflicting_session_mode'
    );
  }
  const bodyMode = snakeMode || camelMode;
  const headerMode = normalizeChatSessionMode(headers?.get('x-galx-session-mode'));
  if (bodyMode && headerMode && bodyMode !== headerMode) {
    throw new ChatRequestValidationError(
      'session_mode and X-Galx-Session-Mode must match.',
      'conflicting_session_mode'
    );
  }

  const requestedConversationId = bodyConversationId || headerConversationId;
  const modeWasExplicit = Boolean(bodyMode || headerMode);
  const mode = bodyMode || headerMode || (requestedConversationId ? 'continue' : 'stateless');

  if (mode === 'continue' && !requestedConversationId) {
    throw new ChatRequestValidationError(
      'conversation_id is required when session_mode is continue.',
      'missing_conversation_id'
    );
  }
  if (mode === 'stateless' && requestedConversationId) {
    throw new ChatRequestValidationError(
      'conversation_id cannot be combined with session_mode stateless.',
      'conflicting_conversation_mode'
    );
  }

  const snakeTurnId = normalizeChatResourceId(body.turn_id, 'turn_id');
  const camelTurnId = normalizeChatResourceId(body.turnId, 'turn_id');
  if (snakeTurnId && camelTurnId && snakeTurnId !== camelTurnId) {
    throw new ChatRequestValidationError(
      'turn_id and turnId must match.',
      'conflicting_turn_id'
    );
  }
  const bodyTurnId = snakeTurnId || camelTurnId;
  const headerTurnId = normalizeChatResourceId(headers?.get('x-galx-turn-id'), 'turn_id');
  if (bodyTurnId && headerTurnId && bodyTurnId !== headerTurnId) {
    throw new ChatRequestValidationError(
      'turn_id and X-Galx-Turn-Id must match.',
      'conflicting_turn_id'
    );
  }

  return {
    conversationId: mode === 'new'
      ? (requestedConversationId || createChatResourceId('session'))
      : requestedConversationId,
    turnId: bodyTurnId || headerTurnId || createChatResourceId('turn'),
    mode,
    modeWasExplicit,
  };
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

export const ALLOWED_REASONING_EFFORTS = new Set<ReasoningEffortLevel>([
  'none',
  'low',
  'medium',
  'high',
  'xhigh',
  'auto',
]);

export function normalizeReasoningEffort(value: unknown): ReasoningEffortLevel | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new ChatRequestValidationError(
      'reasoning_effort must be a string (none, low, medium, high, xhigh, auto).',
      'invalid_reasoning_effort'
    );
  }
  const normalized = value.trim().toLowerCase() as ReasoningEffortLevel;
  if (!ALLOWED_REASONING_EFFORTS.has(normalized)) {
    throw new ChatRequestValidationError(
      `reasoning_effort must be one of: ${Array.from(ALLOWED_REASONING_EFFORTS).join(', ')}. Received: "${value}"`,
      'invalid_reasoning_effort'
    );
  }
  return normalized;
}

export function resolveAdaptiveReasoningEffort(options: {
  explicitEffort?: ReasoningEffortLevel;
  messages?: RollingContextMessage[];
  isStream?: boolean;
}): ReasoningEffortLevel {
  if (options.explicitEffort && options.explicitEffort !== 'auto') {
    return options.explicitEffort;
  }

  // Inspect prompt content for task-adaptive reasoning tiering
  const promptSample = (options.messages || [])
    .map((m) => (typeof m.content === 'string' ? m.content : ''))
    .join(' ')
    .toLowerCase();

  // Fast UI / Interactive / Game generation tasks favor 'low' for instant 3-6s TTFT
  const isFastUiTask =
    promptSample.includes('canvas') ||
    promptSample.includes('html') ||
    promptSample.includes('game') ||
    promptSample.includes('snake') ||
    promptSample.includes('ui component') ||
    promptSample.includes('interactive') ||
    promptSample.includes('fast response') ||
    promptSample.includes('ping') ||
    promptSample.includes('hello');

  if (isFastUiTask) {
    return 'low';
  }

  // Balanced default for general architecture, backend algorithms, and code synthesis
  // Never default to 'xhigh' (which generates 16,000+ hidden reasoning tokens causing 60-second freezes)
  return 'medium';
}
