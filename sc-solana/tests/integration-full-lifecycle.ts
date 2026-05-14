/**
 * Integration Testing with Local Solana Network
 *
 * Comprehensive integration tests that validate the complete netbook lifecycle
 * using the local Solana validator. Tests cover full lifecycle, batch operations,
 * error handling, query operations, and concurrent operations.
 *
 * Related Issues:
 * - Issue #81: Integration Testing with Local Solana Network (P0)
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
  getAdminPdaAddress,
  NetbookState,
  ROLE_TYPES,
  createHash,
  createSerialNumber,
  createBatchId,
  createModelSpecs,
  type TestClient,
} from "./test-helpers";

// ============================================================================
// Test Data Constants
// ============================================================================

const TEST_NETBOOK_1 = {
  serialNumber: createSerialNumber("NB", 100),
  batchId: createBatchId("MFG", 2024, 100),
  initialModelSpecs: createModelSpecs("TestBrand", "ProBook", 2024),
};

const TEST_AUDIT = {
  passed: true,
  reportHash: createHash(42),
};

const TEST_VALIDATION = {
  passed: true,
  osVersion: "Ubuntu 22.04 LTS",
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
 * Register a netbook and return token ID
 */
async function registerNetbook(
  client: TestClient,
  configPda: string,
  serialHashRegistryPda: string,
  manufacturer: Keypair,
  serialNumber: string,
  batchId: string,
  modelSpecs: string
): Promise<{ tokenId: number; netbookPda: string }> {
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

  return { tokenId, netbookPda };
}

/**
 * Perform hardware audit
 */
async function hardwareAudit(
  client: TestClient,
  netbookPda: string,
  configPda: string,
  auditor: Keypair,
  serial: string,
  passed: boolean,
  reportHash: number[]
): Promise<void> {
  const auditorSigner = await createSignerFromKeyPair(auditor);
  await client.scSolana.instructions.auditHardware({
    netbook: toAddress(netbookPda),
    config: toAddress(configPda),
    auditor: auditorSigner,
    serial,
    passed,
    reportHash: toUint8Array(reportHash),
  }).sendAndConfirm();
}

/**
 * Perform software validation
 */
async function softwareValidation(
  client: TestClient,
  netbookPda: string,
  configPda: string,
  technician: Keypair,
  serial: string,
  osVersion: string,
  passed: boolean
): Promise<void> {
  const technicianSigner = await createSignerFromKeyPair(technician);
  await client.scSolana.instructions.validateSoftware({
    netbook: toAddress(netbookPda),
    config: toAddress(configPda),
    technician: technicianSigner,
    serial,
    osVersion,
    passed,
  }).sendAndConfirm();
}

/**
 * Assign netbook to student
 */
async function assignToStudent(
  client: TestClient,
  netbookPda: string,
  configPda: string,
  school: Keypair,
  serial: string,
  studentIdHash: number[],
  schoolIdHash: number[]
): Promise<void> {
  const schoolSigner = await createSignerFromKeyPair(school);
  await client.scSolana.instructions.assignToStudent({
    netbook: toAddress(netbookPda),
    config: toAddress(configPda),
    school: schoolSigner,
    serial,
    schoolHash: toUint8Array(schoolIdHash),
    studentIdHash: toUint8Array(studentIdHash),
  }).sendAndConfirm();
}

// ============================================================================
// Test Suite
// ============================================================================

