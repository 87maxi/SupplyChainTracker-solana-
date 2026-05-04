// web/src/lib/role-validation.ts

import { ContractRoles } from '@/types/contract';

// Permisos específicos para cada rol
export const ROLE_PERMISSIONS: Record<ContractRoles, string[]> = {
  DEFAULT_ADMIN_ROLE: [
    'manage_roles',
    'view_all_data',
    'manage_system',
    'override_permissions'
  ],
  FABRICANTE_ROLE: [
    'create_tokens',
    'view_own_tokens',
    'update_manufacturing_data'
  ],
  AUDITOR_HW_ROLE: [
    'approve_hardware',
    'view_hardware_data',
    'create_hardware_reports'
  ],
  TECNICO_SW_ROLE: [
    'validate_software',
    'view_software_data',
    'update_software_info'
  ],
  ESCUELA_ROLE: [
    'distribute_tokens',
    'view_distribution_data',
    'manage_student_assignments'
  ]
};

// Validar si un usuario tiene un permiso específico
export const hasPermission = (
  userRoles: ContractRoles[],
  requiredPermission: string
): boolean => {
  return userRoles.some(role => 
    ROLE_PERMISSIONS[role]?.includes(requiredPermission)
  );
};

// Validar múltiples permisos
export const hasAllPermissions = (
  userRoles: ContractRoles[],
  requiredPermissions: string[]
): boolean => {
  return requiredPermissions.every(permission => 
    hasPermission(userRoles, permission)
  );
};

// Validar al menos uno de los permisos
export const hasAnyPermission = (
  userRoles: ContractRoles[],
  requiredPermissions: string[]
): boolean => {
  return requiredPermissions.some(permission => 
    hasPermission(userRoles, permission)
  );
};

// Obtener todos los permisos de un usuario
export const getUserPermissions = (userRoles: ContractRoles[]): string[] => {
  const permissions = new Set<string>();
  
  userRoles.forEach(role => {
    ROLE_PERMISSIONS[role]?.forEach(permission => {
      permissions.add(permission);
    });
  });

  return Array.from(permissions);
};

// Validar acceso a una funcionalidad específica
export const validateAccess = (
  userRoles: ContractRoles[],
  requiredPermission: string,
  resourceOwner?: string,
  currentUser?: string
): { hasAccess: boolean; reason?: string } => {
  
  // Validar permiso básico
  if (!hasPermission(userRoles, requiredPermission)) {
    return {
      hasAccess: false,
      reason: 'Permisos insuficientes para esta acción'
    };
  }

  // Validar ownership si es aplicable
  if (resourceOwner && currentUser && resourceOwner !== currentUser) {
    // Solo admin puede acceder a recursos de otros usuarios
    if (!hasPermission(userRoles, 'view_all_data')) {
      return {
        hasAccess: false,
        reason: 'Solo puede acceder a sus propios recursos'
      };
    }
  }

  return { hasAccess: true };
};

// Restricciones específicas para acciones críticas
export const CRITICAL_ACTIONS = {
  MANAGE_ROLES: 'manage_roles',
  OVERRIDE_PERMISSIONS: 'override_permissions',
  SYSTEM_CONFIG: 'manage_system'
};

// Validar acciones críticas (requieren confirmación adicional)
export const isCriticalAction = (permission: string): boolean => {
  return Object.values(CRITICAL_ACTIONS).includes(permission);
};