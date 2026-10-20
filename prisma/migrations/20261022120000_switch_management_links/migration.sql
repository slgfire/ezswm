-- Switch management links (Issue #302). Additive: existing rows default to
-- HTTPS with no URL override; the link is derived from management_ip.
ALTER TABLE "Switch" ADD COLUMN "management_protocol" TEXT NOT NULL DEFAULT 'https';
ALTER TABLE "Switch" ADD COLUMN "management_url" TEXT;
