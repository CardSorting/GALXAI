/**
 * GALXAI BroccoliDB 150-Domain Spend-Saving Enterprise Master Optimizer
 * 
 * Automatically detects domain signatures across 150 enterprise domains spanning:
 * Legal, Clinical Medicine, Life Sciences, FinOps & Capital Markets, Lending & Real Estate,
 * Environmental, Public Safety, Insurance, Cyber & Tech, Aerospace, Automation & Robotics,
 * Supply Chain & Logistics, Energy & Mining, Media & Entertainment, and HR/Gov Contracting/Education.
 */

import { BroccoliDbTable } from './broccolidb-table';
import { BroccoliCompactionSafety, CompactionFidelityStatus } from './BroccoliCompactionSafety';

// Cluster 1: Legal, Courtroom, E-Discovery, IP & Restructuring
import { BroccoliInterrogatoryCompactor } from './BroccoliInterrogatoryCompactor';
import { BroccoliCourtTranscriptCompactor } from './BroccoliCourtTranscriptCompactor';
import { BroccoliPrivilegeLogCompactor } from './BroccoliPrivilegeLogCompactor';
import { BroccoliArbitrationAwardCompactor } from './BroccoliArbitrationAwardCompactor';
import { BroccoliBankruptcyReorgCompactor } from './BroccoliBankruptcyReorgCompactor';
import { BroccoliMnaDisclosureCompactor } from './BroccoliMnaDisclosureCompactor';
import { BroccoliImmigrationPetitionCompactor } from './BroccoliImmigrationPetitionCompactor';
import { BroccoliRoyaltyStatementCompactor } from './BroccoliRoyaltyStatementCompactor';
import { BroccoliMsaCompactor } from './BroccoliMsaCompactor';
import { BroccoliUsptoOfficeActionCompactor } from './BroccoliUsptoOfficeActionCompactor';

// Cluster 2: Healthcare, Surgery, Anesthesia, Cardiology & Oncology
import { BroccoliPathologyCompactor } from './BroccoliPathologyCompactor';
import { BroccoliOperativeReportCompactor } from './BroccoliOperativeReportCompactor';
import { BroccoliAnesthesiologyAimsCompactor } from './BroccoliAnesthesiologyAimsCompactor';
import { BroccoliCardiologyEcgCompactor } from './BroccoliCardiologyEcgCompactor';
import { BroccoliRadiationOncologyCompactor } from './BroccoliRadiationOncologyCompactor';
import { BroccoliFhirCompactor } from './BroccoliFhirCompactor';
import { BroccoliRemotePatientMonitoringCompactor } from './BroccoliRemotePatientMonitoringCompactor';
import { BroccoliInsulinPumpCompactor } from './BroccoliInsulinPumpCompactor';
import { BroccoliInfectionControlNhsnCompactor } from './BroccoliInfectionControlNhsnCompactor';
import { BroccoliSleepMedicinePsgCompactor } from './BroccoliSleepMedicinePsgCompactor';

// Cluster 3: Specialized Clinical, GI, Dialysis, Neurology & Rheumatology
import { BroccoliGastroColonoscopyCompactor } from './BroccoliGastroColonoscopyCompactor';
import { BroccoliDialysisFlowsheetCompactor } from './BroccoliDialysisFlowsheetCompactor';
import { BroccoliNeurologyEegCompactor } from './BroccoliNeurologyEegCompactor';
import { BroccoliRheumatologyDas28Compactor } from './BroccoliRheumatologyDas28Compactor';
import { BroccoliPodiatryDfuCompactor } from './BroccoliPodiatryDfuCompactor';
import { BroccoliAudiologyExamCompactor } from './BroccoliAudiologyExamCompactor';
import { BroccoliOphthalmologyOctCompactor } from './BroccoliOphthalmologyOctCompactor';
import { BroccoliDermatologyCompactor } from './BroccoliDermatologyCompactor';
import { BroccoliBehavioralHealthCompactor } from './BroccoliBehavioralHealthCompactor';
import { BroccoliPhysicalTherapyCompactor } from './BroccoliPhysicalTherapyCompactor';

// Cluster 4: Life Sciences, Biotech, Pharma, Toxicology & Food
import { BroccoliFdaRegulatoryCompactor } from './BroccoliFdaRegulatoryCompactor';
import { BroccoliCdiscEdcCompactor } from './BroccoliCdiscEdcCompactor';
import { BroccoliSamdMedicalDeviceCompactor } from './BroccoliSamdMedicalDeviceCompactor';
import { BroccoliCertificateOfAnalysisCompactor } from './BroccoliCertificateOfAnalysisCompactor';
import { BroccoliNcpdpPrescriptionCompactor } from './BroccoliNcpdpPrescriptionCompactor';
import { BroccoliHospitalLisCompactor } from './BroccoliHospitalLisCompactor';
import { BroccoliGenomicsVcfCompactor } from './BroccoliGenomicsVcfCompactor';
import { BroccoliForensicToxicologyCompactor } from './BroccoliForensicToxicologyCompactor';
import { BroccoliVeterinaryCompactor } from './BroccoliVeterinaryCompactor';
import { BroccoliFoodSafetyHaccpCompactor } from './BroccoliFoodSafetyHaccpCompactor';

// Cluster 5: Capital Markets, FinOps, Payroll, Securities & Banking
import { BroccoliAmlKycCompactor } from './BroccoliAmlKycCompactor';
import { BroccoliFinOpsCloudCostCompactor } from './BroccoliFinOpsCloudCostCompactor';
import { BroccoliPayrollTaxCompactor } from './BroccoliPayrollTaxCompactor';
import { BroccoliArFactoringCompactor } from './BroccoliArFactoringCompactor';
import { BroccoliVcInvestmentMemoCompactor } from './BroccoliVcInvestmentMemoCompactor';
import { BroccoliProxyDef14aCompactor } from './BroccoliProxyDef14aCompactor';
import { BroccoliAbsLoanTapeCompactor } from './BroccoliAbsLoanTapeCompactor';
import { BroccoliForensicAccountingCompactor } from './BroccoliForensicAccountingCompactor';
import { BroccoliBaselStressTestCompactor } from './BroccoliBaselStressTestCompactor';
import { BroccoliSmartContractAuditCompactor } from './BroccoliSmartContractAuditCompactor';

// Cluster 6: Lending, Mortgage, Equipment Leasing & Real Estate
import { BroccoliGeneralLedgerCompactor } from './BroccoliGeneralLedgerCompactor';
import { BroccoliTaxReturnCompactor } from './BroccoliTaxReturnCompactor';
import { BroccoliIso20022Compactor } from './BroccoliIso20022Compactor';
import { BroccoliWealthPortfolioCompactor } from './BroccoliWealthPortfolioCompactor';
import { BroccoliCommercialLoanCompactor } from './BroccoliCommercialLoanCompactor';
import { BroccoliUnderwritingCompactor } from './BroccoliUnderwritingCompactor';
import { BroccoliClosingDisclosureCompactor } from './BroccoliClosingDisclosureCompactor';
import { BroccoliEquipmentLeaseCompactor } from './BroccoliEquipmentLeaseCompactor';
import { BroccoliSuretyBondCompactor } from './BroccoliSuretyBondCompactor';
import { BroccoliCommercialLeaseCompactor } from './BroccoliCommercialLeaseCompactor';

// Cluster 7: Real Estate Title, Environmental, Water Rights & Municipal
import { BroccoliCreRentRollCompactor } from './BroccoliCreRentRollCompactor';
import { BroccoliCreSyndicationCompactor } from './BroccoliCreSyndicationCompactor';
import { BroccoliPhase1EnvironmentalCompactor } from './BroccoliPhase1EnvironmentalCompactor';
import { BroccoliAltaSettlementCompactor } from './BroccoliAltaSettlementCompactor';
import { BroccoliPropertyTaxAssessmentCompactor } from './BroccoliPropertyTaxAssessmentCompactor';
import { BroccoliWaterRightsDecreeCompactor } from './BroccoliWaterRightsDecreeCompactor';
import { BroccoliMunicipal311Compactor } from './BroccoliMunicipal311Compactor';
import { BroccoliVectorControlArboviralCompactor } from './BroccoliVectorControlArboviralCompactor';
import { BroccoliNfirsFireIncidentCompactor } from './BroccoliNfirsFireIncidentCompactor';
import { BroccoliNemsisEmsCompactor } from './BroccoliNemsisEmsCompactor';

// Cluster 8: Insurance, Life Underwriting, Marine Hull & Actuarial
import { BroccoliLifeInsuranceApsCompactor } from './BroccoliLifeInsuranceApsCompactor';
import { BroccoliLossRunCompactor } from './BroccoliLossRunCompactor';
import { BroccoliMarineHullPiCompactor } from './BroccoliMarineHullPiCompactor';
import { BroccoliAdjusterEstimateCompactor } from './BroccoliAdjusterEstimateCompactor';
import { BroccoliSubrogationDemandCompactor } from './BroccoliSubrogationDemandCompactor';
import { BroccoliUbiTelematicsCompactor } from './BroccoliUbiTelematicsCompactor';
import { BroccoliActuarialCatModelCompactor } from './BroccoliActuarialCatModelCompactor';
import { BroccoliDentalChartCompactor } from './BroccoliDentalChartCompactor';
import { BroccoliAllergyImmunologyCompactor } from './BroccoliAllergyImmunologyCompactor';
import { BroccoliVendorAssessmentCompactor } from './BroccoliVendorAssessmentCompactor';

// Cluster 9: Coding, Cyber, Identity SAML/SCIM, Telecom & Tech
import { BroccoliCicdLogCompactor } from './BroccoliCicdLogCompactor';
import { BroccoliSiemThreatCompactor } from './BroccoliSiemThreatCompactor';
import { BroccoliSamlScimCompactor } from './BroccoliSamlScimCompactor';
import { BroccoliItsmChangeManagementCompactor } from './BroccoliItsmChangeManagementCompactor';
import { BroccoliDigitalForensicsCompactor } from './BroccoliDigitalForensicsCompactor';
import { BroccoliTradeSanctionsCompactor } from './BroccoliTradeSanctionsCompactor';
import { BroccoliSemiconductorFabCompactor } from './BroccoliSemiconductorFabCompactor';
import { BroccoliAteSemiconductorCompactor } from './BroccoliAteSemiconductorCompactor';
import { BroccoliNetworkTelemetryCompactor } from './BroccoliNetworkTelemetryCompactor';
import { BroccoliTelecomCdrCompactor } from './BroccoliTelecomCdrCompactor';

// Cluster 10: Aerospace, UAV Part 107, Satellite, IFC & De-Icing
import { BroccoliAviationIfcCompactor } from './BroccoliAviationIfcCompactor';
import { BroccoliUavPart107Compactor } from './BroccoliUavPart107Compactor';
import { BroccoliAircraftDeicingCompactor } from './BroccoliAircraftDeicingCompactor';
import { BroccoliAirTrafficControlCompactor } from './BroccoliAirTrafficControlCompactor';
import { BroccoliAviationMaintenanceCompactor } from './BroccoliAviationMaintenanceCompactor';
import { BroccoliPilotFlightLogCompactor } from './BroccoliPilotFlightLogCompactor';
import { BroccoliFlightTelemetryCompactor } from './BroccoliFlightTelemetryCompactor';
import { BroccoliSatelliteTelemetryCompactor } from './BroccoliSatelliteTelemetryCompactor';
import { BroccoliRocketTelemetryCompactor } from './BroccoliRocketTelemetryCompactor';
import { BroccoliDocsisFiberCompactor } from './BroccoliDocsisFiberCompactor';

