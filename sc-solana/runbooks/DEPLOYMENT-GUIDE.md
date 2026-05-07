# Deployment Guide - SupplyChainTracker with Surfpool/txtx Runbooks

## Overview

This guide documents how to deploy the SupplyChainTracker smart contract to Solana using **Surfpool 1.2.0** and **txtx runbooks** with the **svm addon**.

## Prerequisites

1. **Surfpool Simnet running locally**:
   ```bash
   surfpool start
   ```
   The simnet should be running on `http://localhost:8899` and `ws://localhost:8900`.

2. **Program compiled**:
   ```bash
   cd sc-solana
   anchor build
   ```
   Ensure the following files exist:
   - `./target/deploy/sc_solana.so` - Program binary
   - `./target/deploy/sc_solana-keypair.json` - Program keypair
   - `./target/idl/sc_solana.json` - IDL file

3. **Solana wallet keypair**:
   - Default path: `~/.config/solana/id.json`
   - This account will be used as the deployer/authority

## Deployment Methods

### Method 1: Browser UI (Recommended for First-Time Deployment)

The browser UI mode is required for the first deployment because it handles wallet signing interactively.

```bash
cd sc-solana
surfpool run deploy-program --env localnet --browser -f --port 8488
```

**Steps in the UI:**

1. Navigate to `http://localhost:8488` in your browser
2. Select `localnet` environment
3. Confirm the environment selection
4. Review the variables (program_name, keypair_path, bin_path, idl_path)
5. Validate the variables
6. The `program` variable will be evaluated using `svm::get_program_from_anchor_project()`
7. Review the transaction details
8. Click "Connect Wallet" to connect your Solana wallet
9. Sign the transactions
10. Wait for deployment to complete

**Expected Output:**
- Program deployed at address: `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS`
- Transaction signatures generated
- Slot number recorded

### Method 2: Surfpool MCP Server (Alternative)

If the browser UI is not available, you can use the Surfpool MCP server:

```bash
surfpool mcp &
sleep 5
# Then use the MCP client to interact with the runbooks
```

## Runbook Structure

### deploy-program.tx

```txtx
// Addon configuration for Solana/SVM
addon "svm" {
  network_id = "localnet"
  rpc_api_url = "http://localhost:8899"
}

// Signer configuration
signer "deployer" "svm::web_wallet" {
  description = "Deployer/Authority account for the program"
  keypair_path = "~/.config/solana/id.json"
}

// Program artifacts from Anchor project
variable "program" {
  value = svm::get_program_from_anchor_project(
    "sc-solana",           // program_name
    "./target/deploy/sc_solana-keypair.json",  // keypair_path
    "./target/idl/sc_solana.json",             // idl_path
    "./target/deploy/sc_solana.so"             // bin_path
  )
}

// Deploy the program
action "deploy" "svm::deploy_program" {
  description = "Deploy SupplyChainTracker program to localnet"
  program = variable.program
  authority = signer.deployer
  payer = signer.deployer
  auto_extend = true
}
```

### initialize-config.tx

After deployment, initialize the Config and SerialHashRegistry accounts:

```bash
surfpool run initialize-config --env localnet --browser -f
```

### grant-roles.tx

Grant initial roles to administrators:

```bash
surfpool run grant-roles --env localnet --browser -f
```

## Environment Configuration

The environments are defined in `txtx.yml`:

```yaml
environments:
  localnet:
    network_id: localnet
    rpc_api_url: http://localhost:8899
    ws_url: ws://localhost:8900
    description: Local development network (Surfpool)

  devnet:
    network_id: devnet
    rpc_api_url: https://api.devnet.solana.com
    ws_url: wss://api.devnet.solana.com
    description: Solana devnet for testing

  mainnet:
    network_id: mainnet
    rpc_api_url: https://api.mainnet-beta.solana.com
    ws_url: wss://api.mainnet-beta.solana.com
    description: Solana mainnet production
```

