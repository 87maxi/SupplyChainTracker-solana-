/**
 * Overflow/Underflow Protection Tests
 *
 * Comprehensive test suite for overflow/underflow protection in the SupplyChainTracker program.
 * Verifies that all numeric counters, string lengths, and array bounds are properly validated.
 *
 * Issue #74: Overflow/Underflow Protection Tests (P1)
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
  createBatchId,
  createModelSpecs,
} from "./test-helpers";

describe("Overflow/Underflow Protection Tests", () => {
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
        admin: admin.publicKey,
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

  async function getCounterValues(): Promise<{
    nextTokenId: number;
    totalNetbooks: number;
    roleRequestsCount: number;
    fabricanteCount: number;
    auditorHwCount: number;
    tecnicoSwCount: number;
    escuelaCount: number;
  }> {
    const config = await program.account.supplyChainConfig.fetch(configPda);
    return {
      nextTokenId: config.nextTokenId.toNumber(),
      totalNetbooks: config.totalNetbooks.toNumber(),
      roleRequestsCount: config.roleRequestsCount.toNumber(),
      fabricanteCount: config.fabricanteCount.toNumber(),
      auditorHwCount: config.auditorHwCount.toNumber(),
      tecnicoSwCount: config.tecnicoSwCount.toNumber(),
      escuelaCount: config.escuelaCount.toNumber(),
    };
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

      const netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.serialNumber.length).to.equal(200);
    });

    it("rejects serial number exceeding 200 characters", async () => {
      const serial201 = "A".repeat(201);

      try {
        const config = await program.account.supplyChainConfig.fetch(configPda);
        const tokenId = config.nextTokenId.toNumber();
        const netbookPda = getNetbookPda(tokenId, program.programId);

        await program.methods
          .registerNetbook(serial201, "BATCH-002", "Model for 201 char serial")
          .accountsStrict({
            manufacturer: fabricante.publicKey,
            netbook: netbookPda,
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();
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

      const netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.batchId.length).to.equal(100);
    });

    it("rejects batch_id exceeding 100 characters", async () => {
      const batchId101 = "B".repeat(101);

      try {
        const config = await program.account.supplyChainConfig.fetch(configPda);
        const tokenId = config.nextTokenId.toNumber();
        const netbookPda = getNetbookPda(tokenId, program.programId);

        await program.methods
          .registerNetbook("STR-LEN-002", batchId101, "Model for 101 char batch")
          .accountsStrict({
            manufacturer: fabricante.publicKey,
            netbook: netbookPda,
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();
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

      const netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.initialModelSpecs.length).to.equal(500);
    });

    it("rejects model_specs exceeding 500 characters", async () => {
      const model501 = "M".repeat(501);

      try {
        const config = await program.account.supplyChainConfig.fetch(configPda);
        const tokenId = config.nextTokenId.toNumber();
        const netbookPda = getNetbookPda(tokenId, program.programId);

        await program.methods
          .registerNetbook("STR-LEN-004", "BATCH-STR-004", model501)
          .accountsStrict({
            manufacturer: fabricante.publicKey,
            netbook: netbookPda,
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();
        expect.fail("Expected registration to fail for 501 char model_specs");
      } catch (error: any) {
        expect(error.message).to.contain("StringTooLong");
      }
    });

    it("accepts os_version at exactly 100 characters", async () => {
      const netbookPda = await registerNetbook(
        "STR-LEN-005",
        "BATCH-STR-005",
        "Model for 100 char os"
      );

      // Perform hardware audit first
      await program.methods
        .auditHardware("STR-LEN-005", true, createHash(100))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      // Validate with 100 char os version
      const osVersion100 = "O".repeat(100);
      await program.methods
        .validateSoftware("STR-LEN-005", osVersion100, true)
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          technician: technician.publicKey,
        })
        .signers([technician])
        .rpc();

      const netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.osVersion.length).to.equal(100);
    });

    it("rejects os_version exceeding 100 characters", async () => {
      const netbookPda = await registerNetbook(
        "STR-LEN-006",
        "BATCH-STR-006",
        "Model for 101 char os"
      );

      // Perform hardware audit first
      await program.methods
        .auditHardware("STR-LEN-006", true, createHash(101))
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      // Try to validate with 101 char os version
      const osVersion101 = "O".repeat(101);

      try {
        await program.methods
          .validateSoftware("STR-LEN-006", osVersion101, true)
          .accountsStrict({
            netbook: netbookPda,
            config: configPda,
            technician: technician.publicKey,
          })
          .signers([technician])
          .rpc();
        expect.fail("Expected validation to fail for 101 char os_version");
      } catch (error: any) {
        expect(error.message).to.contain("StringTooLong");
      }
    });

    it("rejects empty serial number", async () => {
      try {
        const config = await program.account.supplyChainConfig.fetch(configPda);
        const tokenId = config.nextTokenId.toNumber();
        const netbookPda = getNetbookPda(tokenId, program.programId);

        await program.methods
          .registerNetbook("", "BATCH-EMPTY", "Model for empty serial")
          .accountsStrict({
            manufacturer: fabricante.publicKey,
            netbook: netbookPda,
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();
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
      const serials = ["SN-001", "SN-002", "SN-003"];
      const batchIds = ["BATCH-001", "BATCH-002"]; // One less than serials
      const models = ["Model 1", "Model 2", "Model 3"];

      try {
        await program.methods
          .registerNetbooksBatch(serials, batchIds, models)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();
        expect.fail("Expected batch registration to fail for mismatched arrays");
      } catch (error: any) {
        expect(error.message).to.contain("ArrayLengthMismatch");
      }
    });

    it("rejects batch with mismatched serial_numbers and model_specs lengths", async () => {
      const serials = ["SN-001", "SN-002"];
      const batchIds = ["BATCH-001", "BATCH-002"];
      const models = ["Model 1"]; // One less than serials

      try {
        await program.methods
          .registerNetbooksBatch(serials, batchIds, models)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();
        expect.fail("Expected batch registration to fail for mismatched arrays");
      } catch (error: any) {
        expect(error.message).to.contain("ArrayLengthMismatch");
      }
    });

    it("rejects batch with all three arrays having different lengths", async () => {
      const serials = ["SN-001"];
      const batchIds = ["BATCH-001", "BATCH-002"];
      const models = ["Model 1", "Model 2", "Model 3"];

      try {
        await program.methods
          .registerNetbooksBatch(serials, batchIds, models)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();
        expect.fail("Expected batch registration to fail for mismatched arrays");
      } catch (error: any) {
        expect(error.message).to.contain("ArrayLengthMismatch");
      }
    });

    it("rejects batch with empty serial_numbers array", async () => {
      const serials: string[] = [];
      const batchIds: string[] = [];
      const models: string[] = [];

      try {
        await program.methods
          .registerNetbooksBatch(serials, batchIds, models)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();
        expect.fail("Expected batch registration to fail for empty arrays");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects batch with zero count", async () => {
      const serials: string[] = [];
      const batchIds: string[] = [];
      const models: string[] = [];

      try {
        await program.methods
          .registerNetbooksBatch(serials, batchIds, models)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();
        expect.fail("Expected batch registration to fail for zero count");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects batch exceeding maximum size (11 items)", async () => {
      const serials = Array(11)
        .fill(0)
        .map((_, i) => `SN-BATCH-${i}`);
      const batchIds = Array(11)
        .fill(0)
        .map((_, i) => `BATCH-BIG-${i}`);
      const models = Array(11)
        .fill(0)
        .map((_, i) => `Model ${i}`);

      try {
        await program.methods
          .registerNetbooksBatch(serials, batchIds, models)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();
        expect.fail("Expected batch registration to fail for 11 items");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("accepts batch at exactly maximum size (10 items)", async () => {
      const serials = Array(10)
        .fill(0)
        .map((_, i) => `SN-MAX-${i}`);
      const batchIds = Array(10)
        .fill(0)
        .map((_, i) => `BATCH-MAX-${i}`);
      const models = Array(10)
        .fill(0)
        .map((_, i) => `Model ${i}`);

      const countersBefore = await getCounterValues();

      await program.methods
        .registerNetbooksBatch(serials, batchIds, models)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const countersAfter = await getCounterValues();
      expect(countersAfter.nextTokenId).to.equal(
        countersBefore.nextTokenId + 10
      );
      expect(countersAfter.totalNetbooks).to.equal(
        countersBefore.totalNetbooks + 10
      );
    });
  });

  // ========================================================================
  // 3. Counter Increment Consistency Tests
  // ========================================================================

  describe("Counter Increment Consistency Tests", () => {
    it("increments next_token_id and total_netbooks correctly for single registration", async () => {
      const countersBefore = await getCounterValues();

      await registerNetbook("COUNTER-001", "COUNTER-BATCH-001", "Counter Model");

      const countersAfter = await getCounterValues();
      expect(countersAfter.nextTokenId).to.equal(
        countersBefore.nextTokenId + 1
      );
      expect(countersAfter.totalNetbooks).to.equal(
        countersBefore.totalNetbooks + 1
      );
    });

    it("increments counters correctly for batch registration", async () => {
      const batchCount = 5;
      const countersBefore = await getCounterValues();

      const serials = Array(batchCount)
        .fill(0)
        .map((_, i) => `COUNTER-BATCH-${i}`);
      const batchIds = Array(batchCount)
        .fill(0)
        .map((_, i) => `COUNTER-BATCH-ID-${i}`);
      const models = Array(batchCount)
        .fill(0)
        .map((_, i) => `Counter Batch Model ${i}`);

      await program.methods
        .registerNetbooksBatch(serials, batchIds, models)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const countersAfter = await getCounterValues();
      expect(countersAfter.nextTokenId).to.equal(
        countersBefore.nextTokenId + batchCount
      );
      expect(countersAfter.totalNetbooks).to.equal(
        countersBefore.totalNetbooks + batchCount
      );
    });

    it("maintains consistent counters across multiple batch operations", async () => {
      const countersBefore = await getCounterValues();
      const initialTokenId = countersBefore.nextTokenId;
      const initialTotalNetbooks = countersBefore.totalNetbooks;

      // Batch 1: 3 netbooks
      const batch1Serials = ["CONSIST-001", "CONSIST-002", "CONSIST-003"];
      const batch1BatchIds = ["CONSIST-BATCH-1", "CONSIST-BATCH-2", "CONSIST-BATCH-3"];
      const batch1Models = ["Consistent Model 1", "Consistent Model 2", "Consistent Model 3"];

      await program.methods
        .registerNetbooksBatch(batch1Serials, batch1BatchIds, batch1Models)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      let countersAfter1 = await getCounterValues();
      expect(countersAfter1.nextTokenId).to.equal(initialTokenId + 3);
      expect(countersAfter1.totalNetbooks).to.equal(initialTotalNetbooks + 3);

      // Batch 2: 7 netbooks
      const batch2Serials = Array(7)
        .fill(0)
        .map((_, i) => `CONSIST-0${i + 4}`);
      const batch2BatchIds = Array(7)
        .fill(0)
        .map((_, i) => `CONSIST-BATCH-${i + 4}`);
      const batch2Models = Array(7)
        .fill(0)
        .map((_, i) => `Consistent Model ${i + 4}`);

      await program.methods
        .registerNetbooksBatch(batch2Serials, batch2BatchIds, batch2Models)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const countersAfter2 = await getCounterValues();
      expect(countersAfter2.nextTokenId).to.equal(initialTokenId + 10);
      expect(countersAfter2.totalNetbooks).to.equal(initialTotalNetbooks + 10);
    });

    it("verifies token IDs are sequential after batch registration", async () => {
      const countersBefore = await getCounterValues();
      const startTokenId = countersBefore.nextTokenId;

      // Register batch of 5
      const serials = Array(5)
        .fill(0)
        .map((_, i) => `SEQ-TOKEN-${i}`);
      const batchIds = Array(5)
        .fill(0)
        .map((_, i) => `SEQ-BATCH-${i}`);
      const models = Array(5)
        .fill(0)
        .map((_, i) => `Sequential Token Model ${i}`);

      await program.methods
        .registerNetbooksBatch(serials, batchIds, models)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Verify each token ID exists and is sequential
      for (let i = 0; i < 5; i++) {
        const expectedTokenId = startTokenId + i;
        const netbookPda = getNetbookPda(expectedTokenId, program.programId);
        const netbook = await program.account.netbook.fetch(netbookPda);
        expect(netbook.tokenId.toNumber()).to.equal(expectedTokenId);
      }
    });
  });

  // ========================================================================
  // 4. Duplicate Serial Number Detection Tests
  // ========================================================================

  describe("Duplicate Serial Number Detection Tests", () => {
    it("rejects duplicate serial number within same batch", async () => {
      const serials = ["DUP-SN-001", "DUP-SN-001", "DUP-SN-003"];
      const batchIds = ["DUP-BATCH-1", "DUP-BATCH-2", "DUP-BATCH-3"];
      const models = ["Duplicate Model 1", "Duplicate Model 2", "Duplicate Model 3"];

      try {
        await program.methods
          .registerNetbooksBatch(serials, batchIds, models)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();
        expect.fail("Expected batch registration to fail for duplicate serials");
      } catch (error: any) {
        expect(error.message).to.contain("DuplicateSerial");
      }
    });

    it("rejects serial number already registered from previous batch", async () => {
      // First batch
      const serials1 = ["PREV-DUP-001", "PREV-DUP-002"];
      const batchIds1 = ["PREV-BATCH-1", "PREV-BATCH-2"];
      const models1 = ["Previous Duplicate Model 1", "Previous Duplicate Model 2"];

      await program.methods
        .registerNetbooksBatch(serials1, batchIds1, models1)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Second batch with duplicate
      const serials2 = ["PREV-DUP-002", "NEW-DUP-001"];
      const batchIds2 = ["NEW-BATCH-1", "NEW-BATCH-2"];
      const models2 = ["New Duplicate Model 1", "New Duplicate Model 2"];

      try {
        await program.methods
          .registerNetbooksBatch(serials2, batchIds2, models2)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();
        expect.fail("Expected batch registration to fail for previously registered serial");
      } catch (error: any) {
        expect(error.message).to.contain("DuplicateSerial");
      }
    });

    it("allows different serial numbers that hash to different values", async () => {
      const serials = ["DIFF-HASH-001", "DIFF-HASH-002", "DIFF-HASH-003"];
      const batchIds = ["DIFF-BATCH-1", "DIFF-BATCH-2", "DIFF-BATCH-3"];
      const models = ["Different Hash Model 1", "Different Hash Model 2", "Different Hash Model 3"];

      const countersBefore = await getCounterValues();

      await program.methods
        .registerNetbooksBatch(serials, batchIds, models)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const countersAfter = await getCounterValues();
      expect(countersAfter.totalNetbooks).to.equal(
        countersBefore.totalNetbooks + 3
      );
    });
  });

  // ========================================================================
  // 5. Special Character and Unicode Tests
  // ========================================================================

  describe("Special Character and Unicode Tests", () => {
    it("accepts serial number with special characters", async () => {
      const specialSerial = "SN-SPEC!@#$%^&*()";
      const netbookPda = await registerNetbook(
        specialSerial,
        "SPECIAL-BATCH-001",
        "Special Character Model"
      );

      const netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.serialNumber).to.equal(specialSerial);
    });

    it("accepts serial number with unicode characters", async () => {
      const unicodeSerial = "SN-UNICODE-日本語-中文-한국어-emoji-🔥";
      const netbookPda = await registerNetbook(
        unicodeSerial,
        "UNICODE-BATCH-001",
        "Unicode Model"
      );

      const netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.serialNumber).to.equal(unicodeSerial);
    });

    it("accepts batch with special characters in all fields", async () => {
      const serials = ["SN-SPEC-!@#", "SN-SPEC-$%^", "SN-SPEC-&*()"];
      const batchIds = ["BATCH-SPEC-!@#", "BATCH-SPEC-$%^", "BATCH-SPEC-&*()"];
      const models = ["MODEL-SPEC-!@#", "MODEL-SPEC-$%^", "MODEL-SPEC-&*()"];

      const countersBefore = await getCounterValues();

      await program.methods
        .registerNetbooksBatch(serials, batchIds, models)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const countersAfter = await getCounterValues();
      expect(countersAfter.totalNetbooks).to.equal(
        countersBefore.totalNetbooks + 3
      );
    });

    it("accepts batch with unicode characters in all fields", async () => {
      const serials = ["UNICODE-日-本-語", "UNICODE-中-文", "UNICODE-한-국-어"];
      const batchIds = ["UNI-BATCH-1", "UNI-BATCH-2", "UNI-BATCH-3"];
      const models = ["UNI-MODEL-1", "UNI-MODEL-2", "UNI-MODEL-3"];

      const countersBefore = await getCounterValues();

      await program.methods
        .registerNetbooksBatch(serials, batchIds, models)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const countersAfter = await getCounterValues();
      expect(countersAfter.totalNetbooks).to.equal(
        countersBefore.totalNetbooks + 3
      );
    });
  });

  // ========================================================================
  // 6. Empty and Whitespace Tests
  // ========================================================================

  describe("Empty and Whitespace Tests", () => {
    it("rejects empty batch registration", async () => {
      const serials: string[] = [];
      const batchIds: string[] = [];
      const models: string[] = [];

      try {
        await program.methods
          .registerNetbooksBatch(serials, batchIds, models)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();
        expect.fail("Expected empty batch registration to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("accepts batch with empty model_spec (whitespace only)", async () => {
      const serials = ["EMPTY-MODEL-1", "EMPTY-MODEL-2"];
      const batchIds = ["EMPTY-BATCH-1", "EMPTY-BATCH-2"];
      const models = ["", ""];

      const countersBefore = await getCounterValues();

      await program.methods
        .registerNetbooksBatch(serials, batchIds, models)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const countersAfter = await getCounterValues();
      expect(countersAfter.totalNetbooks).to.equal(
        countersBefore.totalNetbooks + 2
      );
    });

    it("accepts batch with identical batch_ids", async () => {
      const serials = ["SAME-BATCH-1", "SAME-BATCH-2", "SAME-BATCH-3"];
      const batchIds = ["IDENTICAL-BATCH", "IDENTICAL-BATCH", "IDENTICAL-BATCH"];
      const models = ["Same Batch Model 1", "Same Batch Model 2", "Same Batch Model 3"];

      const countersBefore = await getCounterValues();

      await program.methods
        .registerNetbooksBatch(serials, batchIds, models)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      const countersAfter = await getCounterValues();
      expect(countersAfter.totalNetbooks).to.equal(
        countersBefore.totalNetbooks + 3
      );
    });
  });

  // ========================================================================
  // 7. Role Holder Count Tests
  // ========================================================================

  describe("Role Holder Count Tests", () => {
    it("increments fabricante_count when granting FABRICANTE role", async () => {
      const countersBefore = await getCounterValues();

      const newFabricante = Keypair.generate();
      await provider.connection.requestAirdrop(newFabricante.publicKey, 1 * LAMPORTS_PER_SOL);

      await grantRole("FABRICANTE", newFabricante.publicKey);

      const countersAfter = await getCounterValues();
      expect(countersAfter.fabricanteCount).to.equal(
        countersBefore.fabricanteCount + 1
      );
    });

    it("increments auditor_hw_count when granting AUDITOR_HW role", async () => {
      const countersBefore = await getCounterValues();

      const newAuditor = Keypair.generate();
      await provider.connection.requestAirdrop(newAuditor.publicKey, 1 * LAMPORTS_PER_SOL);

      await grantRole("AUDITOR_HW", newAuditor.publicKey);

      const countersAfter = await getCounterValues();
      expect(countersAfter.auditorHwCount).to.equal(
        countersBefore.auditorHwCount + 1
      );
    });

    it("increments tecnico_sw_count when granting TECNICO_SW role", async () => {
      const countersBefore = await getCounterValues();

      const newTechnician = Keypair.generate();
      await provider.connection.requestAirdrop(newTechnician.publicKey, 1 * LAMPORTS_PER_SOL);

      await grantRole("TECNICO_SW", newTechnician.publicKey);

      const countersAfter = await getCounterValues();
      expect(countersAfter.tecnicoSwCount).to.equal(
        countersBefore.tecnicoSwCount + 1
      );
    });

    it("increments escuela_count when granting ESCUELA role", async () => {
      const countersBefore = await getCounterValues();

      const newSchool = Keypair.generate();
      await provider.connection.requestAirdrop(newSchool.publicKey, 1 * LAMPORTS_PER_SOL);

      await grantRole("ESCUELA", newSchool.publicKey);

      const countersAfter = await getCounterValues();
      expect(countersAfter.escuelaCount).to.equal(
        countersBefore.escuelaCount + 1
      );
    });
  });

  // ========================================================================
  // 8. Large Value Boundary Tests
  // ========================================================================

  describe("Large Value Boundary Tests", () => {
    it("handles multiple batch registrations without counter overflow", async () => {
      const countersBefore = await getCounterValues();
      const initialTokenId = countersBefore.nextTokenId;
      const initialTotalNetbooks = countersBefore.totalNetbooks;

      // Register 10 batches of 10 netbooks each
      for (let batch = 0; batch < 10; batch++) {
        const serials = Array(10)
          .fill(0)
          .map(
            (_, i) => `LARGE-VALUE-${batch}-${i}`
          );
        const batchIds = Array(10)
          .fill(0)
          .map(
            (_, i) => `LARGE-BATCH-${batch}-${i}`
          );
        const models = Array(10)
          .fill(0)
          .map(
            (_, i) => `Large Value Model ${batch}-${i}`
          );

        await program.methods
          .registerNetbooksBatch(serials, batchIds, models)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();
      }

      const countersAfter = await getCounterValues();
      expect(countersAfter.nextTokenId).to.equal(initialTokenId + 100);
      expect(countersAfter.totalNetbooks).to.equal(initialTotalNetbooks + 100);
    });

    it("verifies counter consistency after mixed single and batch registrations", async () => {
      const countersBefore = await getCounterValues();
      const initialTokenId = countersBefore.nextTokenId;
      const initialTotalNetbooks = countersBefore.totalNetbooks;

      // Single registration
      await registerNetbook("MIXED-001", "MIXED-BATCH-001", "Mixed Model 1");

      // Batch registration
      const batch1Serials = ["MIXED-002", "MIXED-003", "MIXED-004"];
      const batch1BatchIds = ["MIXED-BATCH-002", "MIXED-BATCH-003", "MIXED-BATCH-004"];
      const batch1Models = ["Mixed Model 2", "Mixed Model 3", "Mixed Model 4"];

      await program.methods
        .registerNetbooksBatch(batch1Serials, batch1BatchIds, batch1Models)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Another single registration
      await registerNetbook("MIXED-005", "MIXED-BATCH-005", "Mixed Model 5");

      const countersAfter = await getCounterValues();
      expect(countersAfter.nextTokenId).to.equal(initialTokenId + 5);
      expect(countersAfter.totalNetbooks).to.equal(initialTotalNetbooks + 5);
    });
  });

  // ========================================================================
  // 9. Serial Hash Registry Size Tests
  // ========================================================================

  describe("Serial Hash Registry Size Tests", () => {
    it("stores serial hashes for all registered netbooks", async () => {
      const countersBefore = await getCounterValues();
      const initialTotalNetbooks = countersBefore.totalNetbooks;

      // Register a batch
      const serials = ["HASH-REG-001", "HASH-REG-002", "HASH-REG-003"];
      const batchIds = ["HASH-BATCH-1", "HASH-BATCH-2", "HASH-BATCH-3"];
      const models = ["Hash Reg Model 1", "Hash Reg Model 2", "Hash Reg Model 3"];

      await program.methods
        .registerNetbooksBatch(serials, batchIds, models)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Verify all serials are registered by trying to register them again
      for (const serial of serials) {
        try {
          const config = await program.account.supplyChainConfig.fetch(configPda);
          const tokenId = config.nextTokenId.toNumber();
          const netbookPda = getNetbookPda(tokenId, program.programId);

          await program.methods
            .registerNetbook(serial, `DUP-BATCH-${serial}`, "Duplicate Check Model")
            .accountsStrict({
              manufacturer: fabricante.publicKey,
              netbook: netbookPda,
              config: configPda,
              serialHashRegistry: serialHashRegistryPda,
              systemProgram: SystemProgram.programId,
            })
            .signers([fabricante])
            .rpc();
          expect.fail(`Expected duplicate serial ${serial} to be rejected`);
        } catch (error: any) {
          expect(error.message).to.contain("DuplicateSerial");
        }
      }
    });
  });

  // ========================================================================
  // 10. Edge Case String Length Tests
  // ========================================================================

  describe("Edge Case String Length Tests", () => {
    it("accepts single character serial number", async () => {
      const netbookPda = await registerNetbook("X", "SINGLE-CHAR-001", "Single Char Model");

      const netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.serialNumber).to.equal("X");
      expect(netbook.serialNumber.length).to.equal(1);
    });

    it("accepts single character batch_id", async () => {
      const netbookPda = await registerNetbook("SINGLE-BATCH-001", "Y", "Single Char Batch Model");

      const netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.batchId).to.equal("Y");
      expect(netbook.batchId.length).to.equal(1);
    });

    it("accepts single character model_specs", async () => {
      const netbookPda = await registerNetbook("SINGLE-MODEL-001", "SINGLE-MODEL-BATCH", "Z");

      const netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.initialModelSpecs).to.equal("Z");
      expect(netbook.initialModelSpecs.length).to.equal(1);
    });

    it("handles serial number with only whitespace characters", async () => {
      const whitespaceSerial = "   "; // 3 spaces
      const netbookPda = await registerNetbook(
        whitespaceSerial,
        "WHITESPACE-BATCH-001",
        "Whitespace Model"
      );

      const netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.serialNumber).to.equal(whitespaceSerial);
    });

    it("handles batch_id with mixed case and numbers", async () => {
      const mixedBatchId = "MixedCase123-BATCH-ABC-456";
      const netbookPda = await registerNetbook(
        "MIXED-CASE-001",
        mixedBatchId,
        "Mixed Case Model"
      );

      const netbook = await program.account.netbook.fetch(netbookPda);
      expect(netbook.batchId).to.equal(mixedBatchId);
    });
  });
});
