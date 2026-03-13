import { NecordExecutionContext } from 'necord';
import { CommandGuard } from './command.guard';
import {
  createMockInteraction,
  createMockExecutionContext,
  createMockReflector,
  mockNecordExecutionContext,
} from '@/test/mocks';

jest.mock('necord', () => ({
  NecordExecutionContext: {
    create: jest.fn(),
  },
}));

describe('CommandGuard', () => {
  let guard: CommandGuard;
  let reflector: ReturnType<typeof createMockReflector>;

  beforeEach(() => {
    reflector = createMockReflector();
    guard = new CommandGuard(reflector);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should return true for non-command interactions', async () => {
    const interaction = createMockInteraction();
    (interaction.isChatInputCommand as jest.Mock).mockReturnValue(false);
    (interaction.isContextMenuCommand as jest.Mock).mockReturnValue(false);

    const ctx = createMockExecutionContext();
    (NecordExecutionContext.create as jest.Mock).mockReturnValue(
      mockNecordExecutionContext(interaction)
    );

    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should return false with ephemeral reply when not in guild', async () => {
    const interaction = createMockInteraction({ guild: null, member: null });

    const ctx = createMockExecutionContext();
    (NecordExecutionContext.create as jest.Mock).mockReturnValue(
      mockNecordExecutionContext(interaction)
    );

    expect(await guard.canActivate(ctx)).toBe(false);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Ta komenda działa tylko na serwerze'),
      })
    );
  });

  it('should return false when user lacks required permissions', async () => {
    const interaction = createMockInteraction();
    const member = interaction.member as any;
    member.permissions.missing.mockReturnValue(['BanMembers']);

    reflector.get.mockImplementation((key: string) => {
      if (key === 'required_permissions') return [BigInt(0x4)];
      return undefined;
    });

    const ctx = createMockExecutionContext();
    (NecordExecutionContext.create as jest.Mock).mockReturnValue(
      mockNecordExecutionContext(interaction)
    );

    expect(await guard.canActivate(ctx)).toBe(false);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Nie masz wymaganych uprawnień'),
      })
    );
  });

  it('should return false when bot lacks required permissions', async () => {
    const interaction = createMockInteraction();
    const botMember = interaction.guild!.members.me as any;
    botMember.permissions.missing.mockReturnValue(['BanMembers']);

    reflector.get.mockImplementation((key: string) => {
      if (key === 'required_bot_permissions') return [BigInt(0x4)];
      return undefined;
    });

    const ctx = createMockExecutionContext();
    (NecordExecutionContext.create as jest.Mock).mockReturnValue(
      mockNecordExecutionContext(interaction)
    );

    expect(await guard.canActivate(ctx)).toBe(false);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Bot nie ma wymaganych uprawnień'),
      })
    );
  });

  it('should return true when all permissions are satisfied', async () => {
    const interaction = createMockInteraction();

    reflector.get.mockImplementation((key: string) => {
      if (key === 'required_permissions') return [BigInt(0x4)];
      if (key === 'required_bot_permissions') return [BigInt(0x4)];
      return undefined;
    });

    const ctx = createMockExecutionContext();
    (NecordExecutionContext.create as jest.Mock).mockReturnValue(
      mockNecordExecutionContext(interaction)
    );

    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should return true when no permissions are required', async () => {
    const interaction = createMockInteraction();

    reflector.get.mockReturnValue(undefined);

    const ctx = createMockExecutionContext();
    (NecordExecutionContext.create as jest.Mock).mockReturnValue(
      mockNecordExecutionContext(interaction)
    );

    expect(await guard.canActivate(ctx)).toBe(true);
  });
});
