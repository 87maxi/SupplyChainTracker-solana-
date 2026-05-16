/**
 * State Machine Transition Validation Tests
 *
 * Comprehensive test suite for netbook state machine validation.
 * Verifies that state transitions follow the correct order and invalid
 * transitions are properly rejected.
 *
 * State Machine:
 * - Fabricada (0) → Initial state after registration
 * - HwAprobado (1) → After hardware audit (passed=true)
 * - SwValidado (2) → After software validation (passed=true)
 * - Distribuida (3) → After assigning to student
 *
 * Issue #73: State Machine Transition Validation Tests (P1)
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
  createHash,
  NetbookState,
  generateUniqueSerial,
  type TestClient,
} from "./test-helpers";

describe("State Machine Transition Validation Tests", () => {
  let client: TestClient;
  let admin: Keypair;
  let fabricante: Keypair;
  let auditor: Keypair;
  let technician: Keypair;
  let school: Keypair;

  let configPda: string;
  let adminPda: string;
  let serialHashRegistryPda: string;

  // ========================================================================
  // Setup
  // ========================================================================

  before(async () => {
    // Generate test accounts
    admin = Keypair.generate();
    fabricante = Keypair.generate();
    auditor = Keypair.generate();
    technician = Keypair.generate();
    school = Keypair.generate();

    // Create test client
    client = await createTestClient("http://localhost:8899", admin);

    // Fund all accounts
    await fundKeypair(client, fabricante, 2);
    await fundKeypair(client, auditor, 2);
    await fundKeypair(client, technician, 2);
    await fundKeypair(client, school, 2);

    // Get PDAs
    configPda = await getConfigPdaAddress();
    serialHashRegistryPda = await getSerialHashRegistryPdaAddress(toAddress(configPda));
    adminPda = await getAdminPdaAddress(toAddress(configPda));

    // Initialize config using shared initialization (Issue #178)
    await fundAndInitialize(client, admin);

    // Grant roles
    await grantRole("FABRICANTE", fabricante);
    await grantRole("AUDITOR_HW", auditor);
    await grantRole("TECNICO_SW", technician);
    await grantRole("ESCUELA", school);
  });

  async function grantRole(role: string, account: Keypair): Promise<void> {
    const accountSigner = await createSignerFromKeyPair(account);
    await client.scSolana.instructions.grantRole({
      config: toAddress(configPda),
      admin: toAddress(adminPda),
      accountToGrant: accountSigner,
      role,
    }).sendTransaction();
  }

  async function registerNetbook(
    _fixedSerial: string,
    batchId: string,
    modelSpecs: string
  ): Promise<string> {
    // Generate unique serial to avoid collisions between test runs
    const serialNumber = generateUniqueSerial("SM");
    const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
    const tokenId = Number(config.nextTokenId);
    const netbookPda = await getNetbookPdaAddress(tokenId);

    const fabricanteSigner = await createSignerFromKeyPair(fabricante);
    await client.scSolana.instructions.registerNetbook({
      manufacturer: fabricanteSigner,
      netbook: toAddress(netbookPda),
      config: toAddress(configPda),
      serialHashRegistry: toAddress(serialHashRegistryPda),
      serialNumber,
      batchId,
      initialModelSpecs: modelSpecs,
    }).sendTransaction();

    return netbookPda;
  }

  async function getNetbookState(netbookPda: string): Promise<NetbookState> {
    const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
    return netbook.state as NetbookState;
  }

  // ========================================================================
  // 1. Valid State Transition Tests
  // ========================================================================

  describe("Valid State Transitions", () => {
    it("executes full lifecycle: Fabricada → HwAprobado → SwValidado → Distribuida", async () => {
      const netbookPda = await registerNetbook(
        "FULL-LIFECYCLE-001",
        "LIFECYCLE-BATCH-001",
        "Full Lifecycle Model"
      );

      // Verify initial state is Fabricada
      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.Fabricada);

      // Transition 1: Fabricada → HwAprobado via hardware audit
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "FULL-LIFECYCLE-001",
        passed: true,
        reportHash: toUint8Array(createHash(100)),
      }).sendTransaction();

      state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.HwAprobado);

      // Transition 2: HwAprobado → SwValidado via software validation
      const technicianSigner = await createSignerFromKeyPair(technician);
      await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial: "FULL-LIFECYCLE-001",
        osVersion: "Ubuntu 22.04 LTS",
        passed: true,
      }).sendTransaction();

      state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.SwValidado);

      // Transition 3: SwValidado → Distribuida via student assignment
      const schoolSigner = await createSignerFromKeyPair(school);
      await client.scSolana.instructions.assignToStudent({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        school: schoolSigner,
        serial: "FULL-LIFECYCLE-001",
        schoolHash: toUint8Array(createHash(200)),
        studentIdHash: toUint8Array(createHash(300)),
      }).sendTransaction();

      state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.Distribuida);
    });

    it("executes partial lifecycle ending at HwAprobado (failed software validation)", async () => {
      const netbookPda = await registerNetbook(
        "PARTIAL-001",
        "PARTIAL-BATCH-001",
        "Partial Lifecycle Model"
      );

      // Register → HwAprobado
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "PARTIAL-001",
        passed: true,
        reportHash: toUint8Array(createHash(101)),
      }).sendTransaction();

      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.HwAprobado);

      // Failed software validation - should NOT transition state
      const technicianSigner = await createSignerFromKeyPair(technician);
      await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial: "PARTIAL-001",
        osVersion: "Ubuntu 22.04 LTS",
        passed: false,
      }).sendTransaction();

      // State should still be HwAprobado when audit fails
      state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.HwAprobado);
    });

    it("executes partial lifecycle with failed hardware audit", async () => {
      const netbookPda = await registerNetbook(
        "PARTIAL-HW-001",
        "PARTIAL-HW-BATCH-001",
        "Partial HW Model"
      );

      // Failed hardware audit - should NOT transition state
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "PARTIAL-HW-001",
        passed: false,
        reportHash: toUint8Array(createHash(102)),
      }).sendTransaction();

      // State should still be Fabricada when audit fails
      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.Fabricada);

      // Successful hardware audit should now work
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "PARTIAL-HW-001",
        passed: true,
        reportHash: toUint8Array(createHash(103)),
      }).sendTransaction();

      state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.HwAprobado);
    });
  });

  // ========================================================================
  // 2. Invalid State Transition Tests - Skipping States
  // ========================================================================

  describe("Invalid State Transitions - Skipping States", () => {
    it("cannot skip to software validation without hardware audit", async () => {
      const netbookPda = await registerNetbook(
        "SKIP-STATE-001",
        "SKIP-BATCH-001",
        "Skip State Model"
      );

      // Verify initial state is Fabricada
      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.Fabricada);

      // Try to validate software directly from Fabricada state (should fail)
      try {
        const technicianSigner = await createSignerFromKeyPair(technician);
        await client.scSolana.instructions.validateSoftware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          technician: technicianSigner,
          serial: "SKIP-STATE-001",
          osVersion: "Ubuntu 22.04",
          passed: true,
        }).sendTransaction();
        expect.fail("Expected software validation to fail from Fabricada state");
      } catch (error: any) {
        expect(error).to.not.be.null;
        // Should get InvalidStateTransition error
        expect(error.message).to.contain("InvalidStateTransition");
      }

      // Verify state is still Fabricada
      state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.Fabricada);
    });

    it("cannot skip to student assignment without software validation", async () => {
      const netbookPda = await registerNetbook(
        "SKIP-STATE-002",
        "SKIP-BATCH-002",
        "Skip State Model 2"
      );

      // Perform hardware audit to get to HwAprobado
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "SKIP-STATE-002",
        passed: true,
        reportHash: toUint8Array(createHash(104)),
      }).sendTransaction();

      // Verify state is HwAprobado
      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.HwAprobado);

      // Try to assign to student directly from HwAprobado state (should fail)
      try {
        const schoolSigner = await createSignerFromKeyPair(school);
        await client.scSolana.instructions.assignToStudent({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          school: schoolSigner,
          serial: "SKIP-STATE-002",
          schoolHash: toUint8Array(createHash(201)),
          studentIdHash: toUint8Array(createHash(301)),
        }).sendTransaction();
        expect.fail("Expected student assignment to fail from HwAprobado state");
      } catch (error: any) {
        expect(error).to.not.be.null;
        // Should get InvalidStateTransition error
        expect(error.message).to.contain("InvalidStateTransition");
      }

      // Verify state is still HwAprobado
      state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.HwAprobado);
    });

    it("cannot skip hardware audit and go directly to student assignment", async () => {
      const netbookPda = await registerNetbook(
        "SKIP-STATE-003",
        "SKIP-BATCH-003",
        "Skip State Model 3"
      );

      // Verify initial state is Fabricada
      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.Fabricada);

      // Try to assign to student directly from Fabricada state (should fail)
      try {
        const schoolSigner = await createSignerFromKeyPair(school);
        await client.scSolana.instructions.assignToStudent({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          school: schoolSigner,
          serial: "SKIP-STATE-003",
          schoolHash: toUint8Array(createHash(202)),
          studentIdHash: toUint8Array(createHash(302)),
        }).sendTransaction();
        expect.fail("Expected student assignment to fail from Fabricada state");
      } catch (error: any) {
        expect(error).to.not.be.null;
        // Should get InvalidStateTransition error
        expect(error.message).to.contain("InvalidStateTransition");
      }

      // Verify state is still Fabricada
      state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.Fabricada);
    });
  });

  // ========================================================================
  // 3. Reverse State Transition Tests
  // ========================================================================

  describe("Invalid State Transitions - Reverse Order", () => {
    it("cannot go backwards from HwAprobado to Fabricada via failed audit", async () => {
      const netbookPda = await registerNetbook(
        "REVERSE-001",
        "REVERSE-BATCH-001",
        "Reverse Model"
      );

      // Get to HwAprobado
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "REVERSE-001",
        passed: true,
        reportHash: toUint8Array(createHash(105)),
      }).sendTransaction();

      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.HwAprobado);

      // Try to audit hardware again (should fail - not in Fabricada state)
      try {
        await client.scSolana.instructions.auditHardware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          auditor: auditorSigner,
          serial: "REVERSE-001",
          passed: false,
          reportHash: toUint8Array(createHash(106)),
        }).sendTransaction();
        expect.fail("Expected hardware audit to fail from HwAprobado state");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.message).to.contain("InvalidStateTransition");
      }

      // Verify state is still HwAprobado (not reverted to Fabricada)
      state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.HwAprobado);
    });

    it("cannot go backwards from SwValidado to HwAprobado", async () => {
      const netbookPda = await registerNetbook(
        "REVERSE-002",
        "REVERSE-BATCH-002",
        "Reverse Model 2"
      );

      // Get to SwValidado
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "REVERSE-002",
        passed: true,
        reportHash: toUint8Array(createHash(107)),
      }).sendTransaction();

      const technicianSigner = await createSignerFromKeyPair(technician);
      await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial: "REVERSE-002",
        osVersion: "Ubuntu 22.04",
        passed: true,
      }).sendTransaction();

      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.SwValidado);

      // Try to validate software again (should fail - not in HwAprobado state)
      try {
        await client.scSolana.instructions.validateSoftware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          technician: technicianSigner,
          serial: "REVERSE-002",
          osVersion: "Ubuntu 22.04",
          passed: false,
        }).sendTransaction();
        expect.fail("Expected software validation to fail from SwValidado state");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.message).to.contain("InvalidStateTransition");
      }

      // Verify state is still SwValidado
      state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.SwValidado);
    });

    it("cannot go backwards from Distribuida to any previous state", async () => {
      const netbookPda = await registerNetbook(
        "REVERSE-003",
        "REVERSE-BATCH-003",
        "Reverse Model 3"
      );

      // Complete full lifecycle
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "REVERSE-003",
        passed: true,
        reportHash: toUint8Array(createHash(108)),
      }).sendTransaction();

      const technicianSigner = await createSignerFromKeyPair(technician);
      await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial: "REVERSE-003",
        osVersion: "Ubuntu 22.04",
        passed: true,
      }).sendTransaction();

      const schoolSigner = await createSignerFromKeyPair(school);
      await client.scSolana.instructions.assignToStudent({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        school: schoolSigner,
        serial: "REVERSE-003",
        schoolHash: toUint8Array(createHash(203)),
        studentIdHash: toUint8Array(createHash(303)),
      }).sendTransaction();

      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.Distribuida);

      // Try hardware audit (should fail - not in Fabricada state)
      try {
        await client.scSolana.instructions.auditHardware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          auditor: auditorSigner,
          serial: "REVERSE-003",
          passed: true,
          reportHash: toUint8Array(createHash(109)),
        }).sendTransaction();
        expect.fail("Expected hardware audit to fail from Distribuida state");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.message).to.contain("InvalidStateTransition");
      }

      // Try software validation (should fail - not in HwAprobado state)
      try {
        await client.scSolana.instructions.validateSoftware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          technician: technicianSigner,
          serial: "REVERSE-003",
          osVersion: "Ubuntu 22.04",
          passed: true,
        }).sendTransaction();
        expect.fail("Expected software validation to fail from Distribuida state");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.message).to.contain("InvalidStateTransition");
      }

      // Try student assignment again (should fail - not in SwValidado state)
      try {
        await client.scSolana.instructions.assignToStudent({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          school: schoolSigner,
          serial: "REVERSE-003",
          schoolHash: toUint8Array(createHash(204)),
          studentIdHash: toUint8Array(createHash(304)),
        }).sendTransaction();
        expect.fail("Expected student assignment to fail from Distribuida state");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.message).to.contain("InvalidStateTransition");
      }

      // Verify state is still Distribuida
      state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.Distribuida);
    });
  });

  // ========================================================================
  // 4. Failed Operation State Preservation Tests
  // ========================================================================

  describe("Failed Operation State Preservation", () => {
    it("preserves Fabricada state when hardware audit fails", async () => {
      const netbookPda = await registerNetbook(
        "PRESERVE-001",
        "PRESERVE-BATCH-001",
        "Preserve Model"
      );

      // Failed hardware audit
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "PRESERVE-001",
        passed: false,
        reportHash: toUint8Array(createHash(110)),
      }).sendTransaction();

      const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.Fabricada);
      expect(netbook.hwIntegrityPassed).to.be.false;
    });

    it("preserves HwAprobado state when software validation fails", async () => {
      const netbookPda = await registerNetbook(
        "PRESERVE-002",
        "PRESERVE-BATCH-002",
        "Preserve Model 2"
      );

      // Successful hardware audit
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "PRESERVE-002",
        passed: true,
        reportHash: toUint8Array(createHash(111)),
      }).sendTransaction();

      // Failed software validation
      const technicianSigner = await createSignerFromKeyPair(technician);
      await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial: "PRESERVE-002",
        osVersion: "Ubuntu 22.04",
        passed: false,
      }).sendTransaction();

      const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.HwAprobado);
      expect(netbook.swValidationPassed).to.be.false;
    });

    it("preserves all previous state data on failed transition attempt", async () => {
      const netbookPda = await registerNetbook(
        "PRESERVE-003",
        "PRESERVE-BATCH-003",
        "Preserve Model 3"
      );

      // Complete hardware audit
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "PRESERVE-003",
        passed: true,
        reportHash: toUint8Array(createHash(112)),
      }).sendTransaction();

      // Get netbook state before failed validation
      const netbookBefore = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      const hwAuditorBefore = netbookBefore.hwAuditor;

      // Try software validation with wrong serial (should fail)
      try {
        const technicianSigner = await createSignerFromKeyPair(technician);
        await client.scSolana.instructions.validateSoftware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          technician: technicianSigner,
          serial: "WRONG-SERIAL",
          osVersion: "Ubuntu 22.04",
          passed: true,
        }).sendTransaction();
        expect.fail("Expected validation to fail due to wrong serial");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }

      // Verify state is unchanged
      const netbookAfter = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbookAfter.state).to.equal(netbookBefore.state);
      expect(netbookAfter.hwAuditor).to.equal(hwAuditorBefore);
    });
  });

  // ========================================================================
  // 5. Concurrent State Transition Tests
  // ========================================================================

  describe("Concurrent State Transition Tests", () => {
    it("handles concurrent state queries during transitions", async () => {
      const netbookPda = await registerNetbook(
        "CONCURRENT-001",
        "CONCURRENT-BATCH-001",
        "Concurrent Model"
      );

      // Start hardware audit
      const auditorSigner = await createSignerFromKeyPair(auditor);
      const auditPromise = client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "CONCURRENT-001",
        passed: true,
        reportHash: toUint8Array(createHash(113)),
      }).sendTransaction();

      // Query state during transition
      const queryPromise = getNetbookState(netbookPda);

      await Promise.all([queryPromise, auditPromise]);

      // After both complete, state should be HwAprobado
      const finalState = await getNetbookState(netbookPda);
      expect(finalState).to.equal(NetbookState.HwAprobado);
    });

    it("prevents duplicate state transitions on same netbook", async () => {
      const netbookPda = await registerNetbook(
        "DUPLICATE-001",
        "DUPLICATE-BATCH-001",
        "Duplicate Model"
      );

      // First hardware audit - should succeed
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "DUPLICATE-001",
        passed: true,
        reportHash: toUint8Array(createHash(114)),
      }).sendTransaction();

      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.HwAprobado);

      // Second hardware audit - should fail (not in Fabricada state)
      try {
        await client.scSolana.instructions.auditHardware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          auditor: auditorSigner,
          serial: "DUPLICATE-001",
          passed: true,
          reportHash: toUint8Array(createHash(115)),
        }).sendTransaction();
        expect.fail("Expected second hardware audit to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.message).to.contain("InvalidStateTransition");
      }

      // State should still be HwAprobado
      state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.HwAprobado);
    });
  });

  // ========================================================================
  // 6. State Machine with Multiple Netbooks
  // ========================================================================

  describe("State Machine with Multiple Netbooks", () => {
    it("enforces independent state machines for each netbook", async () => {
      // Register multiple netbooks
      const netbook1Pda = await registerNetbook(
        "MULTI-001",
        "MULTI-BATCH-001",
        "Multi Model 1"
      );
      const netbook2Pda = await registerNetbook(
        "MULTI-002",
        "MULTI-BATCH-001",
        "Multi Model 2"
      );
      const netbook3Pda = await registerNetbook(
        "MULTI-003",
        "MULTI-BATCH-001",
        "Multi Model 3"
      );

      // All should start in Fabricada state
      let state1 = await getNetbookState(netbook1Pda);
      let state2 = await getNetbookState(netbook2Pda);
      let state3 = await getNetbookState(netbook3Pda);

      expect(state1).to.equal(NetbookState.Fabricada);
      expect(state2).to.equal(NetbookState.Fabricada);
      expect(state3).to.equal(NetbookState.Fabricada);

      // Advance netbook1 to HwAprobado
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbook1Pda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "MULTI-001",
        passed: true,
        reportHash: toUint8Array(createHash(116)),
      }).sendTransaction();

      state1 = await getNetbookState(netbook1Pda);
      expect(state1).to.equal(NetbookState.HwAprobado);
      expect(await getNetbookState(netbook2Pda)).to.equal(NetbookState.Fabricada);
      expect(await getNetbookState(netbook3Pda)).to.equal(NetbookState.Fabricada);

      // Advance netbook2 to HwAprobado
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbook2Pda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "MULTI-002",
        passed: true,
        reportHash: toUint8Array(createHash(117)),
      }).sendTransaction();

      state2 = await getNetbookState(netbook2Pda);
      expect(state1).to.equal(NetbookState.HwAprobado);
      expect(state2).to.equal(NetbookState.HwAprobado);
      expect(await getNetbookState(netbook3Pda)).to.equal(NetbookState.Fabricada);

      // Advance netbook3 to SwValidado (skip software audit - should fail)
      try {
        const technicianSigner = await createSignerFromKeyPair(technician);
        await client.scSolana.instructions.validateSoftware({
          netbook: toAddress(netbook3Pda),
          config: toAddress(configPda),
          technician: technicianSigner,
          serial: "MULTI-003",
          osVersion: "Ubuntu 22.04",
          passed: true,
        }).sendTransaction();
        expect.fail("Expected software validation to fail without hardware audit");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.message).to.contain("InvalidStateTransition");
      }

      // netbook3 should still be Fabricada
      state3 = await getNetbookState(netbook3Pda);
      expect(state3).to.equal(NetbookState.Fabricada);
    });

    it("handles different lifecycle paths for multiple netbooks", async () => {
      // Netbook 1: Full lifecycle
      const fullLifecyclePda = await registerNetbook(
        "FULL-001",
        "FULL-BATCH-001",
        "Full Lifecycle Model"
      );

      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(fullLifecyclePda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "FULL-001",
        passed: true,
        reportHash: toUint8Array(createHash(118)),
      }).sendTransaction();

      const technicianSigner = await createSignerFromKeyPair(technician);
      await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(fullLifecyclePda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial: "FULL-001",
        osVersion: "Ubuntu 22.04",
        passed: true,
      }).sendTransaction();

      const schoolSigner = await createSignerFromKeyPair(school);
      await client.scSolana.instructions.assignToStudent({
        netbook: toAddress(fullLifecyclePda),
        config: toAddress(configPda),
        school: schoolSigner,
        serial: "FULL-001",
        schoolHash: toUint8Array(createHash(205)),
        studentIdHash: toUint8Array(createHash(305)),
      }).sendTransaction();

      expect(await getNetbookState(fullLifecyclePda)).to.equal(
        NetbookState.Distribuida
      );

      // Netbook 2: Stopped at HwAprobado (failed software validation)
      const partialLifecyclePda = await registerNetbook(
        "PARTIAL-002",
        "PARTIAL-BATCH-002",
        "Partial Lifecycle Model"
      );

      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(partialLifecyclePda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "PARTIAL-002",
        passed: true,
        reportHash: toUint8Array(createHash(119)),
      }).sendTransaction();

      await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(partialLifecyclePda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial: "PARTIAL-002",
        osVersion: "Ubuntu 22.04",
        passed: false,
      }).sendTransaction();

      expect(await getNetbookState(partialLifecyclePda)).to.equal(
        NetbookState.HwAprobado
      );

      // Netbook 3: Stopped at Fabricada (failed hardware audit)
      const failedHwPda = await registerNetbook(
        "FAILED-HW-001",
        "FAILED-HW-BATCH-001",
        "Failed HW Model"
      );

      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(failedHwPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "FAILED-HW-001",
        passed: false,
        reportHash: toUint8Array(createHash(120)),
      }).sendTransaction();

      expect(await getNetbookState(failedHwPda)).to.equal(
        NetbookState.Fabricada
      );
    });
  });

  // ========================================================================
  // 7. State Machine Edge Cases
  // ========================================================================

  describe("State Machine Edge Cases", () => {
    it("handles rapid state transitions on same netbook sequentially", async () => {
      const netbookPda = await registerNetbook(
        "RAPID-001",
        "RAPID-BATCH-001",
        "Rapid Model"
      );

      // Execute full lifecycle rapidly
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "RAPID-001",
        passed: true,
        reportHash: toUint8Array(createHash(121)),
      }).sendTransaction();

      const technicianSigner = await createSignerFromKeyPair(technician);
      await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial: "RAPID-001",
        osVersion: "Ubuntu 22.04",
        passed: true,
      }).sendTransaction();

      const schoolSigner = await createSignerFromKeyPair(school);
      await client.scSolana.instructions.assignToStudent({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        school: schoolSigner,
        serial: "RAPID-001",
        schoolHash: toUint8Array(createHash(206)),
        studentIdHash: toUint8Array(createHash(306)),
      }).sendTransaction();

      const state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.Distribuida);
    });

    it("verifies state is u8 type with correct enum values", async () => {
      const netbookPda = await registerNetbook(
        "TYPE-CHECK-001",
        "TYPE-BATCH-001",
        "Type Check Model"
      );

      const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));

      // Verify state is stored as u8
      expect(typeof netbook.state).to.equal("number");
      expect(netbook.state).to.equal(NetbookState.Fabricada);
      expect(netbook.state).to.equal(0);

      // Perform hardware audit
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "TYPE-CHECK-001",
        passed: true,
        reportHash: toUint8Array(createHash(122)),
      }).sendTransaction();

      const netbook2 = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook2.state).to.equal(NetbookState.HwAprobado);
      expect(netbook2.state).to.equal(1);
    });

    it("verifies exists flag is true after registration", async () => {
      const netbookPda = await registerNetbook(
        "EXISTS-001",
        "EXISTS-BATCH-001",
        "Exists Check Model"
      );

      const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.exists).to.be.true;
    });

    it("verifies token_id is correctly set and increments", async () => {
      // Register first netbook
      await registerNetbook("TOKEN-001", "TOKEN-BATCH-001", "Token Model 1");
      await registerNetbook("TOKEN-002", "TOKEN-BATCH-001", "Token Model 2");
      await registerNetbook("TOKEN-003", "TOKEN-BATCH-001", "Token Model 3");

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(config.nextTokenId)).to.equal(3); // Next token ID should be 3
    });
  });

  // ========================================================================
  // 8. State Machine Error Code Verification
  // ========================================================================

  describe("State Machine Error Code Verification", () => {
    it("returns InvalidStateTransition for wrong state in audit", async () => {
      const netbookPda = await registerNetbook(
        "ERROR-CODE-001",
        "ERROR-BATCH-001",
        "Error Code Model"
      );

      // First audit should succeed from Fabricada
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "ERROR-CODE-001",
        passed: true,
        reportHash: toUint8Array(createHash(123)),
      }).sendTransaction();

      // Try audit again - should get InvalidStateTransition
      try {
        await client.scSolana.instructions.auditHardware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          auditor: auditorSigner,
          serial: "ERROR-CODE-001",
          passed: true,
          reportHash: toUint8Array(createHash(125)),
        }).sendTransaction();
        expect.fail("Expected second audit to fail");
      } catch (error: any) {
        expect(error.message).to.contain("InvalidStateTransition");
      }
    });

    it("returns InvalidStateTransition for wrong state in validation", async () => {
      const netbookPda = await registerNetbook(
        "ERROR-CODE-002",
        "ERROR-BATCH-002",
        "Error Code Model 2"
      );

      // Try validation from Fabricada - should get InvalidStateTransition
      try {
        const technicianSigner = await createSignerFromKeyPair(technician);
        await client.scSolana.instructions.validateSoftware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          technician: technicianSigner,
          serial: "ERROR-CODE-002",
          osVersion: "Ubuntu 22.04",
          passed: true,
        }).sendTransaction();
        expect.fail("Expected validation to fail from Fabricada");
      } catch (error: any) {
        expect(error.message).to.contain("InvalidStateTransition");
      }
    });

    it("returns InvalidStateTransition for wrong state in assignment", async () => {
      const netbookPda = await registerNetbook(
        "ERROR-CODE-003",
        "ERROR-BATCH-003",
        "Error Code Model 3"
      );

      // Try assignment from Fabricada - should get InvalidStateTransition
      try {
        const schoolSigner = await createSignerFromKeyPair(school);
        await client.scSolana.instructions.assignToStudent({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          school: schoolSigner,
          serial: "ERROR-CODE-003",
          schoolHash: toUint8Array(createHash(207)),
          studentIdHash: toUint8Array(createHash(307)),
        }).sendTransaction();
        expect.fail("Expected assignment to fail from Fabricada");
      } catch (error: any) {
        expect(error.message).to.contain("InvalidStateTransition");
      }
    });
  });

  // ========================================================================
  // 9. State Machine Data Integrity Tests
  // ========================================================================

  describe("State Machine Data Integrity", () => {
    it("preserves serial_number through all state transitions", async () => {
      const serialNumber = "INTEGRITY-001";
      const netbookPda = await registerNetbook(
        serialNumber,
        "INTEGRITY-BATCH-001",
        "Integrity Model"
      );

      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: serialNumber,
        passed: true,
        reportHash: toUint8Array(createHash(126)),
      }).sendTransaction();

      const technicianSigner = await createSignerFromKeyPair(technician);
      await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial: serialNumber,
        osVersion: "Ubuntu 22.04",
        passed: true,
      }).sendTransaction();

      const schoolSigner = await createSignerFromKeyPair(school);
      await client.scSolana.instructions.assignToStudent({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        school: schoolSigner,
        serial: serialNumber,
        schoolHash: toUint8Array(createHash(208)),
        studentIdHash: toUint8Array(createHash(308)),
      }).sendTransaction();

      const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.serialNumber).to.equal(serialNumber);
    });

    it("preserves batch_id through all state transitions", async () => {
      const batchId = "INTEGRITY-BATCH-002";
      const netbookPda = await registerNetbook(
        "INTEGRITY-002",
        batchId,
        "Integrity Model 2"
      );

      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "INTEGRITY-002",
        passed: true,
        reportHash: toUint8Array(createHash(127)),
      }).sendTransaction();

      const technicianSigner = await createSignerFromKeyPair(technician);
      await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial: "INTEGRITY-002",
        osVersion: "Ubuntu 22.04",
        passed: true,
      }).sendTransaction();

      const schoolSigner = await createSignerFromKeyPair(school);
      await client.scSolana.instructions.assignToStudent({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        school: schoolSigner,
        serial: "INTEGRITY-002",
        schoolHash: toUint8Array(createHash(209)),
        studentIdHash: toUint8Array(createHash(309)),
      }).sendTransaction();

      const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.batchId).to.equal(batchId);
    });

    it("updates hw_auditor after successful hardware audit", async () => {
      const netbookPda = await registerNetbook(
        "DATA-INT-001",
        "DATA-BATCH-001",
        "Data Integrity Model"
      );

      const netbookBefore = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbookBefore.hwAuditor).to.be.null;

      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "DATA-INT-001",
        passed: true,
        reportHash: toUint8Array(createHash(128)),
      }).sendTransaction();

      const netbookAfter = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbookAfter.hwAuditor).to.equal(toAddress(auditor.publicKey.toBase58()));
    });

    it("updates sw_technician after successful software validation", async () => {
      const netbookPda = await registerNetbook(
        "DATA-INT-002",
        "DATA-BATCH-002",
        "Data Integrity Model 2"
      );

      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "DATA-INT-002",
        passed: true,
        reportHash: toUint8Array(createHash(129)),
      }).sendTransaction();

      const netbookBefore = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbookBefore.swTechnician).to.be.null;

      const technicianSigner = await createSignerFromKeyPair(technician);
      await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial: "DATA-INT-002",
        osVersion: "Ubuntu 22.04",
        passed: true,
      }).sendTransaction();

      const netbookAfter = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbookAfter.swTechnician).to.equal(
        toAddress(technician.publicKey.toBase58())
      );
    });
  });

  // ========================================================================
  // 10. State Machine Final Verification
  // ========================================================================

  describe("State Machine Final Verification", () => {
    it("verifies all NetbookState enum values are accessible", async () => {
      // Verify enum values match expected
      expect(NetbookState.Fabricada).to.equal(0);
      expect(NetbookState.HwAprobado).to.equal(1);
      expect(NetbookState.SwValidado).to.equal(2);
      expect(NetbookState.Distribuida).to.equal(3);
    });

    it("verifies complete state machine coverage with 5 netbooks", async () => {
      const netbooks: { serial: string; pda: string; targetState: NetbookState }[] = [];

      // Netbook 1: Fabricada (registration only)
      const nb1Pda = await registerNetbook("FINAL-001", "FINAL-BATCH-001", "Final Model 1");
      netbooks.push({ serial: "FINAL-001", pda: nb1Pda, targetState: NetbookState.Fabricada });

      // Netbook 2: HwAprobado
      const nb2Pda = await registerNetbook("FINAL-002", "FINAL-BATCH-001", "Final Model 2");
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(nb2Pda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "FINAL-002",
        passed: true,
        reportHash: toUint8Array(createHash(130)),
      }).sendTransaction();
      netbooks.push({ serial: "FINAL-002", pda: nb2Pda, targetState: NetbookState.HwAprobado });

      // Netbook 3: SwValidado
      const nb3Pda = await registerNetbook("FINAL-003", "FINAL-BATCH-001", "Final Model 3");
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(nb3Pda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "FINAL-003",
        passed: true,
        reportHash: toUint8Array(createHash(131)),
      }).sendTransaction();
      const technicianSigner = await createSignerFromKeyPair(technician);
      await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(nb3Pda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial: "FINAL-003",
        osVersion: "Ubuntu 22.04",
        passed: true,
      }).sendTransaction();
      netbooks.push({ serial: "FINAL-003", pda: nb3Pda, targetState: NetbookState.SwValidado });

      // Netbook 4: Distribuida (full lifecycle)
      const nb4Pda = await registerNetbook("FINAL-004", "FINAL-BATCH-001", "Final Model 4");
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(nb4Pda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "FINAL-004",
        passed: true,
        reportHash: toUint8Array(createHash(132)),
      }).sendTransaction();
      await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(nb4Pda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial: "FINAL-004",
        osVersion: "Ubuntu 22.04",
        passed: true,
      }).sendTransaction();
      const schoolSigner = await createSignerFromKeyPair(school);
      await client.scSolana.instructions.assignToStudent({
        netbook: toAddress(nb4Pda),
        config: toAddress(configPda),
        school: schoolSigner,
        serial: "FINAL-004",
        schoolHash: toUint8Array(createHash(210)),
        studentIdHash: toUint8Array(createHash(310)),
      }).sendTransaction();
      netbooks.push({ serial: "FINAL-004", pda: nb4Pda, targetState: NetbookState.Distribuida });

      // Netbook 5: Failed hardware audit (stays Fabricada)
      const nb5Pda = await registerNetbook("FINAL-005", "FINAL-BATCH-001", "Final Model 5");
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(nb5Pda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial: "FINAL-005",
        passed: false,
        reportHash: toUint8Array(createHash(133)),
      }).sendTransaction();
      netbooks.push({ serial: "FINAL-005", pda: nb5Pda, targetState: NetbookState.Fabricada });

      // Verify all states
      for (const nb of netbooks) {
        const state = await getNetbookState(nb.pda);
        expect(state).to.equal(
          nb.targetState,
          `Netbook ${nb.serial} should be in state ${nb.targetState}`
        );
      }
    });
  });
});
