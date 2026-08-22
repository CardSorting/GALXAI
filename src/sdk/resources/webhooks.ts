/**
 * GALXAI Developer SDK: Webhooks Cryptographic Verification Resource
 */

import * as crypto from 'node:crypto';

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
   * Generates a signed header for test mock servers.
   */
  public generateSignature(rawPayload: string, secret: string, timestamp = Date.now()): string {
    const signaturePayload = `${timestamp}.${rawPayload}`;
    const hmac = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
    return `t=${timestamp},v1=${hmac}`;
  }
}
