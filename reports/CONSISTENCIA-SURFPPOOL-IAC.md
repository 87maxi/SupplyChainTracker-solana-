# Análisis de Consistencia: Runbooks vs SurfPool IaC Standard

> **Fecha de análisis:** 2026-05-17
> **Proyecto:** SupplyChainTracker-solana
> **Referencia:** [`ANALISIS-SURFPPOOL-IAC.md`](ANALISIS-SURFPPOOL-IAC.md)

---

## 1. Resumen Ejecutivo

| Aspecto | Estado | Puntuación |
|---------|--------|------------|
| **Estructura general** | ✅ Consistente | 9/10 |
| **Sintaxis txtx** | ✅ Consistente | 8/10 |
| **Configuración de addons** | ✅ Consistente | 9/10 |
| **Signers** | ⚠️ Parcialmente consistente | 6/10 |
| **Variables** | ✅ Consistente | 8/10 |
| **PDA Derivation** | ✅ Consistente | 9/10 |
| **Actions** | ⚠️ Limitaciones conocidas | 5/10 |
| **Outputs** | ✅ Consistente | 9/10 |
| **Entornos** | ✅ Consistente | 9/10 |
| **Manifest txtx.yml** | ✅ Consistente | 9/10 |
| **Templates** | ✅ Consistente | 8/10 |
| **State Management** | ⚠️ Parcialmente implementado | 4/10 |
| **Flows** | ❌ No implementado | 0/10 |
| **Signers Avanzados** | ❌ No implementado | 0/10 |
| **TOTAL** | | **7.0/10** |

---

## 2. Análisis Detallado por Categoría

### 2.1 Estructura General

#### ✅ CONSISTENTE

**Estructura de directorios:**
```
sc-solana/runbooks/
├── _templates/              ✅ Usa templates estandarizados
├── 01-deployment/           ✅ Agrupación por fase
├── 02-operations/           ✅ Agrupación por operación
├── 03-role-management/      ✅ Agrupación por gestión
├── 04-testing/              ✅ Agrupación por testing
├── 05-ci/                   ✅ Scripts CI
├── environments/            ✅ Config multi-ambiente
└── states/                  ✅ State management (parcial)
```

**Archivos `.tx`:** Todos usan extensión correcta y siguen patrón de nomenclatura.

**Conteo de runbooks:**
| Categoría | Archivos `.tx` | Registrados en `txtx.yml` | Estado |
|-----------|----------------|---------------------------|--------|
| Deployment | 4 | 3 | ⚠️ `grant-all-to-deployer.tx` no registrado |
| Operations | 6 | 6 | ✅ Completo |
| Role Management | 9 | 9 | ✅ Completo |
| Testing | 5 | 5 | ✅ Completo |
| **Total** | **24** | **23** | ⚠️ 1 faltante |

### 2.2 Sintaxis txtx

#### ✅ CONSISTENTE

**Patrones encontrados en todos los runbooks:**

```txtx
// Addon configuration - ✅ Estándar
addon "svm" {
  network_id = "localnet"
  rpc_api_url = "http://localhost:8899"
}

// Signers - ✅ Estándar
signer "name" "svm::web_wallet" {
  keypair_path = env.VARIABLE_NAME
}

// Variables - ✅ Estándar
variable "name" {
  description = "Description"
  value = some_expression
}

// PDA Derivation - ✅ Estándar
variable "pda_name" {
  value = svm::find_pda(variable.program_id, ["seed1", "seed2"])
}

// Actions - ✅ Estándar
action "name" "svm::process_instructions" {
  instruction {
    program_id = variable.program_id
    instruction_data = ...
    accounts = [...]
  }
  signers = [...]
}

// Outputs - ✅ Estándar
output "name" {
  description = "Description"
  value = expression
}
```

#### ⚠️ DESVIACIONES MENORES

| Runbook | Desviación | Línea | Recomendación |
|---------|------------|-------|---------------|
| `initialize-config.tx` | `program_id` hardcodeado | 38 | Usar `env.PROGRAM_ID` |
| `full-lifecycle.tx` | `program_idl + instruction_name()` | 88, 105 | Verificar compatibilidad con última versión de txtx |

### 2.3 Configuración de Addons

#### ✅ CONSISTENTE

Todos los runbooks usan el patrón estándar:

```txtx
addon "svm" {
  network_id = "localnet"
  rpc_api_url = "http://localhost:8899"
}
```

**Verificación:**
- ✅ `addon "svm"` usado consistentemente
- ✅ `network_id` y `rpc_api_url` siempre presentes
- ✅ Compatible con documentación SurfPool IaC

### 2.4 Signers

#### ⚠️ PARCIALMENTE CONSISTENTE

**Patrón actual (estándar):**
```txtx
signer "admin" "svm::web_wallet" {
  keypair_path = env.DEPLOYER_KEYPAIR
}
```

