-- Convert PatchPanelSocket from structural L/R rows to one row per panel/port.
-- Deterministic survivor per (patch_panel_id, port_number):
--   1) side priority: L, then R, then any other value
--   2) oldest created_at
--   3) lowest id (stable tie-breaker)

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_PatchPanelSocket" (
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

INSERT INTO "new_PatchPanelSocket" (
    "id",
    "patch_panel_id",
    "port_number",
    "side",
    "outlet_number",
    "location",
    "tested",
    "created_at",
    "updated_at"
)
SELECT
    ranked."id",
    ranked."patch_panel_id",
    ranked."port_number",
    ranked."side",
    ranked."outlet_number",
    ranked."location",
    ranked."tested",
    ranked."created_at",
    ranked."updated_at"
FROM (
    SELECT
        pps."id",
        pps."patch_panel_id",
        pps."port_number",
        pps."side",
        pps."outlet_number",
        pps."location",
        pps."tested",
        pps."created_at",
        pps."updated_at",
        ROW_NUMBER() OVER (
            PARTITION BY pps."patch_panel_id", pps."port_number"
            ORDER BY
                CASE
                    WHEN pps."side" = 'L' THEN 0
                    WHEN pps."side" = 'R' THEN 1
                    ELSE 2
                END ASC,
                pps."created_at" ASC,
                pps."id" ASC
        ) AS rn
    FROM "PatchPanelSocket" pps
) ranked
WHERE ranked.rn = 1;

DROP TABLE "PatchPanelSocket";
ALTER TABLE "new_PatchPanelSocket" RENAME TO "PatchPanelSocket";

CREATE INDEX "PatchPanelSocket_patch_panel_id_idx" ON "PatchPanelSocket"("patch_panel_id");
CREATE UNIQUE INDEX "PatchPanelSocket_patch_panel_id_port_number_key" ON "PatchPanelSocket"("patch_panel_id", "port_number");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
