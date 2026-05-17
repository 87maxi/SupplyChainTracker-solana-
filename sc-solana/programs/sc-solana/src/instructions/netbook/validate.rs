//! ValidateSoftware instruction context

use crate::events::SoftwareValidated;
use crate::state::{Netbook, SupplyChainConfig};
use anchor_lang::prelude::*;

/// Software validation instruction
#[derive(Accounts)]
pub struct ValidateSoftware<'info> {
    #[account(mut)]
    pub netbook: Account<'info, Netbook>,
    #[account(
        mut,
        seeds = [b"config"],
        bump,
        constraint = config.tecnico_sw == technician.key() @ crate::errors::SupplyChainError::Unauthorized
    )]
    pub config: Account<'info, SupplyChainConfig>,
    pub technician: Signer<'info>,
}

/// Validate software on a netbook
/// State machine transition: HwAprobado (1) -> SwValidado (2) if passed
pub fn validate_software(
    ctx: Context<ValidateSoftware>,
    serial: String,
    os_version: String,
    passed: bool,
) -> Result<()> {
    // Validate bounded string
    if os_version.len() > 100 {
        return Err(crate::SupplyChainError::StringTooLong.into());
    }

    let netbook = &mut ctx.accounts.netbook;

    // Verify serial matches
    if netbook.serial_number != serial {
        return Err(crate::SupplyChainError::InvalidInput.into());
    }

    // State machine validation: only from HwAprobado state
    if netbook.state != crate::NetbookState::HwAprobado as u8 {
        return Err(crate::SupplyChainError::InvalidStateTransition.into());
    }

    netbook.os_version = os_version.clone();
    netbook.sw_technician = ctx.accounts.technician.key();
    netbook.sw_validation_passed = passed;

    if passed {
        netbook.state = crate::NetbookState::SwValidado as u8;
    }

    emit!(SoftwareValidated {
        serial_number: netbook.serial_number.clone(),
        os_version,
        passed,
    });

    Ok(())
}
