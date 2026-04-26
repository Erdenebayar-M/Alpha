/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '..',
  roots: ['<rootDir>/backend/src', '<rootDir>/content-pipeline'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/backend/tsconfig.test.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/backend/$1',
    '^@app/shared$': '<rootDir>/shared/src',
    '^@app/shared/(.*)$': '<rootDir>/shared/src/$1',
  },
};
