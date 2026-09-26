/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '..',
  roots: ['<rootDir>/backend/src', '<rootDir>/content-pipeline'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/backend/tsconfig.test.json' }],
    // jose is ESM-only; compiled to CommonJS so tests can verify real signatures.
    '/node_modules/jose/.+\\.js$': ['ts-jest', { tsconfig: { allowJs: true }, isolatedModules: true }],
  },
  transformIgnorePatterns: ['/node_modules/(?!jose/)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/backend/$1',
    '^@app/shared$': '<rootDir>/shared/src',
    '^@app/shared/(.*)$': '<rootDir>/shared/src/$1',
  },
};
