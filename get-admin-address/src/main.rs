use std::fs;
use ed25519_dalek::SigningKey;
use std::convert::TryFrom;

fn main() {
    // Read keypair JSON
    let keypair_data = fs::read_to_string("/home/maxi/.config/solana/id.json")
        .expect("Failed to read keypair file");
    
    let keypair: Vec<u8> = serde_json::from_str(&keypair_data)
        .expect("Failed to parse keypair JSON");
    
    let secret_key = &keypair[..32];
    
    let signing_key = SigningKey::try_from(secret_key)
        .expect("Failed to create signing key");
    
    let verifying_key: ed25519_dalek::VerifyingKey = (&signing_key).into();
    let public_key = verifying_key.to_bytes();
    
    // Base58 encode
    let address = bs58::encode(public_key).into_string();
    
    println!("{}", address);
}
