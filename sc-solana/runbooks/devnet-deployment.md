# Devnet Deployment Runbook - SupplyChainTracker

## Overview

This runbook provides step-by-step instructions for deploying the SupplyChainTracker smart contract to Solana Devnet. Devnet is recommended for pre-production testing with free testnet SOL.

**Program ID**: `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS`
**Network**: Solana Devnet
**RPC Endpoint**: `https://api.devnet.solana.com`

## Prerequisites

1. **Solana CLI installed**
   ```bash
   solana --version
   # Should be 1.18+ recommended
   ```

2. **Anchor CLI installed**
   ```bash
   anchor --version
   # Should be 0.30+ for modern deployment
   ```

3. **Devnet SOL**
   - Obtain testnet SOL from [Solana Faucet](https://faucet.solana.com/)
   - Request at least 2-5 SOL for deployment costs
   - Enter your wallet address and select "devnet"

4. **Wallet Keypair**
   - Default path: `~/.config/solana/id.json`
   - Or set custom path: `export SCOLANA_KEYPAIR_PATH=/path/to/your/keypair.json`

## Step 1: Environment Setup

```bash
# Set environment variables
export CLUSTER=devnet
export SCOLANA_KEYPAIR_PATH="${HOME}/.config/solana/id.json"

# Verify wallet address
solana address -k "$SCOLANA_KEYPAIR_PATH"

# Check balance
solana balance -k "$SCOLANA_KEYPAIR_PATH"
```

## Step 2: Build the Program

```bash
cd sc-solana

# Clean previous builds
anchor clean

# Build in release mode
anchor build --release

# Verify build artifacts
ls -la target/deploy/sc-solana.so
ls -la target/deploy/sc-solana-keypair.json
ls -la target/idl/sc_solana.json
ls -la target/types/sc_solana.ts
```

## Step 3: Deploy Using deploy.sh

### Option A: Automated Deployment (Recommended)

```bash
cd sc-solana

# Run full deployment pipeline
CLUSTER=devnet ./deploy.sh full
```

This will:
1. Check prerequisites
2. Build the program
3. Generate IDL
4. Deploy to devnet
5. Verify deployment

### Option B: Step-by-Step Deployment

```bash
cd sc-solana

# 1. Check prerequisites
./deploy.sh prerequisites

# 2. Build
./deploy.sh build

# 3. Generate IDL
./deploy.sh idl

# 4. Deploy to devnet
CLUSTER=devnet ./deploy.sh deploy

# 5. Verify deployment
CLUSTER=devnet ./deploy.sh verify
```

### Option C: Deploy with Fixed Program ID

If you need to deploy with the existing program ID:

```bash
CLUSTER=devnet ./deploy.sh deploy:fixed
```

## Step 4: Verify Deployment

```bash
# Check program deployment
solana program show CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS --cluster devnet

# Expected output:
# Program Id: CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS
# Owner: ...
# Slot: ...
# Lamports: ...
```

## Step 5: Initialize Config

After deployment, initialize the supply chain config:

```bash
cd sc-solana

# Using the initialize script
CLUSTER=devnet ts-node scripts/initialize.ts

# Or using deploy.sh with custom commands
CLUSTER=devnet ./deploy.sh info
```

## Step 6: Grant Roles

Grant initial roles to deployment addresses:

```bash
cd sc-solana

# Grant admin role (automatic on initialization)
# Grant manufacturer role
CLUSTER=devnet ts-node scripts/grant-roles.ts --role FABRICANTE --account <manufacturer_address>

# Grant auditor role
CLUSTER=devnet ts-node scripts/grant-roles.ts --role AUDITOR_HW --account <auditor_address>

# Grant software technician role
CLUSTER=devnet ts-node scripts/grant-roles.ts --role TECNICO_SW --account <technician_address>

# Grant school role
CLUSTER=devnet ts-node scripts/grant-roles.ts --role ESCUELA --account <school_address>
```

## Step 7: Test Deployment

Run integration tests against devnet:

```bash
cd sc-solana

# Run lifecycle tests
CLUSTER=devnet anchor test --provider.cluster devnet

# Or run specific test suites
CLUSTER=devnet anchor test --test lifecycle --provider.cluster devnet
CLUSTER=devnet anchor test --test role-management --provider.cluster devnet
```

## Step 8: Update Frontend Configuration

Update the frontend to point to devnet:

```bash
cd web

# Update .env.local or environment variables
# NEXT_PUBLIC_SOLANA_NETWORK=devnet
# NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
# NEXT_PUBLIC_PROGRAM_ID=CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS
```

## Troubleshooting

### Insufficient Balance

```bash
# Check current balance
solana balance --cluster devnet

# Request more SOL from faucet
# Visit: https://faucet.solana.com/
```

### Program Already Deployed

```bash
# Check if program exists
solana program show CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS --cluster devnet

# If you need to upgrade (must use same program ID)
CLUSTER=devnet ./deploy.sh deploy:fixed
```

### Connection Errors

```bash
# Test connection to devnet
solana ping --cluster devnet

# Check RPC endpoint
curl -X POST https://api.devnet.solana.com -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

### Deployment Failed

```bash
# Check deploy.sh logs
CLUSTER=devnet ./deploy.sh info

# Verify program binary exists
ls -la target/deploy/sc-solana.so

# Rebuild and retry
anchor clean && anchor build --release
CLUSTER=devnet ./deploy.sh deploy
```

## Post-Deployment Checklist

- [ ] Program deployed successfully on devnet
- [ ] Config initialized
- [ ] All roles granted to appropriate accounts
- [ ] Integration tests passing
- [ ] Frontend connected to devnet
- [ ] Test netbook registration working
- [ ] Hardware audit flow tested
- [ ] Software validation flow tested
- [ ] Student assignment flow tested

## Devnet Environment Variables

```bash
# Copy to .env.local in web/
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS
```

## Cleanup

After testing on devnet, you can:
- Leave the program deployed (no cost for keeping programs on-chain)
- Create new role assignments for testing
- Reset state by creating new config (requires new program deployment)
