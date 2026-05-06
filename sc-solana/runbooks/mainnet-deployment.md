# Mainnet Deployment Runbook - SupplyChainTracker

## Overview

This runbook provides step-by-step instructions for deploying the SupplyChainTracker smart contract to Solana Mainnet Beta. **WARNING**: Mainnet deployment requires real SOL and careful planning.

**Program ID**: `CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS`
**Network**: Solana Mainnet Beta
**RPC Endpoint**: `https://api.mainnet-beta.solana.com`

## ⚠️ Pre-Deployment Requirements

### Critical Checklist

Before deploying to mainnet, ensure ALL of the following are complete:

- [ ] **Code Audit**: Smart contract audited by reputable security firm
- [ ] **Devnet Testing**: All tests passing on devnet for minimum 7 days
- [ ] **Testnet Testing**: All tests passing on testnet (if available)
- [ ] **Bug Bounty**: Bug bounty program launched (optional but recommended)
- [ ] **Backup Keys**: Multiple secure backups of deployer keypair
- [ ] **Multi-sig Setup**: Consider using multi-signature wallet for deployment
- [ ] **Emergency Plan**: Rollback and emergency procedures documented
- [ ] **Insurance**: Adequate SOL balance for deployment and emergency operations

### Estimated Costs

| Item | Estimated SOL |
|------|---------------|
| Program Deployment | 0.5 - 2 SOL |
| Config Initialization | 0.1 - 0.3 SOL |
| Role Grants (4 roles) | 0.2 - 0.5 SOL |
| Reserve Buffer | 2 - 5 SOL |
| **Total Recommended** | **5 - 10 SOL** |

## Step 1: Security Verification

```bash
# Verify program binary matches expected hash
sha256sum target/deploy/sc-solana.so

# Record the hash for verification after deployment
echo "Program hash: $(sha256sum target/deploy/sc-solana.so)" > program-hash.txt

# Verify IDL matches source
cat target/idl/sc_solana.json | jq '.version'
```

## Step 2: Mainnet Environment Setup

```bash
# Set environment variables
export CLUSTER=mainnet-beta
export SCOLANA_KEYPAIR_PATH="${HOME}/.config/solana/id.json"

# CRITICAL: Double-check you're on mainnet
solana config get | grep "Cluster config"

# Verify wallet address
solana address -k "$SCOLANA_KEYPAIR_PATH"

# Check balance (ensure sufficient funds)
solana balance -k "$SCOLANA_KEYPAIR_PATH"
```

## Step 3: Pre-Deployment Validation

```bash
cd sc-solana

# Run all tests locally
cargo test --release
anchor test

# Verify build artifacts
ls -la target/deploy/sc-solana.so
ls -la target/deploy/sc-solana-keypair.json
ls -la target/idl/sc_solana.json

# Record deployment information
echo "Deployment Date: $(date -u)" > deployment-info.txt
echo "Program ID: CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS" >> deployment-info.txt
echo "Anchor Version: $(anchor --version)" >> deployment-info.txt
echo "Solana Version: $(solana --version)" >> deployment-info.txt
echo "Program Hash: $(sha256sum target/deploy/sc-solana.so)" >> deployment-info.txt
```

## Step 4: Deploy to Mainnet

### Option A: Automated Deployment (Recommended)

```bash
cd sc-solana

# Run full deployment pipeline
CLUSTER=mainnet-beta ./deploy.sh full
```

### Option B: Step-by-Step Deployment

```bash
cd sc-solana

# 1. Check prerequisites
./deploy.sh prerequisites

# 2. Build (verify release mode)
./deploy.sh build

# 3. Generate IDL
./deploy.sh idl

# 4. Deploy to mainnet
CLUSTER=mainnet-beta ./deploy.sh deploy

# 5. Verify deployment
CLUSTER=mainnet-beta ./deploy.sh verify
```

### Option C: Deploy with Fixed Program ID

```bash
CLUSTER=mainnet-beta ./deploy.sh deploy:fixed
```

## Step 5: Post-Deployment Verification

```bash
# Verify program on mainnet
solana program show CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS --cluster mainnet-beta

# Verify program hash matches
PROGRAM_ID=$(solana program show CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS --cluster mainnet-beta | grep "Program Id" | awk '{print $3}')
echo "Deployed Program ID: $PROGRAM_ID"

# Check program account info
solana account CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS --cluster mainnet-beta
```

## Step 6: Initialize Config

