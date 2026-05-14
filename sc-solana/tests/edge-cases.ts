/**
 * Edge Cases and Error Handling Tests
 *
 * Comprehensive tests for edge cases in netbook operations, role management,
 * and state machine transitions. Validates specific error codes and boundary
 * conditions.
 *
 * Related Issues:
 * - Issue #188: Phase 3 - Test Coverage for Edge Cases and Error Handling
 *
 * Migrated from @coral-xyz/anchor to Codama-generated client (Issue #209).
 */

import {
  Keypair,
} from "@solana/web3.js";
import { createSignerFromKeyPair } from "@solana/kit";
import { expect } from "chai";

// Import test helpers
import {
  createTestClient,
  fundAndInitialize,
  fundKeypair,
  toAddress,
  toUint8Array,
  getConfigPdaAddress,
  getNetbookPdaAddress,
  getSerialHashRegistryPdaAddress,
  getRoleRequestPdaAddress,
  getAdminPdaAddress,
  NetbookState,
  ROLE_TYPES,
  createHash,
  createSerialNumber,
  createBatchId,
  createModelSpecs,
  createSerialOfLength,
  createModelSpecOfLength,
  expectError,
  createSpecialCharsSerial,
  createLongRoleName,
  type TestClient,
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
  client: TestClient,
  configPda: string,
  adminPda: string,
  accountToGrant: Keypair,
  role: string
): Promise<void> {
  const accountSigner = await createSignerFromKeyPair(accountToGrant);
  await client.scSolana.instructions.grantRole({
    config: toAddress(configPda),
    admin: toAddress(adminPda),
    accountToGrant: accountSigner,
    role,
  }).sendAndConfirm();
}

/**
 * Register a netbook
 */
async function registerNetbook(
  client: TestClient,
  configPda: string,
  serialHashRegistryPda: string,
  manufacturer: Keypair,
  serialNumber: string,
  batchId: string,
  modelSpecs: string
): Promise<string> {
  const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
  const tokenId = Number(config.nextTokenId);
  const netbookPda = await getNetbookPdaAddress(tokenId);

  const manufacturerSigner = await createSignerFromKeyPair(manufacturer);
  await client.scSolana.instructions.registerNetbook({
    config: toAddress(configPda),
    serialHashRegistry: toAddress(serialHashRegistryPda),
    manufacturer: manufacturerSigner,
    netbook: toAddress(netbookPda),
    serialNumber,
    batchId,
    initialModelSpecs: modelSpecs,
  }).sendAndConfirm();

  return netbookPda;
}

// ============================================================================
// Edge Cases: Netbook Registration
// ============================================================================

