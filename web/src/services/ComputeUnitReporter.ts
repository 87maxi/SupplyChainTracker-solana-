/**
 * Compute Unit Reporter Service
 *
 * Estimates compute unit costs for SupplyChainTracker instructions
 * based on the Rust-side CU measurement analysis.
 *
 * Solana compute budget:
 * - Default limit: 1,470,000 CU per transaction
 * - Estimates help predict transaction success and optimize batch sizes
 */

// ==================== Constants ====================

/** Default Solana compute unit limit per transaction */
export const DEFAULT_CU_LIMIT = 1_470_000;

/** Risk thresholds as percentage of CU limit */
export const RISK_THRESHOLDS = {
  LOW: 10,
  MEDIUM: 25,
  HIGH: 50,
  CRITICAL: 100,
};

// ==================== Types ====================

export interface CuEstimate {
  /** Instruction name */
  instruction: string;
  /** Estimated compute units */
  estimatedCu: number;
  /** Percentage of default CU limit */
  percentOfLimit: number;
  /** Risk level: LOW | MEDIUM | HIGH | CRITICAL */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Account reads required */
  accountReads: number;
  /** Account writes required */
  accountWrites: number;
  /** Has CPI calls */
  hasCpi: boolean;
  /** Emits events/logs */
  emitsEvents: boolean;
}

export interface BatchCuEstimate {
  /** Instruction name */
  instruction: string;
  /** Batch size */
  batchSize: number;
  /** Total estimated compute units for batch */
  totalCu: number;
  /** Percentage of default CU limit */
  percentOfLimit: number;
  /** Risk level */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Maximum safe batch size for single transaction */
  maxSafeBatchSize: number;
}

export interface LifecycleCuReport {
  /** Total CU for complete netbook lifecycle */
  totalCu: number;
  /** Number of transactions */
  transactionCount: number;
  /** Average CU per transaction */
  averageCuPerTx: number;
  /** Individual step estimates */
  steps: CuEstimate[];
}

// ==================== Instruction CU Estimates ====================

/**
 * Pre-calculated CU estimates from Rust-side analysis.
 * These values are derived from account sizes, instruction data,
 * CPI calls, and log emissions.
 */
const INSTRUCTION_ESTIMATES: Record<string, Omit<CuEstimate, 'percentOfLimit' | 'riskLevel'>> = {
  fund_deployer: {
    instruction: 'fund_deployer',
    estimatedCu: 20_280,
    accountReads: 2,
    accountWrites: 1,
    hasCpi: true,
    emitsEvents: false,
  },
  initialize: {
    instruction: 'initialize',
    estimatedCu: 21_200,
    accountReads: 2,
    accountWrites: 1,
    hasCpi: true,
    emitsEvents: true,
  },
  register_netbook: {
    instruction: 'register_netbook',
    estimatedCu: 20_800,
    accountReads: 4,
    accountWrites: 3,
    hasCpi: true,
    emitsEvents: true,
  },
  audit_hardware: {
    instruction: 'audit_hardware',
    estimatedCu: 14_600,
    accountReads: 3,
    accountWrites: 1,
    hasCpi: false,
    emitsEvents: true,
  },
  validate_software: {
    instruction: 'validate_software',
    estimatedCu: 14_500,
    accountReads: 3,
    accountWrites: 1,
    hasCpi: false,
    emitsEvents: true,
  },
  assign_to_student: {
    instruction: 'assign_to_student',
    estimatedCu: 14_800,
    accountReads: 3,
    accountWrites: 1,
    hasCpi: false,
    emitsEvents: true,
  },
  grant_role: {
    instruction: 'grant_role',
    estimatedCu: 23_150,
    accountReads: 5,
    accountWrites: 2,
    hasCpi: true,
    emitsEvents: true,
  },
  request_role: {
    instruction: 'request_role',
    estimatedCu: 21_150,
    accountReads: 3,
    accountWrites: 2,
    hasCpi: true,
    emitsEvents: true,
  },
  approve_role_request: {
    instruction: 'approve_role_request',
    estimatedCu: 10_200,
    accountReads: 3,
    accountWrites: 2,
    hasCpi: false,
    emitsEvents: true,
  },
  revoke_role: {
    instruction: 'revoke_role',
    estimatedCu: 10_150,
    accountReads: 3,
    accountWrites: 2,
    hasCpi: false,
    emitsEvents: true,
  },
  query_netbook_state: {
    instruction: 'query_netbook_state',
    estimatedCu: 7_200,
    accountReads: 3,
    accountWrites: 0,
    hasCpi: false,
    emitsEvents: true,
  },
  query_config: {
    instruction: 'query_config',
    estimatedCu: 6_200,
    accountReads: 2,
    accountWrites: 0,
    hasCpi: false,
    emitsEvents: true,
  },
  query_role: {
    instruction: 'query_role',
    estimatedCu: 6_150,
    accountReads: 2,
    accountWrites: 0,
    hasCpi: false,
    emitsEvents: true,
  },
};

