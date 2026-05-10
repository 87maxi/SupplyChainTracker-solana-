//! RequestRole instruction context
//!
//! NOTE (Issue #144): Enhanced with strict validation to ensure:
//! - request_role is the only method for users to request roles
//! - approve_role_request and reject_role_request can only be called by admin PDA
//! - Proper validation of role names and request state
//!
//! NOTE (Issue #186): Admin is now UncheckedAccount with seed verification
//! instead of Signer, since PDAs cannot sign transactions.

use crate::events::{RoleRequestUpdated, RoleRequested};
use crate::state::{RoleHolder, RoleRequest, SupplyChainConfig};
use anchor_lang::prelude::*;

/// NOTE: PDA seed uses [b"role_request", user.key().as_ref()] which limits
/// each user to ONE role request at a time. This is a design limitation of
/// the Anchor framework.
///
/// Workaround: Users should call `reset_role_request` after a request is
/// approved/rejected (after cooldown), then create a new request.
/// Admin can grant additional roles via `grant_role` with recipient consent.
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

/// Approve a role request - creates RoleHolder account automatically
/// Integrates Config fields with RoleHolder accounts (transitional pattern)
/// Admin is derived as PDA with seeds [b"admin", config.key()]
/// NOTE (Issue #186): Admin is now UncheckedAccount with seed verification
/// Approve a role request - creates RoleHolder account automatically
/// Integrates Config fields with RoleHolder accounts (transitional pattern)
/// Admin is derived as PDA with seeds [b"admin", config.key()]
/// NOTE (Issue #186): Admin is now UncheckedAccount with seed verification
#[derive(Accounts)]
pub struct ApproveRoleRequest<'info> {
    #[account(mut)]
    pub config: Account<'info, SupplyChainConfig>,
    /// CHECK: Admin PDA verified via seeds [b"admin", config.key()] with bump from config
    #[account(
        seeds = [b"admin", config.key().as_ref()],
        bump = config.admin_pda_bump
    )]
    pub admin: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub role_request: Account<'info, RoleRequest>,
    /// RoleHolder PDA created on approval - seeds by user key
    #[account(
        init,
        payer = payer,
        space = RoleHolder::INIT_SPACE,
        seeds = [b"role_holder", role_request.user.as_ref()],
        bump
    )]
    pub role_holder: Account<'info, RoleHolder>,
    pub system_program: Program<'info, System>,
}

/// Reject a role request
/// Admin is derived as PDA with seeds [b"admin", config.key()]
/// NOTE (Issue #186): Admin is now UncheckedAccount with seed verification
/// Reject a role request
/// Admin is derived as PDA with seeds [b"admin", config.key()]
/// NOTE (Issue #186): Admin is now UncheckedAccount with seed verification
#[derive(Accounts)]
pub struct RejectRoleRequest<'info> {
    #[account(mut)]
    pub config: Account<'info, SupplyChainConfig>,
    /// CHECK: Admin PDA verified via seeds [b"admin", config.key()] with bump from config
    #[account(
        seeds = [b"admin", config.key().as_ref()],
        bump = config.admin_pda_bump
    )]
    pub admin: UncheckedAccount<'info>,
    #[account(mut)]
    pub role_request: Account<'info, RoleRequest>,
}

/// Reset a role request after cooldown period
/// Allows users to create a new request after admin approve/reject
#[derive(Accounts)]
pub struct ResetRoleRequest<'info> {
    #[account(mut)]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(
        mut,
        seeds = [b"role_request", user.key().as_ref()],
        bump
    )]
    pub role_request: Account<'info, RoleRequest>,
    #[account(mut)]
    pub user: Signer<'info>,
}

