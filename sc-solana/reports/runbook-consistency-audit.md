# Audit de Consistencia: Runbooks Surfpool/txtx vs Estado Actual del Sistema

**Fecha:** 2026-05-08
**Herramienta:** gh-cli skill analysis
**Ámbito:** sc-solana/runbooks/ vs sc-solana/programs/sc-solana/src/

---

## Resumen Ejecutivo

Se identificaron **13 inconsistencias** entre los runbooks declarativos de Surfpool/txtx y el estado actual del programa Anchor. Las inconsistencias se clasifican en:

| Severidad | Cantidad | Descripción |
|-----------|----------|-------------|
| CRÍTICA | 4 | Bloquean ejecución de runbooks |
| ALTA | 4 | Causan comportamiento incorrecto |
| MEDIA | 3 | Inconsistencias de mantenimiento |
| BAJA | 2 | Mejoras de documentación |

---

## Inconsistencias Críticas

### C1: Program ID Hardcoded Incorrecto en Runbooks

**Severidad:** CRÍTICA
**Archivos afectados:**
- [`initialize-config.tx`](runbooks/01-deployment/initialize-config.tx:29)
- [`grant-roles.tx`](runbooks/01-deployment/grant-roles.tx:45)

**Descripción:**
Los runbooks declaran un Program ID hardcodeado que NO coincide con el definido en el programa Anchor.

| Fuente | Program ID |
|--------|------------|
| [`lib.rs:17`](programs/sc-solana/src/lib.rs:17) `declare_id!()` | `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN` |
| [`initialize-config.tx:29`](runbooks/01-deployment/initialize-config.tx:29) | `7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb` |
| [`grant-roles.tx:45`](runbooks/01-deployment/grant-roles.tx:45) | `7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb` |
| [`initialize-config-cli.sh:76`](runbooks/01-deployment/initialize-config-cli.sh:76) | `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN` (CORRECTO) |
| [`deploy-program.tx:20`](runbooks/01-deployment/deploy-program.tx:20) | Dinámico vía `svm::get_program_from_anchor_project` (CORRECTO) |

**Impacto:** Los runbooks de initialize-config y grant-roles derivarán PDAs incorrectos, causando fallos en todas las instrucciones que dependen del program_id.

**Solución:** Reemplazar el Program ID hardcodeado con `variable.program.program_id` (obtenido dinámicamente) o actualizar al Program ID correcto.

---

### C2: PDA de Netbook - Seed Incorrecta en Runbooks de Operaciones

**Severidad:** CRÍTICA
**Archivos afectados:**
- [`audit-hardware.tx:61`](runbooks/02-operations/netbook/audit-hardware.tx:61)
- [`validate-software.tx:61`](runbooks/02-operations/netbook/validate-software.tx:61)
- [`assign-student.tx:61`](runbooks/02-operations/netbook/assign-student.tx:61)

**Descripción:**
El programa Anchor deriva el PDA del netbook usando `token_id`, pero los runbooks de operaciones lo derivan usando `serial_number`.

| Fuente | Seed del PDA |
|--------|--------------|
| [`register.rs:25`](programs/sc-solana/src/instructions/netbook/register.rs:25) | `[b"netbook", b"netbook", &config.next_token_id.to_le_bytes()[0..7]]` |
| [`register-netbook.tx:82`](runbooks/02-operations/netbook/register-netbook.tx:82) | `["netbook", "netbook", svm::u64(variable.token_id)]` (CORRECTO) |
| [`audit-hardware.tx:61`](runbooks/02-operations/netbook/audit-hardware.tx:61) | `["netbook", variable.serial_number]` (INCORRECTO) |
| [`validate-software.tx:61`](runbooks/02-operations/netbook/validate-software.tx:61) | `["netbook", variable.serial_number]` (INCORRECTO) |
| [`assign-student.tx:61`](runbooks/02-operations/netbook/assign-student.tx:61) | `["netbook", variable.serial_number]` (INCORRECTO) |

