-- CreateTable
CREATE TABLE "OidcConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "issuer" TEXT,
    "client_id" TEXT,
    "client_secret_ciphertext" TEXT,
    "scopes" TEXT NOT NULL DEFAULT '["openid","profile"]',
    "groups_claim" TEXT NOT NULL DEFAULT 'groups',
    "admin_groups" TEXT NOT NULL DEFAULT '[]',
    "viewer_groups" TEXT NOT NULL DEFAULT '[]',
    "allow_unmatched_viewer" BOOLEAN NOT NULL DEFAULT false,
    "allow_http_issuer" BOOLEAN NOT NULL DEFAULT false,
    "observed_groups" TEXT NOT NULL DEFAULT '[]',
    "config_revision" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "OidcLoginTxn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "state_hash" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "code_verifier" TEXT NOT NULL,
    "binding_hash" TEXT NOT NULL,
    "config_revision" INTEGER NOT NULL,
    "return_to" TEXT,
    "created_at" TEXT NOT NULL,
    "expires_at" TEXT NOT NULL,
    "consumed_at" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "is_setup_user" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    "auth_provider" TEXT NOT NULL DEFAULT 'local',
    "oidc_issuer" TEXT,
    "oidc_subject" TEXT,
    "oidc_session_version" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_User" ("created_at", "display_name", "id", "is_setup_user", "language", "password_hash", "role", "updated_at", "username") SELECT "created_at", "display_name", "id", "is_setup_user", "language", "password_hash", "role", "updated_at", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_oidc_issuer_oidc_subject_key" ON "User"("oidc_issuer", "oidc_subject");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "OidcLoginTxn_state_hash_key" ON "OidcLoginTxn"("state_hash");

-- CreateIndex
CREATE INDEX "OidcLoginTxn_binding_hash_idx" ON "OidcLoginTxn"("binding_hash");

-- CreateIndex
CREATE INDEX "OidcLoginTxn_expires_at_idx" ON "OidcLoginTxn"("expires_at");
