// web/src/lib/roleMapping.ts
// Central role mapping utility for consistent role name handling on Solana
// Solana stores roles as plain strings (not keccak256 hashes)
import { getRoleHashes } from './roleUtils';

export type RoleKey = 'FABRICANTE_ROLE' | 'AUDITOR_HW_ROLE' | 'TECNICO_SW_ROLE' | 'ESCUELA_ROLE' | 'ADMIN_ROLE';
export type RoleName = 'FABRICANTE_ROLE' | 'AUDITOR_HW_ROLE' | 'TECNICO_SW_ROLE' | 'ESCUELA_ROLE' | 'ADMIN_ROLE';

// Mapping from short keys to full role names as defined in the Solana program
class RoleMapper {
  private readonly keyToName: Record<RoleKey, RoleName> = {
    FABRICANTE_ROLE: 'FABRICANTE_ROLE',
    AUDITOR_HW_ROLE: 'AUDITOR_HW_ROLE',
    TECNICO_SW_ROLE: 'TECNICO_SW_ROLE',
    ESCUELA_ROLE: 'ESCUELA_ROLE',
    ADMIN_ROLE: 'ADMIN_ROLE'
  };

  private readonly nameToKey: Record<RoleName, RoleKey> = {
    'FABRICANTE_ROLE': 'FABRICANTE_ROLE',
    'AUDITOR_HW_ROLE': 'AUDITOR_HW_ROLE',
    'TECNICO_SW_ROLE': 'TECNICO_SW_ROLE',
    'ESCUELA_ROLE': 'ESCUELA_ROLE',
    'ADMIN_ROLE': 'ADMIN_ROLE'
  };

  // Convert short key to full role name
  toFullName(key: RoleKey): RoleName {
    return this.keyToName[key];
  }

  // Convert full role name to short key
  toKey(name: RoleName): RoleKey {
    const key = this.nameToKey[name];
    if (!key) {
      console.warn(`[roleMapping] No key found for role name: ${name}`);
      return 'ADMIN_ROLE'; // fallback
    }
    return key;
  }

  // Convert any role name (with or without _ROLE suffix) to full role name
  normalizeRoleName(name: string): RoleName {
    const originalName = name;

    // Check if it's already a full role name
    if (name.endsWith('_ROLE')) {
      if (this.keyToName[name as RoleKey]) {
        return name as RoleName;
      }
    } else {
      // Try to convert from short name to full name
      const fullName = this.keyToName[name as RoleKey];
      if (fullName) {
        return fullName;
      }
    }

    // If we can't find it, return the original name (with fallback)
    console.warn(`[roleMapping] Could not normalize role name: ${originalName}`);
    return 'ADMIN_ROLE';
  }

  // Get role string from contract (Solana uses plain strings, not hashes)
  async getRoleString(name: string): Promise<string> {
    const fullRoleName = this.normalizeRoleName(name);
    const roleHashes = await getRoleHashes();
    const key = this.nameToKey[fullRoleName];

    if (key) {
      const roleString = roleHashes[key];
      if (roleString) {
        console.log(`[roleMapper] Using role string: ${roleString}`);
        return roleString;
      }
    }

    console.error(`[roleMapper] Failed to get role string for role: ${name} (full: ${fullRoleName})`);
    throw new Error(`Failed to get role string for role: ${name}. Role must be defined in the SupplyChainTracker program.`);
  }

  // Legacy alias — Solana uses plain strings, not hashes
  async getRoleHash(name: string): Promise<string> {
    return this.getRoleString(name);
  }
}

// Export singleton instance
export const roleMapper = new RoleMapper();