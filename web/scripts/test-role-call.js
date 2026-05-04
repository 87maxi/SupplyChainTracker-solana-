// web/scripts/test-role-call.js
// Script de prueba para verificar la llamada al contrato

console.log('Iniciando prueba de conexión con el contrato...');

// Importar configuración y cliente
const { publicClient } = require('../src/lib/blockchain/client.js');
const { NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS } = require('../src/lib/env.js');

console.log('Dirección del contrato:', NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS);

async function testRoleCall() {
  try {
    console.log('\n1. Verificando conexión con la blockchain...');
    const blockNumber = await publicClient.getBlockNumber();
    console.log('✅ Conexión exitosa. Número de bloque:', blockNumber);
    
    console.log('\n2. Verificando dirección del contrato...');
    if (!NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS) {
      console.log('❌ Dirección del contrato no configurada');
      return;
    }
    console.log('✅ Dirección del contrato verificada:', NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS);
    
    console.log('\n3. Intentando leer del contrato...');
    
    // Intentar una llamada de lectura simple
    try {
      const result = await publicClient.readContract({
        address: NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS,
        abi: [
          {
            "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }],
            "name": "DEFAULT_ADMIN_ROLE",
            "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        functionName: 'DEFAULT_ADMIN_ROLE',
        args: []
      });
      
      console.log('✅ Llamada de prueba exitosa. Resultado:', result);
      
    } catch (error) {
      console.log('\n❌ Error en llamada de prueba:', error.message);
      
      // Intentar con una llamada más simple
      try {
        const code = await publicClient.getBytecode({
          address: NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS
        });
        
        if (code) {
          console.log('✅ Contrato detectado en la dirección. Tamaño del bytecode:', code.length);
        } else {
          console.log('❌ No se encontró contrato en la dirección. Verifique la dirección.');
        }
      } catch (codeError) {
        console.log('❌ Error al verificar bytecode:', codeError.message);
      }
    }
    
  } catch (error) {
    console.log('\n❌ Error general:', error.message);
    console.log('Stack:', error.stack);
  }
}

testRoleCall();