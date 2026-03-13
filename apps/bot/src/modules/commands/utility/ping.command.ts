import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';

@Injectable()
export class PingCommand {
  @SlashCommand({
    name: 'ping',
    description: 'Sprawdź opóźnienie bota',
  })
  async onPing(@Context() [interaction]: SlashCommandContext) {
    const sent = await interaction.reply({
      content: '🏓 Pinguję...',
      fetchReply: true,
    });

    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsHeartbeat = interaction.client.ws.ping;

    const status = roundtrip < 200 ? '🟢' : roundtrip < 500 ? '🟡' : '🔴';

    await interaction.editReply(
      `${status} **Pong!** Opóźnienie: \`${roundtrip}ms\` | WebSocket: \`${wsHeartbeat}ms\``
    );
  }
}