```bash
cd sc-solana

# Initialize supply chain config
CLUSTER=mainnet-beta ts-node scripts/initialize.ts

# Verify config initialization
solana account $(solana address -k "$SCOLANA_KEYPAIR_PATH") --cluster mainnet-beta
```

## Step 7: Grant Roles

Grant initial roles to authorized accounts:

```bash
cd sc-solana

# Grant manufacturer role
CLUSTER=mainnet-beta ts-node scripts/grant-roles.ts --role FABRICANTE --account <manufacturer_address>

# Grant auditor role
CLUSTER=mainnet-beta ts-node scripts/grant-roles.ts --role AUDITOR_HW --account <auditor_address>

# Grant software technician role
CLUSTER=mainnet-beta ts-node scripts/grant-roles.ts --role TECNICO_SW --account <technician_address>

# Grant school role
CLUSTER=mainnet-beta ts-node scripts/grant-roles.ts --role ESCUELA --account <school_address>
```

## Step 8: Mainnet Verification Tests

```bash
cd sc-solana

# Run query tests against mainnet
CLUSTER=mainnet-beta anchor test --test query-instructions --provider.cluster mainnet-beta

# Run lifecycle tests (minimal operations)
CLUSTER=mainnet-beta anchor test --test lifecycle --provider.cluster mainnet-beta

# Verify role management
CLUSTER=mainnet-beta anchor test --test role-management --provider.cluster mainnet-beta
```

## Step 9: Update Frontend Configuration

```bash
cd web

# Update environment variables for mainnet
# NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
# NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# NEXT_PUBLIC_PROGRAM_ID=CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS

# Build for production
yarn build

# Verify build
ls -la .next/
```

## Step 10: Monitor Deployment

```bash
# Monitor for any issues
solana logs --cluster mainnet-beta

# Check program activity
solana program show CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS --cluster mainnet-beta --output json
```

## Emergency Procedures

### Rollback Plan

If deployment fails or issues are discovered:

1. **Do NOT deploy new program ID** - The current program remains on-chain
2. **Document the issue** - Record error messages and transaction signatures
3. **Assess impact** - Check if any state was modified
4. **Fix and retest** - Address issues on devnet/testnet first
5. **Re-deploy** - Use same program ID if possible, or deploy new program

### Emergency Contact Checklist

- [ ] Lead developer contact
- [ ] Security auditor contact
- [ ] Project stakeholder contact
- [ ] Multi-sig signers notified

### Key Management

```bash
# CRITICAL: Secure your keypair
# 1. Create encrypted backup
gpg --encrypt --recipient security@organization.com ~/.config/solana/id.json

# 2. Store in hardware wallet (recommended)
# 3. Store in secure vault (e.g., AWS Secrets Manager, HashiCorp Vault)
# 4. Never commit keypair to version control
# 5. Rotate keys periodically
```

## Post-Deployment Checklist

- [ ] Program deployed successfully on mainnet
- [ ] Program hash verified
- [ ] Config initialized
- [ ] All roles granted to appropriate accounts
- [ ] Integration tests passing on mainnet
- [ ] Frontend connected to mainnet
- [ ] Monitoring alerts configured
- [ ] Key backups secured
- [ ] Stakeholders notified
- [ ] Documentation updated

## Mainnet Environment Variables

```bash
# Copy to production .env
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_PROGRAM_ID=CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS

# For server-side operations (require higher security)
SOLANA_MAINNET_RPC_URL=https://api.mainnet-beta.solana.com
DEPLOYER_KEYPAIR_PATH=/secure/path/to/keypair.json
```

## Maintenance

### Regular Monitoring

```bash
# Check program health daily
solana program show CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS --cluster mainnet-beta

# Monitor for anomalies
solana logs --cluster mainnet-beta --limit 100
```

### Upgrade Procedure

If program upgrade is needed:

1. **Develop changes** on feature branch
2. **Test thoroughly** on devnet and testnet
3. **Security review** of changes
4. **Deploy upgrade** using:
   ```bash
   solana program deploy target/deploy/sc-solana.so \
     --program-id CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS \
     --cluster mainnet-beta \
     --keypair <uploader_keypair>
   ```
5. **Verify upgrade** and test functionality

### Incident Response

If security issue discovered:

1. **Assess severity** and impact
2. **Notify stakeholders** immediately
3. **Document timeline** of events
4. **Implement fix** on devnet first
5. **Deploy fix** to mainnet
6. **Post-mortem** and update procedures
