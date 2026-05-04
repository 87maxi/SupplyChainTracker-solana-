#!/usr/bin/env node

import { createPublicClient, http, createWalletClient, custom } from 'viem';
import { anvilChain } from '../src/lib/wagmi/config.js';
import fs from 'fs';
const SupplyChainTrackerABI = JSON.parse(fs.readFileSync('./src/contracts/abi/SupplyChainTracker.json', 'utf8'));

// Configuración
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const RPC_URL = 'http://127.0.0.1:8545';

// Cliente público
const publicClient = createPublicClient({
  chain: anvilChain,
  transport: http(RPC_URL),
});

// Cliente wallet (usando la primera cuenta de Anvil)
const walletClient = createWalletClient({
  chain: anvilChain,
  transport: http(RPC_URL),
});

// Cuenta de Anvil (la primera cuenta desbloqueada)
const account = {
  address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
};

// Hash del rol FABRICANTE (calculado con keccak256)
const FABRICANTE_ROLE_HASH = '0xbe0c84bfff967b2deb88bd0540d4a796d0ebfdcb72262ced26f1892b419e6457';

async function testGrantRole() {
  console.log('🧪 Probando función grantRole...');
  
  try {
    // 1. Verificar conexión
    console.log('🔍 Verificando conexión con Anvil...');
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`✅ Conectado. Block number: ${blockNumber}`);
    
    // 2. Verificar que la cuenta tiene permisos de admin
    console.log('🔍 Verificando permisos de administrador...');
    const hasAdminRole = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: SupplyChainTrackerABI,
      functionName: 'hasRole',
      args: ['0x0000000000000000000000000000000000000000000000000000000000000000', account.address],
    });
    
    console.log(`✅ La cuenta tiene rol admin: ${hasAdminRole}`);
    
    if (!hasAdminRole) {
      console.error('❌ La cuenta no tiene permisos de administrador');
      return;
    }
    
    // 3. Intentar otorgar rol a otra cuenta de Anvil
    const testAccount = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Segunda cuenta de Anvil
    
    console.log(`🔍 Verificando si la cuenta ${testAccount} ya tiene el rol...`);
    const hasRole = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: SupplyChainTrackerABI,
      functionName: 'hasRole',
      args: [FABRICANTE_ROLE_HASH, testAccount],
    });
    
    console.log(`✅ La cuenta ${testAccount} tiene rol FABRICANTE: ${hasRole}`);
    
    if (hasRole) {
      console.log('ℹ️  La cuenta ya tiene el rol, probando revocar primero...');
      
      const { request } = await publicClient.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: SupplyChainTrackerABI,
        functionName: 'revokeRole',
        args: [FABRICANTE_ROLE_HASH, testAccount],
        account,
      });
      
      const revokeHash = await walletClient.writeContract(request);
      console.log(`✅ Rol revocado. Hash: ${revokeHash}`);
      
      const revokeReceipt = await publicClient.waitForTransactionReceipt({ hash: revokeHash });
      console.log(`✅ Transacción confirmada en bloque: ${revokeReceipt.blockNumber}`);
    }
    
    // 4. Simular la transacción primero
    console.log('🔍 Simulando transacción grantRole...');
    
    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: SupplyChainTrackerABI,
      functionName: 'grantRole',
      args: [FABRICANTE_ROLE_HASH, testAccount],
      account,
    });
    
    console.log('✅ Simulación exitosa. Ejecutando transacción...');
    
    // 5. Ejecutar la transacción real
    const hash = await walletClient.writeContract(request);
    console.log(`✅ Transacción enviada. Hash: ${hash}`);
    
    // 6. Esperar confirmación
    console.log('⏳ Esperando confirmación...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ Transacción confirmada en bloque: ${receipt.blockNumber}`);
    
    // 7. Verificar que el rol fue otorgado
    const newHasRole = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: SupplyChainTrackerABI,
      functionName: 'hasRole',
      args: [FABRICANTE_ROLE_HASH, testAccount],
    });
    
    console.log(`✅ Verificación: La cuenta ${testAccount} ahora tiene rol FABRICANTE: ${newHasRole}`);
    
    if (newHasRole) {
      console.log('🎉 ¡Prueba exitosa! El rol fue otorgado correctamente.');
    } else {
      console.error('❌ La verificación falló. El rol no fue otorgado.');
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    
    if (error.message) {
      console.error('Mensaje de error:', error.message);
    }
    
    if (error.cause) {
      console.error('Causa:', error.cause);
    }
    
    if (error.details) {
      console.error('Detalles:', error.details);
    }
  }
}

// Ejecutar la prueba
if (import.meta.url === `file://${process.argv[1]}`) {
  testGrantRole().catch(console.error);
}