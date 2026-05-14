# Epic: Migración de Cliente TypeScript a Codama para Anchor 1.0 IDL Spec 0.1.0

## Resumen

El proyecto usa **Anchor 1.0.0** (Rust) que genera IDL en formato **spec 0.1.0**. Los clientes TypeScript actuales (`@coral-xyz/anchor@0.32.1` y `@anchor-lang/core@1.0.2`) no pueden parsear este formato, generando el error `"Unknown action 'undefined'"` en `provider.ts:196:31`.

**Solución:** Migrar toda la capa de interacción TypeScript a clientes generados con **Codama CLI**, el sistema oficial de generación de clientes para Anchor 1.0.

**Issue relacionado:** [#208](https://github.com/87maxi/SupplyChainTracker-solana-/issues/208) - Reporte del bug original.

---

## 🔍 Análisis del Problema

### Error Actual

```
Error: Unknown action 'undefined'
    at AnchorProvider.sendAndConfirm (node_modules/@anchor-lang/core/src/provider.ts:196:31)
    at MethodsBuilder.rpc [as _rpcFn] (node_modules/@anchor-lang/core/src/program/namespace/rpc.ts:29:16)
```

### Causa Raíz

Anchor 1.0 genera IDL con formato **spec 0.1.0** que incluye:
- `discriminator` arrays (8 bytes) en cada instrucción
- PDA seeds con campo `kind` (`"const"`, `"account"`)
- Estructura de accounts más verbose

El instruction coder de `@anchor-lang/core@1.0.2` no puede parsear este formato, resultando en `undefined` como acción.

### Evidencia

| Paquete | Versión | Resultado |
|---------|---------|-----------|
| `@coral-xyz/anchor` | 0.32.1 | ❌ "Unknown action 'undefined'" |
| `@anchor-lang/core` | 1.0.2 | ❌ "Unknown action 'undefined'" |

**Resultados de tests:** 62 passing, 34 failing (todos por este error)

---

## 📋 Código Afectado - Detalle Completo

### 1. Capa de Tests (`sc-solana/tests/`)

#### 1.1 `test-helpers.ts` (1246 líneas) - Base de toda la infraestructura de tests

**Import actual (líneas 9-22):**
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { ScSolana } from "../target/types/sc_solana";
import {
  Keypair, PublicKey, Transaction, VersionedTransaction,
  LAMPORTS_PER_SOL, TransactionInstruction, SystemProgram,
  TransactionMessage, ComputeBudgetProgram,
} from "@solana/web3.js";
```

**Patrones afectados:**
- `Program<ScSolana>` - Tipo del programa (usado en 40+ funciones)
- `anchor.AnchorProvider.env()` - Creación de provider
- `anchor.setProvider(provider)` - Configuración global
- `program.methods.X().accounts({}).rpc()` - Ejecución de instrucciones
- `program.account.X.fetch(pda)` - Lectura de accounts
- `anchor.web3.PublicKey.findProgramAddressSync()` - Derivación PDA

**Funciones clave que requieren migración:**
- `fundAndInitialize()` - Inicialización del config
- `grantRoleToAccount()` - Gestión de roles
- `registerNetbook()` - Registro de netbooks
- `auditHardware()` - Auditoría de hardware
- `validateSoftware()` - Validación de software
- `assignToStudent()` - Asignación a estudiante
- `getConfigPda()`, `getNetbookPda()`, `getRoleRequestPda()` - Derivación PDAs

#### 1.2 `shared-init.ts` (103 líneas) - Inicialización compartida para tests paralelos

**Import actual (líneas 11-14):**
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ScSolana } from "../target/types/sc_solana";
import { Keypair } from "@solana/web3.js";
```

**Patrón afectado:**
```typescript
export async function sharedInit(
  program: Program<ScSolana>,
  provider: anchor.AnchorProvider,
  funder: Keypair,
  amount: number = 20 * anchor.web3.LAMPORTS_PER_SOL
): Promise<void> { ... }
```

#### 1.3 `sc-solana.ts` (1189 líneas) - Suite principal de integración

**Import actual (líneas 13-18):**
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ScSolana } from "../target/types/sc_solana";
import { expect } from "chai";
import { Keypair, SystemProgram } from "@solana/web3.js";
```

**Patrones afectados (ejemplos):**
```typescript
// Línea 42-43: Setup de provider
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

