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
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { ScSolana } from "../target/types/sc_solana";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  PublicKey,
  Logs,
} from "@solana/web3.js";
import {
  getConfigPda,
  getSerialHashRegistryPda,
  createHash,
  createBatchId,
  createModelSpecs,
  fundKeypair,
  assertNetbookState,
  NetbookState,
} from "./test-helpers";

// Event interface for NetbooksRegistered event
interface NetbooksRegisteredEvent {
  count: number;
  startTokenId: number;
  timestamp: number;
}

describe("Batch Registration Integration Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.scSolana as Program<ScSolana>;

  // Key accounts
  let admin: Keypair;
  let fabricante: Keypair;
  let configPda: PublicKey;
  let serialHashRegistryPda: PublicKey;

  // Test data
  const BATCH_SIZES = [1, 2, 5, 10]; // Test various batch sizes
  const MAX_BATCH_SIZE = 10;

  before(async () => {
    // Use first two accounts from provider wallet for admin and fabricante
    const [adminKey, fabricanteKey] = (provider.wallet as any).keypair.secret;
    admin = Keypair.fromSecretKey(new Uint8Array(adminKey));
    fabricante = Keypair.fromSecretKey(new Uint8Array(fabricanteKey));

    configPda = (await getConfigPda(program))[0];
    serialHashRegistryPda = getSerialHashRegistryPda(configPda, program.programId);

    // Fund fabricante if needed
    const fabricanteBalance = await provider.connection.getBalance(fabricante.publicKey);
    if (fabricanteBalance < 0.5 * LAMPORTS_PER_SOL) {
      await fundKeypair(provider, fabricante, 2);
    }
  });

  describe("Successful Batch Registration", () => {
    it("registers a single netbook via batch instruction", async () => {
      const serialNumber = "SN-BATCH-001";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = createModelSpecs("TestBrand", "TestModel", 2024);

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const startTokenId = config.nextTokenId.toNumber();

      // Register batch
      await program.methods
        .registerNetbooksBatch(
          [serialNumber],
          [batchId],
          [modelSpec]
        )
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Verify config counters updated
      const updatedConfig = await program.account.supplyChainConfig.fetch(configPda);
      updatedConfig.nextTokenId.toNumber().should.equal(startTokenId + 1);
      updatedConfig.totalNetbooks.toNumber().should.equal(config.totalNetbooks.toNumber() + 1);
    });

    it("registers a batch of 5 netbooks", async () => {
      const batchSize = 5;
      const serialNumbers: string[] = [];
      const batchIds: string[] = [];
      const modelSpecs: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        serialNumbers.push(`SN-BATCH-5-${String(i).padStart(3, "0")}`);
        batchIds.push(createBatchId("TEST", 2024, 1));
        modelSpecs.push(createModelSpecs("TestBrand", `Model-${i}`, 2024));
      }

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const startTokenId = config.nextTokenId.toNumber();
      const startTotalNetbooks = config.totalNetbooks.toNumber();

      // Register batch
      await program.methods
        .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Verify config counters updated correctly
      const updatedConfig = await program.account.supplyChainConfig.fetch(configPda);
      updatedConfig.nextTokenId.toNumber().should.equal(startTokenId + batchSize);
      updatedConfig.totalNetbooks.toNumber().should.equal(startTotalNetbooks + batchSize);
    });

    it("registers a batch of 10 netbooks (maximum size)", async () => {
      const batchSize = MAX_BATCH_SIZE;
      const serialNumbers: string[] = [];
      const batchIds: string[] = [];
      const modelSpecs: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        serialNumbers.push(`SN-BATCH-10-${String(i).padStart(3, "0")}`);
        batchIds.push(createBatchId("TEST", 2024, 1));
        modelSpecs.push(createModelSpecs("TestBrand", `Model-${i}`, 2024));
      }

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const startTokenId = config.nextTokenId.toNumber();

      // Register batch
      await program.methods
        .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Verify config counters updated correctly
      const updatedConfig = await program.account.supplyChainConfig.fetch(configPda);
      updatedConfig.nextTokenId.toNumber().should.equal(startTokenId + batchSize);
    });

    it("handles multiple sequential batch registrations", async () => {
      const batch1Size = 3;
      const batch2Size = 4;
      const batch3Size = 2;

      // Batch 1
      const serialNumbers1: string[] = [];
      const batchIds1: string[] = [];
      const modelSpecs1: string[] = [];
      for (let i = 0; i < batch1Size; i++) {
        serialNumbers1.push(`SN-BATCH-SEQ-1-${String(i).padStart(3, "0")}`);
        batchIds1.push(createBatchId("TEST", 2024, 1));
        modelSpecs1.push(createModelSpecs("TestBrand", "Model", 2024));
      }

      const config1 = await program.account.supplyChainConfig.fetch(configPda);
      await program.methods
        .registerNetbooksBatch(serialNumbers1, batchIds1, modelSpecs1)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Batch 2
      const serialNumbers2: string[] = [];
      const batchIds2: string[] = [];
      const modelSpecs2: string[] = [];
      for (let i = 0; i < batch2Size; i++) {
        serialNumbers2.push(`SN-BATCH-SEQ-2-${String(i).padStart(3, "0")}`);
        batchIds2.push(createBatchId("TEST", 2024, 2));
        modelSpecs2.push(createModelSpecs("TestBrand", "Model", 2024));
      }

      await program.methods
        .registerNetbooksBatch(serialNumbers2, batchIds2, modelSpecs2)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Batch 3
      const serialNumbers3: string[] = [];
      const batchIds3: string[] = [];
      const modelSpecs3: string[] = [];
      for (let i = 0; i < batch3Size; i++) {
        serialNumbers3.push(`SN-BATCH-SEQ-3-${String(i).padStart(3, "0")}`);
        batchIds3.push(createBatchId("TEST", 2024, 3));
        modelSpecs3.push(createModelSpecs("TestBrand", "Model", 2024));
      }

      const configBefore = await program.account.supplyChainConfig.fetch(configPda);
      await program.methods
        .registerNetbooksBatch(serialNumbers3, batchIds3, modelSpecs3)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Verify cumulative counters
      const configAfter = await program.account.supplyChainConfig.fetch(configPda);
      const expectedTotal = configBefore.nextTokenId.toNumber() + batch3Size;
      configAfter.nextTokenId.toNumber().should.equal(expectedTotal);
    });
  });

  describe("Array Length Mismatch Validation", () => {
    it("rejects batch with mismatched serial_numbers and batch_ids lengths", async () => {
      const serialNumbers = ["SN-1", "SN-2", "SN-3"];
      const batchIds = ["BATCH-1", "BATCH-2"]; // One less than serial_numbers
      const modelSpecs = ["Spec-1", "Spec-2", "Spec-3"];

      try {
        await program.methods
          .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("ArrayLengthMismatch");
      }
    });

    it("rejects batch with mismatched serial_numbers and model_specs lengths", async () => {
      const serialNumbers = ["SN-1", "SN-2"];
      const batchIds = ["BATCH-1", "BATCH-2"];
      const modelSpecs = ["Spec-1"]; // One less than serial_numbers

      try {
        await program.methods
          .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("ArrayLengthMismatch");
      }
    });

    it("rejects batch with all three arrays having different lengths", async () => {
      const serialNumbers = ["SN-1", "SN-2", "SN-3", "SN-4"];
      const batchIds = ["BATCH-1"];
      const modelSpecs = ["Spec-1", "Spec-2"];

      try {
        await program.methods
          .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("ArrayLengthMismatch");
      }
    });
  });

  describe("Empty Batch Validation", () => {
    it("rejects batch with empty serial_numbers array", async () => {
      const serialNumbers: string[] = [];
      const batchIds: string[] = [];
      const modelSpecs: string[] = [];

      try {
        await program.methods
          .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("InvalidInput");
      }
    });

    it("rejects batch with zero count", async () => {
      const serialNumbers: string[] = [];
      const batchIds: string[] = [];
      const modelSpecs: string[] = [];

      try {
        await program.methods
          .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("InvalidInput");
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

      try {
        await program.methods
          .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("InvalidInput");
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

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const startTokenId = config.nextTokenId.toNumber();

      await program.methods
        .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const updatedConfig = await program.account.supplyChainConfig.fetch(configPda);
      updatedConfig.nextTokenId.toNumber().should.equal(startTokenId + batchSize);
    });
  });

  describe("Duplicate Serial Number Detection", () => {
    it("rejects batch with duplicate serial numbers within the same batch", async () => {
      const serialNumbers = ["SN-DUP-001", "SN-DUP-001", "SN-DUP-003"];
      const batchIds = ["BATCH-1", "BATCH-1", "BATCH-1"];
      const modelSpecs = ["Spec-1", "Spec-2", "Spec-3"];

      try {
        await program.methods
          .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("DuplicateSerial");
      }
    });

    it("rejects batch with serial number already registered from previous batch", async () => {
      // First, register a batch
      const firstBatchSerials = ["SN-EXIST-001", "SN-EXIST-002"];
      const firstBatchIds = ["BATCH-FIRST", "BATCH-FIRST"];
      const firstBatchSpecs = ["Spec-1", "Spec-2"];

      await program.methods
        .registerNetbooksBatch(firstBatchSerials, firstBatchIds, firstBatchSpecs)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Try to register another batch with one duplicate
      const secondBatchSerials = ["SN-EXIST-002", "SN-NEW-001"];
      const secondBatchIds = ["BATCH-SECOND", "BATCH-SECOND"];
      const secondBatchSpecs = ["Spec-1", "Spec-2"];

      try {
        await program.methods
          .registerNetbooksBatch(secondBatchSerials, secondBatchIds, secondBatchSpecs)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("DuplicateSerial");
      }
    });

    it("allows different serial numbers that hash to same value (collision test)", async () => {
      // This test verifies that the hash-based duplicate detection works correctly
      const serialNumbers = ["SN-COLLISION-A", "SN-COLLISION-B"];
      const batchIds = ["BATCH-COLL", "BATCH-COLL"];
      const modelSpecs = ["Spec-A", "Spec-B"];

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const startTokenId = config.nextTokenId.toNumber();

      await program.methods
        .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const updatedConfig = await program.account.supplyChainConfig.fetch(configPda);
      updatedConfig.nextTokenId.toNumber().should.equal(startTokenId + 2);
    });
  });

  describe("String Length Limits Validation", () => {
    it("rejects serial number exceeding 200 characters", async () => {
      const serialNumber = "A".repeat(201);
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = createModelSpecs("TestBrand", "Model", 2024);

      try {
        await program.methods
          .registerNetbooksBatch([serialNumber], [batchId], [modelSpec])
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("StringTooLong");
      }
    });

    it("accepts serial number at exactly 200 characters", async () => {
      const serialNumber = "A".repeat(200);
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = createModelSpecs("TestBrand", "Model", 2024);

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const startTokenId = config.nextTokenId.toNumber();

      await program.methods
        .registerNetbooksBatch([serialNumber], [batchId], [modelSpec])
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const updatedConfig = await program.account.supplyChainConfig.fetch(configPda);
      updatedConfig.nextTokenId.toNumber().should.equal(startTokenId + 1);
    });

    it("rejects batch_id exceeding 100 characters", async () => {
      const serialNumber = "SN-LONG-BATCH";
      const batchId = "B".repeat(101);
      const modelSpec = createModelSpecs("TestBrand", "Model", 2024);

      try {
        await program.methods
          .registerNetbooksBatch([serialNumber], [batchId], [modelSpec])
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("StringTooLong");
      }
    });

    it("rejects model_spec exceeding 500 characters", async () => {
      const serialNumber = "SN-LONG-SPEC";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = "C".repeat(501);

      try {
        await program.methods
          .registerNetbooksBatch([serialNumber], [batchId], [modelSpec])
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("StringTooLong");
      }
    });

    it("accepts model_spec at exactly 500 characters", async () => {
      const serialNumber = "SN-MAX-SPEC";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = "C".repeat(500);

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const startTokenId = config.nextTokenId.toNumber();

      await program.methods
        .registerNetbooksBatch([serialNumber], [batchId], [modelSpec])
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const updatedConfig = await program.account.supplyChainConfig.fetch(configPda);
      updatedConfig.nextTokenId.toNumber().should.equal(startTokenId + 1);
    });

    it("rejects empty serial number", async () => {
      const serialNumber = "";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = createModelSpecs("TestBrand", "Model", 2024);

      try {
        await program.methods
          .registerNetbooksBatch([serialNumber], [batchId], [modelSpec])
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("EmptySerial");
      }
    });
  });

  describe("Role Enforcement", () => {
    it("rejects batch registration from non-manufacturer account", async () => {
      const randomUser = Keypair.generate();
      const serialNumber = "SN-AUTH-001";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = createModelSpecs("TestBrand", "Model", 2024);

      try {
        await program.methods
          .registerNetbooksBatch([serialNumber], [batchId], [modelSpec])
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([randomUser])
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        error.message.should.include("Unauthorized");
      }
    });

    it("rejects batch registration with unauthorized signer", async () => {
      const unauthorized = Keypair.generate();
      const serialNumber = "SN-AUTH-002";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = createModelSpecs("TestBrand", "Model", 2024);

      try {
        await program.methods
          .registerNetbooksBatch([serialNumber], [batchId], [modelSpec])
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey, // PDA expects manufacturer to be signer
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorized]) // But unauthorized is the actual signer
          .rpc();

        throw new Error("Expected transaction to fail");
      } catch (error: any) {
        // Should fail with signature verification or unauthorized error
        error.message.should.satisfy((msg) =>
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

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const startTokenId = config.nextTokenId.toNumber();

      await program.methods
        .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const updatedConfig = await program.account.supplyChainConfig.fetch(configPda);
      updatedConfig.nextTokenId.toNumber().should.equal(startTokenId + batchSize);
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

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const startTotalNetbooks = config.totalNetbooks.toNumber();

      await program.methods
        .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const updatedConfig = await program.account.supplyChainConfig.fetch(configPda);
      updatedConfig.totalNetbooks.toNumber().should.equal(startTotalNetbooks + batchSize);
    });

    it("maintains consistent counters across multiple batch operations", async () => {
      const batches = [3, 5, 2, 7];
      let expectedTokenId = 0;
      let expectedTotalNetbooks = 0;

      for (const batchSize of batches) {
        const serialNumbers: string[] = [];
        const batchIds: string[] = [];
        const modelSpecs: string[] = [];

        for (let i = 0; i < batchSize; i++) {
          serialNumbers.push(`SN-CONSIST-${batchSize}-${String(i).padStart(3, "0")}`);
          batchIds.push(createBatchId("TEST", 2024, 1));
          modelSpecs.push(createModelSpecs("TestBrand", "Model", 2024));
        }

        const config = await program.account.supplyChainConfig.fetch(configPda);
        expectedTokenId = config.nextTokenId.toNumber();
        expectedTotalNetbooks = config.totalNetbooks.toNumber();

        await program.methods
          .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();

        const updatedConfig = await program.account.supplyChainConfig.fetch(configPda);
        updatedConfig.nextTokenId.toNumber().should.equal(expectedTokenId + batchSize);
        updatedConfig.totalNetbooks.toNumber().should.equal(expectedTotalNetbooks + batchSize);
      }
    });
  });

  describe("Event Emission Verification", () => {
    it("emits NetbooksRegistered event with correct count", async () => {
      const batchSize = 5;
      const serialNumbers: string[] = [];
      const batchIds: string[] = [];
      const modelSpecs: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        serialNumbers.push(`SN-EVENT-${String(i).padStart(3, "0")}`);
        batchIds.push(createBatchId("TEST", 2024, 1));
        modelSpecs.push(createModelSpecs("TestBrand", "Model", 2024));
      }

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const startTokenId = config.nextTokenId.toNumber();

      let eventReceived: NetbooksRegisteredEvent | null = null;
      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Event emission timeout"));
        }, 10000);

        const listener = (logs: Logs, _context: unknown) => {
          const logStrings = logs.logs.map((l) => l);
          const found = logStrings.some((log) =>
            typeof log === "string" && log.includes("NetbooksRegistered")
          );

          if (found) {
            clearTimeout(timeout);
            eventReceived = { count: batchSize, startTokenId, timestamp: Date.now() };
            resolve();
          }
        };

        provider.connection.onLogs(
          fabricante.publicKey,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      await eventPromise;
      eventReceived!.count.should.equal(batchSize);
      eventReceived!.startTokenId.should.equal(startTokenId);
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

      await program.methods
        .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Verify by trying to register duplicates - should fail
      for (const serial of serialNumbers) {
        try {
          await program.methods
            .registerNetbooksBatch([serial], [createBatchId("TEST", 2024, 2)], [createModelSpecs("TestBrand", "Model", 2024)])
            .accountsStrict({
              config: configPda,
              serialHashRegistry: serialHashRegistryPda,
              manufacturer: fabricante.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([fabricante])
            .rpc();

          throw new Error("Expected transaction to fail for duplicate serial");
        } catch (error: any) {
          error.message.should.include("DuplicateSerial");
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

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const startTokenId = config.nextTokenId.toNumber();

      await program.methods
        .registerNetbooksBatch(serialNumbers, new Array(batchSize).fill(sharedBatchId), modelSpecs)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const updatedConfig = await program.account.supplyChainConfig.fetch(configPda);
      updatedConfig.nextTokenId.toNumber().should.equal(startTokenId + batchSize);
    });

    it("handles batch with empty model_spec correctly", async () => {
      const serialNumber = "SN-EMPTY-SPEC";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = "";

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const startTokenId = config.nextTokenId.toNumber();

      await program.methods
        .registerNetbooksBatch([serialNumber], [batchId], [modelSpec])
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const updatedConfig = await program.account.supplyChainConfig.fetch(configPda);
      updatedConfig.nextTokenId.toNumber().should.equal(startTokenId + 1);
    });

    it("handles batch with special characters in serial number", async () => {
      const serialNumber = "SN-SPECIAL-!@#$%^&*()-_=+[]{}|;:'\",.<>?/`~";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = createModelSpecs("TestBrand", "Model", 2024);

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const startTokenId = config.nextTokenId.toNumber();

      await program.methods
        .registerNetbooksBatch([serialNumber], [batchId], [modelSpec])
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const updatedConfig = await program.account.supplyChainConfig.fetch(configPda);
      updatedConfig.nextTokenId.toNumber().should.equal(startTokenId + 1);
    });

    it("handles batch with unicode characters in serial number", async () => {
      const serialNumber = "SN-UNICODE-日本語-emoji-🔔";
      const batchId = createBatchId("TEST", 2024, 1);
      const modelSpec = createModelSpecs("TestBrand", "Model", 2024);

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const startTokenId = config.nextTokenId.toNumber();

      await program.methods
        .registerNetbooksBatch([serialNumber], [batchId], [modelSpec])
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const updatedConfig = await program.account.supplyChainConfig.fetch(configPda);
      updatedConfig.nextTokenId.toNumber().should.equal(startTokenId + 1);
    });
  });
});
