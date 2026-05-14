#!/usr/bin/env ts-node
/**
 * Local initialization script for surfpool simnet
 * Initializes config and grants roles after program deployment
 */
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import { ScSolana } from "../target/types/sc_solana";

async function main() {
  // Load wallet
  const keypairPath = os.homedir() + "/.config/solana/id.json";
  const keypairBytes = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const admin = Keypair.fromSecretKey(new Uint8Array(keypairBytes));

  const connection = new anchor.web3.Connection("http://localhost:8899", "confirmed");
  const wallet = new anchor.Wallet(admin);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  // Load program
  const idl = JSON.parse(fs.readFileSync("./target/idl/sc_solana.json", "utf-8"));
  const program = new Program<ScSolana>(idl, provider);

  console.log("Admin wallet:", admin.publicKey.toBase58());
  console.log("Program ID:", program.programId.toBase58());

  // Check if config already exists
  const [configPda] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("config")],
    program.programId
  );

  try {
    const existing = await program.account.supplyChainConfig.fetchNullable(configPda);
    if (existing) {
      console.log("Config already initialized at:", configPda.toBase58());
      console.log("Admin holder:", existing.admin.toBase58());
      return;
    }
  } catch (e) {
    console.log("No existing config found, initializing...");
  }

  // Step 1: Fund deployer PDA
  console.log("\nStep 1: Funding deployer PDA...");
  const fundAmount = 20 * anchor.web3.LAMPORTS_PER_SOL;
  const fundTx = await (program.methods as any)
    .fundDeployer(new anchor.BN(fundAmount))
    .accounts({
      funder: admin.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([admin])
    .rpc();
  console.log("Fund tx:", fundTx);

  // Step 2: Initialize config
  console.log("\nStep 2: Initializing config...");
  const initTx = await (program.methods as any)
    .initialize()
    .accounts({
      funder: admin.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([admin])
    .rpc({ skipPreflight: true, maxRetries: 5 });
  console.log("Init tx:", initTx);

  // Verify config
  const config = await program.account.supplyChainConfig.fetch(configPda);
  console.log("\nConfig initialized:");
  console.log("  Admin:", config.admin.toBase58());
  console.log("  Fabricante:", config.fabricante.toBase58());
  console.log("  Auditor HW:", config.auditorHw.toBase58());
  console.log("  Tecnico SW:", config.tecnicoSw.toBase58());
  console.log("  Escuela:", config.escuela.toBase58());

  // Step 3: Grant roles to role keypairs
  console.log("\nStep 3: Granting roles...");
  const keypairsDir = "./config/keypairs";

  const roles = [
    { name: "fabricante", role: "FABRICANTE" },
    { name: "auditor_hw", role: "AUDITOR_HW" },
    { name: "tecnico_sw", role: "TECNICO_SW" },
    { name: "escuela", role: "ESCUELA" },
  ];

  for (const roleInfo of roles) {
    try {
      const roleKeyPath = `${keypairsDir}/${roleInfo.name}.json`;
      const roleKeyBytes = JSON.parse(fs.readFileSync(roleKeyPath, "utf-8"));
      const roleKeypair = Keypair.fromSecretKey(new Uint8Array(roleKeyBytes));

      const tx = await (program.methods as any)
        .grantRole(roleInfo.role)
        .accounts({
          config: configPda,
          accountToGrant: roleKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin, roleKeypair])
        .rpc();

      console.log(`  Granted ${roleInfo.role} to ${roleKeypair.publicKey.toBase58()} (tx: ${tx})`);
    } catch (e: any) {
      console.log(`  Error granting ${roleInfo.role}: ${e.message}`);
    }
  }

  console.log("\n✅ Local initialization complete!");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
