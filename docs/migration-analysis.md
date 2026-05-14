# 📘 Análisis de Migración: Anchor 1.0 IDL Spec 0.1.0

## Contexto

El proyecto usa **Anchor 1.0.0** (Rust) que genera IDL en formato **spec 0.1.0**. El cliente TypeScript `@anchor-lang/core@1.0.2` (y `@coral-xyz/anchor@0.32.1`) no puede parsear este formato, generando el error `"Unknown action 'undefined'"` en `provider.ts:196:31`.

---

## 🔍 Hallazgos de Documentación Oficial

### Anchor 1.0 Release Notes (fuente oficial)

Según [anchor-lang.com/docs/updates/release-notes/1-0-0](https://www.anchor-lang.com/docs/updates/release-notes/1-0-0):

1. **El paquete TypeScript se renombró:**
   ```bash
   npm install @anchor-lang/core  # ← Nuevo nombre oficial
   ```

2. **Import actualizado:**
   ```typescript
   - import { Idl } from "@coral-xyz/anchor/dist/cjs/idl";
   + import { Idl } from "@anchor-lang/core";
   ```

3. **⚠️ Limitación crítica:** `@anchor-lang/core` **solo es compatible con v1 de `@solana/web3.js`**, NO con v2.

4. **El cliente `Program` de Anchor funciona con IDL spec 0.1.0:**
   ```typescript
   import { Program } from "@anchor-lang/core";
   const program = new Program(idl as Example, { connection });
   ```

### Problema Identificado

Aunque la documentación oficial indica que `@anchor-lang/core` debería funcionar con IDL spec 0.1.0, **nuestro testing demuestra lo contrario**:

| Paquete | Versión | Resultado |
|---------|---------|-----------|
| `@coral-xyz/anchor` | 0.32.1 | ❌ "Unknown action 'undefined'" |
| `@anchor-lang/core` | 1.0.2 | ❌ "Unknown action 'undefined'" (mismo error) |

**Posibles causas:**
- Bug conocido en `@anchor-lang/core@1.0.2` con IDLs complejos (muchas instrucciones con PDAs)
- Incompatibilidad entre el instruction coder y el formato de seeds `kind: "const"` / `kind: "account"`
- El proyecto usa `@solana/web3.js@1.98.0` (v1), que debería ser compatible

---

## 📊 Análisis de la Propuesta de Migración

### Fase 1: Preparación del Entorno

#### 1.1 Limpiar paquetes legacy

```bash
cd sc-solana && npm uninstall @coral-xyz/anchor
cd web && npm uninstall @anchor-lang/core
```

**Impacto:**
- `sc-solana/tests/`: 17 archivos de test que importan `@coral-xyz/anchor`
- `web/src/`: 5 archivos que importan `@anchor-lang/core`

#### 1.2 Instalar nuevas dependencias

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `@solana/kit` | ^2.0.0 | Reemplaza `@solana/web3.js`, maneja RPC, signers y transacciones |
| `@anchor-lang/core` | ^1.0.2 | Runtime utilidades (opcional) |
| `@codama/cli` | ^0.0.14 | Generador de clientes TS desde IDL Anchor |
| `anchor-cli` | 1.0.0+ | Compila Rust y emite IDL spec 0.1.0 |

---

## 🏗️ Opciones de Implementación

### Opción A: Migración a Codama (Recomendada por Anchor)

**Ventajas:**
- Clientes TypeScript tipados generados automáticamente
- Compatible nativo con IDL spec 0.1.0
- Soporte oficial de Anchor team
- Cero mantenimiento manual de serialización

**Desventajas:**
- Requiere reescribir toda la capa de interacción
- `@codama/cli` aún en versión temprana (0.0.14)
- Curva de aprendizaje para el equipo

**Archivos afectados:**

| Capa | Archivos | Cambio |
|------|----------|--------|
| **Tests** | 17 archivos en `sc-solana/tests/` | Reemplazar `Program<ScSolana>` con cliente Codama |
| **Web Service** | `UnifiedSupplyChainService.ts` | Migrar de `Program.methods` a Codama instructions |
| **Web Contract** | `SupplyChainContract.ts` | Migrar de `AnchorProvider` a Codama wallet adapter |
| **Web Program** | `solana-program.ts` | Reemplazar `getProgram()` con Codama client factory |
| **Web Hooks** | `useSupplyChainService.ts` | Adaptar hooks al nuevo cliente |

**Pasos de implementación:**

```bash
# 1. Instalar Codama CLI
npm install -g @codama/cli

# 2. Generar cliente TypeScript desde IDL
cd sc-solana
codama generate --idl target/idl/sc_solana.json --out ../web/src/generated/

# 3. Actualizar imports en web/
# Reemplazar:
#   import { Program, AnchorProvider } from '@anchor-lang/core'
# Con:
#   import { ScSolanaProgram } from '@/generated/sc-solana'

# 4. Actualizar tests
# Reemplazar:
#   import * as anchor from '@coral-xyz/anchor'
#   const program = new anchor.workspace.ScSolana as Program<ScSolana>
# Con:
#   import { ScSolanaProgram } from '../generated/sc-solana'
```

### Opción B: Mantener @anchor-lang/core + Debug del Bug

**Ventajas:**
- Menor cambio en el código existente
- API familiar (`program.methods.X().rpc()`)
- Sin reescritura masiva

**Desventajas:**
- Requiere identificar y parchear el bug en `@anchor-lang/core`
- Posible fork del paquete
- Sin garantía de solución a largo plazo

**Pasos de implementación:**

```bash
# 1. Verificar que @solana/web3.js es v1 (ya lo es: 1.98.0) ✅
# 2. Debug del instruction coder
#    - Inspeccionar cómo se codifican las instrucciones con seeds PDA
#    - Verificar si el problema está en el decoder de accounts
# 3. Parchear localmente o reportar bug upstream
```

### Opción C: Downgrade a Anchor 0.30.x

**Ventajas:**
- IDL compatible con `@coral-xyz/anchor@0.32.1`
- Cero cambios en código TypeScript
- Solución inmediata

**Desventajas:**
- ⚠️ **Riesgo crítico:** El programa Rust usa `anchor-lang = "1.0.0"` con feature `init-if-needed`
- Feature `init-if-needed` NO existe en Anchor 0.30.x
- Podría requerir reescribir instrucciones que usan `#[account(init, ...)]`
- Pierde mejoras de seguridad y rendimiento de Anchor 1.0

**Análisis de compatibilidad Rust:**

```toml
# Cargo.toml actual
anchor-lang = { version = "1.0.0", features = ["init-if-needed"] }
```

La feature `init-if-needed` permite usar `#[account(init_if_needed)]` en lugar de `#[account(init)]`, lo que evita errores de cuenta ya inicializada. **Downgradear a 0.30.x requeriría:**

1. Reemplazar `init-if-needed` con `init` + manejo de errores
2. Verificar todas las instrucciones que usan esta feature
3. Posibles cambios en la lógica de validación de cuentas

---

## 🎯 Recomendación: Opción A (Codama)

### Justificación

1. **Soporte oficial:** Anchor team recomienda Codama para Anchor 1.0
2. **Tipado fuerte:** Clientes generados con tipos TypeScript exactos
3. **Mantenimiento:** Sin parches manuales ni forks
4. **Futuro:** Compatible con evoluciones de Anchor

### Evoluciones del Sistema Implicadas

#### 1. Capa de Tests (`sc-solana/tests/`)

**Actual:**
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ScSolana } from "../target/types/sc_solana";

