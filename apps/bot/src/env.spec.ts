import { validateEnv } from './env';

describe('validateEnv', () => {
  const validEnv = {
    DISCORD_TOKEN: 'test-token-123',
    DISCORD_CLIENT_ID: '123456789',
    DISCORD_GUILD_ID: '987654321',
    DATABASE_URL: 'postgresql://localhost:5432/test',
  };

  let originalEnv: NodeJS.ProcessEnv;
  let exitSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    originalEnv = { ...process.env };
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should validate correct env', () => {
    Object.assign(process.env, validEnv);

    const result = validateEnv();

    expect(result).toEqual(
      expect.objectContaining({
        DISCORD_TOKEN: 'test-token-123',
        DISCORD_CLIENT_ID: '123456789',
        DISCORD_GUILD_ID: '987654321',
        DATABASE_URL: 'postgresql://localhost:5432/test',
      })
    );
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should exit on missing required vars', () => {
    // Remove all required vars
    delete process.env.DISCORD_TOKEN;
    delete process.env.DISCORD_CLIENT_ID;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DATABASE_URL;

    validateEnv();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('should use defaults for optional vars', () => {
    Object.assign(process.env, validEnv);
    delete process.env.REDIS_URL;
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;

    const result = validateEnv();

    expect(result.REDIS_URL).toBe('redis://localhost:6379');
    expect(result.NODE_ENV).toBe('development');
    expect(result.LOG_LEVEL).toBe('info');
  });
});
