/**
 * GALXAI: Quality Survivability & Sentinel Anomaly Engine
 * 
 * Provides real-time autoregressive token loop detection, JSON output syntax validation,
 * automatic model quarantine mitigation, and adaptive temperature damping.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';

export interface QualityAnalysisResult {
  isHealthy: boolean;
  hasTokenLoop: boolean;
  isJsonValid: boolean;
  isSyntaxValid: boolean;
  refusalDetected: boolean;
  anomalyScore: number;
}

export interface QualityRemediationPlan {
  shouldRetry: boolean;
  recommendedModel: string;
  temperatureOverride?: number;
  reason?: string;
}

export class GalxQualitySurvivabilityEngine {
  private static instance: GalxQualitySurvivabilityEngine;
  private localDegradedModels: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): GalxQualitySurvivabilityEngine {
    if (!GalxQualitySurvivabilityEngine.instance) {
      GalxQualitySurvivabilityEngine.instance = new GalxQualitySurvivabilityEngine();
    }
    return GalxQualitySurvivabilityEngine.instance;
  }

  /**
   * Fast heuristic to detect pathological autoregressive token loops (e.g. repeated lines or phrases)
   */
  public static detectTokenLoop(content: string): boolean {
    if (!content || content.length < 100) return false;

    // Check for 4+ consecutive identical lines
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 10);
    let consecutiveRepeats = 0;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === lines[i - 1]) {
        consecutiveRepeats++;
        if (consecutiveRepeats >= 3) return true;
      } else {
        consecutiveRepeats = 0;
      }
    }

    // Check for repeating n-grams at the end of the text
    const tail = content.slice(-300);
    const half = Math.floor(tail.length / 2);
    const firstHalf = tail.slice(0, half);
    const secondHalf = tail.slice(half);
    if (firstHalf.length > 40 && firstHalf === secondHalf) {
      return true;
    }

    return false;
  }

  /**
   * Analyzes an output string for semantic quality anomalies
   */
  public analyzeOutput(content: string, expectJson = false): QualityAnalysisResult {
    const hasTokenLoop = GalxQualitySurvivabilityEngine.detectTokenLoop(content);
    let isJsonValid = true;
    if (expectJson) {
      try {
        JSON.parse(content.trim());
      } catch {
        isJsonValid = false;
      }
    }

    const refusalDetected = /I cannot fulfill this request|As an AI language model, I cannot/i.test(content);
    const isSyntaxValid = !content.includes('<<SYNTAX_ERROR>>') && !content.includes('UNDEFINED_TOKEN');

    const isHealthy = !hasTokenLoop && isJsonValid && isSyntaxValid && !refusalDetected;
    const anomalyScore = (hasTokenLoop ? 0.6 : 0) + (!isJsonValid ? 0.4 : 0) + (!isSyntaxValid ? 0.3 : 0);

    return {
      isHealthy,
      hasTokenLoop,
      isJsonValid,
      isSyntaxValid,
      refusalDetected,
      anomalyScore: Math.min(1.0, anomalyScore)
    };
  }

  /**
   * Evaluates quality survivability and returns an automatic remediation plan
   */
  public async evaluateModelSurvivability(requestedModel: string): Promise<QualityRemediationPlan> {
    if (this.localDegradedModels.has(requestedModel)) {
      return {
        shouldRetry: true,
        recommendedModel: requestedModel,
        temperatureOverride: 0.15,
        reason: 'Local quality quarantine active for requested model; damping temperature'
      };
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin() as any;
        const { data, error } = await supabase.rpc('rpc_evaluate_model_quality_survivability', {
          p_requested_model_id: requestedModel
        });

        if (!error && data && data.is_quality_degraded) {
          return {
            shouldRetry: true,
            recommendedModel: requestedModel,
            temperatureOverride: data.temperature_damping_override,
            reason: `Model ${requestedModel} is experiencing quality degradation; applying temperature damping`
          };
        }
      } catch (err) {
        console.warn('[GalxQualitySurvivabilityEngine] Quality evaluation RPC fallback:', err);
      }
    }

    return {
      shouldRetry: false,
      recommendedModel: requestedModel
    };
  }

  /**
   * Records output quality telemetry
   */
  public async recordQualityTelemetry(
    modelId: string,
    shardId: string,
    analysis: QualityAnalysisResult
  ): Promise<void> {
    if (analysis.hasTokenLoop) {
      this.localDegradedModels.add(modelId);
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin() as any;
        await supabase.rpc('rpc_record_quality_telemetry', {
          p_model_id: modelId,
          p_shard_id: shardId || 'shard_cf_edge_direct',
          p_is_json_valid: analysis.isJsonValid,
          p_is_syntax_valid: analysis.isSyntaxValid,
          p_has_token_loop: analysis.hasTokenLoop
        });
      } catch (err) {
        console.warn('[GalxQualitySurvivabilityEngine] Record quality telemetry failed:', err);
      }
    }
  }
}

export const qualitySurvivabilityEngine = GalxQualitySurvivabilityEngine.getInstance();
