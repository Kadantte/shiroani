import { z } from 'zod';
import { handleGatewayRequest } from '../gateway-handler';

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('handleGatewayRequest', () => {
  it('returns the handler result on success', async () => {
    const result = await handleGatewayRequest({
      logger: mockLogger,
      action: 'test action',
      defaultResult: { items: [] },
      handler: async () => ({ items: [1, 2, 3] }),
    });

    expect(result).toEqual({ items: [1, 2, 3] });
    expect(mockLogger.info).toHaveBeenCalledWith('test action');
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('returns defaultResult with error when handler throws an Error', async () => {
    const result = await handleGatewayRequest({
      logger: mockLogger,
      action: 'failing action',
      defaultResult: { items: [] },
      handler: async () => {
        throw new Error('something broke');
      },
    });

    expect(result).toEqual({ items: [], error: 'something broke' });
    expect(mockLogger.error).toHaveBeenCalledWith('Error failing action:', expect.any(Error));
  });

  it('returns defaultResult with "Unknown error" when handler throws a non-Error string', async () => {
    const result = await handleGatewayRequest({
      logger: mockLogger,
      action: 'string throw',
      defaultResult: { data: null },
      handler: async () => {
        throw 'raw string error';
      },
    });

    expect(result).toEqual({ data: null, error: 'Unknown error' });
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('logs the action via info before calling handler', async () => {
    await handleGatewayRequest({
      logger: mockLogger,
      action: 'my action',
      defaultResult: {},
      handler: async () => ({}),
    });

    expect(mockLogger.info).toHaveBeenCalledWith('my action');
  });

  describe('with schema validation', () => {
    const userSchema = z.object({
      name: z.string().min(1),
      age: z.number().int().nonnegative(),
    });

    it('passes parsed data to handler when schema succeeds', async () => {
      const handler = jest.fn(async (parsed: { name: string; age: number }) => ({
        greeting: `hi ${parsed.name}`,
      }));

      const result = await handleGatewayRequest({
        logger: mockLogger,
        action: 'greet',
        defaultResult: { greeting: '' },
        schema: userSchema,
        payload: { name: 'Anya', age: 6 },
        handler,
      });

      expect(handler).toHaveBeenCalledWith({ name: 'Anya', age: 6 });
      expect(result).toEqual({ greeting: 'hi Anya' });
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('returns defaultResult with error and does NOT call handler when schema fails', async () => {
      const handler = jest.fn(async () => ({ greeting: 'should not happen' }));

      const result = await handleGatewayRequest({
        logger: mockLogger,
        action: 'greet',
        defaultResult: { greeting: '' },
        schema: userSchema,
        payload: { name: '', age: -1 },
        handler,
      });

      expect(handler).not.toHaveBeenCalled();
      expect(result).toMatchObject({ greeting: '' });
      expect((result as { error: string }).error).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('joins multiple schema issues with "; "', async () => {
      const result = await handleGatewayRequest({
        logger: mockLogger,
        action: 'greet',
        defaultResult: { greeting: '' },
        schema: userSchema,
        payload: { name: 123, age: 'not-a-number' },
        handler: async () => ({ greeting: 'unused' }),
      });

      const errorMessage = (result as { error: string }).error;
      expect(errorMessage).toContain('; ');
      // Two issues (name + age) → one separator between them.
      expect(errorMessage.split('; ')).toHaveLength(2);
    });

    it('returns handler error when schema passes but handler throws', async () => {
      const result = await handleGatewayRequest({
        logger: mockLogger,
        action: 'greet',
        defaultResult: { greeting: '' },
        schema: userSchema,
        payload: { name: 'Loid', age: 35 },
        handler: async () => {
          throw new Error('downstream failure');
        },
      });

      expect(result).toEqual({ greeting: '', error: 'downstream failure' });
      expect(mockLogger.error).toHaveBeenCalledWith('Error greet:', expect.any(Error));
    });

    it('reports a (root) path when the payload itself is the wrong type', async () => {
      const result = await handleGatewayRequest({
        logger: mockLogger,
        action: 'greet',
        defaultResult: { greeting: '' },
        schema: userSchema,
        payload: 'not-an-object',
        handler: async () => ({ greeting: 'unused' }),
      });

      expect((result as { error: string }).error).toContain('(root):');
    });
  });
});
