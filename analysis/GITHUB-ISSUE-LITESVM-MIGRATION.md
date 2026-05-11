# Migración a LiteSVM: Resolver Fallos Persistentes en Tests de Anchor

## Resumen del Problema

El job `test-anchor` del pipeline CI/CD falla consistentemente debido a dependencias externas inestables: `solana-cli`, `anchor-cli` (avm), y `solana-test-validator`. Estos fallos bloquean la integración continua y generan feedback loops largos.

### Síntomas Reportados

- ❌ `"solana: command not found"` (exit code 127)
- ❌ `"Some specified paths were not resolved, unable to cache dependencies"`
- ❌ Inconsistencias en la instalación de Solana CLI en GitHub Actions
- ❌ Tiempo de setup: ~60 segundos solo para dependencias
- ❌ Flakiness rate alto por validator issues

### Impacto

- **Bloqueo de PRs:** No se puede mergear código sin workarounds
- **Tiempo CI:** ~5 minutos por job inestable
- **Frustración del equipo:** Falsos positivos/negativos en tests
- **Riesgo de calidad:** Tests que pasan localmente pero fallan en CI

---

## Análisis de Root Cause

### Arquitectura Actual (Fragil)

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions Runner                     │
├─────────────────────────────────────────────────────────────┤
│  1. Download solana-cli (30-60s)                            │
│     └─> Fails: Network issues, version mismatches           │
│                                                              │
│  2. Setup PATH for solana-cli                               │
│     └─> Fails: export doesn't persist across steps          │
│                                                              │
│  3. Install Anchor CLI (avm)                                │
│     └─> Fails: cargo install timeouts, Rust compilation     │
│                                                              │
│  4. Start solana-test-validator (external process)          │
│     └─> Fails: Port conflicts, startup race conditions      │
│                                                              │
│  5. Run Anchor tests (TypeScript)                           │
│     └─> Fails: RPC timeouts, validator crashes              │
└─────────────────────────────────────────────────────────────┘
```

### Dependencias Problemáticas

| Dependencia | Propósito | Problema |
|-------------|-----------|----------|
| `solana-cli` | `solana-test-validator` | Binario descargable, PATH inestable |
| `anchor-cli` (avm) | `anchor build/test` | Compilación Rust lenta, fallos intermitentes |
| `solana-test-validator` | Validator local | Proceso externo, race conditions |
| `npm` cache | Dependencies | Path resolution failures |

---

## Solución: LiteSVM

### ¿Qué es LiteSVM?

LiteSVM es una biblioteca Rust que crea una **Solana VM in-process**, optimizada para testing de programas Solana. Elimina todas las dependencias externas.

**Características:**
- **In-process:** Sin procesos externos, sin red, sin RPC
- **Rust native:** `cargo test` directo, sin CLI intermedia
- **10-50x más rápido:** Sin overhead de validator
- **Determinístico:** Mismos resultados siempre
- **Compatible con Anchor:** Mismos programas, mismo código

### Comparación de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│              Arquitectura Actual (Frágil)                    │
├─────────────────────────────────────────────────────────────┤
│  GitHub Actions                                             │
│    ├─> solana-cli (external download)                       │
│    ├─> anchor-cli (cargo install)                           │
│    ├─> solana-test-validator (external process)             │
│    │    └─> RPC server (TCP/UDP)                            │
│    └─> TypeScript tests (via RPC)                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Arquitectura con LiteSVM (Estable)              │
├─────────────────────────────────────────────────────────────┤
│  GitHub Actions                                             │
│    ├─> Rust toolchain (stable)                              │
│    ├─> anchor build (program compilation)                    │
│    └─> cargo test (in-process VM)                           │
│         └─> LiteSVM (memory, no network)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Plan de Implementación Jerárquico y Evolutivo

### Visión General

```
Fase 0: Proof of Concept (Validación)
  └─> Setup básico + 2-3 tests críticos

Fase 1: Foundation (Core Infrastructure)
  ├─> 1.1: Dependencias y configuración
  ├─> 1.2: TestContext reutilizable
  └─> 1.3: Tests de inicialización

