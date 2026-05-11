# Stabilization Roadmap - Tareas Pendientes

## Resumen del Proyecto

**Proyecto**: SupplyChainTracker-solana  
**Tipo**: Supply chain tracker en Solana con Anchor program (Rust) y Next.js frontend  
**Estado Actual**: Fases 1-4 y 7 completadas. Fases 5, 6, 8, 9, 10 y verificaciones finales pendientes.

---

## Tabla de Contenidos

1. [Fase 5: Business Logic Validation](#fase-5-business-logic-validation)
2. [Fase 6: TypeError Fixes](#fase-6-typeerror-fixes)
3. [Fase 8: Lint Cleanup](#fase-8-lint-cleanup)
4. [Fase 9: Testing de Integración Completa](#fase-9-testing-de-integración-completa)
5. [Fase 10: Documentación y CI/CD](#fase-10-documentación-y-cicd)
6. [Verificaciones Finales](#verificaciones-finales)
7. [Archivos Modificados en Esta Sesión](#archivos-modificados-en-esta-sesión)
8. [Resultados Actuales de Build](#resultados-actuales-de-build)

---

## Fase 5: Business Logic Validation

| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Estado** | Pendiente |
| **Estimación** | ~25 errores InvalidInput 0x12003 |

### Descripción

Corregir errores de validación `InvalidInput 0x12003` que aparecen en las instrucciones de netbook del programa Anchor. Estos errores indican fallos en las validaciones de estado y transiciones del state machine.

### Tareas Detalladas

#### 5.1. Análisis y Corrección de InvalidInput Errors

- [ ] **5.1.1**: Analizar causas de InvalidInput errors en instrucciones de netbook
  - Revisar logs de tests fallidos para identificar patrones
  - Mapear errores a instrucciones específicas (register, audit, validate, assign)
  - Documentar escenarios reproducibles

- [ ] **5.1.2**: Corregir validaciones de estado en instrucciones
  - [`sc-solana/programs/sc-solana/src/instructions/netbook/register.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/register.rs)
  - [`sc-solana/programs/sc-solana/src/instructions/netbook/audit.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/audit.rs)
  - [`sc-solana/programs/sc-solana/src/instructions/netbook/validate.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/validate.rs)
  - [`sc-solana/programs/sc-solana/src/instructions/netbook/assign.rs`](sc-solana/programs/sc-solana/src/instructions/netbook/assign.rs)

- [ ] **5.1.3**: Actualizar validaciones de transiciones de estado
  - [`web/src/services/state-machine.ts`](web/src/services/state-machine.ts)
  - Verificar que las transiciones permitidas coincidan con la lógica del programa

#### 5.2. Validaciones de Roles (RBAC)

- [ ] **5.2.1**: Verificar constraints en instrucciones de rol
  - [`sc-solana/programs/sc-solana/src/instructions/role/grant.rs`](sc-solana/programs/sc-solana/src/instructions/role/grant.rs)
  - [`sc-solana/programs/sc-solana/src/instructions/role/request.rs`](sc-solana/programs/sc-solana/src/instructions/role/request.rs)
  - [`sc-solana/programs/sc-solana/src/instructions/role/holder_add.rs`](sc-solana/programs/sc-solana/src/instructions/role/holder_add.rs)
  - [`sc-solana/programs/sc-solana/src/instructions/role/holder_remove.rs`](sc-solana/programs/sc-solana/src/instructions/role/holder_remove.rs)

- [ ] **5.2.2**: Actualizar validaciones de roles en frontend
  - Sincronizar validaciones de frontend con las del programa
  - Asegurar manejo correcto de errores de permisos

---

## Fase 6: TypeError Fixes

| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Estado** | Pendiente |
| **Estimación** | ~10 errores undefined property access |

### Descripción

Corregir errores de acceso a propiedades `undefined` en el código TypeScript del frontend y tests. Estos errores suelen ocurrir cuando se accede a propiedades de objetos que aún no han sido cargados o no existen.

### Tareas Detalladas

#### 6.1. Correcciones en Tests

- [ ] **6.1.1**: Corregir undefined property access en test assertions
  - Revisar todos los archivos en [`sc-solana/tests/`](sc-solana/tests/)
  - Verificar que los accounts esperados existen antes de acceder a propiedades
  - Corregir aserciones que asumen valores no nulos

- [ ] **6.1.2**: Agregar null checks en account fetching
  - Implementar verificaciones antes de acceder a accounts del programa
  - Usar optional chaining (`?.`) y nullish coalescing (`??`)

- [ ] **6.1.3**: Implementar optional chaining en TypeScript
  - Revisar [`web/src/services/SolanaSupplyChainService.ts`](web/src/services/SolanaSupplyChainService.ts)
  - Aplicar patrón consistentemente en todo el código

#### 6.2. Error Handling Centralizado

- [ ] **6.2.1**: Agregar validaciones de existencia
  - Implementar guards antes de acceder a propiedades anidadas
  - Crear funciones de utilidad para validaciones comunes

- [ ] **6.2.2**: Implementar error handling centralizado
  - Crear sistema unificado de manejo de errores
  - Mejorar mensajes de error para debugging

---

## Fase 8: Lint Cleanup

| Campo | Valor |
|-------|-------|
| **Prioridad** | BAJA |
| **Estado** | Pendiente |
| **Estimación** | 1-2 horas |

### Descripción

Limpiar warnings de lint y eliminar código no utilizado para mejorar la calidad del código y facilitar el mantenimiento.

### Tareas Detalladas

#### 8.1. Limpieza de Código

- [ ] **8.1.1**: Revisar imports no utilizados
  - [`sc-solana/tests/`](sc-solana/tests/) - Verificar todos los archivos de test
  - Eliminar imports redundantes o no usados

- [ ] **8.1.2**: Corregir variables declaradas pero no usadas
  - Buscar patrones de variables sin uso
  - Eliminar o utilizar correctamente

- [ ] **8.1.3**: Aplicar reglas de ESLint en frontend
  - [`web/src/`](web/src/) - Ejecutar `yarn lint --fix`
  - Corregir errores restantes manualmente

- [ ] **8.1.4**: Configurar .eslintrc con reglas estrictas
  - Revisar [`web/eslint.config.mjs`](web/eslint.config.mjs)
  - Agregar reglas para prevenir errores comunes

---

## Fase 9: Testing de Integración Completa

| Campo | Valor |
|-------|-------|
| **Prioridad** | BAJA |
| **Estado** | Pendiente |
| **Estimación** | 1-2 días |

### Descripción

Crear tests end-to-end que validen flujos completos del sistema, desde el registro hasta la auditoría de netbooks.

### Tareas Detalladas

#### 9.1. Tests de Flujo Completo

- [ ] **9.1.1**: Test de flujo completo de registro de netbook
  - Simular registro completo desde fabricante
  - Validar eventos emitidos
  - Verificar estado final del netbook

- [ ] **9.1.2**: Test de flujo completo de gestión de roles
  - Simular secuencia completa: grant → request → accept
  - Validar cambios de permisos
  - Verificar rollback en casos de error

- [ ] **9.1.3**: Test de flujo completo de auditoría
  - Simular ciclo completo: register → assign → audit → validate
  - Validar integridad de datos en cada paso
  - Verificar logs y eventos

#### 9.2. Tests de Escenarios Avanzados

- [ ] **9.2.1**: Tests de escenarios de error
  - Validar comportamiento ante inputs inválidos
  - Probar transiciones de estado no permitidas
  - Verificar rollback en casos de fallo

- [ ] **9.2.2**: Tests de performance y carga
  - Medir tiempo de respuesta de instrucciones
  - Probar batch operations
  - Validar comportamiento bajo carga

---

## Fase 10: Documentación y CI/CD

| Campo | Valor |
|-------|-------|
| **Prioridad** | BAJA |
| **Estado** | Pendiente |
| **Estimación** | 1 día |

### Descripción

Actualizar documentación del proyecto y configurar pipeline de CI/CD para automatizar builds, tests y linting.

### Tareas Detalladas

#### 10.1. Documentación

- [ ] **10.1.1**: Actualizar README.md
  - Agregar instrucciones de testing detalladas
  - Incluir guía de contribución
  - Actualizar estado del proyecto

- [ ] **10.1.2**: Crear documentación de API
  - Documentar instrucciones del programa Anchor
  - Incluir ejemplos de llamadas
  - Documentar eventos y errores

- [ ] **10.1.3**: Documentar arquitectura de tests
  - Explicar estructura de tests
  - Documentar cómo ejecutar tests
  - Incluir guía de debugging

#### 10.2. CI/CD

- [ ] **10.2.1**: Crear .github/workflows/ci.yml
  - Configurar workflow para push y PR
  - Agregar jobs para build, test, lint

- [ ] **10.2.2**: Configurar jobs del pipeline
  - Job 1: Build (Rust + TypeScript)
  - Job 2: Unit Tests (Jest + Cargo)
  - Job 3: Lint (clippy + ESLint)
  - Job 4: E2E Tests (Playwright)

---

## Verificaciones Finales

### Estado Actual de Build

| Verificación | Estado | Notas |
|-------------|--------|-------|
| `cargo clippy -- -D warnings` | ✅ | Sin warnings |
| `cargo build` | ✅ | Éxito |
| `tsc --noEmit` (web) | ✅ | Sin errores |
| `anchor test` | ⚠️ | Requiere validator local |
| `yarn test` | ✅ | 6/6 passing |
| `tsc --noEmit` (sc-solana) | ⚠️ | 114 errores preexistentes en tests |

### Checklist de Verificación Final

- [ ] Todos los tests de Anchor passing con validator local
- [ ] `cargo clippy -- -D warnings` sin warnings
- [ ] `tsc --noEmit` sin errores en todos los proyectos
- [ ] `yarn test` 100% passing
- [ ] E2E tests passing en todos los browsers
- [ ] Documentation actualizada
- [ ] CI/CD pipeline funcionando

---

## Archivos Modificados en Esta Sesión

### Nuevos Archivos

- [`docker/docker-compose.yml`](docker/docker-compose.yml) - Configuración de Docker Compose
- [`docker/Dockerfile.web`](docker/Dockerfile.web) - Dockerfile para frontend
- [`docker/Dockerfile.playwright`](docker/Dockerfile.playwright) - Dockerfile para Playwright
- [`docker/README.md`](docker/README.md) - Documentación de Docker
- [`.dockerignore`](.dockerignore) - Reglas de exclusión de Docker
- [`sc-solana/tests/test-isolation.ts`](sc-solana/tests/test-isolation.ts) - Tests de aislamiento
- [`web/scripts/run-e2e-tests.sh`](web/scripts/run-e2e-tests.sh) - Script de E2E tests
- [`web/scripts/run-unit-tests.sh`](web/scripts/run-unit-tests.sh) - Script de unit tests
- [`web/scripts/run-all-tests.sh`](web/scripts/run-all-tests.sh) - Script de todos los tests
- [`web/e2e/.gitkeep`](web/e2e/.gitkeep) - Placeholder para E2E tests
- [`VERIFICATIONS.md`](VERIFICATIONS.md) - Reporte de verificaciones

### Archivos Modificados

- [`sc-solana/tests/test-helpers.ts`](sc-solana/tests/test-helpers.ts)
- [`sc-solana/tests/role-management.ts`](sc-solana/tests/role-management.ts)
- [`sc-solana/tests/integration-full-lifecycle.ts`](sc-solana/tests/integration-full-lifecycle.ts)
- [`sc-solana/tests/lifecycle.ts`](sc-solana/tests/lifecycle.ts)
- [`web/jest.config.js`](web/jest.config.js)
- [`web/package.json`](web/package.json)
- [`web/README.md`](web/README.md)

---

## Notas Adicionales

### Dependencias

- Validator local de Solana requerido para `anchor test`
- Docker y Docker Compose para entornos aislados
- Node.js 18+ para frontend

### Comandos Útiles

```bash
# Build del programa
cd sc-solana && cargo build

# Tests del programa
cd sc-solana && anchor test

# Tests del frontend
cd web && yarn test

# E2E Tests
cd web && yarn playwright test

# Lint
cd sc-solana && cargo clippy -- -D warnings
cd web && yarn lint
```

### Referencias

- [Anchor Framework](https://book.anchor-lang.com/)
- [Solana Docs](https://docs.solana.com/)
- [Playwright Docs](https://playwright.dev/)
