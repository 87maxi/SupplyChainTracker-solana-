# Issue: E2E Tests - Estabilidad de Sesión de Browser y Wallet Mock

## 📋 Resumen del Problema

Los tests E2E (end-to-end) del frontend Next.js presentan problemas críticos de estabilidad relacionados con:

1. **Múltiples instancias de browser**: Cada test abre un nuevo browser, perdiendo el contexto de sesión
2. **Wallet mock no conectando**: El MockWalletAdapter no se inyecta correctamente en todas las páginas
3. **Video incompleto**: Los videos de grabación no capturan el flujo completo del usuario
4. **Inconsistencia en CI/CD**: Los tests pasan localmente pero fallan en el pipeline

---

## 🔍 Análisis Profundo

### 1. Arquitectura Actual de Tests E2E

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLAYWRIGHT CONFIGURATION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  chromium    │    │   firefox    │    │   webkit     │       │
│  │  (parallel)  │    │  (parallel)  │    │ (parallel)   │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                    │               │
│         ▼                   ▼                    ▼               │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              EACH TEST OPENS NEW BROWSER             │        │
│  │              (NO SESSION PERSISTENCE)                │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │         FULL-FLOW-SEQUENTIAL PROJECT                 │        │
│  │         - workers: 1 (sequential)                     │        │
│  │         - storageState: e2e/.auth/user.json          │        │
│  │         - video: 'on'                                  │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Problema Raíz: Inyección de MockWalletAdapter

#### Flujo Actual (Roto):

```
┌──────────────────────────────────────────────────────────────────┐
│                    GLOBAL SETUP (Runs ONCE)                       │
│  1. Launch browser (headless: false)                             │
│  2. Create context with storageState                             │
│  3. Create single page                                           │
│  4. Inject MockWalletAdapter via addInitScript                   │
│  5. Auto-connect wallet                                          │
│  6. Save browser/context/page to global                          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    [Browser context closed]
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    EACH TEST RUNS                                  │
│  1. Playwright creates NEW browser instance                      │
│  2. Playwright creates NEW page                                  │
│  3. MockWalletAdapter NOT INJECTED (addInitScript lost)          │
│  4. WalletProvider tries to use REAL wallet extension            │
│  5. TEST FAILS - wallet undefined                                │
└──────────────────────────────────────────────────────────────────┘
```

#### Problemas Identificados:

| Problema | Causa | Impacto |
|----------|-------|---------|
| MockWallet no inyectado | `addInitScript` solo aplica a la página del global-setup | Tests no pueden conectar wallet |
| StorageState no persistente | Cada test abre nuevo browser sin `storageState` | Cookies/localStorage perdidos |
| Video incompleto | Video se graba por test, no por sesión | No se ve el flujo completo |
| Race conditions | Wallet mock no está listo cuando la app carga | Tests intermitentes |

### 3. Problema con WalletProvider

```typescript
// web/src/lib/solana/wallet-provider.tsx
export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const wallets = useMemo(
    () => {
      // Intenta usar wallets reales (Phantom, Solflare, etc.)
      // En tests, estas NO están disponibles
      return getWallets();
    },
    []
  );

  // Si no hay wallets disponibles, el usuario ve error
  if (wallets.length === 0) {
    return <WalletNotConnectedError />; // ❌ TESTS FALLAN AQUÍ
  }

  return (
    <WalletProvider wallets={wallets} autoConnect onError={onError}>
      {children}
    </WalletProvider>
  );
}
```

### 4. Problema con StorageState

```typescript
// web/playwright.config.ts
{
  name: "full-flow-sequential",
  testMatch: /full-flow\.spec\.ts/,
  workers: 1, // ✅ Correcto - single worker
  use: {
    storageState: 'e2e/.auth/user.json', // ✅ Configured
    // PERO: storageState se aplica al BROWSER CONTEXT, no a la página
    // Cada test crea un nuevo browser context
  },
}
```

---

## 🎯 Solución Propuesta

### Fase 1: Arquitectura de Sesión Única

```
┌─────────────────────────────────────────────────────────────────┐
│              SINGLE BROWSER SESSION ARCHITECTURE                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │              BROWSER INSTANCE (ONE)                       │     │
│  │  - Launched once at test start                            │     │
│  │  - Context created with storageState                      │     │
│  │  - MockWalletAdapter injected via addInitScript          │     │
│  └─────────────────────────────────────────────────────────┘     │
│                              │                                    │
│              ┌───────────────┼───────────────┐                    │
│              ▼               ▼               ▼                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   TEST 1     │  │   TEST 2     │  │   TEST 3     │           │
│  │   (Page 1)   │  │   (Page 2)   │  │   (Page 3)   │           │
│  │   + Wallet   │  │   + Wallet   │  │   + Wallet   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│              │               │               │                    │
│              └───────────────┼───────────────┘                    │
│                              ▼                                    │
│              ┌─────────────────────────────────┐                 │
│              │         VIDEO (COMPLETE)        │                 │
│              │    Captures entire flow         │                 │
│              └─────────────────────────────────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Fase 2: Inyección de Wallet en Cada Página

```typescript
// web/e2e/fixtures/wallet-injection.ts (NUEVO)
import { type Page } from '@playwright/test';

