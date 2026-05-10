/**
 * Edge Cases and Error Handling Tests
 *
 * Comprehensive tests for edge cases in netbook operations, role management,
 * and state machine transitions. Validates specific error codes and boundary
 * conditions.
 *
 * Related Issues:
 * - Issue #188: Phase 3 - Test Coverage for Edge Cases and Error Handling
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { ScSolana } from "../target/types/sc_solana";
import { expect } from "chai";
import {
  Keypair,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

// Import test helpers
import {
  NetbookState,
  ROLE_TYPES,
  createHash,
  createSerialNumber,
  createBatchId,
  createModelSpecs,
  getConfigPda,
  getNetbookPda,
  getSerialHashRegistryPda,
  getRoleRequestPda,
  getRoleHolderPda,
  getAdminPda,
  fundKeypair,
  fundAndInitialize,
  waitForConfirmation,
  HardwareAuditData,
  SoftwareValidationData,
  createSerialOfLength,
  createModelSpecOfLength,
  expectError,
  createSpecialCharsSerial,
  createLongRoleName,
} from "./test-helpers";

// ============================================================================
// Test Data Constants
// ============================================================================

const TEST_NETBOOK = {
  serialNumber: createSerialNumber("NB", 100),
  batchId: createBatchId("MFG", 2024, 100),
  initialModelSpecs: createModelSpecs("TestBrand", "ProBook", 2024),
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Grant role with proper account setup
 */
