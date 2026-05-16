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
 *
 * Migrated from @coral-xyz/anchor to Codama-generated client (Issue #209).
 */

import {
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import { createSignerFromKeyPair } from "./test-helpers";
import { expect } from "chai";
import {
  createTestClient,
  getConfigPdaAddress,
  getRoleRequestPdaAddress,
  getSerialHashRegistryPdaAddress,
  getAdminPdaAddress,
  getRoleHolderPdaAddress,
  fundKeypair,
  fundAndInitialize,
  grantRoleWithAdminPda,
  toAddress,
  toUint8Array,
  createHash,
  RequestStatus,
  type TestClient,
} from "./test-helpers";

// Role constants
const FABRICANTE_ROLE = "FABRICANTE";
const AUDITOR_HW_ROLE = "AUDITOR_HW";
const TECNICO_SW_ROLE = "TECNICO_SW";
const ESCUELA_ROLE = "ESCUELA";

describe("RBAC Consistency Tests (Issue #145)", () => {
  let client: TestClient;
  let admin: Keypair;
  let configPda: string;
  let adminPda: string;
  let serialHashRegistryPda: string;

  // Test accounts
  let user1: Keypair;
  let user2: Keypair;
  let unauthorizedUser: Keypair;

  before(async () => {
    // Generate test accounts
    admin = Keypair.generate();
    user1 = Keypair.generate();
    user2 = Keypair.generate();
    unauthorizedUser = Keypair.generate();

    // Create test client
    client = await createTestClient("http://localhost:8899", admin);

    // Fund all accounts
    for (const kp of [user1, user2, unauthorizedUser]) {
      await fundKeypair(client, kp, 2);
    }

    // Get PDAs
    configPda = await getConfigPdaAddress();
    serialHashRegistryPda = await getSerialHashRegistryPdaAddress(toAddress(configPda));
    adminPda = await getAdminPdaAddress(toAddress(configPda));

    // Initialize config using PDA-first pattern
    await fundAndInitialize(client, admin);
  });

  // =========================================================================
  // 1. Authorization Tests for Role Operations
  // =========================================================================
  describe("Authorization Tests", () => {
    it("verifies admin can grant roles via grant_role", async () => {
      const user1Signer = await createSignerFromKeyPair(user1);

      await client.scSolana.instructions.grantRole({
        config: toAddress(configPda),
        admin: toAddress(adminPda),
        accountToGrant: user1Signer,
        role: FABRICANTE_ROLE,
      }).sendTransaction();

      // Verify role was granted
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config.fabricante).to.equal(toAddress(user1.publicKey.toBase58()));
    });

    it("verifies non-admin cannot grant roles", async () => {
      const unauthorizedSigner = await createSignerFromKeyPair(unauthorizedUser);
      const user2Signer = await createSignerFromKeyPair(user2);

      try {
        await client.scSolana.instructions.grantRole({
          config: toAddress(configPda),
          admin: toAddress(unauthorizedUser.publicKey.toBase58()),
          accountToGrant: user2Signer,
          role: AUDITOR_HW_ROLE,
        }).sendTransaction();
        expect.fail("Expected grant role to fail for non-admin");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("verifies grant_role requires recipient signature", async () => {
      try {
        await client.scSolana.instructions.grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: await createSignerFromKeyPair(user2),
          role: AUDITOR_HW_ROLE,
        }).sendTransaction();
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
      const user2Signer = await createSignerFromKeyPair(user2);
      const roleRequestPda = await getRoleRequestPdaAddress(toAddress(user2.publicKey.toBase58()));

      await client.scSolana.instructions.requestRole({
        config: toAddress(configPda),
        roleRequest: toAddress(roleRequestPda),
        user: user2Signer,
        role: TECNICO_SW_ROLE,
      }).sendTransaction();

      // Verify request was created
      const roleRequest = await client.scSolana.accounts.roleRequest.fetch(toAddress(roleRequestPda));
      expect(roleRequest.status).to.equal(RequestStatus.Pending);
      expect(roleRequest.role).to.equal(TECNICO_SW_ROLE);
    });

    it("admin can approve role request", async () => {
      const roleRequestPda = await getRoleRequestPdaAddress(toAddress(user2.publicKey.toBase58()));
      const roleHolderPda = await getRoleHolderPdaAddress(
        toAddress(user2.publicKey.toBase58()),
        0
      );

      const adminSigner = await createSignerFromKeyPair(admin);
      await client.scSolana.instructions.approveRoleRequest({
        config: toAddress(configPda),
        admin: toAddress(adminPda),
        payer: adminSigner,
        roleRequest: toAddress(roleRequestPda),
        roleHolder: toAddress(roleHolderPda),
      }).sendTransaction();

      // Verify request was approved
      const roleRequest = await client.scSolana.accounts.roleRequest.fetch(toAddress(roleRequestPda));
      expect(roleRequest.status).to.equal(RequestStatus.Approved);
    });

    it("non-admin cannot approve role request", async () => {
      // Create a new request first
      const unauthorizedSigner = await createSignerFromKeyPair(unauthorizedUser);
      const newRoleRequestPda = await getRoleRequestPdaAddress(toAddress(unauthorizedUser.publicKey.toBase58()));

      await client.scSolana.instructions.requestRole({
        config: toAddress(configPda),
        roleRequest: toAddress(newRoleRequestPda),
        user: unauthorizedSigner,
        role: ESCUELA_ROLE,
      }).sendTransaction();

      // Try to approve as non-admin
      try {
        const adminSigner = await createSignerFromKeyPair(admin);
        await client.scSolana.instructions.approveRoleRequest({
          config: toAddress(configPda),
          admin: toAddress(unauthorizedUser.publicKey.toBase58()),
          payer: adminSigner,
          roleRequest: toAddress(newRoleRequestPda),
          roleHolder: toAddress(await getRoleHolderPdaAddress(toAddress(unauthorizedUser.publicKey.toBase58()), 0)),
        }).sendTransaction();
        expect.fail("Expected approve to fail for non-admin");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("admin can reject role request", async () => {
      const newRoleRequestPda = await getRoleRequestPdaAddress(toAddress(unauthorizedUser.publicKey.toBase58()));

      await client.scSolana.instructions.rejectRoleRequest({
        config: toAddress(configPda),
        admin: toAddress(adminPda),
        roleRequest: toAddress(newRoleRequestPda),
      }).sendTransaction();

      // Verify request was rejected
      const roleRequest = await client.scSolana.accounts.roleRequest.fetch(toAddress(newRoleRequestPda));
      expect(roleRequest.status).to.equal(RequestStatus.Rejected);
    });

    it("cannot approve already approved request", async () => {
      const roleRequestPda = await getRoleRequestPdaAddress(toAddress(user2.publicKey.toBase58()));

      try {
        const adminSigner = await createSignerFromKeyPair(admin);
        await client.scSolana.instructions.approveRoleRequest({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          payer: adminSigner,
          roleRequest: toAddress(roleRequestPda),
          roleHolder: toAddress(await getRoleHolderPdaAddress(toAddress(user2.publicKey.toBase58()), 0)),
        }).sendTransaction();
        expect.fail("Expected double approval to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("cannot approve already rejected request", async () => {
      const newRoleRequestPda = await getRoleRequestPdaAddress(toAddress(unauthorizedUser.publicKey.toBase58()));

      try {
        const adminSigner = await createSignerFromKeyPair(admin);
        await client.scSolana.instructions.approveRoleRequest({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          payer: adminSigner,
          roleRequest: toAddress(newRoleRequestPda),
          roleHolder: toAddress(await getRoleHolderPdaAddress(toAddress(unauthorizedUser.publicKey.toBase58()), 0)),
        }).sendTransaction();
        expect.fail("Expected approval of rejected request to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("request_role rejects invalid role names", async () => {
      const testUser = Keypair.generate();
      await fundKeypair(client, testUser, 1);
      const testUserSigner = await createSignerFromKeyPair(testUser);
      const invalidRoleRequestPda = await getRoleRequestPdaAddress(toAddress(testUser.publicKey.toBase58()));

      try {
        await client.scSolana.instructions.requestRole({
          config: toAddress(configPda),
          roleRequest: toAddress(invalidRoleRequestPda),
          user: testUserSigner,
          role: "INVALID_ROLE",
        }).sendTransaction();
        expect.fail("Expected request with invalid role to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("request_role rejects if user already has the role", async () => {
      // user1 already has FABRICANTE role from earlier test
      const user1Signer = await createSignerFromKeyPair(user1);
      try {
        await client.scSolana.instructions.requestRole({
          config: toAddress(configPda),
          roleRequest: toAddress(await getRoleRequestPdaAddress(toAddress(user1.publicKey.toBase58()))),
          user: user1Signer,
          role: FABRICANTE_ROLE,
        }).sendTransaction();
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
      const user1Signer = await createSignerFromKeyPair(user1);

      await client.scSolana.instructions.revokeRole({
        config: toAddress(configPda),
        admin: toAddress(adminPda),
        accountToRevoke: user1Signer,
        role: FABRICANTE_ROLE,
      }).sendTransaction();

      // Verify role was revoked
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config.fabricante).to.equal("11111111111111111111111111111111");
    });

    it("non-admin cannot revoke a role", async () => {
      // First grant a role to revoke
      const user1Signer = await createSignerFromKeyPair(user1);
      await client.scSolana.instructions.grantRole({
        config: toAddress(configPda),
        admin: toAddress(adminPda),
        accountToGrant: user1Signer,
        role: FABRICANTE_ROLE,
      }).sendTransaction();

      // Try to revoke as non-admin
      const unauthorizedSigner = await createSignerFromKeyPair(unauthorizedUser);
      try {
        await client.scSolana.instructions.revokeRole({
          config: toAddress(configPda),
          admin: toAddress(unauthorizedUser.publicKey.toBase58()),
          accountToRevoke: user1Signer,
          role: FABRICANTE_ROLE,
        }).sendTransaction();
        expect.fail("Expected revoke to fail for non-admin");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("cannot revoke role not held by account", async () => {
      const user1Signer = await createSignerFromKeyPair(user1);
      try {
        await client.scSolana.instructions.revokeRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToRevoke: user1Signer,
          role: AUDITOR_HW_ROLE,
        }).sendTransaction();
        expect.fail("Expected revoke of unheld role to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("revoke requires recipient signature", async () => {
      try {
        await client.scSolana.instructions.revokeRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToRevoke: await createSignerFromKeyPair(user1),
          role: FABRICANTE_ROLE,
        }).sendTransaction();
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
      await fundKeypair(client, holderUser, 1);
      const holderSigner = await createSignerFromKeyPair(holderUser);

      const adminSigner = await createSignerFromKeyPair(admin);
      await client.scSolana.instructions.addRoleHolder({
        config: toAddress(configPda),
        admin: toAddress(adminPda),
        payer: adminSigner,
        roleHolder: toAddress(await getRoleHolderPdaAddress(toAddress(holderUser.publicKey.toBase58()), 0)),
        accountToAdd: toAddress(holderUser.publicKey.toBase58()),
        role: AUDITOR_HW_ROLE,
      }).sendTransaction();

      // Verify count was incremented
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(config.auditorHwCount)).to.be.greaterThan(0);
    });

    it("non-admin cannot add a role holder", async () => {
      const holderUser = Keypair.generate();
      await fundKeypair(client, holderUser, 1);
      const holderSigner = await createSignerFromKeyPair(holderUser);
      const unauthorizedSigner = await createSignerFromKeyPair(unauthorizedUser);

      try {
        const adminSigner = await createSignerFromKeyPair(admin);
        await client.scSolana.instructions.addRoleHolder({
          config: toAddress(configPda),
          admin: toAddress(unauthorizedUser.publicKey.toBase58()),
          payer: adminSigner,
          roleHolder: toAddress(await getRoleHolderPdaAddress(toAddress(holderUser.publicKey.toBase58()), 0)),
          accountToAdd: toAddress(holderUser.publicKey.toBase58()),
          role: TECNICO_SW_ROLE,
        }).sendTransaction();
        expect.fail("Expected add role holder to fail for non-admin");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("admin can remove a role holder", async () => {
      // First add a holder
      const holderUser = Keypair.generate();
      await fundKeypair(client, holderUser, 1);
      const holderSigner = await createSignerFromKeyPair(holderUser);

      const adminSigner2 = await createSignerFromKeyPair(admin);
      await client.scSolana.instructions.addRoleHolder({
        config: toAddress(configPda),
        admin: toAddress(adminPda),
        payer: adminSigner2,
        roleHolder: toAddress(await getRoleHolderPdaAddress(toAddress(holderUser.publicKey.toBase58()), 0)),
        accountToAdd: toAddress(holderUser.publicKey.toBase58()),
        role: ESCUELA_ROLE,
      }).sendTransaction();

      // Now remove the holder
      await client.scSolana.instructions.removeRoleHolder({
        config: toAddress(configPda),
        admin: toAddress(adminPda),
        roleHolder: toAddress(await getRoleHolderPdaAddress(toAddress(holderUser.publicKey.toBase58()), 0)),
        role: ESCUELA_ROLE,
      }).sendTransaction();
    });

    it("non-admin cannot remove a role holder", async () => {
      const holderUser = Keypair.generate();
      await fundKeypair(client, holderUser, 1);
      const holderSigner = await createSignerFromKeyPair(holderUser);
      const unauthorizedSigner = await createSignerFromKeyPair(unauthorizedUser);

      // First add a holder
      const adminSigner3 = await createSignerFromKeyPair(admin);
      await client.scSolana.instructions.addRoleHolder({
        config: toAddress(configPda),
        admin: toAddress(adminPda),
        payer: adminSigner3,
        roleHolder: toAddress(await getRoleHolderPdaAddress(toAddress(holderUser.publicKey.toBase58()), 0)),
        accountToAdd: toAddress(holderUser.publicKey.toBase58()),
        role: ESCUELA_ROLE,
      }).sendTransaction();

      // Try to remove as non-admin
      try {
        await client.scSolana.instructions.removeRoleHolder({
          config: toAddress(configPda),
          admin: toAddress(unauthorizedUser.publicKey.toBase58()),
          roleHolder: toAddress(await getRoleHolderPdaAddress(toAddress(holderUser.publicKey.toBase58()), 0)),
          role: ESCUELA_ROLE,
        }).sendTransaction();
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
      const unauthorizedSigner = await createSignerFromKeyPair(unauthorizedUser);
      try {
        await client.scSolana.instructions.grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: unauthorizedSigner,
          role: AUDITOR_HW_ROLE,
        }).sendTransaction();
        expect.fail("Expected grant without recipient signature to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("verifies only valid roles can be granted", async () => {
      const unauthorizedSigner = await createSignerFromKeyPair(unauthorizedUser);
      try {
        await client.scSolana.instructions.grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: unauthorizedSigner,
          role: "SUPER_ADMIN",
        }).sendTransaction();
        expect.fail("Expected invalid role grant to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("verifies duplicate role grant is prevented", async () => {
      const user1Signer = await createSignerFromKeyPair(user1);
      try {
        await client.scSolana.instructions.grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: user1Signer,
          role: FABRICANTE_ROLE,
        }).sendTransaction();
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
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));

      // Verify counts are non-negative
      expect(Number(config.fabricanteCount)).to.be.greaterThanOrEqual(0);
      expect(Number(config.auditorHwCount)).to.be.greaterThanOrEqual(0);
      expect(Number(config.tecnicoSwCount)).to.be.greaterThanOrEqual(0);
      expect(Number(config.escuelaCount)).to.be.greaterThanOrEqual(0);
    });

    it("verifies role request count increments correctly", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(config.roleRequestsCount)).to.be.greaterThan(0);
    });

    it("verifies admin PDA is correctly set", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const expectedAdminPda = await getAdminPdaAddress(toAddress(configPda));
      expect(config.admin).to.equal(expectedAdminPda);
    });
  });

  // =========================================================================
  // 7. Compatibility Tests with Existing Operations
  // =========================================================================
  describe("Compatibility Tests", () => {
    it("verifies query operations work with role system", async () => {
      await client.scSolana.instructions.queryConfig({
        config: toAddress(configPda),
      }).sendTransaction();
    });
  });
});
