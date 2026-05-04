// web/src/lib/state-machine.ts

import { NetbookState } from '@/types/supply-chain-types';

// Máquina de estados con transiciones válidas
export const STATE_MACHINE: Record<NetbookState, NetbookState[]> = {
  FABRICADA: ['HW_APROBADO'],
  HW_APROBADO: ['SW_VALIDADO'],
  SW_VALIDADO: ['DISTRIBUIDA'],
  DISTRIBUIDA: [] // Estado final - sin transiciones
};

// Roles requeridos para cada transición
export const STATE_TRANSITION_ROLES: Record<string, string> = {
  'FABRICADA→HW_APROBADO': 'AUDITOR_HW_ROLE',
  'HW_APROBADO→SW_VALIDADO': 'TECNICO_SW_ROLE',
  'SW_VALIDADO→DISTRIBUIDA': 'ESCUELA_ROLE'
};

// Validar si una transición de estado es válida
export const isValidStateTransition = (
  currentState: NetbookState,
  nextState: NetbookState
): boolean => {
  return STATE_MACHINE[currentState].includes(nextState);
};

// Obtener el rol requerido para una transición
export const getRequiredRoleForTransition = (
  currentState: NetbookState,
  nextState: NetbookState
): string | null => {
  const transitionKey = `${currentState}→${nextState}`;
  return STATE_TRANSITION_ROLES[transitionKey] || null;
};

// Validar transición completa con rol de usuario
export const validateStateTransition = (
  currentState: NetbookState,
  nextState: NetbookState,
  userRoles: string[]
): { isValid: boolean; error?: string } => {
  // Validar transición de estado
  if (!isValidStateTransition(currentState, nextState)) {
    return {
      isValid: false,
      error: `Transición inválida: No se puede cambiar de ${currentState} a ${nextState}`
    };
  }

  // Validar rol requerido
  const requiredRole = getRequiredRoleForTransition(currentState, nextState);
  if (!requiredRole) {
    return {
      isValid: false,
      error: 'No se encontró el rol requerido para esta transición'
    };
  }

  // Validar que el usuario tenga el rol necesario
  if (!userRoles.includes(requiredRole)) {
    return {
      isValid: false,
      error: `Se requiere el rol ${requiredRole} para esta acción`
    };
  }

  return { isValid: true };
};

// Obtener el siguiente estado posible
export const getNextPossibleStates = (currentState: NetbookState): NetbookState[] => {
  return STATE_MACHINE[currentState];
};

// Verificar si un estado es final
export const isFinalState = (state: NetbookState): boolean => {
  return STATE_MACHINE[state].length === 0;
};