const program = anchor.workspace.ScSolana as Program<ScSolana>;
await program.methods.initialize().accounts({ ... }).rpc();
```

**Post-migración:**
```typescript
import { Connection, Keypair } from "@solana/web3.js";
import { ScSolanaProgram } from "../generated/sc-solana";

const program = ScSolanaProgram.fromWalletAddress(
  PROGRAM_ID,
  connection,
  wallet
);
await program.instructions.initialize().accounts({ ... }).transaction();
```

**Archivos afectados (17):**
- `shared-init.ts`, `test-helpers.ts`, `test-isolation.ts`
- `sc-solana.ts`, `deployer-pda.ts`, `batch-registration.ts`
- `edge-cases.ts`, `integration-full-lifecycle.ts`, `lifecycle.ts`
- `overflow-protection.ts`, `pda-derivation.ts`, `query-instructions.ts`
- `rbac-consistency.ts`, `role-enforcement.ts`, `role-management.ts`
- `state-machine.ts`, `unit-tests.ts`

#### 2. Capa de Servicios Web (`web/src/services/`)

**Actual:**
```typescript
import { Program, AnchorProvider, BN } from '@anchor-lang/core';
const program = new Program(idl as ScSolana, provider);
await program.methods.registerNetbook(...).accounts({ ... }).rpc();
```

**Post-migración:**
```typescript
import { ScSolanaProgram } from '@/generated/sc-solana';
const program = ScSolanaProgram.fromWalletAddress(PROGRAM_ID, connection, wallet);
await program.instructions.registerNetbook(...).accounts({ ... }).transaction();
```

**Archivos afectados (5):**
- `UnifiedSupplyChainService.ts` (~978 líneas)
- `SolanaSupplyChainService.ts` (~267 líneas)
- `SupplyChainContract.ts` (~461 líneas)
- `solana-program.ts` (~375 líneas)
- `useSupplyChainService.ts`

#### 3. Configuración del Proyecto

**sc-solana/package.json:**
```json
{
  "devDependencies": {
    "@codama/cli": "^0.0.14",
    "@solana/web3.js": "^1.98.0"
  }
}
```

**web/package.json:**
```json
{
  "dependencies": {
    "@solana/web3.js": "^1.98.0"
  }
}
```

#### 4. Pipeline de Build

```bash
# Nuevo paso en CI/CD
anchor build                          # Compila Rust + genera IDL
codama generate --idl target/idl/sc_solana.json --out ../web/src/generated/  # Genera cliente TS
npm test                               # Ejecuta tests con nuevo cliente
```

---

## ⚠️ Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Codama CLI inestable | Media | Alto | Fork del generador si es necesario |
| Breaking changes en Codama | Baja | Medio | Lock versión exacta en package.json |
| Tiempo de migración | Alta | Medio | Migración incremental por capa |
| Pérdida de funcionalidad | Baja | Alto | Tests exhaustivos post-migración |

---

## 📅 Plan de Migración Sugerido

### Semana 1: Preparación
- [ ] Instalar `@codama/cli` globalmente
- [ ] Generar cliente TypeScript desde IDL actual
- [ ] Verificar tipos generados cubren todas las instrucciones

### Semana 2: Tests
- [ ] Migrar `test-helpers.ts` (base para todos los tests)
- [ ] Migrar `shared-init.ts` (inicialización compartida)
- [ ] Migrar tests unitarios (`unit-tests.ts`)
- [ ] Migrar tests de integración (14 archivos restantes)

### Semana 3: Web Frontend
- [ ] Migrar `solana-program.ts` (capa base)
- [ ] Migrar `UnifiedSupplyChainService.ts` (servicio principal)
- [ ] Migrar `SupplyChainContract.ts` (wrapper)
- [ ] Migrar hooks y componentes

### Semana 4: Validación
- [ ] Ejecutar suite completa de tests
- [ ] Verificar E2E con Playwright
- [ ] Testing manual de flujo completo
- [ ] Actualizar documentación

---

## 🔗 Referencias

- [Anchor 1.0 Release Notes](https://www.anchor-lang.com/docs/updates/release-notes/1-0-0)
- [Anchor TypeScript Client](https://www.anchor-lang.com/docs/clients/typescript)
- [Codama Documentation](https://github.com/coral-xyz/codama)
- [Issue #208](https://github.com/87maxi/SupplyChainTracker-solana-/issues/208)
