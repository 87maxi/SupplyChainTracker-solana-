// Role utilities - centralized role hash management
import { ROLE_HASHES } from '@/lib/constants/roles';
import { log } from '@/lib/logger';

/** Role hash map type */
export type RoleMap = {
  FABRICANTE_ROLE: `0x${string}`;
  AUDITOR_HW_ROLE: `0x${string}`;
  TECNICO_SW_ROLE: `0x${string}`;
  ESCUELA_ROLE: `0x${string}`;
  ADMIN_ROLE: `0x${string}`;
};

/** Role name keys */
export type RoleKey = keyof RoleMap;

/** Fallback zero hash */
const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

/** Initialize role hashes directly from constants */
const directRoleHashes: RoleMap = {
  FABRICANTE_ROLE: (ROLE_HASHES.FABRICANTE_ROLE || ZERO_HASH),
  AUDITOR_HW_ROLE: (ROLE_HASHES.AUDITOR_HW_ROLE || ZERO_HASH),
  TECNICO_SW_ROLE: (ROLE_HASHES.TECNICO_SW_ROLE || ZERO_HASH),
  ESCUELA_ROLE: (ROLE_HASHES.ESCUELA_ROLE || ZERO_HASH),
  ADMIN_ROLE: (ROLE_HASHES.ADMIN_ROLE || ZERO_HASH),
};

/** Cached role hashes for synchronous access */
let cachedRoleHashes: RoleMap | null = directRoleHashes;

/**
 * Validates a role hash format (0x + 64 hex chars = 66 total)
 */
function validateHash(hash: string | undefined, roleName: string): `0x${string}` {
  if (!hash) {
    throw new Error(`${roleName} hash is undefined`);
  }
  if (typeof hash !== 'string' || !hash.startsWith('0x') || hash.length !== 66) {
    throw new Error(`${roleName} hash is not a valid 32-byte hex string: ${hash}`);
  }
  return hash as `0x${string}`;
}

/**
 * Gets the role hashes map. Uses cached values when available.
 */
export const getRoleHashes = async (): Promise<RoleMap> => {
  if (cachedRoleHashes) {
    return cachedRoleHashes;
  }

  try {
    if (!ROLE_HASHES) {
      log.warn('ROLE_HASHES is not defined, using fallback values');
      cachedRoleHashes = directRoleHashes;
      return cachedRoleHashes;
    }

    const result: RoleMap = {
      FABRICANTE_ROLE: validateHash(ROLE_HASHES.FABRICANTE_ROLE, 'FABRICANTE_ROLE'),
      AUDITOR_HW_ROLE: validateHash(ROLE_HASHES.AUDITOR_HW_ROLE, 'AUDITOR_HW_ROLE'),
      TECNICO_SW_ROLE: validateHash(ROLE_HASHES.TECNICO_SW_ROLE, 'TECNICO_SW_ROLE'),
      ESCUELA_ROLE: validateHash(ROLE_HASHES.ESCUELA_ROLE, 'ESCUELA_ROLE'),
      ADMIN_ROLE: validateHash(ROLE_HASHES.ADMIN_ROLE, 'ADMIN_ROLE'),
    };

    cachedRoleHashes = result;
    return result;
  } catch (error) {
    log.error('Unexpected error in getRoleHashes:', error);
    cachedRoleHashes = directRoleHashes;
    return cachedRoleHashes;
  }
};

/**
 * Gets the hash for a specific role.
 */
export const getRoleHash = (roleName: RoleKey): `0x${string}` => {
  return directRoleHashes[roleName];
};

/**
 * Gets the role name from a hash.
 */
export const getRoleNameFromHash = (hash: `0x${string}`): RoleKey | null => {
  for (const [roleName, roleHash] of Object.entries(ROLE_HASHES)) {
    if (roleHash === hash) {
      return roleName.replace('_ROLE', '') as RoleKey;
    }
  }
  return null;
};

/**
 * Gets all role keys.
 */
export const getRoleKeys = (): RoleKey[] => {
  return Object.keys(directRoleHashes) as RoleKey[];
};
