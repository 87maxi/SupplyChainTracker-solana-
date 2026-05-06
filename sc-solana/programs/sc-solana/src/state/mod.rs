//! State modules re-exports

pub mod netbook;
pub mod config;
pub mod serial_hash_registry;
pub mod role_holder;
pub mod role_request;

// Re-exports
pub use netbook::Netbook;
pub use config::SupplyChainConfig;
pub use serial_hash_registry::SerialHashRegistry;
pub use role_holder::RoleHolder;
pub use role_request::RoleRequest;

// Constants
pub const MAX_SERIAL_HASHES: usize = 10;
pub const MAX_ROLE_HOLDERS: usize = 100;

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