**Impacto:** Los runbooks de audit, validate y assign intentarán acceder a un PDA inexistente (derivado con serial_number en lugar de token_id), causando fallos de "account not found".

**Solución:** Actualizar los runbooks para usar la misma seed que el programa: `["netbook", "netbook", svm::u64(token_id)]`. Requiere tracking del token_id como se documenta en `register-netbook.tx`.

---

### C3: Admin como Web Wallet vs PDA en grant-roles.tx

**Severidad:** CRÍTICA
**Archivo afectado:** [`grant-roles.tx`](runbooks/01-deployment/grant-roles.tx)

**Descripción:**
El runbook `grant-roles.tx` usa el admin como un signer regular (web wallet), pero el programa requiere que el admin sea un PDA derivado.

| Fuente | Patrón de Admin |
|--------|-----------------|
| [`grant.rs:23-27`](programs/sc-solana/src/instructions/role/grant.rs:23) | PDA: `seeds = [b"admin", config.key().as_ref()], bump` |
| [`grant-roles.tx:12-14`](runbooks/01-deployment/grant-roles.tx:12) | Web Wallet: `signer "admin" "svm::web_wallet"` |
| [`grant-roles.tx:69`](runbooks/01-deployment/grant-roles.tx:69) | `signer.admin.public_key` (clave regular, no PDA) |

**Impacto:** La verificación `has_one = admin` en el struct `GrantRole` fallará porque `config.admin` apunta al PDA, pero el signer es una cuenta regular.

**Solución:** Derivar el admin como PDA en el runbook (como se hace en `add-role-holder.tx` y `transfer-admin.tx`):
```
variable "admin_pda" {
  value = svm::find_pda(variable.program_id, ["admin", variable.config_pda.pda])
}
```

---

### C4: Puerto RPC Inconsistente entre Runbooks

**Severidad:** CRÍTICA
**Archivos afectados:** Múltiples runbooks

**Descripción:**
Los runbooks usan puertos RPC inconsistentes (8899 vs 8999).

| Runbook | Puerto | Línea |
|---------|--------|-------|
| `deploy-program.tx` | 8999 | :7 |
| `initialize-config.tx` | 8999 | :14 |
| `grant-roles.tx` | 8899 | :9 |
| `register-netbook.tx` | 8899 | :8 |
| `audit-hardware.tx` | 8899 | :8 |
| `validate-software.tx` | 8899 | :8 |
| `assign-student.tx` | 8899 | :8 |
| `add-role-holder.tx` | 8999 | :3 |
| `transfer-admin.tx` | 8999 | :3 |
| `approve-role-request.tx` | 8999 | :3 |
| `upgrade-program.tx` | 8899 | :7 |
| `txtx.yml` (localnet) | 8899 | :124 |
| `Anchor.toml` (test.validator) | 8999 | :32 |

**Impacto:** Si el validator corre en el puerto 8899 (default de Surfpool), los runbooks con puerto 8999 fallarán y viceversa.

**Solución:** Estandarizar en un solo puerto. El puerto 8899 es el default de `solana-test-validator` y Surfpool. El puerto 8999 es el de Anchor test validator. Usar variable de entorno `env.RPC_URL` en lugar de hardcodear.

---

## Inconsistencias Altas

### A1: Orden de Accounts Incorrecto en add-role-holder.tx

**Severidad:** ALTA
**Archivo afectado:** [`add-role-holder.tx`](runbooks/03-role-management/add-role-holder.tx)

**Descripción:**
El orden de accounts en el runbook no coincide con el struct Anchor.

| Posición | Runbook (`add-role-holder.tx`) | Programa (`holder_add.rs`) |
|----------|--------------------------------|----------------------------|
| 1 | config PDA | config |
| 2 | admin PDA | admin PDA |
| 3 | `signer.new_holder.public_key` | **role_holder** (init PDA) |
| 4 | `variable.role_holder_pda.pda` | **account_to_add** (UncheckedAccount) |
| 5 | system_program | system_program |

**Impacto:** Anchor rechazará la transacción porque los accounts no coinciden con la estructura esperada.

