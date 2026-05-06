# Issue #48: Surfpool/txtx Deployment - Addon SVM Configuration Errors and Solution

| Field | Value |
|-------|-------|
| **Issue** | #48 |
| **Phase** | Phase 13 - Deployment Scripts & Migration |
| **Component** | Smart Contract / Runbooks |
| **Priority** | P1 |
| **Status** | ✅ Fixed |
| **Date** | 2026-05-06 |
| **Analyst** | Code Mode (AI) |

---

## 1. Problem Description

### 1.1 Error Principal

Al intentar ejecutar los runbooks de deployment con `txtx run`, se producía el siguiente error:

```
error: unable to instantiate construct, addon 'svm' unknown
```

Este error impedía la ejecución de los runbooks `deploy-program`, `initialize-config`, y `grant-roles` que dependen del addon `svm` de Surfpool.

### 1.2 Errores Secundarios

Además del error principal, se encontraron los siguientes problemas:

| Error | Causa | Contexto |
|-------|-------|----------|
| `addon 'svm' unknown` | Uso incorrecto de `txtx run` en lugar de `surfpool run` | Deploy runbooks |
| `unsupervised executions should not be generating actions` | El flag `--unsupervised` no soporta interacción de wallet | Deploy con `--unsupervised` |
| `Runbook execution aborted` | Estado cached impedía re-ejecución | Re-deploy forzado |
| Output vacío sin errores | Modo `--terminal` no muestra outputs correctamente | Debugging |

---

## 2. Root Cause Analysis

### 2.1 Diferencia entre `txtx run` y `surfpool run`

El problema raíz era la confusión entre dos herramientas diferentes:

| Herramienta | Descripción | Incluye addon svm |
|-------------|-------------|-------------------|
| `txtx run` | txtx-cli standalone (v0.5.2) | ❌ NO |
| `surfpool run` | Surfpool (v1.2.0) con svm addon | ✅ SÍ |

**txtx-cli** es un CLI standalone que ejecuta runbooks pero NO incluye los addons de surfpool.

**Surfpool** es una herramienta completa que incluye:
- Simnet de Solana/SVM
- Servidor web para supervisión
- Addons incluidos (svm, stacks, etc.)
- MCP server

### 2.2 Configuración Incorrecta

Los runbooks estaban documentados con el comando incorrecto:

```bash
# INCORRECTO
txtx run deploy-program --environment localnet

# CORRECTO
surfpool run deploy-program --env localnet --browser -f
```

### 2.3 Requisitos de Interacción

El addon `svm::deploy_program` requiere interacción del usuario para firmar transacciones:

1. **Conectar wallet**: El signer `svm::web_wallet` requiere una wallet de Solana conectada
2. **Firmar transacciones**: Cada transacción de deploy requiere firma
3. **Validar variables**: El UI requiere validación manual de variables

Esto significa que los modos `--unsupervised` y `--terminal` NO son adecuados para el deployment inicial.

---

## 3. Solución Implementada

### 3.1 Comando Correcto

```bash
cd sc-solana
surfpool run deploy-program --env localnet --browser -f --port 8488
```

### 3.2 Flujo de Deployment Completo

```bash
# 1. Iniciar surfpool simnet (en terminal separada)
surfpool start

# 2. Compilar programa
anchor build

# 3. Deploy con runbooks (abre UI en http://localhost:8488)
surfpool run deploy-program --env localnet --browser -f --port 8488

# 4. Initialize configuration
surfpool run initialize-config --env localnet --browser -f

# 5. Grant initial roles
surfpool run grant-roles --env localnet --browser -f
```

### 3.3 Pasos en el UI

1. Navegar a `http://localhost:8488`
2. Seleccionar ambiente `localnet`
3. Confirmar selección
4. Validar variables del programa
5. Conectar wallet de Solana
6. Firmar transacciones
7. Esperar completion

### 3.4 Resultado

- ✅ Programa deployado exitosamente
- ✅ Program ID: `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS`
- ✅ Todas las transacciones procesadas
- ✅ Estado guardado en `runbooks/states/deploy/deploy-program.localnet.tx-state.json`

---

## 4. Archivos Modificados

### 4.1 Creados

| Archivo | Descripción |
|---------|-------------|
| [`sc-solana/runbooks/DEPLOYMENT-GUIDE.md`](sc-solana/runbooks/DEPLOYMENT-GUIDE.md) | Guía completa de deployment con troubleshooting |

### 4.2 Modificados

| Archivo | Cambios |
|---------|---------|
| [`sc-solana/runbooks/README.md`](sc-solana/runbooks/README.md) | Actualizado con comandos correctos y sección Quick Start |
| [`sc-solana/runbooks/deployment/deploy-program.tx`](sc-solana/runbooks/deployment/deploy-program.tx) | Configuración del addon svm |
| [`sc-solana/runbooks/deployment/initialize-config.tx`](sc-solana/runbooks/deployment/initialize-config.tx) | Configuración del addon svm |
| [`sc-solana/runbooks/deployment/grant-roles.tx`](sc-solana/runbooks/deployment/grant-roles.tx) | Configuración del addon svm |

---

## 5. Referencias de la Solución

### 5.1 Comandos de Surfpool

