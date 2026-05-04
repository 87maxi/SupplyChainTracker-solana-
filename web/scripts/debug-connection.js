// web/scripts/debug-connection.js
// Script para depurar la conexión con el contrato

console.log('=== Iniciando depuración de conexión ===\n');

try {
    // 1. Intentar importar los módulos
    console.log('1. Intentando importar módulos...');
    
    // Usar import dinámico para manejar módulos ES
    const importESModule = async (path) => {
        try {
            const module = await import(path);
            console.log(`✅ Módulo importado exitosamente: ${path}`);
            return module;
        } catch (error) {
            console.log(`❌ Error al importar ${path}:`, error.message);
            return null;
        }
    };
    
    // Intentar importar los módulos necesarios
    const clientModule = await importESModule('../src/lib/blockchain/client.js');
    const envModule = await importESModule('../src/lib/env.js');
    
    if (!clientModule || !envModule) {
        console.log('\n❌ No se pudieron cargar los módulos necesarios');
        process.exit(1);
    }
    
    // 2. Verificar las variables de entorno
    console.log('\n2. Verificando variables de entorno...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PWD:', process.env.PWD);
    console.log('Dirección del contrato:', envModule.NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS);
    
    if (!envModule.NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS) {
        console.log('\n❌ La dirección del contrato no está disponible en el entorno');
        process.exit(1);
    }
    
    // 3. Verificar la conexión con Anvil
    console.log('\n3. Verificando conexión con Anvil...');
    console.log('URL RPC:', process.env.NEXT_PUBLIC_ANVIL_RPC_URL || 'http://127.0.0.1:8545');
    
    // Verificar si Anvil está corriendo
    const { exec } = require('child_process');
    
    exec('lsof -i :8545', (error, stdout, stderr) => {
        if (error) {
            console.log('\n❌ No se pudo verificar el puerto 8545:', error.message);
            return;
        }
        
        if (stdout.trim()) {
            console.log('✅ Anvil detectado en el puerto 8545:');
            console.log(stdout);
        } else {
            console.log('❌ No se encontró Anvil escuchando en el puerto 8545');
        }
    });
    
    // 4. Intentar una llamada al contrato
    console.log('\n4. Intentando llamada al contrato...');
    
    const { publicClient } = clientModule;
    const contractAddress = envModule.NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS;
    
    console.log('Cliente público:', publicClient ? 'disponible' : 'no disponible');
    console.log('Dirección del contrato:', contractAddress);
    
    // Intentar obtener el número de bloque
    try {
        const blockNumber = await publicClient.getBlockNumber();
        console.log('✅ Conexión con la blockchain establecida. Número de bloque:', blockNumber.toString());
        
        // Intentar obtener el bytecode del contrato
        try {
            const bytecode = await publicClient.getBytecode({
                address: contractAddress
            });
            
            if (bytecode) {
                console.log('\n✅ Contrato detectado en la dirección');
                console.log('Tamaño del bytecode:', bytecode.length);
                
                // Intentar una llamada de lectura
                try {
                    const roleResult = await publicClient.readContract({
                        address: contractAddress,
                        abi: [
                            {
                                "inputs": [{"internalType":"bytes32","name":"role","type":"bytes32"}],
                                "name": "hasRole",
                                "outputs": [{"internalType":"bool","name":"","type":"bool"}],
                                "stateMutability": "view",
                                "type": "function"
                            }
                        ],
                        functionName: 'hasRole',
                        args: ['0x0000000000000000000000000000000000000000000000000000000000000000', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266']
                    });
                    
                    console.log('\n✅ Llamada al contrato exitosa:', roleResult);
                } catch (readError) {
                    console.log('\n❌ Error en llamada de lectura:', readError.message);
                }
            } else {
                console.log('\n❌ No se encontró contrato en la dirección especificada');
            }
        } catch (bytecodeError) {
            console.log('\n❌ Error al obtener bytecode:', bytecodeError.message);
        }
        
    } catch (blockError) {
        console.log('\n❌ Error al conectar con la blockchain:', blockError.message);
    }
    
} catch (error) {
    console.log('\n❌ Error en el script de depuración:', error.message);
    console.log('Stack:', error.stack);
}