describe("Edge Cases - Netbook Registration", function () {
  this.timeout(120000);

  let client: TestClient;
  let accounts: Record<string, Keypair>;
  let configPda: string;
  let adminPda: string;
  let serialHashRegistryPda: string;

  before(async () => {
    // Generate test accounts
    accounts = {
      admin: Keypair.generate(),
      fabricante: Keypair.generate(),
      auditor: Keypair.generate(),
      technician: Keypair.generate(),
      school: Keypair.generate(),
      randomUser: Keypair.generate(),
    };

    // Create test client
    client = await createTestClient("http://localhost:8899", accounts.admin);

    // Fund all accounts
    for (const [, kp] of Object.entries(accounts)) {
      await fundKeypair(client, kp, 2);
    }

    // Initialize program
    await fundAndInitialize(client, accounts.admin);

    // Get PDAs
    configPda = await getConfigPdaAddress();
    adminPda = await getAdminPdaAddress(toAddress(configPda));
    serialHashRegistryPda = await getSerialHashRegistryPdaAddress(toAddress(configPda));

    // Grant FABRICANTE role
    await grantRole(client, configPda, adminPda, accounts.fabricante, ROLE_TYPES.FABRICANTE);
  });

  describe("Serial Number Edge Cases", function () {
    it("should accept serial number exactly at 200 character limit", async function () {
      const serial200 = createSerialOfLength(200, "NB");
      expect(serial200.length).to.equal(200);

      await registerNetbook(
        client,
        configPda,
        serialHashRegistryPda,
        accounts.fabricante,
        serial200,
        "BATCH-TEST",
        createModelSpecs("Test", "Model", 2024)
      );
    });

    it("should reject serial number exceeding 200 characters", async function () {
      const serial201 = createSerialOfLength(201, "NB");
      expect(serial201.length).to.equal(201);

      await expectError(
        registerNetbook(
          client,
          configPda,
          serialHashRegistryPda,
          accounts.fabricante,
          serial201,
          "BATCH-TEST",
          createModelSpecs("Test", "Model", 2024)
        ),
        "StringTooLong"
      );
    });

    it("should reject empty serial number", async function () {
      await expectError(
        registerNetbook(
          client,
          configPda,
          serialHashRegistryPda,
          accounts.fabricante,
          "",
          "BATCH-TEST",
          createModelSpecs("Test", "Model", 2024)
        ),
        "EmptySerial"
      );
    });

    it("should accept serial number with special characters", async function () {
      const serialSpecial = createSpecialCharsSerial();
      await registerNetbook(
        client,
        configPda,
        serialHashRegistryPda,
        accounts.fabricante,
        serialSpecial,
        "BATCH-TEST",
        createModelSpecs("Test", "Model", 2024)
      );
    });
  });

  describe("Model Specs Edge Cases", function () {
    it("should accept empty model specs", async function () {
      await registerNetbook(
        client,
        configPda,
        serialHashRegistryPda,
        accounts.fabricante,
        "NB-EMPTY-MODEL-001",
        "BATCH-TEST",
        ""
      );
    });

    it("should accept model specs exactly at 500 character limit", async function () {
      const modelSpec500 = createModelSpecOfLength(500);
      expect(modelSpec500.length).to.equal(500);

      await registerNetbook(
        client,
        configPda,
        serialHashRegistryPda,
        accounts.fabricante,
        "NB-LONG-MODEL-001",
        "BATCH-TEST",
        modelSpec500
      );
    });

    it("should reject model specs exceeding 500 characters", async function () {
      const modelSpec501 = createModelSpecOfLength(501);
      expect(modelSpec501.length).to.equal(501);

      await expectError(
        registerNetbook(
          client,
          configPda,
          serialHashRegistryPda,
          accounts.fabricante,
          "NB-OVER-MODEL-001",
          "BATCH-TEST",
          modelSpec501
        ),
        "StringTooLong"
      );
    });
  });

  describe("Batch ID Edge Cases", function () {
    it("should accept batch_id exactly at 100 character limit", async function () {
      const batch100 = "B".repeat(100);
      expect(batch100.length).to.equal(100);

      await registerNetbook(
        client,
        configPda,
        serialHashRegistryPda,
        accounts.fabricante,
        "NB-BATCH-LIMIT-001",
        batch100,
        "Test specs"
      );
    });

    it("should reject batch_id exceeding 100 characters", async function () {
      const batch101 = "B".repeat(101);
      expect(batch101.length).to.equal(101);

      await expectError(
        registerNetbook(
          client,
          configPda,
          serialHashRegistryPda,
          accounts.fabricante,
          "NB-BATCH-OVER-001",
          batch101,
          "Test specs"
        ),
        "StringTooLong"
      );
    });
  });
});

// ============================================================================
// Edge Cases: Role Management
// ============================================================================

describe("Edge Cases - Role Management", function () {
  this.timeout(120000);

  let client: TestClient;
  let accounts: Record<string, Keypair>;
  let configPda: string;
  let adminPda: string;

  before(async () => {
    // Generate test accounts
    accounts = {
      admin: Keypair.generate(),
      fabricante: Keypair.generate(),
      auditor: Keypair.generate(),
      technician: Keypair.generate(),
      school: Keypair.generate(),
      randomUser: Keypair.generate(),
    };

    // Create test client
    client = await createTestClient("http://localhost:8899", accounts.admin);

    // Fund all accounts
    for (const [, kp] of Object.entries(accounts)) {
      await fundKeypair(client, kp, 2);
    }

    // Initialize program
    await fundAndInitialize(client, accounts.admin);

    // Get PDAs
    configPda = await getConfigPdaAddress();
    adminPda = await getAdminPdaAddress(toAddress(configPda));
  });

  describe("Role Name Edge Cases", function () {
    it("should reject role request with empty string", async function () {
      const userSigner = await createSignerFromKeyPair(accounts.randomUser);
      const roleRequestPda = await getRoleRequestPdaAddress(toAddress(accounts.randomUser.publicKey.toBase58()));

      await expectError(
        client.scSolana.instructions.requestRole({
          config: toAddress(configPda),
          roleRequest: toAddress(roleRequestPda),
          user: userSigner,
          role: "",
        }).sendAndConfirm(),
        "RoleNotFound"
      );
    });

    it("should reject role request with invalid role name", async function () {
      const userSigner = await createSignerFromKeyPair(accounts.randomUser);
      const roleRequestPda = await getRoleRequestPdaAddress(toAddress(accounts.randomUser.publicKey.toBase58()));

      await expectError(
        client.scSolana.instructions.requestRole({
          config: toAddress(configPda),
          roleRequest: toAddress(roleRequestPda),
          user: userSigner,
          role: "INVALID_ROLE_NAME",
        }).sendAndConfirm(),
        "RoleNotFound"
      );
    });
  });

  describe("Duplicate Role Grant Handling", function () {
    it("should reject granting a role that is already granted", async function () {
      // Grant role first time
      await grantRole(client, configPda, adminPda, accounts.auditor, ROLE_TYPES.AUDITOR_HW);

      // Try to grant same role again
      await expectError(
        grantRole(client, configPda, adminPda, accounts.auditor, ROLE_TYPES.AUDITOR_HW),
        "RoleAlreadyGranted"
      );
    });
  });
});

