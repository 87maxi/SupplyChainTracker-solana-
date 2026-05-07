# 🔴 [P0] Consolidación y Hardening RBAC - Smart Contract + Frontend

## Resumen Ejecutivo

Issue maestro para consolidar, endurecer y completar la implementación del sistema RBAC (Role-Based Access Control) en el smart contract Solana y su integración frontend. Surge como continuación directa del análisis del **issue #100** (cerrado), que resolvió los problemas de frontend pero dejó expuestas limitaciones críticas en el smart contract.

---

## 📋 Contexto y Relación con Issues Cerrados

### Issue #100 - Análisis Completo (CERRADO ✅)
- **Estado:** Resuelto parcialmente (75% completitud)
- **Solucionó:** SolanaEventProvider montado, RoleRequestService integrado con blockchain, EnhancedPendingRoleRequests activado
- **Dejó pendiente:** Limitaciones de smart contract (RBAC titular único, verificación de estado, patterns no integrados)
- **Commit:** `7b46e3e`

### Issue #63 - Service Unification (CERRADO ✅)
- **Solucionó:** Creación de `UnifiedSupplyChainService` combinando `SupplyChainService` y `SolanaSupplyChainService`
- **Proporciona:** Query functions completas, `getRoleRequests()`, `approveRoleRequest()`, `rejectRoleRequest()`
- **Dependencia:** Base sobre la cual funciona la solución del #100

### Issue #56 - Multiple RoleRequests per User (CERRADO - Working as Designed)
- **Decisión:** Limitación a una solicitud por usuario es **intencional** para el dominio supply chain
- **Justificación:** Flujo solicitar → aprobar/rechazar → solicitar otro es suficiente
- **Impacto:** No se requiere cambio de seed PDA

### Issue #99 - WalletProvider SSR Fix (CERRADO ✅)
- **Solucionó:** Problemas de SSR con WalletProvider
- **Relación:** Permite que el frontend funcione correctamente con los cambios del #100

### Issue #98 - Wallet Adapter v2 Migration (CERRADO ✅)
- **Solucionó:** Migración a framework moderno de wallets
- **Relación:** Infraestructura necesaria para RoleRequestService on-chain

### Issue #95 - Anchor Integration Tests (CERRADO ✅)
- **Solucionó:** Tests de integración con validador local
- **Relación:** Framework de testing para validar cambios RBAC

---

## 🔴 Problemas Actuales (Detallados)

### Problema 1: RBAC con Titular Único por Rol

**Archivo:** [`sc-solana/programs/sc-solana/src/state/config.rs`](sc-solana/programs/sc-solana/src/state/config.rs)

**Descripción:** Los campos `fabricante`, `auditor_hw`, `tecnico_sw`, `escuela` almacenan un **único PublicKey** cada uno. Cuando se aprueba una nueva solicitud, se **sobrescribe** el titular anterior.

```rust
// approve_role_request - sobrescribe, no acumula
match role_request.role.as_str() {
    crate::FABRICANTE_ROLE => config.fabricante = user,
    crate::AUDITOR_HW_ROLE => config.auditor_hw = user,
    // ...
}
```

**Impacto:**
- Solo puede haber un fabricante activo a la vez
- Si se aprueba un nuevo fabricante, el anterior pierde el rol sin notificación
- No hay historial de titulares previos
- No es escalable para producción

**Workaround actual:** Pattern `holder_add`/`holder_remove` con `RoleHolder` accounts, pero **NO está integrado** con `approve_role_request`.

---

### Problema 2: approve_role_request sin Verificación de Estado

**Archivo:** [`sc-solana/programs/sc-solana/src/instructions/role/request.rs:74-93`](sc-solana/programs/sc-solana/src/instructions/role/request.rs:74)

**Descripción:** No verifica que la solicitud esté en estado `Pending` antes de aprobar.

```rust
pub fn approve_role_request(ctx: Context<ApproveRoleRequest>) -> Result<()> {
    let role_request = &mut ctx.accounts.role_request;
    role_request.status = crate::RequestStatus::Approved as u8;  // sin verificar estado actual
    // ...
}
```

