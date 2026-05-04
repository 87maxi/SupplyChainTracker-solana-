// web/src/lib/errors/error-handler.ts

/**
 * Clase para manejar errores de manera consistente en toda la aplicación
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    // Mantener la pila de llamadas para errores
    if (originalError instanceof Error) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * Manejador centralizado de errores
 */
export class ErrorHandler {
  /**
   * Maneja errores de Web3 y los convierte en AppError consistentes
   * @param error Error recibido de Web3/Wagmi
   * @returns AppError con mensaje y código adecuado
   */
  static handleWeb3Error(error: any): AppError {
    console.error('ErrorHandler: Handling Web3 Error:', error);

    // Si el error ya es un AppError, devolverlo
    if (error instanceof AppError) {
      return error;
    }

    // Extraer mensaje de error de diferentes formatos posibles
    const message = error?.message || error?.details || (typeof error === 'string' ? error : 'Error desconocido');
    const code = error?.code || 'UNKNOWN_ERROR';

    // Códigos de error comunes de Web3
    if (code === 4001 || message.includes('user rejected transaction')) {
      return new AppError('Transacción rechazada por el usuario', 'USER_REJECTED', error);
    }

    if (code === -32603) {
      return new AppError('Error interno de la red (posible revert)', 'INTERNAL_ERROR', error);
    }

    if (code === 4100 || message.includes('PERMISSION_DENIED')) {
      return new AppError('Permiso no concedido', 'PERMISSION_DENIED', error);
    }

    if (message.includes('insufficient funds')) {
      return new AppError('Fondos insuficientes para la transacción', 'INSUFFICIENT_FUNDS', error);
    }

    if (message.includes('gas required exceeds allowance')) {
      return new AppError('El gas requerido excede el límite disponible', 'GAS_LIMIT_EXCEEDED', error);
    }

    // Errores de validación / Revert
    if (message.includes('reverted') || message.includes('VM execution error')) {
      const reason = this.extractRevertReason(message);
      return new AppError(`Transacción revertida: ${reason}`, 'TRANSACTION_REVERTED', error);
    }

    return new AppError(
      message,
      code.toString(),
      error
    );
  }

  /**
   * Extrae el motivo de reversión de un error de contrato
   * @param message Mensaje de error completo
   * @returns Motivo de reversión
   */
  private static extractRevertReason(message: string): string {
    // Intentar extraer el motivo de diferentes formatos
    const reasonMatch = message.match(/reason string '(.+?)'/);
    if (reasonMatch && reasonMatch[1]) {
      return reasonMatch[1];
    }

    const revertMatch = message.match(/reverted: (.+?)(?:,|$)/);
    if (revertMatch && revertMatch[1]) {
      return revertMatch[1];
    }

    return 'Error desconocido';
  }

  /**
   * Registra un error en la consola y en sistemas de monitoreo
   * @param error Error a registrar
   * @param context Información adicional sobre el contexto
   */
  static logError(error: unknown, context?: Record<string, unknown>): void {
    console.error('Error registrado:', { error, context });

    // Aquí se podría integrar con servicios de monitoreo como Sentry, Rollbar, etc.
    // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    //   Sentry.captureException(error, { contexts: { additional: context } });
    // }
  }
}