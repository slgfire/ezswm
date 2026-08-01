-- Prevent duplicate LAG names on the same switch under concurrency.
-- Keep the first row (stable by id) and give later duplicates the next free
-- human-readable number. A temporary name prevents collisions during the
-- rewrite; the candidate formula skips all already occupied numbers.
CREATE TEMP TABLE "_lag_duplicate" ("id" TEXT PRIMARY KEY, "switch_id" TEXT NOT NULL, "base_name" TEXT NOT NULL, "duplicate_number" INTEGER NOT NULL);
INSERT INTO "_lag_duplicate"
SELECT "id", "switch_id", TRIM("name", char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279)),
       ROW_NUMBER() OVER (PARTITION BY "switch_id", TRIM("name", char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279)) ORDER BY "id")
FROM "LagGroup";
CREATE TEMP TABLE "_lag_snapshot" ("switch_id" TEXT NOT NULL, "name" TEXT NOT NULL);
INSERT INTO "_lag_snapshot" SELECT "switch_id", TRIM("name", char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279)) FROM "LagGroup";
CREATE TEMP TABLE "_lag_rename" ("id" TEXT PRIMARY KEY, "final_name" TEXT NOT NULL);

-- Calculate every destination against the unchanged snapshot, before any
-- destination name is written back to LagGroup.
WITH RECURSIVE "numbers"("n") AS (
  SELECT 2
  UNION ALL SELECT "n" + 1 FROM "numbers"
  WHERE "n" < (SELECT COUNT(*) FROM "_lag_duplicate") + (SELECT COUNT(*) FROM "LagGroup") + 2
)
INSERT INTO "_lag_rename"
SELECT d."id", CASE WHEN d."duplicate_number" = 1 THEN d."base_name" ELSE d."base_name" || ' (duplicate ' || MIN(numbers."n") || ')' END
FROM "_lag_duplicate" d CROSS JOIN "numbers"
WHERE d."duplicate_number" = 1 OR (d."duplicate_number" > 1
  AND numbers."n" - 1 - (
    SELECT COUNT(*) FROM "numbers" occupied_number
    WHERE occupied_number."n" <= numbers."n"
      AND EXISTS (
        SELECT 1 FROM "_lag_snapshot" occupied
        WHERE occupied."switch_id" = d."switch_id"
          AND occupied."name" = d."base_name" || ' (duplicate ' || occupied_number."n" || ')'
      )
  ) >= d."duplicate_number" - 1)
GROUP BY d."id", d."base_name", d."duplicate_number";
UPDATE "LagGroup"
SET "name" = '__lag_migration_tmp_' || "id"
WHERE "id" IN (SELECT "id" FROM "_lag_duplicate");
UPDATE "LagGroup"
SET "name" = (SELECT "final_name" FROM "_lag_rename" WHERE "id" = "LagGroup"."id")
WHERE "id" IN (SELECT "id" FROM "_lag_rename");
DROP TABLE "_lag_rename";
DROP TABLE "_lag_snapshot";
DROP TABLE "_lag_duplicate";
CREATE UNIQUE INDEX "LagGroup_switch_id_name_key" ON "LagGroup"("switch_id", "name");
