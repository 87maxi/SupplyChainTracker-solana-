# 🔍 Reporte de Incompatibilidades: Migración de Tests Anchor → Codama

## Resumen
Durante la migración de los tests de integración de Anchor (@coral-xyz/anchor) al cliente generado por Codama (@codama/renderers-js + @solana/kit), se identificaron **4 incompatibilidades fundamentales** que impiden la ejecución exitosa de las instrucciones del programa. A continuación se detalla cada una con su comportamiento esperado vs. real.

---

## 1. ❌ Firmas de Signers Adicionales (CRÍTICO)

**Funcionalidad:** Instrucciones como `grantRole` requieren que múltiples cuentas firmen la transacción (admin PDA + accountToGrant).

**Comportamiento Esperado:** El cliente Codama debería permitir registrar signers adicionales y firmarlos automáticamente al ejecutar `.sendTransaction()`.

**Resultado Real:** Error `Transaction is missing signatures for addresses: [address]`

**Causa Raíz:**
- `signTransactionMessageWithSigners()` de @solana/signers extrae signers de `AccountSignerMeta` en el `TransactionMessage`
- Cuando `transactionPlanner` compila el mensaje, los flags `isSigner` se pierden
- Los signers registrados no se incluyen en la firma final

**Solución Aplicada:**
- Reemplazar `signTransactionMessageWithSigners` con `compileTransaction()` + `signTransactionWithSigners(signers, transaction)`
- Crear función `registerSigner()` que convierte web3.js Keypair → @solana/signer KeyPairSigner
- **Estado:** ✅ Resuelto (firmas ahora se aplican correctamente)

---

## 2. ❌ Semillas PDA en Instrucciones (CRÍTICO - BLOQUEANTE)

**Funcionalidad:** Instrucciones que verifican PDAs mediante semillas (como `grantRole` con admin PDA `#[account(seeds = [b"admin", config.key()], bump = config.admin_pda_bump))]`).

**Comportamiento Esperado:** Codama debería incluir automáticamente las semillas PDA en los `AccountMeta` generados, similar a cómo Anchor lo hace con `seeds!` y `bump`.

**Resultado Real:** Error `Custom program error: #3012` (`ConstraintSeeds`) o `#1` (`ConstraintRentExempt`)

**Código del Programa (grant.rs):**
```rust
#[account(
    seeds = [b"admin", config.key().as_ref()],
    bump = config.admin_pda_bump
)]
pub admin: UncheckedAccount<'info>,
```

**Causa Raíz:**
- Anchor genera automáticamente las semillas PDA en las instrucciones mediante `seeds!` macro
- Codama genera instrucciones con `AccountMeta` simples que solo contienen la dirección, sin semillas
- El programa verifica las semillas en runtime y falla porque no coinciden

**Ejemplo de Instrucción Codama (sin semillas):**
```typescript
// getGrantRoleInstruction genera:
{
  accounts: [
    { pubkey: adminPda, isSigner: false, isWritable: false }, // ❌ Sin semillas
    // ...
  ]
}
```

**Lo que el programa necesita:**
```typescript
{
  accounts: [
    {
      pubkey: adminPda,
      isSigner: false,
      isWritable: false,
      seeds: [b"admin", configPda], // ✅ Semillas requeridas
      bump: config.admin_pda_bump
    },
    // ...
  ]
}
```

**Análisis del Repositorio Codama:**
- `rootNodeFromAnchor` extrae correctamente las PDAs del IDL de Anchor (6 PDAs detectadas)
- Los visitantes `setInstructionAccountDefaultValuesVisitor` y `fillDefaultPdaSeedValuesVisitor` permiten configurar auto-derivación de PDAs
- **PERO** el renderer JS (`@codama/renderers-js` v2.2.0) genera `AccountMeta` simples sin semillas
- `@solana/kit` no soporta semillas en `AccountMeta`

**Solución Aplicada:**
- Crear módulo `pda-seed-patcher.ts` con definiciones de semillas PDA
- Usar `TransactionInstruction` de `@solana/web3.js` para instrucciones que requieren PDA seeds
- **Estado:** ❌ NO RESUELTO - Requiere modificación del IDL o generación personalizada de instrucciones

---

## 3. ❌ Conversión de web3.js Keypair → @solana/signers (MODERADO)

**Funcionalidad:** Los tests usan `Keypair` de @solana/web3.js para generar cuentas de prueba.

**Comportamiento Esperado:** `createSignerFromKeyPair()` debería aceptar web3.js Keypair directamente.

**Resultado Real:** Error `The 'CryptoKey' must be an 'Ed25519' public key.`

**Causa Raíz:**
- web3.js Keypair.secretKey = 64 bytes (private 32 + public 32)
- @solana/keys espera 32 bytes (solo la clave privada)
- `createSignerFromKeyPair()` de @solana/signers espera un KeyPair nativo de @solana/keys

**Solución Aplicada:**
```typescript
export async function createSignerFromWeb3Keypair(keypair: Keypair) {
  const privateKeyBytes = keypair.secretKey.slice(0, 32);
  return await createKeyPairSignerFromPrivateKeyBytes(privateKeyBytes);
}
```

**Estado:** ✅ Resuelto

---

## 4. ❌ API de Envío de Transacciones (BAJO)

**Funcionalidad:** Instrucciones Codama deberían tener método `.send()` para enviar transacciones.

**Comportamiento Esperado:** `instruction.send()` envía y confirma la transacción.

**Resultado Real:** Error `.send is not a function`

**Causa Raíz:**
- `addSelfPlanAndSendFunctions` genera `.sendTransaction()` en lugar de `.send()`
- La API de Codama usa `sequentialInstructionPlan` + `transactionPlanner` + `transactionPlanExecutor`

