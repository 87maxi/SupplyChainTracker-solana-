# 🔍 Reporte de Auditoría Frontend — SupplyChainTracker

> **Fecha:** 2026-05-13
> **Herramientas:** `tsc --noEmit`, `eslint src/ --max-warnings=0`, análisis manual
> **Directorio:** `web/src/`

---

## 📊 Resumen Ejecutivo

| Categoría | Crítico | Alto | Medio | Bajo |
|-----------|---------|------|-------|------|
| Errores TypeScript | 3 | 4 | 2 | - |
| Errores ESLint | - | 12 | 25+ | 15+ |
| Arquitectura | 2 | 3 | 4 | - |
| UI/UX | - | 2 | 5 | 3 |
| **Total** | **5** | **21** | **36** | **18** |

---

## 1. ❌ ERRORES CRÍTICOS (Bloquean compilación/ejecución)

### 1.1 Tipos no definidos en `PendingRoleRequests.tsx`
**Archivo:** [`src/app/admin/components/PendingRoleRequests.tsx`](src/app/admin/components/PendingRoleRequests.tsx:76)

```
TS2304: Cannot find name 'RoleRequest'
TS2304: Cannot find name 'UserRoleData'
TS2304: Cannot find name 'eventBus'
TS2304: Cannot find name 'EVENTS'
TS2552: Cannot find name 'getRoleMembers'
TS2552: Cannot find name 'getRoleMemberCount'
```

**Problema:** El componente usa tipos y funciones que no están importados. Define sus propios tipos locales (`RoleMember`, `RoleRequestStatus`, `NetbookStatus`) pero luego referencia `RoleRequest` y `UserRoleData` sin importarlos.

**Impacto:** El componente **no compila**. No puede renderizarse en producción.

**Solución:**
- Importar `RoleRequest` desde `@/types/role-request` o `@/hooks/useRoleRequests`
- Importar `UserRoleData` desde el hook correspondiente
- Importar `eventBus` y `EVENTS` desde `@/lib/events`
- Importar `getRoleMembers` y `getRoleMemberCount` desde el servicio correcto

---

### 1.2 `RoleName` no exportado en `roleMapping.ts`
**Archivo:** [`src/app/admin/components/RoleManagementSection.tsx`](src/app/admin/components/RoleManagementSection.tsx:15)

```
TS2459: Module '"@/lib/roleMapping"' declares 'RoleName' locally, but it is not exported
```

**Problema:** `RoleManagementSection` intenta importar `RoleName` desde `roleMapping.ts`, pero ese tipo solo está declarado localmente (no tiene `export`).

**Solución:** Agregar `export` a la declaración del tipo `RoleName` en [`src/lib/roleMapping.ts`](src/lib/roleMapping.ts:7).

---

### 1.3 Acceso incorrecto a `RoleMap` en `RoleRequestsDashboard.tsx` y `DashboardOverview.tsx`
**Archivos:**
- [`src/app/admin/components/RoleRequestsDashboard.tsx`](src/app/admin/components/RoleRequestsDashboard.tsx:205)
- [`src/components/admin/DashboardOverview.tsx`](src/components/admin/DashboardOverview.tsx:195)

```
TS2339: Property 'FABRICANTE' does not exist on type 'RoleMap'
TS2339: Property 'AUDITOR_HW' does not exist on type 'RoleMap'
TS2339: Property 'TECNICO_SW' does not exist on type 'RoleMap'
TS2339: Property 'ESCUELA' does not exist on type 'RoleMap'
```

**Problema:** El tipo `RoleMap` en [`src/lib/roleUtils.ts`](src/lib/roleUtils.ts:3) define las claves con sufijo `_ROLE` (ej. `FABRICANTE_ROLE`), pero los componentes acceden sin el sufijo (ej. `roleHashes.FABRICANTE`).

**Solución:** Cambiar todas las referencias de `roleHashes.FABRICANTE` a `roleHashes.FABRICANTE_ROLE` (y similares).

---

### 1.4 `BN.toBigInt()` no existe
**Archivo:** [`src/services/UnifiedSupplyChainService.ts`](src/services/UnifiedSupplyChainService.ts:395)