async function grantRole(
  program: Program<ScSolana>,
  configPda: PublicKey,
  adminPda: PublicKey,
  accountToGrant: Keypair,
  role: string
): Promise<string> {
  const signature = await program.methods
    .grantRole(role)
    .accountsStrict({
      config: configPda,
      admin: adminPda,
      accountToGrant: accountToGrant.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([accountToGrant])
    .rpc();
  return signature;
}

/**
 * Register a netbook and return token ID
 */
async function registerNetbook(
  program: Program<ScSolana>,
  configPda: PublicKey,
  serialHashRegistryPda: PublicKey,
  manufacturer: Keypair,
  serialNumber: string,
  batchId: string,
  modelSpecs: string
): Promise<bigint> {
  const txSig = await program.methods
    .registerNetbook(serialNumber, batchId, modelSpecs)
    .accountsStrict({
      config: configPda,
      serialHashRegistry: serialHashRegistryPda,
      manufacturer: manufacturer.publicKey,
      netbook: getNetbookPda(1, program.programId),
      systemProgram: SystemProgram.programId,
    })
    .signers([manufacturer])
    .rpc();

  await waitForConfirmation(
    anchor.getProvider() as AnchorProvider,
    txSig,
    30000
  );

  return BigInt(1);
}

/**
 * Helper to get error code from transaction failure
 */
function extractErrorCode(error: any): string {
  const message = error?.message || error?.toString() || "";

  // Try to extract error code from Anchor error message
  // Format: "Transaction failed: Error: 6001: InvalidStateTransition"
  const codeMatch = message.match(/(\d{4,5}):/);
  if (codeMatch) {
    return codeMatch[1];
  }

  // Try to extract from Anchor program error format
  const programErrorMatch = message.match(/Program error: (\w+)/);
  if (programErrorMatch) {
    return programErrorMatch[1];
  }

  // Try to extract from custom error message
  const customErrorMatch = message.match(/Error Code: (\w+)/);
  if (customErrorMatch) {
    return customErrorMatch[1];
  }

  // Try to match known error names
  const errorNames = [
    "InvalidStateTransition",
    "RoleAlreadyGranted",
    "EmptySerial",
    "StringTooLong",
    "ArrayLengthMismatch",
    "DuplicateSerial",
    "Unauthorized",
    "RoleNotFound",
    "InvalidInput",
    "AccountNotInitialized",
  ];
  for (const name of errorNames) {
    if (message.includes(name)) {
      return name;
    }
  }

  return "Unknown";
}

// ============================================================================
// Edge Cases: Netbook Registration
// ============================================================================

describe("Edge Cases - Netbook Registration", function () {
  this.timeout(120000);

  let provider: AnchorProvider;
  let program: Program<ScSolana>;
  let accounts: Record<string, Keypair>;
  let configPda: PublicKey;
  let adminPda: PublicKey;
  let serialHashRegistryPda: PublicKey;

  before(async () => {
    provider = AnchorProvider.local();
    program = (await anchor.Program.at(
      "7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb",
      provider
    )) as Program<ScSolana>;

    // Generate test accounts
    accounts = {
      admin: Keypair.generate(),
      fabricante: Keypair.generate(),
      auditor: Keypair.generate(),
      technician: Keypair.generate(),
      school: Keypair.generate(),
      randomUser: Keypair.generate(),
    };

    // Fund all accounts
    for (const [, kp] of Object.entries(accounts)) {
      await fundKeypair(provider, kp, 2);
    }

    // Initialize program
    await fundAndInitialize(program, provider, accounts.admin, 20 * LAMPORTS_PER_SOL);

    // Get PDAs
    [configPda] = getConfigPda(program);
    [adminPda] = getAdminPda(configPda, program.programId);
    serialHashRegistryPda = getSerialHashRegistryPda(configPda, program.programId);
  });

  describe("Serial Number Edge Cases", function () {
    it("should accept serial number exactly at 200 character limit", async function () {
      const serial200 = createSerialOfLength(200, "NB");
      expect(serial200.length).to.equal(200);

      const signature = await program.methods
        .registerNetbook(serial200, "BATCH-TEST", createModelSpecs("Test", "Model", 2024))
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: accounts.fabricante.publicKey,
          netbook: getNetbookPda(2, program.programId),
          systemProgram: SystemProgram.programId,
        })
        .signers([accounts.fabricante])
        .rpc();

      await waitForConfirmation(provider, signature, 30000);
    });

    it("should reject serial number exceeding 200 characters", async function () {
      const serial201 = createSerialOfLength(201, "NB");
      expect(serial201.length).to.equal(201);

      await expectError(
        program.methods
          .registerNetbook(serial201, "BATCH-TEST", createModelSpecs("Test", "Model", 2024))
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: accounts.fabricante.publicKey,
            netbook: getNetbookPda(3, program.programId),
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.fabricante])
          .rpc(),
        "StringTooLong"
      );
    });

    it("should reject empty serial number", async function () {
      await expectError(
        program.methods
          .registerNetbook("", "BATCH-TEST", createModelSpecs("Test", "Model", 2024))
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: accounts.fabricante.publicKey,
            netbook: getNetbookPda(4, program.programId),
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.fabricante])
          .rpc(),
        "EmptySerial"
      );
    });

    it("should accept serial number with special characters (spaces, hyphens, accents)", async function () {
      const serialSpecial = createSpecialCharsSerial();

      const signature = await program.methods
        .registerNetbook(serialSpecial, "BATCH-TEST", createModelSpecs("Test", "Model", 2024))
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: accounts.fabricante.publicKey,
          netbook: getNetbookPda(5, program.programId),
          systemProgram: SystemProgram.programId,
        })
        .signers([accounts.fabricante])
        .rpc();

      await waitForConfirmation(provider, signature, 30000);
    });

    it("should accept serial number with unicode characters", async function () {
      const serialUnicode = "NB-日本語-テスト-🔒-12345";

      const signature = await program.methods
        .registerNetbook(serialUnicode, "BATCH-TEST", createModelSpecs("Test", "Model", 2024))
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: accounts.fabricante.publicKey,
          netbook: getNetbookPda(6, program.programId),
          systemProgram: SystemProgram.programId,
        })
        .signers([accounts.fabricante])
        .rpc();

      await waitForConfirmation(provider, signature, 30000);
    });
  });

  describe("Model Specs Edge Cases", function () {
    it("should accept empty model specs", async function () {
      const signature = await program.methods
        .registerNetbook("NB-EMPTY-MODEL-001", "BATCH-TEST", "")
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: accounts.fabricante.publicKey,
          netbook: getNetbookPda(7, program.programId),
          systemProgram: SystemProgram.programId,
        })
        .signers([accounts.fabricante])
        .rpc();

      await waitForConfirmation(provider, signature, 30000);
    });

    it("should accept model specs exactly at 500 character limit", async function () {
      const modelSpec500 = createModelSpecOfLength(500);
      expect(modelSpec500.length).to.equal(500);

      const signature = await program.methods
        .registerNetbook("NB-LONG-MODEL-001", "BATCH-TEST", modelSpec500)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: accounts.fabricante.publicKey,
          netbook: getNetbookPda(8, program.programId),
          systemProgram: SystemProgram.programId,
        })
        .signers([accounts.fabricante])
        .rpc();

      await waitForConfirmation(provider, signature, 30000);
    });

    it("should reject model specs exceeding 500 characters", async function () {
      const modelSpec501 = createModelSpecOfLength(501);
      expect(modelSpec501.length).to.equal(501);

      await expectError(
        program.methods
          .registerNetbook("NB-OVER-MODEL-001", "BATCH-TEST", modelSpec501)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: accounts.fabricante.publicKey,
            netbook: getNetbookPda(9, program.programId),
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.fabricante])
          .rpc(),
        "StringTooLong"
      );
    });
  });

  describe("Batch ID Edge Cases", function () {
    it("should accept batch_id exactly at 100 character limit", async function () {
      const batch100 = "B".repeat(100);
      expect(batch100.length).to.equal(100);

      const signature = await program.methods
        .registerNetbook("NB-BATCH-LIMIT-001", batch100, "Test specs")
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: accounts.fabricante.publicKey,
          netbook: getNetbookPda(10, program.programId),
          systemProgram: SystemProgram.programId,
        })
        .signers([accounts.fabricante])
        .rpc();

      await waitForConfirmation(provider, signature, 30000);
    });

    it("should reject batch_id exceeding 100 characters", async function () {
      const batch101 = "B".repeat(101);
      expect(batch101.length).to.equal(101);

      await expectError(
        program.methods
          .registerNetbook("NB-BATCH-OVER-001", batch101, "Test specs")
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: accounts.fabricante.publicKey,
            netbook: getNetbookPda(11, program.programId),
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.fabricante])
          .rpc(),
        "StringTooLong"
      );
    });
  });

  describe("Duplicate Serial Handling", function () {
    it("should reject duplicate serial number", async function () {
      await expectError(
        program.methods
          .registerNetbook(TEST_NETBOOK.serialNumber, "BATCH-TEST", "Test specs")
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: accounts.fabricante.publicKey,
            netbook: getNetbookPda(12, program.programId),
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.fabricante])
          .rpc(),
        "DuplicateSerial"
      );
    });
  });
});

