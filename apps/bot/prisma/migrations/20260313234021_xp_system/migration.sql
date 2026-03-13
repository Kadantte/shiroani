-- AlterTable
ALTER TABLE "guilds" ADD COLUMN     "level_up_channel_id" TEXT,
ADD COLUMN     "xp_cooldown" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "xp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "xp_max_amount" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN     "xp_min_amount" INTEGER NOT NULL DEFAULT 15;

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "last_xp_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_roles" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "level_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "members_guild_id_xp_idx" ON "members"("guild_id", "xp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "members_guild_id_user_id_key" ON "members"("guild_id", "user_id");

-- CreateIndex
CREATE INDEX "level_roles_guild_id_idx" ON "level_roles"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "level_roles_guild_id_level_key" ON "level_roles"("guild_id", "level");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_roles" ADD CONSTRAINT "level_roles_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
