//! Utility functions for SupplyChainTracker program

/// Compute serial hash for duplicate detection
/// For serials <= 32 bytes: use directly with zero padding
/// For serials > 32 bytes: use first 16 + last 16 bytes
pub fn compute_serial_hash(serial: &str) -> [u8; 32] {
    let mut serial_hash = [0u8; 32];
    let serial_bytes = serial.as_bytes();
    
    if serial_bytes.len() <= 32 {
        for (i, byte) in serial_bytes.iter().enumerate() {
            serial_hash[i] = *byte;
        }
    } else {
        serial_hash[..16].copy_from_slice(&serial_bytes[..16]);
        serial_hash[16..].copy_from_slice(&serial_bytes[serial_bytes.len() - 16..]);
    }
    
    serial_hash
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_serial_hash_short() {
        let hash = compute_serial_hash("ABC123");
        assert_eq!(hash[0], b'A');
        assert_eq!(hash[1], b'B');
        assert_eq!(hash[2], b'C');
        assert_eq!(hash[3], b'1');
        assert_eq!(hash[4], b'2');
        assert_eq!(hash[5], b'3');
        // Rest should be zero
        assert_eq!(hash[6..], [0u8; 26]);
    }

    #[test]
    fn test_compute_serial_hash_long() {
        let long_serial = "A".repeat(40);
        let hash = compute_serial_hash(&long_serial);
        // First 16 should be 'A'
        assert_eq!(hash[..16], [b'A'; 16]);
        // Last 16 should be 'A'
        assert_eq!(hash[16..], [b'A'; 16]);
    }
}
