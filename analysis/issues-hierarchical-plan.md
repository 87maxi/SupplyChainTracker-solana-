# Análisis Jerárquico y Evolutivo de Issues Abiertos

## Resumen Ejecutivo

**Total de issues abiertos:** 16  
**Prioridad P0 (Crítico):** 7 issues  
**Prioridad P1 (Alto):** 4 issues  
**Prioridad P2 (Medio):** 2 issues  
**Verificación/Epic:** 3 issues  

**Estado del código:**
- ✅ `cargo check` compila sin errores (programa Anchor)
- ⚠️ `yarn test` tiene 5 fallos en E2E (Playwright vs Jest conflict) pero tests unitarios pasan
- ⚠️ Issues #158 y #161 están parcialmente resueltos en código actual

---

## Orden Jerárquico de Dependencias

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    NIVEL 0: CORRECRIONES DE PROGRAMA                    │
│              (Bloquean TODO: frontend, runbooks, deploys)               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  #159  Frontend/Contract mismatch: Netbook PDA seed                    │
│        └── Contract usa [b"netbook", token_id_bytes(8)]                │
│            Frontend usa [Buffer.from('netbook'), tokenIdBuffer(8)]     │
│            → Seeds COINCIDEN en longitud pero verificar prefijos        │
│                                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                    NIVEL 1: CONSISTENCIA RUNBOOKS P0                    │
│              (Bloquean deploys funcionales)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  #147  Program ID hardcodeado incorrecto                               │
│        └── initialize-config.tx y grant-roles.tx usan ID viejo         │
│        └── Depende de: #159 (si cambia program)                        │
│                                                                        │
│  #150  Puerto RPC inconsistente (8899 vs 8999)                         │
│        └── Afecta TODOS los runbooks                                   │
│        └── Independiente de otros                                      │
│                                                                        │
│  #149  Admin como Web Wallet vs PDA en grant-roles                     │
│        └── Código actual: admin es Signer (no PDA) ✅                  │
│        └── Runbook debe usar wallet signer, no PDA derivation          │
│                                                                        │
│  #148  Seed de PDA de Netbook en runbooks audit/validate/assign        │
│        └── Depende de: #159 (entender seed correcta)                   │
│                                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                    NIVEL 2: CONSISTENCIA RUNBOOKS P1                    │
│              (Bloquean funcionalidad específica)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  #151  Orden de accounts en add-role-holder.tx                         │
│        └── role_holder PDA debe ser pos 3, account_to_add pos 4        │
│                                                                        │
│  #152  Account role_holder en approve-role-request.tx                  │
│        └── Usar PDA derivado no raw pubkey                             │
│                                                                        │
│  #153  Output duplicado serial_hashes_pda                              │
│        └── Corrección simple de parseo                                 │
│                                                                        │
│  #154  Inconsistencia upgrade-program                                  │
│        └── Eliminar o habilitar upgradeable                            │
│                                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                    NIVEL 3: COMPLETITUD Y DOCUMENTACIÓN P2              │
│              (Mejoras, no bloquean)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  #155  Crear runbooks faltantes                                        │
│        └── reset_role_request, close_role_holder, query_netbook_state  │
│        └── Depende de: Niveles 0-2 completados                         │
│                                                                        │
│  #156  Templates de runbooks y documentación                           │
│        └── Mejora de mantenibilidad                                    │
│                                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                    NIVEL 4: VERIFICACIÓN FINAL                          │
│              (Validación de todo el sistema)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  #157  Checklist completa de consistencia                              │
│        └── Depende de: TODOS los niveles anteriores                     │
│                                                                        │
│  #146  Epic: Surfpool Deploy System Consistency                        │
│        └── Meta-issue que coordina #147-#156                           │
│                                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Análisis Detallado por Issue

### 🔴 CRÍTICOS (P0) - Bloquean Todo

#### #159 - Frontend/Contract mismatch: Netbook PDA seed
**Severidad:** P0 Crítico  
**Depende de:** Nada (raíz de dependencias)  
**Bloquea:** #148, #159, todos los runbooks de operación  

