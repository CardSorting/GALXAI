/**
 * GALXAI Developer SDK: Privacy & De-Identification Resource (Zenith Plus Tier)
 * Ergonomic client-side & edge utilities for HIPAA Safe Harbor 18, Expert Determination Risk Scoring,
 * ZDR v10.0 Forward Secrecy Ratchet, Pre-Allocated Memory Slabs, GDPR PII, and Global Privacy Sovereignty.
 */

import {
  GalxPIIRedactor,
  type RedactionOptions,
  type ConversationRedactionResult
} from '../../core/privacy/GalxPIIRedactor';
import {
  GalxZDRProtocol,
  ScopedMemorySanitizer,
  ZDRRatchetSession,
  galxSlabPool,
  type ZDRSessionProof,
  type ZKATTicket,
  type EphemeralSessionEnclave
} from '../../core/privacy/GalxZDRProtocol';
import type {
  RedactionResult,
  ChatMessage,
  PrivacyProfileType,
  DataResidencyRegion,
  HIPAAReidentificationRiskResult,
  MemorySlab
} from '../../core/contracts/GalxContracts';

import { GalxPersistence } from '../../lib/storage/GalxPersistence';

export const PrivacyProfiles = {
  HIPAA_BAA_STRICT: {
    profile: 'hipaa_strict' as const,
    deidentifyPhi: true,
    zdr: true,
    dataResidency: 'us' as const
  },
  EU_GDPR_SOVEREIGN: {
    profile: 'gdpr_eu' as const,
    piiMasking: true,
    dataResidency: 'eu' as const,
    zdr: true,
    optOutSale: true
  },
  GLOBAL_ZDR_EPHEMERAL: {
    profile: 'zdr' as const,
    zdr: true,
    optOutSale: true
  },
  FINTECH_PCI_SHIELD: {
    profile: 'fintech_pci' as const,
    piiMasking: true,
    zdr: true
  },
  MAXIMUM_SOVEREIGNTY: {
    profile: 'maximum_shield' as const,
    deidentifyPhi: true,
    piiMasking: true,
    zdr: true,
    dataResidency: 'eu' as const,
    optOutSale: true
  }
} as const;

export class PrivacyResource {
  private readonly redactor: GalxPIIRedactor;
  private readonly zdr: GalxZDRProtocol;

  constructor() {
    this.redactor = GalxPIIRedactor.getInstance();
    this.zdr = GalxZDRProtocol.getInstance();
  }

  /**
   * De-identifies text according to specified privacy policies (HIPAA Safe Harbor 18, GDPR, PCI, LGPD, DPDP, LatAm, MEA).
   */
  public redact(text: string, options?: RedactionOptions): RedactionResult {
    return this.redactor.redactText(text, options);
  }

  /**
   * High-Throughput Fast-Path De-Identification (< 0.05ms on benign text).
   */
  public fastRedact(text: string, options?: RedactionOptions): RedactionResult {
    return this.redactor.fastRedact(text, options);
  }

  /**
   * Fast zero-allocation preflight character index scan.
   */
  public fastPreflightScan(text: string): { requiresDeepScan: boolean; detectedPointers: string[] } {
    return this.redactor.fastPreflightScan(text);
  }

  /**
   * Evaluates statistical re-identification risk pursuant to HIPAA Expert Determination (45 CFR § 164.514(b)(1)).
   */
  public calculateHIPAAReidentificationRisk(text: string): HIPAAReidentificationRiskResult {
    return this.redactor.calculateReidentificationRiskScore(text);
  }

  /**
   * De-identifies multi-turn conversation messages ensuring cross-turn entity consistency.
   */
  public redactMessages(messages: ChatMessage[], options?: RedactionOptions): ConversationRedactionResult {
    return this.redactor.redactConversationMessages(messages, options);
  }

  /**
   * Ephemerally rehydrates synthetic tokens back to original plaintext using a local token map.
   */
  public rehydrate(sanitizedText: string, tokenMap?: Record<string, string>): string {
    return this.redactor.rehydrateText(sanitizedText, tokenMap);
  }

  /**
   * Strips EXIF, GPS, and textual metadata from base64 image data URLs in-memory.
   */
  public stripImageMetadata(base64DataUrl: string): string {
    return GalxPIIRedactor.stripImageMetadata(base64DataUrl);
  }

  /**
   * Sanitizes ZIP codes pursuant to HIPAA Safe Harbor 18 (45 CFR § 164.514(b)(2)(i)(B)).
   * Zeroizes restricted 3-digit prefixes to 00000.
   */
  public sanitizeZipCode(zipStr: string): string {
    return GalxPIIRedactor.sanitizeZipCode(zipStr);
  }

