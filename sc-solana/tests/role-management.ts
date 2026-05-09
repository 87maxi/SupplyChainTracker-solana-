/**
 * Role Management Integration Tests
 * 
 * Tests for role management instructions covering:
 * - Grant role operations
 * - Request role operations
 * - Approve/reject role requests
 * - Role revocation
 * - Multiple role holders
 * - Role enforcement
 * - Error handling
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ScSolana } from "../target/types/sc_solana";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  PublicKey,
} from "@solana/web3.js";
import {
  getConfigPda,
  getRoleRequestPda,
  getAdminPda,
  fundKeypair,
  RequestStatus,
} from "./test-helpers";

// Role constants (matching the program)
const FABRICANTE_ROLE = "FABRICANTE";
const AUDITOR_HW_ROLE = "AUDITOR_HW";
const TECNICO_SW_ROLE = "TECNICO_SW";
const ESCUELA_ROLE = "ESCUELA";

describe("Role Management Integration Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  // Load program from workspace or fall back to IDL-based loading
  let program: Program<ScSolana>;

  // Key accounts
  let admin: Keypair;
  let fabricante: Keypair;
  let auditor: Keypair;
  let tecnico: Keypair;
  let escuela: Keypair;
  let randomUser: Keypair;
  let configPda: PublicKey;
  let adminPda: PublicKey;

  before(async () => {
    // Load program
    if (anchor.workspace.scSolana) {
      program = anchor.workspace.scSolana as Program<ScSolana>;
    } else {
      const idl = require("../target/idl/sc_solana.json");
      const programId = new anchor.web3.PublicKey("7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb");
      // Recreate provider with the program IDL for manual test runs
      const updatedProvider = new anchor.AnchorProvider(provider.connection, provider.wallet, {
        commitment: provider.opts.commitment,
        preflightCommitment: provider.opts.preflightCommitment,
      });
      anchor.setProvider(updatedProvider);
      program = new anchor.Program({ ...idl, address: programId.toString() }, updatedProvider);
    }
    
    // Generate test accounts (each test needs fresh accounts for proper isolation)
    admin = Keypair.generate();
    fabricante = Keypair.generate();
    auditor = Keypair.generate();
    tecnico = Keypair.generate();
    escuela = Keypair.generate();
    randomUser = Keypair.generate();

    // Fund all accounts
    for (const kp of [admin, fabricante, auditor, tecnico, escuela, randomUser]) {
      await fundKeypair(provider, kp, 2);
    }

    configPda = (await getConfigPda(program))[0];
    adminPda = getAdminPda(configPda, program.programId);

    // Initialize config using PDA-first pattern
    const funder = Keypair.generate();
    await fundKeypair(provider, funder, 10);
    const [deployerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("deployer")],
      program.programId
    );
    const serialHashRegistryPda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("serial_hashes"), configPda.toBuffer()],
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

    // Fund accounts if needed
    for (const kp of [fabricante, auditor, tecnico, escuela]) {
      const balance = await provider.connection.getBalance(kp.publicKey);
      if (balance < 0.5 * LAMPORTS_PER_SOL) {
        await fundKeypair(provider, kp, 2);
      }
    }
  });

  describe("Grant Role Operations", () => {
    it("grants FABRICANTE role to account", async () => {
      const tx = await program.methods
        .grantRole(FABRICANTE_ROLE)
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          accountToGrant: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin, fabricante])
        .rpc();

      // Verify role was granted
      const config = await program.account.supplyChainConfig.fetch(configPda);
      config.fabricante.toString().should.equal(fabricante.publicKey.toString());
    });

    it("grants AUDITOR_HW role to account", async () => {
      const tx = await program.methods
        .grantRole(AUDITOR_HW_ROLE)
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          accountToGrant: auditor.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin, auditor])
        .rpc();

      // Verify role was granted
      const config = await program.account.supplyChainConfig.fetch(configPda);
      config.auditorHw.toString().should.equal(auditor.publicKey.toString());
    });

    it("grants TECNICO_SW role to account", async () => {
      const tx = await program.methods
        .grantRole(TECNICO_SW_ROLE)
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          accountToGrant: tecnico.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin, tecnico])
        .rpc();

      // Verify role was granted
      const config = await program.account.supplyChainConfig.fetch(configPda);
      config.tecnicoSw.toString().should.equal(tecnico.publicKey.toString());
    });

    it("grants ESCUELA role to account", async () => {
      const tx = await program.methods
        .grantRole(ESCUELA_ROLE)
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          accountToGrant: escuela.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin, escuela])
        .rpc();

      // Verify role was granted
      const config = await program.account.supplyChainConfig.fetch(configPda);
      config.escuela.toString().should.equal(escuela.publicKey.toString());
    });

    it("returns error when granting same role twice", async () => {
      try {
        await program.methods
          .grantRole(FABRICANTE_ROLE)
          .accountsStrict({
            config: configPda,
            admin: adminPda,
            accountToGrant: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin, fabricante])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("RoleAlreadyGranted");
      }
    });

    it("returns error when granting invalid role name", async () => {
      try {
        await program.methods
          .grantRole("INVALID_ROLE")
          .accountsStrict({
            config: configPda,
            admin: adminPda,
            accountToGrant: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin, randomUser])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("RoleNotFound");
      }
    });

    it("cannot grant role as non-admin", async () => {
      try {
        await program.methods
          .grantRole(AUDITOR_HW_ROLE)
          .accountsStrict({
            config: configPda,
            admin: auditor.publicKey,
            accountToGrant: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([auditor, randomUser])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.satisfy((msg) =>
          msg.includes("Unauthorized") || msg.includes("HasOne")
        );
      }
    });

    it("cannot grant role without account_to_grant signing", async () => {
      try {
        await program.methods
          .grantRole(TECNICO_SW_ROLE)
          .accountsStrict({
            config: configPda,
            admin: adminPda,
            accountToGrant: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin]) // Missing randomUser signature
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.satisfy((msg) =>
          msg.includes("Signature") || msg.includes("invalid signer")
        );
      }
    });
  });

  describe("Request Role Operations", () => {
    it("requests TECNICO_SW role via PDA", async () => {
      const roleRequestPda = getRoleRequestPda(tecnico.publicKey, program.programId);
      
      const tx = await program.methods
        .requestRole(TECNICO_SW_ROLE)
        .accountsStrict({
          config: configPda,
          roleRequest: roleRequestPda,
          user: tecnico.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([tecnico])
        .rpc();

      // Verify role request was created
      const roleRequest = await program.account.roleRequest.fetch(roleRequestPda);
      roleRequest.status.should.equal(RequestStatus.Pending);
      roleRequest.user.toString().should.equal(tecnico.publicKey.toString());
      roleRequest.role.should.equal(TECNICO_SW_ROLE);
    });

    it("requests ESCUELA role via PDA", async () => {
      const roleRequestPda = getRoleRequestPda(escuela.publicKey, program.programId);
      
      const tx = await program.methods
        .requestRole(ESCUELA_ROLE)
        .accountsStrict({
          config: configPda,
          roleRequest: roleRequestPda,
          user: escuela.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([escuela])
        .rpc();

      // Verify role request was created
      const roleRequest = await program.account.roleRequest.fetch(roleRequestPda);
      roleRequest.status.should.equal(RequestStatus.Pending);
      roleRequest.user.toString().should.equal(escuela.publicKey.toString());
      roleRequest.role.should.equal(ESCUELA_ROLE);
    });

    it("cannot request same role twice", async () => {
      try {
        const roleRequestPda = getRoleRequestPda(randomUser.publicKey, program.programId);
        
        // First request should fail because randomUser has no role yet
        // But if we try to request again, it should fail
        await program.methods
          .requestRole(FABRICANTE_ROLE)
          .accountsStrict({
            config: configPda,
            roleRequest: roleRequestPda,
            user: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([randomUser])
          .rpc();

        // If first succeeded, second should fail
        const roleRequestPda2 = getRoleRequestPda(randomUser.publicKey, program.programId);
        await program.methods
          .requestRole(FABRICANTE_ROLE)
          .accountsStrict({
            config: configPda,
            roleRequest: roleRequestPda2,
            user: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([randomUser])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.satisfy((msg) =>
          msg.includes("RoleAlreadyGranted") || msg.includes("InvalidInput")
        );
      }
    });

    it("creates unique PDA for each user request", async () => {
      const tecnicoRequestPda = getRoleRequestPda(tecnico.publicKey, program.programId);
      const escuelaRequestPda = getRoleRequestPda(escuela.publicKey, program.programId);
      
      tecnicoRequestPda.toString().should.not.equal(escuelaRequestPda.toString());
    });
  });

  describe("Approve Role Request Operations", () => {
    it("approves TECNICO_SW role request", async () => {
      const roleRequestPda = getRoleRequestPda(tecnico.publicKey, program.programId);
      
      const tx = await program.methods
        .approveRoleRequest()
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          roleRequest: roleRequestPda,
        })
        .signers([admin])
        .rpc();

      // Verify role request was approved
      const roleRequest = await program.account.roleRequest.fetch(roleRequestPda);
      roleRequest.status.should.equal(RequestStatus.Approved);

      // Verify config was updated
      const config = await program.account.supplyChainConfig.fetch(configPda);
      config.tecnicoSw.toString().should.equal(tecnico.publicKey.toString());
    });

    it("approves ESCUELA role request", async () => {
      const roleRequestPda = getRoleRequestPda(escuela.publicKey, program.programId);
      
      const tx = await program.methods
        .approveRoleRequest()
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          roleRequest: roleRequestPda,
        })
        .signers([admin])
        .rpc();

      // Verify role request was approved
      const roleRequest = await program.account.roleRequest.fetch(roleRequestPda);
      roleRequest.status.should.equal(RequestStatus.Approved);

      // Verify config was updated
      const config = await program.account.supplyChainConfig.fetch(configPda);
      config.escuela.toString().should.equal(escuela.publicKey.toString());
    });

    it("cannot approve already approved request", async () => {
      const roleRequestPda = getRoleRequestPda(tecnico.publicKey, program.programId);
      
      try {
        await program.methods
          .approveRoleRequest()
          .accountsStrict({
            config: configPda,
            admin: adminPda,
            roleRequest: roleRequestPda,
          })
          .signers([admin])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.satisfy((msg) =>
          msg.includes("InvalidRequestState") || msg.includes("RoleAlreadyGranted") || msg.includes("InvalidInput")
        );
      }
    });

    it("cannot approve non-existent role request", async () => {
      const nonExistentUser = Keypair.generate();
      const roleRequestPda = getRoleRequestPda(nonExistentUser.publicKey, program.programId);
      
      try {
        await program.methods
          .approveRoleRequest()
          .accountsStrict({
            config: configPda,
            admin: adminPda,
            roleRequest: roleRequestPda,
          })
          .signers([admin])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.satisfy((msg) =>
          msg.includes("AccountNotInitialized") || msg.includes("InvalidInput")
        );
      }
    });

    it("cannot approve role request as non-admin", async () => {
      const nonAdmin = Keypair.generate();
      const roleRequestPda = getRoleRequestPda(nonAdmin.publicKey, program.programId);
      
      // First create a request
      await program.methods
        .requestRole(FABRICANTE_ROLE)
        .accountsStrict({
          config: configPda,
          roleRequest: roleRequestPda,
          user: nonAdmin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([nonAdmin])
        .rpc();

      try {
        await program.methods
          .approveRoleRequest()
          .accountsStrict({
            config: configPda,
            admin: nonAdmin.publicKey,
            roleRequest: roleRequestPda,
          })
          .signers([nonAdmin])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.satisfy((msg) =>
          msg.includes("Unauthorized") || msg.includes("HasOne")
        );
      }
    });
  });

  describe("Reject Role Request Operations", () => {
    it("rejects a role request", async () => {
      const rejectUser = Keypair.generate();
      const roleRequestPda = getRoleRequestPda(rejectUser.publicKey, program.programId);
      
      // First create a role request
      await program.methods
        .requestRole(TECNICO_SW_ROLE)
        .accountsStrict({
          config: configPda,
          roleRequest: roleRequestPda,
          user: rejectUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([rejectUser])
        .rpc();

      // Now reject it
      const tx = await program.methods
        .rejectRoleRequest()
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          roleRequest: roleRequestPda,
        })
        .signers([admin])
        .rpc();

      // Verify role request was rejected
      const roleRequest = await program.account.roleRequest.fetch(roleRequestPda);
      roleRequest.status.should.equal(RequestStatus.Rejected);
    });

    it("cannot reject already rejected request", async () => {
      const rejectUser = Keypair.generate();
      const roleRequestPda = getRoleRequestPda(rejectUser.publicKey, program.programId);
      
      // Create and reject
      await program.methods
        .requestRole(TECNICO_SW_ROLE)
        .accountsStrict({
          config: configPda,
          roleRequest: roleRequestPda,
          user: rejectUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([rejectUser])
        .rpc();

      await program.methods
        .rejectRoleRequest()
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          roleRequest: roleRequestPda,
        })
        .signers([admin])
        .rpc();

      // Try to reject again
      try {
        await program.methods
          .rejectRoleRequest()
          .accountsStrict({
            config: configPda,
            admin: adminPda,
            roleRequest: roleRequestPda,
          })
          .signers([admin])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.satisfy((msg) =>
          msg.includes("InvalidRequestState") || msg.includes("InvalidInput") || msg.includes("RoleRequest")
        );
      }
    });

    it("cannot reject role request as non-admin", async () => {
      const rejectUser = Keypair.generate();
      const roleRequestPda = getRoleRequestPda(rejectUser.publicKey, program.programId);
      
      // Create a request
      await program.methods
        .requestRole(TECNICO_SW_ROLE)
        .accountsStrict({
          config: configPda,
          roleRequest: roleRequestPda,
          user: rejectUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([rejectUser])
        .rpc();

      try {
        await program.methods
          .rejectRoleRequest()
          .accountsStrict({
            config: configPda,
            admin: rejectUser.publicKey,
            roleRequest: roleRequestPda,
          })
          .signers([rejectUser])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.satisfy((msg) =>
          msg.includes("Unauthorized") || msg.includes("HasOne")
        );
      }
    });
  });

  describe("Role Enforcement", () => {
    it("unauthorized user cannot grant roles", async () => {
      const unauthorized = Keypair.generate();
      
      try {
        await program.methods
          .grantRole(FABRICANTE_ROLE)
          .accountsStrict({
            config: configPda,
            admin: unauthorized.publicKey,
            accountToGrant: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorized, randomUser])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.satisfy((msg) =>
          msg.includes("Unauthorized") || msg.includes("HasOne")
        );
      }
    });

    it("unauthorized user cannot approve role requests", async () => {
      const unauthorized = Keypair.generate();
      const roleRequestPda = getRoleRequestPda(unauthorized.publicKey, program.programId);
      
      // Create a request
      await program.methods
        .requestRole(TECNICO_SW_ROLE)
        .accountsStrict({
          config: configPda,
          roleRequest: roleRequestPda,
          user: unauthorized.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([unauthorized])
        .rpc();

      try {
        await program.methods
          .approveRoleRequest()
          .accountsStrict({
            config: configPda,
            admin: unauthorized.publicKey,
            roleRequest: roleRequestPda,
          })
          .signers([unauthorized])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.satisfy((msg) =>
          msg.includes("Unauthorized") || msg.includes("HasOne")
        );
      }
    });

    it("role holder can use granted role", async () => {
      // Fabricante should already have FABRICANTE role
      const config = await program.account.supplyChainConfig.fetch(configPda);
      config.fabricante.toString().should.equal(fabricante.publicKey.toString());
    });
  });

  describe("Multiple Role Holders", () => {
    it("can hold multiple roles simultaneously", async () => {
      // Create a user that will hold multiple roles
      const multiRoleUser = Keypair.generate();
      
      // Grant multiple roles to the same user
      await program.methods
        .grantRole(AUDITOR_HW_ROLE)
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          accountToGrant: multiRoleUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin, multiRoleUser])
        .rpc();

      await program.methods
        .grantRole(TECNICO_SW_ROLE)
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          accountToGrant: multiRoleUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin, multiRoleUser])
        .rpc();

      // Verify both roles are granted
      const config = await program.account.supplyChainConfig.fetch(configPda);
      config.auditorHw.toString().should.equal(multiRoleUser.publicKey.toString());
      config.tecnicoSw.toString().should.equal(multiRoleUser.publicKey.toString());
    });

    it("can grant different roles to different users", async () => {
      const user1 = Keypair.generate();
      const user2 = Keypair.generate();
      const user3 = Keypair.generate();

      // Grant different roles
      await program.methods
        .grantRole(AUDITOR_HW_ROLE)
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          accountToGrant: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin, user1])
        .rpc();

      await program.methods
        .grantRole(TECNICO_SW_ROLE)
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          accountToGrant: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin, user2])
        .rpc();

      await program.methods
        .grantRole(ESCUELA_ROLE)
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          accountToGrant: user3.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin, user3])
        .rpc();

      // Verify all roles are granted to correct users
      const config = await program.account.supplyChainConfig.fetch(configPda);
      config.auditorHw.toString().should.equal(user1.publicKey.toString());
      config.tecnicoSw.toString().should.equal(user2.publicKey.toString());
      config.escuela.toString().should.equal(user3.publicKey.toString());
    });
  });

  describe("Role Request Lifecycle", () => {
    it("completes full role request lifecycle: request -> approve", async () => {
      const lifecycleUser = Keypair.generate();
      const roleRequestPda = getRoleRequestPda(lifecycleUser.publicKey, program.programId);

      // Step 1: Request role
      await program.methods
        .requestRole(ESCUELA_ROLE)
        .accountsStrict({
          config: configPda,
          roleRequest: roleRequestPda,
          user: lifecycleUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([lifecycleUser])
        .rpc();

      // Verify pending status
      let roleRequest = await program.account.roleRequest.fetch(roleRequestPda);
      roleRequest.status.should.equal(RequestStatus.Pending);

      // Step 2: Admin approves
      await program.methods
        .approveRoleRequest()
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          roleRequest: roleRequestPda,
        })
        .signers([admin])
        .rpc();

      // Verify approved status and config update
      roleRequest = await program.account.roleRequest.fetch(roleRequestPda);
      roleRequest.status.should.equal(RequestStatus.Approved);

      const config = await program.account.supplyChainConfig.fetch(configPda);
      config.escuela.toString().should.equal(lifecycleUser.publicKey.toString());
    });

    it("completes full role request lifecycle: request -> reject", async () => {
      const lifecycleUser = Keypair.generate();
      const roleRequestPda = getRoleRequestPda(lifecycleUser.publicKey, program.programId);

      // Step 1: Request role
      await program.methods
        .requestRole(FABRICANTE_ROLE)
        .accountsStrict({
          config: configPda,
          roleRequest: roleRequestPda,
          user: lifecycleUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([lifecycleUser])
        .rpc();

      // Verify pending status
      let roleRequest = await program.account.roleRequest.fetch(roleRequestPda);
      roleRequest.status.should.equal(RequestStatus.Pending);

      // Step 2: Admin rejects
      await program.methods
        .rejectRoleRequest()
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          roleRequest: roleRequestPda,
        })
        .signers([admin])
        .rpc();

      // Verify rejected status
      roleRequest = await program.account.roleRequest.fetch(roleRequestPda);
      roleRequest.status.should.equal(RequestStatus.Rejected);
    });
  });

  describe("Error Handling", () => {
    it("handles role not found error for invalid role string", async () => {
      try {
        await program.methods
          .grantRole("NOT_A_VALID_ROLE")
          .accountsStrict({
            config: configPda,
            admin: adminPda,
            accountToGrant: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin, randomUser])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("RoleNotFound");
      }
    });

    it("handles role already granted error", async () => {
      // Try to grant a role that's already granted
      const config = await program.account.supplyChainConfig.fetch(configPda);
      
      if (!config.fabricante.equals(fabricante.publicKey)) {
        // Grant first
        await program.methods
          .grantRole(FABRICANTE_ROLE)
          .accountsStrict({
            config: configPda,
            admin: adminPda,
            accountToGrant: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin, fabricante])
          .rpc();
      }

      try {
        await program.methods
          .grantRole(FABRICANTE_ROLE)
          .accountsStrict({
            config: configPda,
            admin: adminPda,
            accountToGrant: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin, fabricante])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("RoleAlreadyGranted");
      }
    });

    it("handles account not initialized for non-existent role request", async () => {
      const nonExistent = Keypair.generate();
      const roleRequestPda = getRoleRequestPda(nonExistent.publicKey, program.programId);
      
      try {
        await program.methods
          .approveRoleRequest()
          .accountsStrict({
            config: configPda,
            admin: adminPda,
            roleRequest: roleRequestPda,
          })
          .signers([admin])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.satisfy((msg) =>
          msg.includes("AccountNotInitialized") || msg.includes("InvalidInput")
        );
      }
    });
  });

  describe("Config State Verification", () => {
    it("verifies all role fields in config after operations", async () => {
      const config = await program.account.supplyChainConfig.fetch(configPda);
      
      // Verify role fields are public keys
      config.admin.toString().should.not.be.empty;
      config.fabricante.toString().should.not.be.empty;
      config.auditorHw.toString().should.not.be.empty;
      config.tecnicoSw.toString().should.not.be.empty;
      config.escuela.toString().should.not.be.empty;
    });

    it("verifies config counters after role operations", async () => {
      const config = await program.account.supplyChainConfig.fetch(configPda);
      
      // nextTokenId should be >= 0
      config.nextTokenId.toNumber().should.be.at.least(0);
      
      // totalNetbooks should be >= 0
      config.totalNetbooks.toNumber().should.be.at.least(0);
    });
  });

  describe("Edge Cases", () => {
    it("handles role request from user with existing role", async () => {
      // Fabricante already has FABRICANTE role
      const roleRequestPda = getRoleRequestPda(fabricante.publicKey, program.programId);
      
      try {
        await program.methods
          .requestRole(FABRICANTE_ROLE)
          .accountsStrict({
            config: configPda,
            roleRequest: roleRequestPda,
            user: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.satisfy((msg) =>
          msg.includes("RoleAlreadyGranted") || msg.includes("InvalidInput")
        );
      }
    });

    it("handles concurrent role requests from different users", async () => {
      const user1 = Keypair.generate();
      const user2 = Keypair.generate();
      const user3 = Keypair.generate();

      const requestPda1 = getRoleRequestPda(user1.publicKey, program.programId);
      const requestPda2 = getRoleRequestPda(user2.publicKey, program.programId);
      const requestPda3 = getRoleRequestPda(user3.publicKey, program.programId);

      // All three request roles concurrently
      await Promise.all([
        program.methods
          .requestRole(TECNICO_SW_ROLE)
          .accountsStrict({
            config: configPda,
            roleRequest: requestPda1,
            user: user1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc(),
        
        program.methods
          .requestRole(ESCUELA_ROLE)
          .accountsStrict({
            config: configPda,
            roleRequest: requestPda2,
            user: user2.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user2])
          .rpc(),
        
        program.methods
          .requestRole(AUDITOR_HW_ROLE)
          .accountsStrict({
            config: configPda,
            roleRequest: requestPda3,
            user: user3.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user3])
          .rpc(),
      ]);

      // Verify all requests are pending
      const req1 = await program.account.roleRequest.fetch(requestPda1);
      const req2 = await program.account.roleRequest.fetch(requestPda2);
      const req3 = await program.account.roleRequest.fetch(requestPda3);

      req1.status.should.equal(RequestStatus.Pending);
      req2.status.should.equal(RequestStatus.Pending);
      req3.status.should.equal(RequestStatus.Pending);
    });

    it("handles empty role string", async () => {
      try {
        await program.methods
          .grantRole("")
          .accountsStrict({
            config: configPda,
            admin: adminPda,
            accountToGrant: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin, randomUser])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.satisfy((msg) =>
          msg.includes("RoleNotFound") || msg.includes("InvalidInput")
        );
      }
    });
  });
});
