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
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { ScSolana } from "../target/types/sc_solana";
import {
  Keypair,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { expect } from "chai";

// Import test helpers
import {
  getConfigPda,
  getNetbookPda,
  getSerialHashRegistryPda,
  createHash,
  NetbookState,
} from "./test-helpers";

describe("State Machine Transition Validation Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.scSolana as Program<ScSolana>;
  const admin = Keypair.generate();
  const fabricante = Keypair.generate();
  const auditor = Keypair.generate();
  const technician = Keypair.generate();
  const school = Keypair.generate();

  let configPda: PublicKey;
  let serialHashRegistryPda: PublicKey;

  // ========================================================================
  // Setup
  // ========================================================================

  before(async () => {
    // Fund all keypairs
    const amount = 2 * LAMPORTS_PER_SOL;
    await provider.connection.requestAirdrop(admin.publicKey, amount);
    await provider.connection.requestAirdrop(fabricante.publicKey, amount);
    await provider.connection.requestAirdrop(auditor.publicKey, amount);
    await provider.connection.requestAirdrop(technician.publicKey, amount);
    await provider.connection.requestAirdrop(school.publicKey, amount);

    // Get PDAs
    [configPda] = getConfigPda(program);
    serialHashRegistryPda = getSerialHashRegistryPda(configPda, program.programId);

    // Initialize config using PDA-first pattern
    const funder = Keypair.generate();
    await provider.connection.requestAirdrop(funder.publicKey, 10 * LAMPORTS_PER_SOL);
    const [deployerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("deployer")],
      program.programId
    );
    const adminPda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), configPda.toBuffer()],
      program.programId
    )[0];
    
    await (program.methods as any)
      .fundDeployer(new anchor.BN(10 * LAMPORTS_PER_SOL))
      .accounts({
        deployer: deployerPda,
        funder: funder.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([funder])
      .rpc();
    
    await (program.methods as any)
      .initialize()
      .accounts({
        config: configPda,
        serialHashRegistry: serialHashRegistryPda,
        admin: adminPda,
        deployer: deployerPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Grant roles
    await grantRole("FABRICANTE", fabricante.publicKey);
    await grantRole("AUDITOR_HW", auditor.publicKey);
    await grantRole("TECNICO_SW", technician.publicKey);
    await grantRole("ESCUELA", school.publicKey);
  });

  async function grantRole(role: string, account: PublicKey) {
    await program.methods
      .grantRole(role)
      .accountsStrict({
        config: configPda,
        admin: adminPda,
        accountToGrant: account,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();
  }

  async function registerNetbook(
    serialNumber: string,
    batchId: string,
    modelSpecs: string
  ): Promise<PublicKey> {
    const config = await program.account.supplyChainConfig.fetch(configPda);
    const tokenId = config.nextTokenId.toNumber();
    const netbookPda = getNetbookPda(tokenId, program.programId);

    await program.methods
      .registerNetbook(serialNumber, batchId, modelSpecs)
      .accountsStrict({
        manufacturer: fabricante.publicKey,
        netbook: netbookPda,
        config: configPda,
        serialHashRegistry: serialHashRegistryPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([fabricante])
      .rpc();

    return netbookPda;
  }

  async function getNetbookState(netbookPda: PublicKey): Promise<NetbookState> {
    const netbook = await program.account.netbook.fetch(netbookPda);
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
      await program.methods
        .auditHardware("FULL-LIFECYCLE-001", true, createHash(100))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.HwAprobado);

      // Transition 2: HwAprobado → SwValidado via software validation
      await program.methods
        .validateSoftware("FULL-LIFECYCLE-001", "Ubuntu 22.04 LTS", true)
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          technician: technician.publicKey,
        })
        .signers([technician])
        .rpc();

      state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.SwValidado);

      // Transition 3: SwValidado → Distribuida via student assignment
      await program.methods
        .assignToStudent("FULL-LIFECYCLE-001", createHash(200), createHash(300))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          school: school.publicKey,
        })
        .signers([school])
        .rpc();

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
      await program.methods
        .auditHardware("PARTIAL-001", true, createHash(101))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.HwAprobado);

      // Failed software validation - should NOT transition state
      await program.methods
        .validateSoftware("PARTIAL-001", "Ubuntu 22.04 LTS", false)
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          technician: technician.publicKey,
        })
        .signers([technician])
        .rpc();

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
      await program.methods
        .auditHardware("PARTIAL-HW-001", false, createHash(102))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      // State should still be Fabricada when audit fails
      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.Fabricada);

      // Successful hardware audit should now work
      await program.methods
        .auditHardware("PARTIAL-HW-001", true, createHash(103))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

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
        await program.methods
          .validateSoftware("SKIP-STATE-001", "Ubuntu 22.04", true)
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            technician: technician.publicKey,
          })
          .signers([technician])
          .rpc();
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
      await program.methods
        .auditHardware("SKIP-STATE-002", true, createHash(104))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      // Verify state is HwAprobado
      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.HwAprobado);

      // Try to assign to student directly from HwAprobado state (should fail)
      try {
        await program.methods
          .assignToStudent("SKIP-STATE-002", createHash(201), createHash(301))
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            school: school.publicKey,
          })
          .signers([school])
          .rpc();
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
        await program.methods
          .assignToStudent("SKIP-STATE-003", createHash(202), createHash(302))
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            school: school.publicKey,
          })
          .signers([school])
          .rpc();
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
      await program.methods
        .auditHardware("REVERSE-001", true, createHash(105))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.HwAprobado);

      // Try to audit hardware again (should fail - not in Fabricada state)
      try {
        await program.methods
          .auditHardware("REVERSE-001", false, createHash(106))
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            auditor: auditor.publicKey,
          })
          .signers([auditor])
          .rpc();
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
      await program.methods
        .auditHardware("REVERSE-002", true, createHash(107))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      await program.methods
        .validateSoftware("REVERSE-002", "Ubuntu 22.04", true)
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          technician: technician.publicKey,
        })
        .signers([technician])
        .rpc();

      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.SwValidado);

      // Try to validate software again (should fail - not in HwAprobado state)
      try {
        await program.methods
          .validateSoftware("REVERSE-002", "Ubuntu 22.04", false)
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            technician: technician.publicKey,
          })
          .signers([technician])
          .rpc();
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
      await program.methods
        .auditHardware("REVERSE-003", true, createHash(108))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      await program.methods
        .validateSoftware("REVERSE-003", "Ubuntu 22.04", true)
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          technician: technician.publicKey,
        })
        .signers([technician])
        .rpc();

      await program.methods
        .assignToStudent("REVERSE-003", createHash(203), createHash(303))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          school: school.publicKey,
        })
        .signers([school])
        .rpc();

      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.Distribuida);

      // Try hardware audit (should fail - not in Fabricada state)
      try {
        await program.methods
          .auditHardware("REVERSE-003", true, createHash(109))
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            auditor: auditor.publicKey,
          })
          .signers([auditor])
          .rpc();
        expect.fail("Expected hardware audit to fail from Distribuida state");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.message).to.contain("InvalidStateTransition");
      }

      // Try software validation (should fail - not in HwAprobado state)
      try {
        await program.methods
          .validateSoftware("REVERSE-003", "Ubuntu 22.04", true)
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            technician: technician.publicKey,
          })
          .signers([technician])
          .rpc();
        expect.fail("Expected software validation to fail from Distribuida state");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.message).to.contain("InvalidStateTransition");
      }

      // Try student assignment again (should fail - not in SwValidado state)
      try {
        await program.methods
          .assignToStudent("REVERSE-003", createHash(204), createHash(304))
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            school: school.publicKey,
          })
          .signers([school])
          .rpc();
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
      await program.methods
        .auditHardware("PRESERVE-001", false, createHash(110))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      const netbook = await program.account.netbook.fetch(netbookPda);
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
      await program.methods
        .auditHardware("PRESERVE-002", true, createHash(111))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      // Failed software validation
      await program.methods
        .validateSoftware("PRESERVE-002", "Ubuntu 22.04", false)
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          technician: technician.publicKey,
        })
        .signers([technician])
        .rpc();

      const netbook = await program.account.netbook.fetch(netbookPda);
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
      await program.methods
        .auditHardware("PRESERVE-003", true, createHash(112))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      // Get netbook state before failed validation
      const netbookBefore = await program.account.netbook.fetch(netbookPda);
      const hwAuditorBefore = netbookBefore.hwAuditor;

      // Try software validation with wrong serial (should fail)
      try {
        await program.methods
          .validateSoftware("WRONG-SERIAL", "Ubuntu 22.04", true)
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            technician: technician.publicKey,
          })
          .signers([technician])
          .rpc();
        expect.fail("Expected validation to fail due to wrong serial");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }

      // Verify state is unchanged
      const netbookAfter = await program.account.netbook.fetch(netbookPda);
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
      const auditPromise = program.methods
        .auditHardware("CONCURRENT-001", true, createHash(113))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      // Query state during transition
      const queryPromise = getNetbookState(netbookPda);

      const [state, sig] = await Promise.all([queryPromise, auditPromise]);

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
      await program.methods
        .auditHardware("DUPLICATE-001", true, createHash(114))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      let state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.HwAprobado);

      // Second hardware audit - should fail (not in Fabricada state)
      try {
        await program.methods
          .auditHardware("DUPLICATE-001", true, createHash(115))
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            auditor: auditor.publicKey,
          })
          .signers([auditor])
          .rpc();
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
      await program.methods
        .auditHardware("MULTI-001", true, createHash(116))
        .accountsStrict({
          netbook: netbook1Pda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      state1 = await getNetbookState(netbook1Pda);
      expect(state1).to.equal(NetbookState.HwAprobado);
      expect(state2).to.equal(NetbookState.Fabricada);
      expect(state3).to.equal(NetbookState.Fabricada);

      // Advance netbook2 to HwAprobado
      await program.methods
        .auditHardware("MULTI-002", true, createHash(117))
        .accountsStrict({
          netbook: netbook2Pda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      state2 = await getNetbookState(netbook2Pda);
      expect(state1).to.equal(NetbookState.HwAprobado);
      expect(state2).to.equal(NetbookState.HwAprobado);
      expect(state3).to.equal(NetbookState.Fabricada);

      // Advance netbook3 to SwValidado (skip software audit - should fail)
      try {
        await program.methods
          .validateSoftware("MULTI-003", "Ubuntu 22.04", true)
          .accountsStrict({
            netbook: netbook3Pda,
            config: configPda,
            technician: technician.publicKey,
          })
          .signers([technician])
          .rpc();
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

      await program.methods
        .auditHardware("FULL-001", true, createHash(118))
        .accountsStrict({
          netbook: fullLifecyclePda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      await program.methods
        .validateSoftware("FULL-001", "Ubuntu 22.04", true)
        .accountsStrict({
          netbook: fullLifecyclePda,
          config: configPda,
          technician: technician.publicKey,
        })
        .signers([technician])
        .rpc();

      await program.methods
        .assignToStudent("FULL-001", createHash(205), createHash(305))
        .accountsStrict({
          netbook: fullLifecyclePda,
          config: configPda,
          school: school.publicKey,
        })
        .signers([school])
        .rpc();

      expect(await getNetbookState(fullLifecyclePda)).to.equal(
        NetbookState.Distribuida
      );

      // Netbook 2: Stopped at HwAprobado (failed software validation)
      const partialLifecyclePda = await registerNetbook(
        "PARTIAL-002",
        "PARTIAL-BATCH-002",
        "Partial Lifecycle Model"
      );

      await program.methods
        .auditHardware("PARTIAL-002", true, createHash(119))
        .accountsStrict({
          netbook: partialLifecyclePda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      await program.methods
        .validateSoftware("PARTIAL-002", "Ubuntu 22.04", false)
        .accountsStrict({
          netbook: partialLifecyclePda,
          config: configPda,
          technician: technician.publicKey,
        })
        .signers([technician])
        .rpc();

      expect(await getNetbookState(partialLifecyclePda)).to.equal(
        NetbookState.HwAprobado
      );

      // Netbook 3: Stopped at Fabricada (failed hardware audit)
      const failedHwPda = await registerNetbook(
        "FAILED-HW-001",
        "FAILED-HW-BATCH-001",
        "Failed HW Model"
      );

      await program.methods
        .auditHardware("FAILED-HW-001", false, createHash(120))
        .accountsStrict({
          netbook: failedHwPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

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
      await program.methods
        .auditHardware("RAPID-001", true, createHash(121))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      await program.methods
        .validateSoftware("RAPID-001", "Ubuntu 22.04", true)
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          technician: technician.publicKey,
        })
        .signers([technician])
        .rpc();

      await program.methods
        .assignToStudent("RAPID-001", createHash(206), createHash(306))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          school: school.publicKey,
        })
        .signers([school])
        .rpc();

      const state = await getNetbookState(netbookPda);
      expect(state).to.equal(NetbookState.Distribuida);
    });

    it("verifies state is u8 type with correct enum values", async () => {
      const netbookPda = await registerNetbook(
        "TYPE-CHECK-001",
        "TYPE-BATCH-001",
        "Type Check Model"
      );

      const netbook = await program.account.netbook.fetch(netbookPda);

      // Verify state is stored as u8
      expect(typeof netbook.state).to.equal("number");
      expect(netbook.state).to.equal(NetbookState.Fabricada);
      expect(netbook.state).to.equal(0);

      // Perform hardware audit
      await program.methods
        .auditHardware("TYPE-CHECK-001", true, createHash(122))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      const netbook2 = await program.account.netbook.fetch(netbookPda);
      expect(netbook2.state).to.equal(NetbookState.HwAprobado);
      expect(netbook2.state).to.equal(1);
    });

    it("verifies exists flag is true after registration", async () => {
      const netbookPda = await registerNetbook(
        "EXISTS-001",
        "EXISTS-BATCH-001",
        "Exists Check Model"
      );

      const netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.exists).to.be.true;
    });

    it("verifies token_id is correctly set and increments", async () => {
      // Register first netbook
      await registerNetbook("TOKEN-001", "TOKEN-BATCH-001", "Token Model 1");
      await registerNetbook("TOKEN-002", "TOKEN-BATCH-001", "Token Model 2");
      await registerNetbook("TOKEN-003", "TOKEN-BATCH-001", "Token Model 3");

      const config = await program.account.supplyChainConfig.fetch(configPda);
      expect(config.nextTokenId.toNumber()).to.equal(3); // Next token ID should be 3
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

      try {
        await program.methods
          .auditHardware("ERROR-CODE-001", true, createHash(123))
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            auditor: auditor.publicKey,
          })
          .signers([auditor])
          .rpc();
        expect.fail("Expected audit to succeed from Fabricada");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }

      // Now audit successfully
      await program.methods
        .auditHardware("ERROR-CODE-001", true, createHash(124))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      // Try audit again - should get InvalidStateTransition
      try {
        await program.methods
          .auditHardware("ERROR-CODE-001", true, createHash(125))
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            auditor: auditor.publicKey,
          })
          .signers([auditor])
          .rpc();
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
        await program.methods
          .validateSoftware("ERROR-CODE-002", "Ubuntu 22.04", true)
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            technician: technician.publicKey,
          })
          .signers([technician])
          .rpc();
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
        await program.methods
          .assignToStudent("ERROR-CODE-003", createHash(207), createHash(307))
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            school: school.publicKey,
          })
          .signers([school])
          .rpc();
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

      await program.methods
        .auditHardware(serialNumber, true, createHash(126))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      await program.methods
        .validateSoftware(serialNumber, "Ubuntu 22.04", true)
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          technician: technician.publicKey,
        })
        .signers([technician])
        .rpc();

      await program.methods
        .assignToStudent(serialNumber, createHash(208), createHash(308))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          school: school.publicKey,
        })
        .signers([school])
        .rpc();

      const netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.serialNumber).to.equal(serialNumber);
    });

    it("preserves batch_id through all state transitions", async () => {
      const batchId = "INTEGRITY-BATCH-002";
      const netbookPda = await registerNetbook(
        "INTEGRITY-002",
        batchId,
        "Integrity Model 2"
      );

      await program.methods
        .auditHardware("INTEGRITY-002", true, createHash(127))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      await program.methods
        .validateSoftware("INTEGRITY-002", "Ubuntu 22.04", true)
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          technician: technician.publicKey,
        })
        .signers([technician])
        .rpc();

      await program.methods
        .assignToStudent("INTEGRITY-002", createHash(209), createHash(309))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          school: school.publicKey,
        })
        .signers([school])
        .rpc();

      const netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.batchId).to.equal(batchId);
    });

    it("updates hw_auditor after successful hardware audit", async () => {
      const netbookPda = await registerNetbook(
        "DATA-INT-001",
        "DATA-BATCH-001",
        "Data Integrity Model"
      );

      const netbookBefore = await program.account.netbook.fetch(netbookPda);
      expect(netbookBefore.hwAuditor).to.be.null;

      await program.methods
        .auditHardware("DATA-INT-001", true, createHash(128))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      const netbookAfter = await program.account.netbook.fetch(netbookPda);
      expect(netbookAfter.hwAuditor).to.equal(auditor.publicKey.toBase58());
    });

    it("updates sw_technician after successful software validation", async () => {
      const netbookPda = await registerNetbook(
        "DATA-INT-002",
        "DATA-BATCH-002",
        "Data Integrity Model 2"
      );

      await program.methods
        .auditHardware("DATA-INT-002", true, createHash(129))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      const netbookBefore = await program.account.netbook.fetch(netbookPda);
      expect(netbookBefore.swTechnician).to.be.null;

      await program.methods
        .validateSoftware("DATA-INT-002", "Ubuntu 22.04", true)
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          technician: technician.publicKey,
        })
        .signers([technician])
        .rpc();

      const netbookAfter = await program.account.netbook.fetch(netbookPda);
      expect(netbookAfter.swTechnician).to.equal(
        technician.publicKey.toBase58()
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
      const netbooks: { serial: string; pda: PublicKey; targetState: NetbookState }[] =
        [];

      // Netbook 1: Fabricada (registration only)
      const nb1Pda = await registerNetbook("FINAL-001", "FINAL-BATCH-001", "Final Model 1");
      netbooks.push({ serial: "FINAL-001", pda: nb1Pda, targetState: NetbookState.Fabricada });

      // Netbook 2: HwAprobado
      const nb2Pda = await registerNetbook("FINAL-002", "FINAL-BATCH-001", "Final Model 2");
      await program.methods
        .auditHardware("FINAL-002", true, createHash(130))
        .accountsStrict({
          netbook: nb2Pda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();
      netbooks.push({ serial: "FINAL-002", pda: nb2Pda, targetState: NetbookState.HwAprobado });

      // Netbook 3: SwValidado
      const nb3Pda = await registerNetbook("FINAL-003", "FINAL-BATCH-001", "Final Model 3");
      await program.methods
        .auditHardware("FINAL-003", true, createHash(131))
        .accountsStrict({
          netbook: nb3Pda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();
      await program.methods
        .validateSoftware("FINAL-003", "Ubuntu 22.04", true)
        .accountsStrict({
          netbook: nb3Pda,
          config: configPda,
          technician: technician.publicKey,
        })
        .signers([technician])
        .rpc();
      netbooks.push({ serial: "FINAL-003", pda: nb3Pda, targetState: NetbookState.SwValidado });

      // Netbook 4: Distribuida (full lifecycle)
      const nb4Pda = await registerNetbook("FINAL-004", "FINAL-BATCH-001", "Final Model 4");
      await program.methods
        .auditHardware("FINAL-004", true, createHash(132))
        .accountsStrict({
          netbook: nb4Pda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();
      await program.methods
        .validateSoftware("FINAL-004", "Ubuntu 22.04", true)
        .accountsStrict({
          netbook: nb4Pda,
          config: configPda,
          technician: technician.publicKey,
        })
        .signers([technician])
        .rpc();
      await program.methods
        .assignToStudent("FINAL-004", createHash(210), createHash(310))
        .accountsStrict({
          netbook: nb4Pda,
          config: configPda,
          school: school.publicKey,
        })
        .signers([school])
        .rpc();
      netbooks.push({ serial: "FINAL-004", pda: nb4Pda, targetState: NetbookState.Distribuida });

      // Netbook 5: Failed hardware audit (stays Fabricada)
      const nb5Pda = await registerNetbook("FINAL-005", "FINAL-BATCH-001", "Final Model 5");
      await program.methods
        .auditHardware("FINAL-005", false, createHash(133))
        .accountsStrict({
          netbook: nb5Pda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();
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
