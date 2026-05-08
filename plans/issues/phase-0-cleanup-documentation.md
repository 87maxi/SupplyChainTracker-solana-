# Issue: [REFACTOR Phase 0] Cleanup Obsolete Documentation and Runbooks Summaries

```markdown
---
name: Refactoring Phase 0 - Documentation Cleanup
about: Remove obsolete documentation files and consolidate information
title: '[REFACTOR Phase 0] Cleanup Obsolete Documentation and Runbooks Summaries'
labels: 'enhancement, documentation, refactoring, priority-high'
assignees: ''
---

## 📋 Descripción

Este issue cubre la eliminación de archivos markdown obsoletos y la consolidación de información relevante en la documentación permanente del proyecto.

**Plan completo:** [`plans/refactoring-plan.md`](../refactoring-plan.md)

## 🎯 Objetivo

Limpiar el directorio `runbooks/` de archivos que son resúmenes temporales de issues específicos, consolidando la información relevante en documentación permanente.

## 📁 Archivos a Eliminar

### 1. `runbooks/CHANGES-123-SUMMARY.md`

**Razón:** Resumen específico del Issue #123, no es documentación permanente.

**Información a consolidar antes de eliminar:**
- Tabla de funciones SVM disponibles → Mover a `runbooks/README.md`
- Sección "Known Issues & Solutions" → Mover a `runbooks/README.md`

**Contenido relevante a migrar:**
```markdown
## Funciones SVM Confirmadas Disponibles
| Función | Descripción |
|---------|-------------|
| `svm::find_pda(program_id, seeds)` | Derivar PDA address y bump seed |
| `svm::get_program_from_anchor_project(name)` | Obtener artifacts del programa |
| `svm::system_program_id()` | Obtener system program ID |
| `svm::sol_to_lamports(sol)` | Convertir SOL a lamports |
| `svm::lamports_to_sol(lamports)` | Convertir lamports a SOL |
| `svm::u64(value)` | Crear byte array u64 |
| `svm::i64(value)` | Crear byte array i64 |
| `svm::default_pubkey()` | Obtener pubkey cero |
| `svm::get_associated_token_account()` | Obtener dirección ATA |
| `svm::create_token_account_instruction()` | Instruction para crear token account |

## Funciones NO Disponibles
| Función | Estado |
|---------|--------|
| `svm::send_token` | ❌ NO documentada |
```

### 2. `runbooks/ISSUE-124-FIXES-SUMMARY.md`

**Razón:** Resumen específico del Issue #124, no es documentación permanente.

**Información a consolidar:**
- Cambios realizados en runbooks → Documentar en `runbooks/README.md` como "Change Log"
- Problemas de consistencia PDA → Verificar que están resueltos en runbooks actuales

### 3. `runbooks/SURFPOLL-CI-ANALYSIS.md`

**Razón:** Análisis temporal de CI de Surfpool, no es referencia permanente.

**Información a consolidar:**
- Issues abiertos de Surfpool relevantes → Agregar a `runbooks/README.md` sección "External Dependencies"
- Problemas conocidos de compatibilidad → Documentar en `runbooks/README.md`

### 4. `runbooks/PDA-CONSISTENCY-GUIDE.md`

**Razón:** Información ya integrada en los runbooks y en la documentación de txtx.

**Verificación:** Confirmar que las guías de PDA derivation están implementadas correctamente en:
- `_templates/pda-derivation.tx`
- Runbooks que usan PDAs

### 5. `runbooks/devnet-deployment.md`

**Razón:** Información duplicada de `txtx.yml` y runbooks.

**Verificación:** Confirmar que toda la información está en:
- `txtx.yml` (definición de runbooks)
- `runbooks/01-deployment/deploy-program.tx`
- `runbooks/environments/devnet.env`

### 6. `runbooks/mainnet-deployment.md`

**Razón:** Información duplicada de `txtx.yml` y runbooks.

**Verificación:** Confirmar que toda la información está en:
- `txtx.yml` (definición de runbooks)
- `runbooks/01-deployment/deploy-program.tx`
- `runbooks/environments/mainnet.env`

### 7. `runbooks/DEPLOYMENT-GUIDE.md`

**Razón:** Duplicado de `README.md` y documentación integrada.

## ✅ Tareas Específicas

### Tarea 1: Migrar Información Relevante

```bash
# 1.1 Agregar tabla de funciones SVM a runbooks/README.md
# Insertar después de la sección de "Known Issues & Solutions":

## SVM Functions Reference

### Available Functions
| Function | Description | Example |
|----------|-------------|---------|
| `svm::find_pda(program_id, seeds)` | Derive PDA address and bump seed | `svm::find_pda(program_id, ["seed"])` |
| `svm::get_program_from_anchor_project(name)` | Get program deployment artifacts | `svm::get_program_from_anchor_project("sc-solana")` |
| `svm::system_program_id()` | Get system program ID | `svm::system_program_id()` → `11111111111111111111111111111111` |
| `svm::sol_to_lamports(sol)` | Convert SOL to lamports | `svm::sol_to_lamports(5)` → `5000000000` |
| `svm::lamports_to_sol(lamports)` | Convert lamports to SOL | `svm::lamports_to_sol(5000000000)` → `5` |
| `svm::u64(value)` | Create u64 byte array for PDA seeds | `svm::u64(1000000000)` |
| `svm::i64(value)` | Create i64 byte array for PDA seeds | `svm::i64(-1000000000)` |
| `svm::default_pubkey()` | Get zero pubkey | `svm::default_pubkey()` → `11111111111111111111111111111111` |
| `svm::get_associated_token_account(wallet, mint)` | Get ATA address | `svm::get_associated_token_account(wallet, mint)` |
| `svm::create_token_account_instruction(funder, wallet, mint, program)` | Create ATA instruction | See example below |

