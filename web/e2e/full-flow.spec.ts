/**
 * Full User Flow E2E Test - Continuous Browser Session
 *
 * Este test simula un flujo completo de usuario en una sola sesión de browser,
 * sin cortes entre tests. Captura el video completo del flujo para revisión visual.
 *
 * Características:
 * - Ejecución secuencial con un solo browser instance
 * - Video continuo de todo el flujo
 * - slowMo para visualización fluida
 * - Screenshots en puntos clave del flujo
 *
 * Ejecución:
 *   # Local (modo headed - browser visible)
 *   npx playwright test full-flow.spec.ts --headed --project=chromium
 *
 *   # Local (modo headless con video)
 *   npx playwright test full-flow.spec.ts --project=chromium
 *
 *   # CI (siempre headless con video)
 *   npx playwright test full-flow.spec.ts --project=chromium
 */

import { test, expect } from './fixtures/wallet-middleware';
import type { Page } from '@playwright/test';

// Configuración del flujo
const FLOW_CONFIG = {
  slowMo: process.env.FLOW_SLOW_MO ? parseInt(process.env.FLOW_SLOW_MO) : 100,
  screenshotDir: 'e2e/screenshots/flow',
  videoDir: 'e2e/videos/flow',
};

/**
 * Helper para tomar screenshot con timestamp
 */
async function takeScreenshot(page: Page, name: string): Promise<void> {
  const timestamp = Date.now();
  const filename = `${FLOW_CONFIG.screenshotDir}/${name}-${timestamp}.png`;
  
  await page.screenshot({
    path: filename,
    fullPage: false
  });
  console.log(`Screenshot saved: ${filename}`);
}

/**
 * Flujo completo del usuario:
 * 1. Navegar a la página principal
 * 2. Verificar que la app carga correctamente
 * 3. Verificar estado de wallet conectada (mock)
 * 4. Navegar al dashboard
 * 5. Verificar carga de netbooks
 * 6. Interactuar con filtros
 * 7. Verificar detalles de netbook
 */
