/**
 * GALXAI Developer SDK: Compliance & Governance Resource (Zenith Plus Tier)
 * Enterprise endpoints for real-time compliance posture, SOC 2 Type II assurance,
 * high-throughput Merkle audit streaming, automated drift detection, NIST OSCAL 1.0.0 export,
 * EU AI Act Annex IV technical dossiers, dynamic penetration testing, and GDPR Article 30 RoPA.
 */

import { GalxPrivacyComplianceEngine } from '../../core/privacy/GalxPrivacyComplianceEngine';
import { GalxSOC2AuditEngine } from '../../core/compliance/GalxSOC2AuditEngine';
import { GalxSOC2DriftDetector } from '../../core/compliance/GalxSOC2DriftDetector';
import { GalxDynamicSecurityProbe } from '../../core/compliance/GalxDynamicSecurityProbe';
import { GalxHighThroughputAuditStreamer, galxAuditStreamer } from '../../core/compliance/GalxHighThroughputAuditStreamer';
import { GalxPersistence } from '../../lib/storage/GalxPersistence';
import type {
  DSARDataExport,
  DSARPurgeResult,
  AuditIntegrityVerificationResult,
  SOC2PostureReport,
  SOC2EvidenceDossier,
  SOC2ControlMapping,
  SOC2DriftReport,
  RoPAReport,
  DataPortabilityPackage,
  OSCALAssessmentReport,
  EUAIActAnnexIVDossier,
  SecurityProbeResult,
  MerkleAuditBatch,
  HighThroughputAuditBatchMetrics
} from '../../core/contracts/GalxContracts';

export class ComplianceResource {
  private readonly privacyEngine: GalxPrivacyComplianceEngine;
  private readonly soc2Engine: GalxSOC2AuditEngine;
  private readonly driftDetector: GalxSOC2DriftDetector;
  private readonly securityProbe: GalxDynamicSecurityProbe;
  private readonly auditStreamer: GalxHighThroughputAuditStreamer;
  private readonly persistence: GalxPersistence;

  constructor() {
    this.privacyEngine = GalxPrivacyComplianceEngine.getInstance();
    this.soc2Engine = GalxSOC2AuditEngine.getInstance();
    this.driftDetector = GalxSOC2DriftDetector.getInstance();
    this.securityProbe = GalxDynamicSecurityProbe.getInstance();
    this.auditStreamer = GalxHighThroughputAuditStreamer.getInstance();
    this.persistence = GalxPersistence.getInstance();
  }

  /**
   * Enqueues an audit event into the high-velocity non-blocking Merkle audit stream.
   */
  public enqueueAudit(event: { action: string; userId?: string; resourceId?: string; resourceType?: string; metadata?: Record<string, any> }): void {
    this.auditStreamer.enqueue(event);
  }

  /**
   * Flushes and commits the queued audit events into a cryptographic Merkle Tree batch.
   */
  public flushBatchedAudits(): MerkleAuditBatch | null {
    return this.auditStreamer.flushNow();
  }