Fase 2: Core Business Logic (Migración Principal)
  ├─> 2.1: Netbook Registration
  ├─> 2.2: Role Management
  ├─> 2.3: State Machine
  └─> 2.4: PDA Derivation

Fase 3: Advanced Scenarios (Cobertura Completa)
  ├─> 3.1: Batch Operations
  ├─> 3.2: Edge Cases
  ├─> 3.3: Full Lifecycle
  └─> 3.4: Error Codes

Fase 4: CI/CD Integration (Automatización)
  ├─> 4.1: Nuevo workflow job
  ├─> 4.2: Parallel execution
  └─> 4.3: Reporting

Fase 5: Optimization & Documentation (Mejora Continua)
  ├─> 5.1: Performance tuning
  ├─> 5.2: Documentation
  └─> 5.3: Migration guide
```

---

## Fase 0: Proof of Concept

**Objetivo:** Validar que LiteSVM funciona con el programa actual

**Duración estimada:** 2-4 horas

**Criterios de éxito:**
- [ ] `cargo test` pasa con LiteSVM
- [ ] Programa se deploya correctamente
- [ ] Test básico de inicialización funciona

### Tareas

- [ ] **0.1:** Agregar dependencias `litesvm` y `litesvm-loader` a `Cargo.toml`
- [ ] **0.2:** Crear `tests/poc-litesvm.rs` con test mínimo
- [ ] **0.3:** Verificar deploy del programa con `deploy_upgradeable_program`
- [ ] **0.4:** Validar acceso a cuentas con `svm.get_account()`

### Referencias Técnicas

```toml
# Cargo.toml dependencies
[dev-dependencies]
litesvm = "0.11"
litesvm-loader = "0.11"
```

```rust
// tests/poc-litesvm.rs - Ejemplo mínimo
use litesvm::LiteSVM;
use litesvm_loader::deploy_upgradeable_program;
use solana_keypair::Keypair;
use solana_signer::Signer;

#[test]
fn poc_deploy_program() {
    let mut svm = LiteSVM::new();
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 100_000_000_000).unwrap();
    
    let program_bytes = std::fs::read("target/deploy/sc_solana.so").unwrap();
    let program_kp = Keypair::new();
    deploy_upgradeable_program(&mut svm, &payer, &program_kp, &program_bytes).unwrap();
    
    assert!(svm.get_account(&program_kp.pubkey()).is_some());
}
```

---

## Fase 1: Foundation

**Objetivo:** Infraestructura base reutilizable para todos los tests

**Duración estimada:** 1-2 días

**Depende de:** Fase 0 aprobada

### 1.1: Dependencias y Configuración

**Archivo:** [`sc-solana/programs/sc-solana/Cargo.toml`](sc-solana/programs/sc-solana/Cargo.toml)

```toml
[dev-dependencies]
litesvm = "0.11"
litesvm-loader = "0.11"
solana-keypair = "*"
solana-signer = "*"
solana-pubkey = "*"
solana-hash = "*"
solana-message = "*"
solana-transaction = "*"
solana-system-interface = "*"
```

**Tareas:**
- [ ] Agregar todas las dependencias necesarias
- [ ] Verificar `cargo build --tests` sin errores
- [ ] Configurar workspace si es necesario

### 1.2: TestContext Reutilizable

**Archivo:** `sc-solana/tests/litesvm-setup.rs`

```rust
use litesvm::LiteSVM;
use litesvm_loader::deploy_upgradeable_program;
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_pubkey::Pubkey;
use solana_hash::Hash;

pub struct TestContext {
    pub svm: LiteSVM,
    pub program_id: Pubkey,
    pub payer: Keypair,
}

impl TestContext {
    pub fn new() -> Self {
        let mut svm = LiteSVM::new();
        
        let payer = Keypair::new();
        svm.airdrop(&payer.pubkey(), 100_000_000_000).unwrap();
        
        let program_bytes = std::fs::read("target/deploy/sc_solana.so")
            .expect("Program not built. Run 'anchor build' first.");
        let program_kp = Keypair::new();
        deploy_upgradeable_program(&mut svm, &payer, &program_kp, &program_bytes)
            .expect("Failed to deploy program");
        
        Self {
            svm,
            program_id: program_kp.pubkey(),
            payer,
        }
    }
    
