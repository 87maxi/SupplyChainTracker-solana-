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
        browser: true,
        node: true,
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
      "react-hooks/exhaustive-deps": "error",

      // Reglas de Importación (Detecta "Export doesn't exist" y sintaxis)
      "import/named": "error",
      "import/no-unresolved": "error",
      "import/no-duplicates": "error",
      
      // Errores de lógica base
      "no-undef": "error",
      "no-unused-vars": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];