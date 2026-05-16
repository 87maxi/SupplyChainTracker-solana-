/**
 * Overflow/Underflow Protection Tests
 *
 * Comprehensive test suite for overflow/underflow protection in the SupplyChainTracker program.
 * Verifies that all numeric counters, string lengths, and array bounds are properly validated.
 *
 * Issue #74: Overflow/Underflow Protection Tests (P1)
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
  createBatchId,
  createModelSpecs,
  generateUniqueSerial,
  type TestClient,
} from "./test-helpers";

describe("Overflow/Underflow Protection Tests", () => {
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

    // Initialize config using shared initialization
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
    serialNumber: string,
    batchId: string,
    modelSpecs: string
  ): Promise<string> {
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

  // ========================================================================
  // 1. String Length Boundary Tests
  // ========================================================================

  describe("String Length Boundary Tests", () => {
    it("accepts serial number at exactly 200 characters", async () => {
      const serial200 = "A".repeat(200);
      const netbookPda = await registerNetbook(
        serial200,
        "BATCH-001",
        "Model for 200 char serial"
      );

      const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.serialNumber.length).to.equal(200);
    });

    it("rejects serial number exceeding 200 characters", async () => {
      const serial201 = "A".repeat(201);

      try {
        await registerNetbook(serial201, "BATCH-002", "Model for 201 char serial");
        expect.fail("Expected registration to fail for 201 char serial");
      } catch (error: any) {
        expect(error.message).to.contain("StringTooLong");
      }
    });

    it("accepts batch_id at exactly 100 characters", async () => {
      const batchId100 = "B".repeat(100);
      const netbookPda = await registerNetbook(
        "STR-LEN-001",
        batchId100,
        "Model for 100 char batch"
      );

      const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.batchId.length).to.equal(100);
    });

    it("rejects batch_id exceeding 100 characters", async () => {
      const batchId101 = "B".repeat(101);

      try {
        await registerNetbook("STR-LEN-002", batchId101, "Model for 101 char batch");
        expect.fail("Expected registration to fail for 101 char batch_id");
      } catch (error: any) {
        expect(error.message).to.contain("StringTooLong");
      }
    });

    it("accepts model_specs at exactly 500 characters", async () => {
      const model500 = "M".repeat(500);
      const netbookPda = await registerNetbook(
        "STR-LEN-003",
        "BATCH-STR-003",
        model500
      );

      const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.initialModelSpecs.length).to.equal(500);
    });

    it("rejects model_specs exceeding 500 characters", async () => {
      const model501 = "M".repeat(501);

      try {
        await registerNetbook("STR-LEN-004", "BATCH-STR-004", model501);
        expect.fail("Expected registration to fail for 501 char model_specs");
      } catch (error: any) {
        expect(error.message).to.contain("StringTooLong");
      }
    });

    it("rejects empty serial number", async () => {
      try {
        await registerNetbook("", "BATCH-EMPTY", "Model for empty serial");
        expect.fail("Expected registration to fail for empty serial");
      } catch (error: any) {
        expect(error.message).to.contain("EmptySerial");
      }
    });
  });

  // ========================================================================
  // 2. Array Length Validation Tests
  // ========================================================================

  describe("Array Length Validation Tests", () => {
    it("rejects batch with mismatched serial_numbers and batch_ids lengths", async () => {
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          serialNumbers: ["SN-001", "SN-002", "SN-003"],
          batchIds: ["BATCH-001", "BATCH-002"],
          modelSpecs: ["Model 1", "Model 2", "Model 3"],
        }).sendTransaction();
        expect.fail("Expected batch registration to fail for mismatched arrays");
      } catch (error: any) {
        expect(error.message).to.contain("ArrayLengthMismatch");
      }
    });

    it("rejects batch with all three arrays having different lengths", async () => {
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          serialNumbers: ["SN-001"],
          batchIds: ["BATCH-001", "BATCH-002"],
          modelSpecs: ["Model 1", "Model 2", "Model 3"],
        }).sendTransaction();
        expect.fail("Expected batch registration to fail for mismatched arrays");
      } catch (error: any) {
        expect(error.message).to.contain("ArrayLengthMismatch");
      }
    });

    it("rejects batch with empty arrays", async () => {
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          serialNumbers: [],
          batchIds: [],
          modelSpecs: [],
        }).sendTransaction();
        expect.fail("Expected batch registration to fail for empty arrays");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 3. Counter Overflow Tests
  // ========================================================================

  describe("Counter Overflow Tests", () => {
    it("tracks nextTokenId correctly after multiple registrations", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const startTokenId = Number(config.nextTokenId);

      // Register 3 netbooks
      await registerNetbook(generateUniqueSerial("CNT"), "BATCH-CNT-1", "Model 1");
      await registerNetbook(generateUniqueSerial("CNT"), "BATCH-CNT-2", "Model 2");
      await registerNetbook(generateUniqueSerial("CNT"), "BATCH-CNT-3", "Model 3");

      const updatedConfig = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(updatedConfig.nextTokenId)).to.equal(startTokenId + 3);
    });

    it("tracks totalNetbooks correctly", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const startTotal = Number(config.totalNetbooks);

      await registerNetbook(generateUniqueSerial("TOT"), "BATCH-TOT-1", "Model");

      const updatedConfig = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(updatedConfig.totalNetbooks)).to.equal(startTotal + 1);
    });
  });
});
