import { Colors } from 'discord.js';
import {
  successEmbed,
  errorEmbed,
  infoEmbed,
  moderationEmbed,
  welcomeEmbed,
  goodbyeEmbed,
} from './embeds';

describe('Embed utilities', () => {
  describe('successEmbed', () => {
    it('should create a green embed with checkmark', () => {
      const embed = successEmbed('Operation completed');
      const json = embed.toJSON();

      expect(json.color).toBe(Colors.Green);
      expect(json.description).toContain('✅');
      expect(json.description).toContain('Operation completed');
    });
  });

  describe('errorEmbed', () => {
    it('should create a red embed with X', () => {
      const embed = errorEmbed('Something failed');
      const json = embed.toJSON();

      expect(json.color).toBe(Colors.Red);
      expect(json.description).toContain('❌');
      expect(json.description).toContain('Something failed');
    });
  });

  describe('infoEmbed', () => {
    it('should create a blue embed', () => {
      const embed = infoEmbed('Some info');
      const json = embed.toJSON();

      expect(json.color).toBe(Colors.Blue);
      expect(json.description).toBe('Some info');
    });
  });

  describe('moderationEmbed', () => {
    it('should include all fields', () => {
      const embed = moderationEmbed({
        action: 'Ban',
        target: 'User#0001',
        moderator: 'Mod#0001',
        reason: 'Spam',
        duration: '7d',
      });
      const json = embed.toJSON();

      expect(json.color).toBe(Colors.Orange);
      expect(json.title).toContain('Ban');
      expect(json.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Użytkownik', value: 'User#0001' }),
          expect.objectContaining({ name: 'Moderator', value: 'Mod#0001' }),
          expect.objectContaining({ name: 'Powód', value: 'Spam' }),
          expect.objectContaining({ name: 'Czas trwania', value: '7d' }),
        ])
      );
      expect(json.timestamp).toBeDefined();
    });

    it('should omit optional fields when not provided', () => {
      const embed = moderationEmbed({
        action: 'Unban',
        target: 'User#0001',
        moderator: 'Mod#0001',
      });
      const json = embed.toJSON();
      const fieldNames = json.fields!.map(f => f.name);

      expect(fieldNames).not.toContain('Powód');
      expect(fieldNames).not.toContain('Czas trwania');
    });
  });

  describe('welcomeEmbed', () => {
    it('should have correct format', () => {
      const embed = welcomeEmbed({
        username: 'NewUser',
        avatarUrl: 'https://cdn.example.com/avatar.png',
        memberCount: 42,
        guildName: 'Test Server',
      });
      const json = embed.toJSON();

      expect(json.color).toBe(Colors.Purple);
      expect(json.title).toContain('Test Server');
      expect(json.description).toContain('NewUser');
      expect(json.description).toContain('42');
      expect(json.thumbnail?.url).toBe('https://cdn.example.com/avatar.png');
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('goodbyeEmbed', () => {
    it('should have correct format', () => {
      const embed = goodbyeEmbed({
        username: 'LeavingUser',
        avatarUrl: 'https://cdn.example.com/avatar.png',
      });
      const json = embed.toJSON();

      expect(json.color).toBe(Colors.DarkGrey);
      expect(json.title).toContain('Do zobaczenia');
      expect(json.description).toContain('LeavingUser');
      expect(json.thumbnail?.url).toBe('https://cdn.example.com/avatar.png');
      expect(json.timestamp).toBeDefined();
    });
  });
});
