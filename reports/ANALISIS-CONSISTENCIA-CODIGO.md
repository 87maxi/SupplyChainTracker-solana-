# Análisis de Consistencia del Código - SupplyChainTracker

**Fecha:** 2026-05-17
**Alcance:** Código completo del repositorio (Rust Anchor + TypeScript Frontend)
**Estado:** Sin modificaciones

---

## Resumen Ejecutivo

Este análisis identifica inconsistencias en el código del proyecto SupplyChainTracker que afectan la mantenibilidad, legibilidad y consistencia de patrones. Las inconsistencias están organizadas por capas y prioridad.

---

## 1. CAPA RUST (Programa Anchor)

### 1.1 Inconsistencia en Referencia de Errores

| Archivo | Patrón Usado | Línea |
|---------|--------------|-------|
| [`instructions/netbook/register.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/register.rs:57) | `crate::SupplyChainError::EmptySerial` | 57, 60, 63, 66 |
| [`instructions/netbook/audit.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/audit.rs:34) | `crate::SupplyChainError::InvalidInput` | 34, 39 |
| [`instructions/netbook/validate.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/validate.rs:32) | `crate::SupplyChainError::StringTooLong` | 32, 39, 44 |
| [`instructions/role/grant.rs`](sc-solana/programs/sc-solana/src/instructions/role/grant.rs:47) | `crate::SupplyChainError::RoleAlreadyGranted` | 46-57 |
| [`instructions/role/revoke.rs`](sc-solana/programs/sc-solana/src/instructions/role/revoke.rs:65) | `crate::SupplyChainError::RoleHolderNotFound` | 65, 67 |

**Inconsistencia:** Algunos archivos usan `crate::errors::SupplyChainError::` mientras que otros usan `crate::SupplyChainError::`.

**Recomendación:** Unificar a `crate::SupplyChainError::` (vía glob re-export en lib.rs).

### 1.2 Inconsistencia en Referencia de NetbookState

| Archivo | Patrón Usado | Línea |
|---------|--------------|-------|
| [`instructions/netbook/register.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/register.rs:105) | `NetbookState::Fabricada as u8` | 105 |
| [`instructions/netbook/audit.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/audit.rs:38) | `crate::NetbookState::Fabricada as u8` | 38, 47 |
| [`instructions/netbook/validate.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/validate.rs:43) | `crate::NetbookState::HwAprobado as u8` | 43, 52 |
| [`instructions/netbook/assign.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/assign.rs:38) | `crate::NetbookState::SwValidado as u8` | 38, 45 |

**Inconsistencia:** Algunos archivos importan `NetbookState` directamente y otros lo referencian vía `crate::`.

**Recomendación:** Unificar imports en el header de cada archivo.

### 1.3 Duplicación en Comments (request.rs)

[`instructions/role/request.rs`](sc-solana/programs/sc-solana/src/instructions/role/request.rs:44-50)

```rust
/// Approve a role request - creates RoleHolder account automatically
/// Integrates Config fields with RoleHolder accounts (transitional pattern)
/// Admin is derived as PDA with seeds [b"admin", config.key()]
/// NOTE (Issue #186): Admin is now UncheckedAccount with seed verification
/// Approve a role request - creates RoleHolder account automatically  // ← DUPLICADO
/// Integrates Config fields with RoleHolder accounts (transitional pattern)  // ← DUPLICADO
/// Admin is derived as PDA with seeds [b"admin", config.key()]  // ← DUPLICADO
/// NOTE (Issue #186): Admin is now UncheckedAccount with seed verification  // ← DUPLICADO
```

**Inconsistencia:** Los comentarios de `ApproveRoleRequest` y `RejectRoleRequest` están duplicados exactamente.

**Recomendación:** Eliminar líneas duplicadas (4 líneas repetidas).

### 1.4 Inconsistencia en Pattern Matching para Roles

| Archivo | Patrón Usado |
|---------|--------------|
| [`instructions/role/grant.rs`](sc-solana/programs/sc-solana/src/instructions/role/grant.rs:45-58) | `match role.as_str()` con checks individuales |
| [`instructions/role/request.rs`](sc-solana/programs/sc-solana/src/instructions/role/request.rs:132-136) | `match role.as_str()` con guard vacío `{}` |
| [`instructions/role/holder_add.rs`](sc-solana/programs/sc-solana/src/instructions/role/holder_add.rs:51-56) | `match role_type` con guard vacío `{}` |
| [`instructions/role/revoke.rs`](sc-solana/programs/sc-solana/src/instructions/role/revoke.rs:72-77) | `match role.as_str()` con `unreachable!()` |

**Inconsistencia:** Diferentes patrones de validación de roles en funciones similares.

**Recomendación:** Crear una función helper `validate_role(role: &str) -> Result<()>` en `state/mod.rs`.

### 1.5 Inconsistencia en Inicialización de Netbook

[`instructions/netbook/register.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/register.rs:91-108)