**Análisis de código:**
- **Contract** [`register.rs:25`](sc-solana/programs/sc-solana/src/instructions/netbook/register.rs:25):
  ```rust
  seeds = [b"netbook", config.next_token_id.to_le_bytes().as_ref()],
  ```
  → Usa `[b"netbook", u64_le_bytes(8 bytes)]`

- **Frontend** [`solana-program.ts:113-114`](web/src/lib/contracts/solana-program.ts:113):
  ```typescript
  return PublicKey.findProgramAddressSync(
    [Buffer.from('netbook'), tokenIdBuffer],  // 8 bytes
    PROGRAM_ID
  );
  ```
  → Usa `[Buffer.from('netbook'), u64_le_bytes(8 bytes)]`

**Veredicto:** Las seeds COINCIDEN en estructura actual. El issue describe `[b"netbook", b"netbook", ...]` pero el código actual usa solo UN prefijo `"netbook"`. **El issue está desactualizado** pero hay que verificar que el frontend y contract estén sincronizados.

**Acción:** Verificar sincronización y cerrar issue si coincide, o corregir si hay discrepancia.

---

#### #147 - Program ID hardcodeado incorrecto en runbooks
**Severidad:** P0 Crítico  
**Depende de:** #159  
**Bloquea:** Todos los deploys  

**Análisis:**
- **Contract** [`lib.rs:17`](sc-solana/programs/sc-solana/src/lib.rs:17): `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN`
- **Runbooks:** Usan `7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb` ❌

**Acción:** Reemplazar con variable dinámica `variable.program.program_id` en:
- `sc-solana/runbooks/01-deployment/initialize-config.tx` (línea 29)
- `sc-solana/runbooks/01-deployment/grant-roles.tx` (línea 45)

---

#### #150 - Puerto RPC inconsistente
**Severidad:** P0 Crítico  
**Depende de:** Nada (independiente)  
**Bloquea:** Todos los deploys  

**Estado actual:**
| Runbook | Puerto |
|---------|--------|
| deploy-program.tx | 8999 |
| initialize-config.tx | 8999 |
| grant-roles.tx | 8899 |
| register-netbook.tx | 8899 |
| audit-hardware.tx | 8899 |
| validate-software.tx | 8899 |
| assign-student.tx | 8899 |
| add-role-holder.tx | 8999 |
| transfer-admin.tx | 8999 |
| approve-role-request.tx | 8999 |
| upgrade-program.tx | 8899 |

**Acción:** Estandarizar en `env.RPC_URL` con default `http://localhost:8899`

---

#### #149 - Admin como Web Wallet vs PDA en grant-roles
**Severidad:** P0 Crítico  
**Depende de:** Análisis de código actual  
**Bloquea:** grant-roles runbook  

**Análisis de código actual:**
- **Contract** [`grant.rs:19-22`](sc-solana/programs/sc-solana/src/instructions/role/grant.rs:19):
  ```rust
  #[account(mut, has_one = admin)]
  pub config: Account<'info, SupplyChainConfig>,
  #[account(mut)]
  pub admin: Signer<'info>,
  ```
  → Admin es Signer regular (wallet), NO es PDA. La validación `has_one = admin` verifica que `config.admin == admin.key()`.

**Veredicto:** El código actual CORRECTAMENTE usa admin como wallet signer. El runbook debe firmar con la wallet admin, no derivar un PDA. **El issue describe un problema que ya fue resuelto en el código.**

**Acción:** Actualizar runbook `grant-roles.tx` para usar wallet signer y cerrar issue.

---

#### #148 - Seed de PDA de Netbook en runbooks
**Severidad:** P0 Crítico  
**Depende de:** #159  
**Bloquea:** audit, validate, assign runbooks  

**Análisis:**
- **Contract:** `seeds = [b"netbook", config.next_token_id.to_le_bytes().as_ref()]`
- **Runbooks incorrectos:** `["netbook", variable.serial_number]` ❌
- **Debe ser:** `["netbook", svm::u64(variable.token_id)]`

