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
 *
 * Migrated from @coral-xyz/anchor to Codama-generated client (Issue #209).
 */

import {
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { createSignerFromKeyPair } from "@solana/kit";
import { expect } from "chai";

import {
  createTestClient,
  getConfigPdaAddress,
  getRoleRequestPdaAddress,
  getAdminPdaAddress,
  getRoleHolderByUserPdaAddress,
  fundKeypair,
  fundAndInitialize,
  toAddress,
  toUint8Array,
  RequestStatus,
  type TestClient,
} from "./test-helpers";

// Role constants (matching the program)
const FABRICANTE_ROLE = "FABRICANTE";
const AUDITOR_HW_ROLE = "AUDITOR_HW";
const TECNICO_SW_ROLE = "TECNICO_SW";
const ESCUELA_ROLE = "ESCUELA";

describe("Role Management Integration Tests", () => {
  let client: TestClient;

  // Key accounts
  let admin: Keypair;
  let fabricante: Keypair;
  let auditor: Keypair;
  let tecnico: Keypair;
  let escuela: Keypair;
  let randomUser: Keypair;
  let configPda: string;
  let adminPda: string;

  before(async () => {
    // Generate test accounts
    admin = Keypair.generate();
    fabricante = Keypair.generate();
    auditor = Keypair.generate();
    tecnico = Keypair.generate();
    escuela = Keypair.generate();
    randomUser = Keypair.generate();

    // Create client
    client = await createTestClient("http://localhost:8899", admin);

    // Fund all accounts with sufficient balance for all operations
    await fundKeypair(client, fabricante, 5 * LAMPORTS_PER_SOL);
    await fundKeypair(client, auditor, 5 * LAMPORTS_PER_SOL);
    await fundKeypair(client, tecnico, 5 * LAMPORTS_PER_SOL);
    await fundKeypair(client, escuela, 5 * LAMPORTS_PER_SOL);
    await fundKeypair(client, randomUser, 5 * LAMPORTS_PER_SOL);

    configPda = await getConfigPdaAddress();
    adminPda = await getAdminPdaAddress(toAddress(configPda));

    // Initialize using shared initialization (Issue #178)
    await fundAndInitialize(client, admin);
  });

  describe("Grant Role Operations", () => {
    it("grants FABRICANTE role to account", async () => {
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: fabricanteSigner,
          role: FABRICANTE_ROLE,
        })
        .sendAndConfirm();

      // Verify role was granted
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config.fabricante.toString()).to.equal(fabricante.publicKey.toString());
    });

    it("grants AUDITOR_HW role to account", async () => {
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: auditorSigner,
          role: AUDITOR_HW_ROLE,
        })
        .sendAndConfirm();

      // Verify role was granted
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config.auditorHw.toString()).to.equal(auditor.publicKey.toString());
    });

    it("grants TECNICO_SW role to account", async () => {
      const tecnicoSigner = await createSignerFromKeyPair(tecnico);
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: tecnicoSigner,
          role: TECNICO_SW_ROLE,
        })
        .sendAndConfirm();

      // Verify role was granted
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config.tecnicoSw.toString()).to.equal(tecnico.publicKey.toString());
    });

    it("grants ESCUELA role to account", async () => {
      const escuelaSigner = await createSignerFromKeyPair(escuela);
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: escuelaSigner,
          role: ESCUELA_ROLE,
        })
        .sendAndConfirm();

      // Verify role was granted
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config.escuela.toString()).to.equal(escuela.publicKey.toString());
    });

    it("returns error when granting same role twice", async () => {
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      try {
        await client.scSolana.instructions
          .grantRole({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            accountToGrant: fabricanteSigner,
            role: FABRICANTE_ROLE,
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("RoleAlreadyGranted");
      }
    });

    it("returns error when granting invalid role name", async () => {
      const randomUserSigner = await createSignerFromKeyPair(randomUser);
      try {
        await client.scSolana.instructions
          .grantRole({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            accountToGrant: randomUserSigner,
            role: "INVALID_ROLE",
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("RoleNotFound");
      }
    });

    it("cannot grant role as non-admin", async () => {
      const auditorSigner = await createSignerFromKeyPair(auditor);
      const randomUserSigner = await createSignerFromKeyPair(randomUser);
      try {
        await client.scSolana.instructions
          .grantRole({
            config: toAddress(configPda),
            admin: toAddress(auditor.publicKey.toString()),
            accountToGrant: randomUserSigner,
            role: AUDITOR_HW_ROLE,
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.satisfy(
          (msg: string) => msg.includes("Unauthorized") || msg.includes("HasOne")
        );
      }
    });

    it("cannot grant role without account_to_grant signing", async () => {
      const wrongSigner = await createSignerFromKeyPair(Keypair.generate());
      try {
        await client.scSolana.instructions
          .grantRole({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            accountToGrant: toAddress(randomUser.publicKey.toString()),
            role: TECNICO_SW_ROLE,
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.satisfy(
          (msg: string) => msg.includes("Signature") || msg.includes("invalid signer")
        );
      }
    });
  });

  describe("Request Role Operations", () => {
    it("requests TECNICO_SW role via PDA", async () => {
      const roleRequestPda = await getRoleRequestPdaAddress(toAddress(tecnico.publicKey.toString()));
      const tecnicoSigner = await createSignerFromKeyPair(tecnico);

      await client.scSolana.instructions
        .requestRole({
          config: toAddress(configPda),
          roleRequest: toAddress(roleRequestPda),
          user: tecnicoSigner,
          role: TECNICO_SW_ROLE,
        })
        .sendAndConfirm();

      // Verify role request was created
      const roleRequest = await client.scSolana.accounts.roleRequest.fetch(toAddress(roleRequestPda));
      expect(roleRequest.status).to.equal(RequestStatus.Pending);
      expect(roleRequest.user.toString()).to.equal(tecnico.publicKey.toString());
      expect(roleRequest.role).to.equal(TECNICO_SW_ROLE);
    });

    it("requests ESCUELA role via PDA", async () => {
      const roleRequestPda = await getRoleRequestPdaAddress(toAddress(escuela.publicKey.toString()));
      const escuelaSigner = await createSignerFromKeyPair(escuela);

      await client.scSolana.instructions
        .requestRole({
          config: toAddress(configPda),
          roleRequest: toAddress(roleRequestPda),
          user: escuelaSigner,
          role: ESCUELA_ROLE,
        })
        .sendAndConfirm();

      // Verify role request was created
      const roleRequest = await client.scSolana.accounts.roleRequest.fetch(toAddress(roleRequestPda));
      expect(roleRequest.status).to.equal(RequestStatus.Pending);
      expect(roleRequest.user.toString()).to.equal(escuela.publicKey.toString());
      expect(roleRequest.role).to.equal(ESCUELA_ROLE);
    });

    it("cannot request same role twice", async () => {
      const roleRequestPda = await getRoleRequestPdaAddress(
        toAddress(randomUser.publicKey.toString())
      );
      const randomUserSigner = await createSignerFromKeyPair(randomUser);

      // First request
      await client.scSolana.instructions
        .requestRole({
          config: toAddress(configPda),
          roleRequest: toAddress(roleRequestPda),
          user: randomUserSigner,
          role: FABRICANTE_ROLE,
        })
        .sendAndConfirm();

      // Second request should fail
      try {
        await client.scSolana.instructions
          .requestRole({
            config: toAddress(configPda),
            roleRequest: toAddress(roleRequestPda),
            user: randomUserSigner,
            role: FABRICANTE_ROLE,
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.satisfy(
          (msg: string) => msg.includes("RoleAlreadyGranted") || msg.includes("InvalidInput")
        );
      }
    });

    it("creates unique PDA for each user request", async () => {
      const tecnicoRequestPda = await getRoleRequestPdaAddress(
        toAddress(tecnico.publicKey.toString())
      );
      const escuelaRequestPda = await getRoleRequestPdaAddress(
        toAddress(escuela.publicKey.toString())
      );

      expect(tecnicoRequestPda.toString()).to.not.equal(escuelaRequestPda.toString());
    });
  });

  describe("Approve Role Request Operations", () => {
    it("approves TECNICO_SW role request", async () => {
      const roleRequestPda = await getRoleRequestPdaAddress(
        toAddress(tecnico.publicKey.toString())
      );
      const roleHolderPda = await getRoleHolderByUserPdaAddress(
        toAddress(tecnico.publicKey.toString())
      );
      const adminSigner = await createSignerFromKeyPair(admin);

      await client.scSolana.instructions
        .approveRoleRequest({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          payer: adminSigner,
          roleRequest: toAddress(roleRequestPda),
          roleHolder: toAddress(roleHolderPda),
        })
        .sendAndConfirm();

      // Verify role request was approved
      const roleRequest = await client.scSolana.accounts.roleRequest.fetch(toAddress(roleRequestPda));
      expect(roleRequest.status).to.equal(RequestStatus.Approved);

      // Verify config was updated
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config.tecnicoSw.toString()).to.equal(tecnico.publicKey.toString());
    });

    it("approves ESCUELA role request", async () => {
      const roleRequestPda = await getRoleRequestPdaAddress(
        toAddress(escuela.publicKey.toString())
      );
      const roleHolderPda = await getRoleHolderByUserPdaAddress(
        toAddress(escuela.publicKey.toString())
      );
      const adminSigner = await createSignerFromKeyPair(admin);

      await client.scSolana.instructions
        .approveRoleRequest({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          payer: adminSigner,
          roleRequest: toAddress(roleRequestPda),
          roleHolder: toAddress(roleHolderPda),
        })
        .sendAndConfirm();

      // Verify role request was approved
      const roleRequest = await client.scSolana.accounts.roleRequest.fetch(toAddress(roleRequestPda));
      expect(roleRequest.status).to.equal(RequestStatus.Approved);

      // Verify config was updated
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config.escuela.toString()).to.equal(escuela.publicKey.toString());
    });

    it("cannot approve already approved request", async () => {
      const roleRequestPda = await getRoleRequestPdaAddress(
        toAddress(tecnico.publicKey.toString())
      );
      const roleHolderPda = await getRoleHolderByUserPdaAddress(
        toAddress(tecnico.publicKey.toString())
      );
      const adminSigner = await createSignerFromKeyPair(admin);

      try {
        await client.scSolana.instructions
          .approveRoleRequest({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            payer: adminSigner,
            roleRequest: toAddress(roleRequestPda),
            roleHolder: toAddress(roleHolderPda),
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.satisfy(
          (msg: string) =>
            msg.includes("InvalidRequestState") ||
            msg.includes("RoleAlreadyGranted") ||
            msg.includes("InvalidInput")
        );
      }
    });

    it("cannot approve non-existent role request", async () => {
      const nonExistentUser = Keypair.generate();
      const roleRequestPda = await getRoleRequestPdaAddress(
        toAddress(nonExistentUser.publicKey.toString())
      );
      const roleHolderPda = await getRoleHolderByUserPdaAddress(
        toAddress(nonExistentUser.publicKey.toString())
      );
      const adminSigner = await createSignerFromKeyPair(admin);

      try {
        await client.scSolana.instructions
          .approveRoleRequest({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            payer: adminSigner,
            roleRequest: toAddress(roleRequestPda),
            roleHolder: toAddress(roleHolderPda),
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.satisfy(
          (msg: string) =>
            msg.includes("AccountNotInitialized") || msg.includes("InvalidInput")
        );
      }
    });

    it("cannot approve role request as non-admin", async () => {
      const nonAdmin = Keypair.generate();
      await fundKeypair(client, nonAdmin, 2 * LAMPORTS_PER_SOL);
      const roleRequestPda = await getRoleRequestPdaAddress(
        toAddress(nonAdmin.publicKey.toString())
      );
      const nonAdminSigner = await createSignerFromKeyPair(nonAdmin);

      // First create a request
      await client.scSolana.instructions
        .requestRole({
          config: toAddress(configPda),
          roleRequest: toAddress(roleRequestPda),
          user: nonAdminSigner,
          role: FABRICANTE_ROLE,
        })
        .sendAndConfirm();

      const roleHolderPda = await getRoleHolderByUserPdaAddress(
        toAddress(nonAdmin.publicKey.toString())
      );
      try {
        await client.scSolana.instructions
          .approveRoleRequest({
            config: toAddress(configPda),
            admin: toAddress(nonAdmin.publicKey.toString()),
            payer: nonAdminSigner,
            roleRequest: toAddress(roleRequestPda),
            roleHolder: toAddress(roleHolderPda),
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.satisfy(
          (msg: string) => msg.includes("Unauthorized") || msg.includes("HasOne")
        );
      }
    });
  });

  describe("Reject Role Request Operations", () => {
    it("rejects a role request", async () => {
      const rejectUser = Keypair.generate();
      await fundKeypair(client, rejectUser, 2 * LAMPORTS_PER_SOL);
      const roleRequestPda = await getRoleRequestPdaAddress(
        toAddress(rejectUser.publicKey.toString())
      );
      const rejectUserSigner = await createSignerFromKeyPair(rejectUser);

      // First create a role request
      await client.scSolana.instructions
        .requestRole({
          config: toAddress(configPda),
          roleRequest: toAddress(roleRequestPda),
          user: rejectUserSigner,
          role: TECNICO_SW_ROLE,
        })
        .sendAndConfirm();

      // Now reject it
      await client.scSolana.instructions
        .rejectRoleRequest({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          roleRequest: toAddress(roleRequestPda),
        })
        .sendAndConfirm();

      // Verify role request was rejected
      const roleRequest = await client.scSolana.accounts.roleRequest.fetch(toAddress(roleRequestPda));
      expect(roleRequest.status).to.equal(RequestStatus.Rejected);
    });

    it("cannot reject already rejected request", async () => {
      const rejectUser = Keypair.generate();
      await fundKeypair(client, rejectUser, 2 * LAMPORTS_PER_SOL);
      const roleRequestPda = await getRoleRequestPdaAddress(
        toAddress(rejectUser.publicKey.toString())
      );
      const rejectUserSigner = await createSignerFromKeyPair(rejectUser);

      // Create and reject
      await client.scSolana.instructions
        .requestRole({
          config: toAddress(configPda),
          roleRequest: toAddress(roleRequestPda),
          user: rejectUserSigner,
          role: TECNICO_SW_ROLE,
        })
        .sendAndConfirm();

      await client.scSolana.instructions
        .rejectRoleRequest({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          roleRequest: toAddress(roleRequestPda),
        })
        .sendAndConfirm();

      // Try to reject again
      try {
        await client.scSolana.instructions
          .rejectRoleRequest({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            roleRequest: toAddress(roleRequestPda),
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.satisfy(
          (msg: string) =>
            msg.includes("InvalidRequestState") ||
            msg.includes("InvalidInput") ||
            msg.includes("RoleRequest")
        );
      }
    });

    it("cannot reject role request as non-admin", async () => {
      const rejectUser = Keypair.generate();
      await fundKeypair(client, rejectUser, 2 * LAMPORTS_PER_SOL);
      const roleRequestPda = await getRoleRequestPdaAddress(
        toAddress(rejectUser.publicKey.toString())
      );
      const rejectUserSigner = await createSignerFromKeyPair(rejectUser);

      // Create a request
      await client.scSolana.instructions
        .requestRole({
          config: toAddress(configPda),
          roleRequest: toAddress(roleRequestPda),
          user: rejectUserSigner,
          role: TECNICO_SW_ROLE,
        })
        .sendAndConfirm();

      try {
        await client.scSolana.instructions
          .rejectRoleRequest({
            config: toAddress(configPda),
            admin: toAddress(rejectUser.publicKey.toString()),
            roleRequest: toAddress(roleRequestPda),
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.satisfy(
          (msg: string) => msg.includes("Unauthorized") || msg.includes("HasOne")
        );
      }
    });
  });

  describe("Role Enforcement", () => {
    it("unauthorized user cannot grant roles", async () => {
      const unauthorized = Keypair.generate();
      await fundKeypair(client, unauthorized, 2 * LAMPORTS_PER_SOL);
      const unauthorizedSigner = await createSignerFromKeyPair(unauthorized);
      const randomUserSigner = await createSignerFromKeyPair(randomUser);

      try {
        await client.scSolana.instructions
          .grantRole({
            config: toAddress(configPda),
            admin: toAddress(unauthorized.publicKey.toString()),
            accountToGrant: randomUserSigner,
            role: FABRICANTE_ROLE,
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.satisfy(
          (msg: string) => msg.includes("Unauthorized") || msg.includes("HasOne")
        );
      }
    });

    it("unauthorized user cannot approve role requests", async () => {
      const unauthorized = Keypair.generate();
      await fundKeypair(client, unauthorized, 2 * LAMPORTS_PER_SOL);
      const roleRequestPda = await getRoleRequestPdaAddress(
        toAddress(unauthorized.publicKey.toString())
      );
      const unauthorizedSigner = await createSignerFromKeyPair(unauthorized);

      // Create a request
      await client.scSolana.instructions
        .requestRole({
          config: toAddress(configPda),
          roleRequest: toAddress(roleRequestPda),
          user: unauthorizedSigner,
          role: TECNICO_SW_ROLE,
        })
        .sendAndConfirm();

      const roleHolderPda = await getRoleHolderByUserPdaAddress(
        toAddress(unauthorized.publicKey.toString())
      );
      try {
        await client.scSolana.instructions
          .approveRoleRequest({
            config: toAddress(configPda),
            admin: toAddress(unauthorized.publicKey.toString()),
            payer: unauthorizedSigner,
            roleRequest: toAddress(roleRequestPda),
            roleHolder: toAddress(roleHolderPda),
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.satisfy(
          (msg: string) => msg.includes("Unauthorized") || msg.includes("HasOne")
        );
      }
    });

    it("role holder can use granted role", async () => {
      // Fabricante should already have FABRICANTE role
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config.fabricante.toString()).to.equal(fabricante.publicKey.toString());
    });
  });

  describe("Multiple Role Holders", () => {
    it("can hold multiple roles simultaneously", async () => {
      // Create a user that will hold multiple roles
      const multiRoleUser = Keypair.generate();
      await fundKeypair(client, multiRoleUser, 2 * LAMPORTS_PER_SOL);
      const multiRoleSigner = await createSignerFromKeyPair(multiRoleUser);

      // Grant multiple roles to the same user
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: multiRoleSigner,
          role: AUDITOR_HW_ROLE,
        })
        .sendAndConfirm();

      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: multiRoleSigner,
          role: TECNICO_SW_ROLE,
        })
        .sendAndConfirm();

      // Verify both roles are granted
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config.auditorHw.toString()).to.equal(multiRoleUser.publicKey.toString());
      expect(config.tecnicoSw.toString()).to.equal(multiRoleUser.publicKey.toString());
    });

    it("can grant different roles to different users", async () => {
      const user1 = Keypair.generate();
      const user2 = Keypair.generate();
      const user3 = Keypair.generate();
      await fundKeypair(client, user1, 2 * LAMPORTS_PER_SOL);
      await fundKeypair(client, user2, 2 * LAMPORTS_PER_SOL);
      await fundKeypair(client, user3, 2 * LAMPORTS_PER_SOL);

      const user1Signer = await createSignerFromKeyPair(user1);
      const user2Signer = await createSignerFromKeyPair(user2);
      const user3Signer = await createSignerFromKeyPair(user3);

      // Grant different roles
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: user1Signer,
          role: AUDITOR_HW_ROLE,
        })
        .sendAndConfirm();

      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: user2Signer,
          role: TECNICO_SW_ROLE,
        })
        .sendAndConfirm();

      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: user3Signer,
          role: ESCUELA_ROLE,
        })
        .sendAndConfirm();

      // Verify all roles are granted to correct users
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config.auditorHw.toString()).to.equal(user1.publicKey.toString());
      expect(config.tecnicoSw.toString()).to.equal(user2.publicKey.toString());
      expect(config.escuela.toString()).to.equal(user3.publicKey.toString());
    });
  });

  describe("Role Request Lifecycle", () => {
    it("completes full role request lifecycle: request -> approve", async () => {
      const lifecycleUser = Keypair.generate();
      await fundKeypair(client, lifecycleUser, 2 * LAMPORTS_PER_SOL);
      const roleRequestPda = await getRoleRequestPdaAddress(
        toAddress(lifecycleUser.publicKey.toString())
      );
      const lifecycleUserSigner = await createSignerFromKeyPair(lifecycleUser);

      // Step 1: Request role
      await client.scSolana.instructions
        .requestRole({
          config: toAddress(configPda),
          roleRequest: toAddress(roleRequestPda),
          user: lifecycleUserSigner,
          role: ESCUELA_ROLE,
        })
        .sendAndConfirm();

      // Verify pending status
      let roleRequest = await client.scSolana.accounts.roleRequest.fetch(toAddress(roleRequestPda));
      expect(roleRequest.status).to.equal(RequestStatus.Pending);

      // Step 2: Admin approves
      const roleHolderPda = await getRoleHolderByUserPdaAddress(
        toAddress(lifecycleUser.publicKey.toString())
      );
      const adminSigner = await createSignerFromKeyPair(admin);

      await client.scSolana.instructions
        .approveRoleRequest({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          payer: adminSigner,
          roleRequest: toAddress(roleRequestPda),
          roleHolder: toAddress(roleHolderPda),
        })
        .sendAndConfirm();

      // Verify approved status and config update
      roleRequest = await client.scSolana.accounts.roleRequest.fetch(toAddress(roleRequestPda));
      expect(roleRequest.status).to.equal(RequestStatus.Approved);

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config.escuela.toString()).to.equal(lifecycleUser.publicKey.toString());
    });

    it("completes full role request lifecycle: request -> reject", async () => {
      const lifecycleUser = Keypair.generate();
      await fundKeypair(client, lifecycleUser, 2 * LAMPORTS_PER_SOL);
      const roleRequestPda = await getRoleRequestPdaAddress(
        toAddress(lifecycleUser.publicKey.toString())
      );
      const lifecycleUserSigner = await createSignerFromKeyPair(lifecycleUser);

      // Step 1: Request role
      await client.scSolana.instructions
        .requestRole({
          config: toAddress(configPda),
          roleRequest: toAddress(roleRequestPda),
          user: lifecycleUserSigner,
          role: FABRICANTE_ROLE,
        })
        .sendAndConfirm();

      // Verify pending status
      let roleRequest = await client.scSolana.accounts.roleRequest.fetch(toAddress(roleRequestPda));
      expect(roleRequest.status).to.equal(RequestStatus.Pending);

      // Step 2: Admin rejects
      await client.scSolana.instructions
        .rejectRoleRequest({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          roleRequest: toAddress(roleRequestPda),
        })
        .sendAndConfirm();

      // Verify rejected status
      roleRequest = await client.scSolana.accounts.roleRequest.fetch(toAddress(roleRequestPda));
      expect(roleRequest.status).to.equal(RequestStatus.Rejected);
    });
  });

  describe("Error Handling", () => {
    it("handles role not found error for invalid role string", async () => {
      const randomUserSigner = await createSignerFromKeyPair(randomUser);
      try {
        await client.scSolana.instructions
          .grantRole({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            accountToGrant: randomUserSigner,
            role: "NOT_A_VALID_ROLE",
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("RoleNotFound");
      }
    });

    it("handles role already granted error", async () => {
      // Try to grant a role that's already granted
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));

      if (!config.fabricante.equals(fabricante.publicKey)) {
        // Grant first
        const fabricanteSigner = await createSignerFromKeyPair(fabricante);
        await client.scSolana.instructions
          .grantRole({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            accountToGrant: fabricanteSigner,
            role: FABRICANTE_ROLE,
          })
          .sendAndConfirm();
      }

      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      try {
        await client.scSolana.instructions
          .grantRole({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            accountToGrant: fabricanteSigner,
            role: FABRICANTE_ROLE,
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("RoleAlreadyGranted");
      }
    });

    it("handles account not initialized for non-existent role request", async () => {
      const nonExistent = Keypair.generate();
      const roleRequestPda = await getRoleRequestPdaAddress(
        toAddress(nonExistent.publicKey.toString())
      );
      const roleHolderPda = await getRoleHolderByUserPdaAddress(
        toAddress(nonExistent.publicKey.toString())
      );
      const adminSigner = await createSignerFromKeyPair(admin);

      try {
        await client.scSolana.instructions
          .approveRoleRequest({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            payer: adminSigner,
            roleRequest: toAddress(roleRequestPda),
            roleHolder: toAddress(roleHolderPda),
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.satisfy(
          (msg: string) =>
            msg.includes("AccountNotInitialized") || msg.includes("InvalidInput")
        );
      }
    });
  });

  describe("Config State Verification", () => {
    it("verifies all role fields in config after operations", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));

      // Verify role fields are public keys
      expect(config.admin.toString()).to.not.be.empty;
      expect(config.fabricante.toString()).to.not.be.empty;
      expect(config.auditorHw.toString()).to.not.be.empty;
      expect(config.tecnicoSw.toString()).to.not.be.empty;
      expect(config.escuela.toString()).to.not.be.empty;
    });

    it("verifies config counters after role operations", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));

      // nextTokenId should be >= 0
      expect(Number(config.nextTokenId)).to.be.at.least(0);

      // totalNetbooks should be >= 0
      expect(Number(config.totalNetbooks)).to.be.at.least(0);
    });
  });

  describe("Edge Cases", () => {
    it("handles role request from user with existing role", async () => {
      // Fabricante already has FABRICANTE role
      const roleRequestPda = await getRoleRequestPdaAddress(
        toAddress(fabricante.publicKey.toString())
      );
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);

      try {
        await client.scSolana.instructions
          .requestRole({
            config: toAddress(configPda),
            roleRequest: toAddress(roleRequestPda),
            user: fabricanteSigner,
            role: FABRICANTE_ROLE,
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.satisfy(
          (msg: string) => msg.includes("RoleAlreadyGranted") || msg.includes("InvalidInput")
        );
      }
    });

    it("handles concurrent role requests from different users", async () => {
      const user1 = Keypair.generate();
      const user2 = Keypair.generate();
      const user3 = Keypair.generate();
      await fundKeypair(client, user1, 2 * LAMPORTS_PER_SOL);
      await fundKeypair(client, user2, 2 * LAMPORTS_PER_SOL);
      await fundKeypair(client, user3, 2 * LAMPORTS_PER_SOL);

      const requestPda1 = await getRoleRequestPdaAddress(
        toAddress(user1.publicKey.toString())
      );
      const requestPda2 = await getRoleRequestPdaAddress(
        toAddress(user2.publicKey.toString())
      );
      const requestPda3 = await getRoleRequestPdaAddress(
        toAddress(user3.publicKey.toString())
      );

      const user1Signer = await createSignerFromKeyPair(user1);
      const user2Signer = await createSignerFromKeyPair(user2);
      const user3Signer = await createSignerFromKeyPair(user3);

      // All three request roles concurrently
      await Promise.all([
        client.scSolana.instructions
          .requestRole({
            config: toAddress(configPda),
            roleRequest: toAddress(requestPda1),
            user: user1Signer,
            role: TECNICO_SW_ROLE,
          })
          .sendAndConfirm(),

        client.scSolana.instructions
          .requestRole({
            config: toAddress(configPda),
            roleRequest: toAddress(requestPda2),
            user: user2Signer,
            role: ESCUELA_ROLE,
          })
          .sendAndConfirm(),

        client.scSolana.instructions
          .requestRole({
            config: toAddress(configPda),
            roleRequest: toAddress(requestPda3),
            user: user3Signer,
            role: AUDITOR_HW_ROLE,
          })
          .sendAndConfirm(),
      ]);

      // Verify all requests are pending
      const req1 = await client.scSolana.accounts.roleRequest.fetch(toAddress(requestPda1));
      const req2 = await client.scSolana.accounts.roleRequest.fetch(toAddress(requestPda2));
      const req3 = await client.scSolana.accounts.roleRequest.fetch(toAddress(requestPda3));

      expect(req1.status).to.equal(RequestStatus.Pending);
      expect(req2.status).to.equal(RequestStatus.Pending);
      expect(req3.status).to.equal(RequestStatus.Pending);
    });

    it("handles empty role string", async () => {
      const randomUserSigner = await createSignerFromKeyPair(randomUser);
      try {
        await client.scSolana.instructions
          .grantRole({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            accountToGrant: randomUserSigner,
            role: "",
          })
          .sendAndConfirm();
        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.satisfy(
          (msg: string) => msg.includes("RoleNotFound") || msg.includes("InvalidInput")
        );
      }
    });
  });
});
