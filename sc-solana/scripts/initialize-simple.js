const anchor = require('@coral-xyz/anchor');
const { SystemProgram } = require('@solana/web3.js');
const fs = require('fs');
const os = require('os');
const path = require('path');

async function main() {
  // Setup provider
  const walletPath = path.join(os.homedir(), '.config/solana/id.json');
  const keypairBytes = new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8')));
  const wallet = new anchor.Wallet(anchor.web3.Keypair.fromSecretKey(keypairBytes));
  
  const connection = new anchor.web3.Connection('http://localhost:8899', 'confirmed');
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
  anchor.setProvider(provider);
  
  // Load IDL and create program
  const idl = JSON.parse(fs.readFileSync('./target/idl/sc_solana.json', 'utf8'));
  const programId = new anchor.web3.PublicKey(idl.address);
  const program = new anchor.Program(idl, programId, provider);
  
  // Derive PDAs
  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId
  );
  
  const [serialHashesPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('serial_hashes'), configPda.toBuffer()],
    program.programId
  );
  
  console.log('Program ID:', programId.toBase58());
  console.log('Config PDA:', configPda.toBase58());
  console.log('Serial Hashes PDA:', serialHashesPda.toBase58());
  console.log('Admin:', provider.wallet.publicKey.toBase58());
  
  // Check if config already exists
  const configAccount = await connection.getAccountInfo(configPda);
  if (configAccount) {
    console.log('Config account already exists!');
    return;
  }
  
  console.log('Initializing config...');
  
  try {
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
      console.log('SUCCESS: Config account created!');
      console.log('  Lamports:', newConfig.lamports);
      console.log('  Data size:', newConfig.data.length);
    }
  } catch (err) {
    console.error('Transaction failed:', err.message);
    if (err.logs) {
      console.log('Logs:');
      err.logs.forEach(l => console.log('  ', l));
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