**Impacto:**
- Se puede aprobar una solicitud ya rechazada
- Se puede re-aprobar una solicitud ya aprobada (idempotencia no controlada)
- Posible manipulación de estado por admin malicioso o error humano

---

### Problema 3: Doble Pattern de Roles Inconsistente

**Descripción:** Existen dos patterns para gestión de roles que **NO están integrados**:

| Pattern | Ubicación | Múltiples Holders | Integrado con approve? |
|---------|-----------|-------------------|------------------------|
| Config fields | `SupplyChainConfig` | ❌ No (único) | ✅ Sí |
| RoleHolder accounts | `holder_add`/`holder_remove` | ✅ Sí | ❌ No |

**Impacto:**
- Confusión sobre qué pattern usar
- `approve_role_request` actualiza config pero NO crea RoleHolder
- Los checks de rol solo verifican config fields
- RoleHolder accounts son "huérfanas" del flujo principal

---

### Problema 4: grant_role Requiere Firma del Destinatario

**Archivo:** [`sc-solana/programs/sc-solana/src/instructions/role/grant.rs`](sc-solana/programs/sc-solana/src/instructions/role/grant.rs)

**Descripción:** `account_to_grant: Signer` requiere que el destinatario firme la transacción.

**Impacto:**
- No se puede otorgar rol sin presencia activa del destinatario
- En emergencias, no hay forma de otorgar rol temporal
- Limita automatización de onboarding

---

### Problema 5: Sin Transferencia de Admin

**Descripción:** No existe instrucción para transferir el rol de admin. El admin original es el deployer y está atado permanentemente.

**Impacto:**
- Si el admin pierde sus claves, el sistema queda sin administración
- No hay mecanismo de gobernanza para cambio de admin
- Punto único de fallo

---

### Problema 6: Sin Rate Limiting en Role Requests

**Descripción:** No hay protección contra spam de solicitudes de rol.

**Impacto:**
- Un usuario puede crear solicitudes infinitamente (después de reject)
- Costos de gas elevados por abuso
- Contaminación de datos

---

## 🎯 Fases de Implementación (Jerárquicas por Prioridad)

### FASE 1: Hardening de Seguridad (P0 - Crítico)

**Objetivo:** Corregir vulnerabilidades de seguridad existentes.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 1.1 | Verificación estado Pending | `request.rs` | Agregar `require!` en `approve_role_request` y `reject_role_request` |
| 1.2 | Error personalizado | `errors/mod.rs` | Crear `InvalidRequestState` error |
| 1.3 | Tests de verificación | `tests/role-management.ts` | Tests para approve/reject con estados inválidos |

**Criterios de completitud:**
- [ ] `approve_role_request` rechaza si estado != Pending
- [ ] `reject_role_request` rechaza si estado != Pending
- [ ] Tests pasan: approve en Approved → error, approve en Rejected → error
- [ ] Tests pasan: reject en Approved → error, reject en Rejected → error

**Herramientas de validación:**
```bash
cd sc-solana && cargo test
cd sc-solana && anchor test --lib tests/role-management.ts
```

---

### FASE 2: Integración Patterns de Roles (P1 - Alto)

**Objetivo:** Unificar los dos patterns de roles en un sistema coherente.

**Decisión de arquitectura requerida:** Elegir pattern principal

| Opción | Ventajas | Desventajas |
|--------|----------|-------------|
| A) Config fields + RoleHolder | Múltiples holders, mantiene compatibilidad | Complejidad doble |
| B) Solo RoleHolder | Limpio, escalable | Breaking change |
| C) Config fields con array | Simple, mantiene API | Limitado por tamaño account |

**Recomendación:** Opción A (transicional) → migrar a B en v2.0

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 2.1 | Decidir pattern | Documentación | Documentar decisión de arquitectura |
| 2.2 | Integrar RoleHolder en approve | `request.rs` | Al aprobar, también crear RoleHolder account |
| 2.3 | Sincronizar revoke | `revoke.rs` | Al revocar, remover RoleHolder |
| 2.4 | Query unificado | `UnifiedSupplyChainService.ts` | `getRoleHolders()` que combine ambas fuentes |
| 2.5 | Tests de integración | `tests/role-management.ts` | Verificar consistencia config ↔ RoleHolder |

