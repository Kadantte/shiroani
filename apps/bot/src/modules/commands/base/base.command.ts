import { Logger } from '@nestjs/common';
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { successEmbed, errorEmbed } from '@/common/utils';

/**
 * Abstract base class for slash commands.
 * Provides shared error handling and embed helpers so that
 * individual commands don't need to duplicate boilerplate.
 */
export abstract class BaseCommand {
  protected readonly logger: Logger;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Logs the error with structured context and sends an ephemeral error embed
   * to the user. Handles both deferred and non-deferred interactions.
   */
  protected async handleError(
    error: unknown,
    interaction: ChatInputCommandInteraction,
    context: string
  ): Promise<void> {
    this.logger.error(
      `[${context}] Command error: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error.stack : undefined
    );

    const embed = this.createErrorEmbed('Wystąpił nieoczekiwany błąd podczas wykonywania komendy.');

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
    } catch (replyError) {
      this.logger.error(
        `[${context}] Failed to send error response: ${replyError instanceof Error ? replyError.message : String(replyError)}`
      );
    }
  }

  /** Creates a green success embed via the shared utility. */
  protected createSuccessEmbed(description: string): EmbedBuilder {
    return successEmbed(description);
  }

  /** Creates a red error embed via the shared utility. */
  protected createErrorEmbed(description: string): EmbedBuilder {
    return errorEmbed(description);
  }
}
