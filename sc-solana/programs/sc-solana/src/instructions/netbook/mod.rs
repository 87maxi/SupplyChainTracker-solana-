//! Netbook instruction modules

pub mod register;
pub mod register_batch;
pub mod audit;
pub mod validate;
pub mod assign;

pub use register::*;
pub use register_batch::*;
pub use audit::*;
pub use validate::*;
pub use assign::*;