// Cluster 11: Automation, Crash Safety, Traffic & Physical Infrastructure
import { BroccoliAutonomousVehicleLogCompactor } from './BroccoliAutonomousVehicleLogCompactor';
import { BroccoliNhtsaCrashTestCompactor } from './BroccoliNhtsaCrashTestCompactor';
import { BroccoliMunicipalTrafficSignalCompactor } from './BroccoliMunicipalTrafficSignalCompactor';
import { BroccoliIndustrialPlcCompactor } from './BroccoliIndustrialPlcCompactor';
import { BroccoliBuildingAutomationCompactor } from './BroccoliBuildingAutomationCompactor';
import { BroccoliStructuralHealthCompactor } from './BroccoliStructuralHealthCompactor';
import { BroccoliPhysicalAccessControlCompactor } from './BroccoliPhysicalAccessControlCompactor';
import { BroccoliMilStdDefenseCompactor } from './BroccoliMilStdDefenseCompactor';
import { BroccoliAecSubmittalCompactor } from './BroccoliAecSubmittalCompactor';
import { BroccoliBuildingPermitCompactor } from './BroccoliBuildingPermitCompactor';

// Cluster 12: Supply Chain, Logistics, Cold Chain, Rail & Maritime
import { BroccoliEdi856AsnCompactor } from './BroccoliEdi856AsnCompactor';
import { BroccoliColdChainIotCompactor } from './BroccoliColdChainIotCompactor';
import { BroccoliCustomsEntry7501Compactor } from './BroccoliCustomsEntry7501Compactor';
import { BroccoliHazmatShippingCompactor } from './BroccoliHazmatShippingCompactor';
import { BroccoliEdi404RailWaybillCompactor } from './BroccoliEdi404RailWaybillCompactor';
import { BroccoliMaritimeContainerTdrCompactor } from './BroccoliMaritimeContainerTdrCompactor';
import { BroccoliPharmaceuticalTrackTraceCompactor } from './BroccoliPharmaceuticalTrackTraceCompactor';
import { BroccoliGrainElevatorWarehouseCompactor } from './BroccoliGrainElevatorWarehouseCompactor';
import { BroccoliLivestockTraceabilityCompactor } from './BroccoliLivestockTraceabilityCompactor';
import { BroccoliForestFscTimberCompactor } from './BroccoliForestFscTimberCompactor';

// Cluster 13: Energy, Mining, Offshore Drilling, Carbon & ESG
import { BroccoliElectricGridScadaCompactor } from './BroccoliElectricGridScadaCompactor';
import { BroccoliNuclearPlantSafetyCompactor } from './BroccoliNuclearPlantSafetyCompactor';
import { BroccoliNercCipGridCompactor } from './BroccoliNercCipGridCompactor';
import { BroccoliWindTurbineScadaCompactor } from './BroccoliWindTurbineScadaCompactor';
import { BroccoliSolarInverterTelemetryCompactor } from './BroccoliSolarInverterTelemetryCompactor';
import { BroccoliOffshoreDrillingWitsmlCompactor } from './BroccoliOffshoreDrillingWitsmlCompactor';
import { BroccoliMiningFleetCompactor } from './BroccoliMiningFleetCompactor';
import { BroccoliEsgCarbonAccountingCompactor } from './BroccoliEsgCarbonAccountingCompactor';
import { BroccoliEpaEmissionsRataCompactor } from './BroccoliEpaEmissionsRataCompactor';
import { BroccoliCarbonCreditVerraCompactor } from './BroccoliCarbonCreditVerraCompactor';

// Cluster 14: Media, AdTech, Entertainment, Broadcast & Gaming
import { BroccoliOpenRtbAdTechCompactor } from './BroccoliOpenRtbAdTechCompactor';
import { BroccoliBroadcastScte35Compactor } from './BroccoliBroadcastScte35Compactor';
import { BroccoliVideoEncodingVmafCompactor } from './BroccoliVideoEncodingVmafCompactor';
import { BroccoliGamingAntiCheatCompactor } from './BroccoliGamingAntiCheatCompactor';
import { BroccoliMusicPublishingCwrCompactor } from './BroccoliMusicPublishingCwrCompactor';
import { BroccoliFilmDcpKdmCompactor } from './BroccoliFilmDcpKdmCompactor';
import { BroccoliHospitalityGdsCompactor } from './BroccoliHospitalityGdsCompactor';
import { BroccoliAirlinePnrCompactor } from './BroccoliAirlinePnrCompactor';
import { BroccoliLotteryGamingCompactor } from './BroccoliLotteryGamingCompactor';
import { BroccoliSportsOpticalTrackingCompactor } from './BroccoliSportsOpticalTrackingCompactor';

// Cluster 15: HR, Education, Legal Bar Exam, Gov Contracting, Non-Profit & Grants
import { BroccoliSamGovFedBizOppsCompactor } from './BroccoliSamGovFedBizOppsCompactor';
import { BroccoliFirms83bTaxCompactor } from './BroccoliFirms83bTaxCompactor';
import { BroccoliStateBarMoralCharacterCompactor } from './BroccoliStateBarMoralCharacterCompactor';
import { BroccoliHigherEdIedsCompactor } from './BroccoliHigherEdIedsCompactor';
import { BroccoliClinicalPsychIqCompactor } from './BroccoliClinicalPsychIqCompactor';
import { BroccoliNonProfit990Compactor } from './BroccoliNonProfit990Compactor';
import { BroccoliNihGrantCompactor } from './BroccoliNihGrantCompactor';
import { BroccoliHrI9EverifyCompactor } from './BroccoliHrI9EverifyCompactor';
import { BroccoliErisa5500Compactor } from './BroccoliErisa5500Compactor';
import { BroccoliUnclaimedPropertyCompactor } from './BroccoliUnclaimedPropertyCompactor';

// Cluster 16: Aerospace, Defense & Federal Compliance
import { BroccoliItarDfcDefenseCompactor } from './BroccoliItarDfcDefenseCompactor';
import { BroccoliCmmcCyberCompactor } from './BroccoliCmmcCyberCompactor';
import { BroccoliDcaaIncurredCostCompactor } from './BroccoliDcaaIncurredCostCompactor';
import { BroccoliAs9100AerospaceCompactor } from './BroccoliAs9100AerospaceCompactor';
import { BroccoliNasaSafetyMissionCompactor } from './BroccoliNasaSafetyMissionCompactor';

// Cluster 17: Maritime, Port Operations & Naval Architecture
import { BroccoliSolasVgmCompactor } from './BroccoliSolasVgmCompactor';
import { BroccoliMarpolAnnex6Compactor } from './BroccoliMarpolAnnex6Compactor';
import { BroccoliShipClassificationIacsCompactor } from './BroccoliShipClassificationIacsCompactor';
import { BroccoliIspsPortSecurityCompactor } from './BroccoliIspsPortSecurityCompactor';
import { BroccoliBillOfLadingOceanCompactor } from './BroccoliBillOfLadingOceanCompactor';

// Cluster 18: Energy Utilities, FERC, Nuclear Waste & Pipeline Transmission
import { BroccoliFercForm1Compactor } from './BroccoliFercForm1Compactor';
import { BroccoliPhmsaPipelineIntegrityCompactor } from './BroccoliPhmsaPipelineIntegrityCompactor';
import { BroccoliNuclearWasteDryCaskCompactor } from './BroccoliNuclearWasteDryCaskCompactor';
import { BroccoliEpaNpdesWaterDischargeCompactor } from './BroccoliEpaNpdesWaterDischargeCompactor';
import { BroccoliOsha1910SafetyCompactor } from './BroccoliOsha1910SafetyCompactor';

// Cluster 19: Commercial Banking, Treasury Management, SWIFT & Trade Finance
import { BroccoliSwiftMt103Compactor } from './BroccoliSwiftMt103Compactor';
import { BroccoliSwiftMt700Compactor } from './BroccoliSwiftMt700Compactor';
import { BroccoliAchNachaCompactor } from './BroccoliAchNachaCompactor';
import { BroccoliBai2BankStatementCompactor } from './BroccoliBai2BankStatementCompactor';
import { BroccoliTreasuryLockboxCompactor } from './BroccoliTreasuryLockboxCompactor';

// Cluster 20: Semiconductor IC Design, EDA, Silicon Tape-Out & Cleanroom Ops
import { BroccoliGdsiiTapeoutCompactor } from './BroccoliGdsiiTapeoutCompactor';
import { BroccoliSpiceSimulationCompactor } from './BroccoliSpiceSimulationCompactor';
import { BroccoliDrcLvsPhysicalVerificationCompactor } from './BroccoliDrcLvsPhysicalVerificationCompactor';
import { BroccoliStaticTimingStaCompactor } from './BroccoliStaticTimingStaCompactor';
import { BroccoliCleanroomParticleIsoCompactor } from './BroccoliCleanroomParticleIsoCompactor';

// Cluster 21: Telecom 5G Core, O-RAN, DOCSIS Cable & Subsea Optical
import { BroccoliFiveGCpCompactor } from './BroccoliFiveGCpCompactor';
import { BroccoliOpenRanCompactor } from './BroccoliOpenRanCompactor';
import { BroccoliSubseaFiberOtdrCompactor } from './BroccoliSubseaFiberOtdrCompactor';
import { BroccoliVoLTECallCompactor } from './BroccoliVoLTECallCompactor';
import { BroccoliSatelliteGsmP25Compactor } from './BroccoliSatelliteGsmP25Compactor';

export interface DomainOptimizationResult {
  domain: string;
  cluster: string;
  originalTokens: number;
  compactedTokens: number;
  tokensSaved: number;
  savingsPercentage: number;
  compactedPrompt: string;
  fidelityStatus: CompactionFidelityStatus;
  unsupportedFacts: string[];
}

export class BroccoliDomainSpendOptimizer {
  private static instance: BroccoliDomainSpendOptimizer;
  public readonly masterTable: BroccoliDbTable<{
    id: string;
    domain: string;
    tokensSaved: number;
    timestampMs: number;
  }>;

  private constructor() {
    this.masterTable = new BroccoliDbTable('master_spend_optimizer_audit');
    this.masterTable.createIndex('domain');
    this.masterTable.createIndex('tokensSaved');
  }

  public static getInstance(): BroccoliDomainSpendOptimizer {
    if (!BroccoliDomainSpendOptimizer.instance) {
      BroccoliDomainSpendOptimizer.instance = new BroccoliDomainSpendOptimizer();
    }
    return BroccoliDomainSpendOptimizer.instance;
  }

