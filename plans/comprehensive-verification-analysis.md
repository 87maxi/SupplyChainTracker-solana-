# Pruebas de Consistencia para el Sistema RBAC

## Visión General

Las pruebas de consistencia son fundamentales para garantizar que el sistema de Control de Acceso Basado en Roles (RBAC) implementado cumple con los requisitos de seguridad y funcionalidad establecidos. Estas pruebas deben validar tanto el comportamiento correcto como los casos de error para asegurar la integridad del sistema.

## Pruebas de Seguridad

### 1. Pruebas de Autorización de Operaciones de Roles

**Objetivo:** Verificar que solo el administrador puede realizar operaciones de gestión de roles.

**Pruebas a Implementar:**
- Intento de otorgar roles por parte de cuentas no administrativas debe fallar
- Intento de revocar roles por parte de cuentas no administrativas debe fallar
- Intento de agregar/remover holders de roles por parte de cuentas no administrativas debe fallar
- Solo el admin puede aprobar/rechazar solicitudes de roles

### 2. Pruebas de Restricción de Acceso Directo

**Objetivo:** Validar que no se permite otorgar roles directamente sin solicitud.

**Pruebas a Implementar:**
- Llamada a `grant_role` por parte de cuentas no administrativas debe ser rechazada
- Llamada a `grant_role_no_signer` debe ser eliminada o restringida
- Verificación de que todas las asignaciones de roles deben pasar por el flujo de solicitud-aprobación

### 3. Pruebas de Validación de Cuenta Administradora

**Objetivo:** Garantizar que solo existe una cuenta administradora en el sistema.

**Pruebas a Implementar:**
- Verificación de que solo una cuenta puede ser el administrador
- Validación de que el PDA del administrador se deriva correctamente
- Prueba de que no se pueden crear múltiples administradores

## Pruebas de Funcionalidad

### 4. Pruebas de Flujo de Solicitud y Aprobación

**Objetivo:** Validar que el flujo de solicitud-aprobación funciona correctamente.

**Pruebas a Implementar:**
- Solicitud de rol por parte de usuario debe crear RoleRequest correctamente
- Aprobación de solicitud por parte del admin debe crear RoleHolder correctamente
- Rechazo de solicitud debe eliminar RoleRequest correctamente
- Verificación de que se mantienen los contadores de roles

### 5. Pruebas de Gestión de Holders de Roles

**Objetivo:** Asegurar que la gestión de múltiples holders por rol es segura y consistente.

**Pruebas a Implementar:**
- Agregar múltiples holders para el mismo rol debe funcionar correctamente
- Remover holders debe actualizar contadores correctamente
- Verificación de que los holders son únicos por rol
- Pruebas de limpieza de cuentas RoleHolder al revocar roles

### 6. Pruebas de Integridad del Sistema

**Objetivo:** Verificar que el sistema mantiene la consistencia en todas sus operaciones.

**Pruebas a Implementar:**
- Verificación de que los contadores de roles se actualizan correctamente
- Validación de que las cuentas de roles fijos se mantienen consistentes
- Pruebas de transiciones de estado válidas
- Verificación de que no se pueden crear estados inconsistentes

## Pruebas de Compatibilidad

### 7. Pruebas de Retrocompatibilidad

**Objetivo:** Asegurar que las nuevas restricciones no rompen operaciones existentes.

**Pruebas a Implementar:**
- Operaciones de registro de netbooks deben continuar funcionando
- Operaciones de consulta deben continuar funcionando
- Operaciones de auditoría deben continuar funcionando
- Verificación de que las operaciones de validación continúan funcionando

### 8. Pruebas de Error Handling

**Objetivo:** Validar que el sistema maneja correctamente los casos de error.

**Pruebas a Implementar:**
- Intentos de operaciones no autorizadas deben lanzar errores apropiados
- Intentos de operaciones con datos inválidos deben ser rechazados
- Pruebas de manejo de errores en transacciones
- Verificación de que los mensajes de error son descriptivos

## Pruebas de Cobertura

### 9. Pruebas de Cobertura de Código

**Objetivo:** Asegurar que todas las rutas del código están cubiertas por pruebas.

**Pruebas a Implementar:**
- Pruebas unitarias para cada instrucción de gestión de roles
- Pruebas de integración para flujos completos de roles
- Pruebas de extremos para casos límite
- Pruebas de rendimiento para operaciones críticas

### 10. Pruebas de Escenario Real

**Objetivo:** Validar que el sistema funciona correctamente en escenarios de uso real.

**Pruebas a Implementar:**
- Escenario completo de solicitud-aprobación de rol
- Escenario de múltiples usuarios solicitando roles diferentes
- Escenario de revocación de roles
- Escenario de gestión de múltiples holders por rol
- Escenario de error en el proceso de solicitud

## Pruebas de Frontend

### 11. Pruebas de Interfaz de Usuario

**Objetivo:** Validar que la interfaz de usuario refleja correctamente las restricciones de seguridad.

**Pruebas a Implementar:**
- Verificación de que solo usuarios con roles apropiados pueden acceder a ciertas funcionalidades
- Pruebas de validación de formularios de solicitud de roles
- Pruebas de visualización de solicitudes de roles pendientes
- Pruebas de notificaciones de éxito/error en operaciones de roles

## Pruebas de Seguridad Adicional

### 12. Pruebas de Vulnerabilidades

**Objetivo:** Identificar y prevenir posibles vulnerabilidades de seguridad.

**Pruebas a Implementar:**
- Pruebas de reentrancy en operaciones de roles
- Pruebas de overflow/underflow en contadores
- Pruebas de manipulación de datos en transacciones
- Pruebas de validación de firmas y cuentas

## Métricas de Validación

### 13. Métricas de Cobertura

**Objetivo:** Medir la calidad de las pruebas implementadas.

**Métricas a Seguimiento:**
- Porcentaje de cobertura de código
- Número de casos de prueba por instrucción
- Porcentaje de casos de error cubiertos
- Tiempo de ejecución de pruebas de integración
