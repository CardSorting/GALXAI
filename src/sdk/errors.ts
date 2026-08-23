/**
 * GALXAI Developer SDK: Error Hierarchy
 * Granular, typed error classes matching industry standards for AI Gateway APIs.
 * Includes actionable troubleshooting guidance (`suggestedFix`).
 */

export class GalxError extends Error {
  readonly statusCode?: number;
  readonly code?: string;
  readonly type?: string;
  readonly param?: string;
  readonly suggestedFix?: string;
  readonly errorDetails?: any;

  constructor(message: string, statusCode?: number, code?: string, errorDetails?: any, suggestedFix?: string) {
    super(message);
    this.name = 'GalxError';
    this.statusCode = statusCode;
    this.code = code;
    this.errorDetails = errorDetails;
    this.suggestedFix = suggestedFix;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class APIError extends GalxError {
  constructor(message: string, statusCode?: number, code?: string, errorDetails?: any, suggestedFix?: string) {
    super(message, statusCode, code, errorDetails, suggestedFix);
    this.name = 'APIError';
  }

  public static fromResponse(statusCode: number, data: any): APIError {
    const message = data?.error?.message || data?.message || `HTTP ${statusCode} API Error`;
    const code = data?.error?.code || data?.code || 'api_error';
    const suggestedFix = data?.error?.suggested_fix || data?.suggestedFix;

    switch (statusCode) {
      case 401:
        return new AuthenticationError(message, suggestedFix);
      case 403:
        return new PermissionDeniedError(message, suggestedFix);
      case 404:
        return new NotFoundError(message, suggestedFix);
      case 429:
        return new RateLimitError(message, data?.retry_after, suggestedFix);
      case 504:
        return new APITimeoutError(60000, message);
      default:
        if (statusCode >= 500) {
          return new InternalServerError(message, statusCode, suggestedFix);
        }
        return new APIError(message, statusCode, code, data, suggestedFix);
    }
  }
}

export class AuthenticationError extends APIError {
  constructor(
    message = 'Invalid or missing GALXAI Gateway API Key (Bearer galx_live_...)',
    suggestedFix = 'Ensure Authorization header contains Bearer <key> or pass apiKey to new GalxAI()'
  ) {
    super(message, 401, 'invalid_api_key', undefined, suggestedFix);
    this.name = 'AuthenticationError';
  }
}

export class PermissionDeniedError extends APIError {
  constructor(
    message = 'Insufficient permissions for this operation',
    suggestedFix = 'Verify key permissions or rotate gateway key in GALXAI Dashboard /keys'
  ) {
    super(message, 403, 'permission_denied', undefined, suggestedFix);
    this.name = 'PermissionDeniedError';
  }
}

export class NotFoundError extends APIError {
  constructor(
    message = 'Requested resource not found',
    suggestedFix = 'Check the model ID or endpoint URI. Try "gpt-5.6-sol" for flagship coding.'
  ) {
    super(message, 404, 'resource_not_found', undefined, suggestedFix);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends APIError {
  readonly retryAfterSeconds?: number;

  constructor(
    message = 'Rate limit exceeded for provider/tenant quota',
    retryAfterSeconds?: number,
    suggestedFix = 'Requests are automatically smoothed. Wait for the backoff window or upgrade quota.'
  ) {
    super(message, 429, 'rate_limit_exceeded', undefined, suggestedFix);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
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

export class InternalServerError extends APIError {
  constructor(
    message = 'GALXAI upstream provider or gateway internal error',
    statusCode = 500,
    suggestedFix = 'Automatic shard failover was engaged. Retry request momentarily.'
  ) {
    super(message, statusCode, 'internal_server_error', undefined, suggestedFix);
    this.name = 'InternalServerError';
  }
}
