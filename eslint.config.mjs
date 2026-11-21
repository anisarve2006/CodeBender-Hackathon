import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/db/admin',
              message:
                'Privileged db/admin is restricted. It can only be imported from lib/auth/**, lib/jobs/**, app/api/jobs/**, and db/seed/**',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'lib/auth/**',
      'lib/jobs/**',
      'app/api/jobs/**',
      'db/seed/**',
      'scripts/**',
      'tests/**',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    'db/migrations/**',
  ]),
]);

export default eslintConfig;
