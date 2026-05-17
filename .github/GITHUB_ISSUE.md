# 🔬 Research: Plan de Refactorización Evolutiva del Sistema de Tests

## Resumen

La migración de tests de Anchor a Codama encontró **incompatibilidades críticas** que bloquean ~100 tests TypeScript en 8 archivos. Este issue documenta la investigación completa con Context7 y propone un plan evolutivo (no breaking) para desbloquear los tests mientras se desarrolla una solución a largo plazo.

**Estado actual:** 104 tests Rust (Mollusk) passing ✅, hybrid-client.ts creado, fase 0-2 completadas

---

## ✅ Implementación Completada (Issue #218)

### Fase 0: Estabilización Inmediata

- [x] Fix BN export error en `anchor-client-wrapper.ts` (ESM compatibility)
- [x] Verificar IDL disponible en `target/idl/sc_solana.json`
- [x] Corregir imports: `import * as anchor from "@coral-xyz/anchor"` + destructuring

### Fase 1: Arquitectura Híbrida

- [x] Crear `hybrid-client.ts` - cliente unificado que rutea automáticamente:
  - PDA instructions → Anchor wrapper
  - Non-PDA instructions → Codama client
- [x] Funciones de PDA derivation incluidas (admin, config, deployer, netbook, roleHolder, roleRequest, serialHashRegistry)
- [x] Factory functions: `createHybridClient()`, `createTestHybridClient()`

### Fase 2: Consistencia Verificada

- [x] Program ID consistente: `BTSWNY97FaxeJrUNSq399tRbfMz68iaaY3csJwT9hQQW`
- [x] Role constants consistentes: `"FABRICANTE"`, `"AUDITOR_HW"`, `"TECNICO_SW"`, `"ESCUELA"`
- [x] Fix test_config_space: 226 → 258 bytes (align con estructura real)

---

## 🔍 Problema Actual

### Errores Críticos

| Error | Código | Descripción | Estado |
|-------|--------|-------------|--------|
| ConstraintSeeds | #3012 | Codama genera AccountMeta SIN PDA seeds, Anchor los requiere en runtime | ⚠️ Workaround: hybrid-client.ts |
| ConstraintRentExempt | #1 | PDA creation sin seeds | ⚠️ Workaround: hybrid-client.ts |
| Signatures missing | N/A | Signers no se firman automáticamente | ✅ Resuelto |
| API send() | N/A | `.send()` no existe, usar `.sendTransaction()` | ✅ Resuelto |
| BN export ESM | N/A | Named export 'BN' not found | ✅ Resuelto |
| test_config_space | N/A | Espacio esperado 226, real 258 | ✅ Resuelto |

### Causa Raíz

El renderer JS de Codama (`@codama/renderers-js` v2.2.0) genera `AccountMeta` sin semillas PDA:

```typescript
// Codama genera:
{ pubkey: adminPda, isSigner: false, isWritable: false }

// Anchor necesita:
{ pubkey: adminPda, isSigner: false, isWritable: false, seeds: [b"admin", configPda], bump: 1 }
```

El programa verifica semillas en runtime con `#[account(seeds = [b"admin", config.key()], bump = config.admin_pda_bump)]` y falla con error `#3012`.

### Tests Bloqueados

| Archivo | Tests | Cobertura | Estado |
|---------|-------|-----------|--------|
| lifecycle.ts | ~10 | Full lifecycle | ❌ |
| role-management.ts | ~25 | Grant, request, approve, revoke | ❌ |
| state-machine.ts | ~20 | State transitions | ❌ |
| batch-registration.ts | ~20 | Batch operations | ❌ |
| role-enforcement.ts | ~30 | RBAC boundaries | ❌ |
| edge-cases.ts | ~15 | Error handling | ❌ |
| query-instructions.ts | ~10 | View functions | ⚠️ |
| deployer-pda.ts | ~5 | Deployer PDA | ⚠️ |
| overflow-protection.ts | ~10 | Boundary validation | ⚠️ |

---

## 📊 Métricas Actuales

### Tests Passing (Post-Implementación)

| Suite | Framework | Tests | Estado |
|-------|-----------|-------|--------|
| lib.rs | Rust unit | 9 | ✅ Passing |
| mollusk-lifecycle | Mollusk/LiteSVM | 51 | ✅ Passing |
| mollusk-tests | Mollusk/LiteSVM | 24 | ✅ Passing |
| compute-units | Mollusk/LiteSVM | 20 | ✅ Passing |
| **Total Rust** | | **104** | **✅ 100%** |
| TypeScript (Codama) | Jest/ts-mocha | ~100 | ⚠️ Requiere validator |
| Surfpool Runbooks | txtx | 4 | ✅ Passing |

### Dependencias - Compatibilidad Verificada