// ==================== Helper Functions ====================

function calculateRiskLevel(percent: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (percent < RISK_THRESHOLDS.LOW) return 'LOW';
  if (percent < RISK_THRESHOLDS.MEDIUM) return 'MEDIUM';
  if (percent < RISK_THRESHOLDS.HIGH) return 'HIGH';
  return 'CRITICAL';
}

function buildEstimate(base: Omit<CuEstimate, 'percentOfLimit' | 'riskLevel'>): CuEstimate {
  const percent = (base.estimatedCu / DEFAULT_CU_LIMIT) * 100;
  return {
    ...base,
    percentOfLimit: Math.round(percent * 100) / 100,
    riskLevel: calculateRiskLevel(percent),
  };
}

// ==================== Public API ====================

/**
 * Get CU estimate for a single instruction
 */
export function getInstructionEstimate(instruction: string): CuEstimate | null {
  const base = INSTRUCTION_ESTIMATES[instruction];
  if (!base) return null;
  return buildEstimate(base);
}

/**
 * Get CU estimate for batch registration
 * @param batchSize - Number of netbooks to register in batch
 */
export function getBatchEstimate(batchSize: number): BatchCuEstimate {
  if (batchSize < 1) {
    throw new Error('Batch size must be at least 1');
  }

  // Per-netbook overhead: ~2,000 CU base + CPI + account creation
  const perNetbookCu = 2_000 + 10_000 + 500;
  // Base instruction overhead
  const baseCu = 5_000 + 1_000;
  // Instruction data: ~80 bytes per netbook * 10 CU/byte
  const dataCu = 80 * batchSize * 10;

  const totalCu = baseCu + perNetbookCu * batchSize + dataCu;
  const percent = (totalCu / DEFAULT_CU_LIMIT) * 100;

  // Calculate max safe batch size (stays under 80% of limit)
  const maxSafeBatchSize = Math.floor((DEFAULT_CU_LIMIT * 0.8 - baseCu - dataCu / batchSize) / perNetbookCu);

  return {
    instruction: 'register_netbooks_batch',
    batchSize,
    totalCu,
    percentOfLimit: Math.round(percent * 100) / 100,
    riskLevel: calculateRiskLevel(percent),
    maxSafeBatchSize: Math.max(1, maxSafeBatchSize),
  };
}

/**
 * Get complete lifecycle CU report
 * (register → audit → validate → assign)
 */
export function getLifecycleReport(): LifecycleCuReport {
  const steps = [
    buildEstimate(INSTRUCTION_ESTIMATES.register_netbook),
    buildEstimate(INSTRUCTION_ESTIMATES.audit_hardware),
    buildEstimate(INSTRUCTION_ESTIMATES.validate_software),
    buildEstimate(INSTRUCTION_ESTIMATES.assign_to_student),
  ];

  const totalCu = steps.reduce((sum, step) => sum + step.estimatedCu, 0);

  return {
    totalCu,
    transactionCount: steps.length,
    averageCuPerTx: Math.round(totalCu / steps.length),
    steps,
  };
}

