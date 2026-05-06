/**
 * Lifecycle Integration Tests
 *
 * Tests the complete netbook lifecycle from registration to distribution.
 * Verifies state transitions, role enforcement, and event emission.
 *
 * Related Issues:
 * - Issue #67: Complete Lifecycle Integration Test
 * - Original Issue #10: Phase 11: Integration Tests
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
  RequestStatus,
  ROLE_TYPES,
  createHash,
  createStringHash,
  createSerialNumber,
  createBatchId,
  createModelSpecs,
  getConfigPda,
  getNetbookPda,
  getRoleRequestPda,
  waitForConfirmation,
  TestAccounts,
  NetbookRegistrationData,
  HardwareAuditData,
  SoftwareValidationData,
  StudentAssignmentData,
} from "./test-helpers";

// ============================================================================
// Test Data Constants
// ============================================================================

const TEST_NETBOOK: NetbookRegistrationData = {
  serialNumber: createSerialNumber("NB", 1),
  batchId: createBatchId("MFG", 2024, 1),
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

const TEST_ASSIGNMENT: StudentAssignmentData = {
  studentIdHash: createStringHash("student-001"),
  schoolIdHash: createStringHash("school-001"),
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fund a keypair with SOL
 */
async function fundKeypair(
  provider: AnchorProvider,
  keypair: Keypair,
  amountSol: number = 2
): Promise<string> {
  const signature = await provider.connection.requestAirdrop(
    keypair.publicKey,
    amountSol * LAMPORTS_PER_SOL
  );
  const latestBlockhash = await provider.connection.getLatestBlockhash();
  await provider.connection.confirmTransaction({
    signature,
    ...latestBlockhash,
  });
  return signature;
}

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
    .signers([admin, accountToGrant])
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
  netbookData: NetbookRegistrationData = TEST_NETBOOK
): Promise<{ tokenId: number; netbookPda: PublicKey; signature: string }> {
  // Fetch current next token ID
  const config = await program.account.supplyChainConfig.fetch(configPda);
  const tokenId = config.nextTokenId.toNumber();
  const netbookPda = getNetbookPda(tokenId, program.programId);

  const signature = await program.methods
    .registerNetbook(
      netbookData.serialNumber,
      netbookData.batchId,
      netbookData.initialModelSpecs
    )
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
  assignmentData: StudentAssignmentData = TEST_ASSIGNMENT
): Promise<string> {
  const signature = await program.methods
    .assignToStudent(
      serial,
      assignmentData.studentIdHash,
      assignmentData.schoolIdHash
    )
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

describe("Lifecycle Integration Tests", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.scSolana as Program<ScSolana>;
  const provider = anchor.getProvider() as AnchorProvider;

  // Test accounts
  const admin = Keypair.generate();
  const fabricante = Keypair.generate();
  const auditor = Keypair.generate();
  const technician = Keypair.generate();
  const school = Keypair.generate();

  // PDA references
  let configPda: PublicKey;
  let configBump: number;
  let serialHashRegistryPda: PublicKey;

  /**
   * Setup: Fund accounts and initialize program
   */
  before(async () => {
    // Fund all test accounts
    await fundKeypair(provider, admin);
    await fundKeypair(provider, fabricante);
    await fundKeypair(provider, auditor);
    await fundKeypair(provider, technician);
    await fundKeypair(provider, school);

    // Get PDAs
    [configPda, configBump] = getConfigPda(program);
    serialHashRegistryPda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("serial_hashes"), configPda.toBuffer()],
      program.programId
    )[0];

    // Initialize program
    const initSig = await program.methods
      .initialize()
      .accountsStrict({
        admin: admin.publicKey,
        config: configPda,
        serialHashRegistry: serialHashRegistryPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
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
      console.log("✓ FABRICANTE role granted");

      // Step 2: Register netbook
      console.log("\nStep 2: Registering netbook...");
      const { tokenId, netbookPda, signature: regSig } = await registerNetbook(
        program,
        configPda,
        serialHashRegistryPda,
        fabricante,
        TEST_NETBOOK
      );
      console.log(`✓ Netbook registered with tokenId: ${tokenId}`);

      // Verify initial state
      let netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.state).to.equal(NetbookState.Fabricada);
      expect(netbook.serialNumber).to.equal(TEST_NETBOOK.serialNumber);
      expect(netbook.batchId).to.equal(TEST_NETBOOK.batchId);
      expect(netbook.exists).to.be.true;
      console.log("✓ Initial state verified: Fabricada");

      // Step 3: Grant AUDITOR_HW role and perform hardware audit
      console.log("\nStep 3: Granting AUDITOR_HW role...");
      await grantRole(
        program,
        configPda,
        admin,
        auditor,
        ROLE_TYPES.AUDITOR_HW
      );
      console.log("✓ AUDITOR_HW role granted");

      console.log("\nStep 4: Performing hardware audit...");
      await hardwareAudit(
        program,
        netbookPda,
        configPda,
        auditor,
        TEST_NETBOOK.serialNumber,
        TEST_AUDIT
      );
      console.log("✓ Hardware audit passed");

      // Verify state after audit
      netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.state).to.equal(NetbookState.HwAprobado);
      expect(netbook.hwIntegrityPassed).to.be.true;
      expect(netbook.hwAuditor.toString()).to.equal(auditor.publicKey.toString());
      console.log("✓ State after audit: HwAprobado");

      // Step 5: Grant TECNICO_SW role and perform software validation
      console.log("\nStep 5: Granting TECNICO_SW role...");
      await grantRole(
        program,
        configPda,
        admin,
        technician,
        ROLE_TYPES.TECNICO_SW
      );
      console.log("✓ TECNICO_SW role granted");

      console.log("\nStep 6: Performing software validation...");
      await softwareValidation(
        program,
        netbookPda,
        configPda,
        technician,
        TEST_NETBOOK.serialNumber,
        TEST_VALIDATION
      );
      console.log("✓ Software validation passed");

      // Verify state after validation
      netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.state).to.equal(NetbookState.SwValidado);
      expect(netbook.swValidationPassed).to.be.true;
      expect(netbook.osVersion).to.equal(TEST_VALIDATION.osVersion);
      expect(netbook.swTechnician.toString()).to.equal(
        technician.publicKey.toString()
      );
      console.log("✓ State after validation: SwValidado");

      // Step 6: Grant ESCUELA role and assign to student
      console.log("\nStep 7: Granting ESCUELA role...");
      await grantRole(
        program,
        configPda,
        admin,
        school,
        ROLE_TYPES.ESCUELA
      );
      console.log("✓ ESCUELA role granted");

      console.log("\nStep 8: Assigning to student...");
      await assignToStudent(
        program,
        netbookPda,
        configPda,
        school,
        TEST_NETBOOK.serialNumber,
        TEST_ASSIGNMENT
      );
      console.log("✓ Student assignment completed");

      // Verify final state
      netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.state).to.equal(NetbookState.Distribuida);
      expect(netbook.studentIdHash).to.deep.equal(TEST_ASSIGNMENT.studentIdHash);
      expect(netbook.destinationSchoolHash).to.deep.equal(
        TEST_ASSIGNMENT.schoolIdHash
      );
      expect(netbook.distributionTimestamp.toNumber()).to.be.greaterThan(0);
      console.log("✓ Final state: Distribuida");

      // Verify config updates
      const config = await program.account.supplyChainConfig.fetch(configPda);
      expect(config.totalNetbooks.toNumber()).to.be.greaterThan(0);
      console.log("✓ Config totalNetbooks updated");

      console.log("\n=== Complete Lifecycle Test Passed ===\n");
    });

    // ========================================================================
    // Failed Lifecycle Test (hardware audit fails)
    // ========================================================================

    it("handles failed hardware audit correctly", async () => {
      console.log("\n=== Starting Failed Hardware Audit Test ===\n");

      // Grant roles
      await grantRole(
        program,
        configPda,
        admin,
        fabricante,
        ROLE_TYPES.FABRICANTE
      );
      await grantRole(
        program,
        configPda,
        admin,
        auditor,
        ROLE_TYPES.AUDITOR_HW
      );

      // Register netbook
      const failedNetbookData: NetbookRegistrationData = {
        serialNumber: createSerialNumber("NB-FAIL", 1),
        batchId: createBatchId("MFG", 2024, 2),
        initialModelSpecs: createModelSpecs("FailBrand", "BadBook", 2024),
      };

      const { netbookPda } = await registerNetbook(
        program,
        configPda,
        serialHashRegistryPda,
        fabricante,
        failedNetbookData
      );

      // Perform failed hardware audit
      const failedAudit: HardwareAuditData = {
        passed: false,
        reportHash: createHash(0),
      };

      await hardwareAudit(
        program,
        netbookPda,
        configPda,
        auditor,
        failedNetbookData.serialNumber,
        failedAudit
      );

      // Verify netbook remains in Fabricada state
      const netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.state).to.equal(NetbookState.Fabricada);
      expect(netbook.hwIntegrityPassed).to.be.false;
      console.log("✓ Netbook remains in Fabricada after failed audit");

      console.log("\n=== Failed Hardware Audit Test Passed ===\n");
    });

    // ========================================================================
    // State Transition Validation Tests
    // ========================================================================

    describe("State Transition Validation", () => {
      it("cannot skip state transitions", async () => {
        console.log("\n=== Starting State Skip Test ===\n");

        // Setup
        await grantRole(
          program,
          configPda,
          admin,
          fabricante,
          ROLE_TYPES.FABRICANTE
        );
        await grantRole(
          program,
          configPda,
          admin,
          technician,
          ROLE_TYPES.TECNICO_SW
        );

        // Register netbook
        const { netbookPda } = await registerNetbook(
          program,
          configPda,
          serialHashRegistryPda,
          fabricante,
          {
            serialNumber: createSerialNumber("NB-SKIP", 1),
            batchId: createBatchId("MFG", 2024, 3),
            initialModelSpecs: createModelSpecs("SkipBrand", "SkipBook", 2024),
          }
        );

        // Attempt to validate software without hardware audit (should fail)
        try {
          await program.methods
            .validateSoftware(
              "NB-SKIP-000001",
              "Ubuntu 22.04",
              true
            )
            .accountsStrict({
              netbook: netbookPda,
              config: configPda,
              technician: technician.publicKey,
            })
            .signers([technician])
            .rpc();
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
        await grantRole(
          program,
          configPda,
          admin,
          fabricante,
          ROLE_TYPES.FABRICANTE
        );
        await grantRole(
          program,
          configPda,
          admin,
          auditor,
          ROLE_TYPES.AUDITOR_HW
        );
        await grantRole(
          program,
          configPda,
          admin,
          school,
          ROLE_TYPES.ESCUELA
        );

        // Register and audit netbook
        const { netbookPda } = await registerNetbook(
          program,
          configPda,
          serialHashRegistryPda,
          fabricante,
          {
            serialNumber: createSerialNumber("NB-NOVALID", 1),
            batchId: createBatchId("MFG", 2024, 4),
            initialModelSpecs: createModelSpecs(
              "NoValidBrand",
              "NoValidBook",
              2024
            ),
          }
        );

        // Hardware audit only
        await hardwareAudit(
          program,
          netbookPda,
          configPda,
          auditor,
          "NB-NOVALID-000001",
          { passed: true, reportHash: createHash(1) }
        );

        // Attempt to assign without software validation (should fail)
        try {
          await program.methods
            .assignToStudent(
              "NB-NOVALID-000001",
              createStringHash("student-test"),
              createStringHash("school-test")
            )
            .accountsStrict({
              netbook: netbookPda,
              config: configPda,
              school: school.publicKey,
            })
            .signers([school])
            .rpc();
          expect.fail("Should have thrown InvalidStateTransition error");
        } catch (err: any) {
          expect(err.message).to.include("InvalidStateTransition");
          console.log(
            "✓ Correctly rejected assignment without software validation"
          );
        }

        console.log("\n=== Assign Without Validation Test Passed ===\n");
      });

      it("cannot repeat completed state transitions", async () => {
        console.log("\n=== Starting Repeat Transition Test ===\n");

        // Setup - create a fully distributed netbook
        await grantRole(
          program,
          configPda,
          admin,
          fabricante,
          ROLE_TYPES.FABRICANTE
        );
        await grantRole(
          program,
          configPda,
          admin,
          auditor,
          ROLE_TYPES.AUDITOR_HW
        );
        await grantRole(
          program,
          configPda,
          admin,
          technician,
          ROLE_TYPES.TECNICO_SW
        );
        await grantRole(
          program,
          configPda,
          admin,
          school,
          ROLE_TYPES.ESCUELA
        );

        const { netbookPda } = await registerNetbook(
          program,
          configPda,
          serialHashRegistryPda,
          fabricante,
          {
            serialNumber: createSerialNumber("NB-REPEAT", 1),
            batchId: createBatchId("MFG", 2024, 5),
            initialModelSpecs: createModelSpecs(
              "RepeatBrand",
              "RepeatBook",
              2024
            ),
          }
        );

        // Complete full lifecycle
        await hardwareAudit(
          program,
          netbookPda,
          configPda,
          auditor,
          "NB-REPEAT-000001",
          { passed: true, reportHash: createHash(1) }
        );

        await program.methods
          .validateSoftware(
            "NB-REPEAT-000001",
            "Ubuntu 22.04",
            true
          )
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            technician: technician.publicKey,
          })
          .signers([technician])
          .rpc();

        await program.methods
          .assignToStudent(
            "NB-REPEAT-000001",
            createStringHash("student-repeat"),
            createStringHash("school-repeat")
          )
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            school: school.publicKey,
          })
          .signers([school])
          .rpc();

        // Verify final state
        let netbook = await program.account.netbook.fetch(netbookPda);
        expect(netbook.state).to.equal(NetbookState.Distribuida);

        // Attempt hardware audit on distributed netbook (should fail)
        try {
          await program.methods
            .auditHardware(
              "NB-REPEAT-000001",
              true,
              createHash(99)
            )
            .accountsStrict({
              netbook: netbookPda,
              config: configPda,
              auditor: auditor.publicKey,
            })
            .signers([auditor])
            .rpc();
          expect.fail("Should have thrown InvalidStateTransition error");
        } catch (err: any) {
          expect(err.message).to.include("InvalidStateTransition");
          console.log(
            "✓ Correctly rejected hardware audit on distributed netbook"
          );
        }

        // Attempt software validation on distributed netbook (should fail)
        try {
          await program.methods
            .validateSoftware(
              "NB-REPEAT-000001",
              "Ubuntu 24.04",
              true
            )
            .accountsStrict({
              netbook: netbookPda,
              config: configPda,
              technician: technician.publicKey,
            })
            .signers([technician])
            .rpc();
          expect.fail("Should have thrown InvalidStateTransition error");
        } catch (err: any) {
          expect(err.message).to.include("InvalidStateTransition");
          console.log(
            "✓ Correctly rejected software validation on distributed netbook"
          );
        }

        console.log("\n=== Repeat Transition Test Passed ===\n");
      });
    });

    // ========================================================================
    // Multiple Lifecycle Test
    // ========================================================================

    describe("Multiple Netbook Lifecycle", () => {
      it("handles multiple netbooks through lifecycle concurrently", async () => {
        console.log(
          "\n=== Starting Multiple Netbook Lifecycle Test ===\n"
        );

        // Setup roles
        await grantRole(
          program,
          configPda,
          admin,
          fabricante,
          ROLE_TYPES.FABRICANTE
        );
        await grantRole(
          program,
          configPda,
          admin,
          auditor,
          ROLE_TYPES.AUDITOR_HW
        );
        await grantRole(
          program,
          configPda,
          admin,
          technician,
          ROLE_TYPES.TECNICO_SW
        );
        await grantRole(
          program,
          configPda,
          admin,
          school,
          ROLE_TYPES.ESCUELA
        );

        const netbookResults = [];
        const numNetbooks = 3;

        // Register all netbooks
        console.log(`Registering ${numNetbooks} netbooks...`);
        for (let i = 0; i < numNetbooks; i++) {
          const serial = createSerialNumber("NB-MULTI", i + 1);
          const { tokenId, netbookPda } = await registerNetbook(
            program,
            configPda,
            serialHashRegistryPda,
            fabricante,
            {
              serialNumber: serial,
              batchId: createBatchId("MFG", 2024, i + 10),
              initialModelSpecs: createModelSpecs(
                `MultiBrand${i}`,
                `MultiBook${i}`,
                2024
              ),
            }
          );
          netbookResults.push({ tokenId, netbookPda, serial });
          console.log(`✓ Registered netbook ${i + 1}: ${serial}`);
        }

        // Audit all netbooks
        console.log("\nAuditing all netbooks...");
        for (const result of netbookResults) {
          await hardwareAudit(
            program,
            result.netbookPda,
            configPda,
            auditor,
            result.serial,
            { passed: true, reportHash: createHash(result.tokenId) }
          );
          console.log(`✓ Audited netbook ${result.tokenId}`);
        }

        // Validate all netbooks
        console.log("\nValidating all netbooks...");
        for (const result of netbookResults) {
          await softwareValidation(
            program,
            result.netbookPda,
            configPda,
            technician,
            result.serial,
            {
              passed: true,
              osVersion: `Ubuntu 22.04 LTS - Batch ${result.tokenId}`,
            }
          );
          console.log(`✓ Validated netbook ${result.tokenId}`);
        }

        // Assign all netbooks
        console.log("\nAssigning all netbooks...");
        for (let i = 0; i < netbookResults.length; i++) {
          const result = netbookResults[i];
          await assignToStudent(
            program,
            result.netbookPda,
            configPda,
            school,
            result.serial,
            {
              studentIdHash: createStringHash(`student-multi-${i + 1}`),
              schoolIdHash: createStringHash(`school-multi-${i + 1}`),
            }
          );
          console.log(`✓ Assigned netbook ${result.tokenId}`);
        }

        // Verify all netbooks are in Distribuida state
        console.log("\nVerifying final states...");
        for (const result of netbookResults) {
          const netbook = await program.account.netbook.fetch(result.netbookPda);
          expect(netbook.state).to.equal(NetbookState.Distribuida);
          console.log(
            `✓ Netbook ${result.tokenId} (${result.serial}): Distribuida`
          );
        }

        // Verify config
        const config = await program.account.supplyChainConfig.fetch(configPda);
        expect(config.totalNetbooks.toNumber()).to.equal(numNetbooks + 5); // 5 from previous tests + 3 new

        console.log("\n=== Multiple Netbook Lifecycle Test Passed ===\n");
      });
    });
  });
});
