import {
  ChatInputCommandInteraction,
  GuildMember,
  User,
  Guild,
  TextChannel,
  Client,
  Collection,
} from 'discord.js';

export function createMockUser(overrides: Partial<Record<string, unknown>> = {}): User {
  return {
    id: '123456789',
    tag: 'TestUser#0001',
    username: 'TestUser',
    displayAvatarURL: jest.fn().mockReturnValue('https://cdn.discordapp.com/avatars/123/abc.png'),
    ...overrides,
  } as unknown as User;
}

export function createMockGuildMember(
  overrides: Partial<Record<string, unknown>> = {}
): GuildMember {
  const user = createMockUser();
  return {
    id: user.id,
    user,
    roles: {
      highest: { position: 5 },
      cache: new Collection(),
    },
    permissions: {
      has: jest.fn().mockReturnValue(true),
      missing: jest.fn().mockReturnValue([]),
    },
    bannable: true,
    kickable: true,
    moderatable: true,
    timeout: jest.fn().mockResolvedValue(undefined),
    isCommunicationDisabled: jest.fn().mockReturnValue(false),
    guild: createMockGuild(),
    ...overrides,
  } as unknown as GuildMember;
}

export function createMockGuild(overrides: Partial<Record<string, unknown>> = {}): Guild {
  return {
    id: '987654321',
    name: 'Test Guild',
    memberCount: 100,
    members: {
      cache: new Collection(),
      me: {
        permissions: {
          has: jest.fn().mockReturnValue(true),
          missing: jest.fn().mockReturnValue([]),
        },
      },
      ban: jest.fn().mockResolvedValue(undefined),
      fetch: jest.fn().mockResolvedValue(undefined),
    },
    channels: {
      cache: new Collection(),
    },
    ...overrides,
  } as unknown as Guild;
}

export function createMockTextChannel(
  overrides: Partial<Record<string, unknown>> = {}
): TextChannel {
  return Object.assign(Object.create(TextChannel.prototype), {
    id: '111222333',
    send: jest.fn().mockResolvedValue(undefined),
    bulkDelete: jest.fn().mockResolvedValue(new Collection()),
    ...overrides,
  }) as unknown as TextChannel;
}

export function createMockClient(overrides: Partial<Record<string, unknown>> = {}): Client {
  return {
    user: {
      id: '999888777',
      tag: 'TestBot#0001',
      username: 'TestBot',
    },
    ws: { ping: 42 },
    guilds: {
      cache: new Collection(),
    },
    users: {
      fetch: jest.fn().mockResolvedValue(createMockUser()),
    },
    ...overrides,
  } as unknown as Client;
}

export function createMockInteraction(
  overrides: Partial<Record<string, unknown>> = {}
): ChatInputCommandInteraction {
  const user = createMockUser();
  const guild = createMockGuild();
  const client = createMockClient();

  return {
    user,
    member: createMockGuildMember({ user }),
    guild,
    guildId: guild.id,
    channelId: '111222333',
    channel: null,
    client,
    commandName: 'test',
    createdTimestamp: Date.now(),
    isChatInputCommand: jest.fn().mockReturnValue(true),
    isContextMenuCommand: jest.fn().mockReturnValue(false),
    reply: jest.fn().mockResolvedValue({
      createdTimestamp: Date.now() + 50,
    }),
    editReply: jest.fn().mockResolvedValue(undefined),
    deferReply: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ChatInputCommandInteraction;
}
