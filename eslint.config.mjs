import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  ignores: ['docs/**']
}, {
  rules: {
    // Allow console for server-side logging
    'no-console': 'off',
    // Vue rules - relaxed for existing codebase
    'vue/multi-word-component-names': 'off',
    'vue/no-multiple-template-root': 'off',
    // Downgrade to warnings - fix incrementally
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-dynamic-delete': 'warn',
    '@typescript-eslint/no-require-imports': 'warn'
  }
})
