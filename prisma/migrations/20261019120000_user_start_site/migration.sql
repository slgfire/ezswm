-- Preferred start site per user (Issue #298). Null means Automatic.
-- SQLite allows adding a nullable column with a foreign key in place, so existing
-- rows are preserved and default to NULL without a table rebuild.
ALTER TABLE "User" ADD COLUMN "start_site_id" TEXT REFERENCES "Site" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "User_start_site_id_idx" ON "User"("start_site_id");