// ============================================================================
// Edge Cases: Role Management
// ============================================================================

describe("Edge Cases - Role Management", function () {
  this.timeout(120000);

  let provider: AnchorProvider;
  let program: Program<ScSolana>;
  let accounts: Record<string, Keypair>;
  let configPda: PublicKey;
  let adminPda: PublicKey;

  before(async () => {
    provider = AnchorProvider.local();
    program = (await anchor.Program.at(
      "7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb",
      provider
    )) as Program<ScSolana>;

    // Generate test accounts
    accounts = {
      admin: Keypair.generate(),
      fabricante: Keypair.generate(),
      auditor: Keypair.generate(),
      technician: Keypair.generate(),
      school: Keypair.generate(),
      randomUser: Keypair.generate(),
    };

    // Fund all accounts
    for (const [, kp] of Object.entries(accounts)) {
      await fundKeypair(provider, kp, 2);
    }

    // Initialize program
    await fundAndInitialize(program, provider, accounts.admin, 20 * LAMPORTS_PER_SOL);

    // Get PDAs
    [configPda] = getConfigPda(program);
    [adminPda] = getAdminPda(configPda, program.programId);
  });

  describe("Role Name Edge Cases", function () {
    it("should reject role request with empty string", async function () {
      await expectError(
        program.methods
          .requestRole("")
          .accountsStrict({
            config: configPda,
            roleRequest: getRoleRequestPda(accounts.randomUser.publicKey, program.programId),
            user: accounts.randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.randomUser])
          .rpc(),
        "RoleNotFound"
      );
    });

    it("should reject role request with invalid role name", async function () {
      const invalidRole = "INVALID_ROLE_NAME";

      await expectError(
        program.methods
          .requestRole(invalidRole)
          .accountsStrict({
            config: configPda,
            roleRequest: getRoleRequestPda(accounts.randomUser.publicKey, program.programId),
            user: accounts.randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.randomUser])
          .rpc(),
        "RoleNotFound"
      );
    });

    it("should reject role name that is too long", async function () {
      const longRole = createLongRoleName(300);

      await expectError(
        program.methods
          .requestRole(longRole)
          .accountsStrict({
            config: configPda,
            roleRequest: getRoleRequestPda(accounts.randomUser.publicKey, program.programId),
            user: accounts.randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.randomUser])
          .rpc(),
        "StringTooLong"
      );
    });

    it("should reject role name with special characters", async function () {
      const specialRole = "ROLE@#$%^&*()";

      await expectError(
        program.methods
          .requestRole(specialRole)
          .accountsStrict({
            config: configPda,
            roleRequest: getRoleRequestPda(accounts.randomUser.publicKey, program.programId),
            user: accounts.randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.randomUser])
          .rpc(),
        "RoleNotFound"
      );
    });
  });

  describe("Duplicate Role Grant Handling", function () {
    it("should reject granting a role that is already granted", async function () {
      // Grant role first time
      const sig1 = await grantRole(
        program,
        configPda,
        adminPda,
        accounts.auditor,
        ROLE_TYPES.AUDITOR_HW
      );
      await waitForConfirmation(provider, sig1, 30000);

      // Try to grant same role again
      await expectError(
        program.methods
          .grantRole(ROLE_TYPES.AUDITOR_HW)
          .accountsStrict({
            config: configPda,
            admin: adminPda,
            accountToGrant: accounts.auditor.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.auditor])
          .rpc(),
        "RoleAlreadyGranted"
      );
    });

    it("should reject role request for role user already has", async function () {
      // Grant role first
      const sig1 = await grantRole(
        program,
        configPda,
        adminPda,
        accounts.technician,
        ROLE_TYPES.TECNICO_SW
      );
      await waitForConfirmation(provider, sig1, 30000);

      // Try to request same role
      await expectError(
        program.methods
          .requestRole(ROLE_TYPES.TECNICO_SW)
          .accountsStrict({
            config: configPda,
            roleRequest: getRoleRequestPda(accounts.technician.publicKey, program.programId),
            user: accounts.technician.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.technician])
          .rpc(),
        "RoleAlreadyGranted"
      );
    });
  });

  describe("Multiple Role Requests", function () {
    it("should handle multiple role requests from same user (after reset)", async function () {
      const user = accounts.randomUser;

      // First request
      const sig1 = await program.methods
        .requestRole(ROLE_TYPES.AUDITOR_HW)
        .accountsStrict({
          config: configPda,
          roleRequest: getRoleRequestPda(user.publicKey, program.programId),
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      await waitForConfirmation(provider, sig1, 30000);

      // Reset the request
      const sig2 = await program.methods
        .resetRoleRequest()
        .accountsStrict({
          config: configPda,
          roleRequest: getRoleRequestPda(user.publicKey, program.programId),
          user: user.publicKey,
        })
        .signers([user])
        .rpc();
      await waitForConfirmation(provider, sig2, 30000);

      // Second request with different role
      const sig3 = await program.methods
        .requestRole(ROLE_TYPES.TECNICO_SW)
        .accountsStrict({
          config: configPda,
          roleRequest: getRoleRequestPda(user.publicKey, program.programId),
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      await waitForConfirmation(provider, sig3, 30000);
    });
  });
});

// ============================================================================
// Edge Cases: State Machine Transitions
// ============================================================================

describe("Edge Cases - State Machine", function () {
  this.timeout(120000);

  let provider: AnchorProvider;
  let program: Program<ScSolana>;
  let accounts: Record<string, Keypair>;
  let configPda: PublicKey;
  let adminPda: PublicKey;
  let serialHashRegistryPda: PublicKey;

  before(async () => {
    provider = AnchorProvider.local();
    program = (await anchor.Program.at(
      "7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb",
      provider
    )) as Program<ScSolana>;

    // Generate test accounts
    accounts = {
      admin: Keypair.generate(),
      fabricante: Keypair.generate(),
      auditor: Keypair.generate(),
      technician: Keypair.generate(),
      school: Keypair.generate(),
      randomUser: Keypair.generate(),
    };

    // Fund all accounts
    for (const [, kp] of Object.entries(accounts)) {
      await fundKeypair(provider, kp, 2);
    }

    // Initialize program
    await fundAndInitialize(program, provider, accounts.admin, 20 * LAMPORTS_PER_SOL);

    // Get PDAs
    [configPda] = getConfigPda(program);
    [adminPda] = getAdminPda(configPda, program.programId);
    serialHashRegistryPda = getSerialHashRegistryPda(configPda, program.programId);

    // Grant roles
    await grantRole(
      program,
      configPda,
      adminPda,
      accounts.auditor,
      ROLE_TYPES.AUDITOR_HW
    );
    await grantRole(
      program,
      configPda,
      adminPda,
      accounts.technician,
      ROLE_TYPES.TECNICO_SW
    );
  });

  describe("Invalid State Transitions", function () {
    it("should reject software validation before hardware audit (Fabricada → SwValidado)", async function () {
      const serial = "NB-INVALID-TRANS-001";

      // Register netbook (state = Fabricada)
      const sig1 = await program.methods
        .registerNetbook(serial, "BATCH-TEST", "Test specs")
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: accounts.fabricante.publicKey,
          netbook: getNetbookPda(20, program.programId),
          systemProgram: SystemProgram.programId,
        })
        .signers([accounts.fabricante])
        .rpc();
      await waitForConfirmation(provider, sig1, 30000);

      // Try to validate software without hardware audit (should fail)
      await expectError(
        program.methods
          .validateSoftware(serial, "Ubuntu 22.04", true)
          .accountsStrict({
            netbook: getNetbookPda(20, program.programId),
            config: configPda,
            technician: accounts.technician.publicKey,
          })
          .signers([accounts.technician])
          .rpc(),
        "InvalidStateTransition"
      );
    });

    it("should reject hardware audit on already audited netbook (HwAprobado → Fabricada)", async function () {
      const serial = "NB-DOUBLE-AUDIT-001";

      // Register netbook
      const sig1 = await program.methods
        .registerNetbook(serial, "BATCH-TEST", "Test specs")
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: accounts.fabricante.publicKey,
          netbook: getNetbookPda(21, program.programId),
          systemProgram: SystemProgram.programId,
        })
        .signers([accounts.fabricante])
        .rpc();
      await waitForConfirmation(provider, sig1, 30000);

      // Hardware audit (state = HwAprobado)
      const sig2 = await program.methods
        .auditHardware(serial, true, createHash(1))
        .accountsStrict({
          netbook: getNetbookPda(21, program.programId),
          config: configPda,
          auditor: accounts.auditor.publicKey,
        })
        .signers([accounts.auditor])
        .rpc();
      await waitForConfirmation(provider, sig2, 30000);

      // Try to audit again (should fail - not in Fabricada state)
      await expectError(
        program.methods
          .auditHardware(serial, true, createHash(2))
          .accountsStrict({
            netbook: getNetbookPda(21, program.programId),
            config: configPda,
            auditor: accounts.auditor.publicKey,
          })
          .signers([accounts.auditor])
          .rpc(),
        "InvalidStateTransition"
      );
    });

    it("should reject software validation after failed hardware audit (Fabricada → Fabricada, not HwAprobado)", async function () {
      const serial = "NB-FAILED-AUDIT-001";

      // Register netbook
      const sig1 = await program.methods
        .registerNetbook(serial, "BATCH-TEST", "Test specs")
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: accounts.fabricante.publicKey,
          netbook: getNetbookPda(22, program.programId),
          systemProgram: SystemProgram.programId,
        })
        .signers([accounts.fabricante])
        .rpc();
      await waitForConfirmation(provider, sig1, 30000);

      // Failed hardware audit (state stays Fabricada)
      const sig2 = await program.methods
        .auditHardware(serial, false, createHash(0))
        .accountsStrict({
          netbook: getNetbookPda(22, program.programId),
          config: configPda,
          auditor: accounts.auditor.publicKey,
        })
        .signers([accounts.auditor])
        .rpc();
      await waitForConfirmation(provider, sig2, 30000);

      // Try to validate software (should fail - still in Fabricada state)
      await expectError(
        program.methods
          .validateSoftware(serial, "Ubuntu 22.04", true)
          .accountsStrict({
            netbook: getNetbookPda(22, program.programId),
            config: configPda,
            technician: accounts.technician.publicKey,
          })
          .signers([accounts.technician])
          .rpc(),
        "InvalidStateTransition"
      );
    });
  });

  describe("Multiple Audits/Validations", function () {
    it("should reject multiple software validations of the same netbook", async function () {
      const serial = "NB-MULTI-VALIDATE-001";

      // Register netbook
      const sig1 = await program.methods
        .registerNetbook(serial, "BATCH-TEST", "Test specs")
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: accounts.fabricante.publicKey,
          netbook: getNetbookPda(23, program.programId),
          systemProgram: SystemProgram.programId,
        })
        .signers([accounts.fabricante])
        .rpc();
      await waitForConfirmation(provider, sig1, 30000);

      // Hardware audit
      const sig2 = await program.methods
        .auditHardware(serial, true, createHash(1))
        .accountsStrict({
          netbook: getNetbookPda(23, program.programId),
          config: configPda,
          auditor: accounts.auditor.publicKey,
        })
        .signers([accounts.auditor])
        .rpc();
      await waitForConfirmation(provider, sig2, 30000);

      // First software validation
      const sig3 = await program.methods
        .validateSoftware(serial, "Ubuntu 22.04", true)
        .accountsStrict({
          netbook: getNetbookPda(23, program.programId),
          config: configPda,
          technician: accounts.technician.publicKey,
        })
        .signers([accounts.technician])
        .rpc();
      await waitForConfirmation(provider, sig3, 30000);

      // Try to validate software again (should fail - not in HwAprobado state)
      await expectError(
        program.methods
          .validateSoftware(serial, "Ubuntu 22.04", true)
          .accountsStrict({
            netbook: getNetbookPda(23, program.programId),
            config: configPda,
            technician: accounts.technician.publicKey,
          })
          .signers([accounts.technician])
          .rpc(),
        "InvalidStateTransition"
      );
    });
  });
});

