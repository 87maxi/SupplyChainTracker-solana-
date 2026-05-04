// Script simple de prueba para verificar el mapeo de roles
const { getRoleHashes } = require('../src/lib/roleUtils');

async function testRoleMapping() {
  console.log('=== Testing Role Mapping ===');
  
  try {
    const roleHashes = await getRoleHashes();
    console.log('Available role hashes keys:', Object.keys(roleHashes));
    
    // Test cases para verificar el mapeo
    const testCases = [
      'FABRICANTE',
      'FABRICANTE_ROLE',
      'AUDITOR_HW',
      'AUDITOR_HW_ROLE',
      'TECNICO_SW',
      'TECNICO_SW_ROLE',
      'ESCUELA',
      'ESCUELA_ROLE',
      'ADMIN',
      'DEFAULT_ADMIN_ROLE',
      'DEFAULT_ADMIN'
    ];
    
    const roleKeyMap = {
      'FABRICANTE': 'FABRICANTE',
      'FABRICANTE_ROLE': 'FABRICANTE',
      'AUDITOR_HW': 'AUDITOR_HW',
      'AUDITOR_HW_ROLE': 'AUDITOR_HW',
      'TECNICO_SW': 'TECNICO_SW',
      'TECNICO_SW_ROLE': 'TECNICO_SW',
      'ESCUELA': 'ESCUELA',
      'ESCUELA_ROLE': 'ESCUELA',
      'ADMIN': 'ADMIN',
      'DEFAULT_ADMIN_ROLE': 'ADMIN',
      'DEFAULT_ADMIN': 'ADMIN'
    };
    
    for (const role of testCases) {
      const roleKey = roleKeyMap[role] || role;
      
      if (roleKey in roleHashes) {
        const hash = roleHashes[roleKey];
        console.log(`✅ ${role} -> ${roleKey}: ${hash}`);
      } else {
        console.log(`❌ ${role} -> ${roleKey}: NOT FOUND`);
      }
    }
    
    console.log('=== Role Mapping Test Complete ===');
    
  } catch (error) {
    console.error('Error testing role mapping:', error);
  }
}

// Ejecutar la prueba
testRoleMapping();