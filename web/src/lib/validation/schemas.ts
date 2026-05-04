// web/src/lib/validation/schemas.ts

import { z } from 'zod';

// Esquema para validación de direcciones de Ethereum
export const AddressSchema = z
  .string()
  .min(1, 'La dirección es requerida')
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Debe ser una dirección hexadecimal válida (0x...)')
  .describe('Dirección de Ethereum');

// Esquema para validación de serial numbers de netbooks
export const SerialNumberSchema = z
  .string()
  .min(1, 'El número de serie es requerido')
  .max(100, 'El número de serie no debe exceder 100 caracteres')
  .regex(/^[a-zA-Z0-9-]+$/, 'Solo se permiten letras, números y guiones')
  .describe('Número de serie de netbook');

// Esquema para validación de batch IDs
export const BatchIdSchema = z
  .string()
  .min(1, 'El ID de lote es requerido')
  .max(50, 'El ID de lote no debe exceder 50 caracteres')
  .regex(/^[a-zA-Z0-9-]+$/, 'Solo se permiten letras, números y guiones')
  .describe('ID de lote de producción');

// Esquema para validación de especificaciones del modelo
export const ModelSpecsSchema = z
  .string()
  .min(1, 'Las especificaciones del modelo son requeridas')
  .max(500, 'Las especificaciones no deben exceder 500 caracteres')
  .describe('Especificaciones técnicas del modelo');

// Esquema para validación de hashes (reporte de auditoría, etc.)
export const HashSchema = z
  .string()
  .min(1, 'El hash es requerido')
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Debe ser un hash SHA-256 válido (0x...)')
  .describe('Hash criptográfico');

// Esquema para validación de versiones de sistema operativo
export const OsVersionSchema = z
  .string()
  .min(1, 'La versión del sistema operativo es requerida')
  .max(50, 'La versión no debe exceder 50 caracteres')
  .regex(/^[0-9]+\.[0-9]+\.[0-9]+$/, 'Debe tener formato major.minor.patch')
  .describe('Versión del sistema operativo');

// Esquema para validación de roles
export const RoleSchema = z.enum([
  'DEFAULT_ADMIN_ROLE',
  'FABRICANTE_ROLE', 
  'AUDITOR_HW_ROLE', 
  'TECNICO_SW_ROLE', 
  'ESCUELA_ROLE'
] as const);

// Esquema combinado para el registro de múltiples netbooks
export const RegisterNetbooksSchema = z.object({
  serials: z.array(SerialNumberSchema).min(1, 'Debe registrar al menos una netbook'),
  batches: z.array(BatchIdSchema),
  specs: z.array(ModelSpecsSchema),
}).refine(data => 
  data.serials.length === data.batches.length && 
  data.serials.length === data.specs.length,
  {
    message: 'Las longitudes de los arrays deben coincidir',
    path: ['batches'] // Asociar el error con el campo batches
  }
);

// Esquema para validación de auditoría de hardware
export const AuditHardwareSchema = z.object({
  serial: SerialNumberSchema,
  passed: z.boolean(),
  reportHash: HashSchema
});

// Esquema para validación de validación de software
export const ValidateSoftwareSchema = z.object({
  serial: SerialNumberSchema,
  osVersion: OsVersionSchema,
  passed: z.boolean()
});

// Esquema para validación de asignación a estudiante
export const AssignToStudentSchema = z.object({
  serial: SerialNumberSchema,
  schoolHash: HashSchema,
  studentHash: HashSchema
});

// Exportar tipos inferidos
export type TAddress = z.infer<typeof AddressSchema>;
export type TSerialNumber = z.infer<typeof SerialNumberSchema>;
export type TBatchId = z.infer<typeof BatchIdSchema>;
export type TModelSpecs = z.infer<typeof ModelSpecsSchema>;
export type THash = z.infer<typeof HashSchema>;
export type TOsVersion = z.infer<typeof OsVersionSchema>;
export type TRole = z.infer<typeof RoleSchema>;
export type TRegisterNetbooks = z.infer<typeof RegisterNetbooksSchema>;
export type TAuditHardware = z.infer<typeof AuditHardwareSchema>;
export type TValidateSoftware = z.infer<typeof ValidateSoftwareSchema>;
export type TAssignToStudent = z.infer<typeof AssignToStudentSchema>;