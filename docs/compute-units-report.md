# Compute Unit Report - SupplyChainTracker

## Overview

This document provides compute unit (CU) analysis for all instructions in the SupplyChainTracker Solana program. CU estimates help predict transaction success rates and optimize gas costs.

**Program ID**: `7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb`
**Default CU Limit**: 1,470,000 per transaction

## Instruction CU Estimates

| Instruction | Estimated CU | % of Limit | Risk Level | Accounts (R/W) | CPI | Events |
|-------------|-------------|------------|------------|----------------|-----|--------|
| initialize | ~21,200 | 1.44% | LOW | 2/1 | Yes | Yes |
| fund_deployer | ~20,280 | 1.38% | LOW | 2/1 | Yes | No |
| register_netbook | ~20,800 | 1.42% | LOW | 4/3 | Yes | Yes |
| grant_role | ~23,150 | 1.57% | LOW | 5/2 | Yes | Yes |
| request_role | ~21,150 | 1.44% | LOW | 3/2 | Yes | Yes |
| audit_hardware | ~14,600 | 0.99% | LOW | 3/1 | No | Yes |
| validate_software | ~14,500 | 0.99% | LOW | 3/1 | No | Yes |
| assign_to_student | ~14,800 | 1.01% | LOW | 3/1 | No | Yes |
| approve_role_request | ~10,200 | 0.69% | LOW | 3/2 | No | Yes |
| revoke_role | ~10,150 | 0.69% | LOW | 3/2 | No | Yes |
| query_netbook_state | ~7,200 | 0.49% | LOW | 3/0 | No | Yes |
| query_config | ~6,200 | 0.42% | LOW | 2/0 | No | Yes |
| query_role | ~6,150 | 0.42% | LOW | 2/0 | No | Yes |

## Batch Registration

| Batch Size | Estimated CU | % of Limit | Risk Level |
|------------|-------------|------------|------------|
| 1 | ~20,800 | 1.42% | LOW |
| 5 | ~100,000 | 6.80% | LOW |
| 10 | ~190,000 | 12.93% | MEDIUM |
| 15 | ~280,000 | 19.05% | MEDIUM |
| 20 | ~370,000 | 25.17% | HIGH |

**Recommended max batch size**: 15 (stays under 25% CU limit)

## Full Netbook Lifecycle

Complete lifecycle: **register → audit → validate → assign**

| Step | Instruction | CU | % of Limit |
|------|-------------|-----|------------|
| 1 | register_netbook | ~20,800 | 1.42% |
| 2 | audit_hardware | ~14,600 | 0.99% |
| 3 | validate_software | ~14,500 | 0.99% |
| 4 | assign_to_student | ~14,800 | 1.01% |
| **Total** | **4 transactions** | **~64,700** | **4.40% avg** |

## Account Sizes

| Account | Size (bytes) | Rent Exempt (at 2034 SOL/byte) |
|---------|-------------|-------------------------------|
| Netbook | 1,104 | ~0.004 SOL |
| SupplyChainConfig | 234 | ~0.001 SOL |
| RoleHolder | 49 | ~0.0002 SOL |
| RoleRequest | 57 | ~0.0002 SOL |
| SerialHashRegistry | 136 | ~0.0005 SOL |
| DeployerState | 17 | ~0.0001 SOL |

## Risk Assessment

All individual instructions operate well within the default CU limit (< 2% each). The only instruction that approaches higher risk is `register_netbooks_batch` with large batch sizes (>20).

### Recommendations

1. **Batch Registration**: Limit batch size to 15 netbooks per transaction
2. **Compute Budget**: No need to increase compute budget for standard operations
3. **Priority Fees**: Consider priority fees only during network congestion
4. **Monitoring**: Track actual CU usage vs estimates in production

## Measurement Methodology

CU estimates are derived from:
- Account data sizes (read/write operations)
- Instruction data serialization cost
- Program execution complexity (hash computation, state validation)
- CPI call overhead (System Program transfers)
- Event/log emission costs

**Rust Tests**: `sc-solana/programs/sc-solana/tests/compute-units.rs`
**Frontend Service**: `web/src/services/ComputeUnitReporter.ts`

## Running CU Tests

```bash
# Run CU measurement tests
cd sc-solana/programs/sc-solana && cargo test --test compute-units

# Generate report output
cd sc-solana/programs/sc-solana && cargo test --test compute-units generate_cu_report -- --nocapture
```

## References

- [Solana Compute Budget](https://docs.solana.com/cluster/runtime#compute-budget)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Transaction Fees](https://docs.solana.com/developing/fee_calculator)