/**
 * Inyecta MockWalletAdapter en cada página antes de cargar contenido.
 * Esta función debe ser llamada en beforeEach de cada test.
 */
export async function injectMockWallet(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Inyectar MockWalletAdapter en el contexto del browser
    class MockWalletAdapter {
      private _connected = true;
      private _publicKey: PublicKey | null;
      
      constructor() {
        const MOCK_PUBLIC_KEY_BYTES = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          MOCK_PUBLIC_KEY_BYTES[i] = i;
        }
        this._publicKey = new PublicKey(MOCK_PUBLIC_KEY_BYTES);
      }
      
      // ... implementación completa ...
    }
    
    // Exponer globalmente para WalletProvider
    (window as any).MockWalletAdapter = MockWalletAdapter;
    
    // Auto-conectar
    const wallet = new MockWalletAdapter();
    wallet.autoConnect().then(() => {
      (window as any).__mockWallet = wallet;
    });
  });
}

/**
 * Configura el browser context para mantener sesión entre tests.
 */
export async function setupBrowserContext(page: Page): Promise<void> {
  // Cargar storageState si existe
  const fs = require('fs');
  const path = require('path');
  const authPath = path.join(__dirname, '..', '.auth', 'user.json');
  
  if (fs.existsSync(authPath)) {
    // Aplicar storageState a la página
    await page.context().addCookies(JSON.parse(fs.readFileSync(authPath, 'utf-8')).cookies);
    await page.context().setLocalStorage('mock-wallet-adapter-connected', 'true');
    await page.context().setLocalStorage('mock-wallet-address', 'MockWalletAddress1111111111111111111111111111111');
  }
}
```

### Fase 3: Configuración de Playwright

```typescript
// web/playwright.config.ts (MODIFICADO)
export default defineConfig({
  testDir: "./e2e",
  
  /* CRITICAL: Single worker for full-flow tests */
  workers: process.env.CI ? 1 : undefined,
  
  /* Preserve output for debugging */
  preserveOutput: 'always',
  
  /* Global setup for browser context */
  globalSetup: "./e2e/fixtures/global-setup.ts",
  
  /* Global teardown to close browser */
  globalTeardown: "./e2e/fixtures/global-teardown.ts",
  
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    /* CRITICAL: Video recording for full flow */
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    screenshot: 'on',
  },
  
  projects: [
    /* Full Flow - Single Browser Session */
    {
      name: "full-flow-sequential",
      testMatch: /full-flow\.spec\.ts/,
      fullyParallel: false,
      workers: 1, // CRITICAL: Force single worker
      use: {
        ...devices["Desktop Chrome"],
        video: 'on', // Always record for full flow
        trace: 'on',
        screenshot: 'on',
        storageState: 'e2e/.auth/user.json',
        launchOptions: {
          headless: false, // Show browser for debugging
          slowMo: 100,
        },
      },
    },
    
    /* Standard tests - parallel execution */
    {
      name: "chromium",
      use: { 
        ...devices["Desktop Chrome"],
        video: 'retain-on-failure',
        trace: 'on-first-retry',
      },
    },
  ],
});
```

### Fase 4: Wallet Provider en Modo Test

```typescript
// web/src/lib/solana/wallet-provider.tsx (MODIFICADO)
export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true' || 
                     typeof window !== 'undefined' && (window as any).__mockWallet;
  
  const wallets = useMemo(
    () => {
      if (isTestMode) {
        // Usar MockWalletAdapter en modo test
        const mockWallet = (window as any).__mockWallet || new (window as any).MockWalletAdapter();
        return [mockWallet];
      }
      // Usar wallets reales en producción
      return getWallets();
    },
    [isTestMode]
  );

  // Si no hay wallets y no es test mode, mostrar error
  if (wallets.length === 0 && !isTestMode) {
    return <WalletNotConnectedError />;
  }

  return (
    <WalletProvider wallets={wallets} autoConnect onError={onError}>
      {children}
    </WalletProvider>
  );
}
```

---

## 📝 Tareas de Implementación

### Tarea 1: Crear Sistema de Inyección de Wallet por Página

**Archivos a crear:**
- `web/e2e/fixtures/wallet-injection.ts` - Funciones de inyección de wallet
- `web/e2e/fixtures/global-teardown.ts` - Limpieza de browser al finalizar

**Archivos a modificar:**
- `web/e2e/fixtures/global-setup.ts` - Simplificar para solo configurar contexto
- `web/e2e/full-flow.spec.ts` - Usar nueva función de inyección

**Criterios de aceptación:**
- [ ] MockWalletAdapter se inyecta en cada página antes de cargar contenido
- [ ] Wallet se conecta automáticamente en cada test
- [ ] Global teardown cierra correctamente el browser

---

### Tarea 2: Configurar Sesión Única de Browser

**Archivos a modificar:**
- `web/playwright.config.ts` - Configurar workers y storageState
- `web/e2e/full-flow.spec.ts` - Asegurar ejecución secuencial

**Criterios de aceptación:**
- [ ] `workers: 1` configurado para full-flow-sequential
- [ ] `storageState` cargado correctamente en cada test
- [ ] Video grabado para todo el flujo, no por test individual

---

### Tarea 3: Habilitar Wallet Provider en Modo Test

**Archivos a modificar:**
- `web/src/lib/solana/wallet-provider.tsx` - Soporte para modo test
- `web/next.config.mjs` - Definir variable de entorno para test

**Criterios de aceptación:**
- [ ] WalletProvider detecta automáticamente modo test
- [ ] MockWalletAdapter se usa cuando `NEXT_PUBLIC_TEST_MODE=true`
- [ ] No se requiere extensión de browser en modo test

---

### Tarea 4: Actualizar Tests E2E

**Archivos a modificar:**
- `web/e2e/full-flow.spec.ts` - Usar nueva inyección de wallet
- `web/e2e/wallet-connection.spec.ts` - Actualizar para usar mock injection
- `web/e2e/dashboard.spec.ts` - Actualizar para usar mock injection

**Criterios de aceptación:**
- [ ] Todos los tests usan `injectMockWallet(page)` en beforeEach
- [ ] Tests pasan consistentemente en CI/CD
- [ ] Video muestra flujo completo del usuario

---

### Tarea 5: Actualizar CI/CD

**Archivos a modificar:**
- `.github/workflows/ci.yml` - Configurar variables de entorno para tests
- `.github/workflows/local-pipeline.sh` - Actualizar para incluir wallet injection

**Criterios de aceptación:**
- [ ] `NEXT_PUBLIC_TEST_MODE=true` definido en job de tests E2E
- [ ] StorageState file generado antes de ejecutar tests
- [ ] Videos y traces se archivan como artifacts

---

## 🧪 Plan de Pruebas

### Pruebas Locales

```bash
# 1. Generar storageState
cd web && npx playwright test --project=full-flow-sequential --headed