// ============================================================================
// Error Code Verification Tests
// ============================================================================

describe("Error Code Verification", function () {
  this.timeout(120000);

  let provider: AnchorProvider;
  let program: Program<ScSolana>;
  let accounts: Record<string, Keypair>;
  let configPda: PublicKey;
  let adminPda: PublicKey;
  let serialHashRegistryPda: PublicKey;

  before(async () => {
    provider = AnchorProvider.local();
    program = (await anchor.Program.at(
      "7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb",
      provider
    )) as Program<ScSolana>;

    // Generate test accounts
    accounts = {
      admin: Keypair.generate(),
      fabricante: Keypair.generate(),
      auditor: Keypair.generate(),
      technician: Keypair.generate(),
      school: Keypair.generate(),
      randomUser: Keypair.generate(),
    };

    // Fund all accounts
    for (const [, kp] of Object.entries(accounts)) {
      await fundKeypair(provider, kp, 2);
    }

    // Initialize program
    await fundAndInitialize(program, provider, accounts.admin, 20 * LAMPORTS_PER_SOL);

    // Get PDAs
    [configPda] = getConfigPda(program);
    [adminPda] = getAdminPda(configPda, program.programId);
    serialHashRegistryPda = getSerialHashRegistryPda(configPda, program.programId);
  });

  describe("ArrayLengthMismatch (Error Code 6005)", function () {
    it("should reject batch registration with mismatched array lengths", async function () {
      // Create arrays with different lengths
      const serialNumbers = ["NB-BATCH-001", "NB-BATCH-002", "NB-BATCH-003"];
      const batchIds = ["BATCH-TEST-001", "BATCH-TEST-002"]; // One less than serials
      const modelSpecs = ["Spec 1", "Spec 2", "Spec 3"];

      await expectError(
        program.methods
          .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: accounts.fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.fabricante])
          .rpc(),
        "ArrayLengthMismatch"
      );
    });

    it("should reject batch registration with completely different lengths", async function () {
      const serialNumbers = ["NB-BATCH-001", "NB-BATCH-002"];
      const batchIds = ["BATCH-TEST-001"];
      const modelSpecs: string[] = [];

      await expectError(
        program.methods
          .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: accounts.fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.fabricante])
          .rpc(),
        "ArrayLengthMismatch"
      );
    });
  });

  describe("EmptySerial (Error Code 6009)", function () {
    it("should reject register_netbook with empty serial", async function () {
      await expectError(
        program.methods
          .registerNetbook("", "BATCH-TEST", "Test specs")
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: accounts.fabricante.publicKey,
            netbook: getNetbookPda(30, program.programId),
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.fabricante])
          .rpc(),
        "EmptySerial"
      );
    });
  });

  describe("StringTooLong (Error Code 6010)", function () {
    it("should reject serial number > 200 chars", async function () {
      const serial201 = createSerialOfLength(201, "NB");
      await expectError(
        program.methods
          .registerNetbook(serial201, "BATCH-TEST", "Test specs")
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: accounts.fabricante.publicKey,
            netbook: getNetbookPda(31, program.programId),
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.fabricante])
          .rpc(),
        "StringTooLong"
      );
    });

    it("should reject batch_id > 100 chars", async function () {
      const batch101 = "B".repeat(101);
      await expectError(
        program.methods
          .registerNetbook("NB-BATCH-LIMIT-TEST", batch101, "Test specs")
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: accounts.fabricante.publicKey,
            netbook: getNetbookPda(32, program.programId),
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.fabricante])
          .rpc(),
        "StringTooLong"
      );
    });

    it("should reject model_specs > 500 chars", async function () {
      const modelSpec501 = createModelSpecOfLength(501);
      await expectError(
        program.methods
          .registerNetbook("NB-MODEC-LIMIT-TEST", "BATCH-TEST", modelSpec501)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: accounts.fabricante.publicKey,
            netbook: getNetbookPda(33, program.programId),
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.fabricante])
          .rpc(),
        "StringTooLong"
      );
    });

    it("should reject os_version > 100 chars in validate_software", async function () {
      const serial = "NB-OS-VERSION-TEST";

      // Register and audit first
      await program.methods
        .registerNetbook(serial, "BATCH-TEST", "Test specs")
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: accounts.fabricante.publicKey,
          netbook: getNetbookPda(34, program.programId),
          systemProgram: SystemProgram.programId,
        })
        .signers([accounts.fabricante])
        .rpc();

      await grantRole(
        program,
        configPda,
        adminPda,
        accounts.auditor,
        ROLE_TYPES.AUDITOR_HW
      );

      await program.methods
        .auditHardware(serial, true, createHash(1))
        .accountsStrict({
          netbook: getNetbookPda(34, program.programId),
          config: configPda,
          auditor: accounts.auditor.publicKey,
        })
        .signers([accounts.auditor])
        .rpc();

      // Create os_version > 100 chars
      const osVersion101 = "O".repeat(101);

      await expectError(
        program.methods
          .validateSoftware(serial, osVersion101, true)
          .accountsStrict({
            netbook: getNetbookPda(34, program.programId),
            config: configPda,
            technician: accounts.technician.publicKey,
          })
          .signers([accounts.technician])
          .rpc(),
        "StringTooLong"
      );
    });
  });

  describe("InvalidStateTransition (Error Code 6001)", function () {
    it("should verify error code for invalid state transition", async function () {
      const serial = "NB-STATE-CODE-TEST";

      // Register netbook
      await program.methods
        .registerNetbook(serial, "BATCH-TEST", "Test specs")
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: accounts.fabricante.publicKey,
          netbook: getNetbookPda(35, program.programId),
          systemProgram: SystemProgram.programId,
        })
        .signers([accounts.fabricante])
        .rpc();

      // Try invalid transition (software validation without hardware audit)
      let errorResult: any;
      try {
        await program.methods
          .validateSoftware(serial, "Ubuntu 22.04", true)
          .accountsStrict({
            netbook: getNetbookPda(35, program.programId),
            config: configPda,
            technician: accounts.technician.publicKey,
          })
          .signers([accounts.technician])
          .rpc();
        throw new Error("Expected promise to reject");
      } catch (e: any) {
        errorResult = e;
      }

      const errorCode = extractErrorCode(errorResult);
      expect(errorCode).to.equal("InvalidStateTransition");
    });
  });

  describe("RoleAlreadyGranted (Error Code 6006)", function () {
    it("should verify error code for duplicate role grant", async function () {
      // Grant role first
      await grantRole(
        program,
        configPda,
        adminPda,
        accounts.school,
        ROLE_TYPES.ESCUELA
      );

      // Try to grant same role again
      let errorResult: any;
      try {
        await program.methods
          .grantRole(ROLE_TYPES.ESCUELA)
          .accountsStrict({
            config: configPda,
            admin: adminPda,
            accountToGrant: accounts.school.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.school])
          .rpc();
        throw new Error("Expected promise to reject");
      } catch (e: any) {
        errorResult = e;
      }

      const errorCode = extractErrorCode(errorResult);
      expect(errorCode).to.equal("RoleAlreadyGranted");
    });
  });
});