    pub fn airdrop(&mut self, pubkey: &Pubkey, amount: u64) {
        self.svm.airdrop(pubkey, amount).unwrap();
    }
    
    pub fn latest_blockhash(&self) -> Hash {
        self.svm.latest_blockhash()
    }
    
    pub fn advance_slot(&mut self) {
        self.svm.increase_slot(1);
    }
}

impl Default for TestContext {
    fn default() -> Self {
        Self::new()
    }
}
```

**Tareas:**
- [ ] Crear `sc-solana/tests/litesvm-setup.rs`
- [ ] Implementar `TestContext::new()`
- [ ] Implementar helpers: `airdrop()`, `latest_blockhash()`, `advance_slot()`
- [ ] Implementar `Default` trait
- [ ] Crear test de validación en `tests/litesvm-test-context.rs`

### 1.3: Tests de Inicialización

**Archivo:** `sc-solana/tests/litesvm-initialization.rs`

**Tareas:**
- [ ] Test: Config PDA derivation
- [ ] Test: Config space allocation
- [ ] Test: Initialize config instruction
- [ ] Test: Verify config state after initialization

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use sc_solana::state::Config;
    
    #[test]
    fn test_config_pda_derivation() {
        let ctx = TestContext::new();
        let (config_pda, bump) = Config::pubkey_and_bump(&[&[
            Config::SEED_PREFIX.as_bytes(),
            &ctx.program_id.to_bytes(),
        ]]);
        
        assert!(svm.get_account(&config_pda).is_none()); // Not initialized yet
    }
    
    #[test]
    fn test_initialize_config() {
        let mut ctx = TestContext::new();
        // Initialize config via instruction
        // Verify config state
    }
}
```

---

## Fase 2: Core Business Logic

**Objetivo:** Migrar los tests críticos del programa

**Duración estimada:** 3-5 días

**Depende de:** Fase 1 aprobada

### 2.1: Netbook Registration

**Archivo:** `sc-solana/tests/litesvm-netbook-registration.rs`

**Tests a implementar:**

| # | Test | Descripción | Prioridad |
|---|------|-------------|-----------|
| 1 | `test_register_single_netbook` | Registro individual | P0 |
| 2 | `test_register_batch_netbooks` | Registro batch | P0 |
| 3 | `test_register_empty_serial_rejection` | Validación serial vacía | P0 |
| 4 | `test_register_serial_too_long` | Validación longitud serial | P1 |
| 5 | `test_netbook_state_after_registration` | Estado inicial Fabricada | P0 |
| 6 | `test_netbook_pda_deterministic` | PDA determinística | P1 |

**Referencia:** [`sc-solana/tests/sc-solana.ts:470-560`](sc-solana/tests/sc-solana.ts:470)

```rust
#[test]
fn test_register_single_netbook() {
    let mut ctx = TestContext::new();
    
    let fabricante = Keypair::new();
    ctx.airdrop(&fabricante.pubkey(), 10_000_000_000).unwrap();
    
    let serial = "NB-001-PROD";
    let model = "Dell Latitude 5420";
    
    // Register netbook
    // Verify state == Fabricada
    // Verify serial hash stored
    // Verify token counter incremented
}
```

### 2.2: Role Management

**Archivo:** `sc-solana/tests/litesvm-role-management.rs`

**Tests a implementar:**

| # | Test | Descripción | Prioridad |
|---|------|-------------|-----------|
| 1 | `test_grant_auditor_role` | Grant auditor role | P0 |
| 2 | `test_grant_fabricante_role` | Grant fabricante role | P0 |
| 3 | `test_grant_tecnico_role` | Grant tecnico role | P0 |
| 4 | `test_request_role` | Role request flow | P0 |
| 5 | `test_approve_role_request` | Admin approves request | P0 |
| 6 | `test_reject_role_request` | Admin rejects request | P1 |
| 7 | `test_revoke_role` | Revoke existing role | P1 |
| 8 | `test_cannot_grant_as_non_admin` | RBAC enforcement | P0 |
| 9 | `test_cannot_grant_same_role_twice` | Duplicate prevention | P1 |

