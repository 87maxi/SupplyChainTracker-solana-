import { createWalletClient, createPublicClient, http, keccak256, stringToBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { anvil } from 'viem/chains';
import SupplyChainTrackerABI from '../src/contracts/abi/SupplyChainTracker.json';

// Default Anvil deployment address - verify if this matches your logs
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const ADMIN_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Account #0 Anvil

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: npx tsx scripts/manual-grant.ts <ROLE_NAME> <USER_ADDRESS>');
        console.log('Example: npx tsx scripts/manual-grant.ts FABRICANTE 0x123...');
        process.exit(1);
    }

    const [roleName, userAddress] = args;

    // Normalize role name to get the hash
    // If input is "FABRICANTE", we want keccak256("FABRICANTE_ROLE")
    // If input is "ADMIN", we want keccak256("DEFAULT_ADMIN_ROLE") or 0x00... depending on implementation
    // Based on previous logs, FABRICANTE -> FABRICANTE_ROLE

    let roleString = roleName;
    if (roleName === 'ADMIN') {
        roleString = 'DEFAULT_ADMIN_ROLE';
    } else if (!roleName.endsWith('_ROLE')) {
        roleString = roleName + '_ROLE';
    }

    const roleHash = keccak256(stringToBytes(roleString));
    console.log(`Role Input: ${roleName}`);
    console.log(`Role String: ${roleString}`);
    console.log(`Role Hash: ${roleHash}`);

    const account = privateKeyToAccount(ADMIN_PK);

    const client = createWalletClient({
        account,
        chain: anvil,
        transport: http()
    });

    const publicClient = createPublicClient({
        chain: anvil,
        transport: http()
    });

    console.log(`Connecting to Anvil with Admin: ${account.address}`);

    try {
        // 1. Check if we are connected
        const chainId = await publicClient.getChainId();
        console.log(`Connected to Chain ID: ${chainId}`);

        // 2. Send Transaction
        console.log(`Granting role to ${userAddress}...`);
        const hash = await client.writeContract({
            address: CONTRACT_ADDRESS,
            abi: SupplyChainTrackerABI,
            functionName: 'grantRole',
            args: [roleHash, userAddress],
        });

        console.log(`Transaction submitted: ${hash}`);

        // 3. Wait for Receipt
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`Transaction mined in block ${receipt.blockNumber}`);

        if (receipt.status === 'success') {
            console.log('✅ SUCCESS: Role granted on blockchain.');
        } else {
            console.error('❌ FAILED: Transaction reverted.');
        }

    } catch (error) {
        console.error('❌ Error executing transaction:', error);
    }
}

main();
