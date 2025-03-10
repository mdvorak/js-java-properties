import eslint from '@eslint/js'
import prettierLint from 'eslint-config-prettier/flat'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tslint from 'typescript-eslint'

export default tslint.config([
  {
    ignores: [
      'lib/**',
      'node_modules/**',
      'coverage/**',
      '.idea/**',
      'eslint.config.mjs'
    ]
  },
  eslint.configs.recommended,
  prettierLint,
  tslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      'simple-import-sort': simpleImportSort
    },
    rules: {
      quotes: [
        'error',
        'single',
        {
          avoidEscape: true,
          allowTemplateLiterals: true
        }
      ],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/restrict-template-expressions': 'off'
    }
  }
])
