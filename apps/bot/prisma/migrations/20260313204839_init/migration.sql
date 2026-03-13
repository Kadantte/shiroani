-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('BAN', 'UNBAN', 'MUTE', 'UNMUTE', 'CLEAR_MESSAGES');

-- CreateTable
CREATE TABLE "guilds" (
    "id" TEXT NOT NULL,
    "discord_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "welcome_channel_id" TEXT,
    "goodbye_channel_id" TEXT,
    "mod_log_channel_id" TEXT,
    "activity_channel_id" TEXT,
    "welcome_message" TEXT,
    "goodbye_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_logs" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "action" "ModerationAction" NOT NULL,
    "target_user_id" TEXT,
    "moderator_id" TEXT NOT NULL,
    "reason" TEXT,
    "duration" INTEGER,
    "messages_cleared" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guilds_discord_id_key" ON "guilds"("discord_id");

-- CreateIndex
CREATE INDEX "moderation_logs_guild_id_created_at_idx" ON "moderation_logs"("guild_id", "created_at");

-- CreateIndex
CREATE INDEX "moderation_logs_target_user_id_idx" ON "moderation_logs"("target_user_id");

-- CreateIndex
CREATE INDEX "moderation_logs_moderator_id_idx" ON "moderation_logs"("moderator_id");

-- AddForeignKey
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