**Acción:** Corregir en:
- `audit-hardware.tx`
- `validate-software.tx`
- `assign-student.tx`

---

### 🟡 ALTOS (P1) - Bloquean Funcionalidad Específica

#### #151 - Orden de accounts en add-role-holder.tx
**Severidad:** P1 Alto  
**Depende de:** #149  
**Bloquea:** add-role-holder runbook  

**Análisis de código** [`holder_add.rs:13-28`](sc-solana/programs/sc-solana/src/instructions/role/holder_add.rs:13):
```rust
pub struct AddRoleHolder<'info> {
    pub config: Account<'info, SupplyChainConfig>,        // pos 1
    pub admin: Signer<'info>,                              // pos 2
    pub role_holder: Account<'info, RoleHolder>,           // pos 3 (init PDA)
    pub account_to_add: UncheckedAccount<'info>,           // pos 4
    pub system_program: Program<'info, System>,            // pos 5
}
```

**Acción:** Reordenar accounts en runbook para coincidir.

---

#### #152 - Account role_holder en approve-role-request.tx
**Severidad:** P1 Alto  
**Depende de:** #149  
**Bloquea:** approve-role-request runbook  

**Análisis de código** [`request.rs:41-57`](sc-solana/programs/sc-solana/src/instructions/role/request.rs:41):
```rust
pub struct ApproveRoleRequest<'info> {
    pub config: Account<'info, SupplyChainConfig>,        // pos 1
    pub admin: Signer<'info>,                              // pos 2
    pub role_request: Account<'info, RoleRequest>,         // pos 3
    pub role_holder: Account<'info, RoleHolder>,           // pos 4 (init PDA)
    pub system_program: Program<'info, System>,            // pos 5
}
```

**Acción:** Derivar role_holder PDA correctamente en runbook.

---

#### #153 - Output duplicado serial_hashes_pda
**Severidad:** P1 Alto  
**Depende de:** Nada  
**Bloquea:** initialize-config parseo  

**Acción:** Eliminar bloque duplicado en `initialize-config.tx` líneas 130-133.

---

#### #154 - Inconsistencia upgrade-program
**Severidad:** P1 Alto  
**Depende de:** Decisión de arquitectura  
**Bloquea:** upgrade-program runbook  

**Acción:** Eliminar `upgrade-program.tx` (programa es no-upgradeable).

---

### 🟢 MEDIOS (P2) - Mejoras

#### #155 - Crear runbooks faltantes
**Severidad:** P2 Medio  
**Depende de:** Niveles 0-2  
**Bloquea:** Nada funcional  

**Runbooks a crear:**
1. `reset-role-request.tx`
2. `close-role-holder.tx`
3. Verificar `query-netbook.tx`

---

#### #156 - Templates de runbooks y documentación
**Severidad:** P2 Medio  
**Depende de:** #155  
**Bloquea:** Nada  

---

### 🔵 VERIFICACIÓN

#### #157 - Checklist completa de consistencia
**Severidad:** Verificación  
**Depende de:** TODOS los issues anteriores  

#### #146 - Epic: Surfpool Deploy System Consistency
**Severidad:** Meta-issue  
**Depende de:** #147-#156  

---

## Issues de Frontend/Contract (No Runbook)

### #158 - Solana Program: Impossible PDA Signers for Admin commands
**Estado:** ✅ RESUELTO en código actual  
**Análisis:** El código actual usa `admin: Signer<'info>` sin constraint PDA. Solo valida `has_one = admin` en config.  

### #160 - Missing role_holder account mappings
**Estado:** ⚠️ PARCIALMENTE RESUELTO  
**Análisis:** [`solana-program.ts:302-312`](web/src/lib/contracts/solana-program.ts:302):
```typescript
const tx = await program.methods
  .approveRoleRequest()
  .accounts({
    config: configPda,
    admin: signer,
    roleRequest: roleRequestPda,
    roleHolder: roleHolderPda,      // ✅ Presente
    systemProgram: SystemProgram.programId,  // ✅ Presente
  })
```
**Veredicto:** `buildApproveRoleRequestTx` incluye role_holder y systemProgram. Verificar `buildGrantRoleTx` y `buildRevokeRoleTx`.

