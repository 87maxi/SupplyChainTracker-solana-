//! AuditHardware instruction context

use crate::events::HardwareAudited;
use crate::state::{Netbook, SupplyChainConfig};
use anchor_lang::prelude::*;

/// Hardware audit instruction
#[derive(Accounts)]
pub struct AuditHardware<'info> {
    #[account(mut)]
    pub netbook: Account<'info, Netbook>,
    #[account(
        mut,
        constraint = config.auditor_hw == auditor.key() @ crate::errors::SupplyChainError::Unauthorized
    )]
    pub config: Account<'info, SupplyChainConfig>,
    pub auditor: Signer<'info>,
}

/// Audit hardware on a netbook
/// State machine transition: Fabricada (0) -> HwAprobado (1) if passed
pub fn audit_hardware(
    ctx: Context<AuditHardware>,
    serial: String,
    passed: bool,
    report_hash: [u8; 32],
) -> Result<()> {
    let netbook = &mut ctx.accounts.netbook;

    // Verify serial matches
    if netbook.serial_number != serial {
        return Err(crate::SupplyChainError::InvalidInput.into());
    }

    // State machine validation: only from Fabricada state
    if netbook.state != crate::NetbookState::Fabricada as u8 {
        return Err(crate::SupplyChainError::InvalidStateTransition.into());
    }

    netbook.hw_auditor = ctx.accounts.auditor.key();
    netbook.hw_integrity_passed = passed;
    netbook.hw_report_hash = report_hash;

    if passed {
        netbook.state = crate::NetbookState::HwAprobado as u8;
    }

    emit!(HardwareAudited {
        serial_number: netbook.serial_number.clone(),
        passed,
    });

    Ok(())
}