**Criterios de completitud:**
- [ ] approve_role_request crea RoleHolder account
- [ ] revoke_role remueve RoleHolder account
- [ ] `getRoleHolders()` retorna datos consistentes
- [ ] Tests verifican: approve → RoleHolder creado, revoke → RoleHolder eliminado

**Herramientas de validación:**
```bash
cd sc-solana && anchor test
cd web && yarn test --testPathPattern=RoleRequest
```

---

### FASE 3: Transferencia de Admin (P2 - Medio)

**Objetivo:** Permitir transferencia segura del rol de admin.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 3.1 | Instrucción transfer_admin | `role/transfer_admin.rs` | Nueva instrucción con firma de admin actual + destinatario |
| 3.2 | Event AdminTransferred | `events/role_events.rs` | Emitir event al transferir |
| 3.3 | Frontend UI | `AdminClient.tsx` | Botón "Transfer Admin" con confirmación |
| 3.4 | Tests | `tests/role-management.ts` | Transfer exitosa, transfer sin firma, transfer a mismo admin |

**Criterios de completitud:**
- [ ] Admin puede transferir a nuevo admin
- [ ] Requiere firma de admin actual y destinatario
- [ ] Event emitido correctamente
- [ ] Tests: transfer exitosa, transfer fallida (sin firma), transfer a mismo admin

**Herramientas de validación:**
```bash
cd sc-solana && cargo test
cd sc-solana && anchor test --lib tests/role-management.ts
```

---

### FASE 4: Rate Limiting (P3 - Bajo)

**Objetivo:** Prevenir spam de solicitudes de rol.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 4.1 | Timestamp cooldown | `request.rs` | Verificar tiempo desde última solicitud |
| 4.2 | Constante COOLDOWN | `lib.rs` | Definir período mínimo entre solicitudes |
| 4.3 | Error RateLimited | `errors/mod.rs` | Error personalizado |
| 4.4 | Tests | `tests/role-management.ts` | Verificar cooldown funciona |

**Criterios de completitud:**
- [ ] Usuario no puede solicitar rol dentro del cooldown
- [ ] Error claro al exceder límite
- [ ] Tests: solicitud inmediata → error, solicitud después de cooldown → éxito

---

### FASE 5: grant_role sin Firma (P4 - Opcional)

**Objetivo:** Permitir otorgar rol sin firma del destinatario (opcional).

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 5.1 | Instrucción grant_role_no_signer | `role/grant.rs` | Variante sin `Signer` en destinatario |
| 5.2 | Solo admin | `role/grant.rs` | Restringir a admin |
| 5.3 | Documentación | README | Explicar diferencias entre grant y grant_no_signer |

---

## ✅ Criterios Generales de Completitud del Issue

Este issue se considera **completamente resuelto** cuando:

### Criterios de Código
- [ ] Todas las fases P0-P2 implementadas y mergeadas
- [ ] Código Rust pasa `cargo clippy` sin warnings
- [ ] Código TypeScript pasa `tsc --noEmit` sin errores
- [ ] ESLint sin errores críticos

### Criterios de Testing
- [ ] Todos los tests existentes continúan pasando
- [ ] Coverage de tests RBAC ≥ 90%
- [ ] Tests de edge cases: doble approve, approve después de reject, etc.
- [ ] Tests de integración frontend ↔ blockchain

### Criterios de Documentación
- [ ] README actualizado con arquitectura RBAC
- [ ] Decisiones de arquitectura documentadas (ADR)
- [ ] Runbooks actualizados con nuevos flujos

### Criterios de Seguridad
- [ ] Audit de vulnerabilidades completado
- [ ] Verificación de estado en todas las instrucciones de rol
- [ ] Events emitidos en todas las transacciones de rol

---

## 🧰 Herramientas Sugeridas para Pruebas de Consistencia

