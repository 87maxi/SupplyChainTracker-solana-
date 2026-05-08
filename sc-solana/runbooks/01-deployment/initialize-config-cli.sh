#!/bin/bash
# Initialize Config - Solana CLI Alternative
# Este script inicializa la configuración de SupplyChainTracker usando
# Solana CLI en lugar de Surfpool, porque Surfpool tiene una limitación
# con PDAs que son simultáneamente 'init' y 'signer' en la misma instrucción.

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Cargar configuración
if [ -z "$PROGRAM_ID" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$SCRIPT_DIR/../../sc-solana/config/config.env" 2>/dev/null || \
    source "$SCRIPT_DIR/../config/config.env" 2>/dev/null || \
    source "../../config/config.env" 2>/dev/null || true
fi

# Keypair del initializer
INITIALIZER_KEYPAIR="${DEPLOYER_KEYPAIR:-$HOME/.config/solana/id.json}"
export INITIALIZER_KEYPAIR
export PROGRAM_ID
export RPC_URL

RPC_URL="${RPC_URL:-http://localhost:8899}"

log_info "Configuración:"
log_info "  PROGRAM_ID: $PROGRAM_ID"
log_info "  RPC_URL: $RPC_URL"
log_info "  INITIALIZER_KEYPAIR: $INITIALIZER_KEYPAIR"
echo ""

# Verificar prerequisitos
if ! command -v python3 &> /dev/null; then
    log_error "python3 no está instalado"
    exit 1
fi

if [ ! -f "$INITIALIZER_KEYPAIR" ]; then
    log_error "Keypair del initializer no encontrado en: $INITIALIZER_KEYPAIR"
    log_info "Creá uno con: solana-keygen new --outfile $INITIALIZER_KEYPAIR"
    exit 1
fi

# Verificar que solders esté instalado
if ! python3 -c "from solders.pubkey import Pubkey" 2>/dev/null; then
    log_error "solders no está instalado"
    log_info "Instalá con: pip3 install solders solana"
    exit 1
fi

export PROGRAM_ID
export RPC_URL

# Ejecutar script Python para derivar PDAs y enviar transacción
python3 << 'PYEOF'
import sys
import os
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.instruction import Instruction, AccountMeta
from solders.message import MessageV0
from solders.transaction import VersionedTransaction
from solana.rpc.api import Client
from solana.rpc.types import TxOpts

PROGRAM_ID = os.environ.get("PROGRAM_ID", "7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN")
RPC_URL = os.environ.get("RPC_URL", "http://localhost:8899")
INITIALIZER_KEYPAIR_PATH = os.environ.get("INITIALIZER_KEYPAIR", os.path.expanduser("~/.config/solana/id.json"))

# Discriminador de Anchor para initialize: sha256("global:initialize")[:8]
INIT_DISCRIMINATOR = b'\xaf\xaf\x6d\x1f\x0d\x98\x9b\xed'

def derive_pda(program_id, seeds):
    """Deriva un PDA desde program_id y seeds."""
    pid = Pubkey.from_string(program_id)
    pda, bump = Pubkey.find_program_address(seeds, pid)
    return str(pda), bump

def main():
    # Cargar keypair del initializer
    try:
        with open(INITIALIZER_KEYPAIR_PATH, 'r') as f:
            import json
            secret_bytes = json.load(f)
        initializer = Keypair.from_bytes(bytes(secret_bytes))
    except Exception as e:
        print(f"[ERROR] No se pudo cargar keypair: {e}")
        sys.exit(1)
    
    initializer_pubkey = str(initializer.pubkey())
    print(f"[INFO] Initializer: {initializer_pubkey}")
    
    # Derivar PDAs
    print("\n[INFO] Derivando PDAs...")
    
    # Config PDA: seeds = [b"config"]
    config_address, config_bump = derive_pda(PROGRAM_ID, [b"config"])
    print(f"  Config:      {config_address} (bump: {config_bump})")
    
    # Serial Hashes PDA: seeds = [b"serial_hashes", config_key]
    serial_hashes_address, serial_hashes_bump = derive_pda(
        PROGRAM_ID, 
        [b"serial_hashes", bytes(Pubkey.from_string(config_address))]
    )
    print(f"  Serial Hash: {serial_hashes_address} (bump: {serial_hashes_bump})")
    
    # Admin PDA: seeds = [b"admin", config_key]
    admin_address, admin_bump = derive_pda(
        PROGRAM_ID,
        [b"admin", bytes(Pubkey.from_string(config_address))]
    )
    print(f"  Admin:       {admin_address} (bump: {admin_bump})")
    
    # Verificar balance del initializer
    print("\n[INFO] Verificando balance...")
    client = Client(RPC_URL)
    
    try:
        balance_resp = client.get_balance(initializer.pubkey())
        balance_sol = balance_resp.value / 10**9
        print(f"  Balance: {balance_sol} SOL")
        
        if balance_sol < 0.1:
            print("  [WARN] Balance bajo. Intentando airdrop de 5 SOL...")
            try:
                airdrop_resp = client.request_airdrop(initializer.pubkey(), 5 * 10**9)
                signature = airdrop_resp.value
                print(f"  Airdrop enviado: {signature}")
                client.confirm_transaction(signature)
                print("  [SUCCESS] Airdrop confirmado")
            except Exception as e:
                print(f"  [ERROR] Airdrop falló: {e}")
                print("  Continuá con: solana airdrop 5 <YOUR_PUBKEY> --url $RPC_URL")
                sys.exit(1)
    except Exception as e:
        print(f"  [WARN] No se pudo conectar a {RPC_URL}: {e}")
        sys.exit(1)
    
    # Obtener blockhash reciente
    print("\n[INFO] Obteniendo blockhash reciente...")
    latest_blockhash_resp = client.get_latest_blockhash()
    if latest_blockhash_resp.value is None:
        print("[ERROR] No se pudo obtener blockhash")
        sys.exit(1)
    blockhash = str(latest_blockhash_resp.value.blockhash)
    print(f"  Blockhash: {blockhash}")
    
    # Construir transacción
    print("\n[INFO] Construyendo transacción...")
    
    program_id = Pubkey.from_string(PROGRAM_ID)
    config_pk = Pubkey.from_string(config_address)
    serial_hashes_pk = Pubkey.from_string(serial_hashes_address)
    admin_pk = Pubkey.from_string(admin_address)
    system_program = Pubkey.from_string("11111111111111111111111111111111")
    
    # Accounts para la instrucción initialize
    # Order: config, serial_hash_registry, admin, initializer, system_program
    # NOTE: AccountMeta usa args posicionales: AccountMeta(pubkey, signer, writable)
    accounts = [
        AccountMeta(config_pk, False, True),       # config (writable)
        AccountMeta(serial_hashes_pk, False, True), # serial_hash_registry (writable)
        AccountMeta(admin_pk, True, True),          # admin (PDA signer, writable)
        AccountMeta(initializer.pubkey(), True, True),  # initializer (payer, signer, writable)
        AccountMeta(system_program, False, False),      # system_program
    ]
    
    initialize_instruction = Instruction(
        program_id,
        accounts,
        INIT_DISCRIMINATOR,
    )
    
    # Construir mensaje usando MessageV0
    # MessageV0.try_compile requiere: payer, instructions, blockhash (str), address_table_lookups
    try:
        message = MessageV0.try_compile(
            initializer.pubkey(),
            [initialize_instruction],
            blockhash,
            []
        )
    except Exception as e:
        print(f"  [WARN] MessageV0.try_compile falló: {e}")
        print("  Intentando con Message simple...")
        from solders.message import Message
        message = MessageV0.try_compile(
            initializer.pubkey(),
            [initialize_instruction],
            blockhash,
            []
        )
    
    # Crear y firmar transacción
    tx = VersionedTransaction(message, [initializer])
    
    print(f"  Instrucción: initialize")
    print(f"  Accounts: 5")
    print(f"  Signers: 2 (admin PDA, initializer)")
    print(f"  Data: {INIT_DISCRIMINATOR.hex()}")
    
    # Enviar transacción
    print("\n[INFO] Enviando transacción...")
    try:
        send_resp = client.send_transaction(
            tx,
            opts=TxOpts(skip_preflight=False, preflight_commitment="confirmed"),
        )
        signature = str(send_resp.value)
        print(f"\n{'='*60}")
        print(f"[SUCCESS] ¡Transacción enviada!")
        print(f"  Signature: {signature}")
        print(f"{'='*60}")
        print(f"\nVerificar con:")
        print(f"  solana transaction --signature {signature} --url {RPC_URL}")
        print(f"\nO con curl:")
        print(f"  curl -s -X POST -H \"Content-Type: application/json\" -d '{{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getTransaction\",\"params\":[\"{signature}\",{{\"encoding\":\"json\"}}]}}' {RPC_URL}")
        
    except Exception as e:
        print(f"\n[ERROR] No se pudo enviar transacción: {e}")
        print("\n[INFO] Esto puede deberse a:")
        print("  1. El test validator no está corriendo en " + RPC_URL)
        print("  2. El programa no está desplegado con el program_id correcto")
        print("  3. La cuenta ya fue inicializada previamente")
        print("\nSoluciones:")
        print("  1. Iniciar test validator:")
        print(f"     solana-test-validator --ledger /tmp/test-ledger --bpf-program {PROGRAM_ID} ./target/deploy/sc_solana.so --rpc-port 8999")
        print("\n  2. O usar Anchor tests (recomendado para desarrollo):")
        print("     cd sc-solana && anchor test")
        sys.exit(1)

if __name__ == "__main__":
    main()
PYEOF

log_success "=== Inicialización completada ==="
echo ""
echo "Próximos pasos:"
echo "  1. Verificar la inicialización:"
echo "     curl -s -X POST -H \"Content-Type: application/json\" -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getAccountInfo\",\"params\":[\"CONFIG_ADDRESS\",{\"encoding\":\"json\"}]}\" $RPC_URL | jq"
echo ""
echo "  2. Ejecutar runbooks de role management con Surfpool:"
echo "     cd sc-solana && surfpool run add-role-holder --env localnet"
echo ""
echo "  3. O usar Anchor tests para el workflow completo:"
echo "     cd sc-solana && anchor test"