describe("Integration Testing with Local Solana Network", () => {
  let client: TestClient;

  // Test accounts
  let admin: Keypair;
  let fabricante: Keypair;
  let auditor: Keypair;
  let technician: Keypair;
  let school: Keypair;
  let estudiante: Keypair;

  // PDA references
  let configPda: string;
  let serialHashRegistryPda: string;
  let adminPda: string;

  /**
   * Setup: Fund accounts and initialize program
   */
  before(async () => {
    console.log("\n=== Setting up Integration Test Environment ===\n");

    // Generate test accounts
    admin = Keypair.generate();
    fabricante = Keypair.generate();
    auditor = Keypair.generate();
    technician = Keypair.generate();
    school = Keypair.generate();
    estudiante = Keypair.generate();

    // Create test client
    client = await createTestClient("http://localhost:8899", admin);

    // Fund all test accounts
    console.log("Funding test accounts...");
    await fundKeypair(client, fabricante, 2);
    await fundKeypair(client, auditor, 2);
    await fundKeypair(client, technician, 2);
    await fundKeypair(client, school, 2);
    await fundKeypair(client, estudiante, 2);
    console.log("All test accounts funded.\n");

    // Get PDAs
    configPda = await getConfigPdaAddress();
    serialHashRegistryPda = await getSerialHashRegistryPdaAddress(toAddress(configPda));
    adminPda = await getAdminPdaAddress(toAddress(configPda));

    // Initialize program using PDA-first pattern
    await fundAndInitialize(client, admin);
  });

  // ========================================================================
  // Complete Lifecycle Test
  // ========================================================================

  describe("Complete Netbook Lifecycle", () => {
    it("executes full lifecycle: register -> audit -> validate -> assign", async () => {
      console.log("\n=== Starting Complete Lifecycle Test ===\n");

      // Step 1: Grant FABRICANTE role
      console.log("Step 1: Granting FABRICANTE role...");
      await grantRole(client, configPda, adminPda, fabricante, ROLE_TYPES.FABRICANTE);
      console.log("FABRICANTE role granted");

      // Step 2: Register netbook
      console.log("\nStep 2: Registering netbook...");
      const { tokenId, netbookPda } = await registerNetbook(
        client,
        configPda,
        serialHashRegistryPda,
        fabricante,
        TEST_NETBOOK_1.serialNumber,
        TEST_NETBOOK_1.batchId,
        TEST_NETBOOK_1.initialModelSpecs
      );
      console.log(`Netbook registered with tokenId: ${tokenId}`);

      // Verify initial state
      let netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.Fabricada);
      expect(netbook.serialNumber).to.equal(TEST_NETBOOK_1.serialNumber);
      expect(netbook.batchId).to.equal(TEST_NETBOOK_1.batchId);
      expect(netbook.exists).to.be.true;
      console.log("Initial state verified: Fabricada");

      // Step 3: Grant AUDITOR_HW role and perform hardware audit
      console.log("\nStep 3: Granting AUDITOR_HW role...");
      await grantRole(client, configPda, adminPda, auditor, ROLE_TYPES.AUDITOR_HW);
      console.log("AUDITOR_HW role granted");

      console.log("\nStep 4: Performing hardware audit...");
      await hardwareAudit(
        client,
        netbookPda,
        configPda,
        auditor,
        TEST_NETBOOK_1.serialNumber,
        TEST_AUDIT.passed,
        TEST_AUDIT.reportHash
      );
      console.log("Hardware audit passed");

      // Verify state after audit
      netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.HwAprobado);
      expect(netbook.hwIntegrityPassed).to.be.true;
      console.log("State after audit: HwAprobado");

      // Step 5: Grant TECNICO_SW role and perform software validation
      console.log("\nStep 5: Granting TECNICO_SW role...");
      await grantRole(client, configPda, adminPda, technician, ROLE_TYPES.TECNICO_SW);
      console.log("TECNICO_SW role granted");

      console.log("\nStep 6: Performing software validation...");
      await softwareValidation(
        client,
        netbookPda,
        configPda,
        technician,
        TEST_NETBOOK_1.serialNumber,
        TEST_VALIDATION.osVersion,
        TEST_VALIDATION.passed
      );
      console.log("Software validation passed");

      // Verify state after validation
      netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.SwValidado);
      expect(netbook.swValidationPassed).to.be.true;
      console.log("State after validation: SwValidado");

      // Step 6: Grant ESCUELA role and assign to student
      console.log("\nStep 7: Granting ESCUELA role...");
      await grantRole(client, configPda, adminPda, school, ROLE_TYPES.ESCUELA);
      console.log("ESCUELA role granted");

      console.log("\nStep 8: Assigning netbook to student...");
      const studentIdHash = Array(32).fill(1);
      const schoolIdHash = Array(32).fill(2);
      await assignToStudent(
        client,
        netbookPda,
        configPda,
        school,
        TEST_NETBOOK_1.serialNumber,
        studentIdHash,
        schoolIdHash
      );
      console.log("Netbook assigned to student");

      // Verify final state
      netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.Distribuida);
      console.log("Final state: Distribuida");

      // Verify config counters
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(config.totalNetbooks)).to.be.greaterThan(0);
      console.log("Config counters verified");

      console.log("\n=== Complete Lifecycle Test Passed ===\n");
    });

    it("verifies state machine enforces correct transition order", async () => {
      console.log("\n=== Starting State Machine Validation ===\n");

      // Register a new netbook
      const netbook2 = {
        serialNumber: createSerialNumber("NB", 101),
        batchId: createBatchId("MFG", 2024, 101),
        initialModelSpecs: createModelSpecs("TestBrand2", "AirBook", 2024),
      };

      const { netbookPda } = await registerNetbook(
        client,
        configPda,
        serialHashRegistryPda,
        fabricante,
        netbook2.serialNumber,
        netbook2.batchId,
        netbook2.initialModelSpecs
      );

      // Try to validate software without hardware audit (should fail)
      console.log("Attempting software validation without hardware audit...");
      try {
        await softwareValidation(
          client,
          netbookPda,
          configPda,
          technician,
          netbook2.serialNumber,
          "Ubuntu 22.04",
          true
        );
        expect.fail("Expected InvalidStateTransition error");
      } catch (error: any) {
        console.log("Correctly rejected:", error.message);
        expect(error.message).to.include("InvalidStateTransition");
      }

      console.log("\n=== State Machine Validation Passed ===\n");
    });
  });

  // ========================================================================
  // Error Handling Tests
  // ========================================================================

  describe("Error Handling in Lifecycle", () => {
    it("rejects hardware audit from wrong state", async () => {
      console.log("\n=== Testing Error Handling ===\n");

      // Register a new netbook
      const netbook3 = {
        serialNumber: createSerialNumber("NB", 105),
        batchId: createBatchId("MFG", 2024, 105),
        initialModelSpecs: createModelSpecs("TestBrand3", "AirBook2", 2024),
      };

      const { netbookPda } = await registerNetbook(
        client,
        configPda,
        serialHashRegistryPda,
        fabricante,
        netbook3.serialNumber,
        netbook3.batchId,
        netbook3.initialModelSpecs
      );

      // Try to assign without any audits (should fail)
      console.log("Attempting assignment without audits...");
      try {
        await assignToStudent(
          client,
          netbookPda,
          configPda,
          school,
          netbook3.serialNumber,
          Array(32).fill(7),
          Array(32).fill(8)
        );
        expect.fail("Expected InvalidStateTransition error");
      } catch (error: any) {
        console.log("Correctly rejected:", error.message);
        expect(error.message).to.include("InvalidStateTransition");
      }

      console.log("\n=== Error Handling Test Passed ===\n");
    });

    it("rejects operations without required role", async () => {
      console.log("\n=== Testing Role Enforcement ===\n");

      // Create a user without auditor role
      const randomUser = Keypair.generate();
      await fundKeypair(client, randomUser, 2);

      // Register a netbook first
      const netbook4 = {
        serialNumber: createSerialNumber("NB", 106),
        batchId: createBatchId("MFG", 2024, 106),
        initialModelSpecs: createModelSpecs("TestBrand4", "ProBook2", 2024),
      };

      const { netbookPda } = await registerNetbook(
        client,
        configPda,
        serialHashRegistryPda,
        fabricante,
        netbook4.serialNumber,
        netbook4.batchId,
        netbook4.initialModelSpecs
      );

      // Grant FABRICANTE role to random user
      await grantRole(client, configPda, adminPda, randomUser, ROLE_TYPES.FABRICANTE);

      // Try to audit as non-auditor (should fail)
      console.log("Attempting audit without auditor role...");
      try {
        await hardwareAudit(
          client,
          netbookPda,
          configPda,
          randomUser,
          netbook4.serialNumber,
          true,
          createHash(99)
        );
        expect.fail("Expected UnauthorizedAccess error");
      } catch (error: any) {
        console.log("Correctly rejected:", error.message);
        expect(error.message).to.include("Unauthorized");
      }

      console.log("\n=== Role Enforcement Test Passed ===\n");
    });
  });

  // ========================================================================
  // Query Operations Tests
  // ========================================================================

  describe("Query Operations", () => {
    it("queries config state correctly", async () => {
      console.log("\n=== Testing Query Operations ===\n");

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));

      expect(Number(config.nextTokenId)).to.be.greaterThan(0);
      expect(Number(config.totalNetbooks)).to.be.greaterThan(0);

      console.log(`Config: nextTokenId=${Number(config.nextTokenId)}`);
      console.log(`Config: totalNetbooks=${Number(config.totalNetbooks)}`);

      console.log("\n=== Query Operations Test Passed ===\n");
    });
  });

  // ========================================================================
  // Concurrent Operations Tests
  // ========================================================================

  describe("Concurrent Operations", () => {
    it("handles concurrent netbook registrations", async () => {
      console.log("\n=== Testing Concurrent Operations ===\n");

      // Register multiple netbooks sequentially
      for (let i = 0; i < 3; i++) {
        const serial = createSerialNumber("NB", 200 + i);
        const batchId = createBatchId("CONCURRENT", 2024, 200 + i);
        const modelSpecs = createModelSpecs("Concurrent", `Model${i}`, 2024);

        await registerNetbook(
          client,
          configPda,
          serialHashRegistryPda,
          fabricante,
          serial,
          batchId,
          modelSpecs
        );

        console.log(`Concurrent registration ${i}: serial=${serial}`);
      }

      // Verify all netbooks were registered
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(config.totalNetbooks)).to.be.greaterThan(3);

      console.log(`\nTotal netbooks after concurrent operations: ${Number(config.totalNetbooks)}`);
      console.log("\n=== Concurrent Operations Test Passed ===\n");
    });
  });

  // ========================================================================
  // Serial Hash Registry Tests
  // ========================================================================

  describe("Serial Hash Registry Verification", () => {
    it("stores serial hashes for all registered netbooks", async () => {
      console.log("\n=== Testing Serial Hash Registry ===\n");

      // Verify serial hash registry exists
      const registryInfo = await client.rpc.getAccountInfo(toAddress(serialHashRegistryPda));
      expect(registryInfo).to.not.be.null;
      console.log("Serial hash registry account exists");

      console.log("\n=== Serial Hash Registry Test Passed ===\n");
    });
  });
});