**Desviaciones encontradas:**

| Runbook | Problema | Impacto |
|---------|----------|---------|
| Varios | Todos usan `svm::web_wallet` | No usa signers avanzados |
| Varios | `description` omitido en algunos signers | Menor documentación |

**Signers disponibles en SurfPool IaC (no implementados):**

| Signer | Uso | Estado |
|--------|-----|--------|
| `svm::secret_key` | Mnemonic/secret key | ❌ No usado |
| `svm::web_wallet` | Web wallet con prompt | ✅ Usado (estándar) |
| `svm::squads` | Multisig vault | ❌ No usado |
| Secure enclave | Signers asíncronos | ❌ No usado |

**Recomendación:** Para producción, migrar a `svm::squads` para multisig.

### 2.5 Variables

#### ✅ CONSISTENTE

**Patrones correctos:**
```txtx
// Variables simples
variable "program_id" {
  value = "BTSWNY97FaxeJrUNSq399tRbfMz68iaaY3csJwT9hQQW"
}

// Variables derivadas
variable "program_id" {
  value = variable.program.program_id
}

// Variables de entorno
variable "serial_number" {
  value = env.NETBOOK_SERIAL
}
```

**Desviación:**
| Runbook | Problema | Recomendación |
|---------|----------|---------------|
| `initialize-config.tx` | `program_id` hardcodeado en lugar de `env.PROGRAM_ID` | Usar variable de entorno |

### 2.6 PDA Derivation

#### ✅ CONSISTENTE

**Patrones verificados:**

| PDA | Seeds | Consistencia |
|-----|-------|--------------|
| `deployer_pda` | `["deployer"]` | ✅ Uniforme |
| `config_pda` | `["config"]` | ✅ Uniforme |
| `admin_pda` | `["admin", config_pda.pda]` | ✅ Uniforme |
| `serial_hashes_pda` | `["serial_hashes", config_pda.pda]` | ✅ Uniforme |
| `netbook_pda` | `["netbook", serial_number]` | ✅ Uniforme |

**Verificación contra programa Anchor:**
- ✅ `admin_pda` usa seeds `[b"admin", config.key()]` → `["admin", config_pda.pda]`
- ✅ `deployer_pda` usa seed `[b"deployer"]` → `["deployer"]`
- ✅ `config_pda` usa seed `[b"config"]` → `["config"]`

### 2.7 Actions

#### ⚠️ LIMITACIONES CONOCIDAS

**Patrón estándar usado:**
```txtx
action "name" "svm::process_instructions" {
  instruction {
    program_id = variable.program_id
    instruction_data = program_idl + instruction_name("action_name")
    instruction_args = [...]
    accounts = [...]
  }
  signers = [...]
}
```

