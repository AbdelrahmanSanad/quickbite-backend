// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  {
    // Tests use loosely-typed mocks and supertest's `any` response bodies;
    // relax the type-safety rules here without weakening production code.
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  // --- Clean Architecture: dependency-direction enforcement ---
  {
    // Domain is the core: no frameworks, no infrastructure, no outer layers.
    files: ['src/modules/*/domain/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@nestjs/*',
                '@prisma/client',
                'prisma',
                'ioredis',
                'joi',
                'helmet',
                'express',
                'class-validator',
                'class-transformer',
                '**/application/**',
                '**/infrastructure/**',
                '**/presentation/**',
              ],
              message:
                'Domain must not depend on frameworks, infrastructure, or outer layers (Clean Architecture).',
            },
          ],
        },
      ],
    },
  },
  {
    // Application depends only on the domain (+ Nest DI). No concrete
    // infrastructure and no presentation.
    files: ['src/modules/*/application/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@prisma/client',
                'prisma',
                'ioredis',
                '@nestjs/jwt',
                '@nestjs/throttler',
                '@nestjs/swagger',
                '@nestjs/config',
                '@nestjs/event-emitter',
                'helmet',
                'express',
                '**/infrastructure/**',
                '**/presentation/**',
              ],
              message:
                'Application must depend on domain ports only — not concrete infrastructure or presentation (Clean Architecture).',
            },
          ],
        },
      ],
    },
  },
);
