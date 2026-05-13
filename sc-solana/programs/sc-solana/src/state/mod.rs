//! State modules re-exports

pub mod config;
pub mod netbook;
pub mod role_holder;
pub mod role_request;
pub mod serial_hash_registry;

// Re-exports
pub use config::SupplyChainConfig;
pub use netbook::Netbook;
pub use role_holder::RoleHolder;
pub use role_request::RoleRequest;
pub use serial_hash_registry::SerialHashRegistry;

// Constants
/// Reduced from 1000 to 100 to fit within SBF stack limits (4KB).
/// Anchor deserializes entire account onto stack. For 1000+ serials,
/// migrate to zero_copy with flattened [u8; 32000] array.
pub const MAX_SERIAL_HASHES: usize = 100;
pub const MAX_ROLE_HOLDERS: usize = 100;
/// Maximum batch size for register_netbooks_batch to protect compute units
pub const MAX_BATCH_SIZE: usize = 10;

// Enums
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum NetbookState {
    Fabricada = 0,
    HwAprobado = 1,
    SwValidado = 2,
    Distribuida = 3,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RequestStatus {
    Pending = 0,
    Approved = 1,
    Rejected = 2,
}

// Role types
pub const FABRICANTE_ROLE: &str = "FABRICANTE";
pub const AUDITOR_HW_ROLE: &str = "AUDITOR_HW";
pub const TECNICO_SW_ROLE: &str = "TECNICO_SW";
pub const ESCUELA_ROLE: &str = "ESCUELA";
