use anchor_lang::prelude::*;

declare_id!("CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS");

#[program]
pub mod sc_solana {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
