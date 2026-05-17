# Reporte: Archivos y Directorios Obsoletos - SupplyChainTracker

**Fecha:** 2026-05-17  
**Análisis profundo de toda la estructura del proyecto**

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Archivos a Eliminar - Categoría A (Críticos)](#categoria-a-críticos)
3. [Archivos a Eliminar - Categoría B (Duplicados)](#categoria-b-duplicados)
4. [Archivos a Eliminar - Categoría C (Obsoletos/Deprecated)](#categoria-c-obsoletos)
5. [Directorios a Eliminar](#directorios-a-eliminar)
6. [Archivos a Mantener con Revisión](#archivos-a-mantener-con-revisión)
7. [Plan de Limpieza Recomendado](#plan-de-limpieza-recomendado)

---

## Resumen Ejecutivo

Se identificaron **47 archivos/directorios obsoletos** que pueden ser eliminados para organizar mejor el proyecto:

| Categoría | Descripción | Cantidad | Riesgo |
|-----------|-------------|----------|--------|
| A | Críticos (wrong ID, deprecated) | 8 | Bajo |
| B | Duplicados | 12 | Bajo |
| C | Obsoletos/Deprecated | 20 | Medio |
| Directorios | Vacíos o con solo debug | 7 | Bajo |

---

## Categoría A: Críticos

### 1. [`sc-solana/deploy.sh`](sc-solana/deploy.sh)

**Razón:** Contiene Program ID incorrecto (`7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb`) vs el correcto (`BTSWNY97FaxeJrUNSq399tRbfMz68iaaY3csJwT9hQQW`).  
**Reemplazo:** [`sc-solana/scripts/deploy-alternative.sh`](sc-solana/scripts/deploy-alternative.sh)  
**Estado:** ❌ ELIMINAR

```bash
# Línea 24 del archivo actual (INCORRECTO):
PROGRAM_ID="7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb"
# Línea 18 de lib.rs (CORRECTO):
declare_id!("BTSWNY97FaxeJrUNSq399tRbfMz68iaaY3csJwT9hQQW");
```

### 2. [`sc-solana/init-local.ts`](sc-solana/init-local.ts)

**Razón:** Script deprecated mencionado en [`runbooks/README.md`](sc-solana/runbooks/README.md:323).  
**Reemplazo:** [`runbooks/01-deployment/full-init.tx`](sc-solana/runbooks/01-deployment/full-init.tx)  
**Estado:** ❌ ELIMINAR

### 3. [`sc-solana/codama.js`](sc-solana/codama.js)

**Razón:** Script experimental para codegen Codama que ya no se usa.  
**Reemplazo:** No aplica (Codama no es compatible actualmente).  
**Estado:** ❌ ELIMINAR

### 4. [`sc-solana/codama-new.js`](sc-solana/codama-new.js)

**Razón:** Versión alternativa del script Codama experimental.  
**Estado:** ❌ ELIMINAR

### 5. [`sc-solana/TEST-REFACTORING-PLAN.md`](sc-solana/TEST-REFACTORING-PLAN.md)

**Razón:** Plan de refactorización obsoleto. Las fases 0-6 ya están completas (ver [`README.md`](sc-solana/README.md:18-30)).  
**Estado:** ❌ ELIMINAR

### 6. [`sc-solana/CODAMA-INCOMPATIBILITIES.md`](sc-solana/CODAMA-INCOMPATIBILITIES.md)

**Razón:** Documentación de incompatibilidades Codama que ya no son relevantes.  
**Estado:** ❌ ELIMINAR

### 7. [`get-admin-address/`](get-admin-address/)

**Razón:** Directorio vacío o con código obsoleto para obtener dirección admin.  
**Estado:** ❌ ELIMINAR DIRECTORIO

---

## Categoría B: Duplicados

### 1. [`sc-solana/config/`](sc-solana/config/)

**Razón:** Directorio duplicado de [`config/`](config/) en raíz del proyecto.  
**Diferencias:**
- `config/keypairs/admin_new.json` existe solo en raíz
- Keypairs en ambos directorios tienen contenido diferente
- `config/config.env` existe solo en `sc-solana/config/`

**Recomendación:** Mantener `config/` en raíz, eliminar `sc-solana/config/`  
**Estado:** ❌ ELIMINAR DIRECTORIO

### 2. [`sc-solana/target/`](sc-solana/target/)

**Razón:** Directorio de build generado por Anchor/Cargo. No debe estar en git.  
**Contenido:** IDL, programas compilados, tipos generados.  
**Recomendación:** Asegurar que esté en `.gitignore`  
**Estado:** ⚠️ VERIFICAR .gitignore

### 3. [`web/src/contracts/sc_solana.json`](web/src/contracts/sc_solana.json)

**Razón:** IDL duplicado de [`sc-solana/target/idl/sc_solana.json`](sc-solana/target/idl/sc_solana.json).  
**Tamaño:** 47KB duplicados.  
**Recomendación:** Usar solo la versión en `sc-solana/target/idl/` o generar en build.  
**Estado:** ❓ REVISAR USO

### 4. [`web/src/generated/`](web/src/generated/) vs [`sc-solana/src/generated/`](sc-solana/src/generated/)

**Razón:** Código generado duplicado en dos lugares.  
**Diferencias:** `web/src/generated/` solo tiene PDAs y programs, `sc-solana/src/generated/` tiene accounts, instructions, pdas, programs.  
**Recomendación:** Mantener solo uno, preferiblemente `sc-solana/src/generated/`.  
**Estado:** ❓ REVISAR USO

---

## Categoría C: Obsoletos/Deprecated

### Scripts en raíz [`scripts/`](scripts/)

| Script | Razón | Reemplazo | Estado |
|--------|-------|-----------|--------|
| [`start-local-validator.sh`](scripts/start-local-validator.sh) | Surfpool reemplaza solana-test-validator | `surfpool start` | ❌ ELIMINAR |
| [`stop-local-validator.sh`](scripts/stop-local-validator.sh) | Surfpool no necesita stop manual | `surfpool stop` o kill | ❌ ELIMINAR |
| [`verify-local-validator.sh`](scripts/verify-local-validator.sh) | Verificación innecesaria con Surfpool | `surfpool start --ci` | ❌ ELIMINAR |
| [`refactoring-validation.sh`](scripts/refactoring-validation.sh) | Refactoring ya completado | No aplica | ❓ REVISAR |

### Reports en [`reports/`](reports/)

| Archivo | Razón | Estado |
|---------|-------|--------|
| [`ANALISIS-PROFUNDO-PROYECTO.md`](reports/ANALISIS-PROFUNDO-PROYECTO.md) | Reporte de análisis previo | ❓ MOVER a archive |
| [`ANALISIS-SURFPPOOL-IAC.md`](reports/ANALISIS-SURFPPOOL-IAC.md) | Análisis previo | ❓ MOVER a archive |
| [`CONSISTENCIA-SURFPPOOL-IAC.md`](reports/CONSISTENCIA-SURFPPOOL-IAC.md) | Análisis previo | ❓ MOVER a archive |
| [`REPORTE-FASE-0-5-ISSUE-219.md`](reports/REPORTE-FASE-0-5-ISSUE-219.md) | Reporte de fase completada | ❓ MOVER a archive |

### Planes en raíz

| Archivo | Razón | Estado |
|---------|-------|--------|
| [`PLAN-EVOLUTIVO-SISTEMA.md`](PLAN-EVOLUTIVO-SISTEMA.md) | Plan evolutivo a actualizar | ❓ MOVER a plans/ |
| [`ROADMAP.md`](ROADMAP.md) | Roadmap a actualizar | ❓ MOVER a plans/ |
| [`VERIFICATIONS.md`](VERIFICATIONS.md) | Verificaciones previas | ❓ MOVER a archive |
| [`GITHUB_ISSUE.md`](GITHUB_ISSUE.md) | Issue tracking | ❓ MOVER a .github/ |
| [`GITHUB_ISSUE_RUNBOOK_UNIFICATION.md`](GITHUB_ISSUE_RUNBOOK_UNIFICATION.md) | Issue tracking | ❓ MOVER a .github/ |

### Archivos de tests obsoletos en [`sc-solana/tests/`](sc-solana/tests/)

| Archivo | Razón | Estado |
|---------|-------|--------|
| [`anchor-client-wrapper.ts`](sc-solana/tests/anchor-client-wrapper.ts) | Wrapper deprecated | ❓ REVISAR |
| [`hybrid-client.ts`](sc-solana/tests/hybrid-client.ts) | Patrón híbrido deprecated | ❓ REVISAR |
| [`kit-compat.ts`](sc-solana/tests/kit-compat.ts) | Compatibilidad kit | ❓ REVISAR |
| [`pda-seed-patcher.ts`](sc-solana/tests/pda-seed-patcher.ts) | Patcher deprecated | ❓ REVISAR |

### Debug files en [`web/e2e/screensets/`](web/e2e/screensets/)

| Archivo | Razón | Estado |
|---------|-------|--------|
| `wallet-debug-*.png` (6 archivos) | Screenshots de debug | ❌ ELIMINAR |

### Diagnostic components en [`web/src/components/diagnostics/`](web/src/components/diagnostics/)

| Archivo | Razón | Estado |
|---------|-------|--------|
| [`DebugComponent.tsx`](web/src/components/diagnostics/DebugComponent.tsx) | Componente de debug | ❓ MOVER a lib/ o eliminar |
| [`DiagnosticRunner.tsx`](web/src/components/diagnostics/DiagnosticRunner.tsx) | Runner de diagnostic | ❓ MOVER a lib/ o eliminar |

### Scripts en [`web/scripts/`](web/scripts/)

| Archivo | Razón | Estado |
|---------|-------|--------|
| [`run-e2e-with-error-report.sh`](web/scripts/run-e2e-with-error-report.sh) | Script E2E específico | ❓ REVISAR USO |

---

## Directorios a Eliminar

| Directorio | Razón | Contenido |
|------------|-------|-----------|
| `get-admin-address/` | Vacío/obsoleto | Sin archivos relevantes |
| `sc-solana/config/` | Duplicado de `config/` | Keypairs, config.env |
| `sc-solana/target/` | Build generated | IDL, programs, types |
| `web/e2e/screensets/` | Debug artifacts | 6 screenshots PNG |

---

## Archivos a Mantener con Revisión

### Generated code

| Archivo | Razón |
|---------|-------|
| `sc-solana/src/generated/` | Código generado para client SDK |
| `web/src/generated/` | Código generado para frontend |

**Nota:** Estos directorios deberían ser generados automáticamente, no manuales.

### IDL

| Archivo | Razón |
|---------|-------|
| `sc-solana/target/idl/sc_solana.json` | Fuente de verdad para IDL |

### Keypairs

| Directorio | Razón |
|------------|-------|
| `config/keypairs/` | Keypairs de roles (fuente de verdad) |

---

## Plan de Limpieza Recomendado

### Fase 1: Eliminación Segura (Riesgo Bajo)

```bash
# Scripts deprecated
rm sc-solana/deploy.sh
rm sc-solana/init-local.ts
rm sc-solana/codama.js
rm sc-solana/codama-new.js
rm sc-solana/TEST-REFACTORING-PLAN.md
rm sc-solana/CODAMA-INCOMPATIBILITIES.md

# Directorios obsoletos
rm -rf get-admin-address/
rm -rf sc-solana/config/

# Debug files
rm -rf web/e2e/screensets/
```

### Fase 2: Verificación de Uso (Riesgo Medio)

```bash
# Verificar si web/src/contracts/sc_solana.json se usa
grep -r "contracts/sc_solana.json" web/src/ --include="*.ts" --include="*.tsx" --include="*.js"

# Verificar si web/src/generated/ se usa
grep -r "generated" web/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | head -20

# Verificar si sc-solana/tests/* wrappers se usan
grep -r "anchor-client-wrapper\|hybrid-client\|kit-compat\|pda-seed-patcher" sc-solana/tests/ --include="*.ts"
```

### Fase 3: Organización de Documentos

```bash
# Crear directorios de organización
mkdir -p .github/plans
mkdir -p .github/archive

# Mover documentos
mv PLAN-EVOLUTIVO-SISTEMA.md .github/plans/
mv ROADMAP.md .github/plans/
mv VERIFICATIONS.md .github/archive/
mv GITHUB_ISSUE.md .github/
mv GITHUB_ISSUE_RUNBOOK_UNIFICATION.md .github/
mv reports/*.md .github/archive/
```

### Fase 4: Verificación Final

```bash
# Verificar que nothing breaks
cd sc-solana && anchor build
cd ../web && npm test
```

---

## Resumen de Espacio Liberado

| Categoría | Tamaño Estimado |
|-----------|-----------------|
| `sc-solana/target/` | ~5-10 MB |
| `web/e2e/screensets/` | ~500 KB |
| Scripts deprecated | ~50 KB |
| Documentos obsoletos | ~100 KB |
| **Total** | **~6-11 MB** |

---

## Notas Importantes

1. **NUNCA eliminar `sc-solana/target/` si se está construyendo activamente** - Este directorio es generado por Anchor.

2. **Verificar `.gitignore` antes de eliminar** - Algunos directorios como `target/` deberían estar ignorados por git.

3. **Los keypairs en `config/keypairs/` son sensibles** - Asegurar que `.gitignore` los protege.

4. **El generated code puede regenerarse** - Si se usa Codama u otra herramienta de codegen, estos archivos pueden regenerarse.

---

## Checklist de Implementación

- [ ] Backup del repositorio (git commit + push)
- [ ] Eliminación Fase 1 (segura)
- [ ] Verificación de uso Fase 2
- [ ] Eliminación Fase 2 (con verificación)
- [ ] Organización Fase 3
- [ ] Verificación de build Fase 4
- [ ] Actualizar README.md
- [ ] Actualizar AGENTS.md
