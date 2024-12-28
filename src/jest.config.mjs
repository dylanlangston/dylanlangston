/** @type {import('ts-jest').JestConfigWithTsJest} */
const jestConfig = {
  transform: {
  '^.+\\.m?[tj]sx?$': [
      'ts-jest',
      {
        diagnostics: true,
        tsconfig: "./tsconfig.jest.json",
        useESM: true
      },
    ],
  },
  extensionsToTreatAsEsm: [".ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  testEnvironment: 'node',
  verbose: true,
  testPathIgnorePatterns: [
    'integration*'
  ],
  fakeTimers: {
    enableGlobally: true
  },
  roots: ["./tests"],
  reporters: process.env.github ? ['./tests/reporters/jest-github-actions-reporter.js', 'default'] : [ 'default' ]
};

export default jestConfig;