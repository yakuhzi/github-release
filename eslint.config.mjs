// ESLint 9.29.0 / TS-ESLint 8.35.0
// Updated 27.06.2025

import tseslint from 'typescript-eslint'
import commonConfig from './eslint.config.common.mjs'

export default tseslint.config(
  ...commonConfig,

  {
    rules: {
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
    },
  },
)