  /**
   * Validates national / clinical / financial identifiers mathematically (Mod-10, Mod-11, Mod-97, Verhoeff).
   */
  public validateIdentifier(
    type: 'ssn' | 'npi' | 'dea' | 'vin' | 'iban' | 'credit_card' | 'cpf' | 'cnpj' | 'sin' | 'aadhaar' | 'korean_rrn' | 'argentina_cuit' | 'mexico_curp' | 'mexico_rfc' | 'saudi_id' | 'saudi_iqama' | 'uae_eid' | 'south_africa_id' | 'nz_ird',
    value: string
  ): boolean {
    switch (type) {
      case 'credit_card':
        return GalxPIIRedactor.validateLuhn(value, 13, 19);
      case 'npi':
        return GalxPIIRedactor.validateNPI(value);
      case 'dea':
        return GalxPIIRedactor.validateDEANumber(value);
      case 'vin':
        return GalxPIIRedactor.validateVIN(value);
      case 'iban':
        return GalxPIIRedactor.validateIBAN(value);
      case 'cpf':
        return GalxPIIRedactor.validateCPF(value);
      case 'cnpj':
        return GalxPIIRedactor.validateCNPJ(value);
      case 'sin':
        return GalxPIIRedactor.validateCanadaSIN(value);
      case 'aadhaar':
        return GalxPIIRedactor.validateAadhaar(value);
      case 'korean_rrn':
        return GalxPIIRedactor.validateKoreanRRN(value);
      case 'argentina_cuit':
        return GalxPIIRedactor.validateArgentinaCUIT(value);
      case 'mexico_curp':
        return GalxPIIRedactor.validateMexicoCURP(value);
      case 'mexico_rfc':
        return GalxPIIRedactor.validateMexicoRFC(value);
      case 'saudi_id':
        return GalxPIIRedactor.validateSaudiNationalID(value);
      case 'saudi_iqama':
        return GalxPIIRedactor.validateSaudiIqama(value);
      case 'uae_eid':
        return GalxPIIRedactor.validateUAEEmiratesID(value);
      case 'south_africa_id':
        return GalxPIIRedactor.validateSouthAfricanID(value);
      case 'nz_ird':
        return GalxPIIRedactor.validateNewZealandIRD(value);
      default:
        return false;
    }
  }

  /**
   * Executes a task in a memory-sanitized scope that guarantees 2-pass zeroization on completion (ZDR v9.0).
   */
  public async runInSanitizedScope<T>(fn: () => Promise<T>): Promise<T> {
    return ScopedMemorySanitizer.runInSanitizedScope(fn);
  }

  /**
   * Acquires a recycled memory slab (64KB) from the pre-allocated zero-allocation pool.
   */
  public acquireMemorySlab(): MemorySlab {
    return galxSlabPool.acquireSlab();
  }

  /**
   * Retrieves status of pre-allocated memory slab recycling pool.
   */
  public getSlabPoolStats() {
    return galxSlabPool.getPoolStats();
  }

  /**
   * Creates a forward-secrecy streaming key ratchet session (ZDR v10.0).
   */
  public createRatchetSession(initialSecret?: string): ZDRRatchetSession {
    return this.zdr.createRatchetSession(initialSecret);
  }

  /**
   * Scrutinizes upstream HTTP response headers to ensure zero retention compliance.
   */
  public verifyUpstreamHeaders(headers: Record<string, string | string[] | undefined>) {
    return this.zdr.verifyUpstreamZDRHeaders(headers);
  }

  /**
   * Cryptographically verifies a ZDR session proof signature and SHA-256 rolling digest.
   */
  public verifyZDRProof(proof: ZDRSessionProof): boolean {
    return this.zdr.verifyZDRProof(proof);
  }

  /**
   * Generates an Ephemeral Session Enclave (Session KEK) with guaranteed memory zeroization.
   */
  public createSessionEnclave(): EphemeralSessionEnclave {
    return this.zdr.createEphemeralSessionEnclave();
  }

  /**
   * Generates a Zero-Knowledge Attestation Ticket (ZKAT) for SOC2 / HIPAA evidence dossiers.
   */
  public generateZKATTicket(params: {
    sessionId: string;
    promptSha256: string;
    completionSha256: string;
    bytesProcessed: number;
    shardId: string;
    profile: PrivacyProfileType;
    dataResidency?: DataResidencyRegion;
  }): ZKATTicket {
    return this.zdr.generateZKATTicket(params);
  }

  /**
   * Queries vaulted execution shards using natural language expressions.
   */
  public queryShardsNatural(naturalQuery: string) {
    return GalxPersistence.getInstance().queryShardsNatural(naturalQuery);
  }

  /**
   * Pre-configured enterprise privacy policy profiles.
   */
  public get profiles() {
    return PrivacyProfiles;
  }
}
