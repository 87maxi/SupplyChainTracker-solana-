// web/scripts/test-env-import.js
// Script para probar la importación de variables de entorno

console.log('=== Probando importación de variables de entorno ===\n');

// Intentar requiring dotenv para cargar .env.local
require('dotenv').config({ path: '.env.local' });

console.log('Variables de entorno después de loading .env.local:');
console.log('NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS:', process.env.NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS);
console.log('NEXT_PUBLIC_ANVIL_RPC_URL:', process.env.NEXT_PUBLIC_ANVIL_RPC_URL);
console.log('NEXT_PUBLIC_ANVIL_CHAIN_ID:', process.env.NEXT_PUBLIC_ANVIL_CHAIN_ID);

// Intentar importar el módulo env directamente
console.log('\nIntentando importar src/lib/env.js...');
try {
    const env = require('../src/lib/env.js'); // Esto fallará
    console.log('Módulo env importado:', env);
} catch (error) {
    console.log('Error al importar:', error.message);
}

// Intentar importar como ES module
console.log('\nIntentando importar como ES module...');
try {
    const env = await import('../src/lib/env.ts');
    console.log('Módulo env importado como ES module:', env);
} catch (error) {
    console.log('Error al importar como ES module:', error.message);
}