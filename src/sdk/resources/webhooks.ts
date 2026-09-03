/**
 * GALXAI Developer SDK: Webhooks Cryptographic Verification Resource
 * Mirrors the signature Stripe `stripe.webhooks.constructEvent` standard.
 */

import * as crypto from 'node:crypto';
import { GalxError } from '../errors';

export class SignatureVerificationError extends GalxError {
  public readonly header: string;

  constructor(message: string, header = '') {
    super(message);
    this.name = 'SignatureVerificationError';
    this.header = header;
  }
}

export interface GalxWebhookEvent<T = any> {
  id: string;
  object: 'event';
  type:
    | 'task.progress'
    | 'task.completed'
    | 'task.failed'
    | 'batch.completed'
    | 'batch.failed'
    | 'model.rate_limited'
    | 'quota.warning'
    | string;
  created: number;
  data: {
    object: T;
    [key: string]: any;
  };
  livemode?: boolean;
}

export interface WebhookHandlerOptions {
  secret: string;
  toleranceSeconds?: number;
  onEvent?: (event: GalxWebhookEvent) => Promise<void> | void;
  onTaskCompleted?: (task: any, event: GalxWebhookEvent) => Promise<void> | void;
  onTaskFailed?: (error: any, event: GalxWebhookEvent) => Promise<void> | void;
  onBatchCompleted?: (batch: any, event: GalxWebhookEvent) => Promise<void> | void;
}

export class WebhooksResource {
  /**
   * Cryptographically verifies incoming webhook HMAC-SHA256 signatures against the raw request payload.
   * Prevents webhook spoofing, replay attacks, and man-in-the-middle tampering.
   *
   * @param rawPayload Raw request body string or Buffer
   * @param signatureHeader Value of 'X-Galx-Signature' header (e.g. 't=1787...,v1=4f3a...')
   * @param secret Webhook HMAC secret key
   * @param toleranceSeconds Maximum allowed clock skew in seconds (default: 300s)
   */
  public verifySignature(
    rawPayload: string | Buffer,
    signatureHeader: string | null | undefined,
    secret: string,
    toleranceSeconds = 300
  ): boolean {
    if (!signatureHeader || !secret) return false;

    const payloadString = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf8');

    const parts = Object.fromEntries(
      signatureHeader.split(',').map(kv => {
        const idx = kv.indexOf('=');
        return idx > 0 ? [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()] : [kv.trim(), ''];
      })
    );

    const timestampStr = parts['t'];
    const receivedSig = parts['v1'];

    if (!timestampStr || !receivedSig) return false;

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;

    // Check clock skew tolerance
    const now = Date.now();
    const ageSeconds = Math.abs(now - timestamp) / 1000;
    if (ageSeconds > toleranceSeconds) {
      return false;
    }

    const signaturePayload = `${timestamp}.${payloadString}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(receivedSig, 'hex'), Buffer.from(expectedSig, 'hex'));
    } catch {
      return false;
    }
  }

  /**
   * Constructs and cryptographically verifies an incoming webhook event matching the Stripe SDK pattern.
   *
   * @throws {SignatureVerificationError} If the signature is invalid or timestamp skew exceeds tolerance.
   *
   * @example
   * ```ts
   * const event = galx.webhooks.constructEvent(
   *   rawBody,
   *   req.headers['x-galx-signature'],
   *   process.env.GALXAI_WEBHOOK_SECRET!
   * );
   * ```
   */
  public constructEvent<T = any>(
    rawPayload: string | Buffer,
    signatureHeader: string | null | undefined,
    secret: string,
    toleranceSeconds = 300
  ): GalxWebhookEvent<T> {
    if (!signatureHeader) {
      throw new SignatureVerificationError('No X-Galx-Signature header found on request', '');
    }

    if (!secret) {
      throw new SignatureVerificationError('No webhook secret configured', signatureHeader);
    }

    const payloadString = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf8');

    const parts = Object.fromEntries(
      signatureHeader.split(',').map(kv => {
        const idx = kv.indexOf('=');
        return idx > 0 ? [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()] : [kv.trim(), ''];
      })
    );

    const timestampStr = parts['t'];
    const receivedSig = parts['v1'];

    if (!timestampStr || !receivedSig) {
      throw new SignatureVerificationError('Unable to extract timestamp and signatures from header', signatureHeader);
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      throw new SignatureVerificationError('Invalid timestamp found in signature header', signatureHeader);
    }

    const now = Date.now();
    const ageSeconds = Math.abs(now - timestamp) / 1000;
    if (ageSeconds > toleranceSeconds) {
      throw new SignatureVerificationError(
        `Timestamp outside the tolerance zone (${Math.round(ageSeconds)}s > ${toleranceSeconds}s)`,
        signatureHeader
      );
    }

    const signaturePayload = `${timestamp}.${payloadString}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');

    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(Buffer.from(receivedSig, 'hex'), Buffer.from(expectedSig, 'hex'));
    } catch {
      isValid = false;
    }

