const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');

/**
 * ESLint configuration for the frontend (Next.js) workspace
 * Uses ESLint v9 flat config format
 */
module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: false, // Disable type-aware linting to avoid parsing issues
        lib: ['DOM', 'DOM.Iterable', 'ES2022'],
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        NodeJS: 'readonly',
        HTMLDivElement: 'readonly',
        SVGElement: 'readonly',
        SVGSVGElement: 'readonly',
        RequestInit: 'readonly',
        HeadersInit: 'readonly',
      },
      parserOptions: {
        lib: ['DOM', 'DOM.Iterable', 'ES2022'],
      },
    },
    plugins: {
      react: react,
      'react-hooks': reactHooks,
      '@typescript-eslint': tseslint,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...prettier.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      '**/*.js',
      'next-env.d.ts',
    ],
  },
];

