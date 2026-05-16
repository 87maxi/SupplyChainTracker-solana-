/**
 * Initialize SupplyChainTracker configuration on localnet
 * Creates Config, SerialHashRegistry accounts and derives Admin PDA
 */

import * as anchor from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load IDL
const idlPath = join(__dirname, "target/idl/sc_solana.json");
const idl = JSON.parse(readFileSync(idlPath, "utf-8"));

// Program ID
const PROGRAM_ID = new PublicKey("BTSWNY97FaxeJrUNSq399tRbfMz68iaaY3csJwT9hQQW");

// Load keypairs
function loadKeypair(path: string): Keypair {
  const home = process.env.HOME || "/home/maxi";
  const resolved = path.replace("~", home);
  if (!existsSync(resolved)) {
    throw new Error(`Keypair file not found: ${resolved}`);
  }
  const secret = JSON.parse(readFileSync(resolved, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(secret));
}

async function main() {
  console.log("=== SupplyChainTracker Initialization ===\n");

  // Connect to localnet
  const localnet = "http://localhost:8899";
  const wallet = new anchor.Wallet(loadKeypair("~/.config/solana/id.json"));
  const provider = new anchor.AnchorProvider(
    new anchor.web3.Connection(localnet),
    wallet,
    { commitment: "confirmed" }
  );

  anchor.setProvider(provider);

  console.log("Provider connected to:", localnet);
  console.log("Deployer wallet:", provider.wallet.publicKey.toBase58());

  // Check balance
  const balance = await provider.connection.getBalance(provider.wallet.publicKey);
  console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL\n");

  // Create program instance
  const program = new anchor.Program(idl, { connection: provider.connection });
  console.log("Program ID:", program.programId.toBase58());

  // Derive PDAs
  // Config PDA: [b"config"]
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
  console.log("Config PDA:", configPda.toBase58());

  // Serial Hash Registry PDA: [b"serial_hashes", configPda]
  const [serialHashPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("serial_hashes"), configPda.toBytes()],
    PROGRAM_ID
  );
  console.log("Serial Hash Registry PDA:", serialHashPda.toBase58());

  // Admin PDA: [b"admin", configPda]
  const [adminPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("admin"), configPda.toBytes()],
    PROGRAM_ID
  );
  console.log("Admin PDA:", adminPda.toBase58());

  // Deployer PDA: [b"deployer"]
  const [deployerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("deployer")],
    PROGRAM_ID
  );
  console.log("Deployer PDA:", deployerPda.toBase58());

  // Step 1: Fund deployer PDA (if not already funded)
  console.log("\n--- Step 1: Fund Deployer PDA ---");
  const deployerBalance = await provider.connection.getBalance(deployerPda);
  console.log("Deployer balance:", deployerBalance / LAMPORTS_PER_SOL, "SOL");

  if (deployerBalance < 0.1 * LAMPORTS_PER_SOL) {
    const fundTx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: deployerPda,
        lamports: 2 * LAMPORTS_PER_SOL,
        space: 0,
        programId: PROGRAM_ID,
      })
    );

    const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash();
    fundTx.recentBlockhash = blockhash;
    fundTx.feePayer = provider.wallet.publicKey;

    const sig = await provider.sendAndConfirm(fundTx, [], { skipPreflight: true });
    console.log("Fund transaction:", sig);
  } else {
    console.log("Deployer already has sufficient funds");
  }

  // Step 2: Initialize
  console.log("\n--- Step 2: Initialize ---");

  // Check if config already exists
  const configAccount = await provider.connection.getAccountInfo(configPda);
  if (configAccount && configAccount.data.length > 0) {
    console.log("Config already initialized!");
    console.log("Config account data length:", configAccount.data.length);
  } else {
    const initIx = await program.methods.initialize().accounts({
      config: configPda,
      serialHashRegistry: serialHashPda,
      admin: adminPda,
      deployer: deployerPda,
      funder: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    } as any).instruction();

    const initTx = new Transaction().add(initIx);
    const { blockhash } = await provider.connection.getLatestBlockhash();
    initTx.recentBlockhash = blockhash;
    initTx.feePayer = provider.wallet.publicKey;

    const sig = await provider.sendAndConfirm(initTx, [], { skipPreflight: true });
    console.log("Initialize transaction:", sig);
    console.log("Initialized successfully!");
  }

  // Final state
  console.log("\n=== Initialization Complete ===");
  console.log("Config:", configPda.toBase58());
  console.log("Serial Hash Registry:", serialHashPda.toBase58());
  console.log("Admin:", adminPda.toBase58());
  console.log("Deployer:", deployerPda.toBase58());
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
