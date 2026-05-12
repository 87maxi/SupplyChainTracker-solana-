/**
 * Playwright Global Teardown
 *
 * Este archivo se ejecuta una vez después de todos los tests.
 * Se usa para limpiar recursos como browser instances y contextos.
 */

import { FullConfig } from "@playwright/test";

/**
 * Limpieza global para Playwright tests.
 * Cierra el browser y libera recursos.
 */
async function globalTeardown(_config: FullConfig) {
  console.log("[Global Teardown] Starting global teardown...");
  
  // Cerrar browser si existe
  const browser = (global as any).__playwrightBrowser;
  if (browser) {
    try {
      await browser.close();
      console.log("[Global Teardown] Browser closed successfully");
    } catch (error) {
      console.error("[Global Teardown] Error closing browser:", error);
    }
  }
  
  // Limpiar referencias globales
  (global as any).__playwrightBrowser = undefined;
  (global as any).__playwrightContext = undefined;
  (global as any).__playwrightPage = undefined;
  
  console.log("[Global Teardown] Global teardown complete");
}

export default globalTeardown;
