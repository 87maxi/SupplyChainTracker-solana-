# Plan de Refactorización de Tests y Deploy

**Fecha:** 2026-05-16
**Estado:** Propuesta
**Autor:** Agent de refactorización

---

## Tabla de Contenidos

1. [Arquitectura Objetivo](#1-arquitectura-objetivo)
2. [Inventario Actual](#2-inventario-actual)
3. [Tests a Eliminar](#3-tests-a-eliminar)
4. [Tests a Migrar](#4-tests-a-migrar)
5. [Tests a Mantener](#5-tests-a-mantener)
6. [Estructura Final Propuesta](#6-estructura-final-propuesta)
7. [Plan de Ejecución](#7-plan-de-ejecución)
8. [Plan de Deploy](#8-plan-de-deploy)
9. [Checklist de Consistencia](#9-checklist-de-consistencia)

---

## 1. Arquitectura Objetivo

### Stack de Testing Unificado

```
┌─────────────────────────────────────────────────────────────────┐
│                     STRATEGY PYRAMID                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  SURFPOOL/TXTX (Integration E2E)                        │   │
│  │  - full-lifecycle.tx                                    │   │
│  │  - edge-cases.tx                                        │   │
│  │  - role-workflow.tx                                     │   │
│  │  - setup-test-env.tx                                    │   │
│  │  Runs against: Surfpool local network                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ▲                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  CODAMA (Integration TS)                                │   │
│  │  - lifecycle.ts (full lifecycle)                        │   │
│  │  - role-management.ts (RBAC)                            │   │
│  │  - state-machine.ts (transitions)                       │   │
│  │  - edge-cases.ts (error handling)                       │   │
│  │  - query-instructions.ts (view functions)               │   │
│  │  Runs against: solana-test-validator (localhost:8899)   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ▲                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  MOLLUSK (Unit Rust)                                    │   │
│  │  - mollusk-tests.rs (PDAs, discriminators, space)       │   │
│  │  - mollusk-lifecycle.rs (state machine, encoding)       │   │
│  │  - compute-units.rs (CU estimation)                     │   │
│  │  Runs: In-process, no validator                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Reglas de Asignación

| Capa | Framework | Qué testear | Requiere validator |
|------|-----------|-------------|-------------------|
| Unit (Rust) | Mollusk | PDA derivation, discriminators, space calcs, CU estimation, state values | No |
| Integration (TS) | Codama | Full lifecycle, RBAC, state transitions, error handling, queries | Sí (localhost:8899) |
| E2E (Runbooks) | Surfpool/txtx | Lifecycle completo, edge cases, role workflow contra red real | Sí (Surfpool) |

### Principios

1. **Un test, un lugar:** Cada scenario se testa en exactamente una capa
2. **Mollusk para lo determinístico:** PDAs, discriminators, space calcs (no requieren blockchain)
3. **Codama para integración:** Lifecycle, roles, state machine (requieren transacciones reales)
4. **Surfpool para E2E:** Validación contra red local con estado persistente
5. **Cero Anchor legacy:** Todo migrado a Codama

---

## 2. Inventario Actual

### Tests Rust (Mollusk) - programs/sc-solana/tests/

| Archivo | Tests | Cobertura | Estado |
|---------|-------|-----------|--------|
| `mollusk-tests.rs` | 22 | PDA derivation, discriminators, space calcs, error codes, state values | ✅ Mantener |
| `mollusk-lifecycle.rs` | ~30 | State machine, serial hashes, role constants, instruction encoding | ✅ Mantener |
| `compute-units.rs` | ~20 | CU estimation per instruction | ✅ Mantener |

### Tests TypeScript (Codama) - tests/

| Archivo | Tests | Cobertura | Estado |
|---------|-------|-----------|--------|
| `sc-solana.ts` | ~15 | Init, roles, lifecycle (principal) | ⚠️ Merge con lifecycle.ts |
| `lifecycle.ts` | ~10 | Full lifecycle | ✅ Mantener (consolidar) |
| `state-machine.ts` | ~20 | State transitions | ✅ Mantener |
| `integration-full-lifecycle.ts` | ~15 | Lifecycle + batch + errors + queries | ⚠️ Duplicado |
| `role-management.ts` | ~25 | Grant, request, approve, revoke | ✅ Mantener |
| `role-enforcement.ts` | ~30 | RBAC boundary tests | ✅ Mantener |
| `batch-registration.ts` | ~20 | Batch operations | 🔴 Migrar (Anchor legacy) |
| `edge-cases.ts` | ~15 | Error handling | ✅ Mantener |
| `deployer-pda.ts` | ~5 | Deployer PDA | ✅ Mantener |
| `pda-derivation.ts` | ~15 | PDA security | 🔴 Migrar (Anchor legacy) |
| `unit-tests.ts` | ~10 | Struct sizes, enums | ⚠️ Duplicado con mollusk |
| `overflow-protection.ts` | ~10 | Boundary validation | ✅ Mantener |
| `rbac-consistency.ts` | ~15 | RBAC Issue #145 | ⚠️ Merge con role-enforcement |
| `query-instructions.ts` | ~10 | View functions | ✅ Mantener |
| `test-isolation.ts` | ~10 | Utilities | ✅ Mantener (infra) |
| `shared-init.ts` | - | Parallel init | ✅ Mantener (infra) |
| `test-helpers.ts` | - | Utilities | ✅ Mantener (infra) |

### Runbooks Surfpool - runbooks/04-testing/

| Runbook | Cobertura | Estado |
|---------|-----------|--------|
| `full-lifecycle.tx` | Lifecycle completo | ✅ Mantener |
| `edge-cases.tx` | Error handling | ✅ Mantener |
| `setup-test-env.tx` | Setup de entorno | ✅ Mantener |
| `role-workflow.tx` | Role workflow | ✅ Mantener |

---

## 3. Tests a Eliminar

### Eliminación directa (duplicados completos)

| Archivo | Razón | Reemplazo |
|---------|-------|-----------|
| `integration-full-lifecycle.ts` | Duplica lifecycle.ts + state-machine.ts + edge-cases.ts | `lifecycle.ts` (consolidado) |
| `unit-tests.ts` | Duplica mollusk-tests.rs (space calcs, enums, discriminators) | `mollusk-tests.rs` |

### Merge y eliminación

| Archivo | Acción | Destino |
|---------|--------|---------|
| `sc-solana.ts` | Merge tests únicos | `lifecycle.ts` (init + roles) |
| `rbac-consistency.ts` | Merge con role-enforcement | `role-enforcement.ts` |

### Resumen eliminación

```
ELIMINAR (4 archivos):
  tests/integration-full-lifecycle.ts  -> duplicado completo
  tests/unit-tests.ts                  -> duplicado con mollusk-tests.rs
  tests/sc-solana.ts                   -> merge con lifecycle.ts
  tests/rbac-consistency.ts            -> merge con role-enforcement.ts
```

---

## 4. Tests a Migrar

### Anchor Legacy -> Codama

| Archivo | Líneas | Complejidad |
|---------|--------|-------------|
| `batch-registration.ts` | 1038 | Media (usa `anchor.workspace`, `BN`, `Program`) |
| `pda-derivation.ts` | 694 | Baja (principalmente PDA derivation) |

### Cambios necesarios en batch-registration.ts

```typescript
// ANTES (Anchor legacy)
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
const program = anchor.workspace.scSolana as Program<ScSolana>;
const provider = anchor.AnchorProvider.env();

// DESPUÉS (Codama)
import { createSignerFromKeyPair } from "@solana/kit";
import {
  createTestClient,
  fundAndInitialize,
  getConfigPdaAddress,
  getSerialHashRegistryPdaAddress,
  getAdminPdaAddress,
  toAddress,
  type TestClient,
} from "./test-helpers";
```

### Cambios necesarios en pda-derivation.ts

```typescript
// ANTES (Anchor legacy)
import * as anchor from "@coral-xyz/anchor";
const program = anchor.workspace.scSolana as Program<ScSolana>;
[configPda, configBump] = getConfigPda(program);

// DESPUÉS (Codama)
import {
  getConfigPdaAddress,
  getNetbookPdaAddress,
  getRoleRequestPdaAddress,
  getSerialHashRegistryPdaAddress,
  getRoleHolderPdaAddress,
  getAdminPdaAddress,
  toAddress,
} from "./test-helpers";
configPda = await getConfigPdaAddress();
```

---

## 5. Tests a Mantener

### Mollusk (Rust) - Sin cambios

| Archivo | Razón |
|---------|-------|
| `mollusk-tests.rs` | Tests determinísticos de PDA, discriminators, space |
| `mollusk-lifecycle.rs` | State machine + instruction encoding |
| `compute-units.rs` | CU estimation |

### Codama (TypeScript) - Consolidados

| Archivo | Contenido final |
|---------|-----------------|
| `lifecycle.ts` | Init + roles + full lifecycle (merge con sc-solana.ts) |
| `state-machine.ts` | State transitions valid/invalid |
| `role-management.ts` | Grant, request, approve, revoke |
| `role-enforcement.ts` | RBAC boundary + consistency (merge con rbac-consistency.ts) |
| `batch-registration.ts` | Batch operations (migrado de Anchor) |
| `edge-cases.ts` | Error handling |
| `deployer-pda.ts` | Deployer PDA architecture |
| `pda-derivation.ts` | PDA security (migrado de Anchor) |
| `overflow-protection.ts` | Boundary validation |
| `query-instructions.ts` | View functions |

### Infraestructura - Sin cambios

| Archivo | Razón |
|---------|-------|
| `test-helpers.ts` | Utilities (limpiar funciones Anchor legacy) |
| `shared-init.ts` | Parallel init |
| `test-isolation.ts` | State cleanup |

### Surfpool Runbooks - Sin cambios

| Runbook | Razón |
|---------|-------|
| `full-lifecycle.tx` | E2E lifecycle |
| `edge-cases.tx` | E2E error handling |
| `setup-test-env.tx` | E2E setup |
| `role-workflow.tx` | E2E role workflow |

---

## 6. Estructura Final Propuesta

```
sc-solana/
├── programs/sc-solana/
│   └── tests/                          # MOLLUSK (Unit Rust)
│       ├── mollusk-tests.rs            # PDA, discriminators, space, errors
│       ├── mollusk-lifecycle.rs        # State machine, encoding
│       └── compute-units.rs            # CU estimation
│
├── tests/                              # CODAMA (Integration TS)
│   ├── test-helpers.ts                 # Utilities
│   ├── shared-init.ts                  # Parallel init
│   ├── test-isolation.ts               # State cleanup
│   │
│   ├── lifecycle.ts                    # Init + roles + full lifecycle
│   ├── state-machine.ts                # State transitions
│   ├── role-management.ts              # Grant, request, approve, revoke
│   ├── role-enforcement.ts             # RBAC boundary + consistency
│   ├── batch-registration.ts           # Batch operations (migrado)
│   ├── edge-cases.ts                   # Error handling
│   ├── deployer-pda.ts                 # Deployer PDA
│   ├── pda-derivation.ts               # PDA security (migrado)
│   ├── overflow-protection.ts          # Boundary validation
│   └── query-instructions.ts           # View functions
│
├── runbooks/                           # SURFPOOL (E2E)
│   ├── 04-testing/
│   │   ├── full-lifecycle.tx           # E2E lifecycle
│   │   ├── edge-cases.tx               # E2E errors
│   │   ├── setup-test-env.tx           # E2E setup
│   │   └── role-workflow.tx            # E2E roles
│   └── 05-ci/
│       └── runbook-tests.sh            # CI runner
│
└── txtx.yml                            # Surfpool config
```

### Resumen numérico

| Métrica | Antes | Después | Cambio |
|---------|-------|---------|--------|
| Tests Rust (Mollusk) | 3 | 3 | 0 |
| Tests TS (Codama) | 16 | 10 | -6 |
| Tests TS (Anchor) | 2 | 0 | -2 |
| Runbooks Surfpool | 4 | 4 | 0 |
| **Total archivos test** | **25** | **17** | **-8 (-32%)** |

---

## 7. Plan de Ejecución

### Fase 1: Limpieza (Día 1)

#### Tarea 1.1: Eliminar tests duplicados
```bash
# Eliminar duplicados completos
rm tests/integration-full-lifecycle.ts
rm tests/unit-tests.ts

# Verificar que no hay imports circulares
grep -r "integration-full-lifecycle\|unit-tests" tests/
```

#### Tarea 1.2: Merge sc-solana.ts -> lifecycle.ts
- Extraer tests de init y roles de `sc-solana.ts`
- Integrar en `lifecycle.ts` como describe blocks
- Eliminar `sc-solana.ts`

#### Tarea 1.3: Merge rbac-consistency.ts -> role-enforcement.ts
- Extraer tests de RBAC consistency
- Integrar en `role-enforcement.ts`
- Eliminar `rbac-consistency.ts`

### Fase 2: Migración (Día 2-3)

#### Tarea 2.1: Migrar batch-registration.ts
- Reemplazar `@coral-xyz/anchor` con Codama client
- Reemplazar `Program.methods` con `client.scSolana.instructions`
- Reemplazar `BN` con `BigInt`
- Reemplazar `PublicKey` con `Address` strings
- Usar `test-helpers.ts` para PDAs

#### Tarea 2.2: Migrar pda-derivation.ts
- Reemplazar `@coral-xyz/anchor` con Codama client
- Usar funciones de `test-helpers.ts` para PDA derivation
- Verificar que todos los PDA tests usan el mismo pattern

#### Tarea 2.3: Limpiar test-helpers.ts
- Remover funciones Anchor legacy: `getConfigPda()`, `getNetbookPda()`, etc.
- Mantener solo funciones Codama: `getConfigPdaAddress()`, `getNetbookPdaAddress()`, etc.
- Documentar funciones restantes

### Fase 3: Consistencia (Día 4)

#### Tarea 3.1: Unificar Program ID
```rust
// En mollusk-tests.rs, mollusk-lifecycle.rs, compute-units.rs
// Usar ID desde el programa en lugar de hardcodear
use sc_solana::ID;
const PROGRAM_ID: Pubkey = ID;
```

#### Tarea 3.2: Consistentizar role constants
```rust
// En mollusk-lifecycle.rs
// Cambiar de minúscula a MAYÚSCULA para coincidir con el programa
const FABRICANTE_ROLE: &str = "FABRICANTE";
const AUDITOR_HW_ROLE: &str = "AUDITOR_HW";
const TECNICO_SW_ROLE: &str = "TECNICO_SW";
const ESCUELA_ROLE: &str = "ESCUELA";
```

#### Tarea 3.3: Fix Anchor.toml
```toml
[toolchain]
package_manager = "npm"

[scripts]
test = "npx ts-mocha -p ./tsconfig.json -t 1000000 --file tests/shared-init.ts \"tests/**/*.ts\""
```

#### Tarea 3.4: Fix CI script
```bash
# runbooks/05-ci/runbook-tests.sh
# Buscar runbooks en el directorio correcto
RUNBOOKS_DIR="$PROJECT_ROOT/sc-solana/runbooks/04-testing"
for runbook in $(find "$RUNBOOKS_DIR" -name "*.tx" -type f | sort); do
    run_runbook_test "$runbook"
done
```

### Fase 4: Verificación (Día 5)

#### Tarea 4.1: Ejecutar todos los tests
```bash
# Mollusk tests (no validator)
cd sc-solana/programs/sc-solana
cargo test --test mollusk-tests
cargo test --test mollusk-lifecycle
cargo test --test compute-units

# Codama tests (requires validator)
cd sc-solana
solana-test-validator &
npx ts-mocha -p ./tsconfig.json -t 1000000 --file tests/shared-init.ts "tests/**/*.ts"

# Surfpool runbooks
NO_DNA=1 surfpool start
NO_DNA=1 txtx run full-lifecycle --env localnet
```

#### Tarea 4.2: Verificar cobertura
- Cada instruction del programa debe tener al menos un test
- Cada state transition debe estar testeada
- Cada error code debe ser verificado

---

## 8. Plan de Deploy

### Arquitectura de Deploy

```
┌─────────────────────────────────────────────────────────────┐
│                     DEPLOY PIPELINE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. BUILD                                                    │
│     cargo build-bpf (Anchor)                                │
│     └──> target/deploy/sc_solana.so                         │
│     └──> target/idl/sc_solana.json                          │
│                                                             │
│  2. CODEGEN                                                  │
│     codama run --all                                        │
│     └──> web/src/generated/ (TS client)                     │
│                                                             │
│  3. DEPLOY (Surfpool)                                       │
│     NO_DNA=1 surfpool start                                 │
│     txtx run deploy-program --env localnet                  │
│     txtx run initialize-config --env localnet               │
│     txtx run grant-roles --env localnet                     │
│                                                             │
│  4. VERIFY                                                   │
│     txtx run full-lifecycle --env localnet                  │
│     txtx run edge-cases --env localnet                      │
│     txtx run role-workflow --env localnet                   │
│                                                             │
│  5. PRODUCTION (manual)                                     │
│     txtx run deploy-program --env devnet                    │
│     txtx run initialize-config --env devnet                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Runbooks de Deploy (runbooks/01-deployment/)

| Runbook | Descripción | Estado |
|---------|-------------|--------|
| `deploy-program.tx` | Deploy program a network | ✅ OK |
| `initialize-config.tx` | Initialize SupplyChainConfig | ✅ OK |
| `grant-roles.tx` | Grant initial roles | ✅ OK |
| `full-init.tx` | Full init pipeline | ✅ OK |
| `grant-all-to-deployer.tx` | Grant all roles to deployer | ✅ OK |

### Consistencia de Runbooks

#### Verificar que runbooks usan el mismo Program ID
```yaml
# txtx.yml
programs:
  sc_solana:
    program_id: "7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb"  # UNIFICAR
```

#### Verificar que runbooks usan PDA derivation consistente
```
# Todos los runbooks deben usar:
variable "config_pda" {
  value = svm::find_pda(variable.program_id, ["config"])
}

variable "admin_pda" {
  value = svm::find_pda(variable.program_id, ["admin", variable.config_pda.pda])
}
```

### Entornos

| Entorno | Network | RPC | Uso |
|---------|---------|-----|-----|
| localnet | Surfpool | http://localhost:8899 | Desarrollo + CI |
| devnet | Solana Devnet | https://api.devnet.solana.com | Staging |
| mainnet | Solana Mainnet | https://api.mainnet-beta.solana.com | Producción |

---

## 9. Checklist de Consistencia

### Program ID
- [ ] `mollusk-tests.rs` usa `sc_solana::ID`
- [ ] `mollusk-lifecycle.rs` usa `sc_solana::ID`
- [ ] `compute-units.rs` usa `sc_solana::ID`
- [ ] `Anchor.toml` coincide con `lib.rs`
- [ ] `README.md` coincide con `lib.rs`
- [ ] `deploy.sh` coincide con `lib.rs`
- [ ] `txtx.yml` coincide con `lib.rs`
- [ ] Runbooks usan `svm::get_program_from_anchor_project`

### Role Constants
- [ ] `mollusk-tests.rs` usa MAYÚSCULA
- [ ] `mollusk-lifecycle.rs` usa MAYÚSCULA
- [ ] `test-helpers.ts` usa MAYÚSCULA
- [ ] Todos los tests TS usan MAYÚSCULA
- [ ] Runbooks usan MAYÚSCULA

### Build/Package Manager
- [ ] `Anchor.toml` usa `npm`
- [ ] `package.json` scripts usan `npx`
- [ ] `yarn.lock` eliminado
- [ ] `package-lock.json` existe

### CI/CD
- [ ] `runbook-tests.sh` busca en `04-testing/`
- [ ] Mollusk tests corren sin validator
- [ ] Codama tests requieren validator
- [ ] Surfpool runbooks requieren Surfpool

### Framework
- [ ] Cero imports de `@coral-xyz/anchor` en tests/
- [ ] Todos los tests usan Codama client
- [ ] `test-helpers.ts` sin funciones Anchor legacy

---

## Timeline Estimado

| Fase | Duración | Dependencias |
|------|----------|--------------|
| Fase 1: Limpieza | 1 día | Ninguna |
| Fase 2: Migración | 2-3 días | Fase 1 |
| Fase 3: Consistencia | 1 día | Fase 2 |
| Fase 4: Verificación | 1 día | Fase 3 |
| **Total** | **5-6 días** | |

## Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Tests Codama fallan sin validator | Alto | Documentar requirement de `solana-test-validator` |
| Migración batch-registration compleja | Medio | Revisar instruction signature en IDL |
| Surfpool no disponible en CI | Medio | Skip runbooks si txtx no instalado |
| Program ID incorrecto en deploy | Crítico | Verificar con `solana program show` |