    if (!isValid) {
      throw new SignatureVerificationError('No signatures found matching the expected signature for payload', signatureHeader);
    }

    try {
      const parsed = JSON.parse(payloadString);
      return {
        id: parsed.id || `evt_${Date.now()}`,
        object: 'event',
        type: parsed.type || parsed.event || 'unknown',
        created: parsed.created || Math.floor(timestamp / 1000),
        data: parsed.data || { object: parsed },
        livemode: parsed.livemode ?? true
      };
    } catch (err: any) {
      throw new SignatureVerificationError(`Webhook payload is not valid JSON: ${err.message}`, signatureHeader);
    }
  }

  /**
   * Generates a signed header for test mock servers and unit testing.
   */
  public generateSignature(rawPayload: string, secret: string, timestamp = Date.now()): string {
    const signaturePayload = `${timestamp}.${rawPayload}`;
    const hmac = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
    return `t=${timestamp},v1=${hmac}`;
  }

  /**
   * Creates a high-level 1-line webhook route handler for Next.js App Router or Express.
   *
   * @example
   * ```ts
   * // app/api/webhooks/route.ts
   * export const POST = galx.webhooks.createHandler({
   *   secret: process.env.GALXAI_WEBHOOK_SECRET!,
   *   onTaskCompleted: async (task) => console.log('Task complete:', task.id)
   * });
   * ```
   */
  public createHandler(options: WebhookHandlerOptions) {
    const self = this;

    return async function webhookRoute(req: any, res?: any): Promise<any> {
      try {
        let rawBody = '';
        let signature = '';

        // Web API standard Request (Next.js, Cloudflare, Deno)
        if (typeof req.text === 'function') {
          rawBody = await req.text();
          signature = req.headers.get('x-galx-signature') || req.headers.get('x-signature') || '';
        } else if (req.body) {
          // Express / Node.js http
          rawBody = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
          signature = req.headers['x-galx-signature'] || req.headers['x-signature'] || '';
        }

        const event = self.constructEvent(rawBody, signature, options.secret, options.toleranceSeconds);

        if (options.onEvent) {
          await options.onEvent(event);
        }

        if (event.type === 'task.completed' && options.onTaskCompleted) {
          await options.onTaskCompleted(event.data?.object, event);
        } else if (event.type === 'task.failed' && options.onTaskFailed) {
          await options.onTaskFailed(event.data?.object, event);
        } else if (event.type === 'batch.completed' && options.onBatchCompleted) {
          await options.onBatchCompleted(event.data?.object, event);
        }

        if (res && typeof res.status === 'function') {
          return res.status(200).json({ received: true });
        }
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err: any) {
        const isSigErr = err instanceof SignatureVerificationError;
        const statusCode = isSigErr ? 400 : 500;

        if (res && typeof res.status === 'function') {
          return res.status(statusCode).json({ error: err.message });
        }
        return new Response(JSON.stringify({ error: err.message }), {
          status: statusCode,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    };
  }
}
