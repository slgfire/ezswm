#!/usr/bin/env bash
# seed-demo.sh — Populate ezSWM with realistic demo data via the API.
# Usage: ./scripts/seed-demo.sh [BASE_URL]
#   BASE_URL defaults to http://localhost:3000

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "============================================"
echo "  ezSWM Demo Data Seed"
echo "  Target: $BASE_URL"
echo "============================================"
echo ""

# Helper: POST JSON, save cookies, print response, exit on HTTP error
api_post() {
  local endpoint="$1"
  local data="$2"
  local url="${BASE_URL}${endpoint}"

  echo "  POST $endpoint"
  local response
  response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -d "$data" \
    "$url")

  local http_code
  http_code=$(echo "$response" | tail -n1)
  local body
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" -ge 400 ]]; then
    echo "    WARNING: HTTP $http_code — $body"
    echo "$body"
    return 0
  fi

  echo "    OK ($http_code)"
  echo "$body"
}

# -------------------------------------------------------------------
# 1. Setup admin user
# -------------------------------------------------------------------
echo ">>> Step 1: Create admin user via /api/auth/setup"

SETUP_RESPONSE=$(api_post "/api/auth/setup" '{
  "username": "admin",
  "password": "admin1234",
  "display_name": "Demo Admin",
  "language": "en"
}')

echo ""

# -------------------------------------------------------------------
# 2. Login (in case setup was already done)
# -------------------------------------------------------------------
echo ">>> Step 1b: Login as admin (fallback if setup already completed)"

LOGIN_RESPONSE=$(api_post "/api/auth/login" '{
  "username": "admin",
  "password": "admin1234",
  "remember_me": true
}')

echo ""

# -------------------------------------------------------------------
# 3. Create layout templates
# -------------------------------------------------------------------
echo ">>> Step 2: Create layout templates"

echo "  Creating Juniper QFX5100-48S..."
JUNIPER_RESPONSE=$(api_post "/api/layout-templates" '{
  "name": "Juniper QFX5100-48S",
  "manufacturer": "Juniper",
  "model": "QFX5100-48S",
  "description": "48-port 10GbE SFP+ switch with 6x 40GbE QSFP+ uplinks",
  "units": [
    {
      "unit_number": 1,
      "label": "QFX5100-48S",
      "blocks": [
        {
          "type": "management",
          "count": 1,
          "start_index": 0,
          "rows": 1,
          "label": "MGMT"
        },
        {
          "type": "sfp+",
          "count": 48,
          "start_index": 1,
          "rows": 2,
          "row_layout": "odd-even",
          "default_speed": "10G",
          "label": "SFP+ Ports"
        },
        {
          "type": "qsfp",
          "count": 6,
          "start_index": 49,
          "rows": 2,
          "row_layout": "odd-even",
          "default_speed": "100G",
          "label": "QSFP+ Uplinks"
        }
      ]
    }
  ]
}')
JUNIPER_ID=$(echo "$JUNIPER_RESPONSE" | jq -r '.id // empty' 2>/dev/null || true)
echo "    Template ID: ${JUNIPER_ID:-<not created>}"
echo ""

echo "  Creating Cisco 2960-24T..."
CISCO_RESPONSE=$(api_post "/api/layout-templates" '{
  "name": "Cisco 2960-24T",
  "manufacturer": "Cisco",
  "model": "WS-C2960-24T-L",
  "description": "24-port Fast Ethernet switch with 2 SFP uplinks",
  "units": [
    {
      "unit_number": 1,
      "label": "2960-24T",
      "blocks": [
        {
          "type": "console",
          "count": 1,
          "start_index": 0,
          "rows": 1,
          "label": "Console"
        },
        {
          "type": "rj45",
          "count": 24,
          "start_index": 1,
          "rows": 2,
          "row_layout": "odd-even",
          "default_speed": "1G",
          "label": "Ethernet Ports"
        },
        {
          "type": "sfp",
          "count": 2,
          "start_index": 25,
          "rows": 2,
          "row_layout": "odd-even",
          "default_speed": "1G",
          "label": "SFP Uplinks"
        }
      ]
    }
  ]
}')
CISCO_ID=$(echo "$CISCO_RESPONSE" | jq -r '.id // empty' 2>/dev/null || true)
echo "    Template ID: ${CISCO_ID:-<not created>}"
echo ""

