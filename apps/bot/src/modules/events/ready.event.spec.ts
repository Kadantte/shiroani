import { Collection } from 'discord.js';
import { ReadyEvent } from './ready.event';
import { createMockLogger } from '@/test/mocks';

describe('ReadyEvent', () => {
  let event: ReadyEvent;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    logger = createMockLogger();
    event = new ReadyEvent(logger as any);
  });

  it('should log bot info on ready', () => {
    const client = {
      user: { username: 'ShiroBot' },
      guilds: {
        cache: new Collection([
          ['1', {}],
          ['2', {}],
        ]),
      },
    };

    event.onReady([client] as any);

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('ShiroBot'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('2'));
  });
});
