#!/usr/bin/env node
/**
 * Quick initialization script using @solana/web3.js directly
 * Calls fund_deployer and initialize through the program (with discriminators)
 */
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { homedir } from 'os';

const RPC_URL = 'http://localhost:8899';
const PROGRAM_ID = new PublicKey('7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb');

// Load admin keypair
const keypairPath = homedir() + '/.config/solana/id.json';
const admin = Keypair.fromSecretKey(new Uint8Array(JSON.parse(readFileSync(keypairPath, 'utf-8'))));
const connection = new Connection(RPC_URL, 'confirmed');

console.log('Admin:', admin.publicKey.toBase58());
console.log('Program:', PROGRAM_ID.toBase58());

// Derive PDAs
const [configPda] = await PublicKey.findProgramAddress([Buffer.from('config')], PROGRAM_ID);
const [deployerPda] = await PublicKey.findProgramAddress([Buffer.from('deployer')], PROGRAM_ID);
const [serialHashPda] = await PublicKey.findProgramAddress([Buffer.from('serial_hashes'), configPda.toBuffer()], PROGRAM_ID);
const [adminPda] = await PublicKey.findProgramAddress([Buffer.from('admin'), configPda.toBuffer()], PROGRAM_ID);

console.log('Config PDA:', configPda.toBase58());
console.log('Deployer PDA:', deployerPda.toBase58());
console.log('Serial Hash PDA:', serialHashPda.toBase58());
console.log('Admin PDA:', adminPda.toBase58());

// Check if already initialized
const existing = await connection.getAccountInfo(configPda);
if (existing) {
  console.log('Config already exists. Skipping initialization.');
  process.exit(0);
}

// Load IDL for discriminators
const idl = JSON.parse(readFileSync('./target/idl/sc_solana.json', 'utf-8'));

// Step 1: Call fund_deployer instruction (creates DeployerState + transfers SOL)
console.log('\nStep 1: Funding deployer PDA via fund_deployer instruction...');
const fundIxDef = idl.instructions.find(i => i.name === 'fund_deployer');
const fundDisc = new Uint8Array(fundIxDef.discriminator);
const fundAmount = 20 * LAMPORTS_PER_SOL;
const amountData = Buffer.alloc(8);
amountData.writeBigUInt64LE(BigInt(fundAmount));

const fundTx = new Transaction().add({
  keys: [
    { pubkey: deployerPda, isSigner: false, isWritable: true },
    { pubkey: admin.publicKey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  programId: PROGRAM_ID,
  data: Buffer.concat([Buffer.from(fundDisc), amountData]),
});

const fundSig = await connection.sendTransaction(fundTx, [admin], { skipPreflight: true, maxRetries: 5 });
console.log('Fund tx:', fundSig);
await connection.confirmTransaction(fundSig);

// Verify deployer was created
const deployerInfo = await connection.getAccountInfo(deployerPda);
if (!deployerInfo) {
  console.error('Deployer PDA was not created!');
  process.exit(1);
}
console.log('Deployer created, balance:', deployerInfo.lamports / LAMPORTS_PER_SOL, 'SOL');

// Step 2: Call initialize instruction
console.log('\nStep 2: Initializing config...');
const initIxDef = idl.instructions.find(i => i.name === 'initialize');
const initDisc = new Uint8Array(initIxDef.discriminator);

const initTx = new Transaction().add({
  keys: [
    { pubkey: configPda, isSigner: false, isWritable: true },
    { pubkey: serialHashPda, isSigner: false, isWritable: true },
    { pubkey: adminPda, isSigner: false, isWritable: false },
    { pubkey: deployerPda, isSigner: false, isWritable: true },
    { pubkey: admin.publicKey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  programId: PROGRAM_ID,
  data: Buffer.from(initDisc),
});

const initSig = await connection.sendTransaction(initTx, [admin], { skipPreflight: true, maxRetries: 5 });
console.log('Init tx:', initSig);
const initStatus = await connection.confirmTransaction(initSig);
if (initStatus.value.err) {
  console.error('Init failed:', initStatus.value.err);
  process.exit(1);
}

// Verify
const config = await connection.getAccountInfo(configPda);
if (config) {
  console.log('\n✅ Config initialized successfully!');
  console.log('  Owner:', config.owner.toBase58());
  console.log('  Data size:', config.data.length, 'bytes');
} else {
  console.log('\n❌ Config account still not found after init');
  process.exit(1);
}

// Step 3: Grant roles
console.log('\nStep 3: Granting roles...');
const keypairsDir = './config/keypairs';
const roles = [
  { name: 'fabricante', role: 'FABRICANTE', value: 0 },
  { name: 'auditor_hw', role: 'AUDITOR_HW', value: 1 },
  { name: 'tecnico_sw', role: 'TECNICO_SW', value: 2 },
  { name: 'escuela', role: 'ESCUELA', value: 3 },
];

const grantIxDef = idl.instructions.find(i => i.name === 'grant_role');
const grantDisc = new Uint8Array(grantIxDef.discriminator);

for (const roleInfo of roles) {
  try {
    const roleKeyPath = `${keypairsDir}/${roleInfo.name}.json`;
    const roleKeyBytes = JSON.parse(readFileSync(roleKeyPath, 'utf-8'));
    const roleKeypair = Keypair.fromSecretKey(new Uint8Array(roleKeyBytes));

    // Role PDA: [role_name_bytes, config]
    const [rolePda] = await PublicKey.findProgramAddress(
      [Buffer.from(roleInfo.role), configPda.toBuffer()],
      PROGRAM_ID
    );

    // Encode role enum as u64 (little-endian)
    const roleData = Buffer.alloc(8);
    roleData.writeUInt32LE(roleInfo.value);

    const tx = new Transaction().add({
      keys: [
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: rolePda, isSigner: false, isWritable: true },
        { pubkey: roleKeypair.publicKey, isSigner: false, isWritable: false },
        { pubkey: adminPda, isSigner: false, isWritable: false },
        { pubkey: deployerPda, isSigner: false, isWritable: true },
        { pubkey: admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: Buffer.concat([Buffer.from(grantDisc), roleData]),
    });

    const sig = await connection.sendTransaction(tx, [admin, roleKeypair], { skipPreflight: true, maxRetries: 5 });
    const status = await connection.confirmTransaction(sig);
    if (status.value.err) {
      console.error(`  ${roleInfo.role} failed:`, status.value.err);
    } else {
      console.log(`  ✅ ${roleInfo.role} granted to ${roleKeypair.publicKey.toBase58()}: ${sig}`);
    }
  } catch (e) {
    console.error(`  Error granting ${roleInfo.role}:`, e.message);
  }
}

console.log('\n✅ Initialization complete!');
