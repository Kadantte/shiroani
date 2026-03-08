/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  passWithNoTests: true,
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@shiroani/shared$': '<rootDir>/../../packages/shared/dist',
    '^@shiroani/shared/(.*)$': '<rootDir>/../../packages/shared/dist/$1',
  },
};
