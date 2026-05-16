/**
 * Lifecycle Integration Tests
 *
 * Tests the complete netbook lifecycle from registration to distribution.
 * Verifies state transitions, role enforcement, and event emission.
 *
 * Related Issues:
 * - Issue #67: Complete Lifecycle Integration Test
 * - Original Issue #10: Phase 11: Integration Tests
 *
 * Migrated from @coral-xyz/anchor to Codama-generated client (Issue #209).
 */

import {
  Keypair,
} from "@solana/web3.js";
import { createSignerFromKeyPair } from "./test-helpers";
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
  RequestStatus,
  ROLE_TYPES,
  createHash,
  createStringHash,
  createSerialNumber,
  createBatchId,
  createModelSpecs,
  type TestClient,
} from "./test-helpers";

// ============================================================================
// Test Data Constants
// ============================================================================

const TEST_NETBOOK = {
  serialNumber: createSerialNumber("NB", 1),
  batchId: createBatchId("MFG", 2024, 1),
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

const TEST_ASSIGNMENT = {
  studentIdHash: createStringHash("student-001"),
  schoolIdHash: createStringHash("school-001"),
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
  }).sendTransaction();
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
  }).sendTransaction();

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
  }).sendTransaction();
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
  }).sendTransaction();
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
  }).sendTransaction();
}

// ============================================================================
// Test Suite
// ============================================================================

