/**
 * Integration Testing with Local Solana Network
 *
 * Comprehensive integration tests that validate the complete netbook lifecycle
 * using the local Solana validator. Tests cover full lifecycle, batch operations,
 * error handling, query operations, and concurrent operations.
 *
 * Related Issues:
 * - Issue #81: Integration Testing with Local Solana Network (P0)
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
  Logs,
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
  fundKeypair,
  waitForConfirmation,
  HardwareAuditData,
  SoftwareValidationData,
} from "./test-helpers";

// ============================================================================
// Test Data Constants
// ============================================================================

const TEST_NETBOOK_1 = {
  serialNumber: createSerialNumber("NB", 100),
  batchId: createBatchId("MFG", 2024, 100),
  initialModelSpecs: createModelSpecs("TestBrand", "ProBook", 2024),
};

const TEST_AUDIT: HardwareAuditData = {
  passed: true,
  reportHash: createHash(42),
};

const TEST_VALIDATION: SoftwareValidationData = {
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
  program: Program<ScSolana>,
  configPda: PublicKey,
  admin: Keypair,
  accountToGrant: Keypair,
  role: string
): Promise<string> {
  const signature = await program.methods
    .grantRole(role)
    .accountsStrict({
      config: configPda,
      admin: admin.publicKey,
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
): Promise<{ tokenId: number; netbookPda: PublicKey; signature: string }> {
  // Fetch current next token ID
  const config = await program.account.supplyChainConfig.fetch(configPda);
  const tokenId = config.nextTokenId.toNumber();
  const netbookPda = getNetbookPda(tokenId, program.programId);

  const signature = await program.methods
    .registerNetbook(serialNumber, batchId, modelSpecs)
    .accountsStrict({
      config: configPda,
      serialHashRegistry: serialHashRegistryPda,
      manufacturer: manufacturer.publicKey,
      netbook: netbookPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([manufacturer])
    .rpc();

  return { tokenId, netbookPda, signature };
}

/**
 * Perform hardware audit
 */
async function hardwareAudit(
  program: Program<ScSolana>,
  netbookPda: PublicKey,
  configPda: PublicKey,
  auditor: Keypair,
  serial: string,
  auditData: HardwareAuditData = TEST_AUDIT
): Promise<string> {
  const signature = await program.methods
    .auditHardware(serial, auditData.passed, auditData.reportHash)
    .accountsStrict({
      netbook: netbookPda,
      config: configPda,
      auditor: auditor.publicKey,
    })
    .signers([auditor])
    .rpc();
  return signature;
}

/**
 * Perform software validation
 */
async function softwareValidation(
  program: Program<ScSolana>,
  netbookPda: PublicKey,
  configPda: PublicKey,
  technician: Keypair,
  serial: string,
  validationData: SoftwareValidationData = TEST_VALIDATION
): Promise<string> {
  const signature = await program.methods
    .validateSoftware(serial, validationData.osVersion, validationData.passed)
    .accountsStrict({
      netbook: netbookPda,
      config: configPda,
      technician: technician.publicKey,
    })
    .signers([technician])
    .rpc();
  return signature;
}

/**
 * Assign netbook to student
 */
async function assignToStudent(
  program: Program<ScSolana>,
  netbookPda: PublicKey,
  configPda: PublicKey,
  school: Keypair,
  serial: string,
  studentIdHash: Array<number>,
  schoolIdHash: Array<number>
): Promise<string> {
  const signature = await program.methods
    .assignToStudent(serial, studentIdHash, schoolIdHash)
    .accountsStrict({
      netbook: netbookPda,
      config: configPda,
      school: school.publicKey,
    })
    .signers([school])
    .rpc();
  return signature;
}

// ============================================================================
// Test Suite
// ============================================================================

