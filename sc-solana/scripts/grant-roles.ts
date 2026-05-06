import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';

type SupplyChainTracker = any;

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.ScSolana as Program<SupplyChainTracker>;
  
  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId
  );
  
  // Create fabricante keypair
  const fabricanteKeypair = anchor.web3.Keypair.generate();
  console.log('Fabricante address:', fabricanteKeypair.publicKey.toBase58());
  
  // Airdrop to fabricante
  const airdropSig = await provider.connection.requestAirdrop(
    fabricanteKeypair.publicKey,
    10000000000 // 10 SOL
  );
  await provider.connection.confirmTransaction(airdropSig);
  console.log('Airdrop completed for fabricante');
  
  console.log('Granting FABRICANTE role...');
  
  const tx = await program.methods.grantRole('FABRICANTE')
    .accounts({
      config: configPda,
      admin: provider.wallet.publicKey,
      accountToGrant: fabricanteKeypair.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([fabricanteKeypair])
    .rpc();
    
  console.log('Grant role signature:', tx);
  console.log('\n=== Deployment Complete ===');
  console.log('Program ID:', program.programId.toBase58());
  console.log('Config PDA:', configPda.toBase58());
  console.log('Admin:', provider.wallet.publicKey.toBase58());
  console.log('Fabricante:', fabricanteKeypair.publicKey.toBase58());
}

main().catch(console.error);