// Línea 46: Instancia del programa
let program: Program<ScSolana>;

// Línea 500+: Ejecución de instrucciones
await program.methods
  .registerNetbook(serialNumber, batchId, modelSpecs)
  .accounts({
    config: configPda,
    netbook: netbookPda,
    manufacturer: fabricante.publicKey,
    payer: provider.wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Línea 600+: Lectura de accounts
const netbook = await program.account.netbook.fetch(netbookPda);
```

#### 1.4 `deployer-pda.ts` (377 líneas) - Tests de Deployer PDA

**Patrón afectado:**
```typescript
// Línea 54-69: Derivación PDAs
[deployerPda, deployerBump] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("deployer")],
  program.programId
);

// Línea 161: Construcción de transacciones
const initTx = new anchor.web3.Transaction({ ... });
```

#### 1.5 `batch-registration.ts` (1037 líneas) - Tests de registro por lote

**Patrón afectado:**
```typescript
await program.methods
  .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs, count)
  .accounts({ ... })
  .rpc();
```

#### 1.6 `edge-cases.ts` (1310 líneas) - Tests de casos borde

**Patrones afectados:**
- Verificación de límites de strings (200, 100, 500 chars)
- Validación de roles
- Transiciones inválidas de estado

#### 1.7 `state-machine.ts` (1408 líneas) - Tests de máquina de estados

**Patrón afectado:**
```typescript
const netbook = await program.account.netbook.fetch(netbookPda);
expect(netbook.state).to.equal(NetbookState.HwAprobado);
```

#### 1.8 `role-management.ts` (1027 líneas) - Tests de gestión de roles

#### 1.9 `role-enforcement.ts` (1129 líneas) - Tests de enforcement de roles

#### 1.10 `rbac-consistency.ts` (675 líneas) - Tests de consistencia RBAC

#### 1.11 `query-instructions.ts` (1210 líneas) - Tests de instrucciones de consulta

**Patrón afectado:**
```typescript
const eventPromise = new Promise<void>((resolve, reject) => {
  const listener = (log) => {
    // Parse logs para eventos
  };
  program.addEventListener("NetbookRegistered", listener);
});
```

#### 1.12 `pda-derivation.ts` (693 líneas) - Tests de derivación PDA

#### 1.13 `overflow-protection.ts` (1154 líneas) - Tests de protección overflow

#### 1.14 `integration-full-lifecycle.ts` - Tests de ciclo completo

#### 1.15 `lifecycle.ts` - Tests de lifecycle

#### 1.16 `unit-tests.ts` - Tests unitarios (no requieren migración, no usan blockchain)

#### 1.17 `test-isolation.ts` (509 líneas) - Utilidades de aislamiento de tests

---

### 2. Capa Web Frontend (`web/src/`)

#### 2.1 `solana-program.ts` (375 líneas) - Capa base de interacción

**Import actual (líneas 4-10):**
```typescript
import { Program, AnchorProvider, type Idl } from '@anchor-lang/core';
import { Connection, PublicKey, SystemProgram, Transaction, VersionedTransaction, type Commitment } from '@solana/web3.js';
import idlJson from '@/contracts/sc_solana.json';
```

**Patrones afectados:**
```typescript
// Línea 50: Tipo IDL
export type SupplyChainIDL = Idl & Record<string, unknown>;

// Línea 55-59: Creación de provider
export function getProvider(wallet: any, connection: Connection): AnchorProvider {
  return new AnchorProvider(connection, wallet, {
    commitment: 'confirmed' as Commitment,
    preflightCommitment: 'confirmed' as Commitment,
  });
}

// Línea 65-67: Instancia del programa
export function getProgram(provider: AnchorProvider): Program<SupplyChainIDL> {
  return new Program(idlJson as SupplyChainIDL, provider);
}

// Línea 72+: React hook
export function useSupplyChainProgram() {
  const { publicKey, isConnected } = useSolanaWeb3();
  const connection = useMemo(() => new Connection(rpcUrl, 'confirmed'), []);
  // ...
}
```

#### 2.2 `UnifiedSupplyChainService.ts` (978 líneas) - Servicio principal

**Import actual (líneas 10-19):**
```typescript
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@anchor-lang/core';
import {
  findConfigPda, findDeployerPda, findNetbookPda,
  findRoleRequestPda, getProgram, PROGRAM_ID,
} from '@/lib/contracts/solana-program';
```

**Patrones afectados:**
```typescript
// Línea 43: Tipo de programa
type AnchorProgram = Program<any>;

