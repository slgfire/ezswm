-- CreateTable
CREATE TABLE "PatchPanelToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patch_panel_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "revoked_at" TEXT,
    "last_access_at" TEXT,
    CONSTRAINT "PatchPanelToken_patch_panel_id_fkey" FOREIGN KEY ("patch_panel_id") REFERENCES "PatchPanel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PatchPanelToken_token_key" ON "PatchPanelToken"("token");

-- CreateIndex
CREATE INDEX "PatchPanelToken_patch_panel_id_idx" ON "PatchPanelToken"("patch_panel_id");
