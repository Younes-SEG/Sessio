import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    '.next-ci/**',
    'src/generated/**',
    'public/licenses/**',
    'vendor/**',
    '.postgres/**',
    'artifacts/**',
    '.syllabus-service/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
  ]),
]);