**Referencia:** [`sc-solana/tests/sc-solana.ts:470-468`](sc-solana/tests/sc-solana.ts:270)

### 2.3: State Machine

**Archivo:** `sc-solana/tests/litesvm-state-machine.rs`

**Tests a implementar:**

| # | Test | Descripción | Prioridad |
|---|------|-------------|-----------|
| 1 | `test_full_lifecycle` | Fabricada → HwAprobado → SwValidado → Distribuida | P0 |
| 2 | `test_invalid_transition_backward` | No revertir estados | P0 |
| 3 | `test_invalid_transition_skip` | No saltar estados | P0 |
| 4 | `test_audit_hardware_success` | Transición a HwAprobado | P0 |
| 5 | `test_audit_hardware_failure` | No transición si falla | P0 |
| 6 | `test_validate_software_success` | Transición a SwValidado | P0 |
| 7 | `test_assign_to_student_success` | Transición a Distribuida | P0 |

**Referencia:** [`sc-solana/tests/sc-solana.ts:978-1046`](sc-solana/tests/sc-solana.ts:978)

```rust
#[test]
fn test_full_lifecycle() {
    let mut ctx = TestContext::new();
    
    // Setup roles
    let admin = Keypair::new();
    let fabricante = Keypair::new();
    let auditor = Keypair::new();
    let tecnico = Keypair::new();
    let escuela = Keypair::new();
    let estudiante = Keypair::new();
    
    // 1. Register netbook (Fabricada)
    // 2. Audit hardware (HwAprobado)
    // 3. Validate software (SwValidado)
    // 4. Assign to student (Distribuida)
    
    // Verify final state
    let netbook = svm.get_account(&netbook_pda).unwrap();
    assert_eq!(netbook.data[1], State::Distribuida as u8);
}
```

### 2.4: PDA Derivation

**Archivo:** `sc-solana/tests/litesvm-pda-derivation.rs`

**Tests a implementar:**

| # | Test | Descripción | Prioridad |
|---|------|-------------|-----------|
| 1 | `test_netbook_pda_deterministic` | Mismo token ID = misma PDA | P0 |
| 2 | `test_netbook_pda_different` | Diferente token ID = diferente PDA | P0 |
| 3 | `test_netbook_pda_uses_bump` | Bump counter, no serial | P1 |
| 4 | `test_config_pda_correct` | Config PDA derivation | P0 |
| 5 | `test_role_holder_pda_correct` | RoleHolder PDA derivation | P1 |

**Referencia:** [`sc-solana/tests/sc-solana.ts:1048-1069`](sc-solana/tests/sc-solana.ts:1048)

---

## Fase 3: Advanced Scenarios

**Objetivo:** Cobertura completa de edge cases y escenarios avanzados

**Duración estimada:** 3-4 días

**Depende de:** Fase 2 aprobada

### 3.1: Batch Operations

**Archivo:** `sc-solana/tests/litesvm-batch-registration.rs`

**Tests:**
- [ ] `test_batch_register_valid` - Batch exitoso
- [ ] `test_batch_register_empty` - Error InvalidInput
- [ ] `test_batch_register_array_mismatch` - Error ArrayLengthMismatch
- [ ] `test_batch_register_serial_too_long` - Error StringTooLong

### 3.2: Edge Cases

**Archivo:** `sc-solana/tests/litesvm-edge-cases.rs`

**Tests:**
- [ ] `test_overflow_protection` - Prevención de overflow
- [ ] `test_string_boundary_conditions` - Límites de strings
- [ ] `test_concurrent_operations` - Operaciones concurrentes
- [ ] `test_account_reinitialization` - Re-inicialización segura

### 3.3: Full Lifecycle Integration

**Archivo:** `sc-solana/tests/litesvm-integration-full-lifecycle.rs`

**Tests:**
- [ ] `test_complete_supply_chain_flow` - Flujo completo
- [ ] `test_multiple_netbooks_parallel` - Múltiples netbooks
- [ ] `test_role_hierarchy_enforcement` - Jerarquía de roles

