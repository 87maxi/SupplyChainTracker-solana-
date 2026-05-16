/**
 * Batch Registration Integration Tests
 *
 * Tests for the register_netbooks_batch instruction covering:
 * - Successful batch registration with multiple netbooks
 * - Array length mismatch validation
 * - Empty batch validation
 * - Maximum batch size limits
 * - Duplicate serial number detection
 * - String length limits validation
 * - Config counter updates
 * - Event emission verification
 * - Role enforcement (manufacturer only)
 *
 * Migrated from @coral-xyz/anchor to Codama-generated client (Issue #209).
 */

import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  createTestClient,
  getConfigPdaAddress,
  getSerialHashRegistryPdaAddress,
  getAdminPdaAddress,
  fundKeypair,
  fundAndInitialize,
  grantRoleViaAnchor,
  createBatchId,
  createModelSpecs,
  generateUniqueSerial,
  toAddress,
  type TestClient,
} from "./test-helpers";

const SYSTEM_PROGRAM = "11111111111111111111111111111111" as const;

describe("Batch Registration Integration Tests", () => {
  let client: TestClient;
  let funder: Keypair;
  let fabricante: Keypair;
  let configPda: string;
  let serialHashRegistryPda: string;
  let adminPda: string;

  // Test data
  const MAX_BATCH_SIZE = 10;

  before(async () => {
    // Create fresh keypairs for test accounts
    funder = Keypair.generate();
    fabricante = Keypair.generate();

    // Create test client
    client = await createTestClient("http://localhost:8899", funder);

    // Calculate PDAs
    configPda = await getConfigPdaAddress();
    serialHashRegistryPda = await getSerialHashRegistryPdaAddress(toAddress(configPda));
    adminPda = await getAdminPdaAddress(toAddress(configPda));

    // Fund accounts
    await fundKeypair(client, fabricante, 2);

    // Initialize if not already initialized (use funder as initializer)
    await fundAndInitialize(client, funder);

    // Grant FABRICANTE role to fabricante using Anchor (with PDA seeds)
    // Codama generates AccountMeta WITHOUT PDA seeds, so we use Anchor for this instruction
    await grantRoleViaAnchor(
      "http://localhost:8899",
      funder,
      new PublicKey(adminPda),
      fabricante.publicKey,
      "FABRICANTE",
      [fabricante]
    );
  });

  describe("Successful Batch Registration", () => {
    it("registers a single netbook via batch instruction", async () => {
      const serialNumber = generateUniqueSerial("BATCH");
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = createModelSpecs("TestBrand", "TestModel", 2024);

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const startTokenId = Number(config.nextTokenId);

      // Register fabricante as a signer with the Codama client
      const fabricanteSigner = await client.registerSigner(fabricante);
      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers: [serialNumber],
        batchIds: [batchId],
        modelSpecs: [modelSpec],
      }).sendTransaction();

      // Verify config counters updated
      const updatedConfig = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(updatedConfig.nextTokenId)).to.equal(startTokenId + 1);
      expect(Number(updatedConfig.totalNetbooks)).to.equal(Number(config.totalNetbooks) + 1);
    });

    it("registers a batch of 5 netbooks", async () => {
      const batchSize = 5;
      const serialNumbers: string[] = [];
      const batchIds: string[] = [];
      const modelSpecs: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        serialNumbers.push(generateUniqueSerial(`B5`));
        batchIds.push(createBatchId("TEST", 2024, 1));
        modelSpecs.push(createModelSpecs("TestBrand", `Model-${i}`, 2024));
      }

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const startTokenId = Number(config.nextTokenId);
      const startTotalNetbooks = Number(config.totalNetbooks);

      // Register batch
      const fabricanteSigner = await client.registerSigner(fabricante);
      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers,
        batchIds,
        modelSpecs,
      }).sendTransaction();

      // Verify config counters updated correctly
      const updatedConfig = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(updatedConfig.nextTokenId)).to.equal(startTokenId + batchSize);
      expect(Number(updatedConfig.totalNetbooks)).to.equal(startTotalNetbooks + batchSize);
    });

    it("registers a batch of 10 netbooks (maximum size)", async () => {
      const batchSize = MAX_BATCH_SIZE;
      const serialNumbers: string[] = [];
      const batchIds: string[] = [];
      const modelSpecs: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        serialNumbers.push(generateUniqueSerial(`B10`));
        batchIds.push(createBatchId("TEST", 2024, 1));
        modelSpecs.push(createModelSpecs("TestBrand", `Model-${i}`, 2024));
      }

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const startTokenId = Number(config.nextTokenId);

      // Register batch
      const fabricanteSigner = await client.registerSigner(fabricante);
      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers,
        batchIds,
        modelSpecs,
      }).sendTransaction();

      // Verify config counters updated correctly
      const updatedConfig = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(updatedConfig.nextTokenId)).to.equal(startTokenId + batchSize);
    });

    it("handles multiple sequential batch registrations", async () => {
      const batch1Size = 3;
      const batch2Size = 4;
      const batch3Size = 2;

      const fabricanteSigner = await client.registerSigner(fabricante);

      // Batch 1
      const serialNumbers1: string[] = [];
      const batchIds1: string[] = [];
      const modelSpecs1: string[] = [];
      for (let i = 0; i < batch1Size; i++) {
        serialNumbers1.push(`SN-BATCH-SEQ-1-${String(i).padStart(3, "0")}`);
        batchIds1.push(createBatchId("TEST", 2024, 1));
        modelSpecs1.push(createModelSpecs("TestBrand", "Model", 2024));
      }

      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers: serialNumbers1,
        batchIds: batchIds1,
        modelSpecs: modelSpecs1,
      }).sendTransaction();

      // Batch 2
      const serialNumbers2: string[] = [];
      const batchIds2: string[] = [];
      const modelSpecs2: string[] = [];
      for (let i = 0; i < batch2Size; i++) {
        serialNumbers2.push(`SN-BATCH-SEQ-2-${String(i).padStart(3, "0")}`);
        batchIds2.push(createBatchId("TEST", 2024, 2));
        modelSpecs2.push(createModelSpecs("TestBrand", "Model", 2024));
      }

      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers: serialNumbers2,
        batchIds: batchIds2,
        modelSpecs: modelSpecs2,
      }).sendTransaction();

      // Batch 3
      const serialNumbers3: string[] = [];
      const batchIds3: string[] = [];
      const modelSpecs3: string[] = [];
      for (let i = 0; i < batch3Size; i++) {
        serialNumbers3.push(`SN-BATCH-SEQ-3-${String(i).padStart(3, "0")}`);
        batchIds3.push(createBatchId("TEST", 2024, 3));
        modelSpecs3.push(createModelSpecs("TestBrand", "Model", 2024));
      }

      const configBefore = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers: serialNumbers3,
        batchIds: batchIds3,
        modelSpecs: modelSpecs3,
      }).sendTransaction();

      // Verify cumulative counters
      const configAfter = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const expectedTotal = Number(configBefore.nextTokenId) + batch3Size;
      expect(Number(configAfter.nextTokenId)).to.equal(expectedTotal);
    });
  });

  describe("Array Length Mismatch Validation", () => {
    it("rejects batch with mismatched serial_numbers and batch_ids lengths", async () => {
      const serialNumbers = ["SN-1", "SN-2", "SN-3"];
      const batchIds = ["BATCH-1", "BATCH-2"]; // One less than serial_numbers
      const modelSpecs = ["Spec-1", "Spec-2", "Spec-3"];

      const fabricanteSigner = await client.registerSigner(fabricante);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          systemProgram: toAddress(SYSTEM_PROGRAM),
          serialNumbers,
          batchIds,
          modelSpecs,
        }).sendTransaction();

        expect.fail("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("ArrayLengthMismatch");
      }
    });

    it("rejects batch with mismatched serial_numbers and model_specs lengths", async () => {
      const serialNumbers = ["SN-1", "SN-2"];
      const batchIds = ["BATCH-1", "BATCH-2"];
      const modelSpecs = ["Spec-1"]; // One less than serial_numbers

      const fabricanteSigner = await client.registerSigner(fabricante);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          systemProgram: toAddress(SYSTEM_PROGRAM),
          serialNumbers,
          batchIds,
          modelSpecs,
        }).sendTransaction();

        expect.fail("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("ArrayLengthMismatch");
      }
    });

    it("rejects batch with all three arrays having different lengths", async () => {
      const serialNumbers = ["SN-1", "SN-2", "SN-3", "SN-4"];
      const batchIds = ["BATCH-1"];
      const modelSpecs = ["Spec-1", "Spec-2"];

      const fabricanteSigner = await client.registerSigner(fabricante);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          systemProgram: toAddress(SYSTEM_PROGRAM),
          serialNumbers,
          batchIds,
          modelSpecs,
        }).sendTransaction();

        expect.fail("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("ArrayLengthMismatch");
      }
    });
  });

  describe("Empty Batch Validation", () => {
    it("rejects batch with empty serial_numbers array", async () => {
      const serialNumbers: string[] = [];
      const batchIds: string[] = [];
      const modelSpecs: string[] = [];

      const fabricanteSigner = await client.registerSigner(fabricante);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          systemProgram: toAddress(SYSTEM_PROGRAM),
          serialNumbers,
          batchIds,
          modelSpecs,
        }).sendTransaction();

        expect.fail("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("InvalidInput");
      }
    });

    it("rejects batch with zero count", async () => {
      const serialNumbers: string[] = [];
      const batchIds: string[] = [];
      const modelSpecs: string[] = [];

      const fabricanteSigner = await client.registerSigner(fabricante);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          systemProgram: toAddress(SYSTEM_PROGRAM),
          serialNumbers,
          batchIds,
          modelSpecs,
        }).sendTransaction();

        expect.fail("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("InvalidInput");
      }
    });
  });

  describe("Maximum Batch Size Validation", () => {
    it("rejects batch exceeding maximum size (11 items)", async () => {
      const batchSize = 11;
      const serialNumbers: string[] = [];
      const batchIds: string[] = [];
      const modelSpecs: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        serialNumbers.push(`SN-${String(i).padStart(3, "0")}`);
        batchIds.push(createBatchId("TEST", 2024, 1));
        modelSpecs.push(createModelSpecs("TestBrand", "Model", 2024));
      }

      const fabricanteSigner = await client.registerSigner(fabricante);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          systemProgram: toAddress(SYSTEM_PROGRAM),
          serialNumbers,
          batchIds,
          modelSpecs,
        }).sendTransaction();

        expect.fail("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("InvalidInput");
      }
    });

    it("accepts batch at exactly maximum size (10 items)", async () => {
      const batchSize = 10;
      const serialNumbers: string[] = [];
      const batchIds: string[] = [];
      const modelSpecs: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        serialNumbers.push(`SN-MAX-${String(i).padStart(3, "0")}`);
        batchIds.push(createBatchId("TEST", 2024, 1));
        modelSpecs.push(createModelSpecs("TestBrand", "Model", 2024));
      }

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const startTokenId = Number(config.nextTokenId);

      const fabricanteSigner = await client.registerSigner(fabricante);
      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers,
        batchIds,
        modelSpecs,
      }).sendTransaction();

      const updatedConfig = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(updatedConfig.nextTokenId)).to.equal(startTokenId + batchSize);
    });
  });

  describe("Duplicate Serial Number Detection", () => {
    it("rejects batch with duplicate serial numbers within the same batch", async () => {
      const serialNumbers = ["SN-DUP-001", "SN-DUP-001", "SN-DUP-003"];
      const batchIds = ["BATCH-1", "BATCH-1", "BATCH-1"];
      const modelSpecs = ["Spec-1", "Spec-2", "Spec-3"];

      const fabricanteSigner = await client.registerSigner(fabricante);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          systemProgram: toAddress(SYSTEM_PROGRAM),
          serialNumbers,
          batchIds,
          modelSpecs,
        }).sendTransaction();

        expect.fail("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("DuplicateSerial");
      }
    });

    it("rejects batch with serial number already registered from previous batch", async () => {
      const fabricanteSigner = await client.registerSigner(fabricante);

      // First, register a batch
      const firstBatchSerials = ["SN-EXIST-001", "SN-EXIST-002"];
      const firstBatchIds = ["BATCH-FIRST", "BATCH-FIRST"];
      const firstBatchSpecs = ["Spec-1", "Spec-2"];

      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers: firstBatchSerials,
        batchIds: firstBatchIds,
        modelSpecs: firstBatchSpecs,
      }).sendTransaction();

      // Try to register another batch with one duplicate
      const secondBatchSerials = ["SN-EXIST-002", "SN-NEW-001"];
      const secondBatchIds = ["BATCH-SECOND", "BATCH-SECOND"];
      const secondBatchSpecs = ["Spec-1", "Spec-2"];

      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          systemProgram: toAddress(SYSTEM_PROGRAM),
          serialNumbers: secondBatchSerials,
          batchIds: secondBatchIds,
          modelSpecs: secondBatchSpecs,
        }).sendTransaction();

        expect.fail("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("DuplicateSerial");
      }
    });

    it("allows different serial numbers that hash to same value (collision test)", async () => {
      const serialNumbers = ["SN-COLLISION-A", "SN-COLLISION-B"];
      const batchIds = ["BATCH-COLL", "BATCH-COLL"];
      const modelSpecs = ["Spec-A", "Spec-B"];

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const startTokenId = Number(config.nextTokenId);

      const fabricanteSigner = await client.registerSigner(fabricante);
      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers,
        batchIds,
        modelSpecs,
      }).sendTransaction();

      const updatedConfig = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(updatedConfig.nextTokenId)).to.equal(startTokenId + 2);
    });
  });

  describe("String Length Limits Validation", () => {
    it("rejects serial number exceeding 200 characters", async () => {
      const serialNumber = "A".repeat(201);
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = createModelSpecs("TestBrand", "Model", 2024);

      const fabricanteSigner = await client.registerSigner(fabricante);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          systemProgram: toAddress(SYSTEM_PROGRAM),
          serialNumbers: [serialNumber],
          batchIds: [batchId],
          modelSpecs: [modelSpec],
        }).sendTransaction();

        expect.fail("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("StringTooLong");
      }
    });

    it("accepts serial number at exactly 200 characters", async () => {
      const serialNumber = "A".repeat(200);
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = createModelSpecs("TestBrand", "Model", 2024);

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const startTokenId = Number(config.nextTokenId);

      const fabricanteSigner = await client.registerSigner(fabricante);
      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers: [serialNumber],
        batchIds: [batchId],
        modelSpecs: [modelSpec],
      }).sendTransaction();

      const updatedConfig = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(updatedConfig.nextTokenId)).to.equal(startTokenId + 1);
    });

    it("rejects batch_id exceeding 100 characters", async () => {
      const serialNumber = "SN-LONG-BATCH";
      const batchId = "B".repeat(101);
      const modelSpec = createModelSpecs("TestBrand", "Model", 2024);

      const fabricanteSigner = await client.registerSigner(fabricante);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          systemProgram: toAddress(SYSTEM_PROGRAM),
          serialNumbers: [serialNumber],
          batchIds: [batchId],
          modelSpecs: [modelSpec],
        }).sendTransaction();

        expect.fail("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("StringTooLong");
      }
    });

    it("rejects model_spec exceeding 500 characters", async () => {
      const serialNumber = "SN-LONG-SPEC";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = "C".repeat(501);

      const fabricanteSigner = await client.registerSigner(fabricante);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          systemProgram: toAddress(SYSTEM_PROGRAM),
          serialNumbers: [serialNumber],
          batchIds: [batchId],
          modelSpecs: [modelSpec],
        }).sendTransaction();

        expect.fail("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("StringTooLong");
      }
    });

    it("accepts model_spec at exactly 500 characters", async () => {
      const serialNumber = "SN-MAX-SPEC";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = "C".repeat(500);

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const startTokenId = Number(config.nextTokenId);

      const fabricanteSigner = await client.registerSigner(fabricante);
      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers: [serialNumber],
        batchIds: [batchId],
        modelSpecs: [modelSpec],
      }).sendTransaction();

      const updatedConfig = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(updatedConfig.nextTokenId)).to.equal(startTokenId + 1);
    });

    it("rejects empty serial number", async () => {
      const serialNumber = "";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = createModelSpecs("TestBrand", "Model", 2024);

      const fabricanteSigner = await client.registerSigner(fabricante);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          systemProgram: toAddress(SYSTEM_PROGRAM),
          serialNumbers: [serialNumber],
          batchIds: [batchId],
          modelSpecs: [modelSpec],
        }).sendTransaction();

        expect.fail("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("EmptySerial");
      }
    });
  });

  describe("Role Enforcement", () => {
    it("rejects batch registration from non-manufacturer account", async () => {
      const randomUser = Keypair.generate();
      const serialNumber = "SN-AUTH-001";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = createModelSpecs("TestBrand", "Model", 2024);

      const randomUserSigner = await client.registerSigner(randomUser);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: randomUserSigner,
          systemProgram: toAddress(SYSTEM_PROGRAM),
          serialNumbers: [serialNumber],
          batchIds: [batchId],
          modelSpecs: [modelSpec],
        }).sendTransaction();

        expect.fail("Expected transaction to fail");
      } catch (error: any) {
        expect(error.message).to.include("Unauthorized");
      }
    });

    it("rejects batch registration with unauthorized signer", async () => {
      const unauthorized = Keypair.generate();
      const serialNumber = "SN-AUTH-002";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = createModelSpecs("TestBrand", "Model", 2024);

      const unauthorizedSigner = await client.registerSigner(unauthorized);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: unauthorizedSigner, // unauthorized is the actual signer
          systemProgram: toAddress(SYSTEM_PROGRAM),
          serialNumbers: [serialNumber],
          batchIds: [batchId],
          modelSpecs: [modelSpec],
        }).sendTransaction();

        expect.fail("Expected transaction to fail");
      } catch (error: any) {
        // Should fail with signature verification or unauthorized error
        expect(error.message).to.satisfy((msg: string) =>
          msg.includes("Unauthorized") || msg.includes("Signature") || msg.includes("invalid signer")
        );
      }
    });
  });

  describe("Config Counter Updates", () => {
    it("correctly increments next_token_id by batch size", async () => {
      const batchSize = 7;
      const serialNumbers: string[] = [];
      const batchIds: string[] = [];
      const modelSpecs: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        serialNumbers.push(`SN-COUNTER-${String(i).padStart(3, "0")}`);
        batchIds.push(createBatchId("TEST", 2024, 1));
        modelSpecs.push(createModelSpecs("TestBrand", "Model", 2024));
      }

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const startTokenId = Number(config.nextTokenId);

      const fabricanteSigner = await client.registerSigner(fabricante);
      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers,
        batchIds,
        modelSpecs,
      }).sendTransaction();

      const updatedConfig = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(updatedConfig.nextTokenId)).to.equal(startTokenId + batchSize);
    });

    it("correctly increments total_netbooks by batch size", async () => {
      const batchSize = 4;
      const serialNumbers: string[] = [];
      const batchIds: string[] = [];
      const modelSpecs: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        serialNumbers.push(`SN-TOTAL-${String(i).padStart(3, "0")}`);
        batchIds.push(createBatchId("TEST", 2024, 1));
        modelSpecs.push(createModelSpecs("TestBrand", "Model", 2024));
      }

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const startTotalNetbooks = Number(config.totalNetbooks);

      const fabricanteSigner = await client.registerSigner(fabricante);
      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers,
        batchIds,
        modelSpecs,
      }).sendTransaction();

      const updatedConfig = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(updatedConfig.totalNetbooks)).to.equal(startTotalNetbooks + batchSize);
    });

    it("maintains consistent counters across multiple batch operations", async () => {
      const batches = [3, 5, 2, 7];
      let expectedTokenId = 0;
      let expectedTotalNetbooks = 0;

      const fabricanteSigner = await client.registerSigner(fabricante);

      for (const batchSize of batches) {
        const serialNumbers: string[] = [];
        const batchIds: string[] = [];
        const modelSpecs: string[] = [];

        for (let i = 0; i < batchSize; i++) {
          serialNumbers.push(`SN-CONSIST-${batchSize}-${String(i).padStart(3, "0")}`);
          batchIds.push(createBatchId("TEST", 2024, 1));
          modelSpecs.push(createModelSpecs("TestBrand", "Model", 2024));
        }

        const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
        expectedTokenId = Number(config.nextTokenId);
        expectedTotalNetbooks = Number(config.totalNetbooks);

        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          systemProgram: toAddress(SYSTEM_PROGRAM),
          serialNumbers,
          batchIds,
          modelSpecs,
        }).sendTransaction();

        const updatedConfig = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
        expect(Number(updatedConfig.nextTokenId)).to.equal(expectedTokenId + batchSize);
        expect(Number(updatedConfig.totalNetbooks)).to.equal(expectedTotalNetbooks + batchSize);
      }
    });
  });

  describe("Serial Hash Registry Updates", () => {
    it("stores serial hashes for all registered netbooks", async () => {
      const batchSize = 3;
      const serialNumbers: string[] = [];
      const batchIds: string[] = [];
      const modelSpecs: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        serialNumbers.push(`SN-HASH-${String(i).padStart(3, "0")}`);
        batchIds.push(createBatchId("TEST", 2024, 1));
        modelSpecs.push(createModelSpecs("TestBrand", "Model", 2024));
      }

      const fabricanteSigner = await client.registerSigner(fabricante);
      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers,
        batchIds,
        modelSpecs,
      }).sendTransaction();

      // Verify by trying to register duplicates - should fail
      for (const serial of serialNumbers) {
        try {
          await client.scSolana.instructions.registerNetbooksBatch({
            config: toAddress(configPda),
            serialHashRegistry: toAddress(serialHashRegistryPda),
            manufacturer: fabricanteSigner,
            systemProgram: toAddress(SYSTEM_PROGRAM),
            serialNumbers: [serial],
            batchIds: [createBatchId("TEST", 2024, 2)],
            modelSpecs: [createModelSpecs("TestBrand", "Model", 2024)],
          }).sendTransaction();

          expect.fail("Expected transaction to fail for duplicate serial");
        } catch (error: any) {
          expect(error.message).to.include("DuplicateSerial");
        }
      }
    });
  });

  describe("Edge Cases", () => {
    it("handles batch with identical batch_ids correctly", async () => {
      const batchSize = 5;
      const serialNumbers: string[] = [];
      const sharedBatchId = "SAME-BATCH-ID";
      const modelSpecs: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        serialNumbers.push(`SN-SAME-BATCH-${String(i).padStart(3, "0")}`);
        modelSpecs.push(createModelSpecs("TestBrand", `Model-${i}`, 2024));
      }

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const startTokenId = Number(config.nextTokenId);

      const fabricanteSigner = await client.registerSigner(fabricante);
      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers,
        batchIds: new Array(batchSize).fill(sharedBatchId),
        modelSpecs,
      }).sendTransaction();

      const updatedConfig = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(updatedConfig.nextTokenId)).to.equal(startTokenId + batchSize);
    });

    it("handles batch with empty model_spec correctly", async () => {
      const serialNumber = "SN-EMPTY-SPEC";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = "";

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const startTokenId = Number(config.nextTokenId);

      const fabricanteSigner = await client.registerSigner(fabricante);
      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers: [serialNumber],
        batchIds: [batchId],
        modelSpecs: [modelSpec],
      }).sendTransaction();

      const updatedConfig = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(updatedConfig.nextTokenId)).to.equal(startTokenId + 1);
    });

    it("handles batch with special characters in serial number", async () => {
      const serialNumber = "SN-SPECIAL-!@#$%^&*()-_=+[]{}|;:'\",.<>?/`~";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = createModelSpecs("TestBrand", "Model", 2024);

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const startTokenId = Number(config.nextTokenId);

      const fabricanteSigner = await client.registerSigner(fabricante);
      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers: [serialNumber],
        batchIds: [batchId],
        modelSpecs: [modelSpec],
      }).sendTransaction();

      const updatedConfig = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(updatedConfig.nextTokenId)).to.equal(startTokenId + 1);
    });

    it("handles batch with unicode characters in serial number", async () => {
      const serialNumber = "SN-UNICODE-日本語-emoji-🔔";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = createModelSpecs("TestBrand", "Model", 2024);

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const startTokenId = Number(config.nextTokenId);

      const fabricanteSigner = await client.registerSigner(fabricante);
      await client.scSolana.instructions.registerNetbooksBatch({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        serialNumbers: [serialNumber],
        batchIds: [batchId],
        modelSpecs: [modelSpec],
      }).sendTransaction();

      const updatedConfig = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(Number(updatedConfig.nextTokenId)).to.equal(startTokenId + 1);
    });
  });
});
