# Análisis Profundo del Proyecto SupplyChainTracker

**Fecha:** 2026-05-16
**Alcance:** Código completo del repositorio SupplyChainTracker-solana
**Estado:** Análisis sin modificaciones (solo hallazgos)

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Imports Innecesarios](#2-imports-innecesarios)
3. [Código Legado Identificado](#3-código-legado-identificado)
4. [Scripts a Evaluar](#4-scripts-a-evaluar)
5. [Consistencia CI/CD](#5-consistencia-cicd)
6. [Estado de Issues](#6-estado-de-issues)
7. [Inconsistencias de Arquitectura](#7-inconsistencias-de-arquitectura)
8. [Recomendaciones por Prioridad](#8-recomendaciones-por-prioridad)

---

## 1. Resumen Ejecutivo

El proyecto presenta una **migración parcial de Anchor a Codama** que generó código legacy acumulado. Los hallazgos principales son:

| Categoría | Hallazgos Críticos | Hallazgos Menores |
|-----------|-------------------|-------------------|
| Código Legacy | 4 hooks obsoletos, 2 funciones deprecated, 1 servicio completo obsoleto | 7 aliases deprecated |
| Imports | 5 archivos con `@solana/web3.js` aún usados | 1 archivo con `@coral-xyz/anchor` |
| Scripts | 3 scripts duplicados entre `scripts/` y `web/scripts/` | 1 script con dependencias obsoletas |
| CI/CD | 3 inconsistencias de versión Solana | 1 job duplicado |
| Arquitectura | Program ID inconsistente en 3 archivos | 2 directorios generados duplicados |

---

## 2. Imports Innecesarios

### 2.1 `@solana/web3.js` en Frontend (5 archivos)

| Archivo | Imports | Impacto |
|---------|---------|---------|
| [`web/src/services/UnifiedSupplyChainService.ts`](web/src/services/UnifiedSupplyChainService.ts:17) | `Connection, PublicKey, SystemProgram, Transaction` | **ALTO** - Debería usar `@solana/kit` |
| [`web/src/hooks/useSupplyChainService.ts`](web/src/hooks/useSupplyChainService.ts:10) | `Connection` | **ALTO** - Ya tiene `@solana/kit` |
| [`web/src/lib/solana/event-listener.ts`](web/src/lib/solana/event-listener.ts:12) | `PublicKey, Logs` | **MEDIO** - `Logs` no está en kit estable |
| [`web/src/lib/solana/connection.ts`](web/src/lib/solana/connection.ts:11) | `Connection` | **BAJO** - Deprecated pero necesario para compatibilidad |
| [`web/src/app/tokens/create/page.tsx`](web/src/app/tokens/create/page.tsx:17) | `PublicKey` | **BAJO** - Uso puntual válido |

**Recomendación:** Migrar los 3 archivos de impacto ALTO a `@solana/kit`. Los otros 2 son aceptables por compatibilidad.

### 2.2 `@coral-xyz/anchor` en Tests (1 archivo)

| Archivo | Imports | Impacto |
|---------|---------|---------|
| [`sc-solana/tests/anchor-client-wrapper.ts`](sc-solana/tests/anchor-client-wrapper.ts:21) | `import * as anchor from "@coral-xyz/anchor"` | **ALTO** - Wrapper intencional para PDAs |

**Nota:** Este archivo es parte de la estrategia híbrida documentada en GITHUB_ISSUE.md. No debe eliminarse.

### 2.3 Imports de Generados Duplicados

Se encontró que [`web/src/lib/contracts/SupplyChainContract.ts`](web/src/src/lib/contracts/SupplyChainContract.ts:22) importa desde `@/generated/src/generated/`:

```typescript
import {
  fetchMaybeSupplyChainConfig,
  fetchMaybeNetbook,
  type SupplyChainConfig,
  type Netbook,
} from '@/generated/src/generated/accounts';
```

Esto apunta a un alias `@/generated` que debe verificarse en `tsconfig.json`.

---

## 3. Código Legado Identificado

### 3.1 Hooks Deprecated (4 archivos) - **PRIORIDAD ALTA**

| Archivo | Estado | Uso Actual | Impacto |
|---------|--------|------------|---------|
| [`web/src/hooks/useUserStats.ts`](web/src/hooks/useUserStats.ts:1) | `@deprecated` | Retorna datos vacíos | **ALTO** - Código muerto |
| [`web/src/hooks/useNetbookStats.ts`](web/src/hooks/useNetbookStats.ts:1) | `@deprecated` | Retorna datos vacíos | **ALTO** - Código muerto |
| [`web/src/hooks/useProcessedUserAndNetbookData.ts`](web/src/hooks/useProcessedUserAndNetbookData.ts:1) | `@deprecated` | Retorna datos vacíos | **ALTO** - Código muerto |
| [`web/src/hooks/useWeb3.ts`](web/src/hooks/useWeb3.ts:1) | `@deprecated` | Re-exporta `useSolanaWeb3` | **MEDIO** - Wrapper innecesario |

**Código actual de `useUserStats.ts`:**
```typescript
export function useUserStats() {
  return {
    totalUsers: 0,
    activeUsers: 0,
    loading: false,
    stats: { totalUsers: 0, activeUsers: 0 },
    isLoading: false,
  };
}
```

**Impacto:** Estos hooks retornan datos vacíos y no tienen consumidores activos. Se pueden eliminar de forma segura.

### 3.2 Funciones Deprecated en `solana-program.ts` (7 aliases) - **PRIORIDAD MEDIA**

| Línea | Función | Alias Deprecated |
|-------|---------|-----------------|
| 310 | `findConfigPdaAsync` | `findConfigPda` |
| 316 | `findDeployerPdaAsync` | `findDeployerPda` |
| 322 | `findNetbookPdaAsync` | `findNetbookPda` |
| 328 | `findRoleRequestPdaAsync` | `findRoleRequestPda` |
| 334 | `findRoleHolderPdaAsync` | `findRoleHolderPda` |
| 340 | `findAdminPdaAsync` | `findAdminPda` |
| 346 | `findSerialHashRegistryPdaAsync` | `findSerialHashRegistryPda` |

**Nota:** Estos son aliases de compatibilidad. No son código muerto, pero deberían ser removidos en la próxima major version.

### 3.3 `SupplyChainContract.ts` - Funciones Deprecated (2 funciones) - **PRIORIDAD MEDIA**

| Línea | Función | Estado |
|-------|---------|--------|
| 47 | `createProvider()` | Retorna `null` con `console.warn` |
| 57 | `getSupplyChainProgram()` | Retorna `null` con `console.warn` |

**Impacto:** Estas funciones son parte de la capa legacy de Anchor. No son usadas por el código actual.

### 3.4 `contract-registry.service.ts` - Servicio Completo Obsoleto - **PRIORIDAD ALTA**

[`web/src/services/contract-registry.service.ts`](web/src/services/contract-registry.service.ts:1):
```typescript
// @deprecated Legacy Ethereum-based registry - migrated to Solana
// This file is kept for backward compatibility but all functionality has been removed.
```

**Impacto:** Archivo completo con clases vacías. Se puede eliminar de forma segura.

### 3.5 `connection.ts` - Connection Deprecated - **PRIORIDAD BAJA**

[`web/src/lib/solana/connection.ts`](web/src/lib/solana/connection.ts:48):
```typescript
/**
 * @deprecated Use `rpc` (v2 API) instead.
 */
export const connection = new Connection(httpUrl);
```

**Impacto:** El `Connection` de web3.js v1 sigue siendo usado por código legacy. No eliminar hasta migrar todos los consumidores.

---

## 4. Scripts a Evaluar

### 4.1 Scripts en `scripts/` (Root)

| Script | Propósito | Estado | Recomendación |
|--------|-----------|--------|---------------|
| [`scripts/refactoring-validation.sh`](scripts/refactoring-validation.sh:1) | Validar fases de refactorización | **ACTIVO** | Mantener |
| [`scripts/start-local-validator.sh`](scripts/start-local-validator.sh:1) | Iniciar validator local | **ACTIVO** | Mantener |
| [`scripts/stop-local-validator.sh`](scripts/stop-local-validator.sh:1) | Detener validator local | **ACTIVO** | Mantener |
| [`scripts/verify-local-validator.sh`](scripts/verify-local-validator.sh:1) | Verificar validator | **ACTIVO** | Mantener |

### 4.2 Scripts en `web/scripts/`

| Script | Propósito | Duplicación | Recomendación |
|--------|-----------|-------------|---------------|
| [`web/scripts/run-all-tests.sh`](web/scripts/run-all-tests.sh:1) | Ejecutar todos los tests | **DUPLICADO** con `npm run test:all` | Eliminar |
| [`web/scripts/run-e2e-tests.sh`](web/scripts/run-e2e-tests.sh:1) | Ejecutar E2E tests | **DUPLICADO** con `npm run test:e2e` | Eliminar |
| [`web/scripts/run-e2e-with-error-report.sh`](web/scripts/run-e2e-with-error-report.sh:1) | E2E con reporte de errores | **ÚNICO** | Mantener |
| [`web/scripts/run-unit-tests.sh`](web/scripts/run-unit-tests.sh:1) | Ejecutar unit tests | **DUPLICADO** con `npm run test:unit` | Eliminar |

### 4.3 Scripts en `sc-solana/runbooks/05-ci/`

| Script | Propósito | Estado | Recomendación |
|--------|-----------|--------|---------------|
| [`sc-solana/runbooks/05-ci/runbook-tests.sh`](sc-solana/runbooks/05-ci/runbook-tests.sh:1) | Tests de runbooks en CI | **ACTIVO** | Mantener |

### 4.4 Scripts en `docker/`

| Archivo | Propósito | Estado | Recomendación |
|---------|-----------|--------|---------------|
| [`docker/docker-compose.yml`](docker/docker-compose.yml) | Orquestación de servicios | **ACTIVO** | Mantener |
| [`docker/Dockerfile.playwright`](docker/Dockerfile.playwright) | Imagen para E2E tests | **ACTIVO** | Mantener |
| [`docker/Dockerfile.web`](docker/Dockerfile.web) | Imagen para frontend | **ACTIVO** | Mantener |

---

## 5. Consistencia CI/CD

### 5.1 Inconsistencias de Versión

| Archivo | Solana Version | Anchor Version |
|---------|---------------|----------------|
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml:17) | `2.1.18` | `0.32.1` |
| [`.github/workflows/e2e-local-validator.yml`](.github/workflows/e2e-local-validator.yml:15) | `3.1.13` | `0.32.1` |
| [`sc-solana/Anchor.toml`](sc-solana/Anchor.toml:1) | (sin versión) | (sin versión) |

**Problema:** `e2e-local-validator.yml` usa Solana `3.1.13` mientras que `ci.yml` usa `2.1.18`. Esto puede causar comportamientos diferentes entre pipelines.

### 5.2 Inconsistencia con AGENTS.md

| Documentación | Lo que Dice | Lo que Existe |
|--------------|-------------|---------------|
| AGENTS.md:38 | `*.litesvm.ts` para LiteSVM tests | No existen archivos `.litesvm.ts` |
| AGENTS.md:54 | "Security Scanning" incluido | Job `security-scan` existe en CI |
| AGENTS.md:61 | `--max-warnings=20` | Package.json tiene `--max-warnings=999` |

### 5.3 Job Duplicado en CI

El workflow `ci.yml` tiene **dos jobs llamados "Job 9"**:
1. Línea 605: `compute-report` - Reporte de unidades de cómputo
2. Línea 639: `security-scan` - Escaneo de seguridad

Ambos están numerados como "Job 9" en los comentarios.

### 5.4 Integration Tests Desactivados

El job `test-integration` está **comentado** en `ci.yml` (líneas 485-576) debido a incompatibilidad de toolchain. Esto está documentado correctamente pero debería tener un issue de seguimiento.

### 5.5 Inconsistencia de Program ID

| Archivo | Program ID |
|---------|------------|
| [`sc-solana/programs/sc-solana/src/lib.rs`](sc-solana/programs/sc-solana/src/lib.rs:18) | `BTSWNY97FaxeJrUNSq399tRbfMz68iaaY3csJwT9hQQW` |
| [`sc-solana/Anchor.toml`](sc-solana/Anchor.toml:9) | `BTSWNY97FaxeJrUNSq399tRbfMz68iaaY3csJwT9hQQW` |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml:21) | `7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb` |
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml:22) | `7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb` |
| [`.github/workflows/e2e-local-validator.yml`](.github/workflows/e2e-local-validator.yml:17) | `7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb` |

**Problema CRÍTICO:** Los workflows de GitHub usan `7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb` pero el programa real usa `BTSWNY97FaxeJrUNSq399tRbfMz68iaaY3csJwT9hQQW`.

---

## 6. Estado de Issues

### 6.1 Issues Documentados en GITHUB_ISSUE.md

| Issue | Descripción | Estado |
|-------|-------------|--------|
| #218 | Plan de Refactorización de Tests | **EN PROGRESO** - Fases 0-2 completadas |
| #209 | Migración Anchor → Codama | **EN PROGRESO** - Incompatibilidades documentadas |
| #203 | LiteSVM Integration | **COMPLETADO** - Mollusk tests passing |
| #141 | grant_role_no_signer | **RESUELTO** - Función removida |
| #132 | Cleanup Documentation | **COMPLETADO** - Archivos eliminados |
| #133 | Clean Up Obsolete Code | **COMPLETADO** - Scripts eliminados |
| #134 | Fix Program ID | **COMPLETADO** - Program ID corregido |
| #211 | useSolanaWeb3 migration | **EN PROGRESO** - useWeb3 deprecated |

### 6.2 Templates de Issues en `.github/ISSUE_TEMPLATE/`

| Template | Propósito | Estado |
|----------|-----------|--------|
| `bug_report.md` | Reportes de bugs | Activo |
| `feature_request.md` | Solicitudes de features | Activo |
| `999-test-isolation-issue.md` | Issues de aislamiento de tests | Activo |
| `e2e-browser-session-stability.md` | Issues de estabilidad E2E | Activo |
| `local-validator-implementation.md` | Issues de validator local | Activo |

### 6.3 Issues Pendientes Identificados por Análisis

| Prioridad | Issue | Descripción |
|-----------|-------|-------------|
| **CRÍTICA** | Program ID CI/CD | Inconsistencia entre Program ID del programa y workflows |
| **ALTA** | Código Legacy Hooks | 4 hooks obsoletos con datos vacíos |
| **ALTA** | contract-registry.service.ts | Servicio completo obsoleto |
| **MEDIA** | Scripts duplicados | 3 scripts duplicados en web/scripts/ |
| **MEDIA** | Versión Solana CI | Inconsistencia entre workflows (2.1.18 vs 3.1.13) |
| **BAJA** | Aliases deprecated | 7 aliases de compatibilidad en solana-program.ts |

---

## 7. Inconsistencias de Arquitectura

### 7.1 Arquitectura Híbrida (Anchor + Codama)

El proyecto usa una **arquitectura híbrida** documentada en GITHUB_ISSUE.md:

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

**Problema:** La capa 3 (Anchor Wrapper) coexiste con la capa 2 (Codama), generando código duplicado y confusión.

### 7.2 Directorios Generados Duplicados

| Directorio | Propósito | Estado |
|------------|-----------|--------|
| `web/generated/` | Código generado Codama | **EXISTE** |
| `web/src/generated/` | Código generado Codama (src) | **EXISTE** |
| `sc-solana/src/generated/` | Código generado Codama (sc-solana) | **EXISTE** |

**Recomendación:** Unificar en un solo directorio.

### 7.3 Sistema de Roles

| Sistema | Estado | Notas |
|---------|--------|-------|
| `web/src/lib/constants/roles.ts` | Activo | Roles definidos aquí |
| `web/src/lib/roleValidation.ts` | Activo | Validación de roles |
| `web/src/lib/roleMapping.ts` | Activo | Mapeo de roles |
| `web/src/lib/roleUtils.ts` | Activo | Utilidades de roles |
| `web/src/lib/ui/roleUtils.ts` | Activo | Utilidades UI de roles |

**Nota:** Hay 5 archivos relacionados con roles. Verificar si todos son necesarios.

---

## 8. Recomendaciones por Prioridad

### PRIORIDAD CRÍTICA (Inmediato)

| # | Acción | Impacto | Riesgo |
|---|--------|---------|--------|
| 1 | Corregir Program ID en workflows de CI/CD | Previene despliegues incorrectos | Alto si no se corrige |
| 2 | Unificar versión de Solana en workflows | Consistencia entre pipelines | Medio |

### PRIORIDAD ALTA (Próximo Sprint)

| # | Acción | Impacto | Riesgo |
|---|--------|---------|--------|
| 3 | Eliminar 4 hooks deprecated | Reduce bundle size ~2KB | Bajo (código muerto) |
| 4 | Eliminar `contract-registry.service.ts` | Limpieza de código | Bajo (código muerto) |
| 5 | Migrar `UnifiedSupplyChainService.ts` a `@solana/kit` | Modernización | Medio (requiere testing) |

### PRIORIDAD MEDIA (Planificado)

| # | Acción | Impacto | Riesgo |
|---|--------|---------|--------|
| 6 | Eliminar scripts duplicados en `web/scripts/` | Limpieza | Bajo |
| 7 | Unificar directorios generados | Organización | Medio |
| 8 | Actualizar AGENTS.md | Documentación | Bajo |
| 9 | Remover aliases deprecated en `solana-program.ts` | Limpieza | Alto (breaking change) |

### PRIORIDAD BAJA (Backlog)

| # | Acción | Impacto | Riesgo |
|---|--------|---------|--------|
| 10 | Migrar `event-listener.ts` a `@solana/kit` | Modernización | Medio |
| 11 | Remover `connection` deprecated | Limpieza | Alto (requiere migración completa) |
| 12 | Consolidar archivos de roles | Organización | Medio |

---

## Appendix A: Matriz de Dependencias

### Frontend (`web/package.json`)

| Dependencia | Versión | Uso | Estado |
|-------------|---------|-----|--------|
| `@solana/kit` | ^6.9.0 | RPC, signers, addresses | **ACTIVO** |
| `@solana/web3.js` | ^1.98.0 | Legacy boundary | **LEGACY** |
| `@solana/react-hooks` | ^1.4.1 | React integration | **ACTIVO** |
| `@anchor-lang/core` | ^1.0.2 | Anchor core | **LEGACY** |
| `@solana/program-client-core` | ^6.9.0 | Program client | **ACTIVO** |

### Programa (`sc-solana/package.json`)

| Dependencia | Versión | Uso | Estado |
|-------------|---------|-----|--------|
| `@coral-xyz/anchor` | ^0.30.1 | Program framework | **ACTIVO** |
| `@solana/kit` | ^6.9.0 | Test client | **ACTIVO** |
| `@codama/renderers-js` | ^2.2.0 | Code generation | **ACTIVO** |

---

## Appendix B: Resumen de Archivos Modificados Recientemente

Según `git status`, hay **33 archivos modificados** respecto a `origin/main`:

### Modificados (M) - 29 archivos
- Program source: `lib.rs`, tests Mollusk, compute-units
- Configuration: `Anchor.toml`, `codama.js`, `package.json`
- Runbooks: deployment, CI scripts, environments
- Tests: batch-registration, deployer-pda, edge-cases, lifecycle, overflow-protection, pda-derivation, query-instructions, rbac-consistency, role-enforcement
- Documentation: `GITHUB_ISSUE.md`

### Eliminados (D) - 1 archivo
- `sc-solana/tests/integration-full-lifecycle.ts`

---

## Appendix C: Diagrama de Arquitectura Actual

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Components   │  │    Hooks     │  │   Services               │  │
│  │  (React UI)   │  │  (useWeb3,   │  │  UnifiedSupplyChain      │  │
│  │               │  │   useSupply   │  │  ChainService            │  │
│  │               │  │   Chain)      │  │                          │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────────┘  │
│         │                 │                      │                  │
│  ┌──────▼─────────────────▼──────────────────────▼───────────────┐  │
│  │              lib/contracts & lib/solana                        │  │
│  │  (solana-program.ts, connection.ts, event-listener.ts)         │  │
│  └──────────────────────────┬────────────────────────────────────┘  │
│                             │                                       │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Solana RPC      │
                    │  (devnet/localnet)│
                    └─────────┬─────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────────┐
│                         ON-CHAIN PROGRAM                          │
│  ┌─────────────────────────▼────────────────────────────────────┐  │
│  │              Anchor Program (sc_solana)                       │  │
│  │  Program ID: BTSWNY97FaxeJrUNSq399tRbfMz68iaaY3csJwT9hQQW    │  │
│  │                                                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │  │
│  │  │  Netbook    │  │    Role     │  │    Deployer         │  │  │
│  │  │  Lifecycle  │  │    System   │  │    System           │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

**Fin del Reporte**

*Este análisis fue generado sin modificaciones al código. Todas las recomendaciones requieren aprobación previa antes de implementación.*