// Ejecución de instrucciones (a lo largo del archivo)
async registerNetbook(params: { ... }): Promise<TransactionResult> {
  const program = this.getProgram();
  const tx = await program.methods
    .registerNetbook(serialNumber, batchId, modelSpecs)
    .accounts({ ... })
    .transaction();
  // ...
}

// Lectura de accounts
async getConfig(): Promise<ConfigData> {
  const program = this.getProgram();
  const config = await program.account.supplyChainConfig.fetch(configPda);
  return { ...config };
}
```

#### 2.3 `SupplyChainContract.ts` (461 líneas) - Wrapper de contrato

**Import actual (líneas 9-13):**
```typescript
import { AnchorProvider, Program, BN } from '@anchor-lang/core';
import { Connection, PublicKey } from '@solana/web3.js';
import { getProgram, PROGRAM_ID } from '@/lib/contracts/solana-program';
```

**Patrones afectados:**
```typescript
// Línea 20-28: Creación de provider
export function createProvider(wallet: any, conn?: Connection): AnchorProvider | null {
  return new AnchorProvider(connectionToUse, wallet as any, { commitment: 'confirmed' });
}

// Línea 34-36: Obtención de programa
export function getSupplyChainProgram(provider: AnchorProvider): Program<any> {
  return getProgram(provider);
}

