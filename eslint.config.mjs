/**
 * ESLint Configuration (Flat Config - ESLint 9+)
 * TypeScript-focused linting rules for the QA framework
 */
import tseslint from 'typescript-eslint';
import eslint from '@eslint/js';

export default tseslint.config(
  // Base ESLint recommended rules
  eslint.configs.recommended,
  
  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,
  
  // Custom configuration
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      
      // General rules
      'no-console': 'off', // Allow console for test output
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'warn',
      'no-var': 'error',
      
      // Allow empty catch blocks (common in test fallbacks)
      'no-empty': ['error', { allowEmptyCatch: true }],
      
      // Cucumber step definitions often have unused parameters
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
  
  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'reports/**',
      '*.js',
      '*.mjs',
      '*.cjs',
    ],
  }
);
