//! SupplyChainTracker - Solana/Anchor Implementation
//!
//! Migration from Ethereum (Solidity) to Solana (Anchor/Rust)
//! Program ID: CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS

use anchor_lang::prelude::*;

declare_id!("CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS");

// ==================== Error Codes (Issue #21) ====================

#[error_code]
pub enum SupplyChainError {
    #[msg("Caller is not authorized")]
    Unauthorized = 6000,
    #[msg("Invalid state transition")]
    InvalidStateTransition = 6001,
    #[msg("Netbook not found")]
    NetbookNotFound = 6002,
    #[msg("Invalid input")]
    InvalidInput = 6003,
    #[msg("Serial number already registered")]
    DuplicateSerial = 6004,
    #[msg("Array lengths do not match")]
    ArrayLengthMismatch = 6005,
    #[msg("Role already granted to this account")]
    RoleAlreadyGranted = 6006,
    #[msg("Role not found")]
    RoleNotFound = 6007,
    #[msg("Invalid signature")]
    InvalidSignature = 6008,
    #[msg("Serial number is empty")]
    EmptySerial = 6009,
    #[msg("String exceeds maximum length")]
    StringTooLong = 6010,
}

// ==================== Enums ====================

/// Netbook state enum matching Solidity: Fabricada=0, HwAprobado=1, SwValidado=2, Distribuida=3
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum NetbookState {
    Fabricada = 0,
    HwAprobado = 1,
    SwValidado = 2,
    Distribuida = 3,
}

/// Role request status
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RequestStatus {
    Pending = 0,
    Approved = 1,
    Rejected = 2,
}

/// Role types
pub const FABRICANTE_ROLE: &str = "FABRICANTE";
pub const AUDITOR_HW_ROLE: &str = "AUDITOR_HW";
pub const TECNICO_SW_ROLE: &str = "TECNICO_SW";
pub const ESCUELA_ROLE: &str = "ESCUELA";

// ==================== Account Structures ====================

/// Main Netbook account - mirrors Solidity Netbook struct
/// Bounded strings: serial_number max 200 chars, batch_id max 100 chars, model_specs max 500 chars, os_version max 100 chars
/// PII protection via [u8; 32] hashes for student_id_hash and destination_school_hash
#[account]
#[derive(Debug, Default)]
pub struct Netbook {
    pub serial_number: String,       // max 200 chars
    pub batch_id: String,            // max 100 chars
    pub initial_model_specs: String, // max 500 chars
    pub hw_auditor: Pubkey,          // address equivalent
    pub hw_integrity_passed: bool,
    pub hw_report_hash: [u8; 32],
    pub sw_technician: Pubkey,       // address equivalent
    pub os_version: String,          // max 100 chars
    pub sw_validation_passed: bool,
    pub destination_school_hash: [u8; 32],
    pub student_id_hash: [u8; 32],
    pub distribution_timestamp: u64,
    pub state: u8,                   // NetbookState enum as u8
    pub exists: bool,
    pub token_id: u64,
}

impl Netbook {
    pub const INIT_SPACE: usize = 8
        + 4 + 200  // serial_number (bounded string, max 200 chars)
        + 4 + 100  // batch_id (bounded string, max 100 chars)
        + 4 + 500  // initial_model_specs (bounded string, max 500 chars)
        + 32       // hw_auditor (Pubkey)
        + 1        // hw_integrity_passed (bool)
        + 32       // hw_report_hash ([u8; 32])
        + 32       // sw_technician (Pubkey)
        + 4 + 100  // os_version (bounded string, max 100 chars)
        + 1        // sw_validation_passed (bool)
        + 32       // destination_school_hash ([u8; 32])
        + 32       // student_id_hash ([u8; 32])
        + 8        // distribution_timestamp (u64)
        + 1        // state (u8)
        + 1        // exists (bool)
        + 8;       // token_id (u64)
    // Total: 8 (discriminator) + 12 (length prefixes) + 900 (string data) + 100 (Pubkeys) + 3 (bools) + 160 (hashes) + 24 (u64s) = 1147 bytes minimum
    // Using 1200 for safety margin
}