### NOT Available
| Function | Status |
|----------|--------|
| `svm::send_token` | ❌ NOT documented in Surfpool |

### Example: System Program Transfer (Alternative to svm::send_token)
```yaml
# CORRECT: Use system program transfer for sending SOL
action "transfer" "svm::process_instructions" {
    signers = [signer.admin]
    
    instruction {
        program_id = svm::system_program_id()
        accounts = [
            { pubkey = signer.admin.address, is_signer = true, is_writable = true },
            { pubkey = signer.admin.address, is_signer = false, is_writable = true }
        ]
        data = svm::u64(svm::sol_to_lamports(5))
    }
}

# INCORRECT: svm::send_token is NOT available
# action "transfer" "svm::send_token" { ... }  ❌ DO NOT USE
```

# 1.2 Agregar sección de cambios recientes a runbooks/README.md
## Recent Changes (Issue Fixes)
- **2026-05-07**: Fixed `setup-test-env.tx` - Replaced `svm::send_token` with system program transfer (Issue #123)
- **2026-05-07**: Fixed `transfer-admin.tx` - Replaced `input.*` with `env.*` variables (Issue #123)
- **2026-05-07**: Fixed `query-config.tx` and `query-role.tx` - Use `signatures | first()` for safe access (Issue #123)
- **2026-05-07**: Fixed PDA derivation consistency across all runbooks (Issue #124)
```

### Tarea 2: Eliminar Archivos

```bash
# Verificar que la información fue migrada antes de eliminar
cd sc-solana/runbooks

# Eliminar archivos obsoletos
rm CHANGES-123-SUMMARY.md
rm ISSUE-124-FIXES-SUMMARY.md
rm SURFPOLL-CI-ANALYSIS.md
rm PDA-CONSISTENCY-GUIDE.md
rm devnet-deployment.md
rm mainnet-deployment.md
rm DEPLOYMENT-GUIDE.md
```

### Tarea 3: Verificar

- [ ] Información migrada correctamente a `runbooks/README.md`
- [ ] Tabla de funciones SVM agregada con ejemplos
- [ ] Sección de cambios recientes agregada
- [ ] Todos los archivos obsoletos eliminados
- [ ] `runbooks/README.md` sigue siendo la documentación principal
- [ ] No hay links rotos en otros archivos

## 📚 Referencias

- **Surfpool SVM Functions:** https://docs.surfpool.run/iac/svm/functions
- **Surfpool SVM Actions:** https://docs.surfpool.run/iac/svm/actions
- **Surfpool SVM Signers:** https://docs.surfpool.run/iac/svm/signers
- **txtx Language Syntax:** https://docs.surfpool.run/iac/language
- **Plan completo:** [`plans/refactoring-plan.md`](../refactoring-plan.md)

## 🔗 Issues Relacionados

- Issue #123: Problemas con runbooks Surfpool/txtx
- Issue #124: Inconsistencias en PDA Derivation

---

*Este issue reemplaza la documentación temporal con documentación permanente y estructurada*
```

---

## Issue: [REFACTOR Phase 1] Clean Up Obsolete Code and Scripts

```markdown
---
name: Refactoring Phase 1 - Code Cleanup
about: Remove obsolete scripts, empty directories, and dead code
title: '[REFACTOR Phase 1] Clean Up Obsolete Code and Scripts'
labels: 'enhancement, cleanup, refactoring, priority-high'
assignees: ''
---

## 📋 Descripción

Este issue cubre la eliminación de scripts obsoletos, directorios vacíos y código muerto identificado en el proyecto.

**Plan completo:** [`plans/refactoring-plan.md`](../refactoring-plan.md)

## 🎯 Objetivo

Limpiar el código del proyecto eliminando artefactos obsoletos que no forman parte del workflow actual.

## 📁 Scripts a Evaluar y Eliminar

### 1. `sc-solana/scripts/setup-keypairs.sh`

**Estado:** Obsoleto

**Razón:** Los keypairs ya están gestionados en `config/keypairs/`:
```
config/keypairs/
├── admin_new.json
├── auditor_hw.json
├── escuela.json
├── fabricante.json
├── tecnico_sw.json
```

**Verificación antes de eliminar:**
```bash
# Confirmar que los keypairs existen en config/keypairs/
ls -la config/keypairs/

# Confirmar que setup-keypairs.sh no es usado por ningún runbook
grep -r "setup-keypairs" sc-solana/runbooks/
grep -r "setup-keypairs" txtx.yml
```

**Acción:** Eliminar si no es referenciado

### 2. `sc-solana/scripts/init-config/` (Directorio Completo)

**Contenido:**
```
sc-solana/scripts/init-config/
├── Cargo.toml
└── init_config.py
```

**Estado:** No integrado en el workflow

**Razón:** 
- `init_config.py` es un script Python no integrado en el workflow de Anchor/txtx
- `Cargo.toml` es una dependencia huérfana
- La inicialización de config se hace vía `initialize-config.tx` runbook

**Verificación:**
```bash
# Confirmar que init_config.py no es usado
grep -r "init_config" sc-solana/
grep -r "init-config" txtx.yml

# Verificar que initialize-config.tx es el método actual
cat sc-solana/runbooks/01-deployment/initialize-config.tx
```

**Acción:** Eliminar directorio completo

```bash
rm -rf sc-solana/scripts/init-config/
```

### 3. `sc-solana/scripts/` (Directorio Completo si está vacío)

**Verificación:**
```bash
# Si después de eliminar init-config/, setup-keypairs.sh no queda nada
ls -la sc-solana/scripts/
```

**Acción:** Eliminar directorio si está vacío

```bash
rmdir sc-solana/scripts/
```

## 📁 Directorios Vacíos/Incompletos a Eliminar

### 1. `sc-solana/programs/sc-solana/src/utils/`

**Contenido actual:**
```
sc-solana/programs/sc-solana/src/utils/
└── mod.rs
```

**Verificación:**
```bash
# Verificar si mod.rs tiene contenido real
cat sc-solana/programs/sc-solana/src/utils/mod.rs

# Verificar si hay otros archivos
ls -la sc-solana/programs/sc-solana/src/utils/
```

**Acción:**
- Si `mod.rs` está vacío o solo tiene comentarios → Eliminar directorio
- Si tiene utilidades reales → Implementar las utilidades

### 2. `sc-solana/programs/sc-solana/src/tests/`

**Contenido actual:** Vacío

**Razón:** Los tests están en `sc-solana/tests/` (test integration de Anchor)

**Acción:** Eliminar

```bash
rm -rf sc-solana/programs/sc-solana/src/tests/
```

## 🔧 Eliminación de Dead Code

### Paso 1: Ejecutar Clippy para Identificar Dead Code Real

```bash
cd sc-solana
cargo clippy -- -W dead_code -W unused_imports
```

### Paso 2: Analizar Resultados

**Directivas `allow` actuales en [`lib.rs`](programs/sc-solana/src/lib.rs):**
```rust
#![allow(dead_code)]              // Línea 6
#![allow(unused_imports)]         // Línea 7
#![allow(ambiguous_glob_reexports)]  // Línea 8
```

### Paso 3: Eliminar Dead Code Identificado

**Ejemplo de dead code potencial a verificar:**

```rust
// En state/config.rs - Campos legacy para backward compatibility
// Verificar si aún se usan antes de eliminar

pub struct SupplyChainConfig {
    // Legacy fields - verificar uso
    pub auditor_hw_single: Option<Pubkey>,    // ¿Se usa?
    pub tecnico_sw_single: Option<Pubkey>,    // ¿Se usa?
    
    // Nuevos campos - usar estos
    pub fabricante_count: u64,
    pub auditor_hw_count: u64,
    pub tecnico_sw_count: u64,
    pub escuela_count: u64,
}
```

### Paso 4: Remover Allow Directives

**Después de eliminar dead code real:**

```rust
// lib.rs - ANTES
#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(ambiguous_glob_reexports)]

use anchor_lang::prelude::*;
// ...

// lib.rs - DESPUÉS (si ya no es necesario)
use anchor_lang::prelude::*;
// ...
```

## ✅ Checklist de Ejecución

### Scripts
- [ ] Verificar `setup-keypairs.sh` no es usado por runbooks
- [ ] Eliminar `sc-solana/scripts/setup-keypairs.sh`
- [ ] Verificar `init_config.py` no es usado
- [ ] Eliminar `sc-solana/scripts/init-config/`
- [ ] Eliminar `sc-solana/scripts/` si está vacío

### Directorios Vacíos
- [ ] Verificar `src/utils/mod.rs` contenido
- [ ] Eliminar `src/utils/` si está vacío
- [ ] Eliminar `src/tests/` (confirmado vacío)

### Dead Code
- [ ] Ejecutar `cargo clippy -- -W dead_code -W unused_imports`
- [ ] Analizar warnings
- [ ] Eliminar funciones/imports realmente no usados
- [ ] Remover `#![allow(dead_code)]` si posible
- [ ] Remover `#![allow(unused_imports)]` si posible
- [ ] Remover `#![allow(ambiguous_glob_reexports)]` si posible

### Verificación Final
- [ ] `cargo build` pasa sin warnings
- [ ] `cargo test` pasa todos los tests
- [ ] `cargo clippy` sin warnings nuevos
- [ ] No hay directorios vacíos restantes

## 📚 Referencias

- **Surfpool IaC Getting Started:** https://docs.surfpool.run/iac/getting-started
- **txtx Standard Library:** https://docs.surfpool.run/iac/std/actions
- **Plan completo:** [`plans/refactoring-plan.md`](../refactoring-plan.md)

## 🔗 Issues Relacionados

- Issue #123: Problemas con runbooks Surfpool/txtx
- Issue #124: Inconsistencias en PDA Derivation

---

*Este issue reemplaza la necesidad de mantener scripts externos no integrados*
```

---

## Issue: [REFACTOR Phase 2] Fix Program ID Inconsistency - CRITICAL P0

```markdown
---
name: Refactoring Phase 2 - Fix Program ID
about: Fix critical Program ID inconsistency across the project
title: '[REFACTOR Phase 2] Fix Program ID Inconsistency - CRITICAL P0'
labels: 'bug, critical, refactoring, priority-critical'
assignees: ''
---

## 📋 Descripción

**PROBLEMA CRÍTICO:** El Program ID del programa SupplyChainTracker es inconsistente entre archivos, lo que causará fallos en el despliegue.

**Plan completo:** [`plans/refactoring-plan.md`](../refactoring-plan.md)

## 🔴 Problema Actual

| Archivo | Program ID Actual | Línea |
|---------|-------------------|-------|
| [`lib.rs`](../sc-solana/programs/sc-solana/src/lib.rs) | `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN` | Línea 12 |
| [`deploy.sh`](../sc-solana/deploy.sh) | `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS` | Variable `$PROGRAM_ID` |
| [`ROADMAP.md`](../ROADMAP.md) | `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS` | Línea 9 |

## ✅ Program ID Correcto

El Program ID correcto es el definido en [`lib.rs`](../sc-solana/programs/sc-solana/src/lib.rs:12):

```rust
declare_id!("7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN");
```

## 📝 Tareas Específicas

### Tarea 1: Actualizar `deploy.sh`

**Archivo:** `sc-solana/deploy.sh`

**Antes:**
```bash
#!/bin/bash

PROGRAM_ID="CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS"  # ❌ INCORRECTO

# ... resto del script
```

**Después:**
```bash
#!/bin/bash

# Program ID derivado de lib.rs
# Fuente: sc-solana/programs/sc-solana/src/lib.rs:declare_id!()
PROGRAM_ID="7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN"  # ✅ CORRECTO

# Opción alternativa: Derivar automáticamente del IDL
# PROGRAM_ID=$(grep -oP 'declare_id!\("\K[^"]+' sc-solana/programs/sc-solana/src/lib.rs)
```

**Opción Recomendada (Automática):**
```bash
#!/bin/bash

# Derivar Program ID automáticamente de lib.rs
PROGRAM_ID=$(grep -oP 'declare_id!\("\K[^"]+' sc-solana/programs/sc-solana/src/lib.rs)

if [ -z "$PROGRAM_ID" ]; then
    echo "ERROR: Could not derive PROGRAM_ID from lib.rs"
    exit 1
fi

echo "Using Program ID: $PROGRAM_ID"
```

### Tarea 2: Actualizar `ROADMAP.md`

**Archivo:** `ROADMAP.md`

**Antes (Línea 9):**
```markdown
**Program ID:** `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS`
```

**Después:**
```markdown
**Program ID:** `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN`
```

### Tarea 3: Verificar Otros Archivos

**Buscar todos los usos del Program ID:**
```bash
# Buscar Program ID incorrecto
grep -r "CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS" .

# Buscar Program ID correcto
grep -r "7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN" .

# Verificar web/.env.local
cat web/.env.local | grep -i program
```

**Actualizar si es necesario:**
```bash
# web/.env.local (si existe referencia al program ID)
# ANTES:
# NEXT_PUBLIC_PROGRAM_ID=CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS
# DESPUÉS:
NEXT_PUBLIC_PROGRAM_ID=7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN
```

### Tarea 4: Verificar Runbooks

**Verificar que los runbooks usan el Program ID correcto:**

```yaml
# sc-solana/runbooks/01-deployment/deploy-program.tx
# Los runbooks deberían derivar el program ID del proyecto Anchor,
# no hardcodearlo

addon "svm" {
    network_id = "localnet"
    rpc_api_url = "http://localhost:8899"
}

# CORRECTO: Usar get_program_from_anchor_project
variable "contract" {
    value = svm::get_program_from_anchor_project("sc-solana")
}

# INCORRECTO: Hardcodear program ID
# variable "contract" {
#     value = svm::get_program_from_native_project("sc-solana", "path/to/keypair.json")
# }
```

## ✅ Checklist de Verificación

- [ ] `deploy.sh` actualizado con Program ID correcto
- [ ] `ROADMAP.md` actualizado con Program ID correcto
- [ ] `web/.env.local` verificado/actualizado si aplica
- [ ] `grep -r "CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS" .` no devuelve resultados
- [ ] `grep -r "7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN" .` encuentra el ID en todos lados
- [ ] Runbooks no hardcodean Program ID (usan `get_program_from_anchor_project`)
- [ ] `cargo build` pasa
- [ ] `anchor build` pasa

## 📚 Referencias

- **Surfpool SVM Overview:** https://docs.surfpool.run/iac/svm/overview
- **Surfpool SVM Functions - get_program_from_anchor_project:** https://docs.surfpool.run/iac/svm/functions#get_program_from_anchor_project
- **Anchor declare_id!:** https://docs.anchor-lang.com/

## 🔗 Issues Relacionados

- Issue #123: Problemas con runbooks Surfpool/txtx
- Issue #124: Inconsistencias en PDA Derivation

---

*Este issue es CRÍTICO porque un Program ID incorrecto causará fallos de despliegue*
```

---

## Issue: [REFACTOR Phase 3] Remove Dead Code and Allow Directives

```markdown
---
name: Refactoring Phase 3 - Remove Dead Code
about: Remove dead code and allow directives from the Anchor program
title: '[REFACTOR Phase 3] Remove Dead Code and Allow Directives'
labels: 'enhancement, cleanup, refactoring, priority-medium'
assignees: ''
---

## 📋 Descripción

Este issue cubre la eliminación de código muerto y las directivas `allow` que lo ocultan en el programa Anchor.

**Plan completo:** [`plans/refactoring-plan.md`](../refactoring-plan.md)

## 🎯 Objetivo

Eliminar código realmente no usado y remover las directivas `allow` que ocultan warnings de clippy.

## 🔍 Estado Actual

### Directivas `allow` en [`lib.rs`](../sc-solana/programs/sc-solana/src/lib.rs:6-8)

```rust
#![allow(dead_code)]              // Línea 6 - Oculta funciones no usadas
#![allow(unused_imports)]         // Línea 7 - Oculta imports no usados
#![allow(ambiguous_glob_reexports)]  // Línea 8 - Oculta re-exports ambiguos
```

## 📝 Tareas Específicas

### Tarea 1: Ejecutar Clippy para Identificar Dead Code Real

```bash
cd sc-solana
cargo clippy -- -W dead_code -W unused_imports -W ambiguous_glob_reexports
```

### Tarea 2: Analizar Resultados de Clippy

**Ejemplo de output esperado:**
```
warning: function `some_function` is never used
  --> programs/sc-solana/src/some_module.rs:10:8
   |
10 |     pub fn some_function() {
   |        ^^^^^^^^^^^^^^^^
   |
   = note: `#[warn(dead_code)]` on by default

warning: unused import: `some_import`
  --> programs/sc-solana/src/lib.rs:15:5
   |
15 | use some_import;
   |     ^^^^^^^^^^^
```

### Tarea 3: Eliminar Dead Code Identificado

**Ejemplo: Funciones no usadas en instructions**

```rust
// VERIFICAR: ¿Se usa esta función?
// Si NO se usa, eliminarla

// programs/sc-solana/src/instructions/some_module.rs
// ANTES:
pub fn unused_instruction(ctx: Context<SomeContext>) -> Result<()> {
    // Código no usado
}

// DESPUÉS:
// Eliminar la función completa
```

**Ejemplo: Imports no usados**

```rust
// programs/sc-solana/src/lib.rs
// ANTES:
use anchor_lang::prelude::*;
use some_unused_crate;  // ❌ No usado
use another_unused;     // ❌ No usado

// DESPUÉS:
use anchor_lang::prelude::*;
// Eliminar imports no usados
```

### Tarea 4: Verificar Campos Legacy en State

**Archivo:** [`state/config.rs`](../sc-solana/programs/sc-solana/src/state/config.rs)

**Verificar campos legacy:**
```rust
pub struct SupplyChainConfig {
    // Campos legacy - verificar si se usan
    pub auditor_hw_single: Option<Pubkey>,    // ¿Se usa en algún instruction?
    pub tecnico_sw_single: Option<Pubkey>,    // ¿Se usa en algún instruction?
    
    // Campos nuevos - usar estos
    pub fabricante: Pubkey,
    pub auditor_hw: Pubkey,
    pub tecnico_sw: Pubkey,
    pub escuela: Pubkey,
    pub fabricante_count: u64,
    pub auditor_hw_count: u64,
    pub tecnico_sw_count: u64,
    pub escuela_count: u64,
}
```

**Si los campos legacy NO se usan:**
```rust
// MARCAR como deprecated si se mantienen por compatibilidad
#[deprecated(note = "Use auditor_hw_count and auditor_hw fields instead")]
pub auditor_hw_single: Option<Pubkey>,

// O eliminar completamente si no hay backward compatibility requerida
```

### Tarea 5: Remover Allow Directives

**Después de eliminar dead code real:**

```rust
// sc-solana/programs/sc-solana/src/lib.rs
// ANTES:
#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(ambiguous_glob_reexports)]

use anchor_lang::prelude::*;
// ...

// DESPUÉS (si ya no hay dead code):
// Eliminar las tres líneas de allow
use anchor_lang::prelude::*;
// ...
```

**Si algunos `allow` aún son necesarios:**
```rust
// Mantener solo si hay razón válida
// Ejemplo: funciones usadas vía reflection o macros

#![allow(ambiguous_glob_reexports)]  // Necesario si hay re-exports conflictivos

// Eliminar si ya no son necesarios
// #![allow(dead_code)]
// #![allow(unused_imports)]
```

## ✅ Checklist de Verificación

### Clippy
- [ ] Ejecutar `cargo clippy -- -W dead_code -W unused_imports`
- [ ] Analizar todos los warnings
- [ ] Documentar dead code encontrado

### Eliminación
- [ ] Eliminar funciones no usadas
- [ ] Eliminar imports no usados
- [ ] Marcar/eliminar campos legacy no usados
- [ ] Remover `#![allow(dead_code)]` si posible
- [ ] Remover `#![allow(unused_imports)]` si posible
- [ ] Remover `#![allow(ambiguous_glob_reexports)]` si posible

### Build y Tests
- [ ] `cargo build` pasa sin warnings
- [ ] `cargo test` pasa todos los tests
- [ ] `cargo clippy` sin warnings de dead_code
- [ ] `cargo clippy` sin warnings de unused_imports
- [ ] `anchor build` pasa

## 📚 Referencias

- **Clippy Lints:** https://doc.rust-lang.org/clippy/lints.html
- **Rust Dead Code:** https://doc.rust-lang.org/reference/visibility-and-ownership.html
- **Surfpool SVM Overview:** https://docs.surfpool.run/iac/svm/overview

## 🔗 Issues Relacionados

- Issue #123: Problemas con runbooks Surfpool/txtx

---

*Este issue mejora la calidad del código y facilita el mantenimiento futuro*
```

---

## Issue: [REFACTOR Phase 4] Verify Consistency with Surfpool/txtx IAC

```markdown
---
name: Refactoring Phase 4 - Surfpool/txtx Consistency
about: Verify and ensure consistency with Surfpool and txtx IAC documentation
title: '[REFACTOR Phase 4] Verify Consistency with Surfpool/txtx IAC Documentation'
labels: 'enhancement, documentation, refactoring, priority-medium'
assignees: ''
---

## 📋 Descripción

Este issue cubre la verificación y aseguramiento de consistencia entre los runbooks del proyecto y la documentación oficial de Surfpool/txtx.

**Plan completo:** [`plans/refactoring-plan.md`](../refactoring-plan.md)

## 🎯 Objetivo

Asegurar que todos los runbooks siguen las mejores prácticas y funciones documentadas en Surfpool/txtx.

## 📚 Referencias de Documentación

- **Surfpool SVM Overview:** https://docs.surfpool.run/iac/svm/overview
- **Surfpool SVM Functions:** https://docs.surfpool.run/iac/svm/functions
- **Surfpool SVM Actions:** https://docs.surfpool.run/iac/svm/actions
- **Surfpool SVM Signers:** https://docs.surfpool.run/iac/svm/signers
- **txtx Language Syntax:** https://docs.surfpool.run/iac/language
- **Surfpool Getting Started:** https://docs.surfpool.run/toolchain/getting-started

## ✅ Funciones SVM Disponibles (Confirmadas)

### Funciones de PDA
```yaml
# svm::find_pda - Encuentra PDA válida usando program id y seeds
variable "pda" {
    value = svm::find_pda("program_id_here", ["seed1", "seed2"])
}

output "pda_address" {
    value = std::encode_base58(variable.pda.pda)
}

output "bump_seed" {
    value = variable.pda.bump_seed
}
```

### Funciones de Programa
```yaml
# svm::get_program_from_anchor_project - Obtiene artifacts del programa
variable "contract" {
    value = svm::get_program_from_anchor_project("sc-solana")
}

output "idl" {
    value = variable.contract.idl
}

output "keypair_path" {
    value = variable.contract.keypair
}

output "bin_path" {
    value = variable.contract.bin
}
```

### Funciones de Sistema
```yaml
# svm::system_program_id - Retorna ID del sistema program
output "system_program" {
    value = svm::system_program_id()
}
// Output: 11111111111111111111111111111111

# svm::default_pubkey - Retorna pubkey por defecto (cero)
output "default" {
    value = svm::default_pubkey()
}
// Output: 11111111111111111111111111111111
```

### Conversión de Unidades
```yaml
# svm::sol_to_lamports - Convierte SOL a lamports
output "lamports" {
    value = svm::sol_to_lamports(5.0)
}
// Output: 5000000000

# svm::lamports_to_sol - Convierte lamports a SOL
output "sol" {
    value = svm::lamports_to_sol(5000000000)
}
// Output: 5.0
```

### Tipos para Seeds
```yaml
# svm::u64 - Crea byte array u64 para seeds de PDA
variable "pda_with_u64" {
    value = svm::find_pda("program_id", [svm::u64(1000000000)])
}

# svm::i64 - Crea byte array i64 para seeds de PDA
variable "pda_with_i64" {
    value = svm::find_pda("program_id", [svm::i64(-1000000000)])
}
```

### Token Operations
```yaml
# svm::get_associated_token_account - Calcula dirección ATA
variable "token_account" {
    value = svm::get_associated_token_account(signer.caller.address, "So11111111111111111111111111111111111111112")
}

# svm::create_token_account_instruction - Crea instruction para crear ATA
action "create_token" "svm::process_instructions" {
    signers = [signer.caller]
    
    instruction {
        raw_bytes = svm::create_token_account_instruction(
            signer.caller.address,  // funding address
            signer.caller.address,  // wallet address
            variable.token_mint,    // token mint address
            variable.token_program  // token program id
        )
    }
}
```

### Instruction Data from IDL
```yaml
# svm::get_instruction_data_from_idl_path - Crea encoded instruction data
# Usar cuando se tiene el path al archivo IDL
action "call_instruction" "svm::process_instructions" {
    signers = [signer.admin]
    
    instruction {
        program_id = variable.contract.program_id
        accounts = [/* accounts list */]
        data = svm::get_instruction_data_from_idl_path(
            "path/to/idl.json",    # relativo a txtx.yml
            "initialize",           # nombre de la instruction
            ["arg1", "arg2"]        # argumentos opcionales
        )
    }
}

# svm::get_instruction_data_from_idl - Crea encoded instruction data
# Usar cuando se tiene el IDL como variable
action "call_instruction" "svm::process_instructions" {
    signers = [signer.admin]
    
    instruction {
        program_id = variable.contract.program_id
        accounts = [/* accounts list */]
        data = svm::get_instruction_data_from_idl(
            variable.contract.idl,  # variable con el IDL
            "initialize",           # nombre de la instruction
            ["arg1", "arg2"]        # argumentos opcionales
        )
    }
}
```

## ❌ Funciones NO Disponibles

```yaml
# svm::send_token - NO está documentada en Surfpool
# NO USAR esta función

# CORRECTO: Usar system program transfer para enviar SOL
action "transfer" "svm::process_instructions" {
    signers = [signer.admin]
    
    instruction {
        program_id = svm::system_program_id()
        accounts = [
            { pubkey = signer.admin.address, is_signer = true, is_writable = true },
            { pubkey = recipient.address, is_signer = false, is_writable = true }
        ]
        data = svm::u64(svm::sol_to_lamports(5))
    }
}
```

## 📝 Tareas Específicas

### Tarea 1: Verificar Todos los Runbooks

**Verificar cada runbook contra la documentación:**

```bash
# Lista todos los runbooks
find sc-solana/runbooks -name "*.tx" -type f

# Verificar cada uno
for file in sc-solana/runbooks/**/*.tx; do
    echo "Checking: $file"
    # Verificar que no usa svm::send_token
    grep -n "svm::send_token" "$file" && echo "❌ FOUND svm::send_token in $file"
    # Verificar que usa env.* en lugar de input.*
    grep -n "input\." "$file" && echo "⚠️ FOUND input. in $file"
    # Verificar uso seguro de signatures
    grep -n "signatures\[0\]" "$file" && echo "⚠️ FOUND signatures[0] in $file"
done
```

### Tarea 2: Corregir Inconsistencias Encontradas

**Ejemplo de corrección en runbook:**

```yaml
# ANTES (incorrecto):
action "transfer" "svm::send_token" {
    from = signer.admin
    to = signer.auditor
    amount = 5
}

# DESPUÉS (correcto):
action "transfer" "svm::process_instructions" {
    signers = [signer.admin]
    
    instruction {
        program_id = svm::system_program_id()
        accounts = [
            { pubkey = signer.admin.address, is_signer = true, is_writable = true },
            { pubkey = signer.auditor.address, is_signer = false, is_writable = true }
        ]
        data = svm::u64(svm::sol_to_lamports(5))
    }
}
```

### Tarea 3: Agregar Comentarios Explicativos

**Ejemplo de documentación inline en runbooks:**

```yaml
# deploy-program.tx
# ============================================================================
# Deploy SupplyChainTracker program to network
# ============================================================================
# 
# This runbook uses:
# - svm::get_program_from_anchor_project to retrieve program artifacts
# - svm::find_pda for PDA derivation consistency
# - svm::system_program_id for system program operations
#
# Reference: https://docs.surfpool.run/iac/svm/overview
# ============================================================================

addon "svm" {
    description = "Solana Virtual Machine addon for program deployment"
    network_id = "${NETWORK_ID}"
    rpc_api_url = "${RPC_API_URL}"
}

variable "contract" {
    # Get program artifacts from Anchor project
    # Reference: https://docs.surfpool.run/iac/svm/functions#get_program_from_anchor_project
    value = svm::get_program_from_anchor_project("sc-solana")
}
```

### Tarea 4: Actualizar README.md de Runbooks

**Agregar sección de referencia rápida:**

```markdown
## Quick Reference: SVM Functions

### PDA Derivation
```yaml
variable "pda" {
    value = svm::find_pda("program_id", ["seed1", "seed2"])
}
```

### Program Deployment
```yaml
variable "contract" {
    value = svm::get_program_from_anchor_project("program_name")
}
```

### SOL Transfer (System Program)
```yaml
action "transfer" "svm::process_instructions" {
    signers = [signer.admin]
    instruction {
        program_id = svm::system_program_id()
        accounts = [
            { pubkey = signer.admin.address, is_signer = true, is_writable = true },
            { pubkey = recipient.address, is_signer = false, is_writable = true }
        ]
        data = svm::u64(svm::sol_to_lamports(5))
    }
}
```

### Instruction Data from IDL
```yaml
instruction {
    data = svm::get_instruction_data_from_idl_path(
        "path/to/idl.json",
        "instruction_name",
        ["arg1", "arg2"]
    )
}
```

## ⚠️ NOT Available
- `svm::send_token` - Use system program transfer instead
```

## ✅ Checklist de Verificación

### Runbooks
- [ ] Ningún runbook usa `svm::send_token`
- [ ] Ningún runbook usa `input.*` (usar `env.*`)
- [ ] Queries usan `signatures | first()` en lugar de `signatures[0]`
- [ ] PDAs usan `svm::find_pda` consistentemente
- [ ] Program deployment usa `svm::get_program_from_anchor_project`
- [ ] Todos los runbooks tienen comentarios explicativos

### Documentación
- [ ] `runbooks/README.md` tiene sección de referencia SVM
- [ ] Funciones disponibles documentadas con ejemplos
- [ ] Funciones NO disponibles documentadas con alternativas
- [ ] Links a documentación oficial incluidos

### Build y Test
- [ ] Runbooks pasan validación de syntax txtx
- [ ] Runbooks se ejecutan correctamente con surfpool

## 📚 Referencias

- **Surfpool SVM Overview:** https://docs.surfpool.run/iac/svm/overview
- **Surfpool SVM Functions:** https://docs.surfpool.run/iac/svm/functions
- **Surfpool SVM Actions:** https://docs.surfpool.run/iac/svm/actions
- **Surfpool SVM Signers:** https://docs.surfpool.run/iac/svm/signers
- **txtx Language Syntax:** https://docs.surfpool.run/iac/language

## 🔗 Issues Relacionados

- Issue #123: Problemas con runbooks Surfpool/txtx
- Issue #124: Inconsistencias en PDA Derivation

---

*Este issue asegura que el proyecto sigue las mejores prácticas de Surfpool/txtx*
```

---

## Issue: [REFACTOR Phase 5] Update Documentation and Create CHANGELOG

```markdown
---
name: Refactoring Phase 5 - Documentation Update
about: Update all documentation and create CHANGELOG
title: '[REFACTOR Phase 5] Update Documentation and Create CHANGELOG'
labels: 'enhancement, documentation, refactoring, priority-low'
assignees: ''
---

## 📋 Descripción

Este issue cubre la actualización de toda la documentación del proyecto y la creación de un CHANGELOG para trackear cambios.

**Plan completo:** [`plans/refactoring-plan.md`](../refactoring-plan.md)

## 🎯 Objetivo

Asegurar que toda la documentación refleja el estado actual del proyecto después de la refactorización.

## 📝 Tareas Específicas

### Tarea 1: Crear CHANGELOG.md

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive refactoring plan in `plans/refactoring-plan.md`
- GitHub issue templates for refactoring phases in `plans/github-issue-refactoring-roadmap.md`

## [0.2.0] - 2026-05-07

### Changed
- **Documentation Cleanup**: Removed obsolete summary files from `runbooks/`
  - Removed `CHANGES-123-SUMMARY.md` (consolidated into CHANGELOG)
  - Removed `ISSUE-124-FIXES-SUMMARY.md` (consolidated into CHANGELOG)
  - Removed `SURFPOLL-CI-ANALYSIS.md` (external references documented)
  - Removed `PDA-CONSISTENCY-GUIDE.md` (integrated into runbooks)
  - Removed `devnet-deployment.md` (duplicated in runbooks)
  - Removed `mainnet-deployment.md` (duplicated in runbooks)
  - Removed `DEPLOYMENT-GUIDE.md` (duplicated in README)

### Fixed
- **Program ID Consistency**: Updated `deploy.sh` and `ROADMAP.md` to use correct Program ID
  - Old: `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS`
  - New: `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN`
  
- **Runbook Consistency** (Issues #123, #124):
  - Replaced `svm::send_token` with system program transfer in `setup-test-env.tx`
  - Replaced `input.*` with `env.*` in `transfer-admin.tx`
  - Fixed signature access in query runbooks to use `signatures | first()`
  - Verified PDA derivation consistency across all runbooks

### Deprecated
- Legacy single-role fields in `SupplyChainConfig` (use multi-holder pattern)
  - `auditor_hw_single` → Use `auditor_hw` + `auditor_hw_count`
  - `tecnico_sw_single` → Use `tecnico_sw` + `tecnico_sw_count`

### Removed
- Obsolete scripts: `sc-solana/scripts/setup-keypairs.sh`
- Obsolete scripts: `sc-solana/scripts/init-config/`
- Empty directories: `sc-solana/programs/sc-solana/src/tests/`
- Empty directories: `sc-solana/programs/sc-solana/src/utils/` (if empty)

### Added
- SVM Functions reference table in `runbooks/README.md`
- Known Issues & Solutions section in `runbooks/README.md`
- Refactoring plan with detailed phases in `plans/`

## [0.1.0] - Previous Release

### Added
- Initial Anchor program structure
- Frontend migration to Solana
- Basic test suite
- CI/CD pipeline
```

### Tarea 2: Actualizar README.md (Raíz)

**Agregar sección de estado actual:**
```markdown
## Current Status

| Component | Status | Completion |
|-----------|--------|------------|
| Smart Contract (sc-solana) | Modularized, Core Complete | ~95% |
| Frontend (web/) | Solana Migrated (Partial) | ~85% |
| Testing | Basic Unit Tests Only | ~20% |
| Documentation | Updated | ~80% |
| Runbooks (txtx) | Consistent with Surfpool | ~90% |

## Refactoring Status

**Active Refactoring:** [Link to Phase 0 issue]

See [`plans/refactoring-plan.md`](plans/refactoring-plan.md) for details.
```

### Tarea 3: Actualizar ROADMAP.md

**Actualizar Program ID:**
```markdown
**Program ID:** `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN`
```

**Actualizar estado de issues:**
```markdown
| Issue | Status | Notes |
|-------|--------|-------|
| #123 | ✅ Resuelto | Runbooks actualizados con funciones SVM correctas |
| #124 | ✅ Resuelto | PDA derivation consistente en todos los runbooks |
```

### Tarea 4: Actualizar runbooks/README.md

**Agregar sección de referencia SVM:**
```markdown
## SVM Functions Reference

(Ver template en Phase 4 issue)
```

## ✅ Checklist de Verificación

- [ ] `CHANGELOG.md` creado con todos los cambios
- [ ] `README.md` (raíz) actualizado con estado actual
- [ ] `ROADMAP.md` actualizado con Program ID correcto
- [ ] `runbooks/README.md` actualizado con referencia SVM
- [ ] `sc-solana/README.md` verificado/actualizado
- [ ] `sc-solana/tests/README.md` verificado/actualizado
- [ ] No hay links rotos en la documentación
- [ ] Formato de markdown consistente

## 📚 Referencias

- **Keep a Changelog:** https://keepachangelog.com/en/1.1.0/
- **Semantic Versioning:** https://semver.org/spec/v2.0.0.html

## 🔗 Issues Relacionados

- Todos los issues de refactorización anteriores

---

*Este issue asegura que la documentación refleja el estado final del proyecto*
```

---

## Template de Cierre para Issues Obsoletos

```markdown
## CIERRE: Issue reemplazado por Refactoring Roadmap

**Motivo del cierre:** Este issue ha sido reemplazado por el nuevo roadmap de refactorización estructurado en fases.

### Issues que reemplazan este:

| Fase | Issue | Descripción |
|------|-------|-------------|
| Phase 0 | [REFACTOR Phase 0] Cleanup Obsolete Documentation | Limpieza de documentación obsoleta |
| Phase 1 | [REFACTOR Phase 1] Clean Up Obsolete Code | Limpieza de código y scripts obsoletos |
| Phase 2 | [REFACTOR Phase 2] Fix Program ID Inconsistency | Corrección de Program ID |
| Phase 3 | [REFACTOR Phase 3] Remove Dead Code | Eliminación de dead code |
| Phase 4 | [REFACTOR Phase 4] Surfpool/txtx Consistency | Verificación de consistencia IAC |
| Phase 5 | [REFACTOR Phase 5] Update Documentation | Actualización de documentación |

### Plan Completo

Ver [`plans/refactoring-plan.md`](plans/refactoring-plan.md) para el plan detallado.

### Templates de Issues

Ver [`plans/github-issue-refactoring-roadmap.md`](plans/github-issue-refactoring-roadmap.md) para los templates de los nuevos issues.

---

*Issue cerrado el 2026-05-07 como parte del roadmap de refactorización*
```
