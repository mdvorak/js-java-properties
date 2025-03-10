import type {Config} from 'jest'

export default {
  moduleFileExtensions: ['js', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  collectCoverageFrom: ['**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node'
} satisfies Config
