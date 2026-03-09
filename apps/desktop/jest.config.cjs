/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  passWithNoTests: true, // TODO: set to false once test coverage is established
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@shiroani/shared$': '<rootDir>/../../packages/shared/dist',
    '^@shiroani/shared/(.*)$': '<rootDir>/../../packages/shared/dist/$1',
  },
};
