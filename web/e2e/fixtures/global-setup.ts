/**
 * Playwright Global Setup - SINGLE BROWSER SESSION
 *
 * Este archivo se ejecuta una vez antes de todos los tests.
 * Configura una sesión única de browser con MockWalletAdapter inyectado.
 *
 * IMPORTANTE: Este setup crea un browser y contexto que será compartido
 * por todos los tests del proyecto full-flow-sequential.
 */

import { FullConfig, chromium } from "@playwright/test";
import { PublicKey } from "@solana/web3.js";

/**
 * Inyecta el MockWalletAdapter en el browser antes de cargar cualquier página.
 * Esto asegura que la wallet mock esté disponible para el WalletProvider.
 */
async function injectMockWallet(page: any): Promise<void> {
  await page.addInitScript(() => {
    // Inyectar el MockWalletAdapter como una función constructora
    (window as any).MockWalletAdapter = class MockWalletAdapter {
      private _connected = true;
      private _connecting = false;
      private _publicKey: PublicKey | null;
      
      constructor() {
        // Generar mock public key válido
        const MOCK_PUBLIC_KEY_BYTES = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          MOCK_PUBLIC_KEY_BYTES[i] = i;
        }
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
      
      get name(): string {
        return 'MockWallet';
      }
      
      get url(): string {
        return 'https://mock-wallet.test';
      }
      
      get icon(): string {
        return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgMjU2IDI1NiI+PHBhdGggZmlsbD0iIzRGNEE1RSIgZD0iTTI0NS4yOCAxNzEuMzZsLTM2LjgtOTIuOGMtMS42LTQuMS01LjYtNi45LTEwLTYuOWgtNTUuMmMtNC40IDAtOC40IDIuOC05LjYgNi45bC0zNi44IDkyLjhjLTEuMiAzLjEuMyA2LjYgMy4zIDguNGw0Mi40IDI0LjRjMi40IDEuNCA1LjYgMS40IDgtMGw0Mi40IDI0LjRjMy4xIDEuOCA2LjYgMC4zIDguNC0zLjNsMzYuOC05Mi44Yy40LTEuMi40LTIuNSAwLTMuNnoiLz48L3N2Zz4=';
      }
      
      get readyState(): string {
        return 'Installed';
      }
      
      get supportedTransactionVersions(): any {
        return null;
      }
      
      async connect(): Promise<void> {
        if (!this._connected) {
          this._connecting = true;
          this._connected = true;
          this._publicKey = new PublicKey(new Uint8Array(32));
          // Emitir evento de conexión
          window.dispatchEvent(new CustomEvent('wallet-connect', { detail: this._publicKey }));
          this._connecting = false;
        }
      }
      
      async disconnect(): Promise<void> {
        if (this._connected) {
          this._connected = false;
          this._publicKey = null;
          window.dispatchEvent(new CustomEvent('wallet-disconnect'));
        }
      }
      
      async autoConnect(): Promise<void> {
        console.log('[MockWalletAdapter] autoConnect called');
        await this.connect();
      }
      
      async sendTransaction(transaction: any, connection: any, options?: any): Promise<string> {
        return 'MockTransactionSignature11111111111111111111111111111111111111111111111111111111111111';
      }
      
      async signTransaction(transaction: any): Promise<any> {
        return transaction;
      }
      
      async signAllTransactions(transactions: any[]): Promise<any[]> {
        return transactions.map(tx => this.signTransaction(tx));
      }
      
      async signMessage(message: Uint8Array): Promise<Uint8Array> {
        return new Uint8Array(64);
      }
      
      async signVersionedTransaction(transaction: any): Promise<any> {
        return transaction;
      }
      
      // Event listeners
      on(event: string, handler: any) {}
      off(event: string, handler: any) {}
      emit(event: string, ...args: any[]) {}
    };
    
    // Auto-conectar la wallet mock
    console.log('[MockWalletAdapter] Injecting and auto-connecting...');
    const wallet = new (window as any).MockWalletAdapter();
    wallet.autoConnect().then(() => {
      console.log('[MockWalletAdapter] Connected successfully');
      // Guardar referencia global para acceso posterior
      (window as any).__mockWallet = wallet;
    }).catch((err: any) => {
      console.error('[MockWalletAdapter] Connection failed:', err);
    });
  });
}

/**
 * Configuración global para Playwright tests.
 * Crea un browser y contexto que será compartido por todos los tests.
 */
async function globalSetup(config: FullConfig) {
  console.log("[Global Setup] Starting global setup...");
  
  // Crear un browser context persistente para todos los tests
  const browser = await chromium.launch({
    headless: false, // Mostrar browser para debugging
    slowMo: 100, // Ralentizar acciones para visualización
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    storageState: 'e2e/.auth/user.json', // Cargar estado guardado
  });
  
  // Crear una página persistente
  const page = await context.newPage();
  
  // Inyectar MockWalletAdapter antes de cargar cualquier página
  await injectMockWallet(page);
  
  // Navegar a la aplicación para inicializar la sesión
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  console.log(`[Global Setup] Navigating to ${baseURL} to initialize session...`);
  await page.goto(baseURL);
  await page.waitForLoadState('networkidle');
  
  // Guardar el estado de almacenamiento para compartir entre tests
  await context.storageState({ path: 'e2e/.auth/user.json' });
  
  console.log("[Global Setup] Browser context created and MockWalletAdapter injected");
  console.log("[Global Setup] Session initialized and storage state saved");
  console.log("[Global Setup] Playwright E2E tests ready");
  
  // Guardar referencia para uso posterior (opcional)
  (global as any).__playwrightBrowser = browser;
  (global as any).__playwrightContext = context;
  (global as any).__playwrightPage = page;
}

export default globalSetup;