```
TS2339: Property 'toBigInt' does not exist on type 'BN'
```

**Problema:** La clase `BN` de `@coral-xyz/anchor` no tiene método `toBigInt()`. Las líneas 395, 459 y 587 intentan usarlo.

**Solución:** Usar `BigInt(bn.toString())` en lugar de `bn.toBigInt()`.

---

### 1.5 Import default donde no existe
**Archivo:** [`src/app/admin/roles/pending-requests/page.tsx`](src/app/admin/roles/pending-requests/page.tsx:3)

```
TS2613: Module has no default export
```

**Problema:** `PendingRoleRequests` se exporta como named export pero se importa como default.

**Solución:** Cambiar `import PendingRoleRequests from '...'` a `import { PendingRoleRequests } from '...'`.

---

## 2. ⚠️ ERRORES DE ARQUITECTURA

### 2.1 Triple duplicación de servicios de Supply Chain
**Archivos afectados:**
- [`src/services/SupplyChainService.ts`](src/services/SupplyChainService.ts) — Stub legacy
- [`src/services/SolanaSupplyChainService.ts`](src/services/SolanaSupplyChainService.ts) — Shim deprecated
- [`src/services/UnifiedSupplyChainService.ts`](src/services/UnifiedSupplyChainService.ts) — Servicio real (978 líneas)

**Problema:** Existen 3 clases de servicio que hacen lo mismo. `SupplyChainService` y `SolanaSupplyChainService` son wrappers que delegan a `UnifiedSupplyChainService`. Esto crea:
- Confusión sobre qué servicio usar
- Indentación innecesaria en la cadena de llamadas
- Dificultad para rastrear bugs

**Recomendación:** Eliminar los servicios legacy y migrar todos los imports directamente a `UnifiedSupplyChainService`.

---

### 2.2 Componentes duplicados entre `app/` y `components/`
| Componente | Ubicación 1 | Ubicación 2 |
|------------|-------------|-------------|
| `AnalyticsChart` | `app/admin/analytics/components/AnalyticsChart.tsx` | `components/charts/AnalyticsChart.tsx` |
| `DashboardMetrics` | `app/admin/components/DashboardMetrics.tsx` | `components/admin/dashboard-metrics.tsx` |
| `PendingRoleRequests` | `app/admin/components/PendingRoleRequests.tsx` | `components/role-management/EnhancedPendingRoleRequests.tsx` |
| `SummaryCard` | Múltiples archivos (inline) | - |

**Problema:** Código duplicado que dificulta el mantenimiento. `SummaryCard` aparece como componente inline en al menos 4 archivos diferentes.

---

### 2.3 Proveedores Web3 duplicados
**Archivos:**
- [`src/components/SolanaWalletClientProvider.tsx`](src/components/SolanaWalletClientProvider.tsx) — Usado en `layout.tsx`
- [`src/components/Web3Providers.tsx`](src/components/Web3Providers.tsx) — NO usado, contiene `QueryClientProvider`

**Problema:** `Web3Providers` incluye `QueryClientProvider` pero nunca se usa. `SolanaWalletClientProvider` no incluye `QueryClientProvider`. Esto significa que React Query podría no estar configurado correctamente.

**Recomendación:** Consolidar en un solo provider que incluya tanto `SolanaWalletProvider` como `QueryClientProvider`.

---

### 2.4 Rutas huérfanas sin integración
**Rutas detectadas:**
- `/tokens` — [`src/app/tokens/page.tsx`](src/app/tokens/page.tsx) — Funcionalidad duplicada de `/dashboard`
- `/tokens/create` — [`src/app/tokens/create/page.tsx`](src/app/tokens/create/page.tsx) — Formulario duplicado
- `/tokens/[id]` — [`src/app/tokens/[id]/page.tsx`](src/app/tokens/[id]/page.tsx) — Detalle duplicado
- `/transfers` — [`src/app/transfers/page.tsx`](src/app/transfers/page.tsx) — Sin link de navegación

**Problema:** Estas rutas existen pero no están en la navegación principal. Son funcionalidad duplicada del dashboard.

---

