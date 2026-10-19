-- Custom device types for IP allocations (Issue #301).
-- Built-in device types stay hard-coded and immutable; this table only holds
-- admin-managed additions. The id is the immutable key stored in
-- IpAllocation.device_type. There is no delete API, so inactive types keep
-- their rows (and any allocation referencing them stays valid).
CREATE TABLE "CustomDeviceType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX "CustomDeviceType_name_key" ON "CustomDeviceType"("name");