# -------------------------------------------------------------------
# 4. Create VLANs
# -------------------------------------------------------------------
echo ">>> Step 3: Create VLANs"

echo "  Creating VLAN 10 — Management..."
api_post "/api/vlans" '{
  "vlan_id": 10,
  "name": "Management",
  "description": "Management network for infrastructure devices",
  "status": "active",
  "color": "#3498DB"
}' > /dev/null

echo "  Creating VLAN 100 — Server..."
api_post "/api/vlans" '{
  "vlan_id": 100,
  "name": "Server",
  "description": "Server and services network",
  "status": "active",
  "color": "#E74C3C"
}' > /dev/null

echo "  Creating VLAN 200 — Gaming..."
api_post "/api/vlans" '{
  "vlan_id": 200,
  "name": "Gaming",
  "description": "LAN party gaming traffic",
  "status": "active",
  "color": "#2ECC71"
}' > /dev/null

echo "  Creating VLAN 300 — Streaming..."
api_post "/api/vlans" '{
  "vlan_id": 300,
  "name": "Streaming",
  "description": "Streaming and media traffic",
  "status": "active",
  "color": "#9B59B6"
}' > /dev/null

echo "  Creating VLAN 999 — Guest..."
api_post "/api/vlans" '{
  "vlan_id": 999,
  "name": "Guest",
  "description": "Guest WiFi and untrusted devices",
  "status": "active",
  "color": "#F39C12"
}' > /dev/null

echo ""

# -------------------------------------------------------------------
# 5. Create VLANs — fetch IDs for network linking
# -------------------------------------------------------------------
echo ">>> Step 4: Fetch VLAN IDs for network linking"

VLANS_JSON=$(curl -s -b "$COOKIE_JAR" "${BASE_URL}/api/vlans")
VLAN10_ID=$(echo "$VLANS_JSON" | jq -r '.[] | select(.vlan_id == 10) | .id' 2>/dev/null || true)
VLAN100_ID=$(echo "$VLANS_JSON" | jq -r '.[] | select(.vlan_id == 100) | .id' 2>/dev/null || true)
VLAN200_ID=$(echo "$VLANS_JSON" | jq -r '.[] | select(.vlan_id == 200) | .id' 2>/dev/null || true)

echo "    VLAN 10 ID:  ${VLAN10_ID:-<not found>}"
echo "    VLAN 100 ID: ${VLAN100_ID:-<not found>}"
echo "    VLAN 200 ID: ${VLAN200_ID:-<not found>}"
echo ""

# -------------------------------------------------------------------
# 6. Create networks
# -------------------------------------------------------------------
echo ">>> Step 5: Create networks"

echo "  Creating Management Network (10.0.0.0/24)..."
api_post "/api/networks" "$(jq -n \
  --arg name "Management Network" \
  --arg subnet "10.0.0.0/24" \
  --arg gateway "10.0.0.1" \
  --arg vlan_id "${VLAN10_ID}" \
  --arg desc "Core management network for all infrastructure devices" \
  '{name: $name, subnet: $subnet, gateway: $gateway, vlan_id: $vlan_id, description: $desc, dns_servers: ["10.0.0.1"]}'
)" > /dev/null

echo "  Creating Server Network (10.0.1.0/24)..."
api_post "/api/networks" "$(jq -n \
  --arg name "Server Network" \
  --arg subnet "10.0.1.0/24" \
  --arg gateway "10.0.1.1" \
  --arg vlan_id "${VLAN100_ID}" \
  --arg desc "Server and services network" \
  '{name: $name, subnet: $subnet, gateway: $gateway, vlan_id: $vlan_id, description: $desc, dns_servers: ["10.0.1.1", "1.1.1.1"]}'
)" > /dev/null

