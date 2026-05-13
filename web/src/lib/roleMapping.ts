// web/src/lib/roleMapping.ts
// Central role mapping utility for consistent role name to hash conversion
// Maps role keys (FABRICANTE, AUDITOR_HW, etc.) to their full role names
import { getRoleHashes } from './roleUtils';

export type RoleKey = 'FABRICANTE_ROLE' | 'AUDITOR_HW_ROLE' | 'TECNICO_SW_ROLE' | 'ESCUELA_ROLE' | 'ADMIN_ROLE';
export type RoleName = 'FABRICANTE_ROLE' | 'AUDITOR_HW_ROLE' | 'TECNICO_SW_ROLE' | 'ESCUELA_ROLE' | 'ADMIN_ROLE';

// Verifica si un string es un hash de 32 bytes (66 caracteres)
function isHash(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

// Mapping from short keys to full role names as defined in the contract
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
      // Already in full format
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

  // Get role hash from contract
  async getRoleHash(name: string): Promise<`0x${string}`> {
    // Normalize the role name
    const fullRoleName = this.normalizeRoleName(name);
    
    // Get role hashes from contract
    const roleHashes = await getRoleHashes();
    const key = this.nameToKey[fullRoleName];
    
    if (key) {
      const hash = roleHashes[key];
      if (hash && hash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.log(`[roleMapper] Using hash from roleHashes cache: ${hash}`);
        return hash;
      }
    }
    
    console.error(`[roleMapper] Failed to get hash for role: ${name} (full: ${fullRoleName})`);
    throw new Error(`Failed to get role hash for role: ${name}. Role must be defined in the SupplyChainTracker contract.`);
  }
}

// Export singleton instance
export const roleMapper = new RoleMapper();