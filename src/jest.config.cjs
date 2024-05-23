/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
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
  roots: ["./tests"]
};