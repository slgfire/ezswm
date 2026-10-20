-- Admin-managed disabling of built-in device types (Issue #301).
-- Built-in keys stay immutable; this only controls whether new allocations may
-- assign them. Existing allocations keep their raw key.
ALTER TABLE "AppSettings" ADD COLUMN "disabled_builtin_device_types" TEXT NOT NULL DEFAULT '[]';
