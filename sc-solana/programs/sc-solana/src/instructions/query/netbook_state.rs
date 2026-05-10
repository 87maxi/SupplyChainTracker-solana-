//! QueryNetbookState instruction context

use crate::events::NetbookStateQuery;
use crate::state::Netbook;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct QueryNetbookState<'info> {
    pub netbook: Account<'info, Netbook>,
}

/// Query netbook state (view function for client-side data access)
pub fn query_netbook_state(ctx: Context<QueryNetbookState>, _serial: String) -> Result<()> {
    let netbook = &ctx.accounts.netbook;
    emit!(NetbookStateQuery {
        serial_number: netbook.serial_number.clone(),
        state: netbook.state,
        token_id: netbook.token_id,
        exists: netbook.exists,
    });
    Ok(())
}