**Solución Aplicada:** Reemplazar todos los `.send()` con `.sendTransaction()`

**Estado:** ✅ Resuelto

---

## 🐛 Bug Adicional: Verificación de existencia de cuentas

**Funcionalidad:** `_performInitialization()` verifica si el config y deployer PDA ya existen antes de intentar crearlos.

**Comportamiento Esperado:** `getAccountInfo()` devuelve `null` para cuentas que no existen.

**Resultado Real:** `getAccountInfo()` devuelve `{ value: null }` para cuentas inexistentes, y el objeto `{ value: null }` es truthy en JavaScript, causando que la inicialización se salte siempre.

**Solución Aplicada:** Verificar `configInfo?.value` en lugar de `configInfo`.

**Estado:** ✅ Resuelto

---

## 📊 Estado Actual de Tests

| Test Suite | Anchor | Codama | Estado |
|------------|--------|--------|--------|
| Mollusk (Rust) | N/A | 24/24 ✅ | ✅ Passing |
| batch-registration.ts | ✅ | ❌ #1, #3012 | ❌ Bloqueado |
| pda-derivation.ts | ✅ | ✅ | ✅ Passing |
| lifecycle.ts | ✅ | ❌ #1, #3012 | ❌ Bloqueado |
| role-management.ts | ✅ | ❌ #1, #3012 | ❌ Bloqueado |
| query-instructions.ts | ✅ | ❌ #1, #3012 | ❌ Bloqueado |

---

## 🔧 Archivos Modificados

- `sc-solana/tests/test-helpers.ts`: Pipeline de transacciones con signers explícitos
- `sc-solana/tests/batch-registration.ts`: Conversión de signers web3.js → @solana/signers
- `sc-solana/tests/deployer-pda.ts`: Skip de tests cuando config existe
- `sc-solana/tests/pda-seed-patcher.ts`: Módulo para parchear semillas PDA

---

## 📋 Próximos Pasos para Resolver #3012

1. **Opción A (Recomendada):** Usar `@coral-xyz/anchor` para instrucciones que requieren PDA seeds
2. **Opción B:** Modificar el IDL para incluir semillas PDA explícitas
3. **Opción C:** Crear wrapper personalizado que agregue semillas a los AccountMeta antes de enviar
4. **Opción D:** Contribuir a Codama para soporte automático de semillas PDA

**Recomendación:** Opción A como solución inmediata, Opción D como solución a largo plazo.

---

## 📊 Análisis del Repositorio Codama

### Hallazgos Clave del Repositorio (github.com/codama-idl/codama)

**1. Codama SÍ soporta semillas PDA:**
- `rootNodeFromAnchor` extrae correctamente las PDAs del IDL de Anchor (6 PDAs detectadas: admin, role_holder, deployer, config, serial_hash_registry, role_request)
- Los visitantes `setInstructionAccountDefaultValuesVisitor` y `fillDefaultPdaSeedValuesVisitor` permiten configurar auto-derivación de PDAs

**2. Problema de Compatibilidad:**
- Los visitantes avanzados (`getRecordLinkables`, `fillDefaultPdaSeedValuesVisitor`) tienen problemas de API en la versión instalada (codama v2.x)
- Error: `Cannot read properties of undefined (reading 'split')` al intentar usar la configuración avanzada
- El renderer JS (`@codama/renderers-js` v2.2.0) genera `AccountMeta` simples sin semillas, aunque el IDL las tenga

**3. Solución Documentada:**

La solución requiere una de estas opciones:

| Opción | Descripción | Estado |
|--------|-------------|--------|
| A | Actualizar Codama a versión con soporte completo de visitantes | Requiere upgrade de dependencias |
| B | Crear wrapper manual que agregue semillas a AccountMeta | Implementable inmediatamente |
| C | Contribuir a Codama para soporte automático de semillas | Largo plazo |

**4. Archivos Generados por Codama (sin semillas):**
- [`grantRole.ts`](sc-solana/src/generated/src/generated/instructions/grantRole.ts:188): `getAccountMeta("admin", accounts.admin)` sin semillas
- [`fundDeployer.ts`](sc-solana/src/generated/src/generated/instructions/fundDeployer.ts:170): `getAccountMeta("deployer", accounts.deployer)` sin semillas
- [`initialize.ts`](sc-solana/src/generated/src/generated/instructions/initialize.ts:188): Mismo patrón

**5. Lo que el Programa Necesita (Anchor):**
```rust
// grant.rs:24-27
#[account(seeds = [b"admin", config.key().as_ref()], bump = config.admin_pda_bump)]
pub admin: UncheckedAccount<'info>,
```

**6. Lo que Codama Genera (sin semillas):**
```typescript
// grantRole.ts:191
getAccountMeta("admin", accounts.admin)
// Resultado: { pubkey: adminPda, isSigner: false, isWritable: false }
// Faltan: seeds y bump
```

### Conclusión

El problema es una incompatibilidad fundamental entre el renderer JS de Codama y la verificación de semillas PDA de Anchor. El IDL tiene las semillas, pero el código generado no las incluye en los AccountMeta. La solución práctica inmediata es la **Opción B** (wrapper manual), ya que la configuración avanzada de Codama tiene problemas de API en la versión actual.

### Referencias
- [Codama PDA Documentation](https://github.com/codama-idl/codama/blob/main/packages/nodes/docs/contextualValueNodes/PdaValueNode.md)
- [Visitors README](https://github.com/codama-idl/codama/blob/main/packages/visitors/README.md)
- [Dynamic Client PDA Derivation](https://github.com/codama-idl/codama/blob/main/packages/dynamic-client/README.md)
