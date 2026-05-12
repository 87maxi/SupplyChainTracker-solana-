/**
 * Error Tracker Fixture
 * 
 * Captura y registra errores de consola y red durante la ejecución de tests E2E.
 * Este fixture se integra con Playwright para capturar:
 * - Errores de consola (console.error, console.warn)
 * - Requests fallidos (404, 500, etc.)
 * - Unhandled promise rejections
 * 
 * Uso:
 *   import { errorTracker } from './fixtures/error-tracker';
 *   
 *   test('mi test', async ({ page }) => {
 *     const tracker = errorTracker(page);
 *     // ... tu test
 *     tracker.reportErrors();
 *   });
 */

import { type Page, type ConsoleMessage, type Response } from '@playwright/test';

export interface ErrorEntry {
  type: 'console-error' | 'console-warn' | 'network-error' | 'unhandled-rejection';
  message: string;
  timestamp: number;
  url?: string;
  stack?: string;
}

export interface ErrorReport {
  errors: ErrorEntry[];
  warnings: ErrorEntry[];
  totalErrors: number;
  totalWarnings: number;
  summary: string;
}

/**
 * Crea un error tracker para una página específica
 */
export function errorTracker(page: Page) {
  const errors: ErrorEntry[] = [];
  const warnings: ErrorEntry[] = [];

  // Escuchar console.error
  page.on('console', (message: ConsoleMessage) => {
    const timestamp = Date.now();
    const url = message.location().url;
    
    if (message.type() === 'error') {
      errors.push({
        type: 'console-error',
        message: message.text(),
        timestamp,
        url,
      });
      console.error(`[CONSOLE ERROR] ${message.text()}`);
      console.error(`  URL: ${url}`);
      console.error(`  Location: ${message.location().fileName}:${message.location().lineNumber}`);
    } else if (message.type() === 'warning') {
      warnings.push({
        type: 'console-warn',
        message: message.text(),
        timestamp,
        url,
      });
      console.warn(`[CONSOLE WARN] ${message.text()}`);
    }
  });

  // Escuchar requests fallidos
  page.on('requestfailed', (request) => {
    const timestamp = Date.now();
    const url = request.url();
    const failure = request.failure();
    
    errors.push({
      type: 'network-error',
      message: `Request failed: ${request.method()} ${url} - ${failure?.errorText || 'Unknown error'}`,
      timestamp,
      url,
    });
    console.error(`[NETWORK ERROR] ${request.method()} ${url} - ${failure?.errorText || 'Unknown error'}`);
  });

  // Escuchar responses con status error
  page.on('response', async (response: Response) => {
    const status = response.status();
    const url = response.url();
    
    // Capturar 4xx y 5xx errors
    if (status >= 400 && status < 600) {
      const timestamp = Date.now();
      const contentType = response.headers()['content-type'] || '';
      
      // Ignorar errores esperados (como health checks)
      if (!url.includes('/health-check')) {
        errors.push({
          type: 'network-error',
          message: `HTTP ${status}: ${response.request().method()} ${url}`,
          timestamp,
          url,
        });
        console.error(`[HTTP ERROR] ${status} ${response.request().method()} ${url}`);
      }
    }
  });

  /**
   * Genera un reporte de errores
   */
  function generateReport(): ErrorReport {
    return {
      errors,
      warnings,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      summary: `Found ${errors.length} errors and ${warnings.length} warnings`,
    };
  }

  /**
   * Verifica si hay errores críticos
   */
  function hasCriticalErrors(): boolean {
    return errors.some(e => 
      e.type === 'console-error' || 
      e.type === 'network-error'
    );
  }

  /**
   * Limpia los errores capturados
   */
  function clearErrors() {
    errors.length = 0;
    warnings.length = 0;
  }

  return {
    generateReport,
    hasCriticalErrors,
    clearErrors,
    errors,
    warnings,
  };
}