// ============================================================================
// Permission and Access Control Edge Cases
// ============================================================================

describe("Edge Cases - Permission Enforcement", function () {
  this.timeout(120000);

  let provider: AnchorProvider;
  let program: Program<ScSolana>;
  let accounts: Record<string, Keypair>;
  let configPda: PublicKey;
  let adminPda: PublicKey;
  let serialHashRegistryPda: PublicKey;

  before(async () => {
    provider = AnchorProvider.local();
    program = (await anchor.Program.at(
      "7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb",
      provider
    )) as Program<ScSolana>;

    // Generate test accounts
    accounts = {
      admin: Keypair.generate(),
      fabricante: Keypair.generate(),
      auditor: Keypair.generate(),
      technician: Keypair.generate(),
      school: Keypair.generate(),
      randomUser: Keypair.generate(),
    };

    // Fund all accounts
    for (const [, kp] of Object.entries(accounts)) {
      await fundKeypair(provider, kp, 2);
    }

    // Initialize program
    await fundAndInitialize(program, provider, accounts.admin, 20 * LAMPORTS_PER_SOL);

    // Get PDAs
    [configPda] = getConfigPda(program);
    [adminPda] = getAdminPda(configPda, program.programId);
    serialHashRegistryPda = getSerialHashRegistryPda(configPda, program.programId);

    // Grant roles
    await grantRole(
      program,
      configPda,
      adminPda,
      accounts.auditor,
      ROLE_TYPES.AUDITOR_HW
    );
    await grantRole(
      program,
      configPda,
      adminPda,
      accounts.technician,
      ROLE_TYPES.TECNICO_SW
    );
  });

  describe("Unauthorized Access Attempts", function () {
    it("should reject hardware audit from non-auditor", async function () {
      const serial = "NB-UNAUTH-AUDIT-001";

      // Register netbook
      await program.methods
        .registerNetbook(serial, "BATCH-TEST", "Test specs")
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: accounts.fabricante.publicKey,
          netbook: getNetbookPda(40, program.programId),
          systemProgram: SystemProgram.programId,
        })
        .signers([accounts.fabricante])
        .rpc();

      // Try to audit with random user (not auditor)
      await expectError(
        program.methods
          .auditHardware(serial, true, createHash(1))
          .accountsStrict({
            netbook: getNetbookPda(40, program.programId),
            config: configPda,
            auditor: accounts.randomUser.publicKey,
          })
          .signers([accounts.randomUser])
          .rpc(),
        "Unauthorized"
      );
    });

    it("should reject software validation from non-technician", async function () {
      const serial = "NB-UNAUTH-SW-001";

      // Register netbook
      await program.methods
        .registerNetbook(serial, "BATCH-TEST", "Test specs")
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: accounts.fabricante.publicKey,
          netbook: getNetbookPda(41, program.programId),
          systemProgram: SystemProgram.programId,
        })
        .signers([accounts.fabricante])
        .rpc();

      // Try to validate with random user (not technician)
      await expectError(
        program.methods
          .validateSoftware(serial, "Ubuntu 22.04", true)
          .accountsStrict({
            netbook: getNetbookPda(41, program.programId),
            config: configPda,
            technician: accounts.randomUser.publicKey,
          })
          .signers([accounts.randomUser])
          .rpc(),
        "Unauthorized"
      );
    });

    it("should reject role grant from non-admin", async function () {
      // Try to grant role with non-admin user
      await expectError(
        program.methods
          .grantRole(ROLE_TYPES.AUDITOR_HW)
          .accountsStrict({
            config: configPda,
            admin: accounts.randomUser.publicKey,
            accountToGrant: accounts.auditor.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([accounts.randomUser, accounts.auditor])
          .rpc(),
        "Unauthorized"
      );
    });
  });
});
