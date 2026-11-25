// ESLint 10.15.0 / TS-ESLint 8.73.0
// Updated 21.11.2026

import tseslint from 'typescript-eslint'
import commonConfig from './eslint.config.common.mjs'

export default tseslint.config(
  ...commonConfig,

  {
    rules: {
      'func-style': [
        'error',
        'declaration',
        {
          allowArrowFunctions: true,
          allowTypeAnnotation: false,
          overrides: { namedExports: 'declaration' },
        },
      ],
      'id-length': [
        'error',
        {
          min: 3,
          max: 40,
          properties: 'always',
          exceptions: ['id', 'it', 'to', 'a', 'b', 'x', 'y', 'ci', 'fs'],
          exceptionPatterns: [],
        },
      ],
      '@typescript-eslint/no-use-before-define': [
        'error',
        {
          functions: false,
          classes: true,
          variables: true,
          enums: true,
          typedefs: true,
          ignoreTypeReferences: true,
          allowNamedExports: false,
        },
      ],
    },
  },
)
