// web/src/lib/metadata-validation.ts

export interface MetadataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Esquema de validación para metadata de netbooks
export const NETBOOK_METADATA_SCHEMA = {
  serialNumber: {
    required: true,
    type: 'string',
    pattern: /^[A-Z0-9]{8,16}$/,
    message: 'Serial number debe ser alfanumérico (8-16 caracteres)'
  },
  batchId: {
    required: true,
    type: 'string',
    pattern: /^BATCH-[A-Z0-9]{6}$/,
    message: 'Batch ID debe tener formato BATCH-XXXXXX'
  },
  initialModelSpecs: {
    required: true,
    type: 'string',
    minLength: 10,
    maxLength: 500,
    message: 'Especificaciones deben tener 10-500 caracteres'
  },
  hwIntegrityPassed: {
    required: false,
    type: 'boolean',
    message: 'hwIntegrityPassed debe ser booleano'
  },
  hwReportHash: {
    required: false,
    type: 'string',
    pattern: /^0x[a-fA-F0-9]{64}$/,
    message: 'Hash de reporte debe ser un hash SHA256 válido'
  },
  osVersion: {
    required: false,
    type: 'string',
    pattern: /^[0-9]+\.[0-9]+(\.[0-9]+)?$/,
    message: 'Versión de OS debe ser semántica (X.Y.Z)'
  },
  swValidationPassed: {
    required: false,
    type: 'boolean',
    message: 'swValidationPassed debe ser booleano'
  },
  destinationSchoolHash: {
    required: false,
    type: 'string',
    pattern: /^0x[a-fA-F0-9]{64}$/,
    message: 'Hash de escuela debe ser un hash SHA256 válido'
  },
  studentIdHash: {
    required: false,
    type: 'string',
    pattern: /^0x[a-fA-F0-9]{64}$/,
    message: 'Hash de estudiante debe ser un hash SHA256 válido'
  }
};

// Validar metadata contra el esquema
export const validateNetbookMetadata = (
  metadata: Record<string, unknown>,
  currentState?: string
): MetadataValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar campos requeridos
  Object.entries(NETBOOK_METADATA_SCHEMA).forEach(([field, rules]) => {
    const value = metadata[field];
    
    // Campo requerido pero no presente
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Campo requerido: ${field}`);
      return;
    }

    // Validar tipo
    if (value !== undefined && value !== null) {
      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`${field}: debe ser string`);
      } else if (rules.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${field}: debe ser booleano`);
      }
    }

    // Validar patrón regex
    if ('pattern' in rules && rules.pattern && value && typeof value === 'string') {
      if (!rules.pattern.test(value)) {
        errors.push(`${field}: ${rules.message}`);
      }
    }

    // Validar longitud
    if ('minLength' in rules && rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      errors.push(`${field}: mínimo ${rules.minLength} caracteres`);
    }
    if ('maxLength' in rules && rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      errors.push(`${field}: máximo ${rules.maxLength} caracteres`);
    }
  });

  // Validaciones específicas por estado
  if (currentState) {
    validateStateSpecificMetadata(metadata, currentState, errors, warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Validaciones específicas por estado
export const validateStateSpecificMetadata = (
  metadata: Record<string, unknown>,
  currentState: string,
  errors: string[],
  warnings: string[]
): void => {
  switch (currentState) {
    case 'HW_APROBADO':
      if (!metadata.hwIntegrityPassed && metadata.hwIntegrityPassed !== false) {
        errors.push('hwIntegrityPassed es requerido para estado HW_APROBADO');
      }
      if (!metadata.hwReportHash) {
        warnings.push('Se recomienda agregar hash del reporte de hardware');
      }
      break;

    case 'SW_VALIDADO':
      if (!metadata.swValidationPassed && metadata.swValidationPassed !== false) {
        errors.push('swValidationPassed es requerido para estado SW_VALIDADO');
      }
      if (!metadata.osVersion) {
        warnings.push('Se recomienda especificar la versión del OS');
      }
      break;

    case 'DISTRIBUIDA':
      if (!metadata.destinationSchoolHash) {
        errors.push('destinationSchoolHash es requerido para estado DISTRIBUIDA');
      }
      if (!metadata.studentIdHash) {
        errors.push('studentIdHash es requerido para estado DISTRIBUIDA');
      }
      break;
  }
};

// Sanitizar metadata (eliminar campos no deseados)
export const sanitizeMetadata = (metadata: Record<string, unknown>): Record<string, unknown> => {
  const allowedFields = Object.keys(NETBOOK_METADATA_SCHEMA);
  const sanitized: Record<string, unknown> = {};

  Object.entries(metadata).forEach(([key, value]) => {
    if (allowedFields.includes(key)) {
      sanitized[key] = value;
    }
  });

  return sanitized;
};

// Formatear errores para mostrar al usuario
export const formatValidationErrors = (result: MetadataValidationResult): string => {
  if (result.isValid) {
    return 'Metadata válida';
  }

  return `Errores de validación:\n${result.errors.join('\n')}${
    result.warnings.length > 0 ? `\nAdvertencias:\n${result.warnings.join('\n')}` : ''
  }`;
};