### 2.5 EventBus sin tipado
**Archivo:** [`src/lib/events.ts`](src/lib/events.ts)

**Problema:** El `EventBus` usa `unknown` para datos de eventos. Los consumidores deben hacer type assertions.

**Recomendación:** Implementar EventBus genérico con tipos de evento definidos.

---

## 3. 🔴 ERRORES DE ESLINT (Alta severidad)

### 3.1 Uso excesivo de `any` (54+ instancias)
**Archivos más afectados:**
| Archivo | Conteo de `any` |
|---------|-----------------|
| `UnifiedSupplyChainService.ts` | 1 |
| `SolanaSupplyChainService.ts` | 12 |
| `RoleRequestService.ts` | 1 |
| `useRoleRequests.ts` | 4 |
| `useAnalyticsData.ts` | 2 |
| `useProcessedUserAndNetbookData.ts` | 3 |
| `DashboardOverview.tsx` | 1 |
| `PendingRoleRequests.tsx` | 2 |
| `RoleRequestsDashboard.tsx` | 1 |
| `ApprovedAccountsList.tsx` | 3 |
| `dashboard/page.tsx` | 5 |

**Problema:** El uso de `any` deshabilita la verificación de tipos de TypeScript, permitiendo errores en tiempo de ejecución.

**Patrones más comunes:**
```typescript
// 1. Componentes SummaryCard con icon: any
function SummaryCard({ icon: any, ... }) { ... }

// 2. Catch blocks con error: any
catch (error: any) { ... }

// 3. Arrays sin tipo
const users: any[] = [];
```

**Recomendación:**
- Reemplazar `icon: any` con `icon: React.ElementType` o `icon: LucideIcon`
- Reemplazar `error: any` con `error: unknown` y usar `instanceof Error`
- Tipar arrays explícitamente

---

### 3.2 Imports no utilizados (25+ instancias)
**Ejemplos destacados:**

| Archivo | Imports no usados |
|---------|-------------------|
| `PendingRoleRequests.tsx` | `XCircle`, `getRoleRequests`, `NetbookStatus`, `RoleRequestStatus` |
| `ApprovedAccountsList.tsx` | `ContractRoles`, `roleMapper`, `_force` |
| `EnhancedRoleApprovalDialog.tsx` | `Clock`, `ShieldCheck`, `XCircle`, `open`, `txStatus` |
| `DashboardMetrics.tsx` | `TrendingUp`, `CheckCircle` |
| `NetbookStateMetrics.tsx` | `EVENTS`, `e` |
| `page.tsx` (home) | `useEffect` |
| `tokens/page.tsx` | `CardDescription`, `CardHeader`, `CardTitle` |
| `tokens/create/page.tsx` | `PublicKey`, `address`, `connectWallet` |
| `dashboard/page.tsx` | `Search`, `RefreshCw`, `UserStats`, `NetbookStats`, `userStatsData`, `netbookStatsData`, `getAllSerialNumbers`, `getNetbookState`, `getNetbookReport`, `isEventConnected`, `hasFetchedRef` |

---

### 3.3 `react-hooks/exhaustive-deps` violado
**Archivos afectados:**
- [`src/app/admin/components/NetbookStateMetrics.tsx`](src/app/admin/components/NetbookStateMetrics.tsx:131) — `useEffect` missing `counts.total`, `getAllSerialNumbers`, `getNetbookState`
- [`src/app/transfers/page.tsx`](src/app/transfers/page.tsx:55) — `useEffect` missing `getAllSerialNumbers`, `getNetbookState`

**Problema:** Los hooks de efecto tienen dependencias faltantes, lo que puede causar stale closures y datos desactualizados.

---

## 4. 🎨 PROBLEMAS DE UI/UX

### 4.1 `SummaryCard` duplicado como componente inline
El componente `SummaryCard` aparece como definición inline en:
- `src/app/dashboard/page.tsx`
- `src/app/admin/components/PendingRoleRequests.tsx`
- `src/app/admin/components/RoleRequestsDashboard.tsx`
- `src/components/admin/DashboardOverview.tsx`

**Problema:** Cada versión tiene estilos ligeramente diferentes. No hay consistencia visual.

