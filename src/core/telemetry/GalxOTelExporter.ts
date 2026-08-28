/**
 * GALXAI OpenTelemetry (OTel) GenAI Semantic Conventions Exporter
 * 
 * Maps GALXAI governance decisions, token costs, and prompt cache hit telemetry
 * to standard OpenTelemetry GenAI 1.28.0+ spans for seamless ingestion by
 * Datadog, Grafana Tempo, Dynatrace, New Relic, and Honeycomb.
 */

import type { GovernanceDecision } from '../governance/GalxSpendGovernanceEngine';

export interface OTelGenAISpan {
  traceId: string;
  spanId: string;
  name: string;
  timestamp: number;
  durationMs: number;
  attributes: Record<string, string | number | boolean>;
}

export class GalxOTelExporter {
  /**
   * Generates a standard OpenTelemetry GenAI semantic span from a request lifecycle
   */
  public static createSpan(params: {
    traceId?: string;
    spanId?: string;
    workspaceId: string;
    department?: string;
    costCenter?: string;
    workload?: string;
    decision: GovernanceDecision;
    promptTokens: number;
    completionTokens: number;
    cachedTokens?: number;
    durationMs: number;
    grossRetailCostUsd: number;
    netGalxCostUsd: number;
    avoidedWasteUsd: number;
  }): OTelGenAISpan {
    const traceId = params.traceId || this.generateHex(32);
    const spanId = params.spanId || this.generateHex(16);

    const attributes: Record<string, string | number | boolean> = {
      // 1. Standard OTel GenAI Semantic Conventions
      'gen_ai.system': 'galxai',
      'gen_ai.request.model': params.decision.requestedModel,
      'gen_ai.response.model': params.decision.effectiveModel,
      'gen_ai.usage.prompt_tokens': params.promptTokens,
      'gen_ai.usage.completion_tokens': params.completionTokens,
      'gen_ai.usage.cached_tokens': params.cachedTokens || 0,
      
      // 2. Enterprise Attribution & Multi-Tenancy
      'galx.workspace_id': params.workspaceId,
      'galx.department': params.department || 'unattributed',
      'galx.cost_center': params.costCenter || 'general',
      'galx.workload': params.workload || 'general',
      
      // 3. FinOps & Spend Governance Conventions
      'galx.governance.mode': params.decision.mode,
      'galx.governance.action': params.decision.action,
      'galx.governance.reason_codes': params.decision.reasonCodes.join(','),
      'galx.cost.gross_retail_usd': params.grossRetailCostUsd,
      'galx.cost.net_galx_usd': params.netGalxCostUsd,
      'galx.cost.avoided_waste_usd': params.avoidedWasteUsd,
      
      // 4. Optimization Telemetry
      'galx.optimization.tier_cascaded': params.decision.action === 'route',
      'galx.optimization.prefix_restructured': Boolean(params.decision.prefixRestructuring?.wasRestructured),
    };

    if (params.decision.routeEvidenceId) {
      attributes['galx.governance.route_evidence_id'] = params.decision.routeEvidenceId;
    }

    return {
      traceId,
      spanId,
      name: `chat ${params.decision.effectiveModel}`,
      timestamp: Date.now(),
      durationMs: params.durationMs,
      attributes,
    };
  }

  private static generateHex(length: number): string {
    const chars = '0123456789abcdef';
    let res = '';
    for (let i = 0; i < length; i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    return res;
  }
}
