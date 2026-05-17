# Análisis Profundo: SurfPool Infrastructure as Code (IaC)

> **Fuente:** https://docs.surfpool.run/iac
> **Fecha de análisis:** 2026-05-17
> **Proyecto:** SupplyChainTracker-solana

---

## 1. Visión General

SurfPool introduce **Infrastructure as Code (IaC)** al ecosistema Solana, permitiendo despliegues **reproducibles, seguros y automatizados** con mínima sobrecarga. Aunque la simulación es una característica central de SurfPool, el sistema IaC subyacente es igualmente crítico para apoyar flujos de trabajo modernos de desarrollo Solana.

### Filosofía de diseño
- **Drop-in replacement** para `solana-test-validator`
- **Mainnet Forking**: Clona accounts, programas y balances de Mainnet
- **Local-first**: Desarrollo local con datos reales de Mainnet
- **Transición suave** a mainnet mediante actualizaciones de configuración

---

## 2. Tres Categorías de Componentes IaC

### 2.1 Onchain Infrastructure
- Despliegue de **Solana Programs**
- **Upgrades** de programas
- **State migrations**

Un sistema IaC bien estructurado asegura que estas acciones sean reproducibles, versionadas y auditables.

### 2.2 Signing Infrastructure
En lugar de depender de keypairs locales (riesgo de seguridad), el sistema soporta:
- **Hardware wallets**
- **Threshold cryptography**
- **Multisig wallets** (ej: Squads multisig)
- **Signers modulares**: Transición de keypair a multisig actualizando solo configuración

### 2.3 Offchain Infrastructure
- **Indexers**
- **State watchers**
- **Wallet sentinels**
- **Automation scripts**

> **Nota:** SurfPool IaC **excluye** RPC y node provisioning (cubiertos por Terraform, Ansible, etc.)

---

## 3. Principios de Diseño del Lenguaje

### Web3 Runbooks
El motor IaC está powered por **Web3 Runbooks**, un DSL (Domain-Specific Language) llamado **txtx**.

#### Principios clave
| Principio | Descripción |
|-----------|-------------|
| **Declarative syntax** | No JS DSLs, no shell scripts imperativos |
| **Composable structure** | Runbooks modulares y reutilizables |
| **Minimal learning curve** | Curva de aprendizaje baja |
| **Separation of concerns** | Infraestructura separada de lógica |

#### Static Analysis
Los desarrolladores pueden producir un **execution plan** incluyendo:
- Programas involucrados
- Signers esperados
- Accounts touchados
- Costos estimados

**Sin ejecutar el código.**

---

## 4. Sintaxis txtx - Referencia Completa

### 4.1 Variables

```txtx
variable "my_var" {
  description = "Enter your birthday"
  value       = "MM/DD/YYYY"
  editable    = true  // false = readonly en Web UI
}
```

- `editable = false` (default): aparece como readonly en Web UI
- `editable = true`: campo editable en Web UI
- Campo `description` opcional para contexto

### 4.2 Manifest & CLI Inputs

Inputs pueden provenir de CLI o de un archivo `txtx.yml`:

```yaml
---
name: protocol-deployment
runbooks:
  - name: Deploy Protocol
    description: This runbook deploys the protocol.
    location: ./deployment
environments:
  development:
    network_id: localnet
    rpc_api_url: http://localhost:8899
  devnet:
    network_id: devnet
    rpc_api_url: https://api.devnet.solana.com
  mainnet:
    network_id: mainnet
    rpc_api_url: https://api.mainnet-beta.solana.com
```

Los inputs `input.network_id` y `input.rpc_api_url` están disponibles en scope global.

### 4.3 State Management

SurfPool puede gestionar **state entre ejecuciones**:
- Detecta cambios en código del contrato o inputs del Runbook
- **Previene re-ejecución** si no hay cambios

```yaml
runbooks:
  - name: Deploy Protocol
    location: ./deployment
    state:
      location: states
```

### 4.4 Addons & Defaults

Los **addon blocks** especifican qué addons usa el Runbook:

```txtx
addon "svm" {
  network_id  = input.network_id
  rpc_api_url = input.rpc_api_url
}
```

Con este default, las acciones del addon SVM pueden omitir `network_id` y `rpc_api_url`.

### 4.5 Flows

Los **Flows** permiten ejecutar un Runbook múltiples veces con diferentes inputs:

```txtx
flow "solana" {
  rpc_api_url = "https://api.mainnet-beta.solana.com"
}

flow "eclipse" {
  rpc_api_url = "https://mainnetbeta-rpc.eclipse.xyz"
}

addon "svm" {
  network_id  = "mainnet"
  rpc_api_url = flow.rpc_api_url
}
```

### 4.6 Signers

Los signers definen cómo se firman las transacciones:

```txtx
signer "alice" "svm::web_wallet" {
  expected_address = input.expected_address
}

action "my_tx" "svm::process_instructions" {
  instruction data
  signers = [signer.alice]
}
```