  public static optimize(rawText: string, forcedDomain?: string): DomainOptimizationResult {
    const optimizer = this.getInstance();
    const domain = forcedDomain || this.detectDomain(rawText);
    let originalTokens = Math.ceil(rawText.length / 4);
    let compactedTokens = originalTokens;
    let tokensSaved = 0;
    let savingsPercentage = 0;
    let compactedPrompt = rawText;
    let cluster = 'General';

    switch (domain) {
      // Cluster 1: Legal & IP
      case 'Interrogatory': {
        const res = BroccoliInterrogatoryCompactor.compactInterrogatory(rawText);
        cluster = 'Legal & IP';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedInterrogatoryPrompt;
        break;
      }
      case 'CourtTranscript': {
        const res = BroccoliCourtTranscriptCompactor.compactTranscript(rawText);
        cluster = 'Legal & IP';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedTranscriptPrompt;
        break;
      }
      case 'PrivilegeLog': {
        const res = BroccoliPrivilegeLogCompactor.compactPrivilegeLog(rawText);
        cluster = 'Legal & IP';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedPrivilegePrompt;
        break;
      }
      case 'ArbitrationAward': {
        const res = BroccoliArbitrationAwardCompactor.compactArbitrationAward(rawText);
        cluster = 'Legal & IP';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedAwardPrompt;
        break;
      }
      case 'BankruptcyReorg': {
        const res = BroccoliBankruptcyReorgCompactor.compactBankruptcy(rawText);
        cluster = 'Legal & IP';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedBankruptcyPrompt;
        break;
      }
      case 'MnaDisclosure': {
        const res = BroccoliMnaDisclosureCompactor.compactMnaDisclosure(rawText);
        cluster = 'Legal & IP';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedMnaPrompt;
        break;
      }
      case 'ImmigrationPetition': {
        const res = BroccoliImmigrationPetitionCompactor.compactImmigration(rawText);
        cluster = 'Legal & IP';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedImmigrationPrompt;
        break;
      }
      case 'RoyaltyStatement': {
        const res = BroccoliRoyaltyStatementCompactor.compactRoyalty(rawText);
        cluster = 'Legal & IP';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedRoyaltyPrompt;
        break;
      }
      case 'MasterServicesAgreement': {
        const res = BroccoliMsaCompactor.compactMsa(rawText);
        cluster = 'Legal & IP';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedMsaPrompt;
        break;
      }
      case 'UsptoOfficeAction': {
        const res = BroccoliUsptoOfficeActionCompactor.compactOfficeAction(rawText);
        cluster = 'Legal & IP';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedOfficeActionPrompt;
        break;
      }

      // Cluster 2: Healthcare & Surgery
      case 'Pathology': {
        const res = BroccoliPathologyCompactor.compactPathology(rawText);
        cluster = 'Healthcare & Surgery';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedPathologyPrompt;
        break;
      }
      case 'OperativeReport': {
        const res = BroccoliOperativeReportCompactor.compactOperativeReport(rawText);
        cluster = 'Healthcare & Surgery';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedOperativePrompt;
        break;
      }
      case 'AnesthesiologyAIMS': {
        const res = BroccoliAnesthesiologyAimsCompactor.compactAnesthesia(rawText);
        cluster = 'Healthcare & Surgery';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedAnesthesiaPrompt;
        break;
      }
      case 'CardiologyECG': {
        const res = BroccoliCardiologyEcgCompactor.compactEcg(rawText);
        cluster = 'Healthcare & Surgery';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedEcgPrompt;
        break;
      }
      case 'RadiationOncology': {
        const res = BroccoliRadiationOncologyCompactor.compactRadiationOncology(rawText);
        cluster = 'Healthcare & Surgery';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedRadiationPrompt;
        break;
      }
      case 'FHIR': {
        const res = BroccoliFhirCompactor.compactFhir(rawText);
        cluster = 'Healthcare & Surgery';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedFhirPrompt;
        break;
      }
      case 'RemotePatientMonitoring': {
        const res = BroccoliRemotePatientMonitoringCompactor.compactRpm(rawText);
        cluster = 'Healthcare & Surgery';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedRpmPrompt;
        break;
      }
      case 'InsulinPump': {
        const res = BroccoliInsulinPumpCompactor.compactPump(rawText);
        cluster = 'Healthcare & Surgery';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedPumpPrompt;
        break;
      }
      case 'InfectionControlNHSN': {
        const res = BroccoliInfectionControlNhsnCompactor.compactNhsn(rawText);
        cluster = 'Healthcare & Surgery';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedNhsnPrompt;
        break;
      }
      case 'SleepMedicinePSG': {
        const res = BroccoliSleepMedicinePsgCompactor.compactPsg(rawText);
        cluster = 'Healthcare & Surgery';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedPsgPrompt;
        break;
      }

      // Cluster 3: Specialized Clinical
      case 'GastroColonoscopy': {
        const res = BroccoliGastroColonoscopyCompactor.compactGastro(rawText);
        cluster = 'Specialized Clinical';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedGiPrompt;
        break;
      }
      case 'DialysisFlowsheet': {
        const res = BroccoliDialysisFlowsheetCompactor.compactDialysis(rawText);
        cluster = 'Specialized Clinical';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedDialysisPrompt;
        break;
      }
      case 'NeurologyEEG': {
        const res = BroccoliNeurologyEegCompactor.compactEeg(rawText);
        cluster = 'Specialized Clinical';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedEegPrompt;
        break;
      }
      case 'RheumatologyDAS28': {
        const res = BroccoliRheumatologyDas28Compactor.compactRheumatology(rawText);
        cluster = 'Specialized Clinical';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedRheumatologyPrompt;
        break;
      }
      case 'PodiatryDFU': {
        const res = BroccoliPodiatryDfuCompactor.compactPodiatry(rawText);
        cluster = 'Specialized Clinical';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedPodiatryPrompt;
        break;
      }
      case 'AudiologyExam': {
        const res = BroccoliAudiologyExamCompactor.compactAudiology(rawText);
        cluster = 'Specialized Clinical';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedAudiologyPrompt;
        break;
      }
      case 'OphthalmologyOCT': {
        const res = BroccoliOphthalmologyOctCompactor.compactOphthalmology(rawText);
        cluster = 'Specialized Clinical';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedOphthalmologyPrompt;
        break;
      }
      case 'Dermatology': {
        const res = BroccoliDermatologyCompactor.compactDermatology(rawText);
        cluster = 'Specialized Clinical';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedDermatologyPrompt;
        break;
      }
      case 'BehavioralHealth': {
        const res = BroccoliBehavioralHealthCompactor.compactMentalHealth(rawText);
        cluster = 'Specialized Clinical';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedMentalHealthPrompt;
        break;
      }
      case 'PhysicalTherapy': {
        const res = BroccoliPhysicalTherapyCompactor.compactPhysicalTherapy(rawText);
        cluster = 'Specialized Clinical';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedPtPrompt;
        break;
      }

      // Cluster 4: Life Sciences & Pharma
      case 'FDARegulatory': {
        const res = BroccoliFdaRegulatoryCompactor.compactFda(rawText);
        cluster = 'Life Sciences & Pharma';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedFdaPrompt;
        break;
      }
      case 'CDISC_EDC': {
        const res = BroccoliCdiscEdcCompactor.compactEdc(rawText);
        cluster = 'Life Sciences & Pharma';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedEdcPrompt;
        break;
      }
      case 'SaMD_MedicalDevice': {
        const res = BroccoliSamdMedicalDeviceCompactor.compactSamd(rawText);
        cluster = 'Life Sciences & Pharma';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedSamdPrompt;
        break;
      }
      case 'CertificateOfAnalysis': {
        const res = BroccoliCertificateOfAnalysisCompactor.compactCoa(rawText);
        cluster = 'Life Sciences & Pharma';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedCoaPrompt;
        break;
      }
      case 'NCPDP_Prescription': {
        const res = BroccoliNcpdpPrescriptionCompactor.compactNcpdp(rawText);
        cluster = 'Life Sciences & Pharma';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedNcpdpPrompt;
        break;
      }
      case 'HospitalLIS': {
        const res = BroccoliHospitalLisCompactor.compactLis(rawText);
        cluster = 'Life Sciences & Pharma';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedLisPrompt;
        break;
      }
      case 'GenomicsVCF': {
        const res = BroccoliGenomicsVcfCompactor.compactVcf(rawText);
        cluster = 'Life Sciences & Pharma';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedVcfPrompt;
        break;
      }
      case 'ForensicToxicology': {
        const res = BroccoliForensicToxicologyCompactor.compactToxicology(rawText);
        cluster = 'Life Sciences & Pharma';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedToxPrompt;
        break;
      }
      case 'Veterinary': {
        const res = BroccoliVeterinaryCompactor.compactVeterinary(rawText);
        cluster = 'Life Sciences & Pharma';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedVetPrompt;
        break;
      }
      case 'FoodSafetyHACCP': {
        const res = BroccoliFoodSafetyHaccpCompactor.compactHaccp(rawText);
        cluster = 'Life Sciences & Pharma';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedHaccpPrompt;
        break;
      }

      // Cluster 5: Capital Markets & FinOps
      case 'AML_KYC': {
        const res = BroccoliAmlKycCompactor.compactAml(rawText);
        cluster = 'Capital Markets & FinOps';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedAmlPrompt;
        break;
      }
      case 'FinOpsCloudCost': {
        const res = BroccoliFinOpsCloudCostCompactor.compactFinOps(rawText);
        cluster = 'Capital Markets & FinOps';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedFinOpsPrompt;
        break;
      }
      case 'PayrollTax': {
        const res = BroccoliPayrollTaxCompactor.compactPayroll(rawText);
        cluster = 'Capital Markets & FinOps';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedPayrollPrompt;
        break;
      }
      case 'ArFactoring': {
        const res = BroccoliArFactoringCompactor.compactFactoring(rawText);
        cluster = 'Capital Markets & FinOps';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedFactoringPrompt;
        break;
      }
      case 'VcInvestmentMemo': {
        const res = BroccoliVcInvestmentMemoCompactor.compactVcMemo(rawText);
        cluster = 'Capital Markets & FinOps';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedMemoPrompt;
        break;
      }
      case 'ProxyDEF14A': {
        const res = BroccoliProxyDef14aCompactor.compactProxy(rawText);
        cluster = 'Capital Markets & FinOps';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedProxyPrompt;
        break;
      }
      case 'ABS_LoanTape': {
        const res = BroccoliAbsLoanTapeCompactor.compactAbsTape(rawText);
        cluster = 'Capital Markets & FinOps';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedAbsPrompt;
        break;
      }
      case 'ForensicAccounting': {
        const res = BroccoliForensicAccountingCompactor.compactForensicAccounting(rawText);
        cluster = 'Capital Markets & FinOps';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedForensicPrompt;
        break;
      }
      case 'BaselStressTest': {
        const res = BroccoliBaselStressTestCompactor.compactStressTest(rawText);
        cluster = 'Capital Markets & FinOps';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedBaselPrompt;
        break;
      }
      case 'SmartContractAudit': {
        const res = BroccoliSmartContractAuditCompactor.compactContractAudit(rawText);
        cluster = 'Capital Markets & FinOps';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedAuditPrompt;
        break;
      }

      // Cluster 6: Lending & Real Estate
      case 'GeneralLedger': {
        const res = BroccoliGeneralLedgerCompactor.compactGeneralLedger(rawText);
        cluster = 'Lending & Real Estate';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedGlPrompt;
        break;
      }
      case 'TaxReturn': {
        const res = BroccoliTaxReturnCompactor.compactTaxReturn(rawText);
        cluster = 'Lending & Real Estate';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedTaxPrompt;
        break;
      }
      case 'ISO20022': {
        const res = BroccoliIso20022Compactor.compactIso20022(rawText);
        cluster = 'Lending & Real Estate';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedIsoPrompt;
        break;
      }
      case 'WealthPortfolio': {
        const res = BroccoliWealthPortfolioCompactor.compactWealthPortfolio(rawText);
        cluster = 'Lending & Real Estate';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedWealthPrompt;
        break;
      }
      case 'CommercialLoan': {
        const res = BroccoliCommercialLoanCompactor.compactCommercialLoan(rawText);
        cluster = 'Lending & Real Estate';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedLoanPrompt;
        break;
      }
      case 'Underwriting': {
        const res = BroccoliUnderwritingCompactor.compactUnderwriting(rawText);
        cluster = 'Lending & Real Estate';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedUnderwritingPrompt;
        break;
      }
      case 'ClosingDisclosure': {
        const res = BroccoliClosingDisclosureCompactor.compactClosingDisclosure(rawText);
        cluster = 'Lending & Real Estate';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedCdPrompt;
        break;
      }
      case 'EquipmentLease': {
        const res = BroccoliEquipmentLeaseCompactor.compactEquipmentLease(rawText);
        cluster = 'Lending & Real Estate';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedLeasePrompt;
        break;
      }
      case 'SuretyBond': {
        const res = BroccoliSuretyBondCompactor.compactSuretyBond(rawText);
        cluster = 'Lending & Real Estate';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedBondPrompt;
        break;
      }
      case 'CommercialLease': {
        const res = BroccoliCommercialLeaseCompactor.compactCommercialLease(rawText);
        cluster = 'Lending & Real Estate';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedLeasePrompt;
        break;
      }

      // Cluster 7: Real Estate Title & Municipal
      case 'CRERentRoll': {
        const res = BroccoliCreRentRollCompactor.compactRentRoll(rawText);
        cluster = 'Real Estate Title & Municipal';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedRentRollPrompt;
        break;
      }
      case 'CRESyndication': {
        const res = BroccoliCreSyndicationCompactor.compactSyndication(rawText);
        cluster = 'Real Estate Title & Municipal';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedSyndicationPrompt;
        break;
      }
      case 'Phase1Environmental': {
        const res = BroccoliPhase1EnvironmentalCompactor.compactPhase1Esa(rawText);
        cluster = 'Real Estate Title & Municipal';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedEsaPrompt;
        break;
      }
      case 'AltaSettlement': {
        const res = BroccoliAltaSettlementCompactor.compactAltaSettlement(rawText);
        cluster = 'Real Estate Title & Municipal';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedAltaPrompt;
        break;
      }
      case 'PropertyTaxAssessment': {
        const res = BroccoliPropertyTaxAssessmentCompactor.compactTaxAssessment(rawText);
        cluster = 'Real Estate Title & Municipal';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedTaxAssessmentPrompt;
        break;
      }
      case 'WaterRightsDecree': {
        const res = BroccoliWaterRightsDecreeCompactor.compactWaterDecree(rawText);
        cluster = 'Real Estate Title & Municipal';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedWaterPrompt;
        break;
      }
      case 'Municipal311': {
        const res = BroccoliMunicipal311Compactor.compact311(rawText);
        cluster = 'Real Estate Title & Municipal';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compacted311Prompt;
        break;
      }
      case 'VectorControlArboviral': {
        const res = BroccoliVectorControlArboviralCompactor.compactVectorControl(rawText);
        cluster = 'Real Estate Title & Municipal';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedVectorPrompt;
        break;
      }
      case 'NfirsFireIncident': {
        const res = BroccoliNfirsFireIncidentCompactor.compactNfirs(rawText);
        cluster = 'Real Estate Title & Municipal';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedNfirsPrompt;
        break;
      }
      case 'NemsisEMS': {
        const res = BroccoliNemsisEmsCompactor.compactNemsis(rawText);
        cluster = 'Real Estate Title & Municipal';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedEmsPrompt;
        break;
      }

      // Cluster 8: Insurance & Actuarial
      case 'LifeInsuranceAPS': {
        const res = BroccoliLifeInsuranceApsCompactor.compactAps(rawText);
        cluster = 'Insurance & Actuarial';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedApsPrompt;
        break;
      }
      case 'LossRun': {
        const res = BroccoliLossRunCompactor.compactLossRun(rawText);
        cluster = 'Insurance & Actuarial';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedLossRunPrompt;
        break;
      }
      case 'MarineHullPI': {
        const res = BroccoliMarineHullPiCompactor.compactMarine(rawText);
        cluster = 'Insurance & Actuarial';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedMarinePrompt;
        break;
      }
      case 'AdjusterEstimate': {
        const res = BroccoliAdjusterEstimateCompactor.compactAdjusterEstimate(rawText);
        cluster = 'Insurance & Actuarial';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedAdjusterPrompt;
        break;
      }
      case 'SubrogationDemand': {
        const res = BroccoliSubrogationDemandCompactor.compactSubrogation(rawText);
        cluster = 'Insurance & Actuarial';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedSubroPrompt;
        break;
      }
      case 'UBITelematics': {
        const res = BroccoliUbiTelematicsCompactor.compactUbi(rawText);
        cluster = 'Insurance & Actuarial';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedUbiPrompt;
        break;
      }
      case 'ActuarialCatModel': {
        const res = BroccoliActuarialCatModelCompactor.compactCatModel(rawText);
        cluster = 'Insurance & Actuarial';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedCatModelPrompt;
        break;
      }
      case 'DentalChart': {
        const res = BroccoliDentalChartCompactor.compactDental(rawText);
        cluster = 'Insurance & Actuarial';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedDentalPrompt;
        break;
      }
      case 'AllergyImmunology': {
        const res = BroccoliAllergyImmunologyCompactor.compactAllergy(rawText);
        cluster = 'Insurance & Actuarial';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedAllergyPrompt;
        break;
      }
      case 'VendorAssessment': {
        const res = BroccoliVendorAssessmentCompactor.compactVendorAssessment(rawText);
        cluster = 'Insurance & Actuarial';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedVendorPrompt;
        break;
      }

      // Cluster 9: Coding & Cyber
      case 'CICDLog': {
        const res = BroccoliCicdLogCompactor.compactCicdLog(rawText);
        cluster = 'Coding & Cyber';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedCicdPrompt;
        break;
      }
      case 'SIEMThreat': {
        const res = BroccoliSiemThreatCompactor.compactSiem(rawText);
        cluster = 'Coding & Cyber';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedSiemPrompt;
        break;
      }
      case 'SAML_SCIM': {
        const res = BroccoliSamlScimCompactor.compactIdentity(rawText);
        cluster = 'Coding & Cyber';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedIdpPrompt;
        break;
      }
      case 'ITSM_ChangeManagement': {
        const res = BroccoliItsmChangeManagementCompactor.compactItsmChange(rawText);
        cluster = 'Coding & Cyber';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedItsmPrompt;
        break;
      }
      case 'DigitalForensics': {
        const res = BroccoliDigitalForensicsCompactor.compactDfir(rawText);
        cluster = 'Coding & Cyber';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedDfirPrompt;
        break;
      }
      case 'TradeSanctions': {
        const res = BroccoliTradeSanctionsCompactor.compactSanctions(rawText);
        cluster = 'Coding & Cyber';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedSanctionsPrompt;
        break;
      }
      case 'SemiconductorFab': {
        const res = BroccoliSemiconductorFabCompactor.compactFab(rawText);
        cluster = 'Coding & Cyber';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedFabPrompt;
        break;
      }
      case 'ATE_Semiconductor': {
        const res = BroccoliAteSemiconductorCompactor.compactAte(rawText);
        cluster = 'Coding & Cyber';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedAtePrompt;
        break;
      }
      case 'NetworkTelemetry': {
        const res = BroccoliNetworkTelemetryCompactor.compactNetwork(rawText);
        cluster = 'Coding & Cyber';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedNocPrompt;
        break;
      }
      case 'TelecomCDR': {
        const res = BroccoliTelecomCdrCompactor.compactCdr(rawText);
        cluster = 'Coding & Cyber';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedCdrPrompt;
        break;
      }

      // Cluster 10: Aerospace & Defense
      case 'AviationIFC': {
        const res = BroccoliAviationIfcCompactor.compactAviationIfc(rawText);
        cluster = 'Aerospace & Space';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedIfcPrompt;
        break;
      }
      case 'UAV_Part107': {
        const res = BroccoliUavPart107Compactor.compactUav(rawText);
        cluster = 'Aerospace & Space';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedUavPrompt;
        break;
      }
      case 'AircraftDeicing': {
        const res = BroccoliAircraftDeicingCompactor.compactDeicing(rawText);
        cluster = 'Aerospace & Space';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedDeicingPrompt;
        break;
      }
      case 'AirTrafficControl': {
        const res = BroccoliAirTrafficControlCompactor.compactAtc(rawText);
        cluster = 'Aerospace & Space';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedAtcPrompt;
        break;
      }
      case 'AviationMaintenance': {
        const res = BroccoliAviationMaintenanceCompactor.compactMro(rawText);
        cluster = 'Aerospace & Space';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedMroPrompt;
        break;
      }
      case 'PilotFlightLog': {
        const res = BroccoliPilotFlightLogCompactor.compactPilotLog(rawText);
        cluster = 'Aerospace & Space';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedLogbookPrompt;
        break;
      }
      case 'FlightTelemetry': {
        const res = BroccoliFlightTelemetryCompactor.compactFlightTelemetry(rawText);
        cluster = 'Aerospace & Space';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedFoqaPrompt;
        break;
      }
      case 'SatelliteTelemetry': {
        const res = BroccoliSatelliteTelemetryCompactor.compactSatellite(rawText);
        cluster = 'Aerospace & Space';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedSatellitePrompt;
        break;
      }
      case 'RocketTelemetry': {
        const res = BroccoliRocketTelemetryCompactor.compactRocket(rawText);
        cluster = 'Aerospace & Space';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedRocketPrompt;
        break;
      }
      case 'DocsisFiber': {
        const res = BroccoliDocsisFiberCompactor.compactDocsisFiber(rawText);
        cluster = 'Aerospace & Space';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedDocsisPrompt;
        break;
      }

      // Cluster 11: Automation & Infrastructure
      case 'AutonomousVehicleLog': {
        const res = BroccoliAutonomousVehicleLogCompactor.compactAvLog(rawText);
        cluster = 'Automation & Infrastructure';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedAvPrompt;
        break;
      }
      case 'NhtsaCrashTest': {
        const res = BroccoliNhtsaCrashTestCompactor.compactCrashTest(rawText);
        cluster = 'Automation & Infrastructure';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedCrashPrompt;
        break;
      }
      case 'MunicipalTrafficSignal': {
        const res = BroccoliMunicipalTrafficSignalCompactor.compactTrafficSignal(rawText);
        cluster = 'Automation & Infrastructure';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedTrafficPrompt;
        break;
      }
      case 'IndustrialPLC': {
        const res = BroccoliIndustrialPlcCompactor.compactPlc(rawText);
        cluster = 'Automation & Infrastructure';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedPlcPrompt;
        break;
      }
      case 'BuildingAutomation': {
        const res = BroccoliBuildingAutomationCompactor.compactBas(rawText);
        cluster = 'Automation & Infrastructure';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedBasPrompt;
        break;
      }
      case 'StructuralHealth': {
        const res = BroccoliStructuralHealthCompactor.compactShm(rawText);
        cluster = 'Automation & Infrastructure';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedShmPrompt;
        break;
      }
      case 'PhysicalAccessControl': {
        const res = BroccoliPhysicalAccessControlCompactor.compactPacs(rawText);
        cluster = 'Automation & Infrastructure';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedPacsPrompt;
        break;
      }
      case 'MilStdDefense': {
        const res = BroccoliMilStdDefenseCompactor.compactMilStd(rawText);
        cluster = 'Automation & Infrastructure';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedMilPrompt;
        break;
      }
      case 'AecSubmittal': {
        const res = BroccoliAecSubmittalCompactor.compactAec(rawText);
        cluster = 'Automation & Infrastructure';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedAecPrompt;
        break;
      }
      case 'BuildingPermit': {
        const res = BroccoliBuildingPermitCompactor.compactPermit(rawText);
        cluster = 'Automation & Infrastructure';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedPermitPrompt;
        break;
      }

      // Cluster 12: Supply Chain & Agriculture
      case 'EDI_856_ASN': {
        const res = BroccoliEdi856AsnCompactor.compactEdi856(rawText);
        cluster = 'Supply Chain & Agriculture';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedEdiPrompt;
        break;
      }
      case 'ColdChainIoT': {
        const res = BroccoliColdChainIotCompactor.compactColdChain(rawText);
        cluster = 'Supply Chain & Agriculture';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedColdChainPrompt;
        break;
      }
      case 'CustomsEntry7501': {
        const res = BroccoliCustomsEntry7501Compactor.compactCbp7501(rawText);
        cluster = 'Supply Chain & Agriculture';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedCbpPrompt;
        break;
      }
      case 'HazmatShipping': {
        const res = BroccoliHazmatShippingCompactor.compactHazmat(rawText);
        cluster = 'Supply Chain & Agriculture';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedHazmatPrompt;
        break;
      }
      case 'EDI_404_RailWaybill': {
        const res = BroccoliEdi404RailWaybillCompactor.compactEdi404(rawText);
        cluster = 'Supply Chain & Agriculture';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedRailPrompt;
        break;
      }
      case 'MaritimeContainerTDR': {
        const res = BroccoliMaritimeContainerTdrCompactor.compactTdr(rawText);
        cluster = 'Supply Chain & Agriculture';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedTdrPrompt;
        break;
      }
      case 'PharmaceuticalTrackTrace': {
        const res = BroccoliPharmaceuticalTrackTraceCompactor.compactDscsa(rawText);
        cluster = 'Supply Chain & Agriculture';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedDscsaPrompt;
        break;
      }
      case 'GrainElevatorWarehouse': {
        const res = BroccoliGrainElevatorWarehouseCompactor.compactGrainReceipt(rawText);
        cluster = 'Supply Chain & Agriculture';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedGrainPrompt;
        break;
      }
      case 'LivestockTraceability': {
        const res = BroccoliLivestockTraceabilityCompactor.compactLivestock(rawText);
        cluster = 'Supply Chain & Agriculture';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedLivestockPrompt;
        break;
      }
      case 'ForestFscTimber': {
        const res = BroccoliForestFscTimberCompactor.compactTimber(rawText);
        cluster = 'Supply Chain & Agriculture';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedTimberPrompt;
        break;
      }

      // Cluster 13: Energy, Mining & ESG
      case 'ElectricGridSCADA': {
        const res = BroccoliElectricGridScadaCompactor.compactGridScada(rawText);
        cluster = 'Energy, Mining & ESG';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedGridPrompt;
        break;
      }
      case 'NuclearPlantSafety': {
        const res = BroccoliNuclearPlantSafetyCompactor.compactNuclearSpds(rawText);
        cluster = 'Energy, Mining & ESG';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedNuclearPrompt;
        break;
      }
      case 'NercCipGrid': {
        const res = BroccoliNercCipGridCompactor.compactNercCip(rawText);
        cluster = 'Energy, Mining & ESG';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedNercPrompt;
        break;
      }
      case 'WindTurbineSCADA': {
        const res = BroccoliWindTurbineScadaCompactor.compactWindTurbine(rawText);
        cluster = 'Energy, Mining & ESG';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedWindPrompt;
        break;
      }
      case 'SolarInverterTelemetry': {
        const res = BroccoliSolarInverterTelemetryCompactor.compactSolar(rawText);
        cluster = 'Energy, Mining & ESG';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedSolarPrompt;
        break;
      }
      case 'OffshoreDrillingWITSML': {
        const res = BroccoliOffshoreDrillingWitsmlCompactor.compactWitsml(rawText);
        cluster = 'Energy, Mining & ESG';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedWitsmlPrompt;
        break;
      }
      case 'MiningFleet': {
        const res = BroccoliMiningFleetCompactor.compactMiningFleet(rawText);
        cluster = 'Energy, Mining & ESG';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedMiningPrompt;
        break;
      }
      case 'EsgCarbonAccounting': {
        const res = BroccoliEsgCarbonAccountingCompactor.compactEsg(rawText);
        cluster = 'Energy, Mining & ESG';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedEsgPrompt;
        break;
      }
      case 'EpaEmissionsRATA': {
        const res = BroccoliEpaEmissionsRataCompactor.compactEpaRata(rawText);
        cluster = 'Energy, Mining & ESG';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedRataPrompt;
        break;
      }
      case 'CarbonCreditVerra': {
        const res = BroccoliCarbonCreditVerraCompactor.compactCarbonCredit(rawText);
        cluster = 'Energy, Mining & ESG';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedCarbonPrompt;
        break;
      }

      // Cluster 14: Media, AdTech & Sports
      case 'OpenRTB_AdTech': {
        const res = BroccoliOpenRtbAdTechCompactor.compactOpenRtb(rawText);
        cluster = 'Media & Entertainment';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedRtbPrompt;
        break;
      }
      case 'BroadcastSCTE35': {
        const res = BroccoliBroadcastScte35Compactor.compactScte35(rawText);
        cluster = 'Media & Entertainment';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedSctePrompt;
        break;
      }
      case 'VideoEncodingVMAF': {
        const res = BroccoliVideoEncodingVmafCompactor.compactVmaf(rawText);
        cluster = 'Media & Entertainment';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedVmafPrompt;
        break;
      }
      case 'GamingAntiCheat': {
        const res = BroccoliGamingAntiCheatCompactor.compactAntiCheat(rawText);
        cluster = 'Media & Entertainment';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedCheatPrompt;
        break;
      }
      case 'MusicPublishingCWR': {
        const res = BroccoliMusicPublishingCwrCompactor.compactCwr(rawText);
        cluster = 'Media & Entertainment';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedCwrPrompt;
        break;
      }
      case 'FilmDcpKdm': {
        const res = BroccoliFilmDcpKdmCompactor.compactDcp(rawText);
        cluster = 'Media & Entertainment';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedDcpPrompt;
        break;
      }
      case 'HospitalityGDS': {
        const res = BroccoliHospitalityGdsCompactor.compactGdsReservation(rawText);
        cluster = 'Media & Entertainment';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedGdsPrompt;
        break;
      }
      case 'AirlinePNR': {
        const res = BroccoliAirlinePnrCompactor.compactPnr(rawText);
        cluster = 'Media & Entertainment';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedPnrPrompt;
        break;
      }
      case 'LotteryGaming': {
        const res = BroccoliLotteryGamingCompactor.compactLottery(rawText);
        cluster = 'Media & Entertainment';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedLotteryPrompt;
        break;
      }
      case 'SportsOpticalTracking': {
        const res = BroccoliSportsOpticalTrackingCompactor.compactSportsTracking(rawText);
        cluster = 'Media & Entertainment';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedSportsPrompt;
        break;
      }

      // Cluster 15: HR, Education & Gov
      case 'SamGovFedBizOpps': {
        const res = BroccoliSamGovFedBizOppsCompactor.compactSamGov(rawText);
        cluster = 'HR, Education & Gov';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedSamPrompt;
        break;
      }
      case 'Firms83bTax': {
        const res = BroccoliFirms83bTaxCompactor.compact83b(rawText);
        cluster = 'HR, Education & Gov';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compacted83bPrompt;
        break;
      }
      case 'StateBarMoralCharacter': {
        const res = BroccoliStateBarMoralCharacterCompactor.compactMoralCharacter(rawText);
        cluster = 'HR, Education & Gov';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedBarPrompt;
        break;
      }
      case 'HigherEdIPEDS': {
        const res = BroccoliHigherEdIedsCompactor.compactIpeds(rawText);
        cluster = 'HR, Education & Gov';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedIpedsPrompt;
        break;
      }
      case 'ClinicalPsychIQ': {
        const res = BroccoliClinicalPsychIqCompactor.compactPsych(rawText);
        cluster = 'HR, Education & Gov';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedPsychPrompt;
        break;
      }
      case 'NonProfit990': {
        const res = BroccoliNonProfit990Compactor.compactForm990(rawText);
        cluster = 'HR, Education & Gov';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedForm990Prompt;
        break;
      }
      case 'NIHGrant': {
        const res = BroccoliNihGrantCompactor.compactNihGrant(rawText);
        cluster = 'HR, Education & Gov';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedNihPrompt;
        break;
      }
      case 'HRI9EVerify': {
        const res = BroccoliHrI9EverifyCompactor.compactI9(rawText);
        cluster = 'HR, Education & Gov';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedI9Prompt;
        break;
      }
      case 'ErisaForm5500': {
        const res = BroccoliErisa5500Compactor.compactForm5500(rawText);
        cluster = 'HR, Education & Gov';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedForm5500Prompt;
        break;
      }
      case 'UnclaimedProperty': {
        const res = BroccoliUnclaimedPropertyCompactor.compactUnclaimedProperty(rawText);
        cluster = 'HR, Education & Gov';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedNaupaPrompt;
        break;
      }

      // Cluster 16: Aerospace, Defense & Federal Compliance
      case 'ITAR_DefenseExport': {
        const res = BroccoliItarDfcDefenseCompactor.compactItar(rawText);
        cluster = 'Aerospace & Defense';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedItarPrompt;
        break;
      }
      case 'CMMC_Cybersecurity': {
        const res = BroccoliCmmcCyberCompactor.compactCmmc(rawText);
        cluster = 'Aerospace & Defense';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedCmmcPrompt;
        break;
      }
      case 'DCAA_IncurredCost': {
        const res = BroccoliDcaaIncurredCostCompactor.compactDcaa(rawText);
        cluster = 'Aerospace & Defense';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedDcaaPrompt;
        break;
      }
      case 'AS9100_AerospaceQuality': {
        const res = BroccoliAs9100AerospaceCompactor.compactAs9100(rawText);
        cluster = 'Aerospace & Defense';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedAs9100Prompt;
        break;
      }
      case 'NASA_SafetyMission': {
        const res = BroccoliNasaSafetyMissionCompactor.compactNasaSma(rawText);
        cluster = 'Aerospace & Defense';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedNasaPrompt;
        break;
      }

      // Cluster 17: Maritime, Port Operations & Naval Architecture
      case 'SOLAS_VGM': {
        const res = BroccoliSolasVgmCompactor.compactSolasVgm(rawText);
        cluster = 'Maritime & Shipping';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedSolasPrompt;
        break;
      }
      case 'MARPOL_Annex6': {
        const res = BroccoliMarpolAnnex6Compactor.compactMarpol(rawText);
        cluster = 'Maritime & Shipping';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedMarpolPrompt;
        break;
      }
      case 'ShipClassificationIACS': {
        const res = BroccoliShipClassificationIacsCompactor.compactIacs(rawText);
        cluster = 'Maritime & Shipping';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedIacsPrompt;
        break;
      }
      case 'ISPS_PortSecurity': {
        const res = BroccoliIspsPortSecurityCompactor.compactIsps(rawText);
        cluster = 'Maritime & Shipping';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedIspsPrompt;
        break;
      }
      case 'BillOfLadingOcean': {
        const res = BroccoliBillOfLadingOceanCompactor.compactOceanBl(rawText);
        cluster = 'Maritime & Shipping';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedBlPrompt;
        break;
      }

      // Cluster 18: Energy Utilities, FERC, Nuclear Waste & Pipeline Transmission
      case 'FERC_Form1': {
        const res = BroccoliFercForm1Compactor.compactFerc(rawText);
        cluster = 'Energy, Utilities & Safety';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedFercPrompt;
        break;
      }
      case 'PHMSA_PipelineIntegrity': {
        const res = BroccoliPhmsaPipelineIntegrityCompactor.compactPhmsa(rawText);
        cluster = 'Energy, Utilities & Safety';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedPhmsaPrompt;
        break;
      }
      case 'NuclearWasteDryCask': {
        const res = BroccoliNuclearWasteDryCaskCompactor.compactDryCask(rawText);
        cluster = 'Energy, Utilities & Safety';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedCaskPrompt;
        break;
      }
      case 'EPA_NPDES_WaterDischarge': {
        const res = BroccoliEpaNpdesWaterDischargeCompactor.compactNpdes(rawText);
        cluster = 'Energy, Utilities & Safety';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedNpdesPrompt;
        break;
      }
      case 'OSHA_1910_PSM': {
        const res = BroccoliOsha1910SafetyCompactor.compactPsm(rawText);
        cluster = 'Energy, Utilities & Safety';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedPsmPrompt;
        break;
      }

      // Cluster 19: Commercial Banking, Treasury Management, SWIFT & Trade Finance
      case 'SWIFT_MT103': {
        const res = BroccoliSwiftMt103Compactor.compactMt103(rawText);
        cluster = 'Commercial Banking & Treasury';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedMt103Prompt;
        break;
      }
      case 'SWIFT_MT700': {
        const res = BroccoliSwiftMt700Compactor.compactMt700(rawText);
        cluster = 'Commercial Banking & Treasury';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedMt700Prompt;
        break;
      }
      case 'ACH_NACHA': {
        const res = BroccoliAchNachaCompactor.compactNacha(rawText);
        cluster = 'Commercial Banking & Treasury';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedNachaPrompt;
        break;
      }
      case 'BAI2_BankStatement': {
        const res = BroccoliBai2BankStatementCompactor.compactBai2(rawText);
        cluster = 'Commercial Banking & Treasury';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedBai2Prompt;
        break;
      }
      case 'TreasuryLockbox': {
        const res = BroccoliTreasuryLockboxCompactor.compactLockbox(rawText);
        cluster = 'Commercial Banking & Treasury';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedLockboxPrompt;
        break;
      }

      // Cluster 20: Semiconductor IC Design, EDA, Silicon Tape-Out & Cleanroom Ops
      case 'GDSII_Tapeout': {
        const res = BroccoliGdsiiTapeoutCompactor.compactTapeout(rawText);
        cluster = 'Semiconductor IC & EDA';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedTapeoutPrompt;
        break;
      }
      case 'SPICE_Simulation': {
        const res = BroccoliSpiceSimulationCompactor.compactSpice(rawText);
        cluster = 'Semiconductor IC & EDA';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedSpicePrompt;
        break;
      }
      case 'DRC_LVS_Verification': {
        const res = BroccoliDrcLvsPhysicalVerificationCompactor.compactDrcLvs(rawText);
        cluster = 'Semiconductor IC & EDA';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedDrcPrompt;
        break;
      }
      case 'StaticTimingSTA': {
        const res = BroccoliStaticTimingStaCompactor.compactSta(rawText);
        cluster = 'Semiconductor IC & EDA';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedStaPrompt;
        break;
      }
      case 'CleanroomParticleISO': {
        const res = BroccoliCleanroomParticleIsoCompactor.compactCleanroom(rawText);
        cluster = 'Semiconductor IC & EDA';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedCleanroomPrompt;
        break;
      }

      // Cluster 21: Telecom 5G Core, O-RAN, DOCSIS Cable & Subsea Optical
      case 'FiveG_ControlPlane': {
        const res = BroccoliFiveGCpCompactor.compact5gCp(rawText);
        cluster = 'Telecom & 5G Infrastructure';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compacted5gPrompt;
        break;
      }
      case 'OpenRAN_Fronthaul': {
        const res = BroccoliOpenRanCompactor.compactOran(rawText);
        cluster = 'Telecom & 5G Infrastructure';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedOranPrompt;
        break;
      }
      case 'SubseaFiberOTDR': {
        const res = BroccoliSubseaFiberOtdrCompactor.compactOtdr(rawText);
        cluster = 'Telecom & 5G Infrastructure';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedOtdrPrompt;
        break;
      }
      case 'VoLTE_IMSSIP': {
        const res = BroccoliVoLTECallCompactor.compactVolte(rawText);
        cluster = 'Telecom & 5G Infrastructure';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedVoltePrompt;
        break;
      }
      case 'Satellite_P25Radio': {
        const res = BroccoliSatelliteGsmP25Compactor.compactP25(rawText);
        cluster = 'Telecom & 5G Infrastructure';
        originalTokens = res.originalTokens;
        compactedTokens = res.compactedTokens;
        tokensSaved = res.tokensSaved;
        savingsPercentage = res.savingsPercentage;
        compactedPrompt = res.compactedP25Prompt;
        break;
      }

      default: {
        compactedPrompt = rawText;
        originalTokens = Math.ceil(rawText.length / 4);
        compactedTokens = originalTokens;
        tokensSaved = 0;
        savingsPercentage = 0;
        break;
      }
    }

    const fidelity = BroccoliCompactionSafety.verify(rawText, compactedPrompt);
    if (fidelity.status === 'fallback') {
      compactedPrompt = rawText;
      originalTokens = Math.ceil(rawText.length / 4);
      compactedTokens = originalTokens;
      tokensSaved = 0;
      savingsPercentage = 0;
    }

    const auditId = `opt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    optimizer.masterTable.put(auditId, {
      id: auditId,
      domain,
      tokensSaved,
      timestampMs: Date.now(),
    });

    return {
      domain,
      cluster,
      originalTokens,
      compactedTokens,
      tokensSaved,
      savingsPercentage,
      compactedPrompt,
      fidelityStatus: fidelity.status,
      unsupportedFacts: fidelity.unsupportedFacts,
    };
  }

  public static detectDomain(rawText: string): string {
    const text = rawText.toLowerCase();

    // 1. Legal / Patent / M&A
    if (text.includes('interrogator') || text.includes('propounding party')) return 'Interrogatory';
    if (text.includes('transcript') || text.includes('deposition') || text.includes('certified shorthand')) return 'CourtTranscript';
    if (text.includes('privilege log') || text.includes('attorney-client privilege') || text.includes('work product')) return 'PrivilegeLog';
    if (text.includes('arbitral') || text.includes('arbitration') || text.includes('uncitral') || text.includes('icc tribunal')) return 'ArbitrationAward';
    if (text.includes('chapter 11') || text.includes('plan of reorganization') || text.includes('bankruptcy')) return 'BankruptcyReorg';
    if (text.includes('disclosure schedule') || text.includes('m&a') || text.includes('merger agreement')) return 'MnaDisclosure';
    if (text.includes('i-129') || text.includes('i-140') || text.includes('uscis') || text.includes('h-1b')) return 'ImmigrationPetition';
    if (text.includes('royalty statement') || text.includes('licensor') || text.includes('licensee') || text.includes('net mechanicals')) return 'RoyaltyStatement';
    if (text.includes('master services agreement') || text.includes('msa') || text.includes('service level agreement')) return 'MasterServicesAgreement';
    if (text.includes('uspto') || text.includes('office action') || text.includes('35 u.s.c. 102') || text.includes('35 u.s.c. 103')) return 'UsptoOfficeAction';

    // 2. Healthcare & Surgery
    if (text.includes('pathology') || text.includes('histologic') || text.includes('immunohistochemistry') || text.includes('ki-67')) return 'Pathology';
    if (text.includes('operative report') || text.includes('surgeon') || text.includes('preoperative diagnosis') || text.includes('ebl:')) return 'OperativeReport';
    if (text.includes('aims') || text.includes('anesthesia') || text.includes('mac') || text.includes('asa physical status')) return 'AnesthesiologyAIMS';
    if (text.includes('ecg') || text.includes('ekg') || text.includes('qtc') || text.includes('st segment') || text.includes('sinus rhythm')) return 'CardiologyECG';
    if (text.includes('radiation') || text.includes('dicom-rt') || text.includes('dvh') || text.includes('cgy') || text.includes('linac')) return 'RadiationOncology';
    if (text.includes('resourceType') || text.includes('bundle') || text.includes('fhir') || text.includes('http://hl7.org/fhir')) return 'FHIR';
    if (text.includes('cgm') || text.includes('time-in-range') || text.includes('dexcom') || text.includes('remote patient')) return 'RemotePatientMonitoring';
    if (text.includes('insulin pump') || text.includes('basal rate') || text.includes('bolus') || text.includes('tandem') || text.includes('omnipod')) return 'InsulinPump';
    if (text.includes('nhsn') || text.includes('cauti') || text.includes('clabsi') || text.includes('ssi') || text.includes('standardized infection ratio')) return 'InfectionControlNHSN';
    if (text.includes('polysomnography') || text.includes('ahi') || text.includes('sleep study') || text.includes('apnea-hypopnea')) return 'SleepMedicinePSG';

    // 3. Specialized Clinical
    if (text.includes('colonoscopy') || text.includes('boston bowel') || text.includes('cecum reached') || text.includes('polypectomy')) return 'GastroColonoscopy';
    if (text.includes('dialysis') || text.includes('kt/v') || text.includes('ultrafiltration') || text.includes('dialysate')) return 'DialysisFlowsheet';
    if (text.includes('eeg') || text.includes('electroencephalogram') || text.includes('spike-wave') || text.includes('epileptiform')) return 'NeurologyEEG';
    if (text.includes('das28') || text.includes('rheumatoid') || text.includes('tender joint') || text.includes('swollen joint')) return 'RheumatologyDAS28';
    if (text.includes('dfu') || text.includes('diabetic foot') || text.includes('wagner grade') || text.includes('ulcer')) return 'PodiatryDFU';
    if (text.includes('audiology') || text.includes('audiogram') || text.includes('pure tone average') || text.includes('tympanometry')) return 'AudiologyExam';
    if (text.includes('oct') || text.includes('macular thickness') || text.includes('ophthalmology') || text.includes('fundus')) return 'OphthalmologyOCT';
    if (text.includes('dermatology') || text.includes('pasi') || text.includes('scurt') || text.includes('psoriasis') || text.includes('skin lesion')) return 'Dermatology';
    if (text.includes('phq-9') || text.includes('gad-7') || text.includes('behavioral health') || text.includes('mental status')) return 'BehavioralHealth';
    if (text.includes('physical therapy') || text.includes('rom') || text.includes('goniometer') || text.includes('rehabilitation')) return 'PhysicalTherapy';

    // 4. Life Sciences & Pharma
    if (text.includes('fda') || text.includes('510(k)') || text.includes('ind application') || text.includes('nda 2') || text.includes('21 cfr')) return 'FDARegulatory';
    if (text.includes('cdisc') || text.includes('sdtm') || text.includes('edc') || text.includes('crf') || text.includes('clinical trial protocol')) return 'CDISC_EDC';
    if (text.includes('samd') || text.includes('iec 62304') || text.includes('iso 14971') || text.includes('medical device software') || text.includes('hazard analysis')) return 'SaMD_MedicalDevice';
    if (text.includes('certificate of analysis') || text.includes('coa') || text.includes('hplc assay') || text.includes('usp <') || text.includes('dissolution')) return 'CertificateOfAnalysis';
    if (text.includes('ncpdp') || text.includes('d.0') || text.includes('pbm') || text.includes('prescription claim') || text.includes('bin:') || text.includes('pcn:')) return 'NCPDP_Prescription';
    if (text.includes('lis') || text.includes('clia') || text.includes('specimen id') || text.includes('analyzer flag') || text.includes('reference interval')) return 'HospitalLIS';
    if (text.includes('vcf') || text.includes('##fileformat=vcf') || text.includes('variant call') || text.includes('snv') || text.includes('allele frequency')) return 'GenomicsVCF';
    if (text.includes('toxicology') || text.includes('gc/ms') || text.includes('lc-ms/ms') || text.includes('chain of custody') || text.includes('cutoff ng/ml')) return 'ForensicToxicology';
    if (text.includes('veterinary') || text.includes('canine') || text.includes('feline') || text.includes('equine') || text.includes('dvm') || text.includes('species:')) return 'Veterinary';
    if (text.includes('haccp') || text.includes('ccp') || text.includes('critical control point') || text.includes('pasteurization temp') || text.includes('sanitation log')) return 'FoodSafetyHACCP';

    // 5. Capital Markets & FinOps
    if (text.includes('aml') || text.includes('kyc') || text.includes('finen') || text.includes('sar') || text.includes('beneficial ownership') || text.includes('ofac')) return 'AML_KYC';
    if (text.includes('finops') || text.includes('aws cost explorer') || text.includes('reserved instances') || text.includes('savings plans') || text.includes('cloud spend')) return 'FinOpsCloudCost';
    if (text.includes('form 941') || text.includes('w-2') || text.includes('fica') || text.includes('federal withholding') || text.includes('payroll tax')) return 'PayrollTax';
    if (text.includes('factoring') || text.includes('accounts receivable') || text.includes('borrowing base') || text.includes('advance rate') || text.includes('ineligible ar')) return 'ArFactoring';
    if (text.includes('investment memo') || text.includes('venture capital') || text.includes('arr') || text.includes('tam') || text.includes('series a')) return 'VcInvestmentMemo';
    if (text.includes('def 14a') || text.includes('proxy statement') || text.includes('say-on-pay') || text.includes('named executive officer') || text.includes('neo compensation')) return 'ProxyDEF14A';
    if (text.includes('abs') || text.includes('loan tape') || text.includes('securitization') || text.includes('fico') || text.includes('ltv') || text.includes('dscr')) return 'ABS_LoanTape';
    if (text.includes('forensic accounting') || text.includes('benford') || text.includes('journal entry testing') || text.includes('skimming') || text.includes('fictitious vendor')) return 'ForensicAccounting';
    if (text.includes('basel iii') || text.includes('ccar') || text.includes('dfast') || text.includes('cet1') || text.includes('severely adverse scenario')) return 'BaselStressTest';
    if (text.includes('smart contract audit') || text.includes('reentrancy') || text.includes('solidity') || text.includes('slither') || text.includes('erc-20')) return 'SmartContractAudit';

    // 6. Lending & Real Estate
    if (text.includes('general ledger') || text.includes('trial balance') || text.includes('chart of accounts') || text.includes('debit') && text.includes('credit')) return 'GeneralLedger';
    if (text.includes('form 1040') || text.includes('form 1120') || text.includes('taxable income') || text.includes('adjusted gross income') || text.includes('schedule c')) return 'TaxReturn';
    if (text.includes('pacs.008') || text.includes('pain.001') || text.includes('camt.053') || text.includes('iso 20022') || text.includes('bic')) return 'ISO20022';
    if (text.includes('portfolio summary') || text.includes('asset allocation') || text.includes('wealth management') || text.includes('unrealized gain') || text.includes('benchmark')) return 'WealthPortfolio';
    if (text.includes('commercial loan') || text.includes('promissory note') || text.includes('dscr') || text.includes('loan agreement') || text.includes('covenants')) return 'CommercialLoan';
    if (text.includes('underwriting') || text.includes('debt-to-income') || text.includes('dti') || text.includes('automated underwriting') || text.includes('aus findings')) return 'Underwriting';
    if (text.includes('closing disclosure') || text.includes('trid') || text.includes('cash to close') || text.includes('loan estimate') || text.includes('settlement charges')) return 'ClosingDisclosure';
    if (text.includes('equipment lease') || text.includes('master lease agreement') || text.includes('lessor') || text.includes('lessee') || text.includes('fair market value')) return 'EquipmentLease';
    if (text.includes('surety bond') || text.includes('penal sum') || text.includes('obligee') || text.includes('principal') || text.includes('indemnity agreement')) return 'SuretyBond';
    if (text.includes('commercial lease') || text.includes('triple net') || text.includes('nnn') || text.includes('cam charges') || text.includes('base rent')) return 'CommercialLease';

    // 7. Real Estate Title & Municipal
    if (text.includes('rent roll') || text.includes('leased sf') || text.includes('monthly rent') || text.includes('occupancy rate') || text.includes('tenant roster')) return 'CRERentRoll';
    if (text.includes('syndication') || text.includes('waterfall') || text.includes('preferred return') || text.includes('lp equity') || text.includes('gp promote')) return 'CRESyndication';
    if (text.includes('phase i esa') || text.includes('phase 1 esa') || text.includes('astm e1527') || text.includes('rec') || text.includes('recognized environmental condition')) return 'Phase1Environmental';
    if (text.includes('alta') || text.includes('title commitment') || text.includes('schedule b-ii') || text.includes('title exception') || text.includes('settlement statement')) return 'AltaSettlement';
    if (text.includes('property tax') || text.includes('assessed value') || text.includes('millage rate') || text.includes('parcel id') || text.includes('apn:')) return 'PropertyTaxAssessment';
    if (text.includes('water rights') || text.includes('appropriation doctrine') || text.includes('adjudication decree') || text.includes('cfs') || text.includes('acre-feet')) return 'WaterRightsDecree';
    if (text.includes('311') || text.includes('pothole') || text.includes('service request') || text.includes('municipal work order') || text.includes('public works')) return 'Municipal311';
    if (text.includes('mosquito') || text.includes('west nile') || text.includes('vector control') || text.includes('larvicide') || text.includes('trap count')) return 'VectorControlArboviral';
    if (text.includes('nfirs') || text.includes('incident type 111') || text.includes('fire department') || text.includes('structure fire') || text.includes('apparatus')) return 'NfirsFireIncident';
    if (text.includes('nemsis') || text.includes('ems patient care') || text.includes('epcr') || text.includes('gcs') || text.includes('transport destination')) return 'NemsisEMS';

    // 8. Insurance & Actuarial
    if (text.includes('attending physician statement') || text.includes('aps') || text.includes('life insurance underwriting') || text.includes('medical exam') || text.includes('table rating')) return 'LifeInsuranceAPS';
    if (text.includes('loss run') || text.includes('incurred losses') || text.includes('paid claims') || text.includes('policy year') || text.includes('loss ratio')) return 'LossRun';
    if (text.includes('marine hull') || text.includes('p&i club') || text.includes('protection and indemnity') || text.includes('hull & machinery') || text.includes('salvage')) return 'MarineHullPI';
    if (text.includes('adjuster estimate') || text.includes('xactimate') || text.includes('rcv') || text.includes('acv') || text.includes('depreciation') || text.includes('scope of loss')) return 'AdjusterEstimate';
    if (text.includes('subrogation') || text.includes('tortfeasor') || text.includes('inter-company arbitration') || text.includes('recovery demand') || text.includes('police report')) return 'SubrogationDemand';
    if (text.includes('telematics') || text.includes('hard braking') || text.includes('rapid acceleration') || text.includes('miles driven') || text.includes('ubi score')) return 'UBITelematics';
    if (text.includes('cat model') || text.includes('air worldwide') || text.includes('rms') || text.includes('aal') || text.includes('exceedance probability') || text.includes('pml')) return 'ActuarialCatModel';
    if (text.includes('dental chart') || text.includes('periodontal probing') || text.includes('tooth #') || text.includes('perio pocket') || text.includes('amalgam restoration')) return 'DentalChart';
    if (text.includes('allergy') || text.includes('skin prick test') || text.includes('ige') || text.includes('wheal and flare') || text.includes('immunotherapy')) return 'AllergyImmunology';
    if (text.includes('vendor assessment') || text.includes('tpir') || text.includes('third party risk') || text.includes('soc 2 type ii') || text.includes('sig questionnaire')) return 'VendorAssessment';

    // 9. Coding & Cyber
    if (text.includes('github actions') || text.includes('gitlab-ci') || text.includes('jenkins build') || text.includes('pipeline failure') || text.includes('npm test')) return 'CICDLog';
    if (text.includes('siem') || text.includes('splunk') || text.includes('crowdstrike') || text.includes('mitre att&ck') || text.includes('t1059') || text.includes('soc alert')) return 'SIEMThreat';
    if (text.includes('saml') || text.includes('samlresponse') || text.includes('scim') || text.includes('urn:ietf:params:scim') || text.includes('assertion')) return 'SAML_SCIM';
    if (text.includes('itsm') || text.includes('servicenow') || text.includes('change request') || text.includes('cab approval') || text.includes('rollback plan')) return 'ITSM_ChangeManagement';
    if (text.includes('mft') || text.includes('prefetch') || text.includes('volatility') || text.includes('memory dump') || text.includes('incident response') || text.includes('autopsy')) return 'DigitalForensics';
    if (text.includes('ofac sdn') || text.includes('sanctions') || text.includes('bis entity list') || text.includes('export administration regulations') || text.includes('eccn')) return 'TradeSanctions';
    if (text.includes('semiconductor fab') || text.includes('wafer') || text.includes('lithography') || text.includes('die yield') || text.includes('euv') || text.includes('sec/gem')) return 'SemiconductorFab';
    if (text.includes('ate test') || text.includes('stdf') || text.includes('teradyne') || text.includes('advantest') || text.includes('binning') || text.includes('parametric test')) return 'ATE_Semiconductor';
    if (text.includes('netflow') || text.includes('ipfix') || text.includes('bgp route') || text.includes('sflow') || text.includes('packet loss') || text.includes('interface gigabit')) return 'NetworkTelemetry';
    if (text.includes('cdr') || text.includes('call detail record') || text.includes('imsi') || text.includes('imei') || text.includes('cell tower') || text.includes('call duration')) return 'TelecomCDR';

    // 10. Aerospace
    if (text.includes('in-flight connectivity') || text.includes('ifc') || text.includes('ku-band') || text.includes('ka-band') || text.includes('gogo') || text.includes('viasat')) return 'AviationIFC';
    if (text.includes('part 107') || text.includes('uav') || text.includes('drone') || text.includes('laanc') || text.includes('remote id') || text.includes('metar')) return 'UAV_Part107';
    if (text.includes('deicing') || text.includes('holdover time') || text.includes('hot') || text.includes('type iv fluid') || text.includes('anti-icing')) return 'AircraftDeicing';
    if (text.includes('atc') || text.includes('clearance delivery') || text.includes('squawk') || text.includes('flight level') || text.includes('radar contact')) return 'AirTrafficControl';
    if (text.includes('form 8130-3') || text.includes('easa form 1') || text.includes('airworthiness directive') || text.includes('ad compliance') || text.includes('aircraft mro')) return 'AviationMaintenance';
    if (text.includes('pilot logbook') || text.includes('pic time') || text.includes('cross-country') || text.includes('instrument approach') || text.includes('night landings')) return 'PilotFlightLog';
    if (text.includes('flight data recorder') || text.includes('fdr') || text.includes('arinc 717') || text.includes('pitch attitude') || text.includes('n1 spool')) return 'FlightTelemetry';
    if (text.includes('ccsds') || text.includes('telemetry frame') || text.includes('satellite bus') || text.includes('reaction wheel') || text.includes('solar array current')) return 'SatelliteTelemetry';
    if (text.includes('rocket telemetry') || text.includes('meco') || text.includes('seco') || text.includes('stage separation') || text.includes('thrust profile')) return 'RocketTelemetry';
    if (text.includes('docsis') || text.includes('snr') || text.includes('cmts') || text.includes('downstream power') || text.includes('pon oit') || text.includes('fiber loss')) return 'DocsisFiber';

    // 11. Automation & Infrastructure
    if (text.includes('autonomous vehicle') || text.includes('disengagement') || text.includes('lidar perception') || text.includes('path planner') || text.includes('ego vehicle')) return 'AutonomousVehicleLog';
    if (text.includes('crash test') || text.includes('hic15') || text.includes('ncap') || text.includes('hybrid iii') || text.includes('iihs')) return 'NhtsaCrashTest';
    if (text.includes('ntcip') || text.includes('traffic signal') || text.includes('split failure') || text.includes('evp preemption')) return 'MunicipalTrafficSignal';
    if (text.includes('plc') || text.includes('controllogix') || text.includes('ladder logic') || text.includes('e-stop circuit') || text.includes('vfd fault')) return 'IndustrialPLC';
    if (text.includes('bacnet') || text.includes('building automation') || text.includes('chiller cop') || text.includes('ahu-') || text.includes('vav')) return 'BuildingAutomation';
    if (text.includes('structural health') || text.includes('shm') || text.includes('microstrain') || text.includes('modal frequency') || text.includes('fbg')) return 'StructuralHealth';

    // 12. Supply Chain
    if (text.includes('856') || text.includes('asn') || text.includes('sscc-18') || text.includes('advance ship notice') || text.includes('n1*sf')) return 'EDI_856_ASN';
    if (text.includes('cold chain') || text.includes('temptale') || text.includes('mean kinetic temperature') || text.includes('mkt') || text.includes('thermal excursion')) return 'ColdChainIoT';
    if (text.includes('cbp form 7501') || text.includes('hts') || text.includes('entry summary') || text.includes('importer of record') || text.includes('merchandise processing fee')) return 'CustomsEntry7501';
    if (text.includes('hazmat') || text.includes('un1993') || text.includes('un3480') || text.includes('chemtrec') || text.includes('dangerous goods')) return 'HazmatShipping';
    if (text.includes('edi 404') || text.includes('rail waybill') || text.includes('stcc') || text.includes('rule 260') || text.includes('railcar')) return 'EDI_404_RailWaybill';
    if (text.includes('tdr') || text.includes('baplie') || text.includes('gmph') || text.includes('container terminal') || text.includes('stevedoring')) return 'MaritimeContainerTDR';
    if (text.includes('dscsa') || text.includes('epcis') || text.includes('sgtin') || text.includes('drug supply chain') || text.includes('ndc')) return 'PharmaceuticalTrackTrace';
    if (text.includes('ewr') || text.includes('grain elevator') || text.includes('bushels') || text.includes('fgis') || text.includes('test weight')) return 'GrainElevatorWarehouse';
    if (text.includes('840 rfid') || text.includes('ecvi') || text.includes('livestock') || text.includes('premises id') || text.includes('head count')) return 'LivestockTraceability';
    if (text.includes('fsc') || text.includes('pefc') || text.includes('mbf') || text.includes('timber') || text.includes('scribner')) return 'ForestFscTimber';

    // 13. Energy & Mining
    if (text.includes('synchrophasor') || text.includes('pmu') || text.includes('ieee c37.118') || text.includes('grid scada') || text.includes('rocof')) return 'ElectricGridSCADA';
    if (text.includes('spds') || text.includes('mwth') || text.includes('reactor coolant') || text.includes('rcs pressure') || text.includes('nuclear power plant')) return 'NuclearPlantSafety';
    if (text.includes('nerc cip') || text.includes('bes cyber asset') || text.includes('electronic security perimeter') || text.includes('cip-005')) return 'NercCipGrid';
    if (text.includes('wind turbine') || text.includes('wtg') || text.includes('anemometer') || text.includes('yaw misalignment') || text.includes('vestas')) return 'WindTurbineSCADA';
    if (text.includes('sunspec') || text.includes('solar pv') || text.includes('inverter skid') || text.includes('ghi') || text.includes('mppt')) return 'SolarInverterTelemetry';
    if (text.includes('witsml') || text.includes('mwd') || text.includes('lwd') || text.includes('rate of penetration') || text.includes('drilling rig')) return 'OffshoreDrillingWITSML';
    if (text.includes('minestar') || text.includes('haul truck') || text.includes('tkph') || text.includes('open-pit') || text.includes('modular dispatch')) return 'MiningFleet';

    // 14. Media & Entertainment
    if (text.includes('openrtb') || text.includes('bid request') || text.includes('cpm') || text.includes('crid') || text.includes('publisher app')) return 'OpenRTB_AdTech';
    if (text.includes('scte-35') || text.includes('scte-104') || text.includes('splice_insert') || text.includes('time_signal') || text.includes('upid')) return 'BroadcastSCTE35';
    if (text.includes('vmaf') || text.includes('svt-av1') || text.includes('transcoding') || text.includes('ssim') || text.includes('video encoding')) return 'VideoEncodingVMAF';
    if (text.includes('anti-cheat') || text.includes('aimbot') || text.includes('hwid ban') || text.includes('vanguard') || text.includes('battleye')) return 'GamingAntiCheat';
    if (text.includes('cwr') || text.includes('iswc') || text.includes('ipi') || text.includes('music publishing') || text.includes('mechanical royalty')) return 'MusicPublishingCWR';
    if (text.includes('dcp') || text.includes('kdm') || text.includes('cpl') || text.includes('jpeg 2000 dci') || text.includes('digital cinema')) return 'FilmDcpKdm';
    if (text.includes('gds') || text.includes('hotel reservation') || text.includes('adr') || text.includes('check-in') || text.includes('room category')) return 'HospitalityGDS';
    if (text.includes('pnr') || text.includes('e-ticket') || text.includes('record locator') || text.includes('airline passenger') || text.includes('ssr vgml')) return 'AirlinePNR';
    if (text.includes('powerball') || text.includes('lottery') || text.includes('power play') || text.includes('central gaming system') || text.includes('quick pick')) return 'LotteryGaming';
    if (text.includes('statcast') || text.includes('hawk-eye') || text.includes('exit velocity') || text.includes('spin rate') || text.includes('xba')) return 'SportsOpticalTracking';

    // 15. HR, Education & Gov
    if (text.includes('sam.gov') || text.includes('solicitation') || text.includes('fedbizopps') || text.includes('far part 52') || text.includes('set-aside')) return 'SamGovFedBizOpps';
    if (text.includes('83(b)') || text.includes('section 83b') || text.includes('restricted stock purchase') || text.includes('founder equity')) return 'Firms83bTax';
    if (text.includes('moral character') || text.includes('state bar') || text.includes('ncbe') || text.includes('bar admission')) return 'StateBarMoralCharacter';
    if (text.includes('ipeds') || text.includes('unitid') || text.includes('cohort default rate') || text.includes('pell grant') || text.includes('higher education')) return 'HigherEdIPEDS';
    if (text.includes('wais-iv') || text.includes('wisc-v') || text.includes('fsiq') || text.includes('neuropsychological') || text.includes('dsm-5')) return 'ClinicalPsychIQ';
    if (text.includes('form 990') || text.includes('501(c)(3)') || text.includes('501c3') || text.includes('program expense ratio') || text.includes('schedule j')) return 'NonProfit990';
    if (text.includes('nih') || text.includes('r01') || text.includes('specific aims') || text.includes('impact score') || text.includes('study section')) return 'NIHGrant';
    if (text.includes('form i-9') || text.includes('e-verify') || text.includes('work authorization') || text.includes('list a document') || text.includes('uscis')) return 'HRI9EVerify';
    if (text.includes('form 5500') || text.includes('erisa') || text.includes('401(k)') || text.includes('schedule h') || text.includes('plan sponsor')) return 'ErisaForm5500';
    if (text.includes('naupa') || text.includes('unclaimed property') || text.includes('escheatment') || text.includes('dormancy')) return 'UnclaimedProperty';

    // 16. Aerospace & Defense
    if (text.includes('itar') || text.includes('ddtc') || text.includes('dsp-5') || text.includes('usml') || text.includes('dsp-83')) return 'ITAR_DefenseExport';
    if (text.includes('cmmc') || text.includes('sprs') || text.includes('nist sp 800-171') || text.includes('cui enclave') || text.includes('c3pao')) return 'CMMC_Cybersecurity';
    if (text.includes('dcaa') || text.includes('incurred cost') || text.includes('ice model') || text.includes('indirect rates') || text.includes('far 31.205')) return 'DCAA_IncurredCost';
    if (text.includes('as9100') || text.includes('oasis oin') || text.includes('pear process') || text.includes('iaqg') || text.includes('as9102')) return 'AS9100_AerospaceQuality';
    if (text.includes('npr 8715') || text.includes('nasa-std') || text.includes('hazard report') || text.includes('fmea/cil') || text.includes('nesc')) return 'NASA_SafetyMission';

    // 17. Maritime & Shipping
    if (text.includes('vgm') || text.includes('solas') || text.includes('vermas') || text.includes('verified gross mass') || text.includes('weighbridge')) return 'SOLAS_VGM';
    if (text.includes('marpol') || text.includes('annex vi') || text.includes('bunker delivery note') || text.includes('bdn') || text.includes('vlsfo')) return 'MARPOL_Annex6';
    if (text.includes('iacs') || text.includes('special survey') || text.includes('ultrasonic thickness') || text.includes('utm') || text.includes('conditions of class')) return 'ShipClassificationIACS';
    if (text.includes('isps') || text.includes('enoad') || text.includes('ship security') || text.includes('declaration of security') || text.includes('issc')) return 'ISPS_PortSecurity';
    if (text.includes('bill of lading') || text.includes('b/l no') || text.includes('sea waybill') || text.includes('clean on board') || text.includes('hague-visby')) return 'BillOfLadingOcean';

    // 18. Energy Utilities & Safety
    if (text.includes('ferc form 1') || text.includes('ferc form no. 1') || text.includes('electric plant in service') || text.includes('account 101') || text.includes('account 400')) return 'FERC_Form1';
    if (text.includes('phmsa') || text.includes('smart pig') || text.includes('49 cfr 192') || text.includes('ili tool') || text.includes('metal loss')) return 'PHMSA_PipelineIntegrity';
    if (text.includes('10 cfr 72') || text.includes('dry cask') || text.includes('isfsi') || text.includes('hi-storm') || text.includes('spent fuel')) return 'NuclearWasteDryCask';
    if (text.includes('npdes') || text.includes('discharge monitoring report') || text.includes('dmr') || text.includes('clean water act') || text.includes('outfall 001')) return 'EPA_NPDES_WaterDischarge';
    if (text.includes('29 cfr 1910.119') || text.includes('psm') || text.includes('process safety management') || text.includes('hazop') || text.includes('pssr')) return 'OSHA_1910_PSM';

    // 19. Commercial Banking & Treasury
    if (text.includes('mt103') || text.includes(':32a:') || text.includes(':50k:') || text.includes(':59:') || text.includes('uetr')) return 'SWIFT_MT103';
    if (text.includes('mt700') || text.includes(':40a:') || text.includes(':31d:') || text.includes(':45a:') || text.includes(':46a:')) return 'SWIFT_MT700';
    if (text.includes('nacha') || text.includes('ppd') || text.includes('ccd') || text.includes('ctx') || text.includes('routing transit number')) return 'ACH_NACHA';
    if (text.includes('bai2') || text.includes('record 03') || text.includes('code 010') || text.includes('code 040') || text.includes('closing available balance')) return 'BAI2_BankStatement';
    if (text.includes('lockbox') || text.includes('wholesale lockbox') || text.includes('remitter') || text.includes('check count') || text.includes('micr line')) return 'TreasuryLockbox';

    // 20. Semiconductor IC & EDA
    if (text.includes('gdsii') || text.includes('oasis v1.0') || text.includes('tapeout') || text.includes('top cell') || text.includes('mask data prep')) return 'GDSII_Tapeout';
    if (text.includes('spice') || text.includes('spectre') || text.includes('.tran') || text.includes('.pss') || text.includes('pvt corner')) return 'SPICE_Simulation';
    if (text.includes('drc') || text.includes('lvs') || text.includes('calibre') || text.includes('design rule check') || text.includes('layout versus schematic')) return 'DRC_LVS_Verification';
    if (text.includes('sta') || text.includes('primetime') || text.includes('worst negative slack') || text.includes('wns') || text.includes('critical timing path')) return 'StaticTimingSTA';
    if (text.includes('iso 14644') || text.includes('cleanroom') || text.includes('particle counter') || text.includes('ulpa filter') || text.includes('foup')) return 'CleanroomParticleISO';

    // 21. Telecom & 5G Infrastructure
    if (text.includes('5g sa') || text.includes('ngap') || text.includes('5qi') || text.includes('suci') || text.includes('pdu session')) return 'FiveG_ControlPlane';
    if (text.includes('o-ran') || text.includes('ecpri') || text.includes('o-du') || text.includes('o-ru') || text.includes('block floating point')) return 'OpenRAN_Fronthaul';
    if (text.includes('subsea') || text.includes('otdr') || text.includes('g.654.d') || text.includes('repeater') || text.includes('optical attenuation')) return 'SubseaFiberOTDR';
    if (text.includes('volte') || text.includes('ims sip') || text.includes('p-cscf') || text.includes('s-cscf') || text.includes('evs codec')) return 'VoLTE_IMSSIP';
    if (text.includes('p25') || text.includes('apco') || text.includes('wacn') || text.includes('tgid') || text.includes('trunked radio')) return 'Satellite_P25Radio';

    return 'Generic';
  }

  public static clear(): void {
    const optimizer = this.getInstance();
    optimizer.masterTable.clear();
  }
}
