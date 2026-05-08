# Roadmap de Implementación de RBAC (Control de Acceso Basado en Roles)

## Issue 0 - Análisis y Preparación del Sistema

**Descripción:**
Análisis completo del sistema actual de gestión de roles para identificar problemas de seguridad y definir el enfoque de implementación del RBAC.

**Objetivos:**
- Comprender el flujo actual de gestión de roles
- Identificar archivos problemáticos
- Definir los requisitos de seguridad para RBAC
- Establecer el marco técnico para la implementación

**Archivos a revisar:**
- `sc-solana/programs/sc-solana/src/instructions/role/grant.rs`
- `sc-solana/programs/sc-solana/src/instructions/role/revoke.rs`
- `sc-solana/programs/sc-solana/src/instructions/role/holder_add.rs`
- `sc-solana/programs/sc-solana/src/instructions/role/holder_remove.rs`
- `sc-solana/programs/sc-solana/src/state/config.rs`
- `sc-solana/programs/sc-solana/src/state/role_holder.rs`
- `sc-solana/programs/sc-solana/src/state/role_request.rs`

**Pruebas de consistencia:**
- Verificar que el sistema actual permite otorgar roles directamente sin solicitud
- Confirmar que el sistema permite revocar roles directamente
- Validar que las instrucciones de gestión de holders no tienen restricciones adecuadas

## Issue 1 - Eliminar Acceso Directo a Otorgar Roles

**Descripción:**
Eliminar o restringir las instrucciones `grant_role` y `grant_role_no_signer` para que solo puedan ser llamadas por el administrador.

**Objetivos:**
- Eliminar la posibilidad de otorgar roles directamente sin solicitud
- Asegurar que todas las asignaciones de roles deben pasar por el flujo de solicitud-aprobación
- Mantener compatibilidad con el sistema existente

**Cambios requeridos:**
- Modificar `sc-solana/programs/sc-solana/src/instructions/role/grant.rs`
- Eliminar `grant_role_no_signer` completamente
- Asegurar que solo el admin puede otorgar roles a través de solicitudes

**Pruebas de consistencia:**
- Verificar que `grant_role` no puede ser llamado por cuentas no administrativas
- Confirmar que `grant_role_no_signer` ha sido eliminado
- Validar que el sistema sigue permitiendo solicitudes de roles

## Issue 2 - Reforzar Control de Revocación de Roles

**Descripción:**
Asegurar que solo el administrador puede revocar roles, reforzando la autorización en la instrucción `revoke_role`.

**Objetivos:**
- Aumentar la seguridad en la revocación de roles
- Mantener la integridad del sistema de roles
- Asegurar que solo el admin puede realizar operaciones de revocación

**Cambios requeridos:**
- Reforzar la validación en `sc-solana/programs/sc-solana/src/instructions/role/revoke.rs`
- Asegurar que `revoke_role` solo puede ser llamado por el admin
- Validar que las cuentas de roles fijos se mantienen correctamente

**Pruebas de consistencia:**
- Verificar que solo el admin puede revocar roles
- Confirmar que cuentas no administrativas no pueden revocar roles
- Validar que las operaciones de revocación mantienen la integridad del sistema

## Issue 3 - Validar y Mejorar Gestión de Holders de Roles

**Descripción:**
Asegurar que las operaciones de gestión de holders de roles (`add_role_holder`, `remove_role_holder`) estén restringidas y validadas.

**Objetivos:**
- Asegurar que solo el admin puede gestionar holders de roles
- Validar que las operaciones de add/remove son seguras
- Mantener compatibilidad con múltiples holders por rol

**Cambios requeridos:**
- Reforzar validaciones en `sc-solana/programs/sc-solana/src/instructions/role/holder_add.rs`
- Reforzar validaciones en `sc-solana/programs/sc-solana/src/instructions/role/holder_remove.rs`
- Asegurar que solo el admin puede realizar estas operaciones

**Pruebas de consistencia:**
- Verificar que solo el admin puede agregar holders de roles
- Confirmar que solo el admin puede remover holders de roles
- Validar que las operaciones mantienen la integridad de los contadores de roles

## Issue 4 - Implementar Control Estricto de Solicitudes de Roles

**Descripción:**
Asegurar que todas las solicitudes de roles deben ser aprobadas por el administrador y que el sistema no permite asignaciones directas.

**Objetivos:**
- Implementar control estricto de solicitudes de roles
- Asegurar que el flujo de solicitud-aprobación es el único método válido
- Mantener compatibilidad con el sistema de múltiples holders por rol

**Cambios requeridos:**
- Validar que `request_role` es el único método para solicitar roles
- Asegurar que `approve_role_request` solo puede ser llamado por el admin
- Validar que `reject_role_request` solo puede ser llamado por el admin

**Pruebas de consistencia:**
- Verificar que solo se pueden solicitar roles a través de `request_role`
- Confirmar que solo el admin puede aprobar/rechazar solicitudes
- Validar que las operaciones de aprobación crean correctamente los RoleHolder accounts

## Issue 5 - Pruebas de Consistencia Completa

**Descripción:**
Implementar y ejecutar todas las pruebas necesarias para validar que el sistema RBAC funciona correctamente y es consistente.

**Objetivos:**
- Validar que todas las restricciones de seguridad están implementadas
- Verificar que el sistema es coherente en todas sus operaciones
- Asegurar que no hay vulnerabilidades de acceso no autorizado

**Pruebas de consistencia:**
- Pruebas de autorización para todas las operaciones de roles
- Pruebas de flujo de solicitud-aprobación
- Pruebas de revocación de roles
- Pruebas de gestión de holders de roles
- Pruebas de seguridad para evitar acceso directo a otorgar roles
- Pruebas de integridad del sistema
- Pruebas de compatibilidad con operaciones existentes