```bash
# Ver versión
surfpool --version  # surfpool 1.2.0

# Ver runbooks disponibles
surfpool ls

# Ejecutar runbook con UI browser
surfpool run <runbook> --env <environment> --browser -f --port <puerto>

# Explicar cómo se ejecutará el runbook
surfpool run <runbook> --env <environment> --explain
```

### 5.2 Estructura del Addon SVM

```txtx
// Configuración del addon
addon "svm" {
  network_id = "localnet"
  rpc_api_url = "http://localhost:8899"
}

// Signer con web wallet
signer "deployer" "svm::web_wallet" {
  keypair_path = "~/.config/solana/id.json"
}

// Obtener programa desde proyecto Anchor
variable "program" {
  value = svm::get_program_from_anchor_project(
    "sc-solana",
    "./target/deploy/sc_solana-keypair.json",
    "./target/idl/sc_solana.json",
    "./target/deploy/sc_solana.so"
  )
}

// Deploy del programa
action "deploy" "svm::deploy_program" {
  program = variable.program
  authority = signer.deployer
  payer = signer.deployer
  auto_extend = true
}
```

### 5.3 Funciones del Addon SVM

| Función | Descripción |
|---------|-------------|
| `svm::get_program_from_anchor_project()` | Cargar artefactos del programa desde proyecto Anchor |
| `svm::deploy_program()` | Deployar programa a la red SVM |
| `svm::find_pda()` | Derivar una Program Derived Address |
| `svm::process_instructions()` | Procesar instrucciones en transacción |
| `svm::get_idl_from_path()` | Cargar IDL desde archivo |
| `svm::system_program_id()` | Obtener pubkey del System Program |
| `svm::web_wallet()` | Tipo de signer para wallet-based signing |

---

## 6. Troubleshooting

### 6.1 Error: "addon 'svm' unknown"

**Causa**: Usar `txtx run` en lugar de `surfpool run`

**Solución**:
```bash
# Incorrecto
txtx run deploy-program --env localnet

# Correcto
surfpool run deploy-program --env localnet --browser -f
```

### 6.2 Error: "unsupervised executions should not be generating actions"

**Causa**: El modo `--unsupervised` no soporta interacción de wallet

**Solución**: Usar `--browser` para deployments que requieren signing:
```bash
surfpool run deploy-program --env localnet --browser -f
```

### 6.3 Error: "Address already in use"

**Causa**: Otro proceso usando el puerto 8488

**Solución**: Usar puerto diferente:
```bash
surfpool run deploy-program --env localnet --browser -f --port 8490
```

### 6.4 Estado Cached

**Problema**: El runbook no se ejecuta porque el estado cached indica que ya fue ejecutado

**Solución**: Forzar re-ejecución con `-f`:
```bash
surfpool run deploy-program --env localnet --browser -f
```

O limpiar estado manualmente:
```bash
rm sc-solana/runbooks/states/deploy/*.tx-state.json
```

---

## 7. Verificación Post-Deployment

### 7.1 Verificar Programa Deployado

```bash
curl http://localhost:8899 -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getProgramInfo","args":["CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS"]}'
```

### 7.2 Verificar Estado del Runbook

```bash
cat sc-solana/runbooks/states/deploy/deploy-program.localnet.tx-state.json | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('Name:', d.get('name'))
print('Ended:', d.get('ended_at'))
flows = d.get('flows', {}).get('localnet', {})
cmds = flows.get('commands', {})
executed = [k for k, v in cmds.items() if v.get('executed')]
print('Executed commands:', len(executed))
"
```

### 7.3 Logs de Ejecución

```bash
ls -la .surfpool/logs/
tail -f .surfpool/logs/simnet_*.log
```

---

## 8. Comparación: Native CLI vs Surfpool Runbooks

| Característica | Native CLI (`solana program deploy`) | Surfpool Runbooks |
|----------------|-------------------------------------|-------------------|
| Comando | `solana program deploy` | `surfpool run deploy-program` |
| Wallet signing | Automático | Interactivo via UI |
| State tracking | Ninguno | Archivos JSON |
| Workflows multi-paso | Scripting manual | Runbook chains |
| Account derivation | Manual | Automático via PDAs |
| IDL generation | Manual | Automático desde Anchor |
| Framework | Solana-specific | Multi-chain (SVM) |

---

## 9. Conclusiones

1. **El addon svm de Surfpool funciona correctamente** cuando se usa `surfpool run` en lugar de `txtx run`

2. **El modo `--browser` es requerido** para deployments porque necesita interacción de wallet

3. **La documentación debe ser clara** sobre la diferencia entre `txtx run` y `surfpool run`

4. **Los runbooks de Surfpool son poderosos** pero requieren comprensión del flujo de signing

---

## 10. Checklist de Implementación

- [x] Identificar causa raíz del error "addon 'svm' unknown"
- [x] Documentar diferencia entre `txtx run` y `surfpool run`
- [x] Crear guía de deployment completa
- [x] Actualizar README con comandos correctos
- [x] Verificar deployment exitoso
- [x] Documentar troubleshooting
- [x] Crear referencias de funciones del addon svm
- [x] Documentar verificación post-deployment

---

*Issue creado el 2026-05-06 por Code Mode*
*Resuelto el 2026-05-06 con documentación completa*
