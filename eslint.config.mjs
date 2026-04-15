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
    '@typescript-eslint/no-explicit-any': 'error',
    // Safe in this project: v-html with own data, dynamic delete on own objects
    'vue/no-v-html': 'off',
    '@typescript-eslint/no-dynamic-delete': 'off',
    '@typescript-eslint/no-require-imports': 'off'
  }
})