  /**
   * Queries audit records using natural language queries (BroccoliDB Natural Query Parser).
   */
  public async queryAuditsNatural(naturalQuery: string): Promise<any[]> {
    const { BroccoliNaturalQueryParser } = await import('../../core/broccolidb/broccolidb-natural-query');
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'audit_logs');
    const allLogs = await this.persistence.auditRepo.getAuditLogs({ limit: parsed.queryOptions.limit || 100 });
    const { BroccoliDbTable } = await import('../../core/broccolidb/broccolidb-table');
    const table = new BroccoliDbTable('temp_audit_view');
    for (const log of allLogs) {
      table.put(log.id, log as any);
    }
    return table.query(parsed.queryOptions) as any[];
  }

  /**
   * Retrieves high-velocity Merkle audit streaming metrics (throughput, latency, ledger root).
   */
  public getHighThroughputAuditMetrics(): HighThroughputAuditBatchMetrics {
    return this.auditStreamer.getMetrics();
  }

  /**
   * Retrieves real-time privacy compliance posture, BAA certification status, and GDPR DPA state.
   */
  public async getPosture(): Promise<any> {
    return this.privacyEngine.getPrivacyCompliancePosture();
  }

  /**
   * Retrieves real-time SOC 2 Type II Posture Report across all 5 Trust Services Criteria pillars.
   */
  public async getSOC2Posture(): Promise<SOC2PostureReport> {
    return this.soc2Engine.getSOC2PostureReport();
  }

  /**
   * Generates a cryptographically signed SOC 2 Type II Evidence Dossier.
   */
  public async getSOC2Evidence(tenantId?: string): Promise<SOC2EvidenceDossier> {
    return this.soc2Engine.generateSOC2EvidenceDossier(tenantId || 'galx-enterprise-primary');
  }

  /**
   * Retrieves the comprehensive machine-readable matrix of all 28 SOC 2 Technical Control Mappings.
   */
  public getSOC2Controls(): SOC2ControlMapping[] {
    return this.soc2Engine.getSOC2ControlMatrix();
  }

  /**
   * Evaluates active SOC 2 control configuration drift against compliance baseline (GRC / Vanta / Drata).
   */
  public checkControlDrift(): SOC2DriftReport {
    return this.driftDetector.evaluateControlDrift();
  }

  /**
   * Executes self-healing automated remediation on a drifted SOC 2 control.
   */
  public autoRemediateControl(controlId: string): { success: boolean; message: string; remediatedControlId: string } {
    return this.driftDetector.autoRemediateControl(controlId);
  }

  /**
   * Generates a standardized NIST OSCAL 1.0.0 (Open Security Controls Assessment Language) Report for SOC 2 Type II.
   */
  public exportOSCAL(): OSCALAssessmentReport {
    return this.soc2Engine.generateOSCALAssessmentReport();
  }

  /**
   * Generates EU AI Act Article 53 & Annex IV Technical Compliance Documentation Dossier.
   */
  public generateEUAIActAnnexIV(modelId?: string): EUAIActAnnexIVDossier {
    return this.soc2Engine.generateEUAIActAnnexIVDossier(modelId);
  }

  /**
   * Executes in-memory self-probing penetration tests and verifies 100% mitigation rate.
   */
  public runSecurityProbes(): SecurityProbeResult {
    return this.securityProbe.runSecurityProbes();
  }

  /**
   * Generates official GDPR Article 30 Records of Processing Activities (RoPA) Register.
   */
  public generateRoPAReport(): RoPAReport {
    return this.privacyEngine.generateRoPAReport();
  }

  /**
   * Generates a GDPR Article 20 Right to Data Portability package in JSON-LD format.
   */
  public async requestDataPortability(userId: string): Promise<DataPortabilityPackage> {
    return this.privacyEngine.generateDataPortabilityPackage(userId);
  }

  /**
   * Cryptographically verifies the unbroken SHA-256 chain of custody for all system audit logs.
   */
  public verifyAuditChain(): AuditIntegrityVerificationResult {
    return this.persistence.auditRepo.verifyAuditChainIntegrity();
  }

  /**
   * Executes a GDPR Article 15 Data Subject Access Request (DSAR) export.
   */
  public async requestDSAR(userId: string): Promise<DSARDataExport> {
    return this.privacyEngine.exportUserData(userId);
  }

  /**
   * Executes a GDPR Article 17 Right to Erasure / Purge with cryptographic proof.
   */
  public async requestErasure(userId: string, reason?: string): Promise<DSARPurgeResult> {
    return this.privacyEngine.eraseUserData(userId, reason || 'SDK Right to Erasure Request');
  }

  /**
   * Generates a complete cryptographic SOC2 Type II & HIPAA Security Evidence Dossier.
   */
  public async generateSOC2EvidencePackage(tenantId: string): Promise<any> {
    return this.privacyEngine.generateSOC2EvidencePackage(tenantId);
  }
}
