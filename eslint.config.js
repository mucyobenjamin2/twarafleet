import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // This app fetches data with plain useEffect + useState (no React Query/SWR).
      // That "load on mount" shape is exactly what this rule flags, but it is
      // correct and intentional here, not a bug — downgraded to a warning.
      'react-hooks/set-state-in-effect': 'warn',
      // AuthContext.jsx intentionally exports both the provider component and
      // the useAuth() hook from one file; harmless for fast refresh in practice.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
