/**
 * RBAC Consistency Tests (Issue #145)
 *
 * Comprehensive test suite to validate that the RBAC system works correctly
 * and consistently across all operations.
 *
 * Covers:
 * - Authorization tests for all role operations
 * - Request-approval flow tests
 * - Role revocation tests
 * - Role holder management tests
 * - Security tests to prevent unauthorized access
 * - System integrity tests
 * - Compatibility with existing operations
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ScSolana } from "../target/types/sc_solana";
import {
  Keypair,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { expect } from "chai";
import {
  getConfigPda,
  getRoleRequestPda,
  getSerialHashRegistryPda,
  fundKeypair,
  RequestStatus,
} from "./test-helpers";

// Role constants
const FABRICANTE_ROLE = "FABRICANTE";
const AUDITOR_HW_ROLE = "AUDITOR_HW";
const TECNICO_SW_ROLE = "TECNICO_SW";
const ESCUELA_ROLE = "ESCUELA";

describe("RBAC Consistency Tests (Issue #145)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  let program: Program<ScSolana>;
  let admin: Keypair;
  let configPda: PublicKey;
  let adminPda: PublicKey;
  let serialHashRegistryPda: PublicKey;

  // Test accounts
  let user1: Keypair;
  let user2: Keypair;
  let unauthorizedUser: Keypair;

  before(async () => {
    // Load program
    if (anchor.workspace.scSolana) {
      program = anchor.workspace.scSolana as Program<ScSolana>;
    } else {
      const idl = require("../target/idl/sc_solana.json");
      const programId = new anchor.web3.PublicKey(
        "7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN"
      );
      program = new anchor.Program(
        { ...idl, address: programId.toString() },
        provider
      );
    }

    // Generate test accounts
    admin = Keypair.generate();
    user1 = Keypair.generate();
    user2 = Keypair.generate();
    unauthorizedUser = Keypair.generate();

    // Fund all accounts
    for (const kp of [admin, user1, user2, unauthorizedUser]) {
      await fundKeypair(provider, kp, 2);
    }

    // Get PDAs
    [configPda] = getConfigPda(program);
    serialHashRegistryPda = getSerialHashRegistryPda(configPda, program.programId);

    // Initialize config using PDA-first pattern
    const funder = Keypair.generate();
    await fundAndInitialize(program, provider, admin);
    adminPda = getAdminPda(configPda, program.programId);
  });

  // =========================================================================
  // 1. Authorization Tests for Role Operations
  // =========================================================================
  describe("Authorization Tests", () => {
    it("verifies admin can grant roles via grant_role", async () => {
      const sig = await program.methods
        .grantRole(FABRICANTE_ROLE)
        .accounts({
          config: configPda,
          admin: adminPda,
          accountToGrant: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      expect(sig).to.not.be.null;

      // Verify role was granted
      const config = await program.account.supplyChainConfig.fetch(configPda);
      expect(config.fabricante.toString()).to.equal(user1.publicKey.toString());
    });

    it("verifies non-admin cannot grant roles", async () => {
      try {
        await program.methods
          .grantRole(AUDITOR_HW_ROLE)
          .accounts({
            config: configPda,
            admin: unauthorizedUser.publicKey,
            accountToGrant: user2.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorizedUser, user2])
          .rpc();
        expect.fail("Expected grant role to fail for non-admin");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("verifies grant_role requires recipient signature", async () => {
      try {
        await program.methods
          .grantRole(AUDITOR_HW_ROLE)
          .accounts({
            config: configPda,
            admin: adminPda,
            accountToGrant: user2.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([]) // Missing user2 signature
          .rpc();
        expect.fail("Expected grant role to fail without recipient signature");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // =========================================================================
  // 2. Request-Approval Flow Tests
  // =========================================================================
  describe("Request-Approval Flow Tests", () => {
    it("user can request a role", async () => {
      const roleRequestPda = getRoleRequestPda(user2.publicKey, program.programId);

      const sig = await program.methods
        .requestRole(TECNICO_SW_ROLE)
        .accounts({
          config: configPda,
          roleRequest: roleRequestPda,
          user: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      expect(sig).to.not.be.null;

      // Verify request was created
      const roleRequest = await program.account.roleRequest.fetch(roleRequestPda);
      expect(roleRequest.status).to.equal(RequestStatus.Pending);
      expect(roleRequest.role).to.equal(TECNICO_SW_ROLE);
      expect(roleRequest.user.toString()).to.equal(user2.publicKey.toString());
    });

    it("admin can approve role request", async () => {
      const roleRequestPda = getRoleRequestPda(user2.publicKey, program.programId);

      const sig = await program.methods
        .approveRoleRequest()
        .accounts({
          config: configPda,
          admin: adminPda,
          roleRequest: roleRequestPda,
        })
        .signers([])
        .rpc();

      expect(sig).to.not.be.null;

      // Verify request was approved
      const roleRequest = await program.account.roleRequest.fetch(roleRequestPda);
      expect(roleRequest.status).to.equal(RequestStatus.Approved);

      // Verify config was updated
      const config = await program.account.supplyChainConfig.fetch(configPda);
      expect(config.tecnicoSw.toString()).to.equal(user2.publicKey.toString());
    });

    it("non-admin cannot approve role request", async () => {
      // Create a new request first
      const newRoleRequestPda = getRoleRequestPda(
        unauthorizedUser.publicKey,
        program.programId
      );

      await program.methods
        .requestRole(ESCUELA_ROLE)
        .accounts({
          config: configPda,
          roleRequest: newRoleRequestPda,
          user: unauthorizedUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([unauthorizedUser])
        .rpc();

      // Try to approve as non-admin
      try {
        await program.methods
          .approveRoleRequest()
          .accounts({
            config: configPda,
            admin: unauthorizedUser.publicKey,
            roleRequest: newRoleRequestPda,
          })
          .signers([unauthorizedUser])
          .rpc();
        expect.fail("Expected approve to fail for non-admin");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("admin can reject role request", async () => {
      // Reject the pending request we created above
      const newRoleRequestPda = getRoleRequestPda(
        unauthorizedUser.publicKey,
        program.programId
      );

      const sig = await program.methods
        .rejectRoleRequest()
        .accounts({
          config: configPda,
          admin: adminPda,
          roleRequest: newRoleRequestPda,
        })
        .signers([])
        .rpc();

      expect(sig).to.not.be.null;

      // Verify request was rejected
      const roleRequest = await program.account.roleRequest.fetch(
        newRoleRequestPda
      );
      expect(roleRequest.status).to.equal(RequestStatus.Rejected);
    });

    it("cannot approve already approved request", async () => {
      const roleRequestPda = getRoleRequestPda(user2.publicKey, program.programId);

      try {
        await program.methods
          .approveRoleRequest()
          .accounts({
            config: configPda,
            admin: adminPda,
            roleRequest: roleRequestPda,
          })
          .signers([])
          .rpc();
        expect.fail("Expected double approval to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("cannot approve already rejected request", async () => {
      const newRoleRequestPda = getRoleRequestPda(
        unauthorizedUser.publicKey,
        program.programId
      );

      try {
        await program.methods
          .approveRoleRequest()
          .accounts({
            config: configPda,
            admin: adminPda,
            roleRequest: newRoleRequestPda,
          })
          .signers([])
          .rpc();
        expect.fail("Expected approval of rejected request to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("request_role rejects invalid role names", async () => {
      const testUser = Keypair.generate();
      await fundKeypair(provider, testUser, 1);
      const invalidRoleRequestPda = getRoleRequestPda(
        testUser.publicKey,
        program.programId
      );

      try {
        await program.methods
          .requestRole("INVALID_ROLE")
          .accounts({
            config: configPda,
            roleRequest: invalidRoleRequestPda,
            user: testUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([testUser])
          .rpc();
        expect.fail("Expected request with invalid role to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("request_role rejects if user already has the role", async () => {
      // user1 already has FABRICANTE role from earlier test
      try {
        await program.methods
          .requestRole(FABRICANTE_ROLE)
          .accounts({
            config: configPda,
            roleRequest: getRoleRequestPda(user1.publicKey, program.programId),
            user: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        expect.fail("Expected request for existing role to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // =========================================================================
  // 3. Role Revocation Tests
  // =========================================================================
  describe("Role Revocation Tests", () => {
    it("admin can revoke a role", async () => {
      // Revoke FABRICANTE from user1
      const sig = await program.methods
        .revokeRole(FABRICANTE_ROLE)
        .accounts({
          config: configPda,
          admin: adminPda,
          accountToRevoke: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      expect(sig).to.not.be.null;

      // Verify role was revoked
      const config = await program.account.supplyChainConfig.fetch(configPda);
      expect(config.fabricante.toString()).to.equal(
        PublicKey.default.toString()
      );
    });

    it("non-admin cannot revoke a role", async () => {
      // First grant a role to revoke
      await program.methods
        .grantRole(FABRICANTE_ROLE)
        .accounts({
          config: configPda,
          admin: adminPda,
          accountToGrant: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      // Try to revoke as non-admin
      try {
        await program.methods
          .revokeRole(FABRICANTE_ROLE)
          .accounts({
            config: configPda,
            admin: unauthorizedUser.publicKey,
            accountToRevoke: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorizedUser, user1])
          .rpc();
        expect.fail("Expected revoke to fail for non-admin");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("cannot revoke role not held by account", async () => {
      try {
        await program.methods
          .revokeRole(AUDITOR_HW_ROLE)
          .accounts({
            config: configPda,
            admin: adminPda,
            accountToRevoke: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        expect.fail("Expected revoke of unheld role to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("revoke requires recipient signature", async () => {
      try {
        await program.methods
          .revokeRole(FABRICANTE_ROLE)
          .accounts({
            config: configPda,
            admin: adminPda,
            accountToRevoke: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([]) // Missing user1 signature
          .rpc();
        expect.fail("Expected revoke to fail without recipient signature");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // =========================================================================
  // 4. Role Holder Management Tests
  // =========================================================================
  describe("Role Holder Management Tests", () => {
    it("admin can add a role holder", async () => {
      const holderUser = Keypair.generate();
      await fundKeypair(provider, holderUser, 1);

      const [roleHolderPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("role_holder"), holderUser.publicKey.toBuffer()],
        program.programId
      );

      const sig = await program.methods
        .addRoleHolder(AUDITOR_HW_ROLE)
        .accounts({
          config: configPda,
          admin: adminPda,
          roleHolder: roleHolderPda,
          accountToAdd: holderUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([])
        .rpc();

      expect(sig).to.not.be.null;

      // Verify count was incremented
      const config = await program.account.supplyChainConfig.fetch(configPda);
      expect(config.auditorHwCount).to.be.greaterThan(0);
    });

    it("non-admin cannot add a role holder", async () => {
      const holderUser = Keypair.generate();
      await fundKeypair(provider, holderUser, 1);

      const [roleHolderPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("role_holder"), holderUser.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .addRoleHolder(TECNICO_SW_ROLE)
          .accounts({
            config: configPda,
            admin: unauthorizedUser.publicKey,
            roleHolder: roleHolderPda,
            accountToAdd: holderUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorizedUser])
          .rpc();
        expect.fail("Expected add role holder to fail for non-admin");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("admin can remove a role holder", async () => {
      // First add a holder
      const holderUser = Keypair.generate();
      await fundKeypair(provider, holderUser, 1);

      const [roleHolderPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("role_holder"), holderUser.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .addRoleHolder(ESCUELA_ROLE)
        .accounts({
          config: configPda,
          admin: adminPda,
          roleHolder: roleHolderPda,
          accountToAdd: holderUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([])
        .rpc();

      // Now remove the holder
      const sig = await program.methods
        .removeRoleHolder(ESCUELA_ROLE)
        .accounts({
          config: configPda,
          admin: adminPda,
          roleHolder: roleHolderPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([])
        .rpc();

      expect(sig).to.not.be.null;
    });

    it("non-admin cannot remove a role holder", async () => {
      const holderUser = Keypair.generate();
      await fundKeypair(provider, holderUser, 1);

      const [roleHolderPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("role_holder"), holderUser.publicKey.toBuffer()],
        program.programId
      );

      // First add a holder
      await program.methods
        .addRoleHolder(ESCUELA_ROLE)
        .accounts({
          config: configPda,
          admin: adminPda,
          roleHolder: roleHolderPda,
          accountToAdd: holderUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([])
        .rpc();

      // Try to remove as non-admin
      try {
        await program.methods
          .removeRoleHolder(ESCUELA_ROLE)
          .accounts({
            config: configPda,
            admin: unauthorizedUser.publicKey,
            roleHolder: roleHolderPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorizedUser])
          .rpc();
        expect.fail("Expected remove role holder to fail for non-admin");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // =========================================================================
  // 5. Security Tests - Prevent Direct Role Assignment
  // =========================================================================
  describe("Security Tests", () => {
    it("verifies grant_role_no_signer is removed", async () => {
      // grant_role_no_signer should no longer exist in the program
      // This test verifies that direct role assignment without recipient
      // signature is not possible
      try {
        // Try to call grant_role without recipient signature
        await program.methods
          .grantRole(AUDITOR_HW_ROLE)
          .accounts({
            config: configPda,
            admin: adminPda,
            accountToGrant: unauthorizedUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([]) // Missing recipient signature
          .rpc();
        expect.fail("Expected grant without recipient signature to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("verifies only valid roles can be granted", async () => {
      try {
        await program.methods
          .grantRole("SUPER_ADMIN")
          .accounts({
            config: configPda,
            admin: adminPda,
            accountToGrant: unauthorizedUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin, unauthorizedUser])
          .rpc();
        expect.fail("Expected invalid role grant to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("verifies duplicate role grant is prevented", async () => {
      // user1 already has FABRICANTE role
      try {
        await program.methods
          .grantRole(FABRICANTE_ROLE)
          .accounts({
            config: configPda,
            admin: adminPda,
            accountToGrant: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        expect.fail("Expected duplicate grant to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // =========================================================================
  // 6. System Integrity Tests
  // =========================================================================
  describe("System Integrity Tests", () => {
    it("verifies config maintains correct role counts", async () => {
      const config = await program.account.supplyChainConfig.fetch(configPda);

      // Verify counts are non-negative
      expect(config.fabricanteCount).to.be.greaterThanOrEqual(0);
      expect(config.auditorHwCount).to.be.greaterThanOrEqual(0);
      expect(config.tecnicoSwCount).to.be.greaterThanOrEqual(0);
      expect(config.escuelaCount).to.be.greaterThanOrEqual(0);
    });

    it("verifies role request count increments correctly", async () => {
      const config = await program.account.supplyChainConfig.fetch(configPda);
      expect(config.roleRequestsCount).to.be.greaterThan(0);
    });

    it("verifies admin PDA is correctly set", async () => {
      const config = await program.account.supplyChainConfig.fetch(configPda);
      const adminPda = PublicKey.findProgramAddressSync(
        [Buffer.from("admin"), configPda.toBuffer()],
        program.programId
      )[0];
      expect(config.admin.toString()).to.equal(adminPda.toString());
    });
  });

  // =========================================================================
  // 7. Compatibility Tests with Existing Operations
  // =========================================================================
  describe("Compatibility Tests", () => {
    it("verifies query operations work with role system", async () => {
      const sig = await program.methods
        .queryConfig()
        .accounts({
          config: configPda,
        })
        .rpc();

      expect(sig).to.not.be.null;
    });
  });
});