### Smart Contract (Rust/Anchor)

| Herramienta | Comando | Propósito |
|-------------|---------|-----------|
| **cargo test** | `cd sc-solana && cargo test` | Tests unitarios Rust |
| **anchor test** | `cd sc-solana && anchor test` | Tests integración Anchor |
| **cargo clippy** | `cd sc-solana && cargo clippy` | Linter Rust |
| **LiteSVM** | Configuración en `Anchor.toml` | Testing local sin validador |
| **Surfpool** | `surfpool test` | Testing con validador local |

### Frontend (TypeScript/Next.js)

| Herramienta | Comando | Propósito |
|-------------|---------|-----------|
| **Jest** | `cd web && yarn test` | Tests unitarios frontend |
| **Playwright** | `cd web && yarn playwright test` | Tests E2E |
| **tsc** | `cd web && tsc --noEmit` | Verificación TypeScript |
| **ESLint** | `cd web && yarn lint` | Linter TypeScript |

### Integración Full-Stack

| Herramienta | Comando | Propósito |
|-------------|---------|-----------|
| **anchor test** | `cd sc-solana && anchor test --lib tests/role-management.ts` | Tests RBAC completos |
| **Solana CLI** | `solana program show --program <PID>` | Verificar programa desplegado |
| **Solana Explorer** | `solana explorer -u <RPC>` | Verificar transacciones |

### Scripts de Validación

```bash
# Script completo de validación
#!/bin/bash
set -e

echo "=== Rust Build ==="
cd sc-solana && cargo build

echo "=== Rust Tests ==="
cargo test

echo "=== Rust Clippy ==="
cargo clippy

echo "=== Anchor Tests ==="
anchor test

echo "=== Frontend Build ==="
cd ../web && yarn build

echo "=== Frontend Tests ==="
yarn test

echo "=== TypeScript Check ==="
tsc --noEmit

echo "=== ESLint ==="
yarn lint

echo "=== TODAS LAS VALIDACIONES PASARON ==="
```

---

## 📊 Matriz de Dependencias

```
FASE 1 (Hardening Seguridad)
  └─ Bloquea: FASE 2 (no integrar patterns con bugs)
  └─ Independiente: FASE 3, FASE 4, FASE 5

FASE 2 (Integración Patterns)
  └─ Depende: FASE 1
  └─ Bloquea: Validación completa de RBAC

FASE 3 (Transfer Admin)
  └─ Depende: FASE 1 (verificación de estado)
  └─ Independiente: FASE 2, FASE 4, FASE 5

FASE 4 (Rate Limiting)
  └─ Depende: FASE 1
  └─ Independiente: FASE 2, FASE 3, FASE 5

FASE 5 (grant sin firma)
  └─ Depende: FASE 1
  └─ Independiente: FASE 2, FASE 3, FASE 4
```

---

## 📁 Archivos Clave

| Archivo | Fase | Acción |
|---------|------|--------|
| `sc-solana/programs/sc-solana/src/instructions/role/request.rs` | 1, 2, 4 | Modificar |
| `sc-solana/programs/sc-solana/src/instructions/role/grant.rs` | 5 | Modificar |
| `sc-solana/programs/sc-solana/src/instructions/role/revoke.rs` | 2 | Modificar |
| `sc-solana/programs/sc-solana/src/errors/mod.rs` | 1, 4 | Agregar errores |
| `sc-solana/programs/sc-solana/src/events/role_events.rs` | 3 | Agregar event |
| `sc-solana/tests/role-management.ts` | 1-5 | Agregar tests |
| `web/src/services/UnifiedSupplyChainService.ts` | 2 | Extender |
| `web/src/services/RoleRequestService.ts` | 2 | Sincronizar |
| `web/src/components/admin/AdminClient.tsx` | 3 | Agregar UI |

---

**Generado:** 2026-05-07
**Prioridad:** 🔴 P0 (Crítico)
**Etiquetas sugeridas:** bug, smart-contract, P0, rbac, security
**Relacionado con:** #100, #63, #56, #99, #98, #95
