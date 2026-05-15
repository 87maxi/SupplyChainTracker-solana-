// Role constants for SupplyChainTracker on Solana
// Solana stores roles as plain strings (not keccak256 hashes like Ethereum)
// These match the constants in sc-solana/programs/sc-solana/src/state/mod.rs

export const ROLE_NAMES = {
  FABRICANTE_ROLE: "FABRICANTE" as const,
  AUDITOR_HW_ROLE: "AUDITOR_HW" as const,
  TECNICO_SW_ROLE: "TECNICO_SW" as const,
  ESCUELA_ROLE: "ESCUELA" as const,
  ADMIN_ROLE: "ADMIN" as const,
} as const;

// Legacy alias for backward compatibility — use ROLE_NAMES going forward
export const ROLE_HASHES = ROLE_NAMES;

// Type for role name keys
export type RoleName = keyof typeof ROLE_NAMES;

// Get the role string for a given role name (Solana uses plain strings, not hashes)
export const getRoleHash = (roleName: RoleName): string => {
  return ROLE_NAMES[roleName];
};

// Get role name key from a role string value
export const getRoleNameFromValue = (roleValue: string): RoleName | null => {
  for (const [key, value] of Object.entries(ROLE_NAMES)) {
    if (value === roleValue) {
      return key as RoleName;
    }
  }
  return null;
};
