import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // Phosphor Bold only: every icon goes through components/ui/icon.tsx.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@phosphor-icons/react',
              message: 'Import icons from "@/components/ui/icon" (Phosphor Bold wrapper).',
            },
          ],
          patterns: [
            {
              group: ['@phosphor-icons/react/*'],
              message: 'Import icons from "@/components/ui/icon" (Phosphor Bold wrapper).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/ui/icon.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
  ]),
]);
