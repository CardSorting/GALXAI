/**
 * GALXAI Developer SDK: Error Hierarchy
 * Granular, typed error classes matching industry standards for AI Gateway APIs (OpenAI, Anthropic, Stripe).
 * Includes actionable troubleshooting guidance (`suggestedFix`), HTTP response headers, and request IDs.
 */

export class GalxError extends Error {
  readonly statusCode?: number;
  readonly status?: number;
  readonly code?: string;
  readonly type?: string;
  readonly param?: string;
  readonly suggestedFix?: string;
  readonly errorDetails?: any;
  readonly headers?: Headers | Record<string, string>;
  readonly requestId?: string;
  /** Relay recovery classification. Ambiguous/accepted work must not be replayed. */
  readonly executionState?: 'unknown' | 'accepted' | 'not_accepted';
  readonly shouldRetry?: boolean;

  constructor(
    message: string,
    statusCode?: number,
    code?: string,
    errorDetails?: any,
    suggestedFix?: string,
    headers?: Headers | Record<string, string>
  ) {
    super(message);
    this.name = 'GalxError';
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = code;
    this.errorDetails = errorDetails;
    this.suggestedFix = suggestedFix;
    this.headers = headers;

    if (headers) {
      if (typeof (headers as any).get === 'function') {
        this.requestId = (headers as Headers).get('x-request-id') || (headers as Headers).get('cf-ray') || undefined;
      } else {
        this.requestId = (headers as Record<string, string>)['x-request-id'] || (headers as Record<string, string>)['cf-ray'] || undefined;
      }
    }

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class APIError extends GalxError {
  constructor(
    message: string,
    statusCode?: number,
    code?: string,
    errorDetails?: any,
    suggestedFix?: string,
    headers?: Headers | Record<string, string>
  ) {
    super(message, statusCode, code, errorDetails, suggestedFix, headers);
    this.name = 'APIError';
  }

  public static fromResponse(statusCode: number, data: any, headers?: Headers | Record<string, string>): APIError {
    const message = data?.error?.message || data?.message || `HTTP ${statusCode} API Error`;
    const code = data?.error?.code || data?.code || 'api_error';
    const suggestedFix = data?.error?.suggested_fix || data?.suggestedFix;

    let retryAfter: number | undefined;
    if (headers) {
      const retryHeader = typeof (headers as any).get === 'function'
        ? (headers as Headers).get('retry-after') || (headers as Headers).get('retry-after-ms')
        : (headers as Record<string, string>)['retry-after'] || (headers as Record<string, string>)['retry-after-ms'];
      retryAfter = parseRetryAfter(retryHeader);
    }

    let error: APIError;
    switch (statusCode) {
      case 400:
        error = new BadRequestError(message, data?.error?.param, suggestedFix, headers); break;
      case 401:
        error = new AuthenticationError(message, suggestedFix, headers); break;
      case 402:
        error = new PaymentRequiredError(message, suggestedFix, headers); break;
      case 403:
        error = new PermissionDeniedError(message, suggestedFix, headers); break;
      case 404:
        error = new NotFoundError(message, suggestedFix, headers); break;
      case 409:
        error = new ConflictError(message, suggestedFix, headers); break;
      case 422:
        error = new UnprocessableEntityError(message, data?.error?.param, suggestedFix, headers); break;
      case 429:
        error = new RateLimitError(message, retryAfter ?? data?.retry_after, suggestedFix, headers); break;
      case 502:
        error = new BadGatewayError(message, suggestedFix, headers); break;
      case 503:
        error = new ServiceUnavailableError(message, suggestedFix, headers); break;
      case 504:
        error = new GatewayTimeoutError(message, suggestedFix, headers); break;
      default:
        if (statusCode >= 500) {
          error = new InternalServerError(message, statusCode, suggestedFix, headers);
          break;
        }
        error = new APIError(message, statusCode, code, data, suggestedFix, headers);
        break;
    }
    const executionState = data?.error?.execution_state;
    const header = typeof (headers as any)?.get === 'function'
      ? (headers as Headers).get('x-should-retry')
      : Object.entries((headers ?? {}) as Record<string, string>).find(([key]) => key.toLowerCase() === 'x-should-retry')?.[1];
    Object.assign(error, {
      executionState: ['unknown', 'accepted', 'not_accepted'].includes(executionState) ? executionState : undefined,
      // Ambiguous or already accepted work is never safe to replay, even if a
      // gateway omitted the explicit veto header.
      shouldRetry: executionState === 'unknown' || executionState === 'accepted'
        ? false : header === 'true' ? true : header === 'false' ? false : undefined,
    });
    return error;
  }
}

/** True when the response identifies work that must be inspected rather than replayed. */
export function isNonReplayableError(error: unknown): boolean {
  const value = error as { executionState?: string; shouldRetry?: boolean; headers?: Headers | Record<string, string> } | null;
  if (!value) return false;
  if (value.executionState === 'unknown' || value.executionState === 'accepted' || value.shouldRetry === false) return true;
  const headers = value.headers;
  const retry = typeof (headers as any)?.get === 'function'
    ? (headers as Headers).get('x-should-retry')
    : Object.entries((headers ?? {}) as Record<string, string>).find(([key]) => key.toLowerCase() === 'x-should-retry')?.[1];
  return retry === 'false';
}

export class BadRequestError extends APIError {
  constructor(
    message = 'Invalid request parameters',
    param?: string,
    suggestedFix = 'Verify request payload matches the schema for this endpoint',
    headers?: Headers | Record<string, string>
  ) {
    super(message, 400, 'bad_request', { param }, suggestedFix, headers);
    this.name = 'BadRequestError';
  }
}

export class AuthenticationError extends APIError {
  constructor(
    message = 'Invalid or missing GALXAI Gateway API Key (Bearer galx_live_...)',
    suggestedFix = 'Ensure Authorization header contains Bearer <key> or pass apiKey to new GalxAI()',
    headers?: Headers | Record<string, string>
  ) {
    super(message, 401, 'invalid_api_key', undefined, suggestedFix, headers);
    this.name = 'AuthenticationError';
  }
}

export class PaymentRequiredError extends APIError {
  constructor(
    message = 'Insufficient funds, quota exhausted, or payment required',
    suggestedFix = 'Review your credit balance at https://galx.ai/billing/credits',
    headers?: Headers | Record<string, string>
  ) {
    super(message, 402, 'payment_required', undefined, suggestedFix, headers);
    this.name = 'PaymentRequiredError';
  }
}

export class PermissionDeniedError extends APIError {
  constructor(
    message = 'Insufficient permissions for this operation',
    suggestedFix = 'Verify key permissions or rotate gateway key in GALXAI Dashboard /keys',
    headers?: Headers | Record<string, string>
  ) {
    super(message, 403, 'permission_denied', undefined, suggestedFix, headers);
    this.name = 'PermissionDeniedError';
  }
}

export class NotFoundError extends APIError {
  constructor(
    message = 'Requested resource not found',
    suggestedFix = 'Check the model ID or endpoint URI. Try "gpt-5.6-sol" for flagship coding.',
    headers?: Headers | Record<string, string>
  ) {
    super(message, 404, 'resource_not_found', undefined, suggestedFix, headers);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends APIError {
  constructor(
    message = 'Resource conflict or concurrent state modification',
    suggestedFix = 'Retry with an updated resource version or use a unique idempotency key',
    headers?: Headers | Record<string, string>
  ) {
    super(message, 409, 'conflict', undefined, suggestedFix, headers);
    this.name = 'ConflictError';
  }
}

export class UnprocessableEntityError extends APIError {
  constructor(
    message = 'Unprocessable entity or schema validation failure',
    param?: string,
    suggestedFix = 'Ensure values strictly conform to the expected format and constraints',
    headers?: Headers | Record<string, string>
  ) {
    super(message, 422, 'unprocessable_entity', { param }, suggestedFix, headers);
    this.name = 'UnprocessableEntityError';
  }
}

export class RateLimitError extends APIError {
  readonly retryAfterSeconds?: number;

  constructor(
    message = 'Rate limit exceeded for provider/tenant quota',
    retryAfterSeconds?: number,
    suggestedFix = 'Requests are automatically smoothed. Wait for the backoff window or upgrade quota.',
    headers?: Headers | Record<string, string>
  ) {
    super(message, 429, 'rate_limit_exceeded', { retryAfterSeconds }, suggestedFix, headers);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class InternalServerError extends APIError {
  constructor(
    message = 'GALXAI gateway internal error',
    statusCode = 500,
    suggestedFix = 'Automatic gateway failover was engaged. Retry request momentarily.',
    headers?: Headers | Record<string, string>
  ) {
    super(message, statusCode, 'internal_server_error', undefined, suggestedFix, headers);
    this.name = 'InternalServerError';
  }
}

export class BadGatewayError extends APIError {
  constructor(
    message = 'Upstream provider or model cluster unreachable',
    suggestedFix = 'GALXAI auto-fallback is routing to alternative providers. Retry momentarily.',
    headers?: Headers | Record<string, string>
  ) {
    super(message, 502, 'bad_gateway', undefined, suggestedFix, headers);
    this.name = 'BadGatewayError';
  }
}

export class ServiceUnavailableError extends APIError {
  constructor(
    message = 'Gateway is temporarily overloaded or undergoing maintenance',
    suggestedFix = 'Wait briefly before retrying; exponential backoff will automatically mitigate.',
    headers?: Headers | Record<string, string>
  ) {
    super(message, 503, 'service_unavailable', undefined, suggestedFix, headers);
    this.name = 'ServiceUnavailableError';
  }
}

export class GatewayTimeoutError extends APIError {
  constructor(
    message = 'Upstream provider timed out waiting for generation response',
    suggestedFix = 'Consider using async background task queue for long-running prompts.',
    headers?: Headers | Record<string, string>
  ) {
    super(message, 504, 'gateway_timeout', undefined, suggestedFix, headers);
    this.name = 'GatewayTimeoutError';
  }
}

export class APIConnectionError extends GalxError {
  constructor(
    message = 'Failed to establish network connection to GALXAI Gateway',
    cause?: any,
    suggestedFix = 'Check internet connectivity or ensure DNS resolves https://galx.ai'
  ) {
    super(message, undefined, 'connection_failed', cause, suggestedFix);
    this.name = 'APIConnectionError';
  }
}

export class APITimeoutError extends GalxError {
  readonly timeoutMs: number;

  constructor(
    timeoutMs: number,
    message?: string,
    suggestedFix = 'Consider increasing timeoutMs in client options or switching to async background jobs'
  ) {
    super(message || `Request timed out after ${timeoutMs}ms`, 504, 'request_timeout', undefined, suggestedFix);
    this.name = 'APITimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class UserAbortError extends GalxError {
  constructor(
    message = 'Request was explicitly aborted by caller AbortSignal',
    suggestedFix = 'Ensure your AbortController is not triggered prematurely'
  ) {
    super(message, 499, 'client_aborted', undefined, suggestedFix);
    this.name = 'UserAbortError';
  }
}

/**
 * Parses RFC 7231 / RFC 9110 Retry-After header.
 * Supports decimal/integer seconds, millisecond headers, and HTTP dates.
 */
export function parseRetryAfter(headerVal: string | null | undefined): number | undefined {
  if (!headerVal) return undefined;
  const trimmed = headerVal.trim();

  // If integer / numeric seconds
  const numeric = parseFloat(trimmed);
  if (!isNaN(numeric) && /^\d+(\.\d+)?$/.test(trimmed)) {
    return Math.max(0, Math.ceil(numeric));
  }

  // If HTTP Date (e.g. "Wed, 21 Oct 2026 07:28:00 GMT")
  const dateMs = Date.parse(trimmed);
  if (!isNaN(dateMs)) {
    const diffSec = Math.ceil((dateMs - Date.now()) / 1000);
    return Math.max(0, diffSec);
  }

  return undefined;
}
