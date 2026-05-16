/**
 * Deployer PDA Integration Tests
 *
 * Tests for the PDA-first deployment architecture:
 * - fund_deployer: Fund the deployer PDA for account creation
 * - initialize with deployer PDA: Initialize config without external signer
 * - close_deployer: Close deployer PDA and reclaim funds
 *
 * This replaces the previous pattern that required an external initializer signer.
 *
 * Migrated from @coral-xyz/anchor to Codama-generated client (Issue #209).
 */

import { expect } from "chai";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createSignerFromKeyPair } from "./test-helpers";
import {
  createTestClient,
  getConfigPdaAddress,
  getSerialHashRegistryPdaAddress,
  getAdminPdaAddress,
  getDeployerPdaAddress,
  fundKeypair,
  toAddress,
  type TestClient,
} from "./test-helpers";

const SYSTEM_PROGRAM = "11111111111111111111111111111111" as const;

describe("Deployer PDA Architecture", () => {
  let client: TestClient;
  let funder: Keypair;

  // PDA addresses (typed as Address)
  let deployerPda: string;
  let configPda: string;
  let serialHashRegistryPda: string;
  let adminPda: string;

  before(async () => {
    // Create funder account
    funder = Keypair.generate();

    // Create test client
    client = await createTestClient("http://localhost:8899", funder);

    // Calculate PDAs
    configPda = await getConfigPdaAddress();
    deployerPda = await getDeployerPdaAddress();
    serialHashRegistryPda = await getSerialHashRegistryPdaAddress(toAddress(configPda));
    adminPda = await getAdminPdaAddress(toAddress(configPda));

    // Check if config already exists (from parallel test initialization)
    const existingConfig = await client.rpc.getAccountInfo(toAddress(configPda));
    if (existingConfig) {
      console.log("⚠️  Config already exists (from parallel tests) - deployer-pda tests will be skipped");
      (global as any).deployerPdaSkipped = true;
    } else {
      (global as any).deployerPdaSkipped = false;
    }
  });

  describe("fund_deployer", function () {
    it("should create and fund the deployer PDA", async function () {
      if ((global as any).deployerPdaSkipped) { this.skip(); return; }
      const amountSol = 10;
      const funderSigner = await createSignerFromKeyPair(funder);

      const tx = await client.scSolana.instructions.fundDeployer({
        deployer: toAddress(deployerPda),
        funder: funderSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        amount: BigInt(amountSol * LAMPORTS_PER_SOL),
      }).sendTransaction();

      console.log("Fund deployer TX:", tx);

      // Verify deployer PDA exists by fetching account info
      const deployerInfo = await client.rpc.getAccountInfo(toAddress(deployerPda));
      expect(deployerInfo).to.not.be.null;

      console.log(`✅ Deployer PDA created at: ${deployerPda}`);
    });

    it("should add more funds to existing deployer PDA", async function () {
      if ((global as any).deployerPdaSkipped) { this.skip(); return; }
      const additionalAmountSol = 5;
      const funderSigner = await createSignerFromKeyPair(funder);

      const tx = await client.scSolana.instructions.fundDeployer({
        deployer: toAddress(deployerPda),
        funder: funderSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
        amount: BigInt(additionalAmountSol * LAMPORTS_PER_SOL),
      }).sendTransaction();

      console.log("Additional funds TX:", tx);

      const deployerInfo = await client.rpc.getAccountInfo(toAddress(deployerPda));
      expect(deployerInfo).to.not.be.null;

      console.log(`✅ Additional funds added to deployer PDA`);
    });
  });

  describe("initialize with deployer PDA", function () {
    it("should initialize config using deployer PDA (no external signer)", async function () {
      if ((global as any).deployerPdaSkipped) { this.skip(); return; }
      const funderSigner = await createSignerFromKeyPair(funder);

      const tx = await client.scSolana.instructions.initialize({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        admin: toAddress(adminPda),
        deployer: toAddress(deployerPda),
        funder: funderSigner,
        systemProgram: toAddress(SYSTEM_PROGRAM),
      }).sendTransaction();

      console.log("Initialize TX:", tx);

      // Verify config was created
      const configInfo = await client.rpc.getAccountInfo(toAddress(configPda));
      expect(configInfo).to.not.be.null;

      // Verify serial hash registry was created
      const registryInfo = await client.rpc.getAccountInfo(toAddress(serialHashRegistryPda));
      expect(registryInfo).to.not.be.null;

      console.log(`✅ Config initialized at: ${configPda}`);
      console.log(`✅ Admin PDA: ${adminPda}`);
      console.log(`✅ Serial Hash Registry: ${serialHashRegistryPda}`);
    });

    it("should fail to initialize again (already exists)", async function () {
      if ((global as any).deployerPdaSkipped) { this.skip(); return; }
      const funderSigner = await createSignerFromKeyPair(funder);

      try {
        await client.scSolana.instructions.initialize({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          admin: toAddress(adminPda),
          deployer: toAddress(deployerPda),
          funder: funderSigner,
          systemProgram: toAddress(SYSTEM_PROGRAM),
        }).sendTransaction();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).to.include("already been initialized");
        console.log("✅ Correctly rejected duplicate initialization");
      }
    });
  });

  describe("close_deployer", function () {
    it("should close deployer PDA and transfer remaining funds", async function () {
      if ((global as any).deployerPdaSkipped) { this.skip(); return; }
      const deployerBalanceBefore = await client.rpc.getBalance(toAddress(deployerPda));
      expect(Number(deployerBalanceBefore)).to.be.greaterThan(0);

      const funderSigner = await createSignerFromKeyPair(funder);

      const tx = await client.scSolana.instructions.closeDeployer({
        config: toAddress(configPda),
        deployer: toAddress(deployerPda),
        admin: funderSigner,
      }).sendTransaction();

      console.log("Close deployer TX:", tx);

      // Verify deployer PDA is closed
      const deployerBalanceAfter = await client.rpc.getBalance(toAddress(deployerPda));
      expect(Number(deployerBalanceAfter)).to.equal(0);

      console.log(`✅ Deployer PDA closed, ${Number(deployerBalanceBefore / BigInt(LAMPORTS_PER_SOL))} SOL reclaimed`);
    });

    it("should fail to close non-existent deployer", async function () {
      if ((global as any).deployerPdaSkipped) { this.skip(); return; }
      const funderSigner = await createSignerFromKeyPair(funder);

      try {
        await client.scSolana.instructions.closeDeployer({
          config: toAddress(configPda),
          deployer: toAddress(deployerPda),
          admin: funderSigner,
        }).sendTransaction();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).to.match(/(does not exist|not found|Account does not exist|already been initialized)/i);
        console.log("✅ Correctly rejected close of non-existent deployer");
      }
    });
  });

  describe("PDA Derivation Consistency", () => {
    it("should derive consistent PDAs from program ID", async () => {
      // Verify deployer PDA derivation
      const derivedDeployer = await getDeployerPdaAddress();
      expect(derivedDeployer).to.equal(deployerPda);

      // Verify config PDA derivation
      const derivedConfig = await getConfigPdaAddress();
      expect(derivedConfig).to.equal(configPda);

      console.log("✅ All PDA derivations are consistent with program ID");
    });
  });
});