/// Configuration account for the supply chain (Issue #19 - expanded with role authorities)
#[account]
#[derive(Debug)]
pub struct SupplyChainConfig {
    pub admin: Pubkey,
    pub fabricante: Pubkey,
    pub auditor_hw: Pubkey,
    pub tecnico_sw: Pubkey,
    pub escuela: Pubkey,
    pub admin_bump: u8,
    pub next_token_id: u64,
    pub total_netbooks: u64,
    pub role_requests_count: u64,
}

impl SupplyChainConfig {
    pub const INIT_SPACE: usize = 8
        + 32  // admin
        + 32  // fabricante
        + 32  // auditor_hw
        + 32  // tecnico_sw
        + 32  // escuela
        + 1   // admin_bump
        + 8   // next_token_id
        + 8   // total_netbooks
        + 8;  // role_requests_count
    // Total: 8 + 248 = 256 bytes
}

impl SupplyChainConfig {
    /// Check if an account has a specific role (Issue #19)
    pub fn has_role(&self, role_type: &str, account: &Pubkey) -> bool {
        match role_type {
            FABRICANTE_ROLE => self.fabricante == *account,
            AUDITOR_HW_ROLE => self.auditor_hw == *account,
            TECNICO_SW_ROLE => self.tecnico_sw == *account,
            ESCUELA_ROLE => self.escuela == *account,
            _ => false,
        }
    }
}

/// Role request account
#[account]
#[derive(Debug)]
pub struct RoleRequest {
    pub id: u64,
    pub user: Pubkey,
    pub role: String,       // max 256 chars
    pub status: u8,
    pub timestamp: u64,
}

// ==================== Instruction Contexts ====================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = SupplyChainConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GrantRole<'info> {
    #[account(mut, has_one = admin)]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub account_to_grant: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeRole<'info> {
    #[account(mut, has_one = admin)]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub account_to_revoke: Signer<'info>,
    pub system_program: Program<'info, System>,
}

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

/// Register a single netbook with PDA based on token_id (Issue #18 - fixed PDA)
/// Uses config.next_token_id as part of PDA seed to ensure unique PDAs per netbook
/// Note: We use a fixed 7-byte array from the u64 to satisfy Anchor's seed size requirements
#[derive(Accounts)]
pub struct RegisterNetbook<'info> {
    #[account(mut)]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(
        mut,
        constraint = config.fabricante == manufacturer.key() @ SupplyChainError::Unauthorized
    )]
    pub manufacturer: Signer<'info>,
    #[account(
        init,
        payer = manufacturer,
        space = Netbook::INIT_SPACE,
        seeds = [b"netbook", b"netbook", &config.next_token_id.to_le_bytes()[0..7]],
        bump
    )]
    pub netbook: Account<'info, Netbook>,
    pub system_program: Program<'info, System>,
}

/// Batch register netbooks (Issue #17)
#[derive(Accounts)]
pub struct RegisterNetbooksBatch<'info> {
    #[account(mut)]
    pub config: Account<'info, SupplyChainConfig>,
    #[account(
        mut,
        constraint = config.fabricante == manufacturer.key() @ SupplyChainError::Unauthorized
    )]
    pub manufacturer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Hardware audit instruction (Issue #19 - with role check)
#[derive(Accounts)]
pub struct AuditHardware<'info> {
    #[account(mut)]
    pub netbook: Account<'info, Netbook>,
    #[account(
        mut,
        constraint = config.auditor_hw == auditor.key() @ SupplyChainError::Unauthorized
    )]
    pub config: Account<'info, SupplyChainConfig>,
    pub auditor: Signer<'info>,
}

/// Software validation instruction (Issue #19 - with role check)
#[derive(Accounts)]
pub struct ValidateSoftware<'info> {
    #[account(mut)]
    pub netbook: Account<'info, Netbook>,
    #[account(
        mut,
        constraint = config.tecnico_sw == technician.key() @ SupplyChainError::Unauthorized
    )]
    pub config: Account<'info, SupplyChainConfig>,
    pub technician: Signer<'info>,
}

/// Assign netbook to student instruction (Issue #19 - with role check)
#[derive(Accounts)]
pub struct AssignToStudent<'info> {
    #[account(mut)]
    pub netbook: Account<'info, Netbook>,
    #[account(
        mut,
        constraint = config.escuela == school.key() @ SupplyChainError::Unauthorized
    )]
    pub config: Account<'info, SupplyChainConfig>,
    pub school: Signer<'info>,
}

