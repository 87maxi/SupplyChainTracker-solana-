/**
 * Deployer PDA Integration Tests
 *
 * Tests for the PDA-first deployment architecture:
 * - fund_deployer: Fund the deployer PDA for account creation
 * - initialize with deployer PDA: Initialize config without external signer
 * - close_deployer: Close deployer PDA and reclaim funds
 *
 * This replaces the previous pattern that required an external initializer signer.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ScSolana } from "../target/types/sc_solana";
import { expect } from "chai";
import { Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("Deployer PDA Architecture", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  let program: Program<ScSolana>;
  let funder: Keypair;

  // Deployer PDA
  const DEPLOYER_SEED = Buffer.from("deployer");
  let deployerPda: anchor.web3.PublicKey;
  let deployerBump: number;

  // Config PDA
  let configPda: anchor.web3.PublicKey;
  let configBump: number;

  // Serial Hash Registry PDA
  let serialHashRegistryPda: anchor.web3.PublicKey;

  // Admin PDA
  let adminPda: anchor.web3.PublicKey;

  before(async () => {
    // Load program
    if (anchor.workspace.scSolana) {
      program = anchor.workspace.scSolana as Program<ScSolana>;
    } else {
      const idl = require("../target/idl/sc_solana.json");
      const programIdStr = idl.address || "7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN";
      program = new anchor.Program({ ...idl, address: programIdStr }, provider);
    }

    // Calculate PDAs
    [deployerPda, deployerBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [DEPLOYER_SEED],
      program.programId
    );

    [configPda, configBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [serialHashRegistryPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("serial_hashes"), configPda.toBuffer()],
      program.programId
    );

    [adminPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), configPda.toBuffer()],
      program.programId
    );

    // Create funder account
    funder = Keypair.generate();

    // Airdrop SOL to funder (need enough for 10 SOL transfer + rent)
    const airdropTx = await provider.connection.requestAirdrop(
      funder.publicKey,
      15 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTx, "confirmed");
  });

  describe("fund_deployer", () => {
    it("should create and fund the deployer PDA", async () => {
      const amount = new anchor.BN(10 * LAMPORTS_PER_SOL); // 10 SOL

      // Use (program.methods as any) to bypass IDL type checking until anchor build regenerates types
      const tx = await (program.methods as any)
        .fundDeployer(amount)
        .accounts({
          deployer: deployerPda,
          funder: funder.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([funder])
        .rpc();

      await provider.connection.confirmTransaction(tx, "confirmed");

      // Verify deployer PDA exists by fetching account info
      const deployerInfo = await provider.connection.getAccountInfo(deployerPda);
      expect(deployerInfo).to.not.be.null;
      expect(deployerInfo!.owner.toBase58()).to.equal(program.programId.toBase58());

      console.log(`✅ Deployer PDA created at: ${deployerPda.toBase58()}`);
      console.log(`✅ Deployer bump: ${deployerBump}`);
    });

    it("should add more funds to existing deployer PDA", async () => {
      const additionalAmount = new anchor.BN(5 * LAMPORTS_PER_SOL);

      const tx = await (program.methods as any)
        .fundDeployer(additionalAmount)
        .accounts({
          deployer: deployerPda,
          funder: funder.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([funder])
        .rpc();

      await provider.connection.confirmTransaction(tx, "confirmed");

      const deployerInfo = await provider.connection.getAccountInfo(deployerPda);
      expect(deployerInfo).to.not.be.null;

      console.log(`✅ Additional funds added to deployer PDA`);
    });
  });

  describe("initialize with deployer PDA", () => {
    it("should initialize config using deployer PDA (no external signer)", async () => {
      const tx = await (program.methods as any)
        .initialize()
        .accounts({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          admin: adminPda,
          deployer: deployerPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await provider.connection.confirmTransaction(tx, "confirmed");

      // Verify config was created
      const configInfo = await provider.connection.getAccountInfo(configPda);
      expect(configInfo).to.not.be.null;
      expect(configInfo!.owner.toBase58()).to.equal(program.programId.toBase58());

      // Verify serial hash registry was created
      const registryInfo = await provider.connection.getAccountInfo(serialHashRegistryPda);
      expect(registryInfo).to.not.be.null;
      expect(registryInfo!.owner.toBase58()).to.equal(program.programId.toBase58());

      console.log(`✅ Config initialized at: ${configPda.toBase58()}`);
      console.log(`✅ Admin PDA: ${adminPda.toBase58()}`);
      console.log(`✅ Serial Hash Registry: ${serialHashRegistryPda.toBase58()}`);
    });

    it("should fail to initialize again (already exists)", async () => {
      try {
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
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).to.include("already been initialized");
        console.log("✅ Correctly rejected duplicate initialization");
      }
    });
  });

  describe("close_deployer", () => {
    it("should close deployer PDA and transfer remaining funds", async () => {
      const deployerBalanceBefore = await provider.connection.getBalance(deployerPda);
      expect(deployerBalanceBefore).to.be.greaterThan(0);

      const tx = await (program.methods as any)
        .closeDeployer()
        .accounts({
          deployer: deployerPda,
          admin: adminPda,
        })
        .rpc();

      await provider.connection.confirmTransaction(tx, "confirmed");

      // Verify deployer PDA is closed
      const deployerBalanceAfter = await provider.connection.getBalance(deployerPda);
      expect(deployerBalanceAfter).to.equal(0);

      console.log(`✅ Deployer PDA closed, ${deployerBalanceBefore / LAMPORTS_PER_SOL} SOL reclaimed`);
    });

    it("should fail to close non-existent deployer", async () => {
      try {
        await (program.methods as any)
          .closeDeployer()
          .accounts({
            deployer: deployerPda,
            admin: adminPda,
          })
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).to.match(/(does not exist|not found|Account does not exist)/i);
        console.log("✅ Correctly rejected close of non-existent deployer");
      }
    });
  });

  describe("PDA Derivation Consistency", () => {
    it("should derive consistent PDAs from program ID", async () => {
      // Verify deployer PDA derivation
      const [derivedDeployer, derivedDeployerBump] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [DEPLOYER_SEED],
          program.programId
        );
      expect(derivedDeployer.toBase58()).to.equal(deployerPda.toBase58());
      expect(derivedDeployerBump).to.equal(deployerBump);

      // Verify config PDA derivation
      const [derivedConfig, derivedConfigBump] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("config")],
          program.programId
        );
      expect(derivedConfig.toBase58()).to.equal(configPda.toBase58());
      expect(derivedConfigBump).to.equal(configBump);

      console.log("✅ All PDA derivations are consistent with program ID");
    });
  });
});