**Limitaciones documentadas (Issue #129):**

| Limitación | Runbooks Afectados | Workaround |
|------------|-------------------|------------|
| `initialize` no funciona con `svm::process_instructions` | `initialize-config.tx` | Usar solana CLI directamente |
| NO usar notación hexadecimal en arrays | Todos | Usar decimal |
| NO usar `--no-web` flag | Todos | Usar `surfpool run --env -f` |
| Usar `signatures | first()` para outputs | Todos | Array puede estar vacío |
| System Program Transfer requiere discriminador | Varios | `[2, 0, 0, 0]` + `svm::u64(amount)` |

**Estado de acciones por runbook:**

| Runbook | Acción | Estado |
|---------|--------|--------|
| `deploy-program.tx` | `svm::deploy_program` | ✅ Funcional |
| `initialize-config.tx` | Solana CLI (workaround) | ⚠️ Limitado |
| `full-lifecycle.tx` | `svm::process_instructions` | ✅ Funcional (excepto init) |
| `grant-roles.tx` | `svm::process_instructions` | ✅ Funcional |
| `register-netbook.tx` | `svm::process_instructions` | ✅ Funcional |

### 2.8 Outputs

#### ✅ CONSISTENTE

**Patrones correctos:**
```txtx
output "program_id" {
  description = "Deployed program ID"
  value = action.deploy.program_id
}

output "signatures" {
  value = action.deploy.signatures
}
```

**Verificación:** Todos los runbooks con acciones tienen outputs correspondientes.

### 2.9 Entornos

#### ✅ CONSISTENTE

**Archivos de entorno:**

| Archivo | Variables Clave | Estado |
|---------|----------------|--------|
| `localnet.env` | `PROGRAM_ID`, `DEPLOYER_KEYPAIR`, keypairs de roles | ✅ Completo |
| `devnet.env` | Variables para devnet | ✅ Completo |
| `mainnet.env` | Variables para mainnet | ✅ Completo |

**Configuración en `txtx.yml`:**
```yaml
environments:
  localnet:
    network_id: localnet
    rpc_api_url: http://localhost:8899
    ws_url: ws://localhost:8900
  devnet:
    network_id: devnet
    rpc_api_url: https://api.devnet.solana.com
  mainnet:
    network_id: mainnet
    rpc_api_url: https://api.mainnet-beta.solana.com
```

### 2.10 Manifest `txtx.yml`

#### ✅ CONSISTENTE

**Estructura verificada:**
```yaml
name: supply-chain-tracker
id: sc-solana
version: 0.2.0
addons:
  svm:
    description: "Solana Virtual Machine addon"
runbooks:
  - name: deploy-program
    location: runbooks/01-deployment/deploy-program.tx
  # ... 22 runbooks más
environments:
  localnet: { ... }
  devnet: { ... }
  mainnet: { ... }
```

**Verificación:**
- ✅ Todos los runbooks (excepto 1) registrados
- ✅ `addons.svm` declarado
- ✅ `environments` con 3 entornos
- ✅ `state.location` configurado para `setup-test-env`

### 2.11 Templates

#### ✅ CONSISTENTE

**Templates disponibles:**

| Template | Propósito | Estado |
|----------|-----------|--------|
| `standard-runbook.tx` | Runbook estándar | ✅ Completo |
| `common.tx` | Utilidades comunes | ✅ Disponible |
| `env-vars.tx` | Variables de entorno | ✅ Disponible |
| `pda-derivation.tx` | PDA derivation | ✅ Disponible |

### 2.12 State Management

#### ⚠️ PARCIALMENTE IMPLEMENTADO

**Implementación actual:**
```yaml
# txtx.yml
- name: setup-test-env
  state:
    location: runbooks/states/test
```

**Limitaciones:**
- ❌ State management solo configurado para 1 runbook
- ❌ No hay `states/` files generados (solo directorio vacío)
- ❌ No hay detección automática de cambios

### 2.13 Flows

#### ❌ NO IMPLEMENTADO

Los **Flows** permiten ejecutar runbooks múltiples veces con diferentes inputs:

```txtx
flow "solana" {
  rpc_api_url = "https://api.mainnet-beta.solana.com"
}

flow "eclipse" {
  rpc_api_url = "https://mainnetbeta-rpc.eclipse.xyz"
}
```

**Estado:** No implementado en ningún runbook actual.

### 2.14 Signers Avanzados

#### ❌ NO IMPLEMENTADO

**Signers disponibles (no usados):**

| Signer | Uso | Beneficio |
|--------|-----|-----------|
| `svm::squads` | Multisig vault | Seguridad para producción |
| `svm::secret_key` | Mnemonic/secret key | CI/CD automation |
| Secure enclave | Signers asíncronos | Enterprise security |

---

## 3. Checklist de Consistencia

### Program ID
- [x] `txtx.yml` usa program ID consistente
- [x] `environments/*.env` usa program ID consistente
- [x] Runbooks derivan program ID desde addon/program
- [ ] `initialize-config.tx` usa `env.PROGRAM_ID` (hardcodeado actualmente)

### Role Constants
- [x] Todos los runbooks usan MAYÚSCULA (`FABRICANTE`, `AUDITOR_HW`, etc.)
- [x] Consistente con programa Anchor

### Addon Configuration
- [x] Todos usan `addon "svm"`
- [x] `network_id` y `rpc_api_url` siempre presentes

### PDA Derivation
- [x] Todos usan `svm::find_pda(program_id, seeds)`
- [x] Seeds consistentes con programa Anchor
- [x] `admin_pda` usa `[b"admin", config.key()]`

### Signers
- [x] Todos usan `svm::web_wallet`
- [ ] Faltan `description` en algunos signers
- [ ] No se usan signers avanzados (squads, secret_key)

### Actions
- [x] Usan `svm::process_instructions` o `svm::deploy_program`
- [x] `accounts` especificados explícitamente
- [ ] `initialize` requiere workaround (solana CLI)

### Outputs
- [x] Todos los runbooks con acciones tienen outputs
- [x] Usan `action.name.field` para referencias

### State Management
- [ ] State management configurado para todos los runbooks relevantes
- [ ] `states/` directory con archivos generados

### Flows
- [ ] Flows implementados para testing multi-network

---

## 4. Issues Detectados

### CRÍTICO

| # | Issue | Impacto | Runbooks Afectados |
|---|-------|---------|-------------------|
| C1 | `initialize` no funciona con `svm::process_instructions` | Bloquea inicialización automática | `initialize-config.tx`, `full-lifecycle.tx` |
| C2 | `grant-all-to-deployer.tx` no registrado en `txtx.yml` | No ejecutable via `surfpool run` | `txtx.yml` |

### ALTO

| # | Issue | Impacto | Runbooks Afectados |
|---|-------|---------|-------------------|
| A1 | `program_id` hardcodeado en `initialize-config.tx` | Error si program ID cambia | `initialize-config.tx` |
| A2 | State management solo para 1 runbook | No aprovecha feature de SurfPool | `txtx.yml` |
| A3 | `description` omitido en signers | Menor documentación | Varios |

### MEDIO

| # | Issue | Impacto | Runbooks Afectados |
|---|-------|---------|-------------------|
| M1 | No se usan Flows | No ejecuta multi-network | `txtx.yml` |
| M2 | No se usan signers avanzados | Menor seguridad para prod | Todos |
| M3 | `states/` directory vacío | State management no funcional | `txtx.yml` |

### BAJO

| # | Issue | Impacto | Runbooks Afectados |
|---|-------|---------|-------------------|
| L1 | Comentarios en español vs inglés | Inconsistencia menor | Varios |
| L2 | `program_idl + instruction_name()` | Compatibilidad futura | `full-lifecycle.tx` |

---

## 5. Recomendaciones

### Inmediatas (Sprint Actual)

1. **Registrar `grant-all-to-deployer.tx` en `txtx.yml`**
   ```yaml
   - name: grant-all-to-deployer
     description: Grant all roles to deployer
     location: runbooks/01-deployment/grant-all-to-deployer.tx
   ```

2. **Fix `initialize-config.tx` para usar `env.PROGRAM_ID`**
   ```txtx
   variable "program_id" {
     value = env.PROGRAM_ID
   }
   ```

3. **Agregar `description` a todos los signers**
   ```txtx
   signer "admin" "svm::web_wallet" {
     description = "Admin account for initialization"
     keypair_path = env.DEPLOYER_KEYPAIR
   }
   ```

### Corto Plazo (Próximo Sprint)

4. **Habilitar state management para runbooks de testing**
   ```yaml
   runbooks:
     - name: full-lifecycle
       state:
         location: runbooks/states/lifecycle
     - name: edge-cases
       state:
         location: runbooks/states/edge-cases
   ```

5. **Documentar workarounds en `_templates/standard-runbook.tx`**
   - Issue #129 limitations
   - Initialize workaround
   - Hex notation warning

### Largo Plazo (Fase de Producción)

6. **Implementar Flows para testing multi-network**
   ```txtx
   flow "localnet" {
     rpc_api_url = "http://localhost:8899"
   }
   flow "devnet" {
     rpc_api_url = "https://api.devnet.solana.com"
   }
   ```

7. **Migrar signers a `svm::squads` para producción**
   ```txtx
   signer "admin" "svm::squads" {
     address = input.squads_vault_address
   }
   ```

8. **Crear CI script para validar consistencia de runbooks**
   - Verificar todos los `.tx` registrados en `txtx.yml`
   - Verificar program ID consistente
   - Verificar PDA derivation correcta

---

## 6. Comparativa: Actual vs Estándar SurfPool IaC

| Característica | Actual | Estándar SurfPool | Gap |
|----------------|--------|-------------------|-----|
| Addon config | ✅ `addon "svm"` | ✅ `addon "svm"` | 0 |
| Signers | ✅ `svm::web_wallet` | ✅ `web_wallet`, `squads`, `secret_key` | 3/4 |
| Variables | ✅ `variable "name" { value = ... }` | ✅ Igual | 0 |
| PDA derivation | ✅ `svm::find_pda()` | ✅ Igual | 0 |
| Actions | ✅ `svm::process_instructions` | ✅ Igual | 0 |
| Outputs | ✅ `output "name" { value = ... }` | ✅ Igual | 0 |
| Manifest | ✅ `txtx.yml` con environments | ✅ Igual | 0 |
| State management | ⚠️ 1 runbook | ✅ Todos | 22/23 |
| Flows | ❌ No usado | ✅ Opcional | 100% |
| Signers avanzados | ❌ No usado | ✅ Opcional | 100% |

---

## 7. Conclusión

Los runbooks del proyecto SupplyChainTracker muestran una **consistencia general buena (7.0/10)** con el estándar SurfPool IaC. Los puntos fuertes son:

1. **Estructura de directorios** bien organizada por fases
2. **Sintaxis txtx** correcta y uniforme
3. **PDA derivation** consistente con el programa Anchor
4. **Configuración de entornos** completa (localnet, devnet, mainnet)
5. **Templates** bien documentados

Los puntos de mejora son:

1. **State management** subutilizado (solo 1 de 23 runbooks)
2. **Signers avanzados** no implementados (squads, secret_key)
3. **Flows** no implementados
4. **Issue #129** limita la ejecución de `initialize`
5. **1 runbook no registrado** en `txtx.yml`

La inversión en mejoras sería ROI positivo para:
- **Seguridad**: Signers multisig para producción
- **Mantenibilidad**: State management para evitar re-ejecuciones
- **Flexibilidad**: Flows para testing multi-network
