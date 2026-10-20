-- API tokens (hashed). Additive.
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "last_used_at" TEXT,
    "expires_at" TEXT,
    CONSTRAINT "ApiToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ApiToken_token_hash_key" ON "ApiToken"("token_hash");
CREATE INDEX "ApiToken_user_id_idx" ON "ApiToken"("user_id");
CREATE UNIQUE INDEX "ApiToken_user_id_name_key" ON "ApiToken"("user_id", "name");

-- Atomic per-user limit (max 10), safe under concurrent creates.
CREATE TRIGGER "ApiToken_limit_per_user" BEFORE INSERT ON "ApiToken"
WHEN (SELECT COUNT(*) FROM "ApiToken" WHERE "user_id" = NEW."user_id") >= 10
BEGIN
    SELECT RAISE(ABORT, 'api_token_limit');
END;
