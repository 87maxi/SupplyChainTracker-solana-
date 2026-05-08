# Initialize Config Runbook - Guía de Uso

## Resumen

Este runbook inicializa la configuración del sistema de supply chain, creando:
- **Config PDA**: Almacena las autoridades de cada rol (fabricante, auditor_hw, tecnico_sw, escuela)
- **Serial Hash Registry PDA**: Registro de hashes de seriales para anti-falsificación
- **Admin PDA**: Autoridad derivada como PDA para el sistema REBC (Role-Based Access Control)

## PDAs Derivadas

| Cuenta | Seeds | Bump |
|--------|-------|------|
| Config | `[b"config"]` | Derivado |
| Serial Hash Registry | `[b"serial_hashes", config.key()]` | Derivado |
| Admin | `[b"admin", config.key()]` | Derivado |

## Problema con Surfpool

El runbook `initialize-config.tx` falla en Surfpool con el error:

```
thread 'Runbook Runloop' panicked at 
  .../txtx-addon-network-svm-0.3.21/src/codec/instruction.rs:117:60:
  data not found
```

**Causa**: Surfpool no puede procesar instrucciones donde una PDA es simultáneamente `init` y `signer`. El admin PDA requiere este patrón para el sistema REBC.

**Estado**: Limitación conocida de `txtx-addon-network-svm` v0.3.21, existe tanto en Surfpool 1.2.0 como 1.2.1.

## Soluciones Disponibles

### Opción 1: Script de Solana CLI (Recomendado para localnet)

Usar el script `initialize-config-cli.sh` que deriva las PDAs y envía la transacción directamente:

```bash
cd sc-solana
source config/config.env
bash runbooks/01-deployment/initialize-config-cli.sh
```

**Requisitos**:
- `solana` CLI instalado
- `python3` con `solders` y `solana` packages: `pip3 install solders solana`
- Test validator corriendo en `localhost:8999`
- Keypair del initializer en `$DEPLOYER_KEYPAIR` (default: `~/.config/solana/id.json`)

**Qué hace el script**:
1. Verifica prerequisitos
2. Deriva las 3 PDAs (config, serial_hashes, admin)
3. Verifica balance y hace airdrop si es necesario
4. Construye y envía la transacción de initialize
5. Muestra la signature para verificar

### Opción 2: Anchor Tests

Los tests de Anchor funcionan correctamente porque bypassean la limitación de txtx:

```bash
cd sc-solana
anchor test
```

Los tests en [`tests/role-management.ts`](../../tests/role-management.ts) y [`tests/sc-solana.ts`](../../tests/sc-solana.ts) inicializan el config automáticamente.

### Opción 3: Script Python Directo

Si el script bash no funciona, usar Python directamente:

```bash
cd sc-solana
source config/config.env

python3 << EOF
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.transaction import VersionedTransaction
from solders.instruction import Instruction
from solders.message import MessageV0
from solana.rpc.api import Client
from solana.rpc.types import TxOpts
import json

# Config
PROGRAM_ID = "$PROGRAM_ID"
RPC_URL = "http://localhost:8999"
KEYPAIR_PATH = "$DEPLOYER_KEYPAIR"

# Cargar keypair
with open(KEYPAIR_PATH, 'r') as f:
    initializer = Keypair.from_bytes(bytes(json.load(f)))

# Derivar PDAs
config_addr, config_bump = Pubkey.find_program_address([b"config"], Pubkey.from_string(PROGRAM_ID))
admin_addr, admin_bump = Pubkey.find_program_address(
    [b"admin", bytes(config_addr)], 
    Pubkey.from_string(PROGRAM_ID)
)
serial_addr, serial_bump = Pubkey.find_program_address(
    [b"serial_hashes", bytes(config_addr)], 
    Pubkey.from_string(PROGRAM_ID)
)

print(f"Config: {config_addr} (bump: {config_bump})")
print(f"Admin: {admin_addr} (bump: {admin_bump})")
print(f"Serial: {serial_addr} (bump: {serial_bump})")

# Discriminador de initialize
DISCRIMINATOR = bytes([175, 175, 109, 31, 13, 152, 155, 237])

# Construir transacción
client = Client(RPC_URL)
blockhash = client.get_latest_blockhash().value.blockhash

ix = Instruction(
    program_id=Pubkey.from_string(PROGRAM_ID),
    accounts=[
        (config_addr, False),
        (serial_addr, False),
        (admin_addr, True),
        (initializer.pubkey(), True),
        (Pubkey.from_string("11111111111111111111111111111111"), False),
    ],
    data=DISCRIMINATOR,
)

msg = MessageV0.try_compile(initializer.pubkey(), [ix], blockhash, [])
tx = VersionedTransaction(msg, [initializer])

resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=False))
print(f"Signature: {resp.value}")
EOF
```

## Verificación

Después de inicializar con cualquiera de los métodos, verificar:

```bash
# Obtener address del config
CONFIG_ADDRESS=$(python3 -c "
from solders.pubkey import Pubkey
pda, _ = Pubkey.find_program_address([b'config'], Pubkey.from_string('$PROGRAM_ID'))
print(pda)
")

# Consultar account info
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["'"$CONFIG_ADDRESS"'",{"encoding":"jsonParsed"}]}' \
  http://localhost:8999 | jq
```

Output esperado:
```json
{
  "result": {
    "value": {
      "data": {
        "parsed": { ... },
        "type": "raw"
      },
      "lamports": 8908160,
      "owner": "7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN",
      "rentEpoch": ...,
      "space": 289
    }
  }
}
```

**Nota**: El space debe ser **289 bytes** (8 header + 281 data con admin_pda_bump).

## Próximos Pasos

Una vez inicializado el config:

### Con Surfpool (runbooks de role management)

```bash
cd sc-solana

# Listar roles disponibles
surfpool ls

# Agregar role holder
surfpool run add-role-holder --env localnet -f

# Grant role
surfpool run grant-role --env localnet -f

# Query config
surfpool run query-config --env localnet -f
```

### Con Anchor Tests (workflow completo)

```bash
cd sc-solana
anchor test --skip-build

# Tests específicos
anchor test --skip-build -- --test role_management
anchor test --skip-build -- --test role-enforcement
```

## Estado Actual

| Componente | Estado |
|------------|--------|
| Programa compilado | ✅ |
| IDL generado | ✅ |
| PDAs implementadas | ✅ |
| Deploy con Surfpool | ✅ |
| **Initialize con Surfpool** | ❌ Limitación txtx |
| **Initialize con CLI** | ✅ Workaround disponible |
| Role management con Surfpool | ✅ (post-inicialización) |
| Anchor tests | ✅ |

## Referencias

- [Runbooks README](../README.md) - Documentación principal con SVM functions y known issues
- [Surfpool Repository](https://github.com/solana-foundation/surfpool)
- [txtx Framework](https://github.com/txtx/txtx)
- [Solana PDAs](https://solana.com/docs/core/cpi#program-derived-addresses)

---

*Actualizado: 2026-05-07*  
*Versión Surfpool: 1.2.0*  
*Versión txtx-addon-network-svm: 0.3.21*
