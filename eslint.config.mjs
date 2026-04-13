import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';

export default [
    // Base ESLint recommended rules
    eslint.configs.recommended,

    // Prettier config to disable conflicting rules
    prettierConfig,

    {
        files: ['src/**/*.ts', 'src/**/*.tsx'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                project: './tsconfig.json',
            },
            globals: {
                process: 'readonly',
                console: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            // TypeScript-specific rules
            '@typescript-eslint/no-explicit-any': 'warn',
            'no-unused-vars': 'off', // Disable base rule as it conflicts with @typescript-eslint/no-unused-vars
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-non-null-assertion': 'warn',

            // General rules
            'no-console': 'off',
            'prefer-const': 'error',
            'no-var': 'error',
        },
    },

    // Config files (without project reference)
    {
        files: ['*.config.ts', '*.config.mts'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
    },

    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            'website/**',
            '*.config.js',
            '*.config.mjs',
        ],
    },
];