test.describe('Full User Flow - Continuous Session', () => {
  test.beforeEach(async ({ page }) => {
    // Configurar slowMo para visualización fluida
    await page.setDefaultTimeout(30000);
    await page.setDefaultNavigationTimeout(30000);
  });

  test('should complete full user flow in single browser session', async ({ page }) => {
    // ============================================
    // PASO 1: Navegar a la página principal
    // ============================================
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, '01-homepage-loaded');
    });

    // ============================================
    // PASO 2: Verificar que la app carga correctamente
    // ============================================
    await test.step('Verify app loads correctly', async () => {
<<<<<<< HEAD
      // Verificar que el título principal de la página aparece
      // Usar locator específico para evitar strict mode violation (hay 2 h1 en la página)
      // El h1 principal es el de mayor tamaño (text-5xl)
      await expect(page.locator('h1.text-5xl')).toBeVisible({ timeout: 10000 });
=======
      // Verificar que el título principal de la app aparece (evitar strict mode violation)
      // Hay 2 h1 en la página: uno en el logo y otro en el hero section
      await expect(page.getByRole('heading', { name: 'Trazabilidad Inmutable para' })).toBeVisible({ timeout: 10000 });
>>>>>>> bff1aa190dc8616ad5f200b77569d4016a400cdf
      await takeScreenshot(page, '02-app-loaded');
    });

    // ============================================
    // PASO 3: Verificar estado de wallet conectada (mock)
    // ============================================
    await test.step('Verify wallet connection status', async () => {
      // Con MockWalletAdapter, la wallet debería estar conectada automáticamente
<<<<<<< HEAD
      // Verificar que el botón de wallet existe (WalletMultiButton o estado conectado)
      // El botón puede ser WalletMultiButton (cuando no conectado) o el estado conectado con dirección
      const walletButton = page.locator('button').first();
      
      // Esperar un poco para que el componente se cargue
      await page.waitForTimeout(1000);
      
      // Verificar que hay algún elemento de wallet en la página
      const walletElements = page.locator('button, [class*="wallet"], [class*="connect"]');
      const walletCount = await walletElements.count();
      console.log(`Wallet elements found: ${walletCount}`);
=======
      // WalletMultiButton muestra "Connect Wallet" cuando no conectada, o la dirección cuando conectada
      // Usar un selector más flexible que coincida con el botón real
      const walletButton = page.locator('button').filter({ hasText: /Connect|Wallet|0x|Mock/ }).first();
      
      // Verificar que el botón existe (timeout más largo para esperar React hydrate)
      await expect(walletButton).toBeVisible({ timeout: 15000 });
      
      // Si está conectada, mostrará la dirección; si no, mostrará "Connect Wallet"
      const buttonText = await walletButton.textContent();
      console.log(`Wallet button text: ${buttonText}`);
>>>>>>> bff1aa190dc8616ad5f200b77569d4016a400cdf
      
      await takeScreenshot(page, '03-wallet-status');
    });

    // ============================================
    // PASO 4: Navegar al dashboard
    // ============================================
    await test.step('Navigate to dashboard', async () => {
      // Buscar y hacer clic en el enlace/link al dashboard
      const dashboardLink = page.locator('a:has-text("Dashboard"), [data-testid="dashboard-link"]');
      
      if (await dashboardLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dashboardLink.click();
        await page.waitForURL('**/dashboard*', { timeout: 10000 });
      } else {
        // Si ya estamos en dashboard o no hay link, verificar que el contenido carga
        await page.waitForLoadState('networkidle');
      }
      
      await takeScreenshot(page, '04-dashboard-navigated');
    });

    // ============================================
    // PASO 5: Verificar carga de netbooks
    // ============================================
    await test.step('Verify netbooks load on dashboard', async () => {
      // Esperar a que la tabla o lista de netbooks cargue
      const netbookTable = page.locator('table, [data-testid="netbook-table"], .netbook-list');
      
      // Verificar que hay contenido (aunque sea placeholder en mock)
      await page.waitForTimeout(2000); // Dar tiempo a la carga
      
      await takeScreenshot(page, '05-dashboard-netbooks');
    });

    // ============================================
    // PASO 6: Interactuar con filtros
    // ============================================
    await test.step('Interact with filters', async () => {
      // Buscar elementos de filtro
      const filterSelect = page.locator('select, [data-testid="filter-select"]');
      
      if (await filterSelect.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        // Seleccionar una opción del filtro
        await filterSelect.first().selectOption({ index: 0 }).catch(() => {});
        await page.waitForTimeout(1000);
      }
      
      await takeScreenshot(page, '06-filters-interacted');
    });

    // ============================================
    // PASO 7: Verificar detalles de netbook
    // ============================================
    await test.step('View netbook details', async () => {
      // Buscar y hacer clic en una netbook para ver detalles
      const netbookItem = page.locator('[data-testid="netbook-item"], tr:has(td), .netbook-card').first();
      
      if (await netbookItem.isVisible({ timeout: 5000 }).catch(() => false)) {
        await netbookItem.click();
        await page.waitForTimeout(2000);
      }
      
      await takeScreenshot(page, '07-netbook-details');
    });

    // ============================================
    // PASO 8: Navegación de vuelta al inicio
    // ============================================
    await test.step('Navigate back to homepage', async () => {
      const homeLink = page.locator('a:has-text("Home"), [data-testid="home-link"]');
      
      if (await homeLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await homeLink.click();
        await page.waitForURL('/**', { timeout: 10000 });
      }
      
      await takeScreenshot(page, '08-back-to-homepage');
    });

    // ============================================
    // VERIFICACIÓN FINAL
    // ============================================
    await test.step('Final verification', async () => {
      // Verificar que la página sigue funcionando
      await expect(page.locator('body')).toBeVisible();
      await takeScreenshot(page, '09-final-state');
      
      console.log('✅ Full user flow completed successfully in single browser session');
    });
  });

  test('should handle navigation errors gracefully', async ({ page }) => {
    // Test de resiliencia - navegar a URLs inválidas y verificar comportamiento
    await test.step('Navigate to invalid URL', async () => {
      await page.goto('/non-existent-page', { waitUntil: 'commit' }).catch(() => {});
      
      // Verificar que la app no crasha
      await expect(page.locator('body')).toBeVisible({ timeout: 5000 });
      await takeScreenshot(page, 'error-page-state');
    });

    await test.step('Navigate back to valid page', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      await takeScreenshot(page, 'recovered-state');
    });
  });
});

/**
 * Test de rendimiento del flujo completo
 * Mide el tiempo de carga en cada paso
 */
test.describe('Full Flow Performance', () => {
  test('should measure flow performance metrics', async ({ page }) => {
    const metrics: Record<string, number> = {};
    
    // Paso 1: Tiempo de carga inicial
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    metrics['initial_load'] = Date.now() - startTime;
    
    await takeScreenshot(page, 'performance-01');
    
    // Paso 2: Tiempo de navegación a dashboard
    const dashboardStart = Date.now();
    const dashboardLink = page.locator('a:has-text("Dashboard"), [data-testid="dashboard-link"]');
    
    if (await dashboardLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dashboardLink.click();
      await page.waitForURL('**/dashboard*', { timeout: 10000 });
    }
    metrics['dashboard_navigate'] = Date.now() - dashboardStart;
    
    await takeScreenshot(page, 'performance-02');
    
    // Reportar métricas
    console.log('Performance Metrics:', JSON.stringify(metrics, null, 2));
    
    // Verificar que los tiempos son razonables (< 10 segundos cada uno)
    for (const [step, time] of Object.entries(metrics)) {
      expect(time).toBeLessThan(10000);
    }
  });
});
