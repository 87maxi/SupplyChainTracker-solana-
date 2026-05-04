// web/src/lib/errors/UserFriendlyError.ts
// Clase para manejar errores amigables para el usuario

export class UserFriendlyError extends Error {
  constructor(
    public message: string,
    public userMessage: string,
    public code?: string
  ) {
    super(message);
    this.name = 'UserFriendlyError';
  }
}

// Mapeo de errores técnicos a mensajes amigables
export const ERROR_MESSAGES = {
  'CONTRACT_NOT_DEPLOYED': 'El contrato inteligente no está desplegado en la red actual.',
  'CONNECTION_FAILED': 'No se pudo establecer conexión con la red blockchain.',
  'NO_ACCOUNT': 'No se encontró una cuenta conectada. Por favor, conecta tu billetera.',
  'INVALID_NETWORK': 'Red no compatible. Por favor, cambia a la red correcta.',
  'TRANSACTION_REJECTED': 'La transacción fue rechazada por tu billetera.',
  'INSUFFICIENT_FUNDS': 'Fondos insuficientes para realizar esta operación.',
  'TIMEOUT': 'Tiempo de espera agotado. Por favor, intenta nuevamente.',
  'UNKNOWN_ERROR': 'Ocurrió un error inesperado. Por favor, intenta nuevamente.'
};
