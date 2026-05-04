// Get a map of role names to their hashes from the contract
// Updated RoleMap to include full role names as keys
export type RoleMap = {
  FABRICANTE: `0x${string}`;
  AUDITOR_HW: `0x${string}`;
  TECNICO_SW: `0x${string}`;
  ESCUELA: `0x${string}`;
  ADMIN: `0x${string}`;
};

// Importar los hashes de roles directamente de las constantes
import { ROLE_HASHES } from '@/lib/constants/roles';

// Initialize role hashes directly from constants at module load time
const directRoleHashes: RoleMap = {
  FABRICANTE: (ROLE_HASHES.FABRICANTE || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
  AUDITOR_HW: (ROLE_HASHES.AUDITOR_HW || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
  TECNICO_SW: (ROLE_HASHES.TECNICO_SW || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
  ESCUELA: (ROLE_HASHES.ESCUELA || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
  ADMIN: (ROLE_HASHES.ADMIN || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
};

// Validate the directRoleHashes at module load time
console.log('Direct role hashes initialized:', directRoleHashes);

// Use directRoleHashes as the cache to ensure synchronous access
let cachedRoleHashes: RoleMap | null = directRoleHashes;

export const getRoleHashes = async (): Promise<RoleMap> => {
  if (cachedRoleHashes) {
    console.log('[roleUtils] Returning cached role hashes:', cachedRoleHashes);
    return cachedRoleHashes;
  }

  try {
    console.log('[roleUtils] Fetching role hashes from constants...');
    
    // Explicitly check and log each role hash from constants
    console.log('Raw ROLE_HASHES from constants:', ROLE_HASHES);
    
    // Validate that ROLE_HASHES are defined
    if (!ROLE_HASHES) {
      console.error('ROLE_HASHES is not defined, using fallback values');
      // Return the directRoleHashes which has fallback values
      cachedRoleHashes = directRoleHashes;
      return cachedRoleHashes;
    }
    
    // Validate each role hash with detailed logging
    const validateHash = (hash: string | undefined, roleName: keyof typeof ROLE_HASHES) => {
      console.log(`Validating hash for ${roleName}:`, hash);
      
      if (!hash) {
        throw new Error(`${roleName} hash is not defined`);
      }
      
      if (typeof hash !== 'string') {
        throw new Error(`${roleName} hash is not a string: ${typeof hash}`);
      }
      
      if (!hash.startsWith('0x')) {
        throw new Error(`${roleName} hash does not start with 0x: ${hash}`);
      }
      
      if (hash.length !== 66) {
        throw new Error(`${roleName} hash is not 66 characters long: ${hash.length} characters`);
      }
      
      if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
        throw new Error(`${roleName} hash is not a valid 32-byte hex string: ${hash}`);
      }
      
      return hash as `0x${string}`;
    };

    // Crear el objeto result con los hashes de roles directamente de las constantes
    const result: RoleMap = {
      FABRICANTE: validateHash(ROLE_HASHES.FABRICANTE, 'FABRICANTE'),
      AUDITOR_HW: validateHash(ROLE_HASHES.AUDITOR_HW, 'AUDITOR_HW'),
      TECNICO_SW: validateHash(ROLE_HASHES.TECNICO_SW, 'TECNICO_SW'),
      ESCUELA: validateHash(ROLE_HASHES.ESCUELA, 'ESCUELA'),
      ADMIN: validateHash(ROLE_HASHES.ADMIN, 'ADMIN'),
    };
    
    console.log('Role hashes retrieved and validated:', result);
    cachedRoleHashes = result;
    return result;
  } catch (error) {
    console.error('Unexpected error in getRoleHashes:', error);
    // Este caso no debería ocurrir ya que no estamos haciendo llamadas al contrato
    // Pero por seguridad, retornamos los hashes de las constantes
    cachedRoleHashes = {
      FABRICANTE: ROLE_HASHES.FABRICANTE,
      AUDITOR_HW: ROLE_HASHES.AUDITOR_HW,
      TECNICO_SW: ROLE_HASHES.TECNICO_SW,
      ESCUELA: ROLE_HASHES.ESCUELA,
      ADMIN: ROLE_HASHES.ADMIN,
    };
    return cachedRoleHashes;
  }
};
