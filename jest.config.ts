import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        rootDir: '.',
        module: 'commonjs',
        esModuleInterop: true,
        strict: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        jsx: 'react-jsx',
        paths: {
          '@/*': ['./src/*'],
        },
        baseUrl: '.',
        ignoreDeprecations: '6.0',
      },
    }],
  },
  setupFilesAfterEnv: [],
  testTimeout: 30000,
  verbose: true,
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
};

export default config;