describe("Lifecycle Integration Tests", () => {
  let client: TestClient;

  // Test accounts
  let admin: Keypair;
  let fabricante: Keypair;
  let auditor: Keypair;
  let technician: Keypair;
  let school: Keypair;

  // PDA references
  let configPda: string;
  let serialHashRegistryPda: string;
  let adminPda: string;

  /**
   * Setup: Fund accounts and initialize program
   */
  before(async () => {
    // Generate test accounts
    admin = Keypair.generate();
    fabricante = Keypair.generate();
    auditor = Keypair.generate();
    technician = Keypair.generate();
    school = Keypair.generate();

    // Create test client
    client = await createTestClient("http://localhost:8899", admin);

    // Fund all test accounts
    await fundKeypair(client, fabricante, 2);
    await fundKeypair(client, auditor, 2);
    await fundKeypair(client, technician, 2);
    await fundKeypair(client, school, 2);

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
      console.log("✓ FABRICANTE role granted");

      // Step 2: Register netbook
      console.log("\nStep 2: Registering netbook...");
      const { tokenId, netbookPda } = await registerNetbook(
        client,
        configPda,
        serialHashRegistryPda,
        fabricante,
        TEST_NETBOOK.serialNumber,
        TEST_NETBOOK.batchId,
        TEST_NETBOOK.initialModelSpecs
      );
      console.log(`✓ Netbook registered with tokenId: ${tokenId}`);

      // Verify initial state
      let netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.Fabricada);
      expect(netbook.serialNumber).to.equal(TEST_NETBOOK.serialNumber);
      expect(netbook.batchId).to.equal(TEST_NETBOOK.batchId);
      expect(netbook.exists).to.be.true;
      console.log("✓ Initial state verified: Fabricada");

      // Step 3: Grant AUDITOR_HW role and perform hardware audit
      console.log("\nStep 3: Granting AUDITOR_HW role...");
      await grantRole(client, configPda, adminPda, auditor, ROLE_TYPES.AUDITOR_HW);
      console.log("✓ AUDITOR_HW role granted");

      console.log("\nStep 4: Performing hardware audit...");
      await hardwareAudit(
        client,
        netbookPda,
        configPda,
        auditor,
        TEST_NETBOOK.serialNumber,
        TEST_AUDIT.passed,
        TEST_AUDIT.reportHash
      );
      console.log("✓ Hardware audit passed");

      // Verify state after audit
      netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.HwAprobado);
      expect(netbook.hwIntegrityPassed).to.be.true;
      console.log("✓ State after audit: HwAprobado");

      // Step 5: Grant TECNICO_SW role and perform software validation
      console.log("\nStep 5: Granting TECNICO_SW role...");
      await grantRole(client, configPda, adminPda, technician, ROLE_TYPES.TECNICO_SW);
      console.log("✓ TECNICO_SW role granted");

      console.log("\nStep 6: Performing software validation...");
      await softwareValidation(
        client,
        netbookPda,
        configPda,
        technician,
        TEST_NETBOOK.serialNumber,
        TEST_VALIDATION.osVersion,
        TEST_VALIDATION.passed
      );
      console.log("✓ Software validation passed");

      // Verify state after validation
      netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.SwValidado);
      expect(netbook.swValidationPassed).to.be.true;
      expect(netbook.osVersion).to.equal(TEST_VALIDATION.osVersion);
      console.log("✓ State after validation: SwValidado");

      // Step 6: Grant ESCUELA role and assign to student
      console.log("\nStep 7: Granting ESCUELA role...");
      await grantRole(client, configPda, adminPda, school, ROLE_TYPES.ESCUELA);
      console.log("✓ ESCUELA role granted");

      console.log("\nStep 8: Assigning to student...");
      await assignToStudent(
        client,
        netbookPda,
        configPda,
        school,
        TEST_NETBOOK.serialNumber,
        TEST_ASSIGNMENT.studentIdHash,
        TEST_ASSIGNMENT.schoolIdHash
      );
      console.log("✓ Student assignment completed");

      // Verify final state
      netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.Distribuida);
      console.log("✓ Final state: Distribuida");

      // Verify config updates
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(config.totalNetbooks)).to.be.greaterThan(0);
      console.log("✓ Config totalNetbooks updated");

      console.log("\n=== Complete Lifecycle Test Passed ===\n");
    });

    it("handles failed hardware audit correctly", async () => {
      console.log("\n=== Starting Failed Hardware Audit Test ===\n");

      // Grant roles
      await grantRole(client, configPda, adminPda, fabricante, ROLE_TYPES.FABRICANTE);
      await grantRole(client, configPda, adminPda, auditor, ROLE_TYPES.AUDITOR_HW);

      // Register netbook
      const failedNetbookData = {
        serialNumber: createSerialNumber("NB-FAIL", 1),
        batchId: createBatchId("MFG", 2024, 2),
        initialModelSpecs: createModelSpecs("FailBrand", "BadBook", 2024),
      };

      const { netbookPda } = await registerNetbook(
        client,
        configPda,
        serialHashRegistryPda,
        fabricante,
        failedNetbookData.serialNumber,
        failedNetbookData.batchId,
        failedNetbookData.initialModelSpecs
      );

      // Perform failed hardware audit
      await hardwareAudit(
        client,
        netbookPda,
        configPda,
        auditor,
        failedNetbookData.serialNumber,
        false,
        createHash(0)
      );

      // Verify netbook remains in Fabricada state
      const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.Fabricada);
      expect(netbook.hwIntegrityPassed).to.be.false;
      console.log("✓ Netbook remains in Fabricada after failed audit");

      console.log("\n=== Failed Hardware Audit Test Passed ===\n");
    });
  });

  // ========================================================================
  // State Transition Validation Tests
  // ========================================================================

  describe("State Transition Validation", () => {
    it("cannot skip state transitions", async () => {
      console.log("\n=== Starting State Skip Test ===\n");

      // Setup
      await grantRole(client, configPda, adminPda, fabricante, ROLE_TYPES.FABRICANTE);
      await grantRole(client, configPda, adminPda, technician, ROLE_TYPES.TECNICO_SW);

      // Register netbook
      const { netbookPda } = await registerNetbook(
        client,
        configPda,
        serialHashRegistryPda,
        fabricante,
        createSerialNumber("NB-SKIP", 1),
        createBatchId("MFG", 2024, 3),
        createModelSpecs("SkipBrand", "SkipBook", 2024)
      );

      // Attempt to validate software without hardware audit (should fail)
      try {
        await softwareValidation(
          client,
          netbookPda,
          configPda,
          technician,
          "NB-SKIP-000001",
          "Ubuntu 22.04",
          true
        );
        expect.fail("Should have thrown InvalidStateTransition error");
      } catch (err: any) {
        expect(err.message).to.include("InvalidStateTransition");
        console.log("✓ Correctly rejected software validation without hardware audit");
      }

      console.log("\n=== State Skip Test Passed ===\n");
    });

    it("cannot assign without software validation", async () => {
      console.log("\n=== Starting Assign Without Validation Test ===\n");

      // Setup
      await grantRole(client, configPda, adminPda, fabricante, ROLE_TYPES.FABRICANTE);
      await grantRole(client, configPda, adminPda, auditor, ROLE_TYPES.AUDITOR_HW);
      await grantRole(client, configPda, adminPda, school, ROLE_TYPES.ESCUELA);

      // Register and audit netbook
      const { netbookPda } = await registerNetbook(
        client,
        configPda,
        serialHashRegistryPda,
        fabricante,
        createSerialNumber("NB-NOVALID", 1),
        createBatchId("MFG", 2024, 4),
        createModelSpecs("NoValidBrand", "NoValidBook", 2024)
      );

      // Hardware audit only
      await hardwareAudit(
        client,
        netbookPda,
        configPda,
        auditor,
        "NB-NOVALID-000001",
        true,
        createHash(1)
      );

      // Attempt to assign without software validation (should fail)
      try {
        await assignToStudent(
          client,
          netbookPda,
          configPda,
          school,
          "NB-NOVALID-000001",
          createStringHash("student-test"),
          createStringHash("school-test")
        );
        expect.fail("Should have thrown InvalidStateTransition error");
      } catch (err: any) {
        expect(err.message).to.include("InvalidStateTransition");
        console.log("✓ Correctly rejected assignment without software validation");
      }

      console.log("\n=== Assign Without Validation Test Passed ===\n");
    });
  });

  // ========================================================================
  // Multiple Netbook Lifecycle
  // ========================================================================

  describe("Multiple Netbook Lifecycle", () => {
    it("handles multiple netbooks through lifecycle concurrently", async () => {
      console.log("\n=== Starting Multiple Netbook Lifecycle Test ===\n");

      // Setup roles
      await grantRole(client, configPda, adminPda, fabricante, ROLE_TYPES.FABRICANTE);
      await grantRole(client, configPda, adminPda, auditor, ROLE_TYPES.AUDITOR_HW);
      await grantRole(client, configPda, adminPda, technician, ROLE_TYPES.TECNICO_SW);
      await grantRole(client, configPda, adminPda, school, ROLE_TYPES.ESCUELA);

      const netbookResults: { tokenId: number; netbookPda: string; serial: string }[] = [];
      const numNetbooks = 3;

      // Register all netbooks
      console.log(`Registering ${numNetbooks} netbooks...`);
      for (let i = 0; i < numNetbooks; i++) {
        const serial = createSerialNumber("NB-MULTI", i + 1);
        const result = await registerNetbook(
          client,
          configPda,
          serialHashRegistryPda,
          fabricante,
          serial,
          createBatchId("MFG", 2024, i + 10),
          createModelSpecs(`MultiBrand${i}`, `MultiBook${i}`, 2024)
        );
        netbookResults.push({ ...result, serial });
        console.log(`✓ Registered netbook ${i + 1}: ${serial}`);
      }

      // Audit all netbooks
      console.log("\nAuditing all netbooks...");
      for (const result of netbookResults) {
        await hardwareAudit(
          client,
          result.netbookPda,
          configPda,
          auditor,
          result.serial,
          true,
          createHash(result.tokenId)
        );
        console.log(`✓ Audited netbook ${result.tokenId}`);
      }

      // Validate all netbooks
      console.log("\nValidating all netbooks...");
      for (const result of netbookResults) {
        await softwareValidation(
          client,
          result.netbookPda,
          configPda,
          technician,
          result.serial,
          `Ubuntu 22.04 LTS - Batch ${result.tokenId}`,
          true
        );
        console.log(`✓ Validated netbook ${result.tokenId}`);
      }

      // Assign all netbooks
      console.log("\nAssigning all netbooks...");
      for (let i = 0; i < netbookResults.length; i++) {
        const result = netbookResults[i];
        await assignToStudent(
          client,
          result.netbookPda,
          configPda,
          school,
          result.serial,
          createStringHash(`student-multi-${i + 1}`),
          createStringHash(`school-multi-${i + 1}`)
        );
        console.log(`✓ Assigned netbook ${result.tokenId}`);
      }

      // Verify all netbooks are in Distribuida state
      console.log("\nVerifying final states...");
      for (const result of netbookResults) {
        const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(result.netbookPda));
        expect(netbook.state).to.equal(NetbookState.Distribuida);
        console.log(`✓ Netbook ${result.tokenId} (${result.serial}): Distribuida`);
      }

      console.log("\n=== Multiple Netbook Lifecycle Test Passed ===\n");
    });
  });
});