// ============================================================================
// Edge Cases: State Machine Transitions
// ============================================================================

describe("Edge Cases - State Machine", function () {
  this.timeout(120000);

  let client: TestClient;
  let accounts: Record<string, Keypair>;
  let configPda: string;
  let adminPda: string;
  let serialHashRegistryPda: string;

  before(async () => {
    // Generate test accounts
    accounts = {
      admin: Keypair.generate(),
      fabricante: Keypair.generate(),
      auditor: Keypair.generate(),
      technician: Keypair.generate(),
      school: Keypair.generate(),
      randomUser: Keypair.generate(),
    };

    // Create test client
    client = await createTestClient("http://localhost:8899", accounts.admin);

    // Fund all accounts
    for (const [, kp] of Object.entries(accounts)) {
      await fundKeypair(client, kp, 2);
    }

    // Initialize program
    await fundAndInitialize(client, accounts.admin);

    // Get PDAs
    configPda = await getConfigPdaAddress();
    adminPda = await getAdminPdaAddress(toAddress(configPda));
    serialHashRegistryPda = await getSerialHashRegistryPdaAddress(toAddress(configPda));

    // Grant roles
    await grantRole(client, configPda, adminPda, accounts.fabricante, ROLE_TYPES.FABRICANTE);
    await grantRole(client, configPda, adminPda, accounts.auditor, ROLE_TYPES.AUDITOR_HW);
    await grantRole(client, configPda, adminPda, accounts.technician, ROLE_TYPES.TECNICO_SW);
  });

  describe("Invalid State Transitions", function () {
    it("should reject software validation before hardware audit", async function () {
      const serial = "NB-INVALID-TRANS-001";
      const netbookPda = await registerNetbook(
        client,
        configPda,
        serialHashRegistryPda,
        accounts.fabricante,
        serial,
        "BATCH-TEST",
        "Test specs"
      );

      // Try to validate software without hardware audit (should fail)
      const technicianSigner = await createSignerFromKeyPair(accounts.technician);
      await expectError(
        client.scSolana.instructions.validateSoftware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          technician: technicianSigner,
          serial,
          osVersion: "Ubuntu 22.04",
          passed: true,
        }).sendAndConfirm(),
        "InvalidStateTransition"
      );
    });

    it("should reject hardware audit on already audited netbook", async function () {
      const serial = "NB-DOUBLE-AUDIT-001";
      const netbookPda = await registerNetbook(
        client,
        configPda,
        serialHashRegistryPda,
        accounts.fabricante,
        serial,
        "BATCH-TEST",
        "Test specs"
      );

      // Hardware audit (state = HwAprobado)
      const auditorSigner = await createSignerFromKeyPair(accounts.auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial,
        passed: true,
        reportHash: toUint8Array(createHash(1)),
      }).sendAndConfirm();

      // Try to audit again (should fail)
      await expectError(
        client.scSolana.instructions.auditHardware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          auditor: auditorSigner,
          serial,
          passed: true,
          reportHash: toUint8Array(createHash(2)),
        }).sendAndConfirm(),
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

  let client: TestClient;
  let accounts: Record<string, Keypair>;
  let configPda: string;
  let adminPda: string;
  let serialHashRegistryPda: string;

  before(async () => {
    // Generate test accounts
    accounts = {
      admin: Keypair.generate(),
      fabricante: Keypair.generate(),
      auditor: Keypair.generate(),
      technician: Keypair.generate(),
      school: Keypair.generate(),
      randomUser: Keypair.generate(),
    };

    // Create test client
    client = await createTestClient("http://localhost:8899", accounts.admin);

    // Fund all accounts
    for (const [, kp] of Object.entries(accounts)) {
      await fundKeypair(client, kp, 2);
    }

    // Initialize program
    await fundAndInitialize(client, accounts.admin);

    // Get PDAs
    configPda = await getConfigPdaAddress();
    adminPda = await getAdminPdaAddress(toAddress(configPda));
    serialHashRegistryPda = await getSerialHashRegistryPdaAddress(toAddress(configPda));

    // Grant FABRICANTE role
    await grantRole(client, configPda, adminPda, accounts.fabricante, ROLE_TYPES.FABRICANTE);
  });

  describe("ArrayLengthMismatch", function () {
    it("should reject batch registration with mismatched array lengths", async function () {
      const fabricanteSigner = await createSignerFromKeyPair(accounts.fabricante);
      await expectError(
        client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          serialNumbers: ["NB-BATCH-001", "NB-BATCH-002", "NB-BATCH-003"],
          batchIds: ["BATCH-TEST-001", "BATCH-TEST-002"],
          modelSpecs: ["Spec 1", "Spec 2", "Spec 3"],
        }).sendAndConfirm(),
        "ArrayLengthMismatch"
      );
    });
  });

  describe("EmptySerial", function () {
    it("should reject register_netbook with empty serial", async function () {
      const fabricanteSigner = await createSignerFromKeyPair(accounts.fabricante);
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const tokenId = Number(config.nextTokenId);
      const netbookPda = await getNetbookPdaAddress(tokenId);

      await expectError(
        client.scSolana.instructions.registerNetbook({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          netbook: toAddress(netbookPda),
          serialNumber: "",
          batchId: "BATCH-TEST",
          initialModelSpecs: "Test specs",
        }).sendAndConfirm(),
        "EmptySerial"
      );
    });
  });
});

