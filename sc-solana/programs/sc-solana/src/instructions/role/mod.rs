//! Role instruction modules

pub mod grant;
pub mod holder_add;
pub mod holder_remove;
pub mod request;
pub mod revoke;
pub mod transfer_admin;

pub use grant::*;
pub use holder_add::*;
pub use holder_remove::*;
pub use request::*;
pub use revoke::*;
pub use transfer_admin::*;
