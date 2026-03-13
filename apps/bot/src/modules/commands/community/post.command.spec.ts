import { MessageFlags, EmbedBuilder } from 'discord.js';
import { PostCommand } from './post.command';
import { createMockInteraction, createMockTextChannel } from '@/test/mocks';

function createMockModalInteraction(
  fields: Record<string, string>,
  overrides: Record<string, unknown> = {}
) {
  const user = {
    id: '123456789',
    username: 'TestUser',
    displayAvatarURL: jest.fn().mockReturnValue('https://cdn.discordapp.com/avatars/123/abc.png'),
  };

  return {
    user,
    guild: {
      channels: {
        cache: new Map<string, unknown>(),
      },
    },
    fields: {
      getTextInputValue: jest.fn((key: string) => fields[key] ?? ''),
    },
    customId: 'post_modal/111222333',
    reply: jest.fn().mockResolvedValue(undefined),
    isModalSubmit: jest.fn().mockReturnValue(true),
    ...overrides,
  };
}

describe('PostCommand', () => {
  let command: PostCommand;

  beforeEach(() => {
    command = new PostCommand();
  });

  describe('onPost (slash command)', () => {
    it('should show a modal on /post command', async () => {
      const interaction = createMockInteraction({
        commandName: 'post',
        showModal: jest.fn().mockResolvedValue(undefined),
      });

      const channel = createMockTextChannel({ id: '111222333' });

      await command.onPost([interaction] as any, { channel, ping: undefined } as any);

      expect(interaction.showModal).toHaveBeenCalledTimes(1);
      const modal = (interaction.showModal as jest.Mock).mock.calls[0][0];
      expect(modal.data.custom_id).toBe('post_modal/111222333');
      expect(modal.data.title).toBe('Utwórz embed');
    });

    it('should include ping role in modal custom id when provided', async () => {
      const interaction = createMockInteraction({
        commandName: 'post',
        showModal: jest.fn().mockResolvedValue(undefined),
      });

      const channel = createMockTextChannel({ id: '111222333' });

      await command.onPost(
        [interaction] as any,
        {
          channel,
          ping: '444555666',
        } as any
      );

      const modal = (interaction.showModal as jest.Mock).mock.calls[0][0];
      expect(modal.data.custom_id).toBe('post_modal/111222333/444555666');
    });
  });

  describe('onPostModal (modal submit)', () => {
    it('should create and send embed from modal values', async () => {
      const sentMessage = { url: 'https://discord.com/channels/1/2/3' };
      const channel = createMockTextChannel({
        id: '111222333',
        send: jest.fn().mockResolvedValue(sentMessage),
      });

      const modalInteraction = createMockModalInteraction({
        title: 'Test tytuł',
        description: 'Test opis',
        color: '#FF5733',
        image: 'https://example.com/img.png',
        footer: 'Stopka testowa',
      });

      (modalInteraction.guild!.channels.cache as Map<string, unknown>).set('111222333', channel);

      await command.onPostModal([modalInteraction] as any, '111222333', undefined);

      expect(channel.send).toHaveBeenCalledTimes(1);
      const sendCall = (channel.send as jest.Mock).mock.calls[0][0];
      expect(sendCall.content).toBeUndefined();
      expect(sendCall.embeds).toHaveLength(1);

      const embed: EmbedBuilder = sendCall.embeds[0];
      const data = embed.toJSON();
      expect(data.title).toBe('Test tytuł');
      expect(data.description).toBe('Test opis');
      expect(data.color).toBe(0xff5733);
      expect(data.image?.url).toBe('https://example.com/img.png');
      expect(data.footer?.text).toBe('Stopka testowa');

      expect(modalInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });

    it('should use default color when no color is provided', async () => {
      const sentMessage = { url: 'https://discord.com/channels/1/2/3' };
      const channel = createMockTextChannel({
        id: '111222333',
        send: jest.fn().mockResolvedValue(sentMessage),
      });

      const modalInteraction = createMockModalInteraction({
        title: 'Bez koloru',
        description: 'Opis',
        color: '',
        image: '',
        footer: '',
      });

      (modalInteraction.guild!.channels.cache as Map<string, unknown>).set('111222333', channel);

      await command.onPostModal([modalInteraction] as any, '111222333', undefined);

      const sendCall = (channel.send as jest.Mock).mock.calls[0][0];
      const data = sendCall.embeds[0].toJSON();
      expect(data.color).toBe(0x5865f2);
    });

    it('should send role ping when ping param is provided', async () => {
      const sentMessage = { url: 'https://discord.com/channels/1/2/3' };
      const channel = createMockTextChannel({
        id: '111222333',
        send: jest.fn().mockResolvedValue(sentMessage),
      });

      const modalInteraction = createMockModalInteraction({
        title: 'Z pingiem',
        description: 'Opis',
        color: '',
        image: '',
        footer: '',
      });

      (modalInteraction.guild!.channels.cache as Map<string, unknown>).set('111222333', channel);

      await command.onPostModal([modalInteraction] as any, '111222333', '444555666');

      const sendCall = (channel.send as jest.Mock).mock.calls[0][0];
      expect(sendCall.content).toBe('<@&444555666>');
    });

    it('should return error when channel is not found', async () => {
      const modalInteraction = createMockModalInteraction({
        title: 'Test',
        description: 'Opis',
        color: '',
        image: '',
        footer: '',
      });

      // Empty channel cache
      await command.onPostModal([modalInteraction] as any, '999999999', undefined);

      expect(modalInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });

    it('should return error when channel.send fails', async () => {
      const channel = createMockTextChannel({
        id: '111222333',
        send: jest.fn().mockRejectedValue(new Error('Missing Permissions')),
      });

      const modalInteraction = createMockModalInteraction({
        title: 'Fail test',
        description: 'Opis',
        color: '',
        image: '',
        footer: '',
      });

      (modalInteraction.guild!.channels.cache as Map<string, unknown>).set('111222333', channel);

      await command.onPostModal([modalInteraction] as any, '111222333', undefined);

      expect(modalInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });

    it('should handle color without hash prefix', async () => {
      const sentMessage = { url: 'https://discord.com/channels/1/2/3' };
      const channel = createMockTextChannel({
        id: '111222333',
        send: jest.fn().mockResolvedValue(sentMessage),
      });

      const modalInteraction = createMockModalInteraction({
        title: 'Kolor bez hasha',
        description: 'Opis',
        color: 'AA11BB',
        image: '',
        footer: '',
      });

      (modalInteraction.guild!.channels.cache as Map<string, unknown>).set('111222333', channel);

      await command.onPostModal([modalInteraction] as any, '111222333', undefined);

      const sendCall = (channel.send as jest.Mock).mock.calls[0][0];
      const data = sendCall.embeds[0].toJSON();
      expect(data.color).toBe(0xaa11bb);
    });

    it('should fall back to default color on invalid hex', async () => {
      const sentMessage = { url: 'https://discord.com/channels/1/2/3' };
      const channel = createMockTextChannel({
        id: '111222333',
        send: jest.fn().mockResolvedValue(sentMessage),
      });

      const modalInteraction = createMockModalInteraction({
        title: 'Zły kolor',
        description: 'Opis',
        color: 'ZZZZZZ',
        image: '',
        footer: '',
      });

      (modalInteraction.guild!.channels.cache as Map<string, unknown>).set('111222333', channel);

      await command.onPostModal([modalInteraction] as any, '111222333', undefined);

      const sendCall = (channel.send as jest.Mock).mock.calls[0][0];
      const data = sendCall.embeds[0].toJSON();
      expect(data.color).toBe(0x5865f2);
    });
  });
});