// ============================================================================
// Permission and Access Control Edge Cases
// ============================================================================

describe("Edge Cases - Permission Enforcement", function () {
  this.timeout(120000);

  let client: TestClient;
  let accounts: Record<string, Keypair>;
  let configPda: string;
  let adminPda: string;
  let serialHashRegistryPda: string;

  before(async () => {
    // Generate test accounts
    accounts = {
      admin: Keypair.generate(),
      fabricante: Keypair.generate(),
      auditor: Keypair.generate(),
      technician: Keypair.generate(),
      school: Keypair.generate(),
      randomUser: Keypair.generate(),
    };

    // Create test client
    client = await createTestClient("http://localhost:8899", accounts.admin);

    // Fund all accounts
    for (const [, kp] of Object.entries(accounts)) {
      await fundKeypair(client, kp, 2);
    }

    // Initialize program
    await fundAndInitialize(client, accounts.admin);

    // Get PDAs
    configPda = await getConfigPdaAddress();
    adminPda = await getAdminPdaAddress(toAddress(configPda));
    serialHashRegistryPda = await getSerialHashRegistryPdaAddress(toAddress(configPda));

    // Grant roles
    await grantRole(client, configPda, adminPda, accounts.fabricante, ROLE_TYPES.FABRICANTE);
    await grantRole(client, configPda, adminPda, accounts.auditor, ROLE_TYPES.AUDITOR_HW);
    await grantRole(client, configPda, adminPda, accounts.technician, ROLE_TYPES.TECNICO_SW);
  });

  describe("Unauthorized Access Attempts", function () {
    it("should reject hardware audit from non-auditor", async function () {
      const serial = "NB-UNAUTH-AUDIT-001";
      const netbookPda = await registerNetbook(
        client,
        configPda,
        serialHashRegistryPda,
        accounts.fabricante,
        serial,
        "BATCH-TEST",
        "Test specs"
      );

      // Try to audit with random user (not auditor)
      const randomSigner = await createSignerFromKeyPair(accounts.randomUser);
      await expectError(
        client.scSolana.instructions.auditHardware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          auditor: randomSigner,
          serial,
          passed: true,
          reportHash: toUint8Array(createHash(1)),
        }).sendAndConfirm(),
        "Unauthorized"
      );
    });
  });
});
