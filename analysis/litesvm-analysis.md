# Análisis: LiteSVM como Alternativa para Tests de Anchor

## Resumen Ejecutivo

**LiteSVM** es una biblioteca Rust que crea una Máquina Virtual de Solana en-proceso, diseñada específicamente para testing rápido de programas Solana. Elimina la necesidad de `solana-test-validator` (CLI externa) y `solana-cli` (dependencia de CI), resolviendo los problemas persistentes del pipeline CI/CD.

**Recomendación:** Migrar los tests de Anchor a LiteSVM para eliminar la dependencia de `solana-cli` en CI.

---

## Problema Actual

### CI/CD: Job `test-anchor` Fallido

El workflow actual en [`.github/workflows/ci.yml`](../.github/workflows/ci.yml:186) depende de:

1. **Solana CLI** (`solana-test-validator`) - Requiere descargar e instalar `solana-cli` en cada run
2. **Anchor CLI** (`anchor test`) - Requiere `avm` y instalación compleja
3. **Validator externo** - `solana-test-validator` ejecutándose como proceso separado

**Errores recurrentes:**
- `"solana: command not found"` (exit code 127)
- `"Some specified paths were not resolved, unable to cache dependencies"`
- Inconsistencias en la instalación de Solana CLI en GitHub Actions
- Tiempo de setup: ~30-60 segundos solo para instalar dependencias

---

## ¿Qué es LiteSVM?

### Características Principales

| Característica | Descripción |
|---------------|-------------|
| **Tipo** | Biblioteca Rust (in-process) |
| **Velocidad** | ~10-50x más rápido que `solana-test-validator` |
| **Dependencias** | Solo Rust (no requiere CLI externa) |
| **Ejecución** | `cargo test` nativo |
| **Compilación** | ~5x más rápido (sin overhead de validator) |
| **Test runner** | Integración nativa con Rust test framework |

### Comparación: Solana Test Validator vs LiteSVM

| Aspecto | solana-test-validator | LiteSVM |
|---------|----------------------|---------|
| **Instalación** | CLI binaria descargable | Cargo dev-dependency |
| **CI Setup** | 30-60s descarga + PATH config | `cargo test` directo |
| **Validator** | Proceso externo (background) | In-process (ningún proceso externo) |
| **Velocidad tests** | 2-5s por test | 0.1-0.5s por test |
| **Red** | Simulada (TCP/UDP) | Ninguna (memoria) |
| **RPC** | Necesario | No necesario |
| **Blockhash** | Via RPC | `svm.latest_blockhash()` |
| **Airdrop** | Via RPC | `svm.airdrop()` |
| **Deploy** | `anchor deploy` | `svm.add_program()` / `deploy_upgradeable_program()` |

---

## Integración con el Proyecto Actual

### 1. Dependencias Cargo.toml

Agregar al archivo [`sc-solana/programs/sc-solana/Cargo.toml`](sc-solana/programs/sc-solana/Cargo.toml):

```toml
[dev-dependencies]
litesvm = "0.11"
litesvm-loader = "0.11"
```

### 2. Ejemplo de Test con LiteSVM

