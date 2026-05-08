# Roadmap de Implementación de RBAC (Control de Acceso Basado en Roles)

## Visión General

Este roadmap detalla la implementación del Control de Acceso Basado en Roles (RBAC) para el sistema SupplyChainTracker, asegurando que solo el administrador puede aprobar solicitudes de roles y que todas las operaciones de gestión de roles están restringidas.

## Issues del Roadmap

### Issue 0 - Análisis y Preparación del Sistema RBAC
**Estado:** Completado
**Descripción:** Análisis completo del sistema actual de gestión de roles para identificar problemas de seguridad y definir el enfoque de implementación del RBAC.

### Issue 1 - Eliminar Acceso Directo a Otorgar Roles
**Estado:** En Progreso
**Descripción:** Eliminar o restringir las instrucciones `grant_role` y `grant_role_no_signer` para que solo puedan ser llamadas por el administrador.

### Issue 2 - Reforzar Control de Revocación de Roles
**Estado:** En Progreso
**Descripción:** Asegurar que solo el administrador puede revocar roles, reforzando la autorización en la instrucción `revoke_role`.

### Issue 3 - Validar y Mejorar Gestión de Holders de Roles
**Estado:** En Progreso
**Descripción:** Asegurar que las operaciones de gestión de holders de roles (`add_role_holder`, `remove_role_holder`) estén restringidas y validadas.

### Issue 4 - Implementar Control Estricto de Solicitudes de Roles
**Estado:** En Progreso
**Descripción:** Asegurar que todas las solicitudes de roles deben ser aprobadas por el administrador y que el sistema no permite asignaciones directas.

### Issue 5 - Pruebas de Consistencia Completa
**Estado:** Pendiente
**Descripción:** Implementar y ejecutar todas las pruebas necesarias para validar que el sistema RBAC funciona correctamente y es consistente.

## Relaciones entre Issues

```
Issue 0 → Issue 1 → Issue 2 → Issue 3 → Issue 4 → Issue 5
   ↓         ↓         ↓         ↓         ↓         ↓
   ✓         ✓         ✓         ✓         ✓         ?
```

## Requisitos de Seguridad Implementados

1. **Solo una cuenta administradora**: El sistema tendrá solo una cuenta administradora creada en el sistema
2. **Solicitudes de roles**: Todos los roles deben ser solicitados y aprobados por el administrador
3. **Control de acceso**: Solo el administrador puede aprobar o rechazar solicitudes de roles
4. **Seguridad de operaciones**: Todas las operaciones de gestión de roles están restringidas
5. **Integridad del sistema**: El sistema mantiene la consistencia en todas sus operaciones

## Pruebas de Consistencia

Las pruebas incluyen:
- Pruebas de autorización para todas las operaciones de roles
- Pruebas de flujo de solicitud-aprobación
- Pruebas de revocación de roles
- Pruebas de gestión de holders de roles
- Pruebas de seguridad para evitar acceso directo a otorgar roles
- Pruebas de integridad del sistema
- Pruebas de compatibilidad con operaciones existentes