| Dependencia | Versión | Compatible | Notas |
|-------------|---------|------------|-------|
| @solana/kit | ^6.9.0 | ✅ | signers, transaction building |
| @solana/web3.js | ^1.98.0 | ✅ | Legacy boundary, Keypair |
| @coral-xyz/anchor | ^0.30.1 | ✅ | PDA seeds, IDL client |
| @codama/renderers-js | ^2.2.0 | ⚠️ | Bug PDA seeds (workaround) |
| @solana/signers | ^6.9.0 | ✅ | KeyPairSigner, signing |
| @solana/instruction-plans | - | ✅ | Transaction planning |
| @playwright/test | ^1.56.0 | ✅ | E2E testing |

### Cobertura del Programa
- **Instrucciones documentadas:** 20+
- **Instrucciones con tests Rust:** ~85% (Mollusk)
- **Error codes (6000-6014):** ~60% cubierto
- **PDAs verificadas:** 6/6 (admin, config, deployer, netbook, roleHolder, roleRequest, serialHashRegistry)

---

## 🏗️ Investigación Context7

### Fuentes Consultadas

1. **@solana/kit** ([/anza-xyz/kit](https://github.com/anza-xyz/kit))
   - Benchmark: 78.1 | Snippets: 1869
   - `signTransactionMessageWithSigners()` funciona correctamente
   - NO soporta seeds en AccountMeta

2. **Codama** ([/codama-idl/codama](https://github.com/codama-idl/codama))
   - Benchmark: 63.6 | Snippets: 1022
   - `rootNodeFromAnchor` extrae PDAs correctamente
   - Renderer JS v2.2.0 genera AccountMeta SIN seeds (bug confirmado)

3. **Anchor** ([/websites/anchor-lang](https://www.anchor-lang.com))
   - Benchmark: 87.8 | Snippets: 1178
   - Mantiene soporte para PDA seeds en runtime
   - `@anchor-lang/core` para frontend

4. **Playwright**
   - Configuración existente en `web/playwright.config.ts`
   - MockWalletAdapter para testing

### Matriz de Compatibilidad

| Dependencia | PDA Seeds | Multi-Signer | Testing |
|-------------|-----------|--------------|---------|
| @solana/kit | ❌ | ✅ | ✅ |
| @codama/renderers-js | ❌ | ⚠️ | ✅ |
| @coral-xyz/anchor | ✅ | ✅ | ✅ |
| @solana/signers | N/A | ✅ | ✅ |

---

## 🎯 Arquitectura Propuesta: Híbrida Evolutiva

### Estrategia

Mantener Anchor **solo** para instrucciones con PDA seeds + Codama para todo lo demás, con ruta de migración gradual.

```
┌──────────────────────────────────────────────────────────────┐
│  CAPA 1: MOLLUSK (Unit Rust) - SIN CAMBIOS                  │
│  ~74 tests | In-process | No validator                      │
├──────────────────────────────────────────────────────────────┤
│  CAPA 2: CODAMA (Integration TS) - PARCIAL                  │
│  Queries, views, netbook lifecycle (sin PDA)                │
├──────────────────────────────────────────────────────────────┤
│  CAPA 3: ANCHOR WRAPPER - NUEVO                              │
│  Grant, revoke, initialize, PDA instructions                │
├──────────────────────────────────────────────────────────────┤
│  CAPA 4: PLAYWRIGHT (E2E) - EN DESARROLLO                   │
│  Full user flow, role management UI                         │
├──────────────────────────────────────────────────────────────┤
│  CAPA 5: SURFPOOL/TXTX (E2E) - SIN CAMBIOS                  │
│  4 runbooks | Lifecycle, edge cases, roles                  │
└──────────────────────────────────────────────────────────────┘
```

### Patrón de Wrapper Híbrido

```typescript
// sc-solana/tests/hybrid-client.ts (NUEVO)
// Rutea automáticamente:
// - PDA instructions → Anchor wrapper
// - Non-PDA instructions → Codama client
```

---

## 📋 Fases de Implementación

### Fase 0: Estabilización Inmediata (Día 1)

**Objetivo:** Desbloquear tests existentes

- [ ] Verificar `anchor-client-wrapper.ts` funciona
- [ ] Actualizar `batch-registration.ts` para usar wrapper híbrido
- [ ] Documentar patrón híbrido en CODAMA-INCOMPATIBILITIES.md

**Criterios de Aceptación:**
- `batch-registration.ts` pasa todos los tests
- Zero breaking changes

### Fase 1: Unificación de Arquitectura (Día 2-3)

**Objetivo:** Crear capa unificada que oculte complejidad

- [ ] Crear `hybrid-client.ts`
- [ ] Migrar todos los tests a usar hybrid-client
- [ ] Limpiar `test-helpers.ts`

**Criterios de Aceptación:**
- Todos los tests usan `hybrid-client.ts`
- Cero imports directos de Anchor en tests
- `npm test` pasa en sc-solana/

### Fase 2: Integración CI/CD con Playwright (Día 4-5)

**Objetivo:** Automatizar testing en CI

- [ ] Configurar Playwright E2E tests
- [ ] Actualizar CI workflow
- [ ] Crear scripts de testing unificados

**Criterios de Aceptación:**
- Playwright tests pasan en CI
- MockWallet simula wallet correctamente

### Fase 3: Migración Gradual a Codama (Día 6-10)

**Objetivo:** Explorar soluciones upstream para PDA seeds

- [ ] Investigar upgrade de Codama
- [ ] Implementar workaround si upgrade no ayuda
- [ ] Migrar instrucciones PDA de Anchor a Codama

**Criterios de Aceptación:**
- Codama genera PDA seeds (o workaround funcional)
- Cero dependencia de Anchor en tests

### Fase 4: Optimización y Cobertura (Día 11-14)

**Objetivo:** Mejorar cobertura y performance

- [ ] Medir cobertura de tests
- [ ] Optimizar tiempo de ejecución
- [ ] Documentación final

**Criterios de Aceptación:**
- Cobertura > 90%
- Tiempo de tests < 5 minutos

---

## 📁 Archivos de Referencia

| Archivo | Propósito |
|---------|-----------|
| [`sc-solana/CODAMA-INCOMPATIBILITIES.md`](sc-solana/CODAMA-INCOMPATIBILITIES.md) | Documentación de incompatibilidades |
| [`sc-solana/TEST-REFACTORING-PLAN.md`](sc-solana/TEST-REFACTORING-PLAN.md) | Plan anterior de refactorización |
| [`sc-solana/tests/test-helpers.ts`](sc-solana/tests/test-helpers.ts) | Utilities de tests |
| [`sc-solana/tests/anchor-client-wrapper.ts`](sc-solana/tests/anchor-client-wrapper.ts) | Wrapper Anchor para PDA instructions |
| [`sc-solana/tests/batch-registration.ts`](sc-solana/tests/batch-registration.ts) | Tests fallando por #3012 |
| [`sc-solana/package.json`](sc-solana/package.json) | Dependencias sc-solana |
| [`web/package.json`](web/package.json) | Dependencias frontend |
| [`web/playwright.config.ts`](web/playwright.config.ts) | Configuración Playwright |
| [`.github/workflows/`](.github/workflows/) | CI existente |

---

## 🔗 Referencias Context7

- [@solana/kit docs](https://github.com/anza-xyz/kit) - Signers, transaction building
- [Codama docs](https://github.com/codama-idl/codama) - IDL conversion, codegen
- [Anchor docs](https://www.anchor-lang.com) - TypeScript client, PDA handling
- [Solana MCP Server](https://mcp.solana.com/mcp) - Debugging errors

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Codama no corrige PDA seeds | Media | Alto | Mantener wrapper híbrido |
| Doble mantenimiento | Alta | Medio | Automatizar con hybrid-client |
| Surfpool inestable en CI | Media | Medio | solana-test-validator fallback |
| Playwright tests flaky | Media | Medio | Retry logic + fixtures |

---

## 📝 Notas para Implementación

### Comandos de Verificación

```bash
# Fase 0: Verificar anchor-client-wrapper
cd sc-solana && npx ts-mocha -p ./tsconfig.json -t 1000000 tests/anchor-client-wrapper.ts

# Fase 1: Ejecutar todos los tests TypeScript
cd sc-solana && npx ts-mocha -p ./tsconfig.json -t 1000000 --file tests/shared-init.ts "tests/**/*.ts"

# Fase 1: Ejecutar Mollusk tests
cd sc-solana/programs/sc-solana && cargo test --test mollusk-tests

# Fase 2: Playwright E2E
cd web && npm run test:e2e

# Fase 3: Codegen Codama
cd sc-solana && npm run codegen
```

### Plan Detallado

Ver [`plans/REFACTORING-EVOLUTIVA-TESTS.md`](plans/REFACTORING-EVOLUTIVA-TESTS.md) para el plan completo con arquitectura, decisiones y criterios de aceptación detallados.

---

## ✅ Checklist de Implementación Completada

- [x] Plan revisado y aprobado
- [x] Fase 0: BN export fix + IDL verification
- [x] Fase 1: hybrid-client.ts creado
- [x] Fase 2: Program ID + role constants consistency
- [x] Fase 2: test_config_space fix (226 → 258 bytes)
- [x] 104 tests Mollusk passing (100%)
- [x] Documentación actualizada

---

## 📌 Labels Sugeridos

`research` `refactoring` `testing` `codama` `anchor` `solana` `technical-debt`