#### Tipos de Signers disponibles
| Signer | Uso |
|--------|-----|
| `svm::secret_key` | Mnemonic o secret key |
| `svm::web_wallet` | Web wallet con prompt en Web UI |
| `svm::squads` | Multisig vault con Squads |
| Secure enclave | Signers asíncronos |

### 4.7 Actions

Las **actions** son constructs multi-propósito definidos por addons y standard library:

```txtx
action "deploy_hello_world" "svm::deploy_program" {
  description = "Deploy the hello_world program"
  program     = svm::get_program_from_anchor_project("hello_world")
  authority   = signer.authority
  payer       = signer.payer
}
```

### 4.8 Outputs

```txtx
output "my_output" {
  description = "An example output. I hope it equals 8."
  value       = 4 + 4
}
```

### 4.9 Modules

> **Coming soon.**

---

## 5. Standard Library - Funciones

### 5.1 Operadores Aritméticos

```txtx
output "add_some_more" {
  value = variable.one + variable.two
}

output "add_uint" {
  value = add_uint(variable.addem_up + variable.one, variable.two)
}
```

### 5.2 Hash Functions

```txtx
output "sha256" {
  value = std::sha256("hello")
}

output "keccak256" {
  value = std::keccak256("hello")
}
```

### 5.3 Hex Functions

```txtx
// Encode to hex
output "encoded" {
  value = std::encode_hex("Hello")
}
// > encoded: 0x48656c6c6f

// Decode from hex
output "decoded" {
  value = std::decode_hex("0x48656c6c6f")
}
// > decoded: Hello
```

### 5.4 Base58 Functions

```txtx
// Encode to base58
output "encoded" {
  value = std::encode_base58("Hello")
}

// Decode from base58
output "decoded" {
  value = std::decode_base58("5WJbMvMzGkq")
}
```

### 5.5 Base64 Functions

```txtx
// Encode to base64
output "encoded" {
  value = std::encode_base64("Hello world!")
}
// > encoded: SGVsbG8gd29ybGQh

// Decode from base64
output "decoded" {
  value = std::decode_base64("SGVsbG8gd29ybGQh")
}
// > decoded: 0x48656c6c6f20776f726c6421
```

### 5.6 JSON Functions

```txtx
// Query JSON with jq syntax
output "message" {
  value = std.jq("{\"message\": \"Hello world!\"}", ".message")
}
```

### 5.7 List Functions

```txtx
// Get element at index
output "entry" {
  value = std.index(['a', 'b', 'c'], 1)  // Returns 'b'
}
```

### 5.8 Assertion Functions

```txtx
output "check_eq" {
  value = std.assert_eq(action.example.result, 1)
}

output "check_ne" {
  value = std.assert_ne(action.example.result, 0)
}

output "check_gt" {
  value = std.assert_gt(action.example.result, 0)
}

output "check_lt" {
  value = std.assert_lt(action.example.result, 100)
}
```

### 5.9 Crypto Functions

Funciones criptográficas adicionales disponibles en `iac/std/functions/crypto`.

---

## 6. Cheatcodes - RPC Methods

SurfPool incluye **cheatcodes** poderosos para manipulación de estado en testing:

### 6.1 Account Manipulation

| Cheatcode | Descripción |
|-----------|-------------|
| `surfnet_setAccount` | Modifica balance, data, owner de una cuenta |
| `surfnet_setTokenAccount` | Modifica token account (balance, delegate, state) |
| `surfnet_resetAccount` | Resetea cuenta a estado original desde datasource remoto |
| `surfnet_cloneProgramAccount` | Clona cuenta de programa a otro program ID |
| `surfnet_offlineAccount` | Previene descarga de cuenta desde RPC remoto |
| `surfnet_streamAccount` | Register account para streaming desde datasource |

### 6.2 Program Management

| Cheatcode | Descripción |
|-----------|-------------|
| `surfnet_writeProgram` | Escribe data de programa en offset (deploy chunks) |
| `surfnet_setProgramAuthority` | Setea/remueve upgrade authority de programa |
| `surfnet_registerIdl` | Registra IDL para parsing de account data |
| `surfnet_getActiveIdl` | Obtiene IDL activa para un programa |

### 6.3 State Manipulation

| Cheatcode | Descripción |
|-----------|-------------|
| `surfnet_setSupply` | Configura supply de red (total, circulating, non-circulating) |
| `surfnet_registerScenario` | Registra scenario con overrides de accounts |
| `surfnet_timeTravel` | Salta en el tiempo (epoch, slot, timestamp) |
| `surfnet_pauseClock` | Pausa progreso del clock |
| `surfnet_resumeClock` | Reanuda block production |

### 6.4 Transaction Profiling

| Cheatcode | Descripción |
|-----------|-------------|
| `surfnet_profileTransaction` | Profilea transaction (CUs, accounts, logs) |
| `surfnet_getTransactionProfile` | Obtiene profile de transaction por signature/UUID |
| `surfnet_getProfileResultsByTag` | Obtiene profiles por tag |
| `surfnet_getLocalSignatures` | Obtiene signatures locales |