echo "  Creating Gaming Network (10.0.2.0/24)..."
api_post "/api/networks" "$(jq -n \
  --arg name "Gaming Network" \
  --arg subnet "10.0.2.0/24" \
  --arg gateway "10.0.2.1" \
  --arg vlan_id "${VLAN200_ID}" \
  --arg desc "LAN party gaming network" \
  '{name: $name, subnet: $subnet, gateway: $gateway, vlan_id: $vlan_id, description: $desc, dns_servers: ["10.0.2.1", "8.8.8.8"]}'
)" > /dev/null

echo ""

# -------------------------------------------------------------------
# 7. Create switches
# -------------------------------------------------------------------
echo ">>> Step 6: Create switches"

echo "  Creating core-sw01 (Juniper QFX5100-48S)..."
api_post "/api/switches" "$(jq -n \
  --arg name "core-sw01" \
  --arg model "QFX5100-48S" \
  --arg manufacturer "Juniper" \
  --arg location "Server Room" \
  --arg rack "Rack A, U20" \
  --arg mgmt_ip "10.0.0.1" \
  --arg firmware "21.4R3-S5" \
  --arg template_id "${JUNIPER_ID}" \
  --arg notes "Core aggregation switch — handles all inter-VLAN routing" \
  '{
    name: $name,
    model: $model,
    manufacturer: $manufacturer,
    location: $location,
    rack_position: $rack,
    management_ip: $mgmt_ip,
    firmware_version: $firmware,
    layout_template_id: $template_id,
    role: "core",
    tags: ["core", "juniper", "10g"],
    notes: $notes
  }'
)" > /dev/null

echo "  Creating access-sw01 (Cisco 2960-24T, Hall A)..."
api_post "/api/switches" "$(jq -n \
  --arg name "access-sw01" \
  --arg model "WS-C2960-24T-L" \
  --arg manufacturer "Cisco" \
  --arg location "Hall A" \
  --arg rack "Table Row 1" \
  --arg mgmt_ip "10.0.0.2" \
  --arg firmware "15.2(7)E3" \
  --arg template_id "${CISCO_ID}" \
  --arg notes "Access switch for Hall A gaming area" \
  '{
    name: $name,
    model: $model,
    manufacturer: $manufacturer,
    location: $location,
    rack_position: $rack,
    management_ip: $mgmt_ip,
    firmware_version: $firmware,
    layout_template_id: $template_id,
    role: "access",
    tags: ["access", "cisco", "hall-a"],
    notes: $notes
  }'
)" > /dev/null

echo "  Creating access-sw02 (Cisco 2960-24T, Hall B)..."
api_post "/api/switches" "$(jq -n \
  --arg name "access-sw02" \
  --arg model "WS-C2960-24T-L" \
  --arg manufacturer "Cisco" \
  --arg location "Hall B" \
  --arg rack "Table Row 1" \
  --arg mgmt_ip "10.0.0.3" \
  --arg firmware "15.2(7)E3" \
  --arg template_id "${CISCO_ID}" \
  --arg notes "Access switch for Hall B streaming area" \
  '{
    name: $name,
    model: $model,
    manufacturer: $manufacturer,
    location: $location,
    rack_position: $rack,
    management_ip: $mgmt_ip,
    firmware_version: $firmware,
    layout_template_id: $template_id,
    role: "access",
    tags: ["access", "cisco", "hall-b"],
    notes: $notes
  }'
)" > /dev/null

echo ""

# -------------------------------------------------------------------
# Done
# -------------------------------------------------------------------
echo "============================================"
echo "  Demo data seeding complete!"
echo ""
echo "  Login credentials:"
echo "    Username: admin"
echo "    Password: admin1234"
echo ""
echo "  Created:"
echo "    - 1 admin user"
echo "    - 2 layout templates"
echo "    - 5 VLANs (10, 100, 200, 300, 999)"
echo "    - 3 networks (10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24)"
echo "    - 3 switches (core-sw01, access-sw01, access-sw02)"
echo "============================================"