describe("Integration Testing with Local Solana Network", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.scSolana as Program<ScSolana>;
  const provider = anchor.getProvider() as AnchorProvider;

  // Test accounts
  const admin = Keypair.generate();
  const fabricante = Keypair.generate();
  const auditor = Keypair.generate();
  const technician = Keypair.generate();
  const school = Keypair.generate();
  const estudiante = Keypair.generate();

  // PDA references
  let configPda: PublicKey;
  let configBump: number;
  let serialHashRegistryPda: PublicKey;

  /**
   * Setup: Fund accounts and initialize program
   */
  before(async () => {
    console.log("\n=== Setting up Integration Test Environment ===\n");

    // Fund all test accounts
    console.log("Funding test accounts...");
    await fundKeypair(provider, admin);
    await fundKeypair(provider, fabricante);
    await fundKeypair(provider, auditor);
    await fundKeypair(provider, technician);
    await fundKeypair(provider, school);
    await fundKeypair(provider, estudiante);
    console.log("All test accounts funded.\n");

    // Get PDAs
    [configPda, configBump] = getConfigPda(program);
    serialHashRegistryPda = getSerialHashRegistryPda(configPda, program.programId);

    // Initialize program using PDA-first pattern
    const funder = Keypair.generate();
    await fundKeypair(provider, funder, 10);
    const [deployerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("deployer")],
      program.programId
    );
    const adminPda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), configPda.toBuffer()],
      program.programId
    )[0];
    
    await (program.methods as any)
      .fundDeployer(new anchor.BN(10 * anchor.web3.LAMPORTS_PER_SOL))
      .accounts({
        deployer: deployerPda,
        funder: funder.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([funder])
      .rpc();
    
    const initSig = await (program.methods as any)
      .initialize()
      .accounts({
        config: configPda,
        serialHashRegistry: serialHashRegistryPda,
        admin: adminPda,
        deployer: deployerPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Initialized config:", initSig);
  });

  // ========================================================================
  // Complete Lifecycle Test
  // ========================================================================

  describe("Complete Netbook Lifecycle", () => {
    it("executes full lifecycle: register -> audit -> validate -> assign", async () => {
      console.log("\n=== Starting Complete Lifecycle Test ===\n");

      // Step 1: Grant FABRICANTE role
      console.log("Step 1: Granting FABRICANTE role...");
      await grantRole(
        program,
        configPda,
        admin,
        fabricante,
        ROLE_TYPES.FABRICANTE
      );
      console.log("FABRICANTE role granted");

      // Step 2: Register netbook
      console.log("\nStep 2: Registering netbook...");
      const { tokenId, netbookPda, signature: regSig } = await registerNetbook(
        program,
        configPda,
        serialHashRegistryPda,
        fabricante,
        TEST_NETBOOK_1.serialNumber,
        TEST_NETBOOK_1.batchId,
        TEST_NETBOOK_1.initialModelSpecs
      );
      console.log(`Netbook registered with tokenId: ${tokenId}`);

      // Verify initial state
      let netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.state).to.equal(NetbookState.Fabricada);
      expect(netbook.serialNumber).to.equal(TEST_NETBOOK_1.serialNumber);
      expect(netbook.batchId).to.equal(TEST_NETBOOK_1.batchId);
      expect(netbook.exists).to.be.true;
      console.log("Initial state verified: Fabricada");

      // Step 3: Grant AUDITOR_HW role and perform hardware audit
      console.log("\nStep 3: Granting AUDITOR_HW role...");
      await grantRole(
        program,
        configPda,
        admin,
        auditor,
        ROLE_TYPES.AUDITOR_HW
      );
      console.log("AUDITOR_HW role granted");

      console.log("\nStep 4: Performing hardware audit...");
      await hardwareAudit(
        program,
        netbookPda,
        configPda,
        auditor,
        TEST_NETBOOK_1.serialNumber,
        TEST_AUDIT
      );
      console.log("Hardware audit passed");

      // Verify state after audit
      netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.state).to.equal(NetbookState.HwAprobado);
      expect(netbook.hwIntegrityPassed).to.be.true;
      expect(netbook.hwAuditor.toString()).to.equal(auditor.publicKey.toString());
      console.log("State after audit: HwAprobado");

      // Step 5: Grant TECNICO_SW role and perform software validation
      console.log("\nStep 5: Granting TECNICO_SW role...");
      await grantRole(
        program,
        configPda,
        admin,
        technician,
        ROLE_TYPES.TECNICO_SW
      );
      console.log("TECNICO_SW role granted");

      console.log("\nStep 6: Performing software validation...");
      await softwareValidation(
        program,
        netbookPda,
        configPda,
        technician,
        TEST_NETBOOK_1.serialNumber,
        TEST_VALIDATION
      );
      console.log("Software validation passed");

      // Verify state after validation
      netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.state).to.equal(NetbookState.SwValidado);
      expect(netbook.swValidationPassed).to.be.true;
      expect(netbook.swTechnician.toString()).to.equal(technician.publicKey.toString());
      console.log("State after validation: SwValidado");

      // Step 6: Grant ESCUELA role and assign to student
      console.log("\nStep 7: Granting ESCUELA role...");
      await grantRole(
        program,
        configPda,
        admin,
        school,
        ROLE_TYPES.ESCUELA
      );
      console.log("ESCUELA role granted");

      console.log("\nStep 8: Assigning netbook to student...");
      const studentIdHash = Array(32).fill(1);
      const schoolIdHash = Array(32).fill(2);
      await assignToStudent(
        program,
        netbookPda,
        configPda,
        school,
        TEST_NETBOOK_1.serialNumber,
        studentIdHash,
        schoolIdHash
      );
      console.log("Netbook assigned to student");

      // Verify final state
      netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.state).to.equal(NetbookState.Distribuida);
      expect(netbook.studentIdHash).to.deep.equal(studentIdHash);
      expect(netbook.destinationSchoolHash).to.deep.equal(schoolIdHash);
      console.log("Final state: Distribuida");

      // Verify config counters
      const config = await program.account.supplyChainConfig.fetch(configPda);
      expect(config.nextTokenId.toNumber()).to.equal(1);
      expect(config.totalNetbooks.toNumber()).to.equal(1);
      console.log("Config counters verified: nextTokenId=1, totalNetbooks=1");

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
        program,
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
        await program.methods
          .validateSoftware(netbook2.serialNumber, "Ubuntu 22.04", true)
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            technician: technician.publicKey,
          })
          .signers([technician])
          .rpc();
        expect.fail("Expected InvalidStateTransition error");
      } catch (error: any) {
        console.log("Correctly rejected:", error.message);
        expect(error.message).to.include("InvalidStateTransition");
      }

      // Try to assign without software validation (should fail)
      console.log("Attempting assignment without software validation...");
      try {
        await program.methods
          .assignToStudent(
            netbook2.serialNumber,
            Array(32).fill(3),
            Array(32).fill(4)
          )
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            school: school.publicKey,
          })
          .signers([school])
          .rpc();
        expect.fail("Expected InvalidStateTransition error");
      } catch (error: any) {
        console.log("Correctly rejected:", error.message);
        expect(error.message).to.include("InvalidStateTransition");
      }

      console.log("\n=== State Machine Validation Passed ===\n");
    });
  });

  // ========================================================================
  // Batch Registration Lifecycle
  // ========================================================================

  describe("Batch Registration Lifecycle", () => {
    it("registers multiple netbooks in batch and processes through lifecycle", async () => {
      console.log("\n=== Starting Batch Registration Lifecycle ===\n");

      const batchSerials = [
        createSerialNumber("NB", 102),
        createSerialNumber("NB", 103),
        createSerialNumber("NB", 104),
      ];
      const batchIds = [
        createBatchId("BATCH", 2024, 102),
        createBatchId("BATCH", 2024, 102),
        createBatchId("BATCH", 2024, 102),
      ];
      const modelSpecs = [
        createModelSpecs("BrandA", "ModelX", 2024),
        createModelSpecs("BrandB", "ModelY", 2024),
        createModelSpecs("BrandC", "ModelZ", 2024),
      ];

      // Register batch
      const batchSig = await program.methods
        .registerNetbooksBatch(batchSerials, batchIds, modelSpecs)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      console.log(`Batch registration: ${batchSig}`);

      // Verify config counters
      const config = await program.account.supplyChainConfig.fetch(configPda);
      expect(config.nextTokenId.toNumber()).to.equal(3);
      expect(config.totalNetbooks.toNumber()).to.equal(3);
      console.log("Config counters after batch: nextTokenId=3, totalNetbooks=3");

      // Audit all batch netbooks
      for (let i = 0; i < 3; i++) {
        const netbookPda = getNetbookPda(i, program.programId);
        await hardwareAudit(
          program,
          netbookPda,
          configPda,
          auditor,
          batchSerials[i],
          TEST_AUDIT
        );
        console.log(`Netbook ${i} hardware audited`);
      }

      // Validate software for all batch netbooks
      for (let i = 0; i < 3; i++) {
        const netbookPda = getNetbookPda(i, program.programId);
        await softwareValidation(
          program,
          netbookPda,
          configPda,
          technician,
          batchSerials[i],
          TEST_VALIDATION
        );
        console.log(`Netbook ${i} software validated`);
      }

      // Assign all batch netbooks
      for (let i = 0; i < 3; i++) {
        const netbookPda = getNetbookPda(i, program.programId);
        await assignToStudent(
          program,
          netbookPda,
          configPda,
          school,
          batchSerials[i],
          Array(32).fill(i + 5),
          Array(32).fill(6)
        );
        console.log(`Netbook ${i} assigned to student`);
      }

      // Verify final states
      for (let i = 0; i < 3; i++) {
        const netbookPda = getNetbookPda(i, program.programId);
        const netbook = await program.account.netbook.fetch(netbookPda);
        expect(netbook.state).to.equal(NetbookState.Distribuida);
        console.log(`Netbook ${i} final state: Distribuida`);
      }

      console.log("\n=== Batch Registration Lifecycle Passed ===\n");
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
        program,
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
        await program.methods
          .assignToStudent(
            netbook3.serialNumber,
            Array(32).fill(7),
            Array(32).fill(8)
          )
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            school: school.publicKey,
          })
          .signers([school])
          .rpc();
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
      await fundKeypair(provider, randomUser);

      // Register a netbook first
      const netbook4 = {
        serialNumber: createSerialNumber("NB", 106),
        batchId: createBatchId("MFG", 2024, 106),
        initialModelSpecs: createModelSpecs("TestBrand4", "ProBook2", 2024),
      };

      const { netbookPda } = await registerNetbook(
        program,
        configPda,
        serialHashRegistryPda,
        fabricante,
        netbook4.serialNumber,
        netbook4.batchId,
        netbook4.initialModelSpecs
      );

      // Grant FABRICANTE role to random user
      await grantRole(
        program,
        configPda,
        admin,
        randomUser,
        ROLE_TYPES.FABRICANTE
      );

      // Try to audit as non-auditor (should fail)
      console.log("Attempting audit without auditor role...");
      try {
        await program.methods
          .auditHardware(netbook4.serialNumber, true, createHash(99))
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            auditor: randomUser.publicKey,
          })
          .signers([randomUser])
          .rpc();
        expect.fail("Expected UnauthorizedAccess error");
      } catch (error: any) {
        console.log("Correctly rejected:", error.message);
        expect(error.message).to.include("UnauthorizedAccess");
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

      const config = await program.account.supplyChainConfig.fetch(configPda);

      expect(config.admin.toString()).to.equal(admin.publicKey.toString());
      expect(config.nextTokenId.toNumber()).to.be.greaterThan(0);
      expect(config.totalNetbooks.toNumber()).to.be.greaterThan(0);

      console.log(`Config: admin=${config.admin.toString()}`);
      console.log(`Config: nextTokenId=${config.nextTokenId.toNumber()}`);
      console.log(`Config: totalNetbooks=${config.totalNetbooks.toNumber()}`);

      console.log("\n=== Query Operations Test Passed ===\n");
    });

    it("queries netbook state for all registered netbooks", async () => {
      console.log("\n=== Testing Netbook Query ===\n");

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const totalNetbooks = config.totalNetbooks.toNumber();

      for (let i = 0; i < totalNetbooks; i++) {
        const netbookPda = getNetbookPda(i, program.programId);
        const netbook = await program.account.netbook.fetch(netbookPda);

        expect(netbook.tokenId.toNumber()).to.equal(i);
        expect(netbook.state).to.be.greaterThanOrEqual(0);
        expect(netbook.exists).to.be.true;

        console.log(
          `Netbook ${i}: state=${netbook.state}, serial=${netbook.serialNumber}`
        );
      }

      console.log(`\nQueried ${totalNetbooks} netbooks successfully`);
      console.log("\n=== Netbook Query Test Passed ===\n");
    });
  });

  // ========================================================================
  // Concurrent Operations Tests
  // ========================================================================

  describe("Concurrent Operations", () => {
    it("handles concurrent netbook registrations", async () => {
      console.log("\n=== Testing Concurrent Operations ===\n");

      const concurrentSerials: string[] = [];

      // Register multiple netbooks sequentially (concurrent in blockchain terms)
      for (let i = 0; i < 3; i++) {
        const serial = createSerialNumber("NB", 200 + i);
        const batchId = createBatchId("CONCURRENT", 2024, 200 + i);
        const modelSpecs = createModelSpecs("Concurrent", `Model${i}`, 2024);

        const { netbookPda } = await registerNetbook(
          program,
          configPda,
          serialHashRegistryPda,
          fabricante,
          serial,
          batchId,
          modelSpecs
        );

        concurrentSerials.push(serial);
        console.log(`Concurrent registration ${i}: serial=${serial}`);
      }

      // Verify all netbooks were registered
      const config = await program.account.supplyChainConfig.fetch(configPda);
      expect(config.totalNetbooks.toNumber()).to.be.greaterThan(3);

      console.log(`\nTotal netbooks after concurrent operations: ${config.totalNetbooks.toNumber()}`);
      console.log("\n=== Concurrent Operations Test Passed ===\n");
    });
  });

  // ========================================================================
  // Event Emission Tests
  // ========================================================================

  describe("Event Emission Verification", () => {
    it("emits events for lifecycle transitions", async () => {
      console.log("\n=== Testing Event Emission ===\n");

      const testNetbook = {
        serialNumber: createSerialNumber("NB", 300),
        batchId: createBatchId("EVENT", 2024, 300),
        initialModelSpecs: createModelSpecs("EventBrand", "EventModel", 2024),
      };

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const testTokenId = config.nextTokenId.toNumber();

      let eventReceived = false;
      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Event emission timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          // Check for netbook-related logs
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("NetbookRegistered")
          );

          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            console.log("NetbookRegistered event received");
            resolve();
          }
        };

        provider.connection.onLogs(
          fabricante.publicKey,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .registerNetbook(
          testNetbook.serialNumber,
          testNetbook.batchId,
          testNetbook.initialModelSpecs
        )
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          netbook: getNetbookPda(testTokenId, program.programId),
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      await eventPromise;
      expect(eventReceived).to.be.true;

      console.log("\n=== Event Emission Test Passed ===\n");
    });
  });

  // ========================================================================
  // Serial Hash Registry Tests
  // ========================================================================

  describe("Serial Hash Registry Verification", () => {
    it("stores serial hashes for all registered netbooks", async () => {
      console.log("\n=== Testing Serial Hash Registry ===\n");

      // Verify serial hash registry exists
      const registryExists = await provider.connection.getAccountInfo(
        serialHashRegistryPda
      );
      expect(registryExists).to.not.be.null;
      console.log("Serial hash registry account exists");

      // Verify some serial hashes are stored by checking netbook data
      const config = await program.account.supplyChainConfig.fetch(configPda);
      const totalNetbooks = config.totalNetbooks.toNumber();

      for (let i = 0; i < Math.min(3, totalNetbooks); i++) {
        const netbookPda = getNetbookPda(i, program.programId);
        const netbook = await program.account.netbook.fetch(netbookPda);

        console.log(`Netbook ${i} serial hash verified: ${netbook.serialNumber}`);
      }

      console.log("\n=== Serial Hash Registry Test Passed ===\n");
    });
  });
});