## Troubleshooting

### Issue: "addon 'svm' unknown"

**Cause**: Using `txtx run` instead of `surfpool run`

**Solution**: Always use `surfpool run` for svm addon operations:
```bash
# WRONG
txtx run deploy-program --env localnet

# CORRECT
surfpool run deploy-program --env localnet --browser -f
```

### Issue: "unsupervised executions should not be generating actions"

**Cause**: The `--unsupervised` flag doesn't support interactive signing

**Solution**: Use `--browser` mode for deployments that require signing:
```bash
surfpool run deploy-program --env localnet --browser -f
```

### Issue: "Address already in use"

**Cause**: Another surfpool/txtx process is using the port

**Solution**: Use a different port:
```bash
surfpool run deploy-program --env localnet --browser -f --port 8490
```

### Issue: Program already deployed

**Cause**: State file exists from previous deployment

**Solution**: Force re-execution with `-f` flag:
```bash
surfpool run deploy-program --env localnet --browser -f
```

## State Management

Runbook execution state is stored in:
```
sc-solana/runbooks/states/deploy/<runbook>.<environment>.tx-state.json
```

To reset state:
```bash
rm sc-solana/runbooks/states/deploy/*.tx-state.json
```

## Verification

After deployment, verify the program is deployed:

```bash
curl http://localhost:8899 -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getProgramInfo","args":["CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS"]}'
```

## Complete Deployment Flow

```bash
# 1. Start surfpool simnet (in separate terminal)
surfpool start

# 2. Build the program
cd sc-solana
anchor build

# 3. Deploy with runbooks (browser UI)
surfpool run deploy-program --env localnet --browser -f --port 8488

# 4. Initialize config
surfpool run initialize-config --env localnet --browser -f

# 5. Grant roles
surfpool run grant-roles --env localnet --browser -f
```

## Advanced Operations

### Revoke a Role

```bash
surfpool run revoke-role --env localnet --browser -f \
  --input role="FABRICANTE" \
  --input account_keypair="~/.config/solana/fabricante.json"
```

### Request a Role

```bash
surfpool run request-role --env localnet --browser -f \
  --input role="AUDITOR_HW" \
  --input requester_keypair="~/.config/solana/new_user.json"
```

### Query Netbook State

```bash
surfpool run query-netbook --env localnet --browser -f \
  --input serial_number="SN-001"
```

### Upgrade Program

```bash
# Rebuild the program first
anchor build

# Then upgrade
surfpool run upgrade-program --env localnet --browser -f
```

## Key Differences: Native Solana CLI vs Surfpool Runbooks

| Feature | Native CLI | Surfpool Runbooks |
|---------|-----------|-------------------|
| Deploy command | `solana program deploy` | `surfpool run deploy-program` |
| Wallet signing | Automatic | Interactive via UI |
| State tracking | None | JSON state files |
| Multi-step workflows | Manual scripting | Runbook chains |
| Account derivation | Manual | Automatic via PDAs |
| IDL generation | Manual | Automatic from Anchor |
| Framework | Solana-specific | Multi-chain (SVM-compatible) |

## SVM Addon Functions Reference

The svm addon provides the following key functions:

| Function | Description |
|----------|-------------|
| `svm::get_program_from_anchor_project()` | Load program artifacts from Anchor project |
| `svm::deploy_program()` | Deploy a program to the SVM network |
| `svm::find_pda()` | Derive a Program Derived Address |
| `svm::process_instructions()` | Process multiple instructions in a single transaction |
| `svm::get_idl_from_path()` | Load IDL data from a file path |
| `svm::system_program_id()` | Get the System Program public key |
| `svm::web_wallet()` | Signer type for wallet-based signing |

## Program ID

The SupplyChainTracker program is deployed at:

**`CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS`**

This address is derived from the program keypair and should be consistent across deployments to the same network.