/**
 * Get all instruction estimates sorted by CU cost
 */
export function getAllEstimates(): CuEstimate[] {
  return Object.values(INSTRUCTION_ESTIMATES)
    .map(buildEstimate)
    .sort((a, b) => b.estimatedCu - a.estimatedCu);
}

/**
 * Check if a transaction will likely succeed based on CU estimate
 * @param instruction - Instruction name
 * @param availableCu - Available compute units (default: standard limit)
 */
export function willTransactionSucceed(
  instruction: string,
  availableCu: number = DEFAULT_CU_LIMIT
): boolean {
  const estimate = getInstructionEstimate(instruction);
  if (!estimate) return true; // Unknown instruction, assume OK
  return estimate.estimatedCu < availableCu;
}

/**
 * Get recommended compute unit limit for an instruction with safety margin
 * @param instruction - Instruction name
 * @param margin - Safety margin percentage (default: 20%)
 */
export function getRecommendedCuLimit(
  instruction: string,
  margin: number = 20
): number | null {
  const estimate = getInstructionEstimate(instruction);
  if (!estimate) return null;
  return Math.ceil(estimate.estimatedCu * (1 + margin / 100));
}

/**
 * Format CU estimate as human-readable string
 */
export function formatCuEstimate(estimate: CuEstimate): string {
  return `${estimate.instruction}: ~${estimate.estimatedCu.toLocaleString()} CU (${estimate.percentOfLimit.toFixed(2)}% of limit) [${estimate.riskLevel}]`;
}

/**
 * Generate a markdown report of all CU estimates
 */
export function generateMarkdownReport(): string {
  const estimates = getAllEstimates();

  let report = '# Compute Unit Report - SupplyChainTracker\n\n';
  report += `**Default CU Limit**: ${DEFAULT_CU_LIMIT.toLocaleString()}\n\n`;
  report += '| Instruction | Estimated CU | % of Limit | Risk Level |\n';
  report += '|-------------|-------------|------------|------------|\n';

  for (const est of estimates) {
    report += `| ${est.instruction} | ${est.estimatedCu.toLocaleString()} | ${est.percentOfLimit.toFixed(2)}% | ${est.riskLevel} |\n`;
  }

  // Lifecycle summary
  const lifecycle = getLifecycleReport();
  report += '\n## Full Lifecycle Summary\n\n';
  report += `- **Total CU**: ${lifecycle.totalCu.toLocaleString()} (4 transactions)\n`;
  report += `- **Average per Transaction**: ${lifecycle.averageCuPerTx.toLocaleString()} CU\n`;

  return report;
}

// ==================== Singleton Service ====================

export class ComputeUnitReporter {
  private static instance: ComputeUnitReporter;

  static getInstance(): ComputeUnitReporter {
    if (!ComputeUnitReporter.instance) {
      ComputeUnitReporter.instance = new ComputeUnitReporter();
    }
    return ComputeUnitReporter.instance;
  }

  getInstructionEstimate(instruction: string): CuEstimate | null {
    return getInstructionEstimate(instruction);
  }

  getBatchEstimate(batchSize: number): BatchCuEstimate {
    return getBatchEstimate(batchSize);
  }

  getLifecycleReport(): LifecycleCuReport {
    return getLifecycleReport();
  }

  getAllEstimates(): CuEstimate[] {
    return getAllEstimates();
  }

  willTransactionSucceed(instruction: string, availableCu?: number): boolean {
    return willTransactionSucceed(instruction, availableCu);
  }

  getRecommendedCuLimit(instruction: string, margin?: number): number | null {
    return getRecommendedCuLimit(instruction, margin);
  }

  generateReport(): string {
    return generateMarkdownReport();
  }
}
