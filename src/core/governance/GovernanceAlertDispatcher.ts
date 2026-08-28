/**
 * GALXAI Governance Alert Dispatcher
 * 
 * Formats structured alert payloads for Slack Block Kit, PagerDuty v2 API,
 * and standard RFC 7807 Webhook endpoints for real-time incident alerting.
 */

import type { AnomalyDetectionRecord } from './SpendAnomalyDetector';

export interface AlertNotificationPayload {
  incidentId: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  service: string;
  department: string;
  description: string;
  metrics: {
    baselineHourlyCost: number;
    surgingHourlyCost: number;
    velocityMultiplier: number;
    zScore: number;
  };
  remediationUrl: string;
  timestamp: string;
}

export class GovernanceAlertDispatcher {
  /**
   * Generates a standard Slack Block Kit formatted message payload
   */
  public static formatSlackPayload(anomaly: AnomalyDetectionRecord, incidentId: string) {
    const emoji = anomaly.severity === 'critical' ? '🚨' : anomaly.severity === 'high' ? '⚠️' : 'ℹ️';
    
    return {
      text: `${emoji} GALXAI Alert: ${anomaly.triggerReason || 'Spend Anomaly Detected'}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} AI Spend Anomaly Detected (${anomaly.severity.toUpperCase()})`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Department:*\n${anomaly.department}`,
            },
            {
              type: 'mrkdwn',
              text: `*Service / Route:*\n${anomaly.serviceId}`,
            },
            {
              type: 'mrkdwn',
              text: `*Surge Rate:*\n$${anomaly.currentSurgeHourlyRateUsd}/hr (${anomaly.velocityMultiplier}x baseline)`,
            },
            {
              type: 'mrkdwn',
              text: `*Baseline Rate:*\n$${anomaly.baselineHourlyRateUsd}/hr (Z: ${anomaly.zScore})`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Details:* ${anomaly.triggerReason || 'Unusual token expenditure velocity detected.'}`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Inspect Incident in /audit →',
                emoji: true,
              },
              url: `https://galx.ai/audit?incident=${incidentId}`,
              style: 'primary',
            },
          ],
        },
      ],
    };
  }

  /**
   * Generates a standard PagerDuty v2 Trigger Event payload
   */
  public static formatPagerDutyPayload(anomaly: AnomalyDetectionRecord, incidentId: string, routingKey: string) {
    return {
      routing_key: routingKey,
      event_action: 'trigger',
      dedup_key: `galx_spend_${anomaly.department}_${anomaly.serviceId}`,
      payload: {
        summary: `GALXAI Spend Anomaly (${anomaly.severity}): ${anomaly.serviceId} surging at ${anomaly.velocityMultiplier}x baseline`,
        severity: anomaly.severity === 'critical' ? 'critical' : anomaly.severity === 'high' ? 'error' : 'warning',
        source: `galx.gateway.${anomaly.department}`,
        component: anomaly.serviceId,
        custom_details: {
          incidentId,
          department: anomaly.department,
          serviceId: anomaly.serviceId,
          surgeRateUsdPerHour: anomaly.currentSurgeHourlyRateUsd,
          baselineRateUsdPerHour: anomaly.baselineHourlyRateUsd,
          velocityMultiplier: anomaly.velocityMultiplier,
          zScore: anomaly.zScore,
        },
      },
    };
  }
}