### 3.4: Error Codes

**Archivo:** `sc-solana/tests/litesvm-error-codes.rs`

**Tests:**
- [ ] `test_error_array_length_mismatch`
- [ ] `test_error_invalid_input`
- [ ] `test_error_empty_serial`
- [ ] `test_error_string_too_long`
- [ ] `test_error_invalid_state_transition`
- [ ] `test_error_unauthorized_role`

**Referencia:** [`sc-solana/tests/sc-solana.ts:1072-1174`](sc-solana/tests/sc-solana.ts:1072)

---

## Fase 4: CI/CD Integration

**Objetivo:** Automatizar ejecución de tests en CI

**Duración estimada:** 1 día

**Depende de:** Fase 3 aprobada

### 4.1: Nuevo Workflow Job

**Archivo:** `.github/workflows/ci.yml`

```yaml
# ============================================================================
# Job: Anchor Program Tests (LiteSVM)
# ============================================================================
test-anchor-litesvm:
  runs-on: ubuntu-latest
  timeout-minutes: 15
  steps:
    - uses: actions/checkout@v4

    - name: Setup Rust toolchain
      uses: dtolnay/rust-toolchain@stable
      with:
        toolchain: stable

    - name: Cache Cargo registry
      uses: actions/cache@v4
      with:
        path: ~/.cargo/registry
        key: cargo-registry-${{ hashFiles('sc-solana/Cargo.lock') }}

    - name: Cache Cargo index
      uses: actions/cache@v4
      with:
        path: ~/.cargo/index
        key: cargo-index

    - name: Cache Cargo build
      uses: actions/cache@v4
      with:
        path: sc-solana/target
        key: cargo-target-${{ hashFiles('sc-solana/Cargo.lock') }}

    - name: Build Program (anchor build)
      run: cd sc-solana && anchor build
      env:
        CARGO_TERM_COLOR: always

    - name: Run LiteSVM Unit Tests
      run: cd sc-solana && cargo test --test litesvm-* -- --test-threads=1
      timeout-minutes: 10

    - name: Run Anchor TypeScript Tests (Integration)
      run: cd sc-solana && anchor test
      timeout-minutes: 15
```

### 4.2: Parallel Execution

**Actual:** Jobs secuenciales

**Nuevo:**
```yaml
test-anchor:
  needs: []
  # TypeScript + solana-test-validator (integration tests)

test-anchor-litesvm:
  needs: []
  # Rust + LiteSVM (unit tests, más rápido)

summary:
  needs: [test-anchor, test-anchor-litesvm, ...]
```

### 4.3: Reporting

- [ ] Configurar test report generation
- [ ] Upload test results as artifacts
- [ ] Code coverage tracking

---

## Fase 5: Optimization & Documentation

**Objetivo:** Mejora continua y documentación

**Duración estimada:** 2 días

**Depende de:** Fase 4 aprobada

### 5.1: Performance Tuning

- [ ] Benchmark: LiteSVM vs solana-test-validator
- [ ] Parallel test execution (donde sea seguro)
- [ ] Cache optimization

### 5.2: Documentation

**Archivos a crear/actualizar:**

| Archivo | Acción |
|---------|--------|
| `sc-solana/README.md` | Agregar sección LiteSVM |
| `sc-solana/tests/README.md` | Documentar estructura de tests |
| `analysis/litesvm-analysis.md` | Actualizar con resultados |
| `VERIFICATIONS.md` | Agregar métricas de rendimiento |

### 5.3: Migration Guide

**Contenido:**
- Guía paso a paso para migrar tests TS a Rust
- Pattern de TestContext
- Common pitfalls y soluciones
- Referencias a documentación de Anchor

---

## Métricas de Éxito

### Actuales vs Objetivo

| Métrica | Actual | Objetivo LiteSVM | Mejora |
|---------|--------|------------------|--------|
| **Setup time** | 60s | 10s | 83% ↓ |
| **Test execution** | 120s | 15s | 87% ↓ |
| **Total CI time** | ~300s | ~145s | 52% ↓ |
| **Flakiness rate** | Alto | Bajo | ~90% ↓ |
| **Success rate CI** | ~60% | ~99% | 65% ↑ |

