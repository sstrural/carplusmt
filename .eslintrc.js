module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    worker: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error', 'debug'] }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'indent': ['error', 2],
    'eqeqeq': ['error', 'always'],
    'curly': 'error',
    'brace-style': ['error', '1tbs'],
    'comma-dangle': ['error', 'only-multiline'],
    'no-var': 'error',
    'object-curly-spacing': ['error', 'always']
  }
};
