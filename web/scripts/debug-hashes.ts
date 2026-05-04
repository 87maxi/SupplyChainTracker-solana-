
import { keccak256, toBytes } from 'viem';

const roles = ['FABRICANTE', 'AUDITOR_HW', 'TECNICO_SW', 'ESCUELA', 'ADMIN', 'DEFAULT_ADMIN'];

console.log('--- Role Hashes Debug ---');

roles.forEach(role => {
    const roleName = role + '_ROLE';
    const hashRole = keccak256(toBytes(roleName));
    const hashPlain = keccak256(toBytes(role));

    console.log(`Role: ${role}`);
    console.log(`  keccak256("${roleName}"): ${hashRole}`);
    console.log(`  keccak256("${role}"):      ${hashPlain}`);
});

console.log('\n--- Checking specific hash 0xdf8b... ---');
// Check if it matches anything known
