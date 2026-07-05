const googleConfig = require('eslint-config-google');

module.exports = [
  {
    ...googleConfig,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
      },
    },
    rules: {
      ...googleConfig.rules,
      // Allow console in Node.js applications
      'no-console': 'off',
      // Allow require() statements
      'no-undef': 'error',
      // Relax some Google rules for game development
      'max-len': 'off', // Let Prettier handle line length
      'require-jsdoc': 'off', // We'll add docs gradually
      'valid-jsdoc': 'off',
      // Disable conflicting rules with Prettier
      indent: 'off',
      'comma-dangle': 'off',
      'object-curly-spacing': 'off',
      'arrow-parens': 'off',
      'quote-props': 'off',
      'operator-linebreak': 'off',
      quotes: 'off',
      // Prettier integration
      'prettier/prettier': 'error',
    },
    plugins: {
      prettier: require('eslint-plugin-prettier'),
    },
    ignores: [
      'node_modules/**',
      'tests/recorded-games/**',
      'coverage/**',
    ],
  },
  // Jest-specific configuration for test files
  {
    files: ['**/*.test.js', '**/tests/**/*.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: {
      // Test files can be more relaxed
      'max-len': 'off',
      'no-console': 'off',
      quotes: 'off',
      'prettier/prettier': 'error',
    },
  },
];
