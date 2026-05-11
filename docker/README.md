# SupplyChainTracker - Infraestructura Docker para Tests E2E

Esta carpeta contiene la infraestructura Docker necesaria para ejecutar los tests E2E de Playwright en un entorno aislado y reproducible.

## Estructura

```
docker/
├── docker-compose.yml    # Orquestación de servicios
├── Dockerfile.web        # Imagen para el servidor de desarrollo Next.js
├── Dockerfile.playwright # Imagen para ejecutar tests E2E
└── README.md             # Este archivo
```

## Servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| `web-dev` | 3000 | Servidor de desarrollo Next.js con hot reload |
| `playwright` | - | Ejecuta tests E2E headless |
| `playwright-ui` | 9323 | Interfaz visual de Playwright para debugging |
| `e2e` | - | Servicio orquestador para tests completos |

## Variables de Entorno

Las siguientes variables de entorno son necesarias. Se pueden configurar en un archivo `.env` en la raíz del proyecto o pasar directamente:

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `NEXT_PUBLIC_PROGRAM_ID` | Program ID de Solana | `0000000000000000000000000000000000000000` |
| `NEXT_PUBLIC_RPC_URL` | URL del RPC de Solana | `http://localhost:8899` |
| `NEXT_PUBLIC_CLUSTER` | Cluster de Solana | `devnet` |
| `NEXT_PUBLIC_APP_URL` | URL de la aplicación | `http://localhost:3000` |

### Archivo `.env`

Crear un archivo `.env` en la raíz del proyecto con las variables necesarias:

```bash
# En la raíz del proyecto:
echo "NEXT_PUBLIC_PROGRAM_ID=tu_program_id" > .env
echo "NEXT_PUBLIC_RPC_URL=http://localhost:8899" >> .env
echo "NEXT_PUBLIC_CLUSTER=devnet" >> .env
```

También se debe crear un archivo `web/.env.local`:

```bash
# En el directorio web/:
cp .env.example .env.local
# Editar .env.local con los valores correctos
```

## Comandos

### Iniciar todos los servicios

```bash
# Construir e iniciar todos los servicios en segundo plano
docker compose -f docker/docker-compose.yml up -d

# O con docker-compose (versiones antiguas)
docker-compose -f docker/docker-compose.yml up -d
```

### Ejecutar tests E2E

```bash
# Ejecutar todos los tests E2E
docker compose -f docker/docker-compose.yml run --rm e2e

# Ejecutar tests con el servicio playwright
docker compose -f docker/docker-compose.yml run --rm playwright

# Ejecutar tests en modo headed (con interfaz visual)
docker compose -f docker/docker-compose.yml run --rm playwright npx playwright test --headed
```

### Iniciar solo el servidor de desarrollo

```bash
# Iniciar el servidor web-dev
docker compose -f docker/docker-compose.yml up -d web-dev

# Ver logs
docker compose -f docker/docker-compose.yml logs -f web-dev
```

### Iniciar Playwright UI Mode

```bash
# Iniciar el servicio de UI (accesible en http://localhost:9323)
docker compose -f docker/docker-compose.yml up -d playwright-ui

# Ver logs
docker compose -f docker/docker-compose.yml logs -f playwright-ui
```

### Detener servicios

```bash
# Detener todos los servicios
docker compose -f docker/docker-compose.yml down

# Detener y eliminar volúmenes
docker compose -f docker/docker-compose.yml down -v

# Detener y eliminar volúmenes y redes
docker compose -f docker/docker-compose.yml down -v --remove-orphans
```

### Reconstruir imágenes

```bash
# Reconstruir todas las imágenes
docker compose -f docker/docker-compose.yml build

# Reconstruir una imagen específica
docker compose -f docker/docker-compose.yml build web-dev
docker compose -f docker/docker-compose.yml build playwright

# Reconstruir sin caché
docker compose -f docker/docker-compose.yml build --no-cache
```

## Acceder a los Servicios

### Servidor de Desarrollo Next.js

Una vez que el servicio `web-dev` esté corriendo, acceder al servidor de desarrollo en:

```
http://localhost:3000
```

### Playwright UI Mode

Una vez que el servicio `playwright-ui` esté corriendo, acceder a la interfaz visual en:

```
http://localhost:9323
```

Esto permitirá explorar los tests, ejecutarlos individualmente y ver los resultados en tiempo real.

### Playwright Report

Los reports de tests se generan en `web/playwright-report/`. Para verlos:

```bash
# Abrir el report generado
docker compose -f docker/docker-compose.yml exec playwright npx playwright show-report
```

O abrir el archivo HTML directamente:

```bash
xdg-open web/playwright-report/index.html
```

## Ejecutar Tests Individualmente

```bash
# Ejecutar un archivo de test específico
docker compose -f docker/docker-compose.yml run --rm playwright npx playwright test e2e/home.spec.ts

# Ejecutar tests con un nombre específico
docker compose -f docker/docker-compose.yml run --rm playwright npx playwright test -g "login"

# Ejecutar en modo debug
docker compose -f docker/docker-compose.yml run --rm playwright npx playwright test --debug

# Ejecutar con timeout personalizado
docker compose -f docker/docker-compose.yml run --rm playwright npx playwright test --timeout=60000

# Ejecutar en headed mode (con navegador visible)
docker compose -f docker/docker-compose.yml run --rm playwright npx playwright test --headed

# Ejecutar en un proyecto/browser específico
docker compose -f docker/docker-compose.yml run --rm playwright npx playwright test --project=chromium
```

## Solución de Problemas

### Tests fallan por timeout

Aumentar el timeout en el docker-compose.yml o ejecutar con:

```bash
docker compose -f docker/docker-compose.yml run --rm playwright npx playwright test --timeout=120000
```

### Servidor web no inicia

Verificar los logs:

```bash
docker compose -f docker/docker-compose.yml logs web-dev
```

Asegurarse de que el puerto 3000 no esté en uso en el host:

```bash
lsof -i :3000
```

### Problemas con dependencias de Playwright

Reinstalar las dependencias:

```bash
docker compose -f docker/docker-compose.yml run --rm playwright npx playwright install --with-deps
```

### Limpiar todo

```bash
# Detener y eliminar todo
docker compose -f docker/docker-compose.yml down -v --remove-orphans

# Eliminar imágenes
docker compose -f docker/docker-compose.yml down --rmi all

# Limpiar volúmenes huérfanas
docker volume prune -f
```

## Desarrollo Local Alternativo

Si se prefiere ejecutar los tests sin Docker:

```bash
# En el directorio web/
cd web

# Instalar dependencias
npm install

# Instalar browsers de Playwright
npx playwright install --with-deps

# Iniciar servidor de desarrollo
npm run dev

# En otra terminal, ejecutar tests
npm run test:e2e
```