```rust
// Patrón mixto: algunos campos usan Pubkey::default(), otros String::default()
netbook.hw_auditor = Pubkey::default();
netbook.sw_technician = Pubkey::default();
netbook.os_version = String::default();
netbook.destination_school_hash = [0u8; 32];
netbook.student_id_hash = [0u8; 32];
```

**Inconsistencia:** Mezcla de inicializadores (`Pubkey::default()` vs `Pubkey::default()`, `[0u8; 32]` vs `Default::default()`).

**Recomendación:** Implementar `Default` para `Netbook` o usar un constructor explícito `Netbook::new()`.

---

## 2. CAPA TypeScript (Tests y Servicios)

### 2.1 Inconsistencia en Imports de @solana/web3.js vs @solana/kit

| Archivo | Import Usado | Prioridad |
|---------|--------------|-----------|
| [`services/UnifiedSupplyChainService.ts`](web/src/services/UnifiedSupplyChainService.ts:17) | `Connection, PublicKey, SystemProgram, Transaction` desde `@solana/web3.js` | **ALTA** |
| [`lib/solana/event-listener.ts`](web/src/lib/solana/event-listener.ts:12) | `PublicKey, Logs` desde `@solana/web3.js` | **ALTA** |
| [`hooks/useSupplyChainService.ts`](web/src/hooks/useSupplyChainService.ts:10) | `Connection` desde `@solana/web3.js` | **ALTA** |
| [`app/tokens/create/page.tsx`](web/src/app/tokens/create/page.tsx:17) | `PublicKey` desde `@solana/web3.js` | **ALTA** |
| [`lib/solana/connection.ts`](web/src/lib/solana/connection.ts:11) | `Connection` desde `@solana/web3.js` (dynamic import) | **MEDIA** |

**Inconsistencia:** El proyecto está migrando a `@solana/kit` pero 5+ archivos aún usan `@solana/web3.js`.

**Recomendación:** Migrar todos los imports a `@solana/kit`:
- `Connection` → `createSolanaRpc` + `getRpcTransport`
- `PublicKey` → `Address` (strings tipados)
- `SystemProgram` → `systemProgram` desde `@solana/kit`

### 2.2 Inconsistencia en Nomenclatura de PDA Functions

| Archivo | Función Usada |
|---------|--------------|
| [`lib/contracts/solana-program.ts`](web/src/lib/contracts/solana-program.ts:104) | `findDeployerPdaAsync` (async) |
| [`lib/contracts/solana-program.ts`](web/src/lib/contracts/solana-program.ts:310) | `findConfigPda` (sync alias, deprecated) |
| [`services/UnifiedSupplyChainService.ts`](web/src/services/UnifiedSupplyChainService.ts:52) | `findConfigPdaAsync` (async) |
| [`lib/contracts/SupplyChainContract.ts`](web/src/lib/contracts/SupplyChainContract.ts:24) | `findConfigPda` (sync) |

**Inconsistencia:** Algunos archivos usan la versión `*Async` y otros usan los aliases deprecated sin `Async`.

**Recomendación:** Eliminar aliases deprecated y unificar a `*Async` en todos los archivos.

### 2.3 Inconsistencia en Manejo de Tipos BN vs BigInt

