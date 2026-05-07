const anchor = require('@coral-xyz/anchor');
const { PublicKey, SystemProgram, Keypair } = require('@solana/web3.js');
const fs = require('fs');
const os = require('os');
const path = require('path');

async function main() {
  // Load wallet
  const walletPath = process.env.ANCHOR_WALLET || path.join(os.homedir(), '.config/solana/id.json');
  const walletJson = fs.readFileSync(walletPath, 'utf8');
  const keypairBytes = new Uint8Array(JSON.parse(walletJson));
  const keypair = Keypair.fromSecretKey(keypairBytes);
  
  // Setup connection to localnet
  const connection = new anchor.web3.Connection('http://localhost:8899', 'confirmed');
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(keypair), {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
  anchor.setProvider(provider);
  
  // Program ID
  const programId = new PublicKey('7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN');
  
  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    programId
  );
  
  const [serialHashesPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('serial_hashes'), configPda.toBuffer()],
    programId
  );
  
  console.log('Program ID:', programId.toBase58());
  console.log('Config PDA:', configPda.toBase58());
  console.log('Serial Hashes PDA:', serialHashesPda.toBase58());
  console.log('Admin:', provider.wallet.publicKey.toBase58());
  
  // Load IDL
  const idl = JSON.parse(fs.readFileSync('./target/idl/sc_solana.json', 'utf8'));
  
  // Create program instance
  const program = new anchor.Program(idl, programId, provider);
  
  // Check if config already exists
  const configAccount = await connection.getAccountInfo(configPda);
  if (configAccount) {
    console.log('Config account already exists!');
    return;
  }
  
  console.log('Initializing config...');
  
  const tx = await program.methods
    .initialize()
    .accounts({
      config: configPda,
      serialHashRegistry: serialHashesPda,
      admin: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  
  console.log('Initialize signature:', tx);
  
  // Verify
  const newConfig = await connection.getAccountInfo(configPda);
  if (newConfig) {
    console.log('Config account created successfully!');
    console.log('Lamports:', newConfig.lamports);
    console.log('Data size:', newConfig.data.length);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
