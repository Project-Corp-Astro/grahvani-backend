// Minimal ambient declarations to satisfy editor/TS server for tests

declare module "@jest/globals" {
  export const jest: any;
  export const beforeEach: any;
  export const describe: any;
  export const it: any;
  export const expect: any;
}

declare module "jest-mock-extended" {
  export function mockDeep(): any;
}

declare module "../generated/prisma" {
  // keep as-is, tests mock PrismaClient via jest, so minimal typing
  export const PrismaClient: any;
}

// allow require in test setup without @types/node
declare const require: any;

// global jest for older import styles
declare const jest: any;
declare function beforeEach(fn: any): void;