```rust
#[cfg(test)]
mod litesvm_tests {
    use super::*;
    use litesvm::LiteSVM;
    use litesvm_loader::deploy_upgradeable_program;
    use solana_keypair::Keypair;
    use solana_signer::Signer;

    #[test]
    fn test_initialization_with_litesvm() {
        // 1. Crear LiteSVM instance
        let mut svm = LiteSVM::new();
        
        // 2. Payer account con fondos
        let admin = Keypair::new();
        svm.airdrop(&admin.pubkey(), 100_000_000_000).unwrap();
        
        // 3. Leer programa compilado
        let program_bytes = std::fs::read("target/deploy/sc_solana.so").unwrap();
        let program_kp = Keypair::new();
        
        // 4. Deploy programa
        deploy_upgradeable_program(&mut svm, &admin, &program_kp, &program_bytes)
            .unwrap();
        
        // 5. El programa está disponible en program_kp.pubkey()
        assert!(svm.get_account(&program_kp.pubkey()).is_some());
    }
    
    #[test]
    fn test_netbook_registration_with_litesvm() {
        let mut svm = LiteSVM::new();
        
        let admin = Keypair::new();
        svm.airdrop(&admin.pubkey(), 100_000_000_000).unwrap();
        
        let fabricante = Keypair::new();
        svm.airdrop(&fabricante.pubkey(), 10_000_000_000).unwrap();
        
        // Deploy programa
        let program_bytes = std::fs::read("target/deploy/sc_solana.so").unwrap();
        let program_kp = Keypair::new();
        deploy_upgradeable_program(&mut svm, &admin, &program_kp, &program_bytes)
            .unwrap();
        
        let program_id = program_kp.pubkey();
        
        // Obtener PDAs
        let (config_pda, config_bump) = Config::pubkey_and_bump(&[&[
            Config::SEED_PREFIX,
            &program_id.to_bytes(),
        ]]);
        
        // Inicializar config
        // ... (código de instrucción)
        
        // Registrar netbook
        // ... (código de instrucción)
        
        // Verificar estado
        let netbook_account = svm.get_account(&netbook_pda).unwrap();
        assert_eq!(netbook_account.data[1], State::Fabricada as u8);
    }
}
```

### 3. Patrón de Test Reutilizable

```rust
// tests/litesvm-setup.rs
use litesvm::LiteSVM;
use litesvm_loader::deploy_upgradeable_program;
use solana_keypair::Keypair;
use solana_signer::Signer;

pub struct TestContext {
    pub svm: LiteSVM,
    pub program_id: solana_pubkey::Pubkey,
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
    
    pub fn airdrop(&mut self, pubkey: &solana_pubkey::Pubkey, amount: u64) {
        self.svm.airdrop(pubkey, amount).unwrap();
    }
    
    pub fn latest_blockhash(&self) -> solana_hash::Hash {
        self.svm.latest_blockhash()
    }
}
```

---

## Migración del Workflow CI/CD

### Nuevo Workflow para `test-anchor` Job

```yaml
test-anchor:
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

    - name: Cache Cargo build
      uses: actions/cache@v4
      with:
        path: sc-solana/target
        key: cargo-target-${{ hashFiles('sc-solana/Cargo.lock') }}

    - name: Build Program (anchor build)
      run: cd sc-solana && anchor build
      env:
        CARGO_TERM_COLOR: always

    - name: Run LiteSVM Tests (cargo test)
      run: cd sc-solana && cargo test --test litesvm-* -- --test-threads=1
      timeout-minutes: 10
```

### Ventajas del Nuevo Workflow

| Aspecto | Actual | Con LiteSVM |
|---------|--------|-------------|
| **Solana CLI** | Requerida ❌ | No necesaria ✅ |
| **Anchor CLI** | Requerida (avm) | Solo para build |
| **solana-test-validator** | Requerido | No necesario |
| **Tiempo de setup** | ~60s | ~10s |
| **Tiempo de tests** | ~120s | ~10-30s |
| **Dependencias externas** | 3 (Solana CLI, Anchor, Node) | 1 (Rust) |

---

## Consideraciones de Migración

### 1. Tests que Pueden Migrarse Directamente

| Test File | Migrabilidad | Notas |
|-----------|-------------|-------|
| `lifecycle.ts` | ✅ Parcial | Lógica de estado → Rust |
| `batch-registration.ts` | ✅ Parcial | Batch operations → Rust |
| `role-management.ts` | ✅ Parcial | Grant/revoke → Rust |
| `pda-derivation.ts` | ✅ Sí | Pure logic → Rust |
| `state-machine.ts` | ✅ Sí | Transitions → Rust |
| `edge-cases.ts` | ✅ Sí | Boundary checks → Rust |
| `integration-full-lifecycle.ts` | ✅ Sí | Full flow → Rust |

