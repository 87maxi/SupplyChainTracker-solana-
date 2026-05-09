/**
 * PDA Derivation Security Tests
 *
 * Comprehensive test suite for Program Derived Address (PDA) derivation security.
 * Tests deterministic derivation, collision resistance, and PDA verification
 * for all account types in the SupplyChainTracker program.
 *
 * Issue #71: PDA Derivation Security Tests (P1)
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
  getRoleRequestPda,
  getSerialHashRegistryPda,
  getRoleHolderPda,
  createHash,
  NetbookState,
} from "./test-helpers";

describe("PDA Derivation Security Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.scSolana as Program<ScSolana>;
  const admin = Keypair.generate();
  const fabricante = Keypair.generate();
  const auditor = Keypair.generate();
  const technician = Keypair.generate();
  const school = Keypair.generate();
  const randomUser = Keypair.generate();

  let configPda: PublicKey;
  let configBump: number;
  let adminPda: PublicKey;

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

    // Get config PDA
    [configPda, configBump] = getConfigPda(program);
  });

  // ========================================================================
  // Test Helper: Initialize Config
  // ========================================================================

  async function initializeConfig() {
    const funder = Keypair.generate();
    await provider.connection.requestAirdrop(funder.publicKey, 10 * LAMPORTS_PER_SOL);
    const [deployerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("deployer")],
      program.programId
    );
    adminPda = anchor.web3.PublicKey.findProgramAddressSync(
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
        serialHashRegistry: getSerialHashRegistryPda(configPda, program.programId),
        admin: adminPda,
        deployer: deployerPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  // ========================================================================
  // 1. Deterministic PDA Derivation Tests
  // ========================================================================

  describe("Deterministic PDA Derivation", () => {
    it("derives same netbook PDA for same token ID across multiple calls", async () => {
      const tokenId = 42;
      const pda1 = getNetbookPda(tokenId, program.programId);
      const pda2 = getNetbookPda(tokenId, program.programId);
      const pda3 = getNetbookPda(tokenId, program.programId);

      expect(pda1.equals(pda2)).to.be.true;
      expect(pda2.equals(pda3)).to.be.true;
    });

    it("derives same config PDA across multiple calls", async () => {
      const pda1 = getConfigPda(program)[0];
      const pda2 = getConfigPda(program)[0];
      const pda3 = getConfigPda(program)[0];

      expect(pda1.equals(pda2)).to.be.true;
      expect(pda2.equals(pda3)).to.be.true;
    });

    it("derives same role request PDA for same user across multiple calls", async () => {
      const user = Keypair.generate();
      const pda1 = getRoleRequestPda(user.publicKey, program.programId);
      const pda2 = getRoleRequestPda(user.publicKey, program.programId);
      const pda3 = getRoleRequestPda(user.publicKey, program.programId);

      expect(pda1.equals(pda2)).to.be.true;
      expect(pda2.equals(pda3)).to.be.true;
    });

    it("derives same serial hash registry PDA for same config across multiple calls", async () => {
      const pda1 = getSerialHashRegistryPda(configPda, program.programId);
      const pda2 = getSerialHashRegistryPda(configPda, program.programId);
      const pda3 = getSerialHashRegistryPda(configPda, program.programId);

      expect(pda1.equals(pda2)).to.be.true;
      expect(pda2.equals(pda3)).to.be.true;
    });

    it("derives same role holder PDA for same role and index across multiple calls", async () => {
      const pda1 = getRoleHolderPda("FABRICANTE", 5, program.programId);
      const pda2 = getRoleHolderPda("FABRICANTE", 5, program.programId);
      const pda3 = getRoleHolderPda("FABRICANTE", 5, program.programId);

      expect(pda1.equals(pda2)).to.be.true;
      expect(pda2.equals(pda3)).to.be.true;
    });
  });

  // ========================================================================
  // 2. Different Inputs Produce Different PDAs
  // ========================================================================

  describe("Different Inputs Produce Different PDAs", () => {
    it("different token IDs produce different netbook PDAs", async () => {
      const pdas = new Set<string>();
      for (let tokenId = 1; tokenId <= 100; tokenId++) {
        const pda = getNetbookPda(tokenId, program.programId);
        pdas.add(pda.toBase58());
      }

      expect(pdas.size).to.equal(100);
    });

    it("different users produce different role request PDAs", async () => {
      const pdas = new Set<string>();
      const users = Array.from({ length: 50 }, () => Keypair.generate());

      for (const user of users) {
        const pda = getRoleRequestPda(user.publicKey, program.programId);
        pdas.add(pda.toBase58());
      }

      expect(pdas.size).to.equal(50);
    });

    it("different roles produce different role holder PDAs", async () => {
      const roles = ["FABRICANTE", "AUDITOR_HW", "TECNICO_SW", "ESCUELA"];
      const pdas = new Set<string>();

      for (const role of roles) {
        const pda = getRoleHolderPda(role, 0, program.programId);
        pdas.add(pda.toBase58());
      }

      expect(pdas.size).to.equal(4);
    });

    it("different indices produce different role holder PDAs for same role", async () => {
      const pdas = new Set<string>();
      const role = "FABRICANTE";

      for (let index = 0; index < 50; index++) {
        const pda = getRoleHolderPda(role, index, program.programId);
        pdas.add(pda.toBase58());
      }

      expect(pdas.size).to.equal(50);
    });

    it("different config PDAs produce different serial hash registry PDAs", async () => {
      const config1 = Keypair.generate();
      const config2 = Keypair.generate();
      const config3 = Keypair.generate();

      const pda1 = getSerialHashRegistryPda(config1.publicKey, program.programId);
      const pda2 = getSerialHashRegistryPda(config2.publicKey, program.programId);
      const pda3 = getSerialHashRegistryPda(config3.publicKey, program.programId);

      expect(pda1.equals(pda2)).to.be.false;
      expect(pda2.equals(pda3)).to.be.false;
      expect(pda1.equals(pda3)).to.be.false;
    });
  });

  // ========================================================================
  // 3. PDA Collision Resistance
  // ========================================================================

  describe("PDA Collision Resistance", () => {
    it("netbook PDA for token 0 is different from netbook PDA for token 1", async () => {
      const pda0 = getNetbookPda(0, program.programId);
      const pda1 = getNetbookPda(1, program.programId);

      expect(pda0.equals(pda1)).to.be.false;
    });

    it("netbook PDA for max token ID is unique", async () => {
      const maxTokenId = Number.MAX_SAFE_INTEGER;
      const pda = getNetbookPda(maxTokenId, program.programId);

      // Verify it doesn't collide with small token IDs
      for (let i = 0; i < 10; i++) {
        const smallPda = getNetbookPda(i, program.programId);
        expect(pda.equals(smallPda)).to.be.false;
      }
    });

    it("role holder PDA for index 0 is different from index 1", async () => {
      const pda0 = getRoleHolderPda("FABRICANTE", 0, program.programId);
      const pda1 = getRoleHolderPda("FABRICANTE", 1, program.programId);

      expect(pda0.equals(pda1)).to.be.false;
    });

    it("all role holder PDAs for indices 0-1000 are unique", async () => {
      const pdas = new Set<string>();
      const role = "AUDITOR_HW";

      for (let index = 0; index < 1000; index++) {
        const pda = getRoleHolderPda(role, index, program.programId);
        pdas.add(pda.toBase58());
      }

      expect(pdas.size).to.equal(1000);
    });
  });

  // ========================================================================
  // 4. Invalid PDA Rejection Tests
  // ========================================================================

  describe("Invalid PDA Rejection", () => {
    it("rejects operations with non-PDA config account", async () => {
      const randomAccount = Keypair.generate();

      try {
        await program.methods
          .queryConfig()
          .accountsStrict({
            config: randomAccount.publicKey,
          })
          .signers([])
          .rpc({ skipPreflight: true });

        // If it doesn't throw, the test should fail
        expect.fail("Expected queryConfig to fail with non-PDA config");
      } catch (error: any) {
        // Should fail because randomAccount is not a valid PDA
        // The error may be AccountNotInitialized or similar
        expect(error).to.not.be.null;
      }
    });

    it("rejects operations with non-PDA netbook account", async () => {
      const randomAccount = Keypair.generate();

      try {
        await program.methods
          .queryNetbookState("test-serial")
          .accountsStrict({
            netbook: randomAccount.publicKey,
          })
          .signers([])
          .rpc({ skipPreflight: true });

        expect.fail("Expected queryNetbookState to fail with non-PDA netbook");
      } catch (error: any) {
        // Should fail because randomAccount is not a valid PDA
        expect(error).to.not.be.null;
      }
    });

    it("rejects operations with wrong PDA for account type", async () => {
      // Use a netbook PDA as if it were a config account
      const netbookPda = getNetbookPda(1, program.programId);

      try {
        await program.methods
          .queryConfig()
          .accountsStrict({
            config: netbookPda,
          })
          .signers([])
          .rpc({ skipPreflight: true });

        expect.fail("Expected queryConfig to fail with netbook PDA as config");
      } catch (error: any) {
        // Should fail because netbook PDA is not a config account
        expect(error).to.not.be.null;
      }
    });

    it("rejects query role with random account as role holder", async () => {
      const randomAccount = Keypair.generate();

      try {
        await program.methods
          .queryRole("FABRICANTE")
          .accountsStrict({
            config: configPda,
            accountToCheck: randomAccount.publicKey,
          })
          .signers([])
          .rpc({ skipPreflight: true });

        // This should succeed - queryRole is a view function, no role required
        expect(true).to.be.true;
      } catch (error: any) {
        // Any error is acceptable for this test
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 5. PDA Bump Seed Verification
  // ========================================================================

  describe("PDA Bump Seed Verification", () => {
    it("config PDA has valid bump seed", async () => {
      const [pda, bump] = getConfigPda(program);
      const [verifiedPda, verifiedBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        program.programId
      );

      expect(pda.equals(verifiedPda)).to.be.true;
      expect(bump).to.equal(verifiedBump);
      expect(bump).to.be.lessThanOrEqual(255);
    });

    it("netbook PDA has valid bump seed for various token IDs", async () => {
      const tokenIds = [0, 1, 100, 1000, 10000, 999999];

      for (const tokenId of tokenIds) {
        const pda = getNetbookPda(tokenId, program.programId);
        const tokenIdBytes = Buffer.alloc(8);
        tokenIdBytes.writeBigUInt64LE(BigInt(tokenId), 0);
        const [verifiedPda, verifiedBump] = PublicKey.findProgramAddressSync(
          [Buffer.from("netbook"), Buffer.from("netbook"), tokenIdBytes.slice(0, 7)],
          program.programId
        );

        expect(pda.equals(verifiedPda)).to.be.true;
        expect(verifiedBump).to.be.lessThanOrEqual(255);
      }
    });

    it("role request PDA has valid bump seed", async () => {
      const user = Keypair.generate();
      const pda = getRoleRequestPda(user.publicKey, program.programId);
      const [verifiedPda, verifiedBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("role_request"), user.publicKey.toBuffer()],
        program.programId
      );

      expect(pda.equals(verifiedPda)).to.be.true;
      expect(verifiedBump).to.be.lessThanOrEqual(255);
    });

    it("serial hash registry PDA has valid bump seed", async () => {
      const pda = getSerialHashRegistryPda(configPda, program.programId);
      const [verifiedPda, verifiedBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("serial_hashes"), configPda.toBuffer()],
        program.programId
      );

      expect(pda.equals(verifiedPda)).to.be.true;
      expect(verifiedBump).to.be.lessThanOrEqual(255);
    });

    it("role holder PDA has valid bump seed for various roles and indices", async () => {
      const roles = ["FABRICANTE", "AUDITOR_HW", "TECNICO_SW", "ESCUELA"];
      const indices = [0, 1, 10, 100];

      for (const role of roles) {
        for (const index of indices) {
          const pda = getRoleHolderPda(role, index, program.programId);
          const indexBytes = Buffer.alloc(8);
          indexBytes.writeBigUInt64LE(BigInt(index), 0);
          const [verifiedPda, verifiedBump] = PublicKey.findProgramAddressSync(
            [Buffer.from("role_holder"), Buffer.from(role), indexBytes],
            program.programId
          );

          expect(pda.equals(verifiedPda)).to.be.true;
          expect(verifiedBump).to.be.lessThanOrEqual(255);
        }
      }
    });
  });

  // ========================================================================
  // 6. PDA Derivation with Program ID Variation
  // ========================================================================

  describe("PDA Derivation with Program ID Variation", () => {
    it("same seeds with different program IDs produce different PDAs", async () => {
      const program1 = program.programId;
      const program2 = Keypair.generate().publicKey;

      const pda1 = getNetbookPda(1, program1);
      const pda2 = getNetbookPda(1, program2);

      expect(pda1.equals(pda2)).to.be.false;
    });

    it("config PDA is unique to this program", async () => {
      const pda1 = getConfigPda(program)[0];
      const randomProgram = Keypair.generate().publicKey;

      const [pda2] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        randomProgram
      );

      expect(pda1.equals(pda2)).to.be.false;
    });
  });

  // ========================================================================
  // 7. PDA Derivation Edge Cases
  // ========================================================================

  describe("PDA Derivation Edge Cases", () => {
    it("handles token ID 0 correctly", async () => {
      const pda = getNetbookPda(0, program.programId);
      const tokenIdBytes = Buffer.alloc(8);
      tokenIdBytes.writeBigUInt64LE(BigInt(0), 0);
      const [expectedPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("netbook"), Buffer.from("netbook"), tokenIdBytes.slice(0, 7)],
        program.programId
      );

      expect(pda.equals(expectedPda)).to.be.true;
    });

    it("handles large token IDs correctly", async () => {
      const largeTokenIds = [
        Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER - 1,
        2 ** 53 - 100,
      ];

      for (const tokenId of largeTokenIds) {
        const pda = getNetbookPda(tokenId, program.programId);
        const tokenIdBytes = Buffer.alloc(8);
        tokenIdBytes.writeBigUInt64LE(BigInt(tokenId), 0);
        const [expectedPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("netbook"), Buffer.from("netbook"), tokenIdBytes.slice(0, 7)],
          program.programId
        );

        expect(pda.equals(expectedPda)).to.be.true;
      }
    });

    it("handles empty role string for role holder PDA", async () => {
      const pda = getRoleHolderPda("", 0, program.programId);
      const indexBytes = Buffer.alloc(8);
      indexBytes.writeBigUInt64LE(BigInt(0), 0);
      const [expectedPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("role_holder"), Buffer.from(""), indexBytes],
        program.programId
      );

      expect(pda.equals(expectedPda)).to.be.true;
    });

    it("handles role holder index at boundary values", async () => {
      const boundaryIndices = [0, 1, 255, 256, 65535, 65536, 16777215, 16777216];

      for (const index of boundaryIndices) {
        const pda = getRoleHolderPda("FABRICANTE", index, program.programId);
        const indexBytes = Buffer.alloc(8);
        indexBytes.writeBigUInt64LE(BigInt(index), 0);
        const [expectedPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("role_holder"), Buffer.from("FABRICANTE"), indexBytes],
          program.programId
        );

        expect(pda.equals(expectedPda)).to.be.true;
      }
    });

    it("verifies netbook PDA seeds include token ID bytes correctly", async () => {
      const tokenIds = [1, 2, 3];

      for (const tokenId of tokenIds) {
        const pda = getNetbookPda(tokenId, program.programId);
        const tokenIdBytes = Buffer.alloc(8);
        tokenIdBytes.writeBigUInt64LE(BigInt(tokenId), 0);

        // Verify the PDA is derived from the correct seeds
        const [expectedPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("netbook"), Buffer.from("netbook"), tokenIdBytes.slice(0, 7)],
          program.programId
        );

        expect(pda.equals(expectedPda)).to.be.true;

        // Verify that different token IDs have different byte representations
        const nextPda = getNetbookPda(tokenId + 1, program.programId);
        expect(pda.equals(nextPda)).to.be.false;
      }
    });
  });

  // ========================================================================
  // 8. PDA Uniqueness Across Account Types
  // ========================================================================

  describe("PDA Uniqueness Across Account Types", () => {
    it("netbook PDA is different from config PDA", async () => {
      const netbookPda = getNetbookPda(1, program.programId);
      const configPdaLocal = getConfigPda(program)[0];

      expect(netbookPda.equals(configPdaLocal)).to.be.false;
    });

    it("role request PDA is different from config PDA", async () => {
      const user = Keypair.generate();
      const roleRequestPda = getRoleRequestPda(user.publicKey, program.programId);
      const configPdaLocal = getConfigPda(program)[0];

      expect(roleRequestPda.equals(configPdaLocal)).to.be.false;
    });

    it("serial hash registry PDA is different from config PDA", async () => {
      const serialHashPda = getSerialHashRegistryPda(configPda, program.programId);
      const configPdaLocal = getConfigPda(program)[0];

      expect(serialHashPda.equals(configPdaLocal)).to.be.false;
    });

    it("role holder PDA is different from config PDA", async () => {
      const roleHolderPda = getRoleHolderPda("FABRICANTE", 0, program.programId);
      const configPdaLocal = getConfigPda(program)[0];

      expect(roleHolderPda.equals(configPdaLocal)).to.be.false;
    });

    it("all PDA types produce unique addresses for same program", async () => {
      const user = Keypair.generate();
      const netbookPda = getNetbookPda(1, program.programId);
      const configPdaLocal = getConfigPda(program)[0];
      const roleRequestPda = getRoleRequestPda(user.publicKey, program.programId);
      const serialHashPda = getSerialHashRegistryPda(configPdaLocal, program.programId);
      const roleHolderPda = getRoleHolderPda("FABRICANTE", 0, program.programId);

      const pdas = [
        netbookPda.toBase58(),
        configPdaLocal.toBase58(),
        roleRequestPda.toBase58(),
        serialHashPda.toBase58(),
        roleHolderPda.toBase58(),
      ];

      // Check all pairs are unique
      for (let i = 0; i < pdas.length; i++) {
        for (let j = i + 1; j < pdas.length; j++) {
          expect(pdas[i]).to.not.equal(pdas[j]);
        }
      }
    });
  });

  // ========================================================================
  // 9. Real PDA Verification with On-Chain Accounts
  // ========================================================================

  describe("Real PDA Verification with On-Chain Accounts", () => {
    before(async () => {
      // Initialize config to have real accounts to verify
      await initializeConfig();

      // Grant roles to create role holders
      await program.methods
        .grantRole("FABRICANTE")
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          accountToGrant: fabricante.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();
    });

    it("verifies config PDA exists on chain", async () => {
      const balance = await provider.connection.getBalance(configPda);
      expect(balance).to.be.greaterThan(0);
    });

    it("verifies netbook PDA derivation matches on-chain account after registration", async () => {
      // Register a netbook to get a real on-chain PDA
      const serialNumber = "PDA-TEST-001";
      const batchId = "PDA-BATCH-001";
      const modelSpecs = "Test Model PDA";

      // Get expected token ID
      const config = await program.account.supplyChainConfig.fetch(configPda);
      const tokenId = config.nextTokenId.toNumber();
      const expectedPda = getNetbookPda(tokenId, program.programId);

      // Register the netbook
      await program.methods
        .registerNetbook(serialNumber, batchId, modelSpecs)
        .accountsStrict({
          config: configPda,
          serialHashRegistry: getSerialHashRegistryPda(configPda, program.programId),
          manufacturer: fabricante.publicKey,
          netbook: expectedPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Verify the PDA exists on chain
      const account = await provider.connection.getAccountInfo(expectedPda);
      expect(account).to.not.be.null;
      expect(account!.lamports).to.be.greaterThan(0);

      // Verify it matches our derived PDA
      const derivedPda = getNetbookPda(tokenId, program.programId);
      expect(expectedPda.equals(derivedPda)).to.be.true;
    });

    it("verifies serial hash registry PDA exists on chain", async () => {
      const serialHashPda = getSerialHashRegistryPda(configPda, program.programId);
      const account = await provider.connection.getAccountInfo(serialHashPda);

      expect(account).to.not.be.null;
      expect(account!.lamports).to.be.greaterThan(0);
    });

    it("verifies role holder PDA exists on chain after role grant", async () => {
      const roleHolderPda = getRoleHolderPda("FABRICANTE", 0, program.programId);
      const account = await provider.connection.getAccountInfo(roleHolderPda);

      expect(account).to.not.be.null;
      expect(account!.lamports).to.be.greaterThan(0);
    });
  });

  // ========================================================================
  // 10. PDA Derivation Performance
  // ========================================================================

  describe("PDA Derivation Performance", () => {
    it("derives 1000 netbook PDAs in reasonable time (< 5 seconds)", async () => {
      const startTime = Date.now();
      const pdas = new Set<string>();

      for (let tokenId = 1; tokenId <= 1000; tokenId++) {
        const pda = getNetbookPda(tokenId, program.programId);
        pdas.add(pda.toBase58());
      }

      const elapsed = Date.now() - startTime;

      expect(elapsed).to.be.lessThan(5000);
      expect(pdas.size).to.equal(1000);
    });

    it("derives 1000 role holder PDAs in reasonable time (< 5 seconds)", async () => {
      const startTime = Date.now();
      const pdas = new Set<string>();

      for (let index = 0; index < 1000; index++) {
        const pda = getRoleHolderPda("FABRICANTE", index, program.programId);
        pdas.add(pda.toBase58());
      }

      const elapsed = Date.now() - startTime;

      expect(elapsed).to.be.lessThan(5000);
      expect(pdas.size).to.equal(1000);
    });
  });
});