**Solución:** Reordenar accounts:
```
accounts = [
  { public_key = variable.config_pda.pda, ... },
  { public_key = variable.admin_pda.pda, ... },
  { public_key = variable.role_holder_pda.pda, ... },  // role_holder PDA
  { public_key = signer.new_holder.public_key, ... },  // account_to_add
  { public_key = svm::system_program_id(), ... }
]
```

---

### A2: Orden de Accounts Incorrecto en approve-role-request.tx

**Severidad:** ALTA
**Archivo afectado:** [`approve-role-request.tx`](runbooks/03-role-management/approve-role-request.tx)

**Descripción:**
El 4to account usa `variable.requester_address` directamente en lugar del PDA de role_holder derivado.

| Posición | Runbook | Programa (`ApproveRoleRequest`) |
|----------|---------|----------------------------------|
| 4 | `variable.requester_address` (raw pubkey) | **role_holder** (init PDA: `[b"role_holder", role_request.user]`) |

**Impacto:** El account role_holder no será inicializado correctamente como PDA.

**Solución:** Derivar el role_holder PDA correctamente:
```
variable "role_holder_pda" {
  value = svm::find_pda(variable.program_id, ["role_holder", variable.requester_address])
}
```

---

### A3: Output Duplicado en initialize-config.tx

**Severidad:** ALTA
**Archivo afectado:** [`initialize-config.tx`](runbooks/01-deployment/initialize-config.tx)

**Descripción:**
El output `serial_hashes_pda` está definido dos veces (líneas 125-128 y 130-133).

```
// Línea 125
output "serial_hashes_pda" {
  description = "Serial Hashes Registry PDA address"
  value = variable.serial_hashes_pda.pda
}

// Línea 130 (DUPLICADO)
output "serial_hashes_pda" {
  description = "Serial hashes PDA address"
  value = variable.serial_hashes_pda.pda
}
```

**Impacto:** Error de parseo en txtx/surfpool (output duplicado).

**Solución:** Eliminar el output duplicado.

---

### A4: Runbook de Upgrade para Programa No-Upgradeable

**Severidad:** ALTA
**Archivos afectados:**
- [`upgrade-program.tx`](runbooks/01-deployment/upgrade-program.tx)
- [`Anchor.toml:24`](Anchor.toml:24)
- [`deploy-program.tx:28`](runbooks/01-deployment/deploy-program.tx:28)

**Descripción:**
Existe un runbook de upgrade pero el programa se despliega como no-upgradeable.

| Fuente | Configuración |
|--------|---------------|
| `Anchor.toml:24` | `upgradeable = false` |
| `deploy-program.tx:28` | `authority = null` (sin autoridad de upgrade) |
| `upgrade-program.tx` | Runbook completo de upgrade con `authority = signer.authority` |

**Impacto:** El runbook de upgrade fallará porque no hay autoridad de upgrade configurada.

**Solución:** Opción A: Eliminar `upgrade-program.tx`. Opción B: Cambiar `upgradeable = true` en Anchor.toml y configurar autoridad en `deploy-program.tx`.

---

## Inconsistencias Medias

### M1: Runbooks Ausentes para Instrucciones Existentes

**Severidad:** MEDIA
**Instrucciones sin runbook:**

| Instrucción en [`lib.rs`](programs/sc-solana/src/lib.rs) | Línea | Runbook |
|----------------------------------------------------------|-------|---------|
| `reset_role_request` | :76 | No existe |
| `close_role_holder` | :88 | No existe |
| `query_netbook_state` | :141 | No existe (hay `query-netbook.tx` pero verificar) |

**Impacto:** Cobertura incompleta de runbooks.

---

### M2: Ubicación Incorrecta de Runbooks de Role en txtx.yml

**Severidad:** MEDIA
**Archivo afectado:** [`txtx.yml`](txtx.yml)

**Descripción:**
Los runbooks `request-role` y `revoke-role` están declarados en la sección "Query Runbooks" pero apuntan a la carpeta `02-operations/netbook/`.

