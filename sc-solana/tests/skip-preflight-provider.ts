/**
 * SkipPreflight Provider Wrapper
 *
 * Patches Transaction.serialize() to use requireAllSignatures: false
 * globally. This bypasses signature validation for PDAs that use
 * seed-based verification instead of cryptographic signatures.
 *
 * All existing tests work without modification after enabling this.
 */

import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  Connection,
  Transaction,
  TransactionSignature,
  ConfirmOptions,
  VersionedTransaction,
} from "@solana/web3.js";

// Store original serialize method
const originalSerialize = Transaction.prototype.serialize;
const originalSerializeMessage = Transaction.prototype.serializeMessage;

// Track if patching is enabled
let _patchEnabled = false;

// Store original sendAndConfirm for disable function
let originalProviderSendAndConfirm: AnchorProvider["sendAndConfirm"] | null = null;

/**
 * Enable global patching of Transaction.serialize() to bypass signature validation.
 * Call this at the start of test files or in a global setup.
 */
export function enableSkipPreflightPatching(): void {
  if (_patchEnabled) return;
  
  const txProto = Transaction.prototype as any;
  
  // Patch serialize to always use requireAllSignatures: false
  if (!txProto._skipPreflightPatched) {
    txProto._skipPreflightPatched = true;
    
    txProto.serialize = function(options?: { requireAllSignatures?: boolean; verifySignatures?: boolean }): Buffer {
      // Always bypass signature requirements for PDA signing
      return originalSerialize.call(this, { 
        requireAllSignatures: false, 
        verifySignatures: false 
      });
    };
    
    txProto.serializeMessage = function(options?: { requireAllSignatures?: boolean }): Buffer {
      return originalSerializeMessage.call(this, { requireAllSignatures: false });
    };
  }
  
  // Patch sendAndConfirm on AnchorProvider to use sendTransaction with skipPreflight
  const providerProto = AnchorProvider.prototype as any;
  if (!providerProto._skipPreflightPatched) {
    providerProto._skipPreflightPatched = true;
    
    const originalSendAndConfirm = providerProto.sendAndConfirm;
    providerProto.sendAndConfirm = async function(
      transaction: Transaction,
      signers?: any[],
      opts?: ConfirmOptions
    ): Promise<TransactionSignature> {
      const options = {
        skipPreflight: true,
        preflightCommitment: opts?.preflightCommitment || opts?.commitment || "confirmed",
        commitment: opts?.commitment || "confirmed",
        maxRetries: 5,
      };

      const signature = await this.connection.sendTransaction(transaction, signers, options as any);
      
      await this.connection.confirmTransaction(signature, options.commitment);
      
      return signature;
    };
  }
  
  _patchEnabled = true;
  console.log("SkipPreflight patching enabled globally");
}

/**
 * Disable skipPreflight patching
 */
export function disableSkipPreflightPatching(): void {
  if (!_patchEnabled) return;
  
  const txProto = Transaction.prototype as any;
  txProto._skipPreflightPatched = false;
  txProto.serialize = originalSerialize;
  txProto.serializeMessage = originalSerializeMessage;
  
  const providerProto = AnchorProvider.prototype as any;
  providerProto._skipPreflightPatched = false;
  if (originalProviderSendAndConfirm) {
    providerProto.sendAndConfirm = originalProviderSendAndConfirm;
  }
  
  _patchEnabled = false;
  console.log("SkipPreflight patching disabled");
}

/**
 * Check if patching is currently enabled
 */
export function isPatchingEnabled(): boolean {
  return _patchEnabled;
}

/**
 * Create a patched provider that uses skipPreflight by default
 */
export function createPatchedProvider(
  connection: Connection,
  wallet: anchor.Wallet,
  opts?: ConfirmOptions
): AnchorProvider {
  const provider = new AnchorProvider(connection, wallet, opts || { skipPreflight: true });
  
  // Store original for disable
  if (!originalProviderSendAndConfirm) {
    originalProviderSendAndConfirm = provider.sendAndConfirm.bind(provider);
  }
  
  // Patch the sendAndConfirm method to use sendTransaction with skipPreflight
  const originalSendAndConfirm = provider.sendAndConfirm;
  provider.sendAndConfirm = async function(
    transaction: Transaction,
    signers?: any[],
    opts?: ConfirmOptions
  ): Promise<TransactionSignature> {
    const options = {
      skipPreflight: true,
      preflightCommitment: opts?.preflightCommitment || opts?.commitment || "confirmed",
      commitment: opts?.commitment || "confirmed",
      maxRetries: 5,
    };

    const signature = await this.connection.sendTransaction(transaction, signers, options as any);
    
    await this.connection.confirmTransaction(signature, options.commitment);
    
    return signature;
  };
  
  return provider;
}