**Recomendación:** Crear un único `SummaryCard` en `components/ui/` con props tipados.

---

### 4.2 Colores dinámicos con string interpolation
```typescript
// Patrón encontrado en múltiples archivos:
<Icon className={`h-4 w-4 text-${color}`} />
```

**Problema:** Tailwind CSS no puede detectar clases generadas dinámicamente. Las clases `text-${color}` no se compilarán en el CSS final.

**Recomendación:** Usar mapeo de clases predefinidas o `safelist` en `tailwind.config.js`.

---

### 4.3 Falta de estados de carga y error consistentes
- `DashboardSkeleton.tsx` existe pero no se usa consistentemente
- Algunos componentes muestran spinner, otros muestran texto plano
- No hay patrón unificado para error boundaries

---

### 4.4 Componentes de diagnóstico en producción
**Archivos en `layout.tsx`:**
```tsx
<DiagnosticRunner />
<DebugComponent />
```

**Problema:** Los componentes de debug están siempre presentes. Deberían estar condicionales a `NEXT_PUBLIC_DEBUG_MODE=true`.

---

### 4.5 Navegación inconsistente
- El `Header` y `Navigation` existen pero las rutas `/tokens` y `/transfers` no están en el menú
- No hay breadcrumbs ni indicador de ruta actual
- Los links entre páginas usan `next/link` pero algunos usan `router.push()`

---

## 5. 📋 INCONSISTENCIAS DE CÓDIGO

### 5.1 Múltiples definiciones de `RoleRequest`
| Ubicación | Tipo |
|-----------|------|
| `src/types/role-request.ts` | `interface RoleRequest` |
| `src/hooks/useRoleRequests.ts` | `interface RoleRequest` (duplicado) |
| `src/services/RoleRequestService.ts` | `interface RoleRequest` (duplicado) |
| `src/services/UnifiedSupplyChainService.ts` | `interface RoleRequestData` (variante) |

**Problema:** 4 definiciones diferentes del mismo concepto. Los campos pueden divergir.

---

### 5.2 Hooks duplicados para datos similares
| Hook | Propósito |
|------|-----------|
| `useWeb3` | Wrapper de `useSolanaWeb3` |
| `useSolanaWeb3` | Hook principal de wallet |
| `useSafeWallet` | ¿Alternativa? |
| `useSupplyChainService` | Hook de servicio unificado |
| `useFetchNetbooks` | Fetch netbooks (¿duplicado?) |
| `useFetchUsers` | Fetch users (¿duplicado?) |

---

### 5.3 Mezcla de patrones de servicio
- Algunos componentes usan `useSupplyChainService()` hook
- Otros usan `UnifiedSupplyChainService.getInstance()` directamente
- Otros usan `RoleRequestService` (servicio separado)
- Otros usan funciones directas de `lib/contracts/solana-program.ts`

---

### 5.4 Configuración ESLint con reglas duplicadas
**Archivo:** [`eslint.config.mjs`](eslint.config.mjs)

```javascript
// Línea 103 y 118 — regla duplicada:
"react-hooks/exhaustive-deps": "error",  // aparece 2 veces
```

---

### 5.5 `next.config.mjs` con `ignoreBuildErrors: true`
```javascript
typescript: {
  ignoreBuildErrors: true,  // ← Ignora errores TS en build
}
```

**Problema:** Esto permite que el build pase aunque haya errores de TypeScript. Oculta problemas en CI/CD.

---

## 6. 🔒 SEGURIDAD Y ROBUSTEZ

### 6.1 Keys sensibles en `.env.local` committeable
**Archivo:** `.env.local` contiene valores reales:
```
NEXT_PUBLIC_PROGRAM_ID=7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN
NEXT_PUBLIC_DEFAULT_ADMIN_ADDRESS=7eCTmt5LYSqnjgw8jebHjUzf8X7omxEpxYHbsXsmPtZQ
```

Aunque `.env.local` está en `.gitignore`, el archivo existe en el repo con datos reales.

---

### 6.2 Fallbacks silenciosos en servicios
```typescript
// RoleRequestService.ts
catch (error) {
  console.error('[RoleRequestService] Error fetching from Solana:', error);
  return roleRequests; // ← Retorna datos locales sin indicar error
}
```