### 6.5 Snapshot & Export

| Cheatcode | Descripción |
|-----------|-------------|
| `surfnet_exportSnapshot` | Exporta snapshot de todas las accounts |

### 6.6 Cheatcode Control

| Cheatcode | Descripción |
|-----------|-------------|
| `surfnet_enableCheatcode` | Re-activa cheatcodes deshabilitados |
| `surfnet_disableCheatcode` | Desactiva cheatcodes (no se pueden deshabilitar a sí mismos sin `lockout=true`) |

---

## 7. Integración con el Proyecto SupplyChainTracker

### 7.1 Estado Actual del Proyecto

El proyecto ya tiene:
- ✅ **Runbooks en txtx** en `sc-solana/runbooks/01-deployment/` y `02-operations/`
- ✅ **Archivos `.tx`** para operaciones (initialize-config, deploy-program, grant-roles, etc.)
- ✅ **Keypairs** en `config/keypairs/` y `sc-solana/config/keypairs/`
- ✅ **Testing con Mollusk/LiteSVM** para tests unitarios
- ✅ **Playwright E2E** con MockWalletAdapter

### 7.2 Oportunidades de Integración con SurfPool IaC

#### 7.2.1 Unificación de Runbooks
Los runbooks actuales en formato `.tx` podrían migrarse o integrarse con el sistema txtx de SurfPool para:
- **Multi-environment deployment** (localnet → devnet → mainnet)
- **State management** automático entre ejecuciones
- **Flow-based testing** (ejecutar mismo runbook en múltiples redes)

#### 7.2.2 Signing Infrastructure
El proyecto usa keypairs locales. SurfPool soporta:
- `svm::web_wallet` para signing via Web UI
- `svm::squads` para multisig (crítico para producción)
- `svm::secret_key` para CI/CD

**Recomendación:** Implementar signers modulares para transición suave de dev a prod.

#### 7.2.3 Cheatcodes para Testing Avanzado
Los cheatcodes permiten:
- **Simular estados de Mainnet** localmente
- **Time travel** para testing de epochs
- **Account cloning** para escenarios de prueba
- **Transaction profiling** para optimización de CUs

#### 7.2.4 Standard Library para Validación
Las funciones del standard library (`std::assert_eq`, `std::sha256`, etc.) pueden usarse en runbooks para:
- Validar resultados de despliegue
- Verificar discriminadores de accounts
- Calcular hashes de serial numbers (PII protection)

### 7.3 Comparativa: Runbooks Actuales vs SurfPool IaC

| Característica | Actual (.tx custom) | SurfPool IaC (txtx) |
|----------------|---------------------|---------------------|
| Sintaxis | Custom DSL | txtx DSL (estándar) |
| Multi-env | Manual (env files) | `environments` en yaml |
| State Management | No | Automático |
| Signers | Keypairs hardcoded | Modular (web_wallet, squads) |
| Cheatcodes | No | 20+ RPC methods |
| Flows | No | Multi-network execution |
| Static Analysis | No | Execution plan preview |
| Web UI | No | Dashboard integrado |

---

## 8. Recomendaciones de Acción

### 8.1 Corto Plazo
1. **Evaluar** si migrar runbooks `.tx` existentes al formato txtx de SurfPool
2. **Probar** cheatcodes para testing de netbook lifecycle
3. **Integrar** `surfnet_profileTransaction` para optimización de CUs

### 8.2 Mediano Plazo
1. **Implementar** signers modulares (web_wallet → squads)
2. **Configurar** multi-environment deployment con `txtx.yml`
3. **Explorar** state management para despliegues incrementales

### 8.3 Largo Plazo
1. **Unificar** runbooks de testing con SurfPool IaC
2. **Implementar** flows para testing multi-network
3. **Adoptar** Squads multisig para producción

---

## 9. Recursos Adicionales

- **Website:** https://surfpool.run
- **Docs:** https://docs.surfpool.run
- **GitHub:** https://github.com/txtx/surfpool
- **Discord:** https://discord.gg/rqXmWsn2ja
- **LLM Docs:** https://docs.surfpool.run/llms.txt

---

## 10. Conclusión

SurfPool IaC representa una evolución significativa para el desarrollo de programas Solana. Su enfoque en:
- **Declarative syntax** (txtx DSL)
- **Signing modular** (hardware wallets, multisig)
- **Cheatcodes poderosos** (manipulación de estado)
- **Multi-environment** (localnet → mainnet)

...lo convierte en una herramienta estratégica para el proyecto SupplyChainTracker, especialmente para:
1. **Testing avanzado** con cheatcodes y scenarios
2. **Despliegues seguros** con signers modulares
3. **Reproducibilidad** con state management y flows

La integración requeriría inversión inicial pero proporcionaría beneficios significativos en seguridad, mantenibilidad y productividad.
