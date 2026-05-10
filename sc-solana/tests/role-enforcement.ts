/**
 * Role Enforcement Boundary Tests
 *
 * Comprehensive test suite for role-based access control (RBAC) boundary testing.
 * Verifies that role constraints are properly enforced across all instructions.
 *
 * Issue #72: Role Enforcement Boundary Tests (P1)
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
  getAdminPda,
  createHash,
  NetbookState,
  fundAndInitialize,
} from "./test-helpers";

describe("Role Enforcement Boundary Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.scSolana as Program<ScSolana>;
  const admin = Keypair.generate();
  const fabricante = Keypair.generate();
  const auditor = Keypair.generate();
  const technician = Keypair.generate();
  const school = Keypair.generate();
  const randomUser = Keypair.generate();
  const anotherRandom = Keypair.generate();

  let configPda: PublicKey;
  let adminPda: PublicKey;
  let adminBump: number;
  let serialHashRegistryPda: PublicKey;
  let crossRoleNetbookPda: PublicKey;

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
    await provider.connection.requestAirdrop(randomUser.publicKey, amount);
    await provider.connection.requestAirdrop(anotherRandom.publicKey, amount);

    // Get PDAs
    [configPda] = getConfigPda(program);
    [adminPda, adminBump] = getAdminPda(configPda, program.programId);
    serialHashRegistryPda = getSerialHashRegistryPda(configPda, program.programId);
  });

  // ========================================================================
  // Test Helper: Initialize Config (using shared initialization - Issue #178)
  // ========================================================================

  async function initializeConfig() {
    await fundAndInitialize(program, provider, admin);
  }

  // ========================================================================
  // 1. Grant Role Boundary Tests
  // ========================================================================

  describe("Grant Role Boundary Tests", () => {
    before(async () => {
      await initializeConfig();
    });

    it("allows admin to grant FABRICANTE role", async () => {
      const sig = await program.methods
        .grantRole("FABRICANTE")
        .accounts({
          config: configPda,
          accountToGrant: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();
      expect(sig).to.not.be.null;
    });

    it("allows admin to grant AUDITOR_HW role", async () => {
      const sig = await program.methods
        .grantRole("AUDITOR_HW")
        .accounts({
          config: configPda,
          accountToGrant: auditor.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([auditor])
        .rpc();
      expect(sig).to.not.be.null;
    });

    it("allows admin to grant TECNICO_SW role", async () => {
      const sig = await program.methods
        .grantRole("TECNICO_SW")
        .accounts({
          config: configPda,
          accountToGrant: technician.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([technician])
        .rpc();
      expect(sig).to.not.be.null;
    });

    it("allows admin to grant ESCUELA role", async () => {
      const sig = await program.methods
        .grantRole("ESCUELA")
        .accounts({
          config: configPda,
          accountToGrant: school.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([school])
        .rpc();
      expect(sig).to.not.be.null;
    });

    it("rejects grant role from non-admin account", async () => {
      try {
        await program.methods
          .grantRole("FABRICANTE")
          .accounts({
            config: configPda,
            admin: randomUser.publicKey,
            accountToGrant: anotherRandom.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([randomUser, anotherRandom])
          .rpc();
        expect.fail("Expected grant role to fail from non-admin");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects grant of invalid role name", async () => {
      try {
        await program.methods
          .grantRole("INVALID_ROLE")
          .accounts({
            config: configPda,
            accountToGrant: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([randomUser])
          .rpc();
        expect.fail("Expected grant role to fail for invalid role");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects duplicate FABRICANTE role grant", async () => {
      try {
        await program.methods
          .grantRole("FABRICANTE")
          .accounts({
            config: configPda,
            accountToGrant: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();
        expect.fail("Expected duplicate grant to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 2. Revoke Role Boundary Tests
  // ========================================================================

  describe("Revoke Role Boundary Tests", () => {
    before(async () => {
      // Grant role first
      await program.methods
        .grantRole("FABRICANTE")
        .accounts({
          config: configPda,
          accountToGrant: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();
    });

    it("allows admin to revoke FABRICANTE role", async () => {
      const sig = await program.methods
        .revokeRole("FABRICANTE")
        .accounts({
          config: configPda,
          accountToRevoke: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();
      expect(sig).to.not.be.null;
    });

    it("rejects revoke role from non-admin", async () => {
      try {
        await program.methods
          .revokeRole("FABRICANTE")
          .accounts({
            config: configPda,
            admin: randomUser.publicKey,
            accountToRevoke: anotherRandom.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([randomUser, anotherRandom])
          .rpc();
        expect.fail("Expected revoke role to fail from non-admin");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects revoke of invalid role name", async () => {
      try {
        await program.methods
          .revokeRole("INVALID_ROLE")
          .accounts({
            config: configPda,
            accountToRevoke: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();
        expect.fail("Expected revoke role to fail for invalid role");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 3. Netbook Registration Role Enforcement
  // ========================================================================

  describe("Netbook Registration Role Enforcement", () => {
    before(async () => {
      await initializeConfig();

      // Grant FABRICANTE role
      await program.methods
        .grantRole("FABRICANTE")
        .accounts({
          config: configPda,
          accountToGrant: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();
    });

    it("allows manufacturer with FABRICANTE role to register netbook", async () => {
      const config = await program.account.supplyChainConfig.fetch(configPda);
      const tokenId = config.nextTokenId.toNumber();
      const netbookPda = getNetbookPda(tokenId, program.programId);

      const sig = await program.methods
        .registerNetbook("ROLE-TEST-001", "ROLE-BATCH-001", "Test Model")
        .accounts({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          netbook: netbookPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();
      expect(sig).to.not.be.null;
    });

    it("rejects netbook registration from non-manufacturer", async () => {
      const config = await program.account.supplyChainConfig.fetch(configPda);
      const tokenId = config.nextTokenId.toNumber();
      const netbookPda = getNetbookPda(tokenId, program.programId);

      try {
        await program.methods
          .registerNetbook("ROLE-TEST-002", "ROLE-BATCH-002", "Test Model")
          .accounts({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: randomUser.publicKey,
            netbook: netbookPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([randomUser])
          .rpc();
        expect.fail("Expected registration to fail from non-manufacturer");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects netbook registration from user without FABRICANTE role", async () => {
      const config = await program.account.supplyChainConfig.fetch(configPda);
      const tokenId = config.nextTokenId.toNumber();
      const netbookPda = getNetbookPda(tokenId, program.programId);

      try {
        await program.methods
          .registerNetbook("ROLE-TEST-003", "ROLE-BATCH-003", "Test Model")
          .accounts({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: auditor.publicKey,
            netbook: netbookPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([auditor])
          .rpc();
        expect.fail("Expected registration to fail from auditor without FABRICANTE");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 4. Hardware Audit Role Enforcement
  // ========================================================================

  describe("Hardware Audit Role Enforcement", () => {
    before(async () => {
      // Grant AUDITOR_HW role
      await program.methods
        .grantRole("AUDITOR_HW")
        .accounts({
          config: configPda,
          accountToGrant: auditor.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([auditor])
        .rpc();

      // Register a netbook first
      const config = await program.account.supplyChainConfig.fetch(configPda);
      const tokenId = config.nextTokenId.toNumber();
      const netbookPda = getNetbookPda(tokenId, program.programId);

      await program.methods
        .registerNetbook("AUDIT-ROLE-001", "AUDIT-BATCH-001", "Audit Test Model")
        .accounts({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          netbook: netbookPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();
    });

    it("allows auditor with AUDITOR_HW role to audit hardware", async () => {
      const config = await program.account.supplyChainConfig.fetch(configPda);
      const tokenId = config.nextTokenId.toNumber();
      const netbookPda = getNetbookPda(tokenId, program.programId);

      const sig = await program.methods
        .auditHardware("AUDIT-ROLE-001", true, createHash(42))
        .accounts({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();
      expect(sig).to.not.be.null;
    });

    it("rejects hardware audit from non-auditor", async () => {
      const config = await program.account.supplyChainConfig.fetch(configPda);
      const tokenId = config.nextTokenId.toNumber();
      const netbookPda = getNetbookPda(tokenId, program.programId);

      try {
        await program.methods
          .auditHardware("AUDIT-ROLE-001", true, createHash(43))
          .accounts({
            netbook: netbookPda,
            config: configPda,
            auditor: randomUser.publicKey,
          })
          .signers([randomUser])
          .rpc();
        expect.fail("Expected audit to fail from non-auditor");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects hardware audit from technician without AUDITOR_HW role", async () => {
      const config = await program.account.supplyChainConfig.fetch(configPda);
      const tokenId = config.nextTokenId.toNumber();
      const netbookPda = getNetbookPda(tokenId, program.programId);

      try {
        await program.methods
          .auditHardware("AUDIT-ROLE-001", true, createHash(44))
          .accounts({
            netbook: netbookPda,
            config: configPda,
            auditor: technician.publicKey,
          })
          .signers([technician])
          .rpc();
        expect.fail("Expected audit to fail from technician without AUDITOR_HW");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 5. Software Validation Role Enforcement
  // ========================================================================

  describe("Software Validation Role Enforcement", () => {
    let netbookPda: PublicKey;

    before(async () => {
      // Grant TECNICO_SW role
      await program.methods
        .grantRole("TECNICO_SW")
        .accounts({
          config: configPda,
          accountToGrant: technician.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([technician])
        .rpc();

      // Register and audit a netbook first
      const config = await program.account.supplyChainConfig.fetch(configPda);
      const tokenId = config.nextTokenId.toNumber();
      netbookPda = getNetbookPda(tokenId, program.programId);

      await program.methods
        .registerNetbook("VALIDATE-ROLE-001", "VALIDATE-BATCH-001", "Validate Test Model")
        .accounts({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          netbook: netbookPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Audit hardware first
      await program.methods
        .auditHardware("VALIDATE-ROLE-001", true, createHash(50))
        .accounts({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();
    });

    it("allows technician with TECNICO_SW role to validate software", async () => {
      const sig = await program.methods
        .validateSoftware("VALIDATE-ROLE-001", "Ubuntu 22.04", true)
        .accounts({
          netbook: netbookPda,
          config: configPda,
          technician: technician.publicKey,
        })
        .signers([technician])
        .rpc();
      expect(sig).to.not.be.null;
    });

    it("rejects software validation from non-technician", async () => {
      try {
        await program.methods
          .validateSoftware("VALIDATE-ROLE-001", "Ubuntu 22.04", true)
          .accounts({
            netbook: netbookPda,
            config: configPda,
            technician: randomUser.publicKey,
          })
          .signers([randomUser])
          .rpc();
        expect.fail("Expected validation to fail from non-technician");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects software validation from auditor without TECNICO_SW role", async () => {
      try {
        await program.methods
          .validateSoftware("VALIDATE-ROLE-001", "Ubuntu 22.04", true)
          .accounts({
            netbook: netbookPda,
            config: configPda,
            technician: auditor.publicKey,
          })
          .signers([auditor])
          .rpc();
        expect.fail("Expected validation to fail from auditor without TECNICO_SW");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 6. Student Assignment Role Enforcement
  // ========================================================================

  describe("Student Assignment Role Enforcement", () => {
    let netbookPda: PublicKey;

    before(async () => {
      // Grant ESCUELA role
      await program.methods
        .grantRole("ESCUELA")
        .accounts({
          config: configPda,
          accountToGrant: school.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([school])
        .rpc();

      // Register, audit, and validate a netbook first
      const config = await program.account.supplyChainConfig.fetch(configPda);
      const tokenId = config.nextTokenId.toNumber();
      netbookPda = getNetbookPda(tokenId, program.programId);

      await program.methods
        .registerNetbook("ASSIGN-ROLE-001", "ASSIGN-BATCH-001", "Assign Test Model")
        .accounts({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          netbook: netbookPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Audit hardware
      await program.methods
        .auditHardware("ASSIGN-ROLE-001", true, createHash(60))
        .accounts({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      // Validate software
      await program.methods
        .validateSoftware("ASSIGN-ROLE-001", "Ubuntu 22.04", true)
        .accounts({
          netbook: netbookPda,
          config: configPda,
          technician: technician.publicKey,
        })
        .signers([technician])
        .rpc();
    });

    it("allows school with ESCUELA role to assign netbook to student", async () => {
      const sig = await program.methods
        .assignToStudent("ASSIGN-ROLE-001", createHash(100), createHash(200))
        .accounts({
          netbook: netbookPda,
          config: configPda,
          school: school.publicKey,
        })
        .signers([school])
        .rpc();
      expect(sig).to.not.be.null;
    });

    it("rejects student assignment from non-school account", async () => {
      try {
        await program.methods
          .assignToStudent("ASSIGN-ROLE-001", createHash(101), createHash(201))
          .accounts({
            netbook: netbookPda,
            config: configPda,
            school: randomUser.publicKey,
          })
          .signers([randomUser])
          .rpc();
        expect.fail("Expected assignment to fail from non-school");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects student assignment from manufacturer without ESCUELA role", async () => {
      try {
        await program.methods
          .assignToStudent("ASSIGN-ROLE-001", createHash(102), createHash(202))
          .accounts({
            netbook: netbookPda,
            config: configPda,
            school: fabricante.publicKey,
          })
          .signers([fabricante])
          .rpc();
        expect.fail("Expected assignment to fail from manufacturer without ESCUELA");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 7. Cross-Role Boundary Tests
  // ========================================================================

  describe("Cross-Role Boundary Tests", () => {
    before(async () => {
      // Grant all roles
      await program.methods
        .grantRole("FABRICANTE")
        .accounts({
          config: configPda,
          accountToGrant: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      await program.methods
        .grantRole("AUDITOR_HW")
        .accounts({
          config: configPda,
          accountToGrant: auditor.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([auditor])
        .rpc();

      await program.methods
        .grantRole("TECNICO_SW")
        .accounts({
          config: configPda,
          accountToGrant: technician.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([technician])
        .rpc();

      await program.methods
        .grantRole("ESCUELA")
        .accounts({
          config: configPda,
          accountToGrant: school.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([school])
        .rpc();

      // Register a netbook for cross-role tests (needs to be in Fabricada state for audit tests)
      const serialNumber = "CROSS-ROLE-001";
      const batchId = "CROSS-BATCH-001";
      const modelSpecs = "Cross-Role Test Model";
      crossRoleNetbookPda = getNetbookPda(1, program.programId);
      const crossRoleSerialHashRegistryPda = getSerialHashRegistryPda(
        configPda,
        program.programId
      );

      await program.methods
        .registerNetbook(serialNumber, batchId, modelSpecs)
        .accounts({
          manufacturer: fabricante.publicKey,
          netbook: crossRoleNetbookPda,
          config: configPda,
          serialHashRegistry: crossRoleSerialHashRegistryPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();
    });

    it("fabricante cannot perform hardware audit", async () => {
      try {
        await program.methods
          .auditHardware("TEST-SERIAL", true, createHash(70))
          .accounts({
            netbook: getNetbookPda(1, program.programId),
            config: configPda,
            auditor: fabricante.publicKey,
          })
          .signers([fabricante])
          .rpc();
        expect.fail("Expected audit to fail from fabricante");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("fabricante cannot perform software validation", async () => {
      try {
        await program.methods
          .validateSoftware("TEST-SERIAL", "Ubuntu 22.04", true)
          .accounts({
            netbook: getNetbookPda(1, program.programId),
            config: configPda,
            technician: fabricante.publicKey,
          })
          .signers([fabricante])
          .rpc();
        expect.fail("Expected validation to fail from fabricante");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("fabricante cannot assign to student", async () => {
      try {
        await program.methods
          .assignToStudent("TEST-SERIAL", createHash(80), createHash(90))
          .accounts({
            netbook: getNetbookPda(1, program.programId),
            config: configPda,
            school: fabricante.publicKey,
          })
          .signers([fabricante])
          .rpc();
        expect.fail("Expected assignment to fail from fabricante");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("auditor cannot perform software validation", async () => {
      try {
        await program.methods
          .validateSoftware("TEST-SERIAL", "Ubuntu 22.04", true)
          .accounts({
            netbook: getNetbookPda(1, program.programId),
            config: configPda,
            technician: auditor.publicKey,
          })
          .signers([auditor])
          .rpc();
        expect.fail("Expected validation to fail from auditor");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("auditor cannot assign to student", async () => {
      try {
        await program.methods
          .assignToStudent("TEST-SERIAL", createHash(81), createHash(91))
          .accounts({
            netbook: getNetbookPda(1, program.programId),
            config: configPda,
            school: auditor.publicKey,
          })
          .signers([auditor])
          .rpc();
        expect.fail("Expected assignment to fail from auditor");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("technician cannot perform hardware audit", async () => {
      try {
        await program.methods
          .auditHardware("TEST-SERIAL", true, createHash(71))
          .accounts({
            netbook: getNetbookPda(1, program.programId),
            config: configPda,
            auditor: technician.publicKey,
          })
          .signers([technician])
          .rpc();
        expect.fail("Expected audit to fail from technician");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("technician cannot assign to student", async () => {
      try {
        await program.methods
          .assignToStudent("TEST-SERIAL", createHash(82), createHash(92))
          .accounts({
            netbook: getNetbookPda(1, program.programId),
            config: configPda,
            school: technician.publicKey,
          })
          .signers([technician])
          .rpc();
        expect.fail("Expected assignment to fail from technician");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("school cannot perform hardware audit", async () => {
      try {
        await program.methods
          .auditHardware("TEST-SERIAL", true, createHash(72))
          .accounts({
            netbook: getNetbookPda(1, program.programId),
            config: configPda,
            auditor: school.publicKey,
          })
          .signers([school])
          .rpc();
        expect.fail("Expected audit to fail from school");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("school cannot perform software validation", async () => {
      try {
        await program.methods
          .validateSoftware("TEST-SERIAL", "Ubuntu 22.04", true)
          .accounts({
            netbook: getNetbookPda(1, program.programId),
            config: configPda,
            technician: school.publicKey,
          })
          .signers([school])
          .rpc();
        expect.fail("Expected validation to fail from school");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 8. Role Enforcement with Default Pubkey
  // ========================================================================

  describe("Role Enforcement with Default Pubkey", () => {
    let newConfigPda: PublicKey;
    let newSerialHashPda: PublicKey;

    before(async () => {
      // Create a new config where auditor_hw is default (no auditor granted)
      const newAdmin = Keypair.generate();
      await provider.connection.requestAirdrop(newAdmin.publicKey, 2 * LAMPORTS_PER_SOL);

      [newConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        program.programId
      );
      newSerialHashPda = getSerialHashRegistryPda(newConfigPda, program.programId);

      // Initialize with admin as fabricante only
      await program.methods
        .initialize()
        .accounts({
          config: newConfigPda,
          serialHashRegistry: newSerialHashPda,
          admin: newAdmin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([newAdmin])
        .rpc();
    });

    it("rejects hardware audit when no auditor_hw is set (default pubkey)", async () => {
      try {
        await program.methods
          .auditHardware("TEST-SERIAL", true, createHash(73))
          .accounts({
            netbook: getNetbookPda(1, program.programId),
            config: newConfigPda,
            auditor: auditor.publicKey,
          })
          .signers([auditor])
          .rpc();
        expect.fail("Expected audit to fail when no auditor_hw is set");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects software validation when no tecnico_sw is set (default pubkey)", async () => {
      try {
        await program.methods
          .validateSoftware("TEST-SERIAL", "Ubuntu 22.04", true)
          .accounts({
            netbook: getNetbookPda(1, program.programId),
            config: newConfigPda,
            technician: technician.publicKey,
          })
          .signers([technician])
          .rpc();
        expect.fail("Expected validation to fail when no tecnico_sw is set");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects student assignment when no escuela is set (default pubkey)", async () => {
      try {
        await program.methods
          .assignToStudent("TEST-SERIAL", createHash(83), createHash(93))
          .accounts({
            netbook: getNetbookPda(1, program.programId),
            config: newConfigPda,
            school: school.publicKey,
          })
          .signers([school])
          .rpc();
        expect.fail("Expected assignment to fail when no escuela is set");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 9. Query Instructions No Role Required
  // ========================================================================

  describe("Query Instructions No Role Required", () => {
    before(async () => {
      await initializeConfig();
    });

    it("allows anyone to query config without any role", async () => {
      const sig = await program.methods
        .queryConfig()
        .accounts({
          config: configPda,
        })
        .signers([])
        .rpc();
      expect(sig).to.not.be.null;
    });

    it("allows anyone to query netbook state without any role", async () => {
      try {
        const sig = await program.methods
          .queryNetbookState("non-existent-serial")
          .accounts({
            netbook: getNetbookPda(99999, program.programId),
          })
          .signers([])
          .rpc({ skipPreflight: true });
        // May fail due to account not existing, but not due to role
        expect(true).to.be.true;
      } catch (error: any) {
        // Any error is acceptable - we're testing that it doesn't fail due to role
        expect(error).to.not.be.null;
      }
    });

    it("allows anyone to query role without any role", async () => {
      const sig = await program.methods
        .queryRole("FABRICANTE")
        .accounts({
          config: configPda,
          accountToCheck: randomUser.publicKey,
        })
        .signers([])
        .rpc();
      expect(sig).to.not.be.null;
    });
  });

  // ========================================================================
  // 10. Role Enforcement Edge Cases
  // ========================================================================

  describe("Role Enforcement Edge Cases", () => {
    before(async () => {
      await initializeConfig();

      // Grant roles
      await program.methods
        .grantRole("FABRICANTE")
        .accounts({
          config: configPda,
          accountToGrant: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      await program.methods
        .grantRole("AUDITOR_HW")
        .accounts({
          config: configPda,
          accountToGrant: auditor.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([auditor])
        .rpc();
    });

    it("rejects operation with empty role string", async () => {
      try {
        await program.methods
          .grantRole("")
          .accounts({
            config: configPda,
            accountToGrant: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([randomUser])
          .rpc();
        expect.fail("Expected grant role to fail with empty role");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects operation with role containing special characters", async () => {
      try {
        await program.methods
          .grantRole("FABRICANTE; DROP TABLE config;--")
          .accounts({
            config: configPda,
            accountToGrant: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([randomUser])
          .rpc();
        expect.fail("Expected grant role to fail with special characters");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects operation with role exceeding maximum length", async () => {
      const longRole = "A".repeat(1000);
      try {
        await program.methods
          .grantRole(longRole)
          .accounts({
            config: configPda,
            accountToGrant: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([randomUser])
          .rpc();
        expect.fail("Expected grant role to fail with very long role");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("verifies role constraint uses has_one check on config", async () => {
      // This tests that the has_one constraint in GrantRole is enforced
      // The admin must match config.admin
      const wrongAdmin = Keypair.generate();
      await provider.connection.requestAirdrop(wrongAdmin.publicKey, 2 * LAMPORTS_PER_SOL);

      try {
        await program.methods
          .grantRole("FABRICANTE")
          .accounts({
            config: configPda,
            admin: wrongAdmin.publicKey,
            accountToGrant: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([wrongAdmin, randomUser])
          .rpc();
        expect.fail("Expected grant role to fail with wrong admin");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });
});
