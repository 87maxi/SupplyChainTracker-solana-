//! AssignToStudent instruction context

use crate::events::NetbookAssigned;
use crate::state::{Netbook, SupplyChainConfig};
use anchor_lang::prelude::*;

/// Assign netbook to student instruction
#[derive(Accounts)]
pub struct AssignToStudent<'info> {
    #[account(mut)]
    pub netbook: Account<'info, Netbook>,
    #[account(
        mut,
        seeds = [b"config"],
        bump,
        constraint = config.escuela == school.key() @ crate::errors::SupplyChainError::Unauthorized
    )]
    pub config: Account<'info, SupplyChainConfig>,
    pub school: Signer<'info>,
}

/// Assign netbook to a student (distribution)
/// State machine transition: SwValidado (2) -> Distribuida (3)
pub fn assign_to_student(
    ctx: Context<AssignToStudent>,
    serial: String,
    school_hash: [u8; 32],
    student_hash: [u8; 32],
) -> Result<()> {
    let netbook = &mut ctx.accounts.netbook;

    // Verify serial matches
    if netbook.serial_number != serial {
        return Err(crate::SupplyChainError::InvalidInput.into());
    }

    // State machine validation: only from SwValidado state
    if netbook.state != crate::NetbookState::SwValidado as u8 {
        return Err(crate::SupplyChainError::InvalidStateTransition.into());
    }

    netbook.destination_school_hash = school_hash;
    netbook.student_id_hash = student_hash;
    netbook.distribution_timestamp = Clock::get()?.unix_timestamp as u64;
    netbook.state = crate::NetbookState::Distribuida as u8;

    emit!(NetbookAssigned {
        serial_number: netbook.serial_number.clone(),
    });

    Ok(())
}
