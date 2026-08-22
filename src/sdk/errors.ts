/**
 * GALXAI Developer SDK: Error Hierarchy
 * Granular, typed error classes matching industry standards for AI Gateway APIs.
 */

export class GalxError extends Error {
  readonly statusCode?: number;
  readonly code?: string;
  readonly type?: string;
  readonly param?: string;
  readonly errorDetails?: any;

  constructor(message: string, statusCode?: number, code?: string, errorDetails?: any) {
    super(message);
    this.name = 'GalxError';
    this.statusCode = statusCode;
    this.code = code;
    this.errorDetails = errorDetails;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class APIError extends GalxError {
  constructor(message: string, statusCode?: number, code?: string, errorDetails?: any) {
    super(message, statusCode, code, errorDetails);
    this.name = 'APIError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message = 'Invalid or missing GALXAI Gateway API Key (Bearer galx_live_...)') {
    super(message, 401, 'invalid_api_key');
    this.name = 'AuthenticationError';
  }
}

export class PermissionDeniedError extends APIError {
  constructor(message = 'Insufficient permissions for this operation') {
    super(message, 403, 'permission_denied');
    this.name = 'PermissionDeniedError';
  }
}

export class NotFoundError extends APIError {
  constructor(message = 'Requested resource not found') {
    super(message, 404, 'resource_not_found');
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends APIError {
  readonly retryAfterSeconds?: number;

  constructor(message = 'Rate limit exceeded for provider/tenant quota', retryAfterSeconds?: number) {
    super(message, 429, 'rate_limit_exceeded');
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class APIConnectionError extends GalxError {
  constructor(message = 'Failed to establish network connection to GALXAI Gateway', cause?: any) {
    super(message, undefined, 'connection_failed', cause);
    this.name = 'APIConnectionError';
  }
}

export class APITimeoutError extends GalxError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, message?: string) {
    super(message || `Request timed out after ${timeoutMs}ms`, 504, 'request_timeout');
    this.name = 'APITimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class InternalServerError extends APIError {
  constructor(message = 'GALXAI upstream provider or gateway internal error', statusCode = 500) {
    super(message, statusCode, 'internal_server_error');
    this.name = 'InternalServerError';
  }
}
