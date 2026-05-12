#!/bin/bash
# Script para ejecutar tests E2E con reporte detallado de errores
# Captura errores de consola, red y UI durante la ejecución

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_PROJECT="${1:-full-flow-sequential}"
TEST_MODE="${2:-headless}"
OUTPUT_DIR="${PROJECT_DIR}/test-results/e2e-report-$(date +%Y%m%d-%H%M%S)"

# Crear directorio de output
mkdir -p "${OUTPUT_DIR}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  E2E Test Runner with Error Tracking${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Project: ${YELLOW}${TEST_PROJECT}${NC}"
echo -e "Mode: ${YELLOW}${TEST_MODE}${NC}"
echo -e "Output: ${YELLOW}${OUTPUT_DIR}${NC}"
echo ""

# Cambiar al directorio del proyecto web
cd "${PROJECT_DIR}"

# Iniciar servidor de desarrollo si no está corriendo
echo -e "${BLUE}Checking for existing dev server...${NC}"
if ! lsof -i :3001 > /dev/null 2>&1; then
    echo -e "${YELLOW}Starting dev server...${NC}"
    npm run dev &
    DEV_SERVER_PID=$!
    sleep 5
else
    echo -e "${GREEN}Dev server already running${NC}"
fi

# Ejecutar tests y capturar output
echo -e "${BLUE}Running tests...${NC}"
echo ""

# Comando de test basado en el modo
if [ "${TEST_MODE}" = "headed" ]; then
    TEST_CMD="npx playwright test --project=${TEST_PROJECT} --headed"
else
    TEST_CMD="npx playwright test --project=${TEST_PROJECT}"
fi

# Ejecutar y capturar todo el output
TEST_OUTPUT_FILE="${OUTPUT_DIR}/test-output.log"
ERROR_LOG="${OUTPUT_DIR}/errors.log"
CONSOLE_ERRORS="${OUTPUT_DIR}/console-errors.log"
NETWORK_ERRORS="${OUTPUT_DIR}/network-errors.log"

# Ejecutar tests
${TEST_CMD} 2>&1 | tee "${TEST_OUTPUT_FILE}"

TEST_EXIT_CODE=${PIPESTATUS[0]}

# Detener servidor de desarrollo si lo iniciamos
if [ -n "${DEV_SERVER_PID}" ]; then
    echo -e "${YELLOW}Stopping dev server...${NC}"
    kill ${DEV_SERVER_PID} 2>/dev/null || true
fi

# Generar reporte de errores
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Generating Error Report${NC}"
echo -e "${BLUE}========================================${NC}"

# Extraer errores de consola
echo -e "${BLUE}Extracting console errors...${NC}"
grep -i "console.error\|error:" "${TEST_OUTPUT_FILE}" > "${CONSOLE_ERRORS}" 2>/dev/null || true

# Extraer errores de red
echo -e "${BLUE}Extracting network errors...${NC}"
grep -i "404\|500\|network error\|request failed" "${TEST_OUTPUT_FILE}" > "${NETWORK_ERRORS}" 2>/dev/null || true

# Contar errores
CONSOLE_ERROR_COUNT=$(wc -l < "${CONSOLE_ERRORS}" 2>/dev/null || echo "0")
NETWORK_ERROR_COUNT=$(wc -l < "${NETWORK_ERRORS}" 2>/dev/null || echo "0")

# Generar resumen
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ERROR REPORT SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "${CONSOLE_ERROR_COUNT}" -gt 0 ]; then
    echo -e "${RED}⚠ Console Errors Found: ${CONSOLE_ERROR_COUNT}${NC}"
    echo -e "${RED}--- Console Errors ---${NC}"
    cat "${CONSOLE_ERRORS}"
    echo ""
fi

if [ "${NETWORK_ERROR_COUNT}" -gt 0 ]; then
    echo -e "${RED}⚠ Network Errors Found: ${NETWORK_ERROR_COUNT}${NC}"
    echo -e "${RED}--- Network Errors ---${NC}"
    cat "${NETWORK_ERRORS}"
    echo ""
