// web/scripts/test-viem-client.mjs
// Script para probar el cliente viem directamente

import { createPublicClient, http } from 'viem';
import { localhost } from 'viem/chains';

console.log('=== Probando cliente viem directamente ===\n');

// Configurar variables de entorno
const env = {
    NEXT_PUBLIC_ANVIL_RPC_URL: 'http://127.0.0.1:8545',
    NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
};

console.log('Configuración usada:');
console.log('RPC URL:', env.NEXT_PUBLIC_ANVIL_RPC_URL);
console.log('Dirección del contrato:', env.NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS);

// Crear cliente público
const publicClient = createPublicClient({
    chain: localhost,
    transport: http(env.NEXT_PUBLIC_ANVIL_RPC_URL)
});

console.log('\nCliente creado, intentando conexión...');

async function testConnection() {
    try {
        // Intentar obtener el número de bloque
        const blockNumber = await publicClient.getBlockNumber();
        console.log('✅ Conexión exitosa. Número de bloque:', blockNumber);
        
        // Intentar obtener el bytecode del contrato
        console.log('\nIntentando obtener bytecode del contrato...');
        const bytecode = await publicClient.getBytecode({
            address: env.NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS
        });
        
        if (bytecode) {
            console.log('✅ Contrato detectado. Tamaño del bytecode:', bytecode.length);
            
            // Intentar una llamada de lectura
            console.log('\nIntentando llamar a hasRole...');
            const hasRole = await publicClient.readContract({
                address: env.NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS,
                abi: [
                    {
                        "inputs": [
                            {"internalType":"bytes32","name":"role","type":"bytes32"},
                            {"internalType":"address","name":"account","type":"address"}
                        ],
                        "name": "hasRole",
                        "outputs": [{"internalType":"bool","name":"","type":"bool"}],
                        "stateMutability": "view",
                        "type": "function"
                    }
                ],
                functionName: 'hasRole',
                args: [
                    '0x0000000000000000000000000000000000000000000000000000000000000000',
                    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
                ]
            });
            
            console.log('✅ Llamada a hasRole exitosa:', hasRole);
        } else {
            console.log('❌ No se encontró contrato en la dirección especificada');
        }
        
    } catch (error) {
        console.log('\n❌ Error:', error.message);
        console.log('Stack:', error.stack);
    }
}

testConnection();