| Archivo | Tipo Usado |
|---------|------------|
| [`services/UnifiedSupplyChainService.ts`](web/src/services/UnifiedSupplyChainService.ts:82) | `bigint` para `distributionTimestamp`, `nextTokenId` |
| [`lib/contracts/SupplyChainContract.ts`](web/src/lib/contracts/SupplyChainContract.ts:72) | `number` para `tokenId` |

**Inconsistencia:** Algunos servicios usan `bigint` para IDs y timestamps, otros usan `number`.

**Recomendación:** Unificar a `bigint` para todos los valores que vienen de Solana (u64).

### 2.4 Duplicación en Service Layer

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| [`services/UnifiedSupplyChainService.ts`](web/src/services/UnifiedSupplyChainService.ts:1) | Servicio unificado | ✅ Activo |
| [`lib/contracts/SupplyChainContract.ts`](web/src/lib/contracts/SupplyChainContract.ts:1) | Servicio legacy | ⚠️ Paralelo |

**Inconsistencia:** Ambos servicios coexisten y usan patrones diferentes para las mismas operaciones.

**Recomendación:** Migrar todos los consumidores a `UnifiedSupplyChainService` y deprecated `SupplyChainContract`.

---

## 3. CAPA FRONTEND (React/Next.js)

### 3.1 Inconsistencia en Wallet Provider

| Archivo | Provider Usado |
|---------|----------------|
| [`lib/solana/wallet-provider.tsx`](web/src/lib/solana/wallet-provider.tsx:18) | `@solana/react-hooks` (moderno) |
| Components | ¿Usan `useWallet` de `@solana/wallet-adapter`? | 

**Inconsistencia:** El provider usa `@solana/react-hooks` pero hay riesgo de que componentes aún usen el legacy adapter.

**Recomendación:** Verificar que todos los componentes usen los hooks de `@solana/react-hooks`.

### 3.2 Inconsistencia en Uso de `use client` Directive

| Archivo | Directive |
|---------|-----------|
| [`services/UnifiedSupplyChainService.ts`](web/src/services/UnifiedSupplyChainService.ts:15) | `'use client';` (con comillas simples) |
| [`lib/solana/wallet-provider.tsx`](web/src/lib/solana/wallet-provider.tsx:1) | `"use client";` (con comillas dobles) |

**Inconsistencia:** Mezcla de comillas simples y dobles para la directive.

**Recomendación:** Unificar a comillas dobles (estilo ESLint del proyecto).

### 3.3 Inconsistencia en Path Aliases

| Patrón | Ejemplo |
|--------|---------|
| `@/generated/` | Usado en `UnifiedSupplyChainService.ts` |
| `@/generated/src/generated` | Usado en `solana-program.ts` |
| `@/lib/contracts/` | Usado en múltiples archivos |
| `@/lib/solana/` | Usado en múltiples archivos |

**Inconsistencia:** Algunos imports usan `@/generated` directamente, otros `@/generated/src/generated`.

**Recomendación:** Documentar y unificar los path aliases en `tsconfig.json`.

---

## 4. INCONSISTENCIAS TRANSVERSALES

### 4.1 Program ID en Múltiples Ubicaciones

| Ubicación | Valor | Estado |
|-----------|-------|--------|
| [`sc-solana/programs/sc-solana/src/lib.rs`](sc-solana/programs/sc-solana/src/instructions/role/request.rs:18) | `BTSWNY97FaxeJrUNSq399tRbfMz68iaaY3csJwT9hQQW` | ✅ Correcto |
| [`Anchor.toml`](sc-solana/Anchor.toml:11) | `BTSWNY97FaxeJrUNSq399tRbfMz68iaaY3csJwT9hQQW` | ✅ Correcto |
| `web/src/contracts/sc_solana.json` | Generado desde IDL | ✅ Correcto |
| `.github/workflows/*.yml` | `BTSWNY97FaxeJrUNSq399tRbfMz68iaaY3csJwT9hQQW` | ✅ Correcto (corregido) |

