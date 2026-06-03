-- Migration: add slug columns to Site, Switch, Network.
--
-- SQLite can't simply ALTER a table to add a NOT NULL column when rows exist,
-- so Prisma's strategy is to rebuild the table. We extend the generated SQL
-- with a SQL backfill that produces a *valid placeholder* slug from the name
-- (lowercase, spaces→dash, strip a few common punctuation chars). This keeps
-- the unique constraints satisfiable on existing rows; the init plugin runs
-- a proper slugify pass on boot to upgrade any placeholders to clean slugs.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- ---------------------------------------------------------------------------
-- Site: globally unique slug.
-- ---------------------------------------------------------------------------
CREATE TABLE "new_Site" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL
);
INSERT INTO "new_Site" ("id", "slug", "name", "description", "created_at", "updated_at")
SELECT
  "id",
  -- Placeholder slug from name: lowercase, replace spaces with -, strip
  -- characters that are clearly not slug-safe. The init plugin refines this.
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER("name"),
    ' ', '-'),
    '_', '-'),
    '/', '-'),
    '.', '-'),
    '(', ''),
    ')', '') || '-' || SUBSTR("id", 1, 6),
  "name",
  "description",
  "created_at",
  "updated_at"
FROM "Site";
DROP TABLE "Site";
ALTER TABLE "new_Site" RENAME TO "Site";
CREATE UNIQUE INDEX "Site_slug_key" ON "Site"("slug");

-- ---------------------------------------------------------------------------
-- Switch: slug unique per site.
-- ---------------------------------------------------------------------------
CREATE TABLE "new_Switch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "site_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "manufacturer" TEXT,
    "serial_number" TEXT,
    "location" TEXT,
    "rack_position" TEXT,
    "management_ip" TEXT,
    "firmware_version" TEXT,
    "layout_template_id" TEXT,
    "stack_size" INTEGER,
    "role" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "configured_vlans" TEXT NOT NULL DEFAULT '[]',
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER,
    "notes" TEXT,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "Switch_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Switch_layout_template_id_fkey" FOREIGN KEY ("layout_template_id") REFERENCES "LayoutTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Switch" ("id", "site_id", "slug", "name", "model", "manufacturer", "serial_number", "location", "rack_position", "management_ip", "firmware_version", "layout_template_id", "stack_size", "role", "tags", "configured_vlans", "is_favorite", "sort_order", "notes", "created_at", "updated_at")
SELECT
  "id", "site_id",
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER("name"),
    ' ', '-'),
    '_', '-'),
    '/', '-'),
    '.', '-'),
    '(', ''),
    ')', '') || '-' || SUBSTR("id", 1, 6),
  "name", "model", "manufacturer", "serial_number", "location", "rack_position",
  "management_ip", "firmware_version", "layout_template_id", "stack_size", "role",
  "tags", "configured_vlans", "is_favorite", "sort_order", "notes", "created_at", "updated_at"
FROM "Switch";
DROP TABLE "Switch";
ALTER TABLE "new_Switch" RENAME TO "Switch";
CREATE INDEX "Switch_site_id_idx" ON "Switch"("site_id");
CREATE INDEX "Switch_layout_template_id_idx" ON "Switch"("layout_template_id");
CREATE UNIQUE INDEX "Switch_site_id_slug_key" ON "Switch"("site_id", "slug");

-- ---------------------------------------------------------------------------
-- Network: slug unique per site.
-- ---------------------------------------------------------------------------
CREATE TABLE "new_Network" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "site_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vlan_id" TEXT,
    "subnet" TEXT NOT NULL,
    "gateway" TEXT,
    "dns_servers" TEXT NOT NULL DEFAULT '[]',
    "description" TEXT,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "Network_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Network_vlan_id_fkey" FOREIGN KEY ("vlan_id") REFERENCES "Vlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Network" ("id", "site_id", "slug", "name", "vlan_id", "subnet", "gateway", "dns_servers", "description", "is_favorite", "created_at", "updated_at")
SELECT
  "id", "site_id",
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER("name"),
    ' ', '-'),
    '_', '-'),
    '/', '-'),
    '.', '-'),
    '(', ''),
    ')', '') || '-' || SUBSTR("id", 1, 6),
  "name", "vlan_id", "subnet", "gateway", "dns_servers", "description", "is_favorite",
  "created_at", "updated_at"
FROM "Network";
DROP TABLE "Network";
ALTER TABLE "new_Network" RENAME TO "Network";
CREATE INDEX "Network_site_id_idx" ON "Network"("site_id");
CREATE INDEX "Network_vlan_id_idx" ON "Network"("vlan_id");
CREATE UNIQUE INDEX "Network_site_id_slug_key" ON "Network"("site_id", "slug");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
