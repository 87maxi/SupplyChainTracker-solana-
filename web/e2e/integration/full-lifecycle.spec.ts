/**
 * Full Supply Chain Lifecycle Integration Tests
 *
 * Tests the complete netbook lifecycle against a real Solana test validator:
 * register → audit → validate → assign
 *
 * These tests use the IntegrationService to perform actual blockchain
 * transactions, verifying on-chain state changes at each step.
 *
 * Requirements:
 * - Solana test validator running (solana-test-validator)
 * - Program deployed to test validator
 * - NEXT_PUBLIC_RPC_URL env var set (default: http://localhost:8899)
 */

import { expect } from "@playwright/test";
import { test } from "../fixtures/validator-fixtures";
import { NetbookState, ROLE_TYPES } from "../services/integration-service";

test.describe("Full Supply Chain Lifecycle Integration", () => {
  test.describe("Netbook Lifecycle", () => {
    test("complete lifecycle: register → audit → validate → assign", async ({ integration }) => {
      // Initialize blockchain
      await integration.initialize();
      await integration.grantAllRoles();

      const serial = integration.generateUniqueSerial("NB");
      const batch = integration.createBatchId();
      const specs = integration.createModelSpecs();

      // Step 1: Register netbook
      const registerTx = await integration.registerNetbook(serial, batch, specs);
      expect(registerTx).toBeTruthy();
      expect(registerTx.length).toBeGreaterThan(0);

      // Verify registered state
      let netbook = await integration.getNetbookBySerial(serial);
      expect(netbook).toBeTruthy();
      expect(netbook!.state).toBe(NetbookState.Fabricada);
      expect(netbook!.serialNumber).toBe(serial);
      expect(netbook!.batchId).toBe(batch);

      // Step 2: Hardware Audit
      const auditTx = await integration.auditHardware(serial, true);
      expect(auditTx).toBeTruthy();

      netbook = await integration.getNetbookBySerial(serial);
      expect(netbook!.state).toBe(NetbookState.HwAprobado);
      expect(netbook!.hwIntegrityPassed).toBe(true);

      // Step 3: Software Validation
      const validateTx = await integration.validateSoftware(serial, "Ubuntu 22.04 LTS", true);
      expect(validateTx).toBeTruthy();

      netbook = await integration.getNetbookBySerial(serial);
      expect(netbook!.state).toBe(NetbookState.SwValidado);
      expect(netbook!.swValidationPassed).toBe(true);
      expect(netbook!.osVersion).toBe("Ubuntu 22.04 LTS");

      // Step 4: Assign to Student
      const assignTx = await integration.assignToStudent(serial);
      expect(assignTx).toBeTruthy();

      netbook = await integration.getNetbookBySerial(serial);
      expect(netbook!.state).toBe(NetbookState.Distribuida);
    });

    test("executeFullLifecycle helper completes all steps", async ({ integration }) => {
      await integration.initialize();
      await integration.grantAllRoles();

      const serial = integration.generateUniqueSerial("FULL");
      const result = await integration.executeFullLifecycle(serial);

      expect(result.register).toBeTruthy();
      expect(result.audit).toBeTruthy();
      expect(result.validate).toBeTruthy();
      expect(result.assign).toBeTruthy();
      expect(result.netbook.state).toBe(NetbookState.Distribuida);
      expect(result.netbook.serialNumber).toBe(serial);
    });

    test("batch registration creates multiple netbooks", async ({ integration }) => {
      await integration.initialize();
      await integration.grantAllRoles();

      const serials = [
        integration.generateUniqueSerial("BATCH"),
        integration.generateUniqueSerial("BATCH"),
        integration.generateUniqueSerial("BATCH"),
      ];
      const batches = serials.map(() => integration.createBatchId());
      const specs = serials.map(() => integration.createModelSpecs());

      const tx = await integration.registerNetbooksBatch(serials, batches, specs);
      expect(tx).toBeTruthy();

      // Verify all netbooks exist
      for (const serial of serials) {
        const netbook = await integration.getNetbookBySerial(serial);
        expect(netbook).toBeTruthy();
        expect(netbook!.state).toBe(NetbookState.Fabricada);
      }
    });
  });

  test.describe("State Machine Transitions", () => {
    test("cannot audit before registration", async ({ integration }) => {
      await integration.initialize();
      await integration.grantAllRoles();

      const serial = integration.generateUniqueSerial("NOEXIST");
      await expect(
        integration.auditHardware(serial, true)
      ).rejects.toThrow();
    });

    test("state progresses correctly through lifecycle", async ({ integration }) => {
      await integration.initialize();
      await integration.grantAllRoles();

      const serial = integration.generateUniqueSerial("STATE");

      // Register
      await integration.registerNetbook(serial, integration.createBatchId(), integration.createModelSpecs());
      let netbook = await integration.getNetbookBySerial(serial);
      expect(netbook!.state).toBe(NetbookState.Fabricada);

      // Audit → HwAprobado
      await integration.auditHardware(serial, true);
      netbook = await integration.getNetbookBySerial(serial);
      expect(netbook!.state).toBe(NetbookState.HwAprobado);

      // Validate → SwValidado
      await integration.validateSoftware(serial, "Ubuntu 22.04 LTS", true);
      netbook = await integration.getNetbookBySerial(serial);
      expect(netbook!.state).toBe(NetbookState.SwValidado);

      // Assign → Distribuida
      await integration.assignToStudent(serial);
      netbook = await integration.getNetbookBySerial(serial);
      expect(netbook!.state).toBe(NetbookState.Distribuida);
    });
  });

  test.describe("Role-Based Access Control", () => {
    test("roles are properly granted", async ({ integration }) => {
      await integration.initialize();
      await integration.grantAllRoles();

      expect(await integration.hasRole(ROLE_TYPES.FABRICANTE, integration.accounts.fabricante.publicKey)).toBe(true);
      expect(await integration.hasRole(ROLE_TYPES.AUDITOR_HW, integration.accounts.auditorHw.publicKey)).toBe(true);
      expect(await integration.hasRole(ROLE_TYPES.TECNICO_SW, integration.accounts.tecnicoSw.publicKey)).toBe(true);
      expect(await integration.hasRole(ROLE_TYPES.ESCUELA, integration.accounts.escuela.publicKey)).toBe(true);
    });

    test("random user has no roles by default", async ({ integration }) => {
      await integration.initialize();
      await integration.grantAllRoles();

      expect(await integration.hasRole(ROLE_TYPES.FABRICANTE, integration.accounts.randomUser.publicKey)).toBe(false);
      expect(await integration.hasRole(ROLE_TYPES.AUDITOR_HW, integration.accounts.randomUser.publicKey)).toBe(false);
    });

    test("can revoke roles", async ({ integration }) => {
      await integration.initialize();
      await integration.grantAllRoles();

      expect(await integration.hasRole(ROLE_TYPES.FABRICANTE, integration.accounts.fabricante.publicKey)).toBe(true);

      await integration.revokeRole(ROLE_TYPES.FABRICANTE, integration.accounts.fabricante.publicKey);

      expect(await integration.hasRole(ROLE_TYPES.FABRICANTE, integration.accounts.fabricante.publicKey)).toBe(false);
    });
  });

  test.describe("Blockchain State Verification", () => {
    test("config account is properly initialized", async ({ integration }) => {
      await integration.initialize();

      const config = await integration.getConfig();
      expect(config).toBeTruthy();
      expect(config.nextTokenId).toBeTruthy();
    });

    test("accounts are funded with SOL", async ({ integration }) => {
      await integration.initialize();

      const balance = await integration.getBalance(integration.accounts.payer.publicKey);
      expect(balance).toBeGreaterThan(0);

      const fabBalance = await integration.getBalance(integration.accounts.fabricante.publicKey);
      expect(fabBalance).toBeGreaterThan(0);
    });

    test("transaction signatures are valid format", async ({ integration }) => {
      await integration.initialize();
      await integration.grantAllRoles();

      const serial = integration.generateUniqueSerial("TX");
      const tx = await integration.registerNetbook(serial, integration.createBatchId(), integration.createModelSpecs());

      // Solana signatures are base58 encoded, 88 characters
      expect(tx.length).toBe(88);
      expect(/^[1-9A-HJ-NP-Za-km-z]+$/.test(tx)).toBe(true);
    });
  });

  test.describe("Duplicate Detection", () => {
    test("cannot register duplicate serial numbers", async ({ integration }) => {
      await integration.initialize();
      await integration.grantAllRoles();

      const serial = integration.generateUniqueSerial("DUP");
      const batch = integration.createBatchId();
      const specs = integration.createModelSpecs();

      // First registration succeeds
      await integration.registerNetbook(serial, batch, specs);

      // Second registration with same serial should fail
      await expect(
        integration.registerNetbook(serial, batch, specs)
      ).rejects.toThrow();
    });
  });

  test.describe("Hash Utilities", () => {
    test("createHash generates 32-byte arrays", async ({ integration }) => {
      const hash = integration.createHash(42);
      expect(hash.length).toBe(32);
      expect(hash.every(v => v >= 0 && v <= 255)).toBe(true);
    });

    test("createStringHash generates deterministic hashes", async ({ integration }) => {
      const hash1 = integration.createStringHash("test");
      const hash2 = integration.createStringHash("test");
      const hash3 = integration.createStringHash("different");

      expect(hash1).toEqual(hash2);
      expect(hash1).not.toEqual(hash3);
      expect(hash1.length).toBe(32);
    });
  });
});