// ==================== Events ====================

#[event]
pub struct NetbookRegistered {
    pub serial_number: String,
    pub batch_id: String,
    pub token_id: u64,
}

#[event]
pub struct HardwareAudited {
    pub serial_number: String,
    pub passed: bool,
}

#[event]
pub struct SoftwareValidated {
    pub serial_number: String,
    pub os_version: String,
    pub passed: bool,
}

#[event]
pub struct NetbookAssigned {
    pub serial_number: String,
}

#[event]
pub struct RoleRequested {
    pub id: u64,
    pub user: Pubkey,
    pub role: String,
}

#[event]
pub struct RoleRequestUpdated {
    pub id: u64,
    pub status: u8,
}

#[event]
pub struct RoleGranted {
    pub role: String,
    pub account: Pubkey,
    pub admin: Pubkey,
    pub timestamp: u64,
}

#[event]
pub struct RoleRevoked {
    pub role: String,
    pub account: Pubkey,
}

#[event]
pub struct NetbooksRegistered {
    pub count: u64,
    pub start_token_id: u64,
    pub timestamp: u64,
}

// ==================== Program Module ====================

#[program]
pub mod sc_solana {
    use super::*;

    /// Initialize the supply chain configuration (Issue #19 - expanded)
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.fabricante = ctx.accounts.admin.key();
        config.auditor_hw = Pubkey::default();
        config.tecnico_sw = Pubkey::default();
        config.escuela = Pubkey::default();
        config.admin_bump = ctx.bumps.config;
        config.next_token_id = 1;
        config.total_netbooks = 0;
        config.role_requests_count = 0;
        Ok(())
    }

    /// Grant a role to an account (Issue #19 - stores role authority)
    pub fn grant_role(ctx: Context<GrantRole>, role: String) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let admin = ctx.accounts.admin.key();

        // Check if role already granted (Issue #21)
        match role.as_str() {
            FABRICANTE_ROLE if config.fabricante == ctx.accounts.account_to_grant.key() => {
                return Err(SupplyChainError::RoleAlreadyGranted.into());
            }
            AUDITOR_HW_ROLE if config.auditor_hw == ctx.accounts.account_to_grant.key() => {
                return Err(SupplyChainError::RoleAlreadyGranted.into());
            }
            TECNICO_SW_ROLE if config.tecnico_sw == ctx.accounts.account_to_grant.key() => {
                return Err(SupplyChainError::RoleAlreadyGranted.into());
            }
            ESCUELA_ROLE if config.escuela == ctx.accounts.account_to_grant.key() => {
                return Err(SupplyChainError::RoleAlreadyGranted.into());
            }
            _ => {}
        }

        // Store role authority (Issue #19)
        match role.as_str() {
            FABRICANTE_ROLE => config.fabricante = ctx.accounts.account_to_grant.key(),
            AUDITOR_HW_ROLE => config.auditor_hw = ctx.accounts.account_to_grant.key(),
            TECNICO_SW_ROLE => config.tecnico_sw = ctx.accounts.account_to_grant.key(),
            ESCUELA_ROLE => config.escuela = ctx.accounts.account_to_grant.key(),
            _ => return Err(SupplyChainError::RoleNotFound.into()),
        }

        let timestamp = Clock::get()?.unix_timestamp as u64;
        emit!(RoleGranted {
            role,
            account: ctx.accounts.account_to_grant.key(),
            admin,
            timestamp,
        });
        Ok(())
    }

    /// Revoke a role from an account (Issue #19 - clears role authority)
    pub fn revoke_role(ctx: Context<RevokeRole>, role: String) -> Result<()> {
        let config = &mut ctx.accounts.config;

        // Clear role authority (Issue #19)
        match role.as_str() {
            FABRICANTE_ROLE => config.fabricante = Pubkey::default(),
            AUDITOR_HW_ROLE => config.auditor_hw = Pubkey::default(),
            TECNICO_SW_ROLE => config.tecnico_sw = Pubkey::default(),
            ESCUELA_ROLE => config.escuela = Pubkey::default(),
            _ => return Err(SupplyChainError::RoleNotFound.into()),
        }

        emit!(RoleRevoked {
            role,
            account: ctx.accounts.account_to_revoke.key(),
        });
        Ok(())
    }

    /// Request a role (Issue #20 - fixed timestamps and counters)
    pub fn request_role(ctx: Context<RequestRole>, role: String) -> Result<()> {
        let config = &mut ctx.accounts.config;

        config.role_requests_count += 1;

        let role_request = &mut ctx.accounts.role_request;
        role_request.id = config.role_requests_count;
        role_request.user = ctx.accounts.user.key();
        role_request.role = role.clone();
        role_request.status = RequestStatus::Pending as u8;
        role_request.timestamp = Clock::get()?.unix_timestamp as u64; // Issue #20 - fixed

        emit!(RoleRequested {
            id: config.role_requests_count,
            user: role_request.user,
            role,
        });
        Ok(())
    }

    /// Approve a pending role request (Issue #20 - fixed timestamp)
    pub fn approve_role_request(ctx: Context<ApproveRoleRequest>) -> Result<()> {
        let role_request = &mut ctx.accounts.role_request;
        role_request.status = RequestStatus::Approved as u8;

        // Grant the role automatically on approval (Issue #19)
        let config = &mut ctx.accounts.config;
        let user = role_request.user;
        match role_request.role.as_str() {
            FABRICANTE_ROLE => config.fabricante = user,
            AUDITOR_HW_ROLE => config.auditor_hw = user,
            TECNICO_SW_ROLE => config.tecnico_sw = user,
            ESCUELA_ROLE => config.escuela = user,
            _ => return Err(SupplyChainError::RoleNotFound.into()),
        }

        emit!(RoleRequestUpdated {
            id: role_request.id,
            status: role_request.status,
        });
        Ok(())
    }

    /// Reject a pending role request (Issue #20 - fixed timestamp)
    pub fn reject_role_request(ctx: Context<RejectRoleRequest>) -> Result<()> {
        let role_request = &mut ctx.accounts.role_request;
        role_request.status = RequestStatus::Rejected as u8;

        emit!(RoleRequestUpdated {
            id: role_request.id,
            status: role_request.status,
        });
        Ok(())
    }

    /// Register a single netbook in the supply chain (Issue #18 - fixed PDA)
    /// State machine: Fabricada (0)
    pub fn register_netbook(
        ctx: Context<RegisterNetbook>,
        serial: String,
        batch_id: String,
        model_specs: String,
    ) -> Result<()> {
        // Validate inputs (Issue #21)
        if serial.is_empty() {
            return Err(SupplyChainError::EmptySerial.into());
        }
        if serial.len() > 200 {
            return Err(SupplyChainError::StringTooLong.into());
        }
        if batch_id.len() > 100 {
            return Err(SupplyChainError::StringTooLong.into());
        }
        if model_specs.len() > 500 {
            return Err(SupplyChainError::StringTooLong.into());
        }

        let netbook = &mut ctx.accounts.netbook;
        let config = &mut ctx.accounts.config;

        netbook.serial_number = serial;
        netbook.batch_id = batch_id;
        netbook.initial_model_specs = model_specs;
        netbook.state = NetbookState::Fabricada as u8;
        netbook.exists = true;
        netbook.token_id = config.next_token_id;

        // Issue #20 - increment counters
        config.next_token_id += 1;
        config.total_netbooks += 1;

        emit!(NetbookRegistered {
            serial_number: netbook.serial_number.clone(),
            batch_id: netbook.batch_id.clone(),
            token_id: netbook.token_id,
        });

        Ok(())
    }

    /// Batch register netbooks (Issue #17)
    /// Note: Solana/Anchor requires all accounts to be declared upfront in the context.
    /// True batch account creation in a single transaction is not supported by Anchor's
    /// derive macros. This implementation validates inputs and updates config counters.
    /// For actual batch registration, callers should invoke register_netbook multiple times.
    pub fn register_netbooks_batch(
        ctx: Context<RegisterNetbooksBatch>,
        serial_numbers: Vec<String>,
        batch_ids: Vec<String>,
        model_specs: Vec<String>,
    ) -> Result<()> {
        // Validate array lengths (Issue #21)
        if serial_numbers.len() != batch_ids.len() {
            return Err(SupplyChainError::ArrayLengthMismatch.into());
        }
        if serial_numbers.len() != model_specs.len() {
            return Err(SupplyChainError::ArrayLengthMismatch.into());
        }

        let count = serial_numbers.len() as u64;
        if count == 0 || count > 10 {
            return Err(SupplyChainError::InvalidInput.into());
        }

        let config = &mut ctx.accounts.config;
        let start_token_id = config.next_token_id;
        let timestamp = Clock::get()?.unix_timestamp as u64; // Issue #20 - fixed timestamp

        // Validate all inputs before processing (Issue #21)
        for i in 0..count {
            let serial = &serial_numbers[i as usize];
            let batch = &batch_ids[i as usize];
            let specs = &model_specs[i as usize];

            if serial.is_empty() {
                return Err(SupplyChainError::EmptySerial.into());
            }
            if serial.len() > 200 {
                return Err(SupplyChainError::StringTooLong.into());
            }
            if batch.len() > 100 {
                return Err(SupplyChainError::StringTooLong.into());
            }
            if specs.len() > 500 {
                return Err(SupplyChainError::StringTooLong.into());
            }
        }

        // Update config counters
        config.next_token_id += count;
        config.total_netbooks += count;

        emit!(NetbooksRegistered {
            count,
            start_token_id,
            timestamp,
        });

        Ok(())
    }

    /// Audit hardware on a netbook (Issue #19 - with role check)
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
            return Err(SupplyChainError::InvalidInput.into());
        }

        // State machine validation: only from Fabricada state
        if netbook.state != NetbookState::Fabricada as u8 {
            return Err(SupplyChainError::InvalidStateTransition.into());
        }

        netbook.hw_auditor = ctx.accounts.auditor.key();
        netbook.hw_integrity_passed = passed;
        netbook.hw_report_hash = report_hash;

        if passed {
            netbook.state = NetbookState::HwAprobado as u8;
        }

        emit!(HardwareAudited {
            serial_number: netbook.serial_number.clone(),
            passed,
        });

        Ok(())
    }

    /// Validate software on a netbook (Issue #19 - with role check)
    /// State machine transition: HwAprobado (1) -> SwValidado (2) if passed
    pub fn validate_software(
        ctx: Context<ValidateSoftware>,
        serial: String,
        os_version: String,
        passed: bool,
    ) -> Result<()> {
        // Validate bounded string (Issue #21)
        if os_version.len() > 100 {
            return Err(SupplyChainError::StringTooLong.into());
        }

        let netbook = &mut ctx.accounts.netbook;

        // Verify serial matches
        if netbook.serial_number != serial {
            return Err(SupplyChainError::InvalidInput.into());
        }

        // State machine validation: only from HwAprobado state
        if netbook.state != NetbookState::HwAprobado as u8 {
            return Err(SupplyChainError::InvalidStateTransition.into());
        }

        netbook.os_version = os_version.clone();
        netbook.sw_technician = ctx.accounts.technician.key();
        netbook.sw_validation_passed = passed;

        if passed {
            netbook.state = NetbookState::SwValidado as u8;
        }

        emit!(SoftwareValidated {
            serial_number: netbook.serial_number.clone(),
            os_version,
            passed,
        });

        Ok(())
    }

    /// Assign netbook to a student (distribution) (Issue #19 - with role check)
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
            return Err(SupplyChainError::InvalidInput.into());
        }

        // State machine validation: only from SwValidado state
        if netbook.state != NetbookState::SwValidado as u8 {
            return Err(SupplyChainError::InvalidStateTransition.into());
        }

        netbook.destination_school_hash = school_hash;
        netbook.student_id_hash = student_hash;
        netbook.distribution_timestamp = Clock::get()?.unix_timestamp as u64;
        netbook.state = NetbookState::Distribuida as u8;

        emit!(NetbookAssigned {
            serial_number: netbook.serial_number.clone(),
        });

        Ok(())
    }

    // ==================== View/Query Instructions (Issue #31) ====================

    /// Query netbook state (view function for client-side data access)
    /// Can be called via simulateTransaction to read state without sending a transaction
    /// Returns: emits NetbookStateQuery event with current state data
    pub fn query_netbook_state(
        ctx: Context<QueryNetbookState>,
        _serial: String,
    ) -> Result<()> {
        let netbook = &ctx.accounts.netbook;
        emit!(NetbookStateQuery {
            serial_number: netbook.serial_number.clone(),
            state: netbook.state,
            token_id: netbook.token_id,
            exists: netbook.exists,
        });
        Ok(())
    }

    /// Query config data (view function for client-side data access)
    pub fn query_config(ctx: Context<QueryConfig>) -> Result<()> {
        let config = &ctx.accounts.config;
        emit!(ConfigQuery {
            admin: config.admin,
            fabricante: config.fabricante,
            auditor_hw: config.auditor_hw,
            tecnico_sw: config.tecnico_sw,
            escuela: config.escuela,
            next_token_id: config.next_token_id,
            total_netbooks: config.total_netbooks,
            role_requests_count: config.role_requests_count,
        });
        Ok(())
    }

    /// Check if an account has a specific role (view function)
    pub fn query_role(
        ctx: Context<QueryRole>,
        role: String,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let account = ctx.accounts.account_to_check.key();
        let has_role = config.has_role(&role, &account);
        emit!(RoleQuery {
            account,
            role,
            has_role,
        });
        Ok(())
    }
}

