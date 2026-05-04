const { createPublicClient, http } = require('viem');
const { foundry } = require('viem/chains');

async function testHasRole() {
  const client = createPublicClient({
    chain: foundry,
    transport: http('http://localhost:8545')
  });

  const contractAddress = process.env.NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
  
  // ABI simplificado solo con la función hasRole
  const abi = [
    {
      "inputs": [
        { "name": "role", "type": "bytes32" },
        { "name": "account", "type": "address" }
      ],
      "name": "hasRole",
      "outputs": [{ "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  const deployerAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const adminRole = '0x0000000000000000000000000000000000000000000000000000000000000000';

  try {
    console.log('Testing hasRole function...');
    
    const result = await client.readContract({
      address: contractAddress,
      abi: abi,
      functionName: 'hasRole',
      args: [adminRole, deployerAddress]
    });
    
    console.log('hasRole result:', result);
    
    if (result) {
      console.log('✅ SUCCESS: Deployer has DEFAULT_ADMIN_ROLE');
    } else {
      console.log('❌ ERROR: Deployer does not have DEFAULT_ADMIN_ROLE');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testHasRole();
