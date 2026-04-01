module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testRegex: '(/tests/.*|(\\.|/)(test|spec))\\.tsx?$',
};