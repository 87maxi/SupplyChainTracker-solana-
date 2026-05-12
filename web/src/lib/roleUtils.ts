// Get a map of role names to their hashes from the contract
// Updated RoleMap to include full role names as keys
export type RoleMap = {
  FABRICANTE_ROLE: `0x${string}`;
  AUDITOR_HW_ROLE: `0x${string}`;
  TECNICO_SW_ROLE: `0x${string}`;
  ESCUELA_ROLE: `0x${string}`;
  ADMIN_ROLE: `0x${string}`;
};

// Importar los hashes de roles directamente de las constantes
import { ROLE_HASHES } from '@/lib/constants/roles';

// Initialize role hashes directly from constants at module load time
const directRoleHashes: RoleMap = {
  FABRICANTE_ROLE: (ROLE_HASHES.FABRICANTE_ROLE || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
  AUDITOR_HW_ROLE: (ROLE_HASHES.AUDITOR_HW_ROLE || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
  TECNICO_SW_ROLE: (ROLE_HASHES.TECNICO_SW_ROLE || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
  ESCUELA_ROLE: (ROLE_HASHES.ESCUELA_ROLE || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
  ADMIN_ROLE: (ROLE_HASHES.ADMIN_ROLE || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
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
      if (!hash) {
        throw new Error(`${roleName} hash is undefined`);
      }
      
      // Validate that it's a valid 32-byte hex string (66 characters including 0x prefix)
      if (typeof hash !== 'string' || !hash.startsWith('0x') || hash.length !== 66) {
        throw new Error(`${roleName} hash is not a valid 32-byte hex string: ${hash}`);
      }
      
      return hash as `0x${string}`;
    };

    // Crear el objeto result con los hashes de roles directamente de las constantes
    const result: RoleMap = {
      FABRICANTE_ROLE: validateHash(ROLE_HASHES.FABRICANTE_ROLE, 'FABRICANTE_ROLE'),
      AUDITOR_HW_ROLE: validateHash(ROLE_HASHES.AUDITOR_HW_ROLE, 'AUDITOR_HW_ROLE'),
      TECNICO_SW_ROLE: validateHash(ROLE_HASHES.TECNICO_SW_ROLE, 'TECNICO_SW_ROLE'),
      ESCUELA_ROLE: validateHash(ROLE_HASHES.ESCUELA_ROLE, 'ESCUELA_ROLE'),
      ADMIN_ROLE: validateHash(ROLE_HASHES.ADMIN_ROLE, 'ADMIN_ROLE'),
    };
    
    console.log('Role hashes retrieved and validated:', result);
    cachedRoleHashes = result;
    return result;
  } catch (error) {
    console.error('Unexpected error in getRoleHashes:', error);
    // Este caso no debería ocurrir ya que no estamos haciendo llamadas al contrato
    // Pero por seguridad, retornamos los hashes de las constantes
    cachedRoleHashes = {
      FABRICANTE_ROLE: ROLE_HASHES.FABRICANTE_ROLE,
      AUDITOR_HW_ROLE: ROLE_HASHES.AUDITOR_HW_ROLE,
      TECNICO_SW_ROLE: ROLE_HASHES.TECNICO_SW_ROLE,
      ESCUELA_ROLE: ROLE_HASHES.ESCUELA_ROLE,
      ADMIN_ROLE: ROLE_HASHES.ADMIN_ROLE,
    };
    return cachedRoleHashes;
  }
};

// Función para obtener el hash de un rol específico
export const getRoleHash = (roleName: keyof RoleMap): `0x${string}` => {
  const roleHashes = getRoleHashes();
  return (roleHashes as any)[roleName];
};

// Función para obtener el nombre de rol a partir del hash
export const getRoleNameFromHash = (hash: `0x${string}`): keyof RoleMap | null => {
  // Buscar el rol por hash en las constantes
  for (const [roleName, roleHash] of Object.entries(ROLE_HASHES)) {
    if (roleHash === hash) {
      return roleName as keyof RoleMap;
    }
  }
  return null;
};

// Función para verificar si un rol es válido
export const isValidRole = (roleName: string): roleName is keyof RoleMap => {
  return Object.keys(ROLE_HASHES).includes(roleName);
};

// Función para obtener todos los roles válidos
export const getAllRoles = (): Array<keyof RoleMap> => {
  return Object.keys(ROLE_HASHES) as Array<keyof RoleMap>;
};