### Criterios de Aceptación por Fase

**Fase 0:**
- [ ] POC test pasa localmente
- [ ] Programa se deploya en LiteSVM

**Fase 1:**
- [ ] TestContext funciona
- [ ] 3+ tests de inicialización pasan

**Fase 2:**
- [ ] 80%+ tests core pasan
- [ ] State machine completa verificada
- [ ] Role management completo

**Fase 3:**
- [ ] 100% tests edge cases pasan
- [ ] Error codes verificados
- [ ] Full lifecycle integrado

**Fase 4:**
- [ ] CI job pasa consistentemente
- [ ] 99%+ success rate en 10 runs
- [ ] Tiempo total < 15 minutos

**Fase 5:**
- [ ] Documentación completa
- [ ] Migration guide publicado
- [ ] Benchmarks documentados

---

## Referencias Documentación

### LiteSVM

| Recurso | URL |
|---------|-----|
| **Docs Oficial (Anchor)** | https://www.anchor-lang.com/docs/testing/litesvm |
| **GitHub Repository** | https://github.com/LiteSVM/litesvm |
| **Cargo Crate** | https://crates.io/crates/litesvm |
| **litesvm-loader** | https://crates.io/crates/litesvm-loader |

### Anchor Testing

| Recurso | URL |
|---------|-----|
| **Anchor Testing Guide** | https://www.anchor-lang.com/docs/testing |
| **Anchor CLI Reference** | https://www.anchor-lang.com/docs/references/cli |
| **Anchor Quickstart** | https://www.anchor-lang.com/docs/quickstart/local |

### Solana Development

| Recurso | URL |
|---------|-----|
| **Solana Docs** | https://docs.solana.com |
| **Solana Program Library** | https://github.com/solana-labs/solana-program-library |
| **Solana Cookbook** | https://solanacookbook.com |

### Proyectos Relacionados

| Proyecto | URL | Descripción |
|----------|-----|-------------|
| **Mollusk** | https://github.com/electric-capital/mollusk | Otro framework de testing para Solana |
| **solana-program-test** | https://docs.solana.com/developing/test-validator | Program test framework oficial |
| **Surfpool** | https://github.com/user/repo | Testing contra cluster state real |

---

## Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| **Incompatibilidad con programa actual** | Baja | Alto | Fase 0 valida antes de comprometer |
| **Curva de aprendizaje Rust** | Media | Medio | TestContext reutilizable reduce complejidad |
| **Tests TS aún necesarios** | Alta | Bajo | Ambos coexisten, no reemplazo total |
| **Dependencias nuevas** | Baja | Medio | Solo dev-dependencies, no production |
| **CI time no mejora** | Baja | Medio | Benchmarks en Fase 0 validan expectativa |

---

## Timeline Estimado

| Fase | Duración | Cumulative |
|------|----------|------------|
| **Fase 0: POC** | 0.5 días | 0.5 días |
| **Fase 1: Foundation** | 2 días | 2.5 días |
| **Fase 2: Core Logic** | 4 días | 6.5 días |
| **Fase 3: Advanced** | 3.5 días | 10 días |
| **Fase 4: CI/CD** | 1 día | 11 días |
| **Fase 5: Docs** | 2 días | 13 días |

**Total estimado:** ~2-3 semanas (considerando revisión y feedback)

---

## Próximos Pasos

1. **Crear issue en GitHub** ← Este documento
2. **Obtener aprobación del equipo**
3. **Iniciar Fase 0 (POC)**
4. **Validar approach con 2-3 tests críticos**
5. **Si POC exitoso → proceder con Fase 1**

---

## Labels Sugeridos

- `enhancement`
- `testing`
- `ci-cd`
- `solana`
- `anchor`
- `performance`
- `infrastructure`

---

## Related Issues

- [CI/CD Pipeline fixes](link-to-related-issue)
- [Anchor test flakiness tracking](link-to-related-issue)
- [Test coverage improvement](link-to-related-issue)
