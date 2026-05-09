# Plan de Migración PDA-First - SupplyChainTracker

## Resumen Ejecutivo

Migración completa del sistema SupplyChainTracker a arquitectura PDA-first para compatibilidad total con Surfpool/txtx. Todos los accounts serán PDAs derivables del IDL, eliminando la necesidad de wallets externos en las instrucciones.

## Problema Actual

- `initializer` en `initialize` es wallet externo → Surfpool no puede derivarlo del IDL
- Los runbooks de Surfpool fallan con "data not found" o "account could not be derived"
- Se requiere script CLI alternativo para initialize-config

## Issues Creados

| # | Issue | Labels | Estado |
|---|-------|--------|--------|
| [#163](https://github.com/87maxi/SupplyChainTracker-solana-/issues/163) | 🏗️ Epic: Migración PDA-First | epic, architecture | Open |
| [#164](https://github.com/87maxi/SupplyChainTracker-solana-/issues/164) | 🦀 Smart Contract: Crear Deployer PDA | smart-contract, phase-1 | Open |
| [#165](https://github.com/87maxi/SupplyChainTracker-solana-/issues/165) | 🦀 Smart Contract: fund_deployer | smart-contract, phase-2 | Open |
| [#166](https://github.com/87maxi/SupplyChainTracker-solana-/issues/166) | 🦀 Smart Contract: close_deployer | smart-contract, phase-2 | Open |
| [#167](https://github.com/87maxi/SupplyChainTracker-solana-/issues/167) | 📝 Runbooks: initialize-config.tx | runbooks, phase-3 | Open |
| [#168](https://github.com/87maxi/SupplyChainTracker-solana-/issues/168) | 📝 Runbooks: full-lifecycle.tx | runbooks, phase-3 | Open |
| [#169](https://github.com/87maxi/SupplyChainTracker-solana-/issues/169) | 📝 Runbooks: Verificación completa | runbooks, phase-3 | Open |
| [#170](https://github.com/87maxi/SupplyChainTracker-solana-/issues/170) | 🌐 Frontend: SolanaSupplyChainService | frontend, phase-4 | Open |
| [#171](https://github.com/87maxi/SupplyChainTracker-solana-/issues/171) | 🌐 Frontend: Hooks inicialización | frontend, phase-4 | Open |
| [#172](https://github.com/87maxi/SupplyChainTracker-solana-/issues/172) | 🧹 Cleanup: Código obsoleto | cleanup, phase-5 | Open |
| [#173](https://github.com/87maxi/SupplyChainTracker-solana-/issues/173) | 🧪 Testing: Integración PDA-first | testing, phase-5 | Open |
| [#174](https://github.com/87maxi/SupplyChainTracker-solana-/issues/174) | 📚 Documentación: Final | documentation, phase-5 | Open |

## Arquitectura Objetivo

```
┌─────────────────────────────────────────────────────────────────┐
│                     ARCHITECTURE PDA-FIRST                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Deployer PDA [b"deployer"]                                    │
│  ├── Payer para creación de accounts                           │
│  ├── Funded por wallet externo (fuera de instrucción)          │
│  └── Derivable del IDL                                         │
│                                                                 │
│  Config PDA [b"config"]                                        │
│  Serial Hashes PDA [b"serial_hashes", config.key()]            │
│  Admin PDA [b"admin", config.key()]                            │
│  Netbook PDA [b"netbook", token_id.to_le_bytes()]              │
│  Role Holder PDA [b"role_holder", user.key()]                  │
│  Role Request PDA [b"role_request", user.key()]                │
│                                                                 │
│  ALL accounts derivable from IDL ✓                             │
│  ALL Surfpool runbooks work with program_idl + instruction_name ✓│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Fases de Migración

### Fase 1: Smart Contract - Deployer PDA

**[#164](https://github.com/87maxi/SupplyChainTracker-solana-/issues/164)** - Crear Deployer PDA para initialize

- [ ] Crear struct `DeployerPda` con seeds `[b"deployer"]`
- [ ] Modificar `Initialize` para usar deployer PDA como payer
- [ ] Agregar instrucción `fund_deployer` para transferir SOL al deployer PDA
- [ ] Actualizar IDL con nuevo account
- [ ] Tests unitarios

### Fase 2: Smart Contract - Instrucciones Adicionales

**[#165](https://github.com/87maxi/SupplyChainTracker-solana-/issues/165)** - Instrucción fund_deployer

- [ ] Crear instrucción para fundear deployer PDA
- [ ] System program transfer desde wallet externo
- [ ] Verificar balance mínimo

**[#166](https://github.com/87maxi/SupplyChainTracker-solana-/issues/166)** - Instrucción close_deployer

- [ ] Permitir recuperar SOL del deployer PDA
- [ ] Transferir a wallet admin
- [ ] Cerrar account

### Fase 3: Runbooks Surfpool

**[#167](https://github.com/87maxi/SupplyChainTracker-solana-/issues/167)** - Actualizar initialize-config.tx

- [ ] Usar `program_idl + instruction_name`
- [ ] Derivar deployer PDA
- [ ] Agregar paso de funding
- [ ] Verificar con Surfpool

**[#168](https://github.com/87maxi/SupplyChainTracker-solana-/issues/168)** - Actualizar full-lifecycle.tx

- [ ] Corregir sintaxis HCL (línea 175)
- [ ] Usar deployer PDA
- [ ] Verificar ciclo completo

**[#169](https://github.com/87maxi/SupplyChainTracker-solana-/issues/169)** - Verificar todos los runbooks

- [ ] deploy-program.tx ✓ (ya funciona)
- [ ] initialize-config.tx (Fase 3)
- [ ] grant-roles.tx ✓ (ya funciona)
- [ ] register-netbook.tx ✓ (ya funciona)
- [ ] audit-hardware.tx ✓ (ya funciona)
- [ ] validate-software.tx ✓ (ya funciona)
- [ ] assign-student.tx ✓ (ya funciona)
- [ ] query-*.tx ✓ (ya funcionan)

### Fase 4: Frontend

**[#170](https://github.com/87maxi/SupplyChainTracker-solana-/issues/170)** - Actualizar SolanaSupplyChainService

- [ ] Agregar método `fundDeployer()`
- [ ] Actualizar `initialize()` para usar deployer PDA
- [ ] Derivar PDAs con `PublicKey.findProgramAddress`

**[#171](https://github.com/87maxi/SupplyChainTracker-solana-/issues/171)** - Actualizar hooks de inicialización

- [ ] `useSupplyChainService` - agregar funding step
- [ ] Actualizar UI de deployment

### Fase 5: Limpieza y Verificación

**[#172](https://github.com/87maxi/SupplyChainTracker-solana-/issues/172)** - Eliminar código obsoleto

- [ ] Eliminar `initialize-config-cli.sh` (ya no necesario)
- [ ] Limpiar workarounds en runbooks
- [ ] Actualizar documentación

**[#173](https://github.com/87maxi/SupplyChainTracker-solana-/issues/173)** - Tests de integración

- [ ] Test ciclo completo con Surfpool
- [ ] Test frontend con deployer PDA
- [ ] Verificar todos los runbooks

**[#174](https://github.com/87maxi/SupplyChainTracker-solana-/issues/174)** - Documentación final

- [ ] Actualizar README.md
- [ ] Documentar arquitectura PDA-first
- [ ] Guía de deployment

## Dependencias

```
#163 (Epic PDA-First)
├── #164 (Deployer PDA)
│   ├── #167 (initialize-config.tx)
│   │   └── #169 (Verificar runbooks)
│   └── #170 (Frontend service)
│       └── #171 (Hooks)
├── #165 (fund_deployer)
└── #166 (close_deployer)

#168 (full-lifecycle.tx)
└── #169 (Verificar runbooks)

#172 (Cleanup)
├── #169 (después de verificar)
└── #171 (después de migrar frontend)

#173 (Tests)
├── #169
└── #171

#174 (Documentación)
├── #172
└── #173
```

## Estimación de Complejidad

| Fase | Issues | Complejidad | Tiempo Estimado |
|------|--------|-------------|-----------------|
| 1 - Deployer PDA | 1 | Media | 2-3 horas |
| 2 - Instrucciones | 2 | Baja | 1 hora |
| 3 - Runbooks | 3 | Media | 2 horas |
| 4 - Frontend | 2 | Media | 2-3 horas |
| 5 - Limpieza | 3 | Baja | 1-2 horas |
| **Total** | **12** | | **8-11 horas** |

## Criterios de Aceptación

1. ✅ Todos los runbooks funcionan con `program_idl + instruction_name`
2. ✅ No se requiere script CLI alternativo
3. ✅ Todos los accounts son PDAs derivables del IDL
4. ✅ Frontend funciona con nueva arquitectura
5. ✅ Tests de integración pasan
6. ✅ Código obsoleto eliminado
7. ✅ Documentación actualizada
