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
  
  const [serialHashesPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('serial_hashes'), configPda.toBuffer()],
    program.programId
  );
  
  console.log('Initializing config...');
  console.log('Config PDA:', configPda.toBase58());
  console.log('Serial Hashes PDA:', serialHashesPda.toBase58());
  
  const tx = await program.methods.initialize()
    .accounts({
      config: configPda,
      serialHashRegistry: serialHashesPda,
      admin: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
    
  console.log('Initialize signature:', tx);
}

main().catch(console.error);
