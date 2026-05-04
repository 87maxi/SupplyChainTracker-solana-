import { keccak256, toBytes } from 'viem';

const roles = [
    "FABRICANTE_ROLE",
    "AUDITOR_HW_ROLE",
    "TECNICO_SW_ROLE",
    "ESCUELA_ROLE"
];

roles.forEach(role => {
    console.log(`${role}: ${keccak256(toBytes(role))}`);
});
