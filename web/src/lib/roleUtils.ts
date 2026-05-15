// Role utilities - centralized role string management for Solana
// Solana stores roles as plain strings (not keccak256 hashes)
import { ROLE_NAMES, ROLE_HASHES } from '@/lib/constants/roles';

/** Role string map type — matches Solana program constants */
export type RoleMap = {
  FABRICANTE_ROLE: string;
  AUDITOR_HW_ROLE: string;
  TECNICO_SW_ROLE: string;
  ESCUELA_ROLE: string;
  ADMIN_ROLE: string;
};

/** Role name keys */
export type RoleKey = keyof RoleMap;

/** Role strings directly from constants (Solana plain strings) */
const directRoleStrings: RoleMap = {
  FABRICANTE_ROLE: ROLE_NAMES.FABRICANTE_ROLE,
  AUDITOR_HW_ROLE: ROLE_NAMES.AUDITOR_HW_ROLE,
  TECNICO_SW_ROLE: ROLE_NAMES.TECNICO_SW_ROLE,
  ESCUELA_ROLE: ROLE_NAMES.ESCUELA_ROLE,
  ADMIN_ROLE: ROLE_NAMES.ADMIN_ROLE,
};

/**
 * Gets the role strings map (synchronous — Solana uses plain strings).
 */
export const getRoleHashes = async (): Promise<RoleMap> => {
  return directRoleStrings;
};

/**
 * Gets the role string for a specific role (synchronous).
 */
export const getRoleHash = (roleName: RoleKey): string => {
  return directRoleStrings[roleName];
};

/**
 * Gets the role name key from a role string value.
 */
export const getRoleNameFromHash = (roleString: string): RoleKey | null => {
  for (const [roleName, roleValue] of Object.entries(ROLE_NAMES)) {
    if (roleValue === roleString) {
      return roleName as RoleKey;
    }
  }
  return null;
};

/**
 * Gets all role keys.
 */
export const getRoleKeys = (): RoleKey[] => {
  return Object.keys(directRoleStrings) as RoleKey[];
};