### #161 - State definition desync
**Estado:** ✅ RESUELTO en código actual  
**Análisis:** [`UnifiedSupplyChainService.ts:32-65`](web/src/services/UnifiedSupplyChainService.ts:32):
- `NetbookData` tiene `initialModelSpecs: string` ✅
- `ConfigData` tiene `adminPdaBump`, `fabricanteCount`, etc. ✅
- `RoleHolderData` existe ✅

---

## Plan de Implementación Óptimo

### Fase 1: Verificación y Cleanup (30 min)
1. **Verificar #159** - Confirmar que seeds de PDA coinciden entre frontend y contract
2. **Cerrar #158** - Confirmar que admin es Signer no PDA (ya resuelto)
3. **Cerrar #161** - Confirmar que TypeScript interfaces están sincronizadas (ya resuelto)
4. **Verificar #160** - Revisar que todos los transaction builders incluyen accounts necesarios

### Fase 2: Correcciones Críticas Runbooks P0 (2-3 horas)
1. **#147** - Corregir Program ID en initialize-config.tx y grant-roles.tx
2. **#150** - Estandarizar puerto RPC en todos los runbooks
3. **#149** - Actualizar grant-roles.tx para usar wallet signer
4. **#148** - Corregir seed de netbook PDA en audit/validate/assign runbooks

### Fase 3: Correcciones Estructurales P1 (1-2 horas)
1. **#153** - Eliminar output duplicado (corrección rápida)
2. **#151** - Corregir orden de accounts en add-role-holder.tx
3. **#152** - Corregir role_holder PDA en approve-role-request.tx
4. **#154** - Eliminar upgrade-program.tx

### Fase 4: Completitud P2 (1 hora)
1. **#155** - Crear runbooks faltantes
2. **#156** - Implementar templates y mejorar documentación

### Fase 5: Verificación Final (30 min)
1. **#157** - Ejecutar checklist completa
2. **#146** - Cerrar epic con todos los sub-issues resueltos

---

## Verificaciones de Tecnología

### Rust/Anchor (Programa Solana)
```bash
cd sc-solana && cargo check
# ✅ Resultado: Finished dev profile [unoptimized + debuginfo] target(s) in 0.41s
```

### Frontend Tests
```bash
cd web && yarn test
# ⚠️ Resultado: 5 failed (Playwright/E2E conflict con Jest), 6 tests passed
# Los tests unitarios funcionan. Los E2E deben ejecutarse con: yarn playwright test
```

### Estado del Repositorio
```bash
git status
# ✅ Limpio: main...origin/main sin cambios pendientes
```

---

## Resumen de Prioridades

| Orden | Issue | Tipo | Estimación | Dependencias |
|-------|-------|------|------------|--------------|
| 1 | #159 | Verificación | 15 min | Ninguna |
| 2 | #158 | Cerrar | 5 min | #159 |
| 3 | #161 | Cerrar | 5 min | #159 |
| 4 | #160 | Verificación | 15 min | #159 |
| 5 | #147 | Corrección | 30 min | #159 |
| 6 | #150 | Corrección | 30 min | Ninguna |
| 7 | #149 | Corrección | 30 min | #158 |
| 8 | #148 | Corrección | 45 min | #159 |
| 9 | #153 | Corrección | 10 min | Ninguna |
| 10 | #151 | Corrección | 20 min | #149 |
| 11 | #152 | Corrección | 20 min | #149 |
| 12 | #154 | Corrección | 15 min | Ninguna |
| 13 | #155 | Creación | 45 min | Fase 2-3 |
| 14 | #156 | Documentación | 30 min | #155 |
| 15 | #157 | Verificación | 30 min | Todo |
| 16 | #146 | Cerrar Epic | 10 min | #147-#156 |

**Tiempo total estimado:** 6-8 horas de trabajo
