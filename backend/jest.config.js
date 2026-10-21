module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'json-summary'],
  // TODO: enforce coverageThreshold once real logic lands — target 80% lines/statements.
  // coverageThreshold: {
  //   global: { lines: 80, statements: 80 },
  // },
};
