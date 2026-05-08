# Issue Template: [Phase 0] Complete Refactoring Roadmap

```markdown
---
name: Refactoring Roadmap
about: Complete refactoring plan for SupplyChainTracker-solana
title: '[REFACTOR] [Phase 0] Complete Refactoring Roadmap - Cleanup, Consistency, and Optimization'
labels: 'enhancement, refactoring, priority-high'
assignees: ''
---

## 📋 Descripción

Este issue cubre la refactorización completa del proyecto SupplyChainTracker-solana, incluyendo:
- Limpieza de código obsoleto y scripts innecesarios
- Eliminación de archivos markdown irrelevantes/duplicados
- Corrección de inconsistencias críticas (Program ID, dead code)
- Consolidación de documentación
- Verificación de consistencia con Surfpool y txtx

**Plan completo:** [`plans/refactoring-plan.md`](plans/refactoring-plan.md)

## 🔍 Problemas Identificados

### Críticos (P0)
- [ ] Program ID inconsistente entre `deploy.sh` y `lib.rs`
  - `deploy.sh` usa: `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS`
  - `lib.rs` usa: `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN`

### Altos (P1)
- [ ] `#![allow(dead_code)]` en lib.rs indica código muerto
- [ ] 7+ archivos markdown duplicados/irrelevantes en `runbooks/`
- [ ] Directorios vacíos: `utils/`, `tests/` en programa

### Medios (P2)
- [ ] Scripts obsoletos en `sc-solana/scripts/`
- [ ] Campos legacy en `SupplyChainConfig` sin marcar como deprecated

## 📝 Tareas de Limpieza de Documentación

### Archivos a Eliminar
```
runbooks/CHANGES-123-SUMMARY.md
runbooks/ISSUE-124-FIXES-SUMMARY.md
runbooks/SURFPOLL-CI-ANALYSIS.md
runbooks/PDA-CONSISTENCY-GUIDE.md
runbooks/devnet-deployment.md
runbooks/mainnet-deployment.md
runbooks/DEPLOYMENT-GUIDE.md
```

### Archivos a Consolidar
- Información de `CHANGES-123-SUMMARY.md` → `CHANGELOG.md`
- Información de `ISSUE-124-FIXES-SUMMARY.md` → `CHANGELOG.md`
- Información de `SURFPOLL-CI-ANALYSIS.md` → `runbooks/README.md` (sección Known Issues)

### Archivos a Mantener
```
runbooks/README.md          # Documentación principal de runbooks
ROADMAP.md                  # Hoja de ruta del proyecto
AGENTS.md                   # Instrucciones para agentes AI
README.md (raíz)            # Documentación principal
sc-solana/README.md         # Documentación del programa
sc-solana/tests/README.md   # Documentación de tests
```

## 📝 Tareas de Limpieza de Código

### Scripts a Evaluar
| Script | Ubicación | Recomendación |
|--------|-----------|---------------|
| `setup-keypairs.sh` | `sc-solana/scripts/` | Eliminar si keypairs están en `config/keypairs/` |
| `init_config.py` | `sc-solana/scripts/init-config/` | Eliminar o integrar |
| `Cargo.toml` | `sc-solana/scripts/init-config/` | Eliminar con el script |

### Directorios a Evaluar
| Directorio | Contenido | Recomendación |
|------------|-----------|---------------|
| `src/utils/` | Solo `mod.rs` | Eliminar si no hay utilidades |
| `src/tests/` | Vacío | Eliminar (tests están en `sc-solana/tests/`) |

## 🔧 Corrección de Inconsistencias

### Program ID (P0)
```bash
# 1. Verificar Program ID correcto en lib.rs
grep "declare_id" sc-solana/programs/sc-solana/src/lib.rs

# 2. Actualizar deploy.sh con el ID correcto
# 3. Actualizar ROADMAP.md con el ID correcto
# 4. Verificar web/.env.local
```

### Dead Code (P1)
```bash
# 1. Ejecutar clippy para identificar dead code real
cd sc-solana && cargo clippy -- -W dead_code

# 2. Eliminar código realmente no usado
# 3. Remover #![allow(dead_code)] si ya no es necesario
# 4. Remover #![allow(unused_imports)] si ya no es necesario
```

## ✅ Criterios de Aceptación

### Build y Tests
- [ ] `cd sc-solana && cargo build` pasa sin warnings
- [ ] `cd sc-solana && cargo test` pasa todos los tests
- [ ] `cd sc-solana && anchor build` éxito
- [ ] `cargo clippy` sin warnings de dead_code
- [ ] `cd web && yarn build` éxito
- [ ] `cd web && yarn test` pasa todos

### Limpieza
- [ ] Archivos markdown irrelevantes eliminados
- [ ] Scripts obsoletos eliminados
- [ ] Directorios vacíos eliminados
- [ ] Dead code eliminado
- [ ] Allow directives removidos si posibles

### Consistencia
- [ ] Program ID consistente en todos los archivos
- [ ] Campos legacy marcados como deprecated
- [ ] ROADMAP.md actualizado con estado correcto

### Documentación
- [ ] CHANGELOG.md creado con cambios relevantes
- [ ] README.md actualizado
- [ ] runbooks/README.md actualizado con funciones SVM

## 🔗 Issues Relacionados

