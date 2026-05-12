/**
 * Browser Session Manager para Playwright E2E Tests
 *
 * Este módulo gestiona una ÚNICA sesión de browser para todo el ciclo del usuario,
 * evitando que cada test abra una nueva instancia. Utiliza storageState para
 * persistir el contexto del browser y addInitScript para inyectar el mock wallet
 * ANTES de que cualquier página cargue.
 *
 * ## Arquitectura
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    BROWSER SESSION MANAGER                       │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                                                                  │
 * │  1. Crear Browser Context con addInitScript                      │
 * │     └─ Inyecta MockWalletAdapter en window.solana                │
 * │     └─ Configura NEXT_PUBLIC_TEST_MODE=true                      │
 * │                                                                  │
 * │  2. Persistir storageState                                       │
 * │     └─ Guarda cookies, localStorage, sessionStorage             │
 * │                                                                  │
 * │  3. Reutilizar contexto en todos los tests                       │
 * │     └─ Mantiene wallet conectada durante toda la navegación      │
 * │                                                                  │
 * └─────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Uso
 *
 * ```typescript
 * // En playwright.config.ts
 * import { browserSession } from './e2e/fixtures/browser-session';
 *
 * export default defineConfig({
 *   globalSetup: './e2e/fixtures/browser-session-global.ts',
 *   use: {
 *     storageState: './e2e/.auth/user.json',
 *   },
 * });
 * ```
 */

import {
  Browser,
  BrowserContext,
  Page,
  chromium,
} from "@playwright/test";

// Ruta para persistir el estado del browser (cookies, localStorage, etc.)
const STORAGE_STATE_PATH = "./e2e/.auth/user.json";

// Configuración del mock wallet
const MOCK_WALLET_CONFIG = {
  publicKey: "MockPublicKey1111111111111111111111111111111",
  isConnected: true,
  isPhantom: true,
  walletName: "MockWallet",
};

/**
 * Script JavaScript que se ejecuta ANTES de cualquier página cargue.
 * Inyecta el mock wallet en el contexto del browser.
 */
const WALLET_INJECTION_SCRIPT = `
(() => {
  // Prevenir que la app detecte wallets reales durante tests
  if (!window.__E2E_TEST_MODE) {
    window.__E2E_TEST_MODE = true;
  }

  // Crear mock wallet que simula Phantom
  const mockWallet = {
    isConnected: ${MOCK_WALLET_CONFIG.isConnected},
    publicKey: {
      toString: () => '${MOCK_WALLET_CONFIG.publicKey}',
      toBytes: () => new Uint8Array(32),
      equals: () => true,
    },
    adapter: {
      name: '${MOCK_WALLET_CONFIG.walletName}',
      icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgMjU2IDI1NiI+PHBhdGggZmlsbD0iIzVGNDU2RSIgZD0iTTI0NS4yOCAxNzEuMzZsLTM2LjgtOTIuOGMtMS42LTQuMS01LjYtNi45LTEwLTYuOWgtNTUuMmMtNC40IDAtOC40IDIuOC05LjYgNi45bC0zNi44IDkyLjhjLTEuMiAzLjEuMyA2LjYgMy4zIDguNGw0Mi40IDI0LjRjMi40IDEuNCA1LjYgMS40IDgtMGw0Mi40IDI0LjRjMy4xIDEuOCA2LjYgMC4zIDguNC0zLjNsMzYuOC05Mi44Yy40LTEuMi40LTIuNSAwLTMuNnoiLz48L3N2Zz4=',
      url: 'https://mock-wallet.test',
    },
    signTransaction: async (tx: any) => ({ ...tx, signatures: ['MockSignature11111111111111111111111111111111111111111111111111111111111111'] }),
    signAllTransactions: async (txs: any[]) => txs.map(tx => ({ ...tx, signatures: ['MockSignature11111111111111111111111111111111111111111111111111111111111111'] })),
    signMessage: async (msg: any) => ({ signature: 'MockSignature11111111111111111111111111111111111111111111111111111111111111' }),
    on: () => {},
    off: () => {},
  };

  // Inyectar en window.solana (Phantom standard)
  (window as any).solana = mockWallet;

  // Inyectar en window.phantom.solana (Phantom prefiere esto)
  (window as any).phantom = {
    solana: mockWallet,
    isPhantom: ${MOCK_WALLET_CONFIG.isPhantom},
  };

  // Inyectar Wallet Standard provider
  (window as any).wallet = mockWallet;

  // Dispatch evento de wallet lista (antes de React hydrate)
  window.dispatchEvent(new CustomEvent('walletReady', {
    detail: { wallet: mockWallet },
  }));

  console.log('[E2E] Mock wallet injected via addInitScript');
})();
`;

