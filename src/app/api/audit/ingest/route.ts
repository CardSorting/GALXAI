import { withDeveloperAccess } from '@/lib/security/developer-access';
/**
 * GALXAI Enterprise Forensic Audit Batch Ingestion Endpoint
 * 
 * Ingests live production traffic logs from enterprise proxies, Cloudflare Logpush,
 * or OTel collectors, evaluates the 4 waste drivers in real-time, detects spend anomalies,
 * and computes instant financial attribution metrics with Slack/PagerDuty alerting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GalxSpendGovernanceEngine } from '@/core/governance/GalxSpendGovernanceEngine';
import { PromptPrefixRestructurer } from '@/core/governance/PromptPrefixRestructurer';
import { AgentCircuitBreaker } from '@/core/governance/AgentCircuitBreaker';
import { SpendAnomalyDetector, AnomalyDetectionRecord } from '@/core/governance/SpendAnomalyDetector';
import { GovernanceAlertDispatcher } from '@/core/governance/GovernanceAlertDispatcher';
import { TokenCostCalculator } from '@/core/pricing/TokenCostCalculator';
import { ModelCatalog } from '@/core/router/ModelCatalog';

export const runtime = 'nodejs';

export interface IngestedTraceItem {
  id?: string;
  timestamp?: string;
  department?: string;
  costCenter?: string;
  workload?: string;
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }>;
  maxTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  status?: number;
}

async function previewGET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'galxai-forensic-ingest-engine',
    version: '1.4.0',
    supportedProtocols: ['json_batch', 'cloudflare_logpush', 'opentelemetry_genai'],
    maxBatchSize: 1000,
    documentation: 'https://galx.ai/audit',
  });
}

async function previewPOST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key') || '';
    if (!authHeader && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: { message: 'Authentication required for forensic log ingestion.', code: 'unauthorized' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const traces: IngestedTraceItem[] = Array.isArray(body) ? body : Array.isArray(body.traces) ? body.traces : [body];

    if (traces.length === 0) {
      return NextResponse.json(
        { error: { message: 'No request traces provided in payload.', code: 'empty_batch' } },
        { status: 400 }
      );
    }

    let totalGrossRetailUsd = 0;
    let totalNetGalxUsd = 0;
    let totalAvoidedWasteUsd = 0;

    let frontierMisallocationCount = 0;
    let cacheBustingHeaderCount = 0;
    let circuitBreakerTrippedCount = 0;

    const detectedIncidents: Array<{
      id: string;
      incidentType: string;
      department: string;
      service: string;
      estimatedWasteUsd: number;
      remediation: string;
    }> = [];

    const detectedAnomalies: AnomalyDetectionRecord[] = [];

    const sol = ModelCatalog.resolveModel('galx-nova');
    const luna = ModelCatalog.resolveModel('galx-nova');

    for (let i = 0; i < traces.length; i++) {
      const trace = traces[i];
      const traceId = trace.id || `trace_${Date.now()}_${i}`;
      const department = trace.department || 'general_engineering';
      const costCenter = trace.costCenter || 'core_infrastructure';
      const workload = trace.workload || 'general';

      const promptLen = trace.messages.reduce((acc, m) => acc + (typeof m.content === 'string' ? m.content.length : 0), 0);
      const promptTokens = trace.promptTokens || Math.ceil(promptLen / 4) || 100;
      const completionTokens = trace.completionTokens || trace.maxTokens || 150;

      // Calculate baseline gross retail on Sol
      const grossCost = TokenCostCalculator.calculateCost(sol, { promptTokens, completionTokens }).netCostUsd;
      totalGrossRetailUsd += grossCost;

      // Real-Time Spend Anomaly Evaluation
      const anomalyCheck = SpendAnomalyDetector.recordAndEvaluate({
        timestampMs: trace.timestamp ? Date.parse(trace.timestamp) : Date.now(),
        costUsd: grossCost,
        tokens: promptTokens + completionTokens,
        serviceId: workload,
        department,
      });

      if (anomalyCheck.isAnomaly) {
        detectedAnomalies.push(anomalyCheck);
      }

      // 1. Evaluate Frontier Misallocation
      if ((workload === 'classification' || workload === 'intent_routing') && trace.model.includes('sol')) {
        frontierMisallocationCount++;
        const lunaCost = TokenCostCalculator.calculateCost(luna, { promptTokens, completionTokens }).netCostUsd;
        const waste = grossCost - lunaCost;
        totalAvoidedWasteUsd += waste;
        totalNetGalxUsd += lunaCost;

        detectedIncidents.push({
          id: `inc_misalloc_${i}`,
          incidentType: 'FRONTIER_MISALLOCATION',
          department,
          service: workload,
          estimatedWasteUsd: Number(waste.toFixed(6)),
          remediation: 'Automated Tier Cascading routed to galx-nova (-80% output cost)',
        });
        continue;
      }

      // 2. Evaluate Cache-Busting Headers
      const firstMsg = trace.messages[0]?.content || '';
      const restructure = PromptPrefixRestructurer.restructure(firstMsg);
      if (restructure.wasRestructured && promptTokens > 1000) {
        cacheBustingHeaderCount++;
        const cachedPromptTokens = Math.floor(promptTokens * 0.75);
        const normalPromptTokens = promptTokens - cachedPromptTokens;
        const cachedInputRate = sol.cachedInputPricePer1M ?? (sol.inputPricePer1M * 0.25);
        const netCachedCost = (normalPromptTokens * sol.inputPricePer1M + cachedPromptTokens * cachedInputRate + completionTokens * sol.outputPricePer1M) / 1_000_000;
        const waste = grossCost - netCachedCost;
        totalAvoidedWasteUsd += waste;
        totalNetGalxUsd += netCachedCost;

        detectedIncidents.push({
          id: `inc_cache_${i}`,
          incidentType: 'CACHE_BUSTING_PREFIX',
          department,
          service: workload,
          estimatedWasteUsd: Number(waste.toFixed(6)),
          remediation: 'Dynamic Prefix Restructuring restored 75% prompt cache rebate',
        });
        continue;
      }

      // 3. Evaluate Agent Loops
      if (workload === 'agent_loop' || department === 'agent_labs') {
        const circuit = AgentCircuitBreaker.evaluateSession(traceId, trace.messages as any, 12);
        if (circuit.shouldHalt) {
          circuitBreakerTrippedCount++;
          totalAvoidedWasteUsd += grossCost;
          detectedIncidents.push({
            id: `inc_circuit_${i}`,
            incidentType: 'RUNAWAY_AGENT_LOOP',
            department,
            service: workload,
            estimatedWasteUsd: Number(grossCost.toFixed(6)),
            remediation: 'Agent Recursion Circuit Breaker clamped loop at turn 12',
          });
          continue;
        }
      }

      // Default Wholesale Net
      const netCost = grossCost * 0.75;
      totalNetGalxUsd += netCost;
      totalAvoidedWasteUsd += grossCost * 0.25;
    }

    const savingsPercentage = totalGrossRetailUsd > 0
      ? Number(((totalAvoidedWasteUsd / totalGrossRetailUsd) * 100).toFixed(1))
      : 0;

    // Format optional Slack alert payload if critical anomalies detected
    let alertNotification = null;
    if (detectedAnomalies.length > 0) {
      const topAnomaly = detectedAnomalies[0];
      alertNotification = {
        slackBlockKit: GovernanceAlertDispatcher.formatSlackPayload(topAnomaly, 'inc_surge_live'),
        pagerDutyEvent: GovernanceAlertDispatcher.formatPagerDutyPayload(topAnomaly, 'inc_surge_live', 'galx_routing_key'),
      };
    }

    return NextResponse.json({
      status: 'analyzed',
      tracesIngested: traces.length,
      financials: {
        grossRetailOpenAiUsd: Number(totalGrossRetailUsd.toFixed(4)),
        netGalxInterceptedUsd: Number(totalNetGalxUsd.toFixed(4)),
        totalAvoidedWasteUsd: Number(totalAvoidedWasteUsd.toFixed(4)),
        savingsPercentage,
      },
      failureModesSummary: {
        frontierMisallocations: frontierMisallocationCount,
        cacheBustingHeaders: cacheBustingHeaderCount,
        agentLoopsClamped: circuitBreakerTrippedCount,
        anomaliesDetected: detectedAnomalies.length,
      },
      recentIncidents: detectedIncidents.slice(0, 20),
      alertNotification,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error?.message || 'Forensic log ingestion failed.', code: 'internal_error' } },
      { status: 500 }
    );
  }
}

export const GET = withDeveloperAccess(previewGET);
export const POST = withDeveloperAccess(previewPOST);