# 2. Ejecutar tests con browser visible
cd web && npx playwright test full-flow.spec.ts --headed --project=full-flow-sequential

# 3. Ejecutar tests en modo headless
cd web && npx playwright test full-flow.spec.ts --project=full-flow-sequential

# 4. Verificar video generado
ls -la web/e2e/videos/flow/
```

### Pruebas en CI/CD

```yaml
# .github/workflows/ci.yml
test-e2e-full-flow:
  runs-on: ubuntu-latest
  timeout-minutes: 15
  env:
    NEXT_PUBLIC_TEST_MODE: "true"
    NEXT_PUBLIC_APP_URL: "http://localhost:3001"
  steps:
    - name: Start Next.js server
      run: |
        cd web
        npm run build
        npm start &
        sleep 10
    
    - name: Generate storageState
      run: |
        cd web
        npx playwright test --project=full-flow-sequential --headed
    
    - name: Run E2E tests
      run: |
        cd web
        npx playwright test full-flow.spec.ts --project=full-flow-sequential
    
    - name: Upload artifacts
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: e2e-artifacts
        path: |
          web/e2e/videos/
          web/e2e/screenshots/
          web/test-results/
```

---

## 📊 Métricas de Éxito

| Métrica | Antes | Después (Target) |
|---------|-------|------------------|
| Pass rate en CI/CD | ~60% | >95% |
| Tiempo de ejecución | 120s | 90s |
| Videos completos | 0% | 100% |
| Flaky tests | 15% | <2% |
| Browser instances por test | 1 | 0 (reutilizado) |

---

## 🔗 Dependencias

- **Fase 1** → **Fase 2** → **Fase 3** → **Fase 4** → **Fase 5**
- Las fases pueden paralelizarse parcialmente después de la Fase 1

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Breaking changes en WalletProvider | Alta | Alto | PR incremental con feature flag |
| Tests más lentos | Media | Medio | Ajustar timeouts y parallelización |
| StorageState no compatible | Baja | Alto | Fallback a inyección por página |
| CI/CD timeout | Media | Medio | Aumentar timeout para full-flow |

---

## 📅 Estimación

| Fase | Tareas | Estimación |
|------|--------|------------|
| Fase 1: Inyección de Wallet | 1 | 2 horas |
| Fase 2: Sesión Única | 2 | 1.5 horas |
| Fase 3: Wallet Provider | 3 | 2 horas |
| Fase 4: Actualizar Tests | 4 | 3 horas |
| Fase 5: CI/CD | 5 | 2 horas |
| **Total** | **15 tareas** | **~10.5 horas** |

---

## 📌 Notas Adicionales

1. **Prioridad**: Alta - Los tests E2E son críticos para validar el flujo de usuario
2. **Bloqueo**: Ninguno - No depende de otros work items
3. **Requiere revisión**: Sí - Especialmente los cambios en WalletProvider
4. **Backwards compatible**: Sí - Los cambios se activan con feature flag

---

## 📚 Referencias

- [Playwright Test Configuration](https://playwright.dev/docs/test-configuration)
- [Playwright Storage State](https://playwright.dev/docs/api/class-browsercontext#browser-context-add-cookies)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