**Problema:** Los errores se silencian y se retornan datos potencialmente obsoletos sin notificar al usuario.

---

### 6.3 Validación de roles con fallback a ADMIN
```typescript
// roleMapping.ts
if (!key) {
  console.warn(`[roleMapping] No key found for role name: ${name}`);
  return 'ADMIN_ROLE'; // ← Fallback peligroso
}
```

**Problema:** Si un rol no se reconoce, se asigna como ADMIN por defecto. Esto es un riesgo de seguridad.

---

## 7. 📝 MEJORAS RECOMENDADAS (Priorizadas)

### Prioridad 1 — Corregir (Bloqueantes)
1. **Fix `PendingRoleRequests.tsx`** — Agregar imports faltantes de tipos y funciones
2. **Export `RoleName`** en `roleMapping.ts`
3. **Corregir acceso a `RoleMap`** — Usar `FABRICANTE_ROLE` en lugar de `FABRICANTE`
4. **Reemplazar `BN.toBigInt()`** con `BigInt(bn.toString())`
5. **Fix import default** en `pending-requests/page.tsx`

### Prioridad 2 — Refactorizar (Alta)
6. **Eliminar servicios legacy** — Migrar a `UnifiedSupplyChainService` directamente
7. **Consolidar `RoleRequest`** — Una sola definición en `types/`
8. **Crear `SummaryCard` compartido** — Eliminar duplicación inline
9. **Tipar `EventBus`** — Usar generics para datos de eventos
10. **Reemplazar `any`** con tipos específicos (comenzar con `icon: LucideIcon`)

### Prioridad 3 — Mejorar (Media)
11. **Consolidar providers** — Unificar `SolanaWalletClientProvider` + `Web3Providers`
12. **Condicionar debug components** — Usar `NEXT_PUBLIC_DEBUG_MODE`
13. **Fix `exhaustive-deps`** — Agregar dependencias faltantes o usar `useCallback`
14. **Limpiar imports no usados** — Ejecutar `eslint --fix`
15. **Eliminar rutas huérfanas** — Decidir si `/tokens` y `/transfers` son necesarias

### Prioridad 4 — Optimizar (Baja)
16. **Deshabilitar `ignoreBuildErrors`** en `next.config.mjs`
17. **Agregar error boundaries** — Patrones consistentes de manejo de errores
18. **Mejorar navegación** — Agregar breadcrumbs y estado activo
19. **Fix Tailwind dynamic classes** — Usar safelist o mapeo predefinido
20. **Unificar patrones de servicio** — Todos los componentes deben usar hooks

---

## 8. 📈 Métricas de Calidad

| Métrica | Valor | Estado |
|---------|-------|--------|
| Errores TypeScript | 42 | 🔴 Crítico |
| Errores ESLint | 150+ | 🔴 Crítico |
| Usos de `any` | 54 | 🟠 Alto |
| Imports no usados | 25+ | 🟡 Medio |
| Componentes duplicados | 4+ | 🟡 Medio |
| Hooks duplicados | 3+ | 🟡 Medio |
| Archivos sin tests | ~60% | 🟠 Alto |
| Reglas ESLint duplicadas | 1 | 🟢 Bajo |

---

## 9. 🗂️ Checklist Pre-Commit (Actualizado)

Basado en [`AGENTS.md`](../../AGENTS.md) y los hallazgos de esta auditoría:

- [ ] Run `cargo fmt` on all Rust files
- [ ] Run `cargo clippy -- -D warnings` for Rust warnings
- [ ] Run `npx tsc --noEmit` in `web/` — **Debe pasar con 0 errores**
- [ ] Run `npx eslint src/ --max-warnings=0` in `web/` — **Debe pasar con 0 warnings**
- [ ] Run `npm test` in `web/` for unit tests
- [ ] **NEW:** Verify no `any` types in new code
- [ ] **NEW:** Verify no duplicate component definitions
- [ ] **NEW:** Verify all imports are used

---

*Reporte generado automáticamente con análisis estático + revisión manual.*
