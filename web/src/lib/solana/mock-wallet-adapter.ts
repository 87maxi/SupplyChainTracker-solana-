/**
 * MockWalletAdapter para tests E2E.
 *
 * Implementa la interfaz completa de WalletAdapter sin depender de extensiones
 * del browser. Se inyecta directamente en el WalletProvider cuando NEXT_PUBLIC_TEST_MODE=true.
 *
 * Esta solución reemplaza el enfoque anterior de inyectar window.solana en wallet-mock.ts,
 * que era incompatible con PhantomWalletAdapter.
 *
 * @see https://github.com/solana-labs/wallet-adapter/blob/master/packages/base/src/lib/wallet-adapter.ts
 */

import { BaseWalletAdapter, WalletReadyState, type WalletName, type SupportedTransactionVersions } from '@solana/wallet-adapter-base';
import { type Connection, PublicKey, type SendOptions, type TransactionSignature, VersionedTransaction } from '@solana/web3.js';
import { Transaction } from '@solana/web3.js';

/**
 * Mock public key válido para tests (32 bytes).
 * No es una clave real, solo para simulación.
 */
const MOCK_PUBLIC_KEY_BYTES = new Uint8Array(32);
// Generar un patrón reconocible para tests
for (let i = 0; i < 32; i++) {
  MOCK_PUBLIC_KEY_BYTES[i] = i;
}

/**
 * Mock signature de 64 bytes (ED25519).
 */
const MOCK_SIGNATURE_BYTES = Buffer.alloc(64);
for (let i = 0; i < 64; i++) {
  MOCK_SIGNATURE_BYTES[i] = i % 256;
}

/**
 * MockWalletAdapter que implementa la interfaz completa de WalletAdapter.
 *
 * Características:
 * - Siempre está conectado por defecto
 * - No requiere extensión del browser
 * - Implementa todos los métodos necesarios para tests E2E
 * - Emite eventos de conexión/desconexión correctamente
 */
export class MockWalletAdapter extends BaseWalletAdapter {
  private _connected = true;
  private _connecting = false;
  private _publicKey: PublicKey | null;

  constructor() {
    super();
    // Generar mock public key válido
    this._publicKey = new PublicKey(MOCK_PUBLIC_KEY_BYTES);
  }

  get connected(): boolean {
    return this._connected;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  get name(): WalletName<'MockWallet'> {
    return 'MockWallet' as WalletName<'MockWallet'>;
  }

  get url(): string {
    return 'https://mock-wallet.test';
  }

  get icon(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgMjU2IDI1NiI+PHBhdGggZmlsbD0iIzRGNEE1RSIgZD0iTTI0NS4yOCAxNzEuMzZsLTM2LjgtOTIuOGMtMS42LTQuMS01LjYtNi45LTEwLTYuOWgtNTUuMmMtNC40IDAtOC40IDIuOC05LjYgNi45bC0zNi44IDkyLjhjLTEuMiAzLjEuMyA2LjYgMy4zIDguNGw0Mi40IDI0LjRjMi40IDEuNCA1LjYgMS40IDgtMGw0Mi40IDI0LjRjMy4xIDEuOCA2LjYgMC4zIDguNC0zLjNsMzYuOC05Mi44Yy40LTEuMi40LTIuNSAwLTMuNnoiLz48L3N2Zz4=';
  }

  get readyState(): WalletReadyState {
    return WalletReadyState.Installed;
  }

  get supportedTransactionVersions(): SupportedTransactionVersions {
    return null;
  }

  async connect(): Promise<void> {
    if (!this._connected) {
      this._connecting = true;
      this._connected = true;
      this._publicKey = new PublicKey(MOCK_PUBLIC_KEY_BYTES);
      // Emitir evento de conexión
      this.emit('connect', this._publicKey);
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this._connected) {
      this._connected = false;
      this._publicKey = null;
      // Emitir evento de desconexión
      this.emit('disconnect');
    }
  }

  async autoConnect(): Promise<void> {
    await this.connect();
  }

  async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SendOptions,
  ): Promise<TransactionSignature> {
    // Mock: retornar una signature simulada sin enviar realmente a la red
    return 'MockTransactionSignature11111111111111111111111111111111111111111111111111111111111111' as TransactionSignature;
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    // Mock: retornar transacción "firmada" sin modificar
    // En tests reales, esto simula la firma sin necesidad de clave privada
    const signedTx = Transaction.from(transaction.serialize());
    // Agregar signature mock
    if (this._publicKey) {
      signedTx.signatures = [{
        publicKey: this._publicKey,
        signature: MOCK_SIGNATURE_BYTES,
      }];
    }
    return signedTx;
  }

  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    return Promise.all(transactions.map(tx => this.signTransaction(tx)));
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    // Mock signature
    return MOCK_SIGNATURE_BYTES;
  }

  async signVersionedTransaction(transaction: VersionedTransaction): Promise<VersionedTransaction> {
    // Mock: retornar transacción "firmada"
    return transaction;
  }
}