/**
 * BrowserSessionManager gestiona una ÚNICA sesión de browser para todos los tests.
 */
export class BrowserSessionManager {
  private static instance: BrowserSessionManager | null = null;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  private constructor() {}

  /**
   * Obtiene la instancia singleton del BrowserSessionManager.
   */
  static getInstance(): BrowserSessionManager {
    if (!BrowserSessionManager.instance) {
      BrowserSessionManager.instance = new BrowserSessionManager();
    }
    return BrowserSessionManager.instance;
  }

  /**
   * Inicializa la sesión de browser con inyección de wallet.
   * Este método debe llamarse UNA SOLA VEZ antes de todos los tests.
   */
  async initialize(): Promise<void> {
    if (this.browser) return;

    console.log("[BrowserSession] Initializing browser session...");

    // Lanzar browser (headless: false para desarrollo, true para CI)
    const isCI = process.env.CI === "true";
    this.browser = await chromium.launch({
      headless: isCI,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    // Crear contexto con addInitScript para inyectar wallet ANTES de cualquier página
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      // addInitScript se ejecuta ANTES de cargar cualquier página
      javaScriptEnabled: true,
    });

    // Inyectar wallet ANTES de que cualquier página cargue
    await this.context.addInitScript(WALLET_INJECTION_SCRIPT);

    console.log("[BrowserSession] Browser session initialized with wallet injection");
  }

  /**
   * Crea una nueva página y navega a la URL base.
   * La wallet ya está inyectada gracias a addInitScript.
   */
  async createPage(baseUrl: string = "http://localhost:3001"): Promise<Page> {
    if (!this.context) {
      throw new Error("Browser session not initialized. Call initialize() first.");
    }

    // Crear página desde el contexto existente (reutiliza sesión)
    this.page = await this.context.newPage();

    // Navegar a la URL base
    await this.page.goto(baseUrl, { waitUntil: "networkidle" });

    // Esperar a que React hidrate y detecte la wallet
    await this.page.waitForTimeout(1000);

    // Verificar que la wallet está disponible
    const walletInjected = await this.page.evaluate(() => {
      return !!(window as any).solana || !!(window as any).phantom;
    });

    if (!walletInjected) {
      console.warn("[BrowserSession] Wallet injection may not have worked, retrying...");
      await this.page.evaluate(WALLET_INJECTION_SCRIPT);
      await this.page.waitForTimeout(500);
    }

    console.log("[BrowserSession] Page created with wallet session");
    return this.page;
  }

  /**
   * Guarda el estado actual del browser (cookies, localStorage, etc.)
   * para reutilizarlo en futuros tests.
   */
  async saveStorageState(): Promise<void> {
    if (!this.context) return;

    const state = await this.context.storageState();
    // Guardar en archivo para persistencia entre runs
    const fs = require("fs");
    fs.writeFileSync(STORAGE_STATE_PATH, JSON.stringify(state, null, 2));

    console.log(`[BrowserSession] Storage state saved to ${STORAGE_STATE_PATH}`);
  }

  /**
   * Cierra la sesión de browser y libera recursos.
   */
  async cleanup(): Promise<void> {
    // Guardar estado antes de cerrar
    await this.saveStorageState();

    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }

    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }

    console.log("[BrowserSession] Session cleaned up");
  }

  /**
   * Verifica que la wallet está conectada en la página actual.
   */
  async verifyWalletConnected(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      const wallet = (window as any).solana || (window as any).phantom?.solana;
      return wallet && wallet.isConnected === true;
    });
  }
}

/**
 * Exporta funciones convenience para uso fácil en tests.
 */

/**
 * Inicializa la sesión de browser (llamar UNA SOLA VEZ en globalSetup).
 */
export async function initBrowserSession(): Promise<void> {
  const manager = BrowserSessionManager.getInstance();
  await manager.initialize();
}

/**
 * Cierra la sesión de browser (llamar en globalTeardown).
 */
export async function closeBrowserSession(): Promise<void> {
  const manager = BrowserSessionManager.getInstance();
  await manager.cleanup();
}

/**
 * Crea una nueva página con la sesión existente.
 */
export async function createSessionPage(baseUrl?: string): Promise<Page> {
  const manager = BrowserSessionManager.getInstance();
  return manager.createPage(baseUrl);
}

/**
 * Verifica que la wallet está conectada.
 */
export async function isWalletConnected(page: Page): Promise<boolean> {
  const manager = BrowserSessionManager.getInstance();
  return manager.verifyWalletConnected(page);
}
