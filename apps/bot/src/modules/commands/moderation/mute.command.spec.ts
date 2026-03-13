import { Collection, MessageFlags } from 'discord.js';
import { MuteCommand } from './mute.command';
import { ModLogService } from './mod-log.service';
import { createMockInteraction, createMockUser } from '@/test/mocks';

describe('MuteCommand', () => {
  let command: MuteCommand;
  let modLog: jest.Mocked<Pick<ModLogService, 'log'>>;

  beforeEach(() => {
    modLog = { log: jest.fn().mockResolvedValue(undefined) };
    command = new MuteCommand(modLog as unknown as ModLogService);
  });

  function setupInteraction(targetUser: any, targetMember?: any) {
    const membersCache = new Collection<string, any>();
    if (targetMember) {
      membersCache.set(targetUser.id, targetMember);
    }

    const interaction = createMockInteraction({ commandName: 'mute' });
    (interaction.guild as any).members.cache = membersCache;
    return interaction;
  }

  function createTargetMember(overrides: Record<string, any> = {}) {
    return {
      roles: { highest: { position: 1 } },
      moderatable: true,
      timeout: jest.fn().mockResolvedValue(undefined),
      isCommunicationDisabled: jest.fn().mockReturnValue(false),
      ...overrides,
    };
  }

  describe('onMute', () => {
    it('should successfully mute a user with duration', async () => {
      const targetUser = createMockUser({ id: '555', tag: 'Target#0001' });
      const targetMember = createTargetMember();
      const interaction = setupInteraction(targetUser, targetMember);

      await command.onMute([interaction] as any, {
        user: targetUser,
        duration: '10m',
        reason: 'Spam',
      });

      expect(targetMember.timeout).toHaveBeenCalledWith(600_000, 'Spam');
      expect(modLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MUTE',
          targetUserId: '555',
          duration: 600,
        })
      );
    });

    it('should reject invalid duration format', async () => {
      const targetUser = createMockUser({ id: '555' });
      const targetMember = createTargetMember();
      const interaction = setupInteraction(targetUser, targetMember);

      await command.onMute([interaction] as any, {
        user: targetUser,
        duration: 'invalid',
      });

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
      expect(targetMember.timeout).not.toHaveBeenCalled();
    });

    it('should reject duration > 28 days', async () => {
      const targetUser = createMockUser({ id: '555' });
      const targetMember = createTargetMember();
      const interaction = setupInteraction(targetUser, targetMember);

      await command.onMute([interaction] as any, {
        user: targetUser,
        duration: '29d',
      });

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
      expect(targetMember.timeout).not.toHaveBeenCalled();
    });

    it('should prevent muting yourself', async () => {
      const selfUser = createMockUser({ id: '123456789' });
      const targetMember = createTargetMember();
      const interaction = setupInteraction(selfUser, targetMember);

      await command.onMute([interaction] as any, {
        user: selfUser,
        duration: '10m',
      });

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
      expect(targetMember.timeout).not.toHaveBeenCalled();
    });

    it('should prevent muting a user with higher role', async () => {
      const targetUser = createMockUser({ id: '555' });
      const targetMember = createTargetMember({
        roles: { highest: { position: 10 } },
      });
      const interaction = setupInteraction(targetUser, targetMember);

      await command.onMute([interaction] as any, {
        user: targetUser,
        duration: '10m',
      });

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
      expect(targetMember.timeout).not.toHaveBeenCalled();
    });

    it('should return error when member not found', async () => {
      const targetUser = createMockUser({ id: '555' });
      const interaction = setupInteraction(targetUser); // no member in cache

      await command.onMute([interaction] as any, {
        user: targetUser,
        duration: '10m',
      });

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });
  });

  describe('onUnmute', () => {
    it('should successfully unmute a user', async () => {
      const targetUser = createMockUser({ id: '555', tag: 'Target#0001' });
      const targetMember = createTargetMember({
        isCommunicationDisabled: jest.fn().mockReturnValue(true),
      });
      const interaction = setupInteraction(targetUser, targetMember);

      await command.onUnmute([interaction] as any, { user: targetUser });

      expect(targetMember.timeout).toHaveBeenCalledWith(null);
      expect(modLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UNMUTE',
          targetUserId: '555',
        })
      );
    });

    it('should return error when user is not muted', async () => {
      const targetUser = createMockUser({ id: '555' });
      const targetMember = createTargetMember({
        isCommunicationDisabled: jest.fn().mockReturnValue(false),
      });
      const interaction = setupInteraction(targetUser, targetMember);

      await command.onUnmute([interaction] as any, { user: targetUser });

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
      expect(targetMember.timeout).not.toHaveBeenCalled();
    });

    it('should return error when member not found for unmute', async () => {
      const targetUser = createMockUser({ id: '555' });
      const interaction = setupInteraction(targetUser); // no member in cache

      await command.onUnmute([interaction] as any, { user: targetUser });

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });
  });
});