// Línea 65: Decodificación de accounts
const deserialized = program.coder.accounts.decode('supplyChainConfig', accountInfo.data);
```

#### 2.4 `SolanaSupplyChainService.ts` (267 líneas) - Servicio legacy (deprecated)

**Import actual (líneas 5-7):**
```typescript
import { PublicKey } from '@solana/web3.js';
import { BN } from '@anchor-lang/core';
import { UnifiedSupplyChainService } from './UnifiedSupplyChainService';
```

#### 2.5 `useSupplyChainService.ts` (519 líneas) - Hook React

**Import actual (líneas 8-12):**
```typescript
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnchorProvider, BN } from '@anchor-lang/core';
import { Connection, PublicKey } from '@solana/web3.js';
import { useSolanaWeb3 } from '@/hooks/useSolanaWeb3';
import { UnifiedSupplyChainService } from '@/services/UnifiedSupplyChainService';
```

---

### 3. Archivos de Configuración

#### 3.1 `sc-solana/package.json`

**Actual:**
```json
{
  "devDependencies": {
    "@coral-xyz/anchor": "^0.32.1",
    "@types/bn.js": "^5.1.0",
    "@types/chai": "^4.3.0",
    "@types/mocha": "^9.0.0",
    "chai": "^4.3.4",
    "mocha": "^9.0.3",
    "prettier": "^2.6.2",
    "ts-mocha": "^10.0.0",
    "typescript": "^5.7.3"
  }
}
```

**Propuesto:**
```json
{
  "devDependencies": {
    "@codama/cli": "^0.0.14",
    "@solana/web3.js": "^1.98.0",
    "@types/bn.js": "^5.1.0",
    "@types/chai": "^4.3.0",
    "@types/mocha": "^9.0.0",
    "chai": "^4.3.4",
    "mocha": "^9.0.3",
    "prettier": "^2.6.2",
    "ts-mocha": "^10.0.0",
    "typescript": "^5.7.3"
  }
}
```

#### 3.2 `web/package.json`

**Actual (línea 34):**
```json
"@anchor-lang/core": "^1.0.2"
```

**Propuesto:** Eliminar `@anchor-lang/core`, mantener `@solana/web3.js@1.98.0`

#### 3.3 `sc-solana/Anchor.toml`

**Actual (línea 20):**
```toml
[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 --file tests/shared-init.ts \"tests/**/*.ts\""
```

**Propuesto:** Agregar paso de generación Codama antes de tests:
```toml
[scripts]
codegen = "codama generate --idl target/idl/sc_solana.json --out ../web/src/generated/"
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 --file tests/shared-init.ts \"tests/**/*.ts\""
```

---

## 🏗️ Plan de Migración por Fases

### Fase 1: Configuración del Entorno (Día 1-2)

#### 1.1 Instalar Codama CLI
```bash
npm install -g @codama/cli
```

#### 1.2 Generar Cliente TypeScript
```bash
cd sc-solana
anchor build  # Genera target/idl/sc_solana.json
codama generate --idl target/idl/sc_solana.json --out ../web/src/generated/
```

#### 1.3 Verificar Tipos Generados
- Verificar que todas las instrucciones estén presentes
- Verificar que los tipos de accounts sean correctos
- Verificar que los eventos estén tipados

### Fase 2: Migración de Tests (Día 3-7)

#### 2.1 Migrar `test-helpers.ts` (prioridad máxima)
- Reemplazar `Program<ScSolana>` con cliente Codama
- Actualizar todas las funciones helper
- Verificar que los PDAs se derivan correctamente

#### 2.2 Migrar `shared-init.ts`
- Actualizar firma de `sharedInit()`
- Verificar inicialización del config

#### 2.3 Migrar `sc-solana.ts`
- Actualizar setup de provider
- Migrar todas las llamadas a `program.methods.X().rpc()`

#### 2.4 Migrar tests restantes (14 archivos)
- `deployer-pda.ts`, `batch-registration.ts`, `edge-cases.ts`
- `integration-full-lifecycle.ts`, `lifecycle.ts`
- `overflow-protection.ts`, `pda-derivation.ts`
- `query-instructions.ts`, `rbac-consistency.ts`
- `role-enforcement.ts`, `role-management.ts`
- `state-machine.ts`, `test-isolation.ts`

### Fase 3: Migración Web Frontend (Día 8-12)

#### 3.1 Migrar `solana-program.ts`
- Reemplazar `getProvider()` con factory Codama
- Reemplazar `getProgram()` con cliente Codama
- Actualizar `useSupplyChainProgram()` hook

#### 3.2 Migrar `UnifiedSupplyChainService.ts`
- Reemplazar todas las llamadas a `program.methods.X()`
- Actualizar lectura de accounts
- Verificar eventos

#### 3.3 Migrar `SupplyChainContract.ts`
- Actualizar `createProvider()`
- Actualizar `getSupplyChainProgram()`
- Migrar decodificación de accounts

#### 3.4 Migrar `useSupplyChainService.ts`
- Actualizar imports
- Verificar compatibilidad con hooks React

### Fase 4: Validación (Día 13-14)

#### 4.1 Ejecutar Suite de Tests
```bash
cd sc-solana && anchor run test
```

#### 4.2 Verificar E2E
```bash
cd web && npm run test:e2e
```

#### 4.3 Testing Manual
- Verificar flujo completo: register → audit → validate → assign
- Verificar gestión de roles
- Verificar consultas

---

## 📊 Métricas de Impacto

| Métrica | Valor |
|---------|-------|
| Archivos de test afectados | 17 |
| Archivos web afectados | 5 |
| Líneas de código a migrar | ~8,500 |
| Imports a reemplazar | ~45 |
| Patrones `program.methods.X().rpc()` | ~200+ |
| Patrones `program.account.X.fetch()` | ~50+ |
| Patrones `AnchorProvider` | ~20+ |

---

## 🔗 Referencias

- [Anchor 1.0 Release Notes](https://www.anchor-lang.com/docs/updates/release-notes/1-0-0)
- [Anchor TypeScript Client](https://www.anchor-lang.com/docs/clients/typescript)
- [Codama Documentation](https://github.com/coral-xyz/codama)
- [Issue #208 - Bug Report](https://github.com/87maxi/SupplyChainTracker-solana-/issues/208)
- [Análisis de Migración](docs/migration-analysis.md)

---

## ✅ Checklist de Completado

- [ ] Codama CLI instalado y funcionando
- [ ] Cliente TypeScript generado y verificado
- [ ] `test-helpers.ts` migrado
- [ ] `shared-init.ts` migrado
- [ ] `sc-solana.ts` migrado
- [ ] 14 tests restantes migrados
- [ ] `solana-program.ts` migrado
- [ ] `UnifiedSupplyChainService.ts` migrado
- [ ] `SupplyChainContract.ts` migrado
- [ ] `useSupplyChainService.ts` migrado
- [ ] Suite de tests pasando (62+ tests)
- [ ] E2E tests pasando
- [ ] Documentación actualizada
- [ ] CI/CD pipeline actualizado