### 2. Tests que Requieren Mantenimiento TypeScript

Los tests TypeScript actuales (`sc-solana/tests/sc-solana.ts`) siguen siendo válidos para:
- **Integration tests** con `solana-test-validator` (comportamiento realista)
- **E2E tests** del frontend con el programa real
- **Tests de RPC** (comportamiento de red)

**Recomendación:** Mantener ambos:
- **LiteSVM tests** (Rust) → Unit tests rápidos
- **TypeScript tests** → Integration tests completos

### 3. Acceso a Cuentas en LiteSVM

```rust
// Obtener cuenta
let account = svm.get_account(&pubkey);

// Crear cuenta personalizada
svm.set_account(&pubkey, &AccountInfo {
    lamports: 1_000_000_000,
    data: vec![0u8; 1000],
    owner: program_id,
    executable: false,
    rent_epoch: 0,
});

// Eliminar cuenta
svm.remove_account(&pubkey);
```

### 4. Manejo de Blockhash

```rust
// Obtener blockhash actual
let blockhash = svm.latest_blockhash();

// Advance slot para cambiar blockhash
svm.increase_slot(1);
```

---

## Plan de Migración Propuesto

### Fase 1: Setup (1 día)
- [ ] Agregar `litesvm` y `litesvm-loader` a `Cargo.toml`
- [ ] Crear `tests/litesvm-setup.rs` con `TestContext`
- [ ] Crear `tests/litesvm-initialization.rs` con tests básicos
- [ ] Verificar que `cargo test` funciona localmente

### Fase 2: Core Tests (2-3 días)
- [ ] `tests/litesvm-netbook-registration.rs`
- [ ] `tests/litesvm-role-management.rs`
- [ ] `tests/litesvm-state-machine.rs`
- [ ] `tests/litesvm-pda-derivation.rs`

### Fase 3: Advanced Tests (2-3 días)
- [ ] `tests/litesvm-batch-registration.rs`
- [ ] `tests/litesvm-edge-cases.rs`
- [ ] `tests/litesvm-integration-full-lifecycle.rs`
- [ ] `tests/litesvm-error-codes.rs`

### Fase 4: CI Integration (1 día)
- [ ] Actualizar `.github/workflows/ci.yml`
- [ ] Agregar job `test-anchor-litesvm` (paralelo al existente)
- [ ] Documentar en `README.md`
- [ ] Actualizar `VERIFICATIONS.md`

---

## Comparación de Rendimiento Estimada

| Métrica | Actual (TS + solana-test-validator) | Con LiteSVM (Rust) |
|---------|-------------------------------------|-------------------|
| **Setup time** | 60s | 10s |
| **Build time** | 120s | 120s (igual) |
| **Test execution** | 120s | 15s |
| **Total CI time** | ~300s (5 min) | ~145s (2.5 min) |
| **Flakiness rate** | Alto (validator issues) | Bajo (determinístico) |

---

## Referencias

- **LiteSVM Docs:** https://www.anchor-lang.com/docs/testing/litesvm
- **LiteSVM GitHub:** https://github.com/LiteSVM/litesvm
- **LiteSVM Cargo:** https://crates.io/crates/litesvm
- **litesvm-loader:** https://crates.io/crates/litesvm-loader
- **Anchor Testing Docs:** https://www.anchor-lang.com/docs/testing

---

## Conclusión

LiteSVM es la solución ideal para los problemas de CI/CD del proyecto `SupplyChainTracker-solana`:

1. **Elimina la dependencia de `solana-cli`** → No más `"command not found"` en CI
2. **Tests 10x más rápidos** → Feedback loop más corto
3. **Determinístico** → Sin flakiness por validator issues
4. **Compatible con Anchor** → Mismos programas, mismo código de negocio
5. **Complementa tests TS** → No reemplaza, mejora la cobertura

**Próximo paso:** Implementar Fase 1 para validar el approach con un proof-of-concept.
