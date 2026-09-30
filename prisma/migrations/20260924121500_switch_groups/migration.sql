-- CreateTable
CREATE TABLE "SwitchGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "site_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "SwitchGroup_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "group_id" TEXT,
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
    CONSTRAINT "Switch_layout_template_id_fkey" FOREIGN KEY ("layout_template_id") REFERENCES "LayoutTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Switch_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "SwitchGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Switch" (
    "id", "site_id", "slug", "name", "model", "manufacturer", "serial_number", "location", "rack_position",
    "management_ip", "firmware_version", "layout_template_id", "stack_size", "role", "tags", "configured_vlans",
    "is_favorite", "sort_order", "notes", "created_at", "updated_at"
) SELECT
    "id", "site_id", "slug", "name", "model", "manufacturer", "serial_number", "location", "rack_position",
    "management_ip", "firmware_version", "layout_template_id", "stack_size", "role", "tags", "configured_vlans",
    "is_favorite", "sort_order", "notes", "created_at", "updated_at"
FROM "Switch";
DROP TABLE "Switch";
ALTER TABLE "new_Switch" RENAME TO "Switch";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SwitchGroup_site_id_idx" ON "SwitchGroup"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "SwitchGroup_site_id_slug_key" ON "SwitchGroup"("site_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "SwitchGroup_site_id_name_key" ON "SwitchGroup"("site_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Switch_site_id_slug_key" ON "Switch"("site_id", "slug");

-- CreateIndex
CREATE INDEX "Switch_site_id_idx" ON "Switch"("site_id");

-- CreateIndex
CREATE INDEX "Switch_layout_template_id_idx" ON "Switch"("layout_template_id");

-- CreateIndex
CREATE INDEX "Switch_group_id_idx" ON "Switch"("group_id");
