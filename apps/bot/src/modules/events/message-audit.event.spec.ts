import { Collection } from 'discord.js';
import { MessageAuditEvent } from './message-audit.event';
import { createMockTextChannel, createMockLogger } from '@/test/mocks';
import { GuildService } from '@/modules/guild/guild.service';

describe('MessageAuditEvent', () => {
  let event: MessageAuditEvent;
  let guildService: jest.Mocked<Pick<GuildService, 'findByDiscordId'>>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    guildService = {
      findByDiscordId: jest.fn().mockResolvedValue(null),
    };
    logger = createMockLogger();
    event = new MessageAuditEvent(guildService as unknown as GuildService, logger as any);
  });

  function createMockMessage(overrides: Record<string, any> = {}) {
    const channelsCache = new Collection<string, any>();

    return {
      id: '111222333',
      content: 'Test message content',
      channelId: 'channel-1',
      partial: false,
      author: {
        bot: false,
        username: 'TestUser',
        displayAvatarURL: jest.fn().mockReturnValue('https://cdn.example.com/avatar.png'),
      },
      guild: {
        id: '987654321',
        channels: { cache: channelsCache },
      },
      attachments: new Collection(),
      url: 'https://discord.com/channels/987654321/channel-1/111222333',
      ...overrides,
    };
  }

  describe('onMessageDelete', () => {
    it('should log deleted message to mod log channel', async () => {
      const modLogChannel = createMockTextChannel({ id: 'mod-log-ch' });
      const message = createMockMessage();
      message.guild.channels.cache.set('mod-log-ch', modLogChannel);

      guildService.findByDiscordId.mockResolvedValue({
        id: 'internal-1',
        modLogChannelId: 'mod-log-ch',
      });

      await event.onMessageDelete([message] as any);

      expect(modLogChannel.send).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: '🗑️ Wiadomość usunięta',
            }),
          }),
        ]),
      });
    });

    it('should skip bot messages', async () => {
      const message = createMockMessage({
        author: { bot: true, username: 'Bot', displayAvatarURL: jest.fn() },
      });

      await event.onMessageDelete([message] as any);

      expect(guildService.findByDiscordId).not.toHaveBeenCalled();
    });

    it('should skip messages with no content and no attachments', async () => {
      const message = createMockMessage({ content: '', partial: false });

      await event.onMessageDelete([message] as any);

      expect(guildService.findByDiscordId).not.toHaveBeenCalled();
    });

    it('should handle uncached (partial) messages gracefully', async () => {
      const modLogChannel = createMockTextChannel({ id: 'mod-log-ch' });
      const message = createMockMessage({
        content: null,
        partial: true,
        author: null,
        attachments: new Collection(),
      });
      message.guild.channels.cache.set('mod-log-ch', modLogChannel);

      // author is null — bot check passes (null?.bot is undefined/falsy)
      // content is null, no attachments, but partial — skip since no useful info
      await event.onMessageDelete([message] as any);

      // Should be skipped: partial with no content, no attachments
      expect(modLogChannel.send).not.toHaveBeenCalled();
    });

    it('should include attachment count in embed', async () => {
      const modLogChannel = createMockTextChannel({ id: 'mod-log-ch' });
      const attachments = new Collection<string, any>();
      attachments.set('att-1', { id: 'att-1' });
      attachments.set('att-2', { id: 'att-2' });

      const message = createMockMessage({ attachments });
      message.guild.channels.cache.set('mod-log-ch', modLogChannel);

      guildService.findByDiscordId.mockResolvedValue({
        id: 'internal-1',
        modLogChannelId: 'mod-log-ch',
      });

      await event.onMessageDelete([message] as any);

      expect(modLogChannel.send).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              fields: expect.arrayContaining([
                expect.objectContaining({ name: 'Załączniki', value: '2' }),
              ]),
            }),
          }),
        ]),
      });
    });

    it('should not log messages from the mod log channel itself', async () => {
      const modLogChannel = createMockTextChannel({ id: 'mod-log-ch' });
      const message = createMockMessage({ channelId: 'mod-log-ch' });
      message.guild.channels.cache.set('mod-log-ch', modLogChannel);

      guildService.findByDiscordId.mockResolvedValue({
        id: 'internal-1',
        modLogChannelId: 'mod-log-ch',
      });

      await event.onMessageDelete([message] as any);

      expect(modLogChannel.send).not.toHaveBeenCalled();
    });
  });

  describe('onMessageUpdate', () => {
    it('should log edited message with before/after content', async () => {
      const modLogChannel = createMockTextChannel({ id: 'mod-log-ch' });
      const oldMessage = createMockMessage({ content: 'Old content' });
      const newMessage = createMockMessage({ content: 'New content' });
      newMessage.guild.channels.cache.set('mod-log-ch', modLogChannel);

      guildService.findByDiscordId.mockResolvedValue({
        id: 'internal-1',
        modLogChannelId: 'mod-log-ch',
      });

      await event.onMessageUpdate([oldMessage, newMessage] as any);

      expect(modLogChannel.send).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: '✏️ Wiadomość edytowana',
              fields: expect.arrayContaining([
                expect.objectContaining({ name: 'Przed', value: 'Old content' }),
                expect.objectContaining({ name: 'Po', value: 'New content' }),
              ]),
            }),
          }),
        ]),
        components: expect.any(Array),
      });
    });

    it('should skip edits where content did not change', async () => {
      const oldMessage = createMockMessage({ content: 'Same content' });
      const newMessage = createMockMessage({ content: 'Same content' });

      await event.onMessageUpdate([oldMessage, newMessage] as any);

      expect(guildService.findByDiscordId).not.toHaveBeenCalled();
    });

    it('should skip bot messages', async () => {
      const botAuthor = { bot: true, username: 'Bot', displayAvatarURL: jest.fn() };
      const oldMessage = createMockMessage({ content: 'Old', author: botAuthor });
      const newMessage = createMockMessage({ content: 'New', author: botAuthor });

      await event.onMessageUpdate([oldMessage, newMessage] as any);

      expect(guildService.findByDiscordId).not.toHaveBeenCalled();
    });

    it('should not log edits from the mod log channel itself', async () => {
      const modLogChannel = createMockTextChannel({ id: 'mod-log-ch' });
      const oldMessage = createMockMessage({ content: 'Old', channelId: 'mod-log-ch' });
      const newMessage = createMockMessage({ content: 'New', channelId: 'mod-log-ch' });
      newMessage.guild.channels.cache.set('mod-log-ch', modLogChannel);

      guildService.findByDiscordId.mockResolvedValue({
        id: 'internal-1',
        modLogChannelId: 'mod-log-ch',
      });

      await event.onMessageUpdate([oldMessage, newMessage] as any);

      expect(modLogChannel.send).not.toHaveBeenCalled();
    });
  });
});
