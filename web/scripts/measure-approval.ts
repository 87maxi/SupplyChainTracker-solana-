
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { anvil } from 'viem/chains';

const CONTRACT_ADDRESS = '0x0165878A594ca255338adfa4d48449f69242Eb8F'; // From env.ts
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Default Anvil Account 0

const abi = parseAbi([
    'function grantRole(bytes32 role, address account) external',
    'function hasRole(bytes32 role, address account) external view returns (bool)'
]);

async function main() {
    const account = privateKeyToAccount(PRIVATE_KEY);

    const publicClient = createPublicClient({
        chain: anvil,
        transport: http('http://127.0.0.1:8545')
    });

    const walletClient = createWalletClient({
        account,
        chain: anvil,
        transport: http('http://127.0.0.1:8545')
    });

    const role = '0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45dd6ed2013848'; // FABRICANTE_ROLE
    const targetUser = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Anvil Account 1

    console.log('--- Starting Approval Speed Test ---');
    console.log(`Contract: ${CONTRACT_ADDRESS}`);
    console.log(`Granting role to: ${targetUser}`);

    const start = performance.now();

    try {
        console.log('1. Submitting transaction...');
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi,
            functionName: 'grantRole',
            args: [role, targetUser]
        });

        const submitted = performance.now();
        console.log(`   Tx Hash: ${hash}`);
        console.log(`   Submission took: ${(submitted - start).toFixed(2)}ms`);

        console.log('2. Waiting for receipt...');
        const receipt = await publicClient.waitForTransactionReceipt({
            hash,
            pollingInterval: 100 // Fast polling
        });

        const end = performance.now();
        console.log(`   Receipt block: ${receipt.blockNumber}`);
        console.log(`   Status: ${receipt.status}`);
        console.log(`   Wait took: ${(end - submitted).toFixed(2)}ms`);
        console.log(`   TOTAL TIME: ${(end - start).toFixed(2)}ms`);

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
