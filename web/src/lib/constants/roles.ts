// Constantes de roles para SupplyChainTracker
// Estos hashes corresponden a keccak256("ROLE_NAME") del contrato

export const ROLE_HASHES = {
  // FABRICANTE_ROLE = keccak256("FABRICANTE_ROLE")
  FABRICANTE: "0xbe0c84bfff967b2deb88bd0540d4a796d0ebfdcb72262ced26f1892b419e6457" as const,

  // AUDITOR_HW_ROLE = keccak256("AUDITOR_HW_ROLE")
  AUDITOR_HW: "0x49c0376dc7caa3eab0c186e9bc20bf968b0724fea74a37706c35f59bc5d8b15b" as const,

  // TECNICO_SW_ROLE = keccak256("TECNICO_SW_ROLE")
  TECNICO_SW: "0xeeb4ddf6a0e2f06cb86713282a0b88ee789709e92a08b9e9b4ce816bbb13fcaf" as const,

  // ESCUELA_ROLE = keccak256("ESCUELA_ROLE")
  ESCUELA: "0xa8f5858ea94a9ede7bc5dd04119dcc24b3b02a20be15d673993d8b6c2a901ef9" as const,

  // DEFAULT_ADMIN_ROLE es 0x00...00
  ADMIN: "0x0000000000000000000000000000000000000000000000000000000000000000" as const
} as const;

// Tipo para los nombres de roles
export type RoleName = keyof typeof ROLE_HASHES;

// Función para obtener el hash de un rol
export const getRoleHash = (roleName: RoleName): `0x${string}` => {
  return ROLE_HASHES[roleName];
};
