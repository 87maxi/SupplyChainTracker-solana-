import dotenv from 'dotenv';
import axios from 'axios';

// Cargar variables de entorno
dotenv.config();

console.log('=== VALIDACIÓN DE CONFIGURACIÓN DE ENTORNO ===\n');

// Validar variables esenciales
class ConfigValidator {
  static validate() {
    const errors = [];
    
    // Validar dirección del contrato
    if (!process.env.NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS) {
      errors.push('❌ NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS no está definida');
    } else {
      console.log(`✅ NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS: ${process.env.NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS}`);
    }
    
    // Validar RPC URL
    if (!process.env.NEXT_PUBLIC_RPC_URL) {
      errors.push('❌ NEXT_PUBLIC_RPC_URL no está definida');
    } else {
      console.log(`✅ NEXT_PUBLIC_RPC_URL: ${process.env.NEXT_PUBLIC_RPC_URL}`);
    }
    
    // Validar network ID
    if (!process.env.NEXT_PUBLIC_NETWORK_ID) {
      errors.push('❌ NEXT_PUBLIC_NETWORK_ID no está definida');
    } else {
      console.log(`✅ NEXT_PUBLIC_NETWORK_ID: ${process.env.NEXT_PUBLIC_NETWORK_ID}`);
    }
    
    // Validar MongoDB URI
    if (!process.env.MONGODB_URI) {
      errors.push('❌ MONGODB_URI no está definida');
    } else {
      console.log('✅ MONGODB_URI: ' + process.env.MONGODB_URI.replace(/:([^:]+)@/, ':*****@'));
    }
    
    // Verificar conexión con Anvil
    if (process.env.NEXT_PUBLIC_RPC_URL) {
      axios.post(process.env.NEXT_PUBLIC_RPC_URL, {
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1
      }, {
        timeout: 5000
      })
      .then(response => {
        const chainId = parseInt(response.data.result, 16);
        if (chainId === 31337) {
          console.log('✅ Conexión exitosa con Anvil (chainId: 31337)');
        } else {
          errors.push(`❌ Conexión con nodo RPC, pero chainId inesperado: ${chainId}`);
        }
      })
      .catch(err => {
        errors.push(`❌ No se pudo conectar con Anvil en ${process.env.NEXT_PUBLIC_RPC_URL}: ${err.message}`);
      });
    }
    
    // Simular prueba de conexión con MongoDB
    console.log('ℹ️  Prueba de conexión con MongoDB requerida manualmente');
    
    // Mostrar resultados
    setTimeout(() => {
      if (errors.length === 0) {
        console.log('\n✅ TODAS LAS VALIDACIONES PASARON');
        process.exit(0);
      } else {
        console.log('\n❌ ERRORES ENCONTRADOS:');
        errors.forEach(error => console.log(error));
        process.exit(1);
      }
    }, 1000);
  }
}

// Ejecutar validación
ConfigValidator.validate();