fi

# Verificar si hubo fallos en los tests
TEST_FAILURES=$(grep -c "FAILED" "${TEST_OUTPUT_FILE}" 2>/dev/null || echo "0")
TEST_PASSED=$(grep -c "passed" "${TEST_OUTPUT_FILE}" 2>/dev/null || echo "0")

echo -e "${BLUE}Test Results:${NC}"
echo -e "  Tests Passed: ${GREEN}${TEST_PASSED}${NC}"
echo -e "  Tests Failed: ${RED}${TEST_FAILURES}${NC}"
echo -e "  Exit Code: ${TEST_EXIT_CODE}"
echo ""

# Mostrar ubicación de videos y screenshots
echo -e "${BLUE}Artifacts Location:${NC}"
echo -e "  Test Output: ${YELLOW}${TEST_OUTPUT_FILE}${NC}"
echo -e "  Error Report: ${YELLOW}${OUTPUT_DIR}/report.md${NC}"
echo -e "  Console Errors: ${YELLOW}${CONSOLE_ERRORS}${NC}"
echo -e "  Network Errors: ${YELLOW}${NETWORK_ERRORS}${NC}"

# Videos y screenshots
if [ -d "${PROJECT_DIR}/e2e/videos" ]; then
    VIDEO_COUNT=$(find "${PROJECT_DIR}/e2e/videos" -name "*.mp4" 2>/dev/null | wc -l)
    echo -e "  Videos: ${YELLOW}${VIDEO_COUNT} found in e2e/videos/${NC}"
fi

if [ -d "${PROJECT_DIR}/e2e/screenshots" ]; then
    SCREENSHOT_COUNT=$(find "${PROJECT_DIR}/e2e/screenshots" -name "*.png" 2>/dev/null | wc -l)
    echo -e "  Screenshots: ${YELLOW}${SCREENSHOT_COUNT} found in e2e/screenshots/${NC}"
fi

echo ""

# Generar reporte markdown
cat > "${OUTPUT_DIR}/report.md" << EOF
# E2E Test Error Report

## Test Configuration
- **Project**: ${TEST_PROJECT}
- **Mode**: ${TEST_MODE}
- **Date**: $(date)
- **Exit Code**: ${TEST_EXIT_CODE}

## Test Results
- **Tests Passed**: ${TEST_PASSED}
- **Tests Failed**: ${TEST_FAILURES}

## Error Summary
- **Console Errors**: ${CONSOLE_ERROR_COUNT}
- **Network Errors**: ${NETWORK_ERROR_COUNT}

## Console Errors
\`\`\`
$(cat "${CONSOLE_ERRORS}" 2>/dev/null || echo "No console errors found")
\`\`\`

## Network Errors
\`\`\`
$(cat "${NETWORK_ERRORS}" 2>/dev/null || echo "No network errors found")
\`\`\`

## Full Test Output
See \`${TEST_OUTPUT_FILE}\` for complete output.

## Artifacts
- Videos: e2e/videos/
- Screenshots: e2e/screenshots/flow/
EOF

echo -e "${BLUE}Report generated: ${OUTPUT_DIR}/report.md${NC}"
echo ""

# Mostrar resumen final
if [ "${TEST_EXIT_CODE}" -eq 0 ] && [ "${CONSOLE_ERROR_COUNT}" -eq 0 ] && [ "${NETWORK_ERROR_COUNT}" -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed with no errors!${NC}"
elif [ "${TEST_EXIT_CODE}" -eq 0 ]; then
    echo -e "${YELLOW}⚠ Tests passed but warnings/errors were detected in console/network${NC}"
else
    echo -e "${RED}✗ Tests failed with exit code ${TEST_EXIT_CODE}${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Report saved to: ${OUTPUT_DIR}${NC}"
echo -e "${BLUE}========================================${NC}"

exit ${TEST_EXIT_CODE}
