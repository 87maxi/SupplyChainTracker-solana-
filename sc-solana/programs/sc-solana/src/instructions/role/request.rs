//! RequestRole instruction context

use anchor_lang::prelude::*;
use crate::state::{SupplyChainConfig, RoleRequest};
use crate::events::{RoleRequested, RoleRequestUpdated};


/// NOTE: PDA seed uses [b"role_request", user.key().as_ref()] which limits
/// each user to ONE role request at a time. This is a design limitation of
/// the Anchor framework.
///
/// Workaround: Users should call `reject_role_request` first, then create
/// a new request for the different role. Or, the admin can manually approve
/// multiple roles via `grant_role`.
#[derive(Accounts)]
pub struct RequestRole<'info> {
    #[account(mut)]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(
        init,
        payer = user,
        space = 8 + 8 + 32 + 4 + 256 + 1 + 8,
        seeds = [b"role_request", user.key().as_ref()],
        bump
    )]
    pub role_request: Account<'info, RoleRequest>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveRoleRequest<'info> {
    #[account(mut, has_one = admin)]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub role_request: Account<'info, RoleRequest>,
}

#[derive(Accounts)]
pub struct RejectRoleRequest<'info> {
    #[account(mut, has_one = admin)]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub role_request: Account<'info, RoleRequest>,
}

/// Request a role
pub fn request_role(ctx: Context<RequestRole>, role: String) -> Result<()> {
    let config = &mut ctx.accounts.config;

    config.role_requests_count += 1;

    let role_request = &mut ctx.accounts.role_request;
    role_request.id = config.role_requests_count;
    role_request.user = ctx.accounts.user.key();
    role_request.role = role.clone();
    role_request.status = crate::RequestStatus::Pending as u8;
    role_request.timestamp = Clock::get()?.unix_timestamp as u64;

    emit!(RoleRequested {
        id: config.role_requests_count,
        user: role_request.user,
        role,
    });
    Ok(())
}

/// Approve a pending role request
pub fn approve_role_request(ctx: Context<ApproveRoleRequest>) -> Result<()> {
    let role_request = &mut ctx.accounts.role_request;
    role_request.status = crate::RequestStatus::Approved as u8;

    // Grant the role automatically on approval
    let config = &mut ctx.accounts.config;
    let user = role_request.user;
    match role_request.role.as_str() {
        crate::FABRICANTE_ROLE => config.fabricante = user,
        crate::AUDITOR_HW_ROLE => config.auditor_hw = user,
        crate::TECNICO_SW_ROLE => config.tecnico_sw = user,
        crate::ESCUELA_ROLE => config.escuela = user,
        _ => return Err(crate::SupplyChainError::RoleNotFound.into()),
    }

    emit!(RoleRequestUpdated {
        id: role_request.id,
        status: role_request.status,
    });
    Ok(())
}

/// Reject a pending role request
pub fn reject_role_request(ctx: Context<RejectRoleRequest>) -> Result<()> {
    let role_request = &mut ctx.accounts.role_request;
    role_request.status = crate::RequestStatus::Rejected as u8;

    emit!(RoleRequestUpdated {
        id: role_request.id,
        status: role_request.status,
    });
    Ok(())
}
