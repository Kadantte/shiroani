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
});