| Runbook | Declarado en txtx.yml | Ubicación real |
|---------|----------------------|----------------|
| `request-role` | :73 (Phase 3 Role Management) | `02-operations/netbook/request-role.tx` |
| `revoke-role` | :77 (Phase 3 Role Management) | `02-operations/netbook/revoke-role.tx` |

**Impacto:** Confusión en la organización, aunque las rutas son correctas.

---

### M3: Admin PDA como writable en initialize-config.tx

**Severidad:** MEDIA
**Archivo afectado:** [`initialize-config.tx:86-90`](runbooks/01-deployment/initialize-config.tx:86)

**Descripción:**
El admin PDA se marca como `writable = true` pero en el programa es solo un PDA derivado (no inicializado).

| Fuente | Configuración |
|--------|---------------|
| `initialize-config.tx:89` | `writable = true` |
| [`initialize.rs:30-33`](programs/sc-solana/src/instructions/initialize.rs:30) | PDA derivado con `seeds` y `bump` (no `init`) |

**Impacto:** Podría causar confusión en el simulador de Surfpool.

---

## Inconsistencias Bajas

### L1: Documentación de Token ID en register-netbook.tx

**Severidad:** BAJA
**Archivo afectado:** [`register-netbook.tx:73-77`](runbooks/02-operations/netbook/register-netbook.tx:73)

**Descripción:**
El token_id está hardcodeado a `1` con un comentario que indica que debe actualizarse manualmente. Esto es una limitación conocida (Issue #129) pero debería documentarse mejor.

---

### L2: Template de Runbooks no Referenciado

**Severidad:** BAJA
**Archivos afectados:** [`_templates/`](runbooks/_templates/)

**Descripción:**
Existen templates en `_templates/` (common.tx, env-vars.tx, pda-derivation.tx, standard-runbook.tx) pero los runbooks no los incluyen/referencian. Cada runbook repite la misma configuración de addon y variables.

---

## Matriz de Dependencias

```
deploy-program.tx
    └── initialize-config.tx (CRÍTICA: C1, C4, A3)
            └── grant-roles.tx (CRÍTICA: C1, C3, C4)
                    ├── register-netbook.tx (CRÍTICA: C4)
                    │       ├── audit-hardware.tx (CRÍTICA: C2, C4)
                    │       │       └── validate-software.tx (CRÍTICA: C2, C4)
                    │       │               └── assign-student.tx (CRÍTICA: C2, C4)
                    │       └── add-role-holder.tx (ALTA: A1, C4)
                    └── approve-role-request.tx (ALTA: A2, C4)
```

## Recomendaciones de Prioridad

1. **Inmediato (P0):** Corregir C1 (Program ID) y C2 (Netbook PDA seed) - bloquean toda la cadena de ejecución
2. **Alta Prioridad (P1):** Corregir C3 (Admin PDA en grant-roles) y C4 (Puerto RPC) - afectan deployment
3. **Media Prioridad (P2):** Corregir A1-A4 (orden de accounts, outputs duplicados, upgrade)
4. **Baja Prioridad (P3):** Crear runbooks faltantes (M1) y mejorar documentación (L1-L2)

## Estado del Sistema Surfpool

| Componente | Estado | Observaciones |
|------------|--------|---------------|
| txtx.yml | ✅ Válido | Declaraciones de runbooks consistentes |
| .surfpool/logs/ | ✅ Activo | Logs de ejecución recientes (2026-05-05 a 2026-05-07) |
| runbooks/01-deployment/ | ❌ Inconsistente | C1, C3, C4, A3, A4 |
| runbooks/02-operations/ | ❌ Inconsistente | C2, C4 |
| runbooks/03-role-management/ | ❌ Inconsistente | A1, A2, C4 |
| runbooks/04-testing/ | ⚠️ No verificado | Requiere revisión |
| initialize-config-cli.sh | ✅ Correcto | Workaround válido para limitación Surfpool |

---

*Reporte generado automáticamente por análisis de consistencia entre runbooks declarativos y código fuente del programa Anchor.*
