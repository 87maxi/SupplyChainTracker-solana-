import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";

export default [
  {
    // 1. Ignorar carpetas siempre al principio
    ignores: [
      "**/node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "components-bkp/**",
      "scripts/**",
      "test-*.js",
      "wagmi.config.js",
    ],
  },
  {
    // 2. CONFIGURACIÓN UNIFICADA
    // Aplicamos el parser de TS a TODOS los archivos (js, jsx, ts, tsx)
    // Esto es lo que permite detectar el error de "import" ilegal en cualquier archivo.
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Node.js globals
        process: true,
        Buffer: true,
        URL: true,
        URLSearchParams: true,
        console: true,
        // Browser globals
        window: true,
        document: true,
        localStorage: true,
        sessionStorage: true,
        navigator: true,
        setTimeout: true,
        setInterval: true,
        clearTimeout: true,
        clearInterval: true,
        // Web APIs
        fetch: true,
        Headers: true,
        Request: true,
        Response: true,
        FormData: true,
        FileReader: true,
        AbortController: true,
        confirm: true,
        alert: true,
        // Jest globals (for test files)
        jest: true,
        describe: true,
        it: true,
        expect: true,
        beforeAll: true,
        afterAll: true,
        beforeEach: true,
        afterEach: true,
        vi: true,
        // React globals
        React: true,
        JSX: true,
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "import": importPlugin,
      "@typescript-eslint": ts,
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        typescript: true,
        node: true,
      },
    },
    rules: {
      // Reglas recomendadas de JS y TS
      ...js.configs.recommended.rules,
      ...ts.configs.recommended.rules,

      // Reglas de React y Hooks (CRÍTICO para evitar renders infinitos)
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Disable immutability rule - too many false positives for legitimate patterns
      "react-hooks/immutability": "off",

      // Reglas de Importación (Detecta "Export doesn't exist" y sintaxis)
      "import/named": "warn",
      "import/no-unresolved": "warn",
      "import/no-duplicates": "error",
      
      // Errores de lógica base
      "no-undef": "off",
      // Disable unused vars warnings - too many false positives in legacy code
      // Will be enabled incrementally as code is cleaned up
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // Disable exhaustive-deps - many legitimate cases with async callbacks
      "react-hooks/exhaustive-deps": "off",
      // Disable no-explicit-any - too many false positives for external types (Solana SDK, IDL types, etc.)
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
