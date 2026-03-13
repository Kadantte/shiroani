import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Creates a mock NecordExecutionContext that wraps an interaction.
 * NecordExecutionContext.create() is a static method, so we mock it globally.
 */
export function mockNecordExecutionContext(interaction: unknown) {
  return {
    getContext: jest.fn().mockReturnValue([interaction]),
  };
}

/**
 * Creates a mock ExecutionContext compatible with NestJS guards.
 */
export function createMockExecutionContext(
  handler?: (...args: unknown[]) => unknown
): ExecutionContext {
  return {
    getHandler: jest.fn().mockReturnValue(handler ?? (() => {})),
    getClass: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToHttp: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  } as unknown as ExecutionContext;
}

export function createMockReflector(): jest.Mocked<Reflector> {
  return {
    get: jest.fn(),
    getAll: jest.fn(),
    getAllAndMerge: jest.fn(),
    getAllAndOverride: jest.fn(),
  } as unknown as jest.Mocked<Reflector>;
}

export function createMockLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    setContext: jest.fn(),
    assign: jest.fn(),
  };
}