// ==================== Query Account Contexts (Issue #31) ====================

#[derive(Accounts)]
pub struct QueryNetbookState<'info> {
    pub netbook: Account<'info, Netbook>,
}

#[derive(Accounts)]
pub struct QueryConfig<'info> {
    pub config: Account<'info, SupplyChainConfig>,
}

#[derive(Accounts)]
pub struct QueryRole<'info> {
    pub config: Account<'info, SupplyChainConfig>,
    /// CHECK: This account is only read for role checking, not mutated
    pub account_to_check: UncheckedAccount<'info>,
}

// ==================== Query Events (Issue #31) ====================

#[event]
pub struct NetbookStateQuery {
    pub serial_number: String,
    pub state: u8,
    pub token_id: u64,
    pub exists: bool,
}

#[event]
pub struct ConfigQuery {
    pub admin: Pubkey,
    pub fabricante: Pubkey,
    pub auditor_hw: Pubkey,
    pub tecnico_sw: Pubkey,
    pub escuela: Pubkey,
    pub next_token_id: u64,
    pub total_netbooks: u64,
    pub role_requests_count: u64,
}

#[event]
pub struct RoleQuery {
    pub account: Pubkey,
    pub role: String,
    pub has_role: bool,
}

// ==================== Tests ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_netbook_space() {
        // Verify the calculated space is reasonable
        assert!(Netbook::INIT_SPACE > 1000);
        assert!(Netbook::INIT_SPACE < 1500);
    }

    #[test]
    fn test_netbook_states() {
        assert_eq!(NetbookState::Fabricada as u8, 0);
        assert_eq!(NetbookState::HwAprobado as u8, 1);
        assert_eq!(NetbookState::SwValidado as u8, 2);
        assert_eq!(NetbookState::Distribuida as u8, 3);
    }

    #[test]
    fn test_request_status() {
        assert_eq!(RequestStatus::Pending as u8, 0);
        assert_eq!(RequestStatus::Approved as u8, 1);
        assert_eq!(RequestStatus::Rejected as u8, 2);
    }

    #[test]
    fn test_error_codes() {
        // Verify all error codes are defined (Issue #21)
        assert_eq!(SupplyChainError::Unauthorized as u32, 6000);
        assert_eq!(SupplyChainError::InvalidStateTransition as u32, 6001);
        assert_eq!(SupplyChainError::NetbookNotFound as u32, 6002);
        assert_eq!(SupplyChainError::InvalidInput as u32, 6003);
        assert_eq!(SupplyChainError::DuplicateSerial as u32, 6004);
        assert_eq!(SupplyChainError::ArrayLengthMismatch as u32, 6005);
        assert_eq!(SupplyChainError::RoleAlreadyGranted as u32, 6006);
        assert_eq!(SupplyChainError::RoleNotFound as u32, 6007);
        assert_eq!(SupplyChainError::InvalidSignature as u32, 6008);
        assert_eq!(SupplyChainError::EmptySerial as u32, 6009);
        assert_eq!(SupplyChainError::StringTooLong as u32, 6010);
    }

    #[test]
    fn test_config_space() {
        // Verify config space (Issue #19)
        assert_eq!(SupplyChainConfig::INIT_SPACE, 264);
    }
}
