-- CreateTable
CREATE TABLE "PatchPanel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "site_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "port_count" INTEGER NOT NULL,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "PatchPanel_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PatchPanelSocket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patch_panel_id" TEXT NOT NULL,
    "port_number" INTEGER NOT NULL,
    "side" TEXT,
    "outlet_number" TEXT,
    "location" TEXT,
    "tested" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "PatchPanelSocket_patch_panel_id_fkey" FOREIGN KEY ("patch_panel_id") REFERENCES "PatchPanel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "app_name" TEXT NOT NULL,
    "app_logo_url" TEXT,
    "default_vlan" INTEGER,
    "default_port_status" TEXT NOT NULL,
    "port_speeds" TEXT NOT NULL DEFAULT '[]',
    "setup_completed" BOOLEAN NOT NULL DEFAULT false,
    "sites_initialized" BOOLEAN NOT NULL DEFAULT false,
    "patch_panels_enabled" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_AppSettings" ("app_logo_url", "app_name", "default_port_status", "default_vlan", "id", "port_speeds", "setup_completed", "sites_initialized") SELECT "app_logo_url", "app_name", "default_port_status", "default_vlan", "id", "port_speeds", "setup_completed", "sites_initialized" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PatchPanel_site_id_idx" ON "PatchPanel"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "PatchPanel_site_id_slug_key" ON "PatchPanel"("site_id", "slug");

-- CreateIndex
CREATE INDEX "PatchPanelSocket_patch_panel_id_idx" ON "PatchPanelSocket"("patch_panel_id");

-- CreateIndex
CREATE UNIQUE INDEX "PatchPanelSocket_patch_panel_id_port_number_key" ON "PatchPanelSocket"("patch_panel_id", "port_number");
