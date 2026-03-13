-- AlterTable
ALTER TABLE "guilds" ADD COLUMN     "verify_channel_id" TEXT,
ADD COLUMN     "verify_message_id" TEXT,
ADD COLUMN     "verify_role_id" TEXT;

-- CreateTable
CREATE TABLE "reaction_roles" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reaction_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reaction_roles_guild_id_idx" ON "reaction_roles"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "reaction_roles_message_id_emoji_key" ON "reaction_roles"("message_id", "emoji");

-- AddForeignKey
ALTER TABLE "reaction_roles" ADD CONSTRAINT "reaction_roles_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