**Estado:** ✅ Resuelto - Todos los workflows usan el Program ID correcto.

### 4.2 Inconsistencia en Comentarios de Docs

| Archivo | Patrón |
|---------|--------|
| [`state/netbook.rs`](sc-solana/programs/sc-solana/src/state/netbook.rs:6) | `/// Bounded strings: serial_number max 200 chars...` |
| [`instructions/netbook/register.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/register.rs:8) | `/// Compute a cryptographic SHA-256 hash` |
| [`instructions/role/request.rs`](sc-solana/programs/sc-solana/src/instructions/role/request.rs:1) | `//! RequestRole instruction context` |

**Inconsistencia:** Mezcla de `///` (doc comments) y `//!` (inner doc comments) en diferentes archivos.

**Recomendación:** Usar `//!` para comentarios de módulo y `///` para comentarios de items.

### 4.3 Inconsistencia en Manejo de Timestamps

| Archivo | Tipo | Fuente |
|---------|------|--------|
| [`instructions/netbook/register.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/register.rs:110) | No emite timestamp | - |
| [`instructions/netbook/audit.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/audit.rs:50) | Emite `HardwareAudited` sin timestamp | - |
| [`instructions/role/grant.rs`](sc-solana/programs/sc-solana/src/instructions/role/grant.rs:70) | `Clock::get()?.unix_timestamp as u64` | Emite con timestamp |
| [`instructions/role/holder_add.rs`](sc-solana/programs/sc-solana/src/instructions/role/holder_add.rs:88) | `Clock::get()?.unix_timestamp as u64` | Emite con timestamp |

**Inconsistencia:** Algunos eventos incluyen timestamp, otros no.

**Recomendación:** Unificar todos los eventos para incluir timestamp.

---

## 5. RESUMEN DE PRIORIDADES

| Prioridad | Inconsistencia | Archivos Afectados | Esfuerzo |
|-----------|----------------|-------------------|----------|
| **CRÍTICA** | @solana/web3.js → @solana/kit | 5+ archivos | 2-3 horas |
| **ALTA** | Duplicación en request.rs comments | 1 archivo | 10 min |
| **ALTA** | Aliases deprecated PDA functions | 2+ archivos | 1 hora |
| **MEDIA** | Pattern matching inconsistente para roles | 4 archivos | 2 horas |
| **MEDIA** | Inconsistencia en inicialización de Netbook | 1 archivo | 30 min |
| **MEDIA** | Service layer paralelo | 2 archivos | 3 horas |
| **BAJA** | Comillas en 'use client' directive | 2 archivos | 5 min |
| **BAJA** | Docs comments vs inner docs | Varios | 30 min |
| **BAJA** | Timestamps inconsistentes en eventos | 4 archivos | 1 hora |

---

## 6. RECOMENDACIONES DE ACCIÓN

### Fase 1: Crítico (Esta Sprint)
1. Migrar `UnifiedSupplyChainService.ts` de `@solana/web3.js` a `@solana/kit`
2. Migrar `event-listener.ts` de `@solana/web3.js` a `@solana/kit`
3. Migrar `useSupplyChainService.ts` de `@solana/web3.js` a `@solana/kit`
4. Eliminar duplicación en `request.rs` comments

### Fase 2: Alto (Próximo Sprint)
5. Eliminar aliases deprecated en `solana-program.ts`
6. Unificar imports de `NetbookState` en todos los archivos de instrucciones
7. Crear función helper `validate_role()` en `state/mod.rs`

### Fase 3: Medio (Planificado)
8. Implementar `Default` para `Netbook` o constructor `Netbook::new()`
9. Migrar consumidores de `SupplyChainContract` a `UnifiedSupplyChainService`
10. Unificar timestamps en todos los eventos

### Fase 4: Bajo (Cuando sea Conveniente)
11. Unificar comillas en directives
12. Unificar estilo de doc comments
13. Documentar path aliases en `tsconfig.json`

---

**Archivo de Referencia:** Este análisis se basa en el código actual del repositorio.
**Próxima Revisión:** Después de implementar las correcciones de Fase 1.