- Issue #123: Problemas con runbooks Surfpool/txtx
- Issue #124: Inconsistencias en PDA Derivation y System Program Transfer
- Issue #9: Testing Framework Setup
- Issue #10: Integration Tests
- Issue #11: Security Tests

## 📊 Estimación

| Fase | Esfuerzo |
|------|----------|
| Phase 0: Preparación | 30 min |
| Phase 1: Limpieza Documentación | 1 hora |
| Phase 2: Limpieza Código | 2 horas |
| Phase 3: Corrección Inconsistencias | 1 hora |
| Phase 4: Verificación | 2 horas |
| Phase 5: Documentación Final | 1 hora |
| **Total** | **~7.5 horas** |

## 📋 Sub-issues Sugeridos

Para mayor trazabilidad, este issue puede dividirse en:

1. **[REFACTOR] [Phase 1] Limpieza de Documentación** - P1
2. **[REFACTOR] [Phase 2] Limpieza de Código** - P1
3. **[REFACTOR] [Phase 3] Corrección de Inconsistencias** - P0
4. **[REFACTOR] [Phase 4] Verificación y Tests** - P0
5. **[REFACTOR] [Phase 5] Documentación Final** - P2

---

*Este issue fue creado como parte del análisis completo del proyecto SupplyChainTracker-solana*
*Fecha: 2026-05-07*
*Plan detallado: plans/refactoring-plan.md*
```

---

## Issue Template Adicional: Sub-issue para Limpieza de Documentación

```markdown
---
name: Refactoring - Documentation Cleanup
about: Clean up obsolete and duplicate documentation files
title: '[REFACTOR] [Phase 1] Documentation Cleanup - Remove Obsolete MD Files'
labels: 'enhancement, documentation, refactoring'
assignees: ''
---

## Tareas

### Eliminar Archivos
- [ ] `runbooks/CHANGES-123-SUMMARY.md`
- [ ] `runbooks/ISSUE-124-FIXES-SUMMARY.md`
- [ ] `runbooks/SURFPOLL-CI-ANALYSIS.md`
- [ ] `runbooks/PDA-CONSISTENCY-GUIDE.md`
- [ ] `runbooks/devnet-deployment.md`
- [ ] `runbooks/mainnet-deployment.md`
- [ ] `runbooks/DEPLOYMENT-GUIDE.md`

### Consolidar Información
- [ ] Crear `CHANGELOG.md` con resúmenes relevantes
- [ ] Actualizar `runbooks/README.md` con sección Known Issues
- [ ] Actualizar `runbooks/README.md` con tabla de funciones SVM

### Verificar
- [ ] No se pierde información crítica
- [ ] Links actualizados si es necesario
- [ ] Build sigue funcionando
```

---

## Issue Template Adicional: Sub-issue para Corrección Program ID

```markdown
---
name: Refactoring - Fix Program ID
about: Fix Program ID inconsistency across the project
title: '[REFACTOR] [Phase 3] Fix Program ID Inconsistency - P0 Critical'
labels: 'bug, critical, refactoring'
assignees: ''
---

## Problema

El Program ID es inconsistente entre archivos:

| Archivo | Program ID Actual |
|---------|-------------------|
| `lib.rs` | `7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN` |
| `deploy.sh` | `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS` |
| `ROADMAP.md` | `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS` |

## Solución

1. Determinar el Program ID correcto (debería ser el de `lib.rs`)
2. Actualizar todos los archivos con el ID correcto
3. O mejor: derivar el ID automáticamente desde el IDL

### Archivos a Actualizar
- [ ] `sc-solana/deploy.sh`
- [ ] `ROADMAP.md`
- [ ] `sc-solana/README.md` (si aplica)
- [ ] `web/.env.local` (si aplica)
- [ ] Cualquier archivo de configuración de despliegue

## Verificación
- [ ] `grep -r "CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS" .` no devuelve resultados
- [ ] `grep -r "7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN" .` encuentra el ID correcto en todos lados
```

---

## Issue Template Adicional: Sub-issue para Dead Code

```markdown
---
name: Refactoring - Remove Dead Code
about: Remove dead code and allow directives
title: '[REFACTOR] [Phase 2] Remove Dead Code and Allow Directives'
labels: 'enhancement, cleanup, refactoring'
assignees: ''
---

## Problema

`lib.rs` tiene los siguientes allow directives que cubren código potencialmente muerto:

```rust
#![allow(dead_code)]        // Línea 6
#![allow(unused_imports)]   // Línea 7
#![allow(ambiguous_glob_reexports)]  // Línea 8
```

## Tareas

### 1. Identificar Dead Code
```bash
cd sc-solana && cargo clippy -- -W dead_code
cd sc-solana && cargo clippy -- -W unused_imports
```

### 2. Eliminar Código Muerto
- [ ] Funciones no usadas en `instructions/`
- [ ] Imports no usados en `lib.rs`
- [ ] Constantes dead en state files

### 3. Remover Allow Directives
- [ ] Remover `#![allow(dead_code)]` si ya no es necesario
- [ ] Remover `#![allow(unused_imports)]` si ya no es necesario
- [ ] Remover `#![allow(ambiguous_glob_reexports)]` si ya no es necesario

### 4. Verificar
- [ ] `cargo build` pasa sin warnings
- [ ] `cargo test` pasa todos los tests
- [ ] `cargo clippy` sin warnings nuevos
```

---

*Templates creados para facilitar la creación de issues en GitHub*
*Fecha: 2026-05-07*
