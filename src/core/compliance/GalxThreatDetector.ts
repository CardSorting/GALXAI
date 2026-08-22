/**
 * GALXAI: Real-Time Threat & Anomaly Detection Engine (SOC 2 CC7.1 / CC7.2)
 * Automated behavioral heuristic monitoring, token surge detection, impossible geo-travel tracking,
 * and tamper-evident threat event logging.
 */

import * as crypto from 'node:crypto';
import type { ThreatDetectionEvent } from '../contracts/GalxContracts';
import { GalxPersistence } from '../../lib/storage/GalxPersistence';

interface UserLocationHistory {
  ipAddress: string;
  countryCode: string;
  timestampMs: number;
}

export class GalxThreatDetector {
  private static instance: GalxThreatDetector;
  private readonly persistence: GalxPersistence;
  private readonly userLocationCache = new Map<string, UserLocationHistory>();
  private readonly userTokenVelocity = new Map<string, { tokenCount: number; windowStartMs: number }>();

  constructor() {
    this.persistence = GalxPersistence.getInstance();
  }

  static getInstance(): GalxThreatDetector {
    if (!GalxThreatDetector.instance) {
      GalxThreatDetector.instance = new GalxThreatDetector();
    }
    return GalxThreatDetector.instance;
  }

  /**
   * Evaluates request metadata for impossible geo-travel anomalies (e.g. US to EU in < 5 mins).
   */
  public evaluateGeoTravelAnomaly(params: {
    userId: string;
    ipAddress?: string;
    countryCode?: string;
    timestampMs?: number;
  }): ThreatDetectionEvent | null {
    if (!params.userId || !params.countryCode) return null;

    const now = params.timestampMs || Date.now();
    const lastLoc = this.userLocationCache.get(params.userId);

    // Update current location cache
    this.userLocationCache.set(params.userId, {
      ipAddress: params.ipAddress || 'unknown',
      countryCode: params.countryCode,
      timestampMs: now
    });

    if (!lastLoc) return null;

    const elapsedMinutes = (now - lastLoc.timestampMs) / 60000;
    // Impossible travel: disparate countries in less than 10 minutes
    if (lastLoc.countryCode !== params.countryCode && elapsedMinutes < 10) {
      const event: ThreatDetectionEvent = {
        eventId: `threat_${crypto.randomBytes(8).toString('hex')}`,
        threatType: 'THREAT_IMPOSSIBLE_TRAVEL',
        severity: 'high',
        userId: params.userId,
        ipAddress: params.ipAddress,
        details: {
          previousCountry: lastLoc.countryCode,
          currentCountry: params.countryCode,
          elapsedMinutes: Number(elapsedMinutes.toFixed(2)),
          rule: 'SOC2-CC7.2-GeoVelocityAnomaly'
        },
        mitigationAction: 'step_up_sudo_required',
        timestamp: new Date().toISOString()
      };

      // Log tamper-evident audit record
      this.persistence.auditRepo.logAudit({
        userId: params.userId,
        action: 'SECURITY_THREAT_IMPOSSIBLE_TRAVEL',
        resourceId: params.userId,
        resourceType: 'user_session',
        ipAddress: params.ipAddress,
        metadata: event.details
      });

      return event;
    }

    return null;
  }

  /**
   * Evaluates rapid token consumption velocity anomalies.
   */
  public evaluateTokenVelocityAnomaly(params: {
    userId: string;
    tokensConsumed: number;
    thresholdTokensPerMin?: number;
  }): ThreatDetectionEvent | null {
    if (!params.userId || params.tokensConsumed <= 0) return null;

    const now = Date.now();
    const threshold = params.thresholdTokensPerMin || 100000; // 100k tokens/min threshold
    let tracker = this.userTokenVelocity.get(params.userId);

    if (!tracker || now - tracker.windowStartMs > 60000) {
      tracker = { tokenCount: params.tokensConsumed, windowStartMs: now };
      this.userTokenVelocity.set(params.userId, tracker);
      return null;
    }

    tracker.tokenCount += params.tokensConsumed;

    if (tracker.tokenCount > threshold) {
      const event: ThreatDetectionEvent = {
        eventId: `threat_${crypto.randomBytes(8).toString('hex')}`,
        threatType: 'THREAT_TOKEN_SPIKE',
        severity: 'medium',
        userId: params.userId,
        details: {
          currentVelocityTokens: tracker.tokenCount,
          threshold,
          windowDurationSeconds: Math.floor((now - tracker.windowStartMs) / 1000),
          rule: 'SOC2-CC7.1-TokenSurge'
        },
        mitigationAction: 'throttled',
        timestamp: new Date().toISOString()
      };

      this.persistence.auditRepo.logAudit({
        userId: params.userId,
        action: 'SECURITY_THREAT_TOKEN_SPIKE',
        resourceId: params.userId,
        resourceType: 'rate_governor',
        metadata: event.details
      });

      return event;
    }

    return null;
  }

  /**
   * Logs a critical forged session token or replay attack attempt.
   */
  public recordTokenForgeryEvent(params: {
    ipAddress?: string;
    userAgent?: string;
    rawTokenSnippet?: string;
    reason: string;
  }): ThreatDetectionEvent {
    const event: ThreatDetectionEvent = {
      eventId: `threat_${crypto.randomBytes(8).toString('hex')}`,
      threatType: 'THREAT_FORGED_TOKEN',
      severity: 'critical',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      details: {
        reason: params.reason,
        rawSnippet: params.rawTokenSnippet ? `${params.rawTokenSnippet.slice(0, 12)}...` : undefined,
        rule: 'SOC2-CC6.1-AccessForgery'
      },
      mitigationAction: 'blocked',
      timestamp: new Date().toISOString()
    };

    this.persistence.auditRepo.logAudit({
      userId: 'system-security',
      action: 'SECURITY_THREAT_FORGED_TOKEN_BLOCKED',
      resourceId: 'auth_engine',
      resourceType: 'authentication_gate',
      ipAddress: params.ipAddress,
      metadata: event.details
    });

    return event;
  }
}

export const galxThreatDetector = GalxThreatDetector.getInstance();
