// web/scripts/debug-connection3.cjs
// Script final para depurar la conexión con el contrato

console.log('=== Iniciando depuración de conexión ===\n');

const fs = require('fs');
const path = require('path');

// Función para cargar y evaluar código TypeScript
async function loadTSModule(filePath) {
    try {
        const fullPath = path.join(__dirname, '..', filePath);
        console.log(`Buscando archivo: ${fullPath}`);
        
        if (!fs.existsSync(fullPath)) {
            console.log(`❌ Archivo no encontrado: ${fullPath}`);
            return null;
        }
        
        const content = fs.readFileSync(fullPath, 'utf8');
        console.log(`✅ Archivo leído correctamente: ${filePath}`);
        
        return content;
    } catch (error) {
        console.log(`❌ Error al leer ${filePath}:`, error.message);
        return null;
    }
}

async function debugConnection() {
    try {
        // 1. Cargar los módulos como texto
        console.log('1. Cargando módulos como texto...');
        
        const clientContent = await loadTSModule('src/lib/blockchain/client.ts');
        const envContent = await loadTSModule('src/lib/env.ts');
        
        if (!clientContent || !envContent) {
            console.log('\n❌ No se pudieron cargar los módulos necesarios como texto');
            return;
        }
        
        // 2. Verificar las variables de entorno
        console.log('\n2. Verificando variables de entorno...');
        console.log('NODE_ENV:', process.env.NODE_ENV);
        console.log('PWD:', process.cwd());
        console.log('Fichero .env.local:', fs.existsSync(path.join(__dirname, '..', '.env.local')) ? 'encontrado' : 'no encontrado');
        
        // Leer el archivo .env.local directamente
        try {
            const envLocal = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
            console.log('\nContenido de .env.local:');
            console.log(envLocal);
        } catch (error) {
            console.log('\n❌ No se pudo leer .env.local:', error.message);
        }
        
        const contractAddress = process.env.NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS;
        console.log('NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS:', contractAddress);
        
        if (!contractAddress) {
            console.log('\n❌ La dirección del contrato no está disponible en las variables de entorno');
            return;
        }
        
        // 3. Verificar la conexión con Anvil
        console.log('\n3. Verificando conexión con Anvil...');
        console.log('URL RPC:', process.env.NEXT_PUBLIC_ANVIL_RPC_URL || 'http://127.0.0.1:8545');
        
        // Verificar si Anvil está corriendo
        try {
            const { execSync } = require('child_process');
            const result = execSync('lsof -i :8545', { encoding: 'utf8' });
            
            if (result.trim()) {
                console.log('✅ Anvil detectado en el puerto 8545:');
                console.log(result);
            } else {
                console.log('❌ No se encontró Anvil escuchando en el puerto 8545');
            }
        } catch (error) {
            console.log('\n❌ No se pudo verificar el puerto 8545:', error.message);
        }
        
    } catch (error) {
        console.log('\n❌ Error en el script de depuración:', error.message);
        console.log('Stack:', error.stack);
    }
}

debugConnection();