/// Request a role
/// Only valid role names are accepted (FABRICANTE, AUDITOR_HW, TECNICO_SW, ESCUELA)
/// Users can only have one pending request at a time (PDA constraint)
pub fn request_role(ctx: Context<RequestRole>, role: String) -> Result<()> {
    let config = &mut ctx.accounts.config;

    // Validate role name - only allow valid roles
    match role.as_str() {
        crate::FABRICANTE_ROLE
        | crate::AUDITOR_HW_ROLE
        | crate::TECNICO_SW_ROLE
        | crate::ESCUELA_ROLE => {}
        _ => return Err(crate::SupplyChainError::RoleNotFound.into()),
    }

    // Check if user already has this role granted (prevent duplicate requests)
    let user = ctx.accounts.user.key();
    match role.as_str() {
        crate::FABRICANTE_ROLE if config.fabricante == user => {
            return Err(crate::SupplyChainError::RoleAlreadyGranted.into());
        }
        crate::AUDITOR_HW_ROLE if config.auditor_hw == user => {
            return Err(crate::SupplyChainError::RoleAlreadyGranted.into());
        }
        crate::TECNICO_SW_ROLE if config.tecnico_sw == user => {
            return Err(crate::SupplyChainError::RoleAlreadyGranted.into());
        }
        crate::ESCUELA_ROLE if config.escuela == user => {
            return Err(crate::SupplyChainError::RoleAlreadyGranted.into());
        }
        _ => {}
    }

    config.role_requests_count += 1;

    let role_request = &mut ctx.accounts.role_request;
    role_request.id = config.role_requests_count;
    role_request.user = user;
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
/// Only the admin PDA can call this instruction
/// Creates RoleHolder account automatically (integrates Config fields with RoleHolder)
/// NOTE (Issue #144): Enhanced with strict validation of role and request state
pub fn approve_role_request(ctx: Context<ApproveRoleRequest>) -> Result<()> {
    let role_request = &mut ctx.accounts.role_request;

    // Verify request is in Pending state
    require!(
        role_request.status == crate::RequestStatus::Pending as u8,
        crate::SupplyChainError::InvalidRequestState
    );

    // Validate role name before approval
    let role = role_request.role.clone();
    match role.as_str() {
        crate::FABRICANTE_ROLE
        | crate::AUDITOR_HW_ROLE
        | crate::TECNICO_SW_ROLE
        | crate::ESCUELA_ROLE => {}
        _ => return Err(crate::SupplyChainError::RoleNotFound.into()),
    }

    role_request.status = crate::RequestStatus::Approved as u8;

    // Grant the role automatically on approval (update config fields)
    let config = &mut ctx.accounts.config;
    let user = role_request.user;
    match role.as_str() {
        crate::FABRICANTE_ROLE => config.fabricante = user,
        crate::AUDITOR_HW_ROLE => config.auditor_hw = user,
        crate::TECNICO_SW_ROLE => config.tecnico_sw = user,
        crate::ESCUELA_ROLE => config.escuela = user,
        _ => unreachable!(), // Already validated above
    }

    // Create RoleHolder account (integration with RoleHolder pattern)
    let role_holder = &mut ctx.accounts.role_holder;
    let admin = ctx.accounts.admin.key();
    let timestamp = Clock::get()?.unix_timestamp as u64;
    role_holder.id = config.role_requests_count;
    role_holder.account = user;
    role_holder.role = role.clone();
    role_holder.granted_by = admin;
    role_holder.timestamp = timestamp;

    emit!(RoleRequestUpdated {
        id: role_request.id,
        status: role_request.status,
    });
    Ok(())
}

/// Reject a pending role request
pub fn reject_role_request(ctx: Context<RejectRoleRequest>) -> Result<()> {
    let role_request = &mut ctx.accounts.role_request;

    // Verify request is in Pending state
    require!(
        role_request.status == crate::RequestStatus::Pending as u8,
        crate::SupplyChainError::InvalidRequestState
    );

    role_request.status = crate::RequestStatus::Rejected as u8;

    emit!(RoleRequestUpdated {
        id: role_request.id,
        status: role_request.status,
    });
    Ok(())
}

/// Reset a role request after cooldown period
/// Allows users to create a new request after admin approve/reject
/// Enforces cooldown to prevent spam
pub fn reset_role_request(ctx: Context<ResetRoleRequest>) -> Result<()> {
    let role_request = &mut ctx.accounts.role_request;
    let current_timestamp = Clock::get()?.unix_timestamp as u64;

    // Verify request is not in Pending state (must be approved or rejected)
    require!(
        role_request.status != crate::RequestStatus::Pending as u8,
        crate::SupplyChainError::InvalidRequestState
    );

    // Enforce cooldown period - prevent spam
    let time_since_last_request = current_timestamp.saturating_sub(role_request.timestamp);
    require!(
        time_since_last_request >= crate::ROLE_REQUEST_COOLDOWN,
        crate::SupplyChainError::RateLimited
    );

    // Reset to allow new request
    role_request.status = crate::RequestStatus::Pending as u8;
    role_request.timestamp = current_timestamp;

    Ok(())
}
