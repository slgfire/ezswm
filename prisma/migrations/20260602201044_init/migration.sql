-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Switch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "site_id" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "Port" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "switch_id" TEXT NOT NULL,
    "unit" INTEGER NOT NULL,
    "index" INTEGER NOT NULL,
    "label" TEXT,
    "type" TEXT NOT NULL,
    "speed" TEXT,
    "status" TEXT NOT NULL,
    "port_mode" TEXT,
    "access_vlan" INTEGER,
    "native_vlan" INTEGER,
    "tagged_vlans" TEXT NOT NULL DEFAULT '[]',
    "connected_device" TEXT,
    "connected_device_id" TEXT,
    "connected_port_id" TEXT,
    "connected_port" TEXT,
    "description" TEXT,
    "mac_address" TEXT,
    "lag_group_id" TEXT,
    "connected_allocation_id" TEXT,
    "poe" TEXT,
    "helper_usage" TEXT,
    "helper_label" TEXT,
    "show_in_helper_list" BOOLEAN,
    CONSTRAINT "Port_switch_id_fkey" FOREIGN KEY ("switch_id") REFERENCES "Switch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Port_lag_group_id_fkey" FOREIGN KEY ("lag_group_id") REFERENCES "LagGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Port_connected_allocation_id_fkey" FOREIGN KEY ("connected_allocation_id") REFERENCES "IpAllocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "site_id" TEXT NOT NULL,
    "vlan_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "routing_device" TEXT,
    "color" TEXT NOT NULL,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "Vlan_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Network" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "site_id" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "IpAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "network_id" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "hostname" TEXT,
    "mac_address" TEXT,
    "device_type" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "IpAllocation_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "Network" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IpRange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "network_id" TEXT NOT NULL,
    "start_ip" TEXT NOT NULL,
    "end_ip" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "IpRange_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "Network" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LagGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "switch_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "remote_device" TEXT,
    "remote_device_id" TEXT,
    "description" TEXT,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "LagGroup_switch_id_fkey" FOREIGN KEY ("switch_id") REFERENCES "Switch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LayoutTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "description" TEXT,
    "datasheet_url" TEXT,
    "airflow" TEXT,
    "units" TEXT NOT NULL DEFAULT '[]',
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PublicToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "switch_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "revoked_at" TEXT,
    "last_access_at" TEXT,
    CONSTRAINT "PublicToken_switch_id_fkey" FOREIGN KEY ("switch_id") REFERENCES "Switch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "is_setup_user" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ActivityEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_name" TEXT NOT NULL,
    "changes" TEXT,
    "previous_state" TEXT,
    "metadata" TEXT,
    "timestamp" TEXT NOT NULL,
    CONSTRAINT "ActivityEntry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TopologyLayout" (
    "site_id" TEXT NOT NULL PRIMARY KEY,
    "node_positions" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "TopologyLayout_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "app_name" TEXT NOT NULL,
    "app_logo_url" TEXT,
    "default_vlan" INTEGER,
    "default_port_status" TEXT NOT NULL,
    "port_speeds" TEXT NOT NULL DEFAULT '[]',
    "setup_completed" BOOLEAN NOT NULL DEFAULT false,
    "sites_initialized" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE INDEX "Switch_site_id_idx" ON "Switch"("site_id");

-- CreateIndex
CREATE INDEX "Switch_layout_template_id_idx" ON "Switch"("layout_template_id");

-- CreateIndex
CREATE INDEX "Port_switch_id_idx" ON "Port"("switch_id");

-- CreateIndex
CREATE INDEX "Port_lag_group_id_idx" ON "Port"("lag_group_id");

-- CreateIndex
CREATE INDEX "Port_connected_allocation_id_idx" ON "Port"("connected_allocation_id");

-- CreateIndex
CREATE INDEX "Vlan_site_id_idx" ON "Vlan"("site_id");

-- CreateIndex
CREATE INDEX "Vlan_site_id_vlan_id_idx" ON "Vlan"("site_id", "vlan_id");

-- CreateIndex
CREATE INDEX "Network_site_id_idx" ON "Network"("site_id");

-- CreateIndex
CREATE INDEX "Network_vlan_id_idx" ON "Network"("vlan_id");

-- CreateIndex
CREATE INDEX "IpAllocation_network_id_idx" ON "IpAllocation"("network_id");

-- CreateIndex
CREATE INDEX "IpAllocation_network_id_ip_address_idx" ON "IpAllocation"("network_id", "ip_address");

-- CreateIndex
CREATE INDEX "IpRange_network_id_idx" ON "IpRange"("network_id");

-- CreateIndex
CREATE INDEX "LagGroup_switch_id_idx" ON "LagGroup"("switch_id");

-- CreateIndex
CREATE UNIQUE INDEX "PublicToken_token_key" ON "PublicToken"("token");

-- CreateIndex
CREATE INDEX "PublicToken_switch_id_idx" ON "PublicToken"("switch_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "ActivityEntry_user_id_idx" ON "ActivityEntry"("user_id");

-- CreateIndex
CREATE INDEX "ActivityEntry_entity_type_entity_id_idx" ON "ActivityEntry"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ActivityEntry_timestamp_idx" ON "ActivityEntry"("timestamp");
