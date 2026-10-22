# MCP integration

The standalone `mcp/` workspace package connects an MCP client to an existing ezSWM instance. It does not open the SQLite database or replace the app's authentication and role checks. This branch provides 16 read tools over stdio or Streamable HTTP; write tools, undo and `find_free_ip` are not available yet.

The npm package and GHCR image are release artifacts, not prerequisites for trying the source build. Until publication is confirmed, use the source instructions below rather than assuming a registry package exists.

## Build and credentials

Use Node.js 22 and the repository's pinned pnpm version. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter ezswm-mcp build
```

In **Settings → Account → API tokens**, create a token for a local account. A Viewer account is sufficient for the read tools. Store the token in a file outside the repository, readable only by the account running MCP; never paste it into a committed client configuration. Set `EZSWM_TOKEN_FILE` to its absolute path, or provide `EZSWM_TOKEN` through the process environment. The token must start with `ezswm_`.

`EZSWM_URL` is the app's base URL, for example `https://ezswm.example.com`. HTTPS is required except for loopback HTTP. `EZSWM_ALLOW_INSECURE_HTTP=true` permits a trusted non-loopback HTTP upstream, but exposes the Bearer credential to that network; prefer HTTPS. `EZSWM_TIMEOUT_MS` defaults to 15000.

Leave `PORT` unset for stdio. Logs go to stderr; stdout is reserved for MCP messages.

## Local clients (stdio)

Replace every `/ABS/...` path with an absolute path on the client machine. The client starts the process; do not start another HTTP listener for these examples.

### Claude Desktop

Open **Settings → Developer → Edit Config**, then merge this entry into `claude_desktop_config.json` and fully restart the app:

```json
{
  "mcpServers": {
    "ezswm": {
      "command": "node",
      "args": ["/ABS/ezswm/mcp/dist/index.js"],
      "env": {
        "EZSWM_URL": "https://ezswm.example.com",
        "EZSWM_TOKEN_FILE": "/ABS/secrets/ezswm-api-token"
      }
    }
  }
}
```

On macOS the file is under `~/Library/Application Support/Claude/`; on Windows it is under `%APPDATA%\Claude\`. If the GUI cannot locate Node.js, use its absolute executable path. No environment interpolation is assumed here.

### Cursor

Use project `.cursor/mcp.json` or global `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ezswm": {
      "type": "stdio",
      "command": "node",
      "args": ["/ABS/ezswm/mcp/dist/index.js"],
      "env": {
        "EZSWM_URL": "https://ezswm.example.com",
        "EZSWM_TOKEN_FILE": "/ABS/secrets/ezswm-api-token"
      }
    }
  }
}
```

### OpenCode V2

Merge into `opencode.json` or `opencode.jsonc`. Native V2 configuration uses `mcp.servers`, not a project `.mcp.json` file:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "ezswm": {
        "type": "local",
        "command": ["node", "/ABS/ezswm/mcp/dist/index.js"],
        "environment": {
          "EZSWM_URL": "https://ezswm.example.com",
          "EZSWM_TOKEN_FILE": "/ABS/secrets/ezswm-api-token"
        }
      }
    }
  }
}
```

## Hosted HTTP

Setting `PORT` enables stateless Streamable HTTP at `/mcp`. The default bind is `127.0.0.1`. Every request requires a Bearer client credential, including initialization; there is no anonymous mode or OAuth flow.

**Credential boundary:** the upstream `EZSWM_TOKEN` belongs only to the MCP server. Clients use a different token from `EZSWM_MCP_AUTH_TOKEN` (comma-separated allowlist) or `EZSWM_MCP_AUTH_TOKEN_FILE`. These client credentials must start with `ezswm_`, but the current HTTP implementation compares them against a static local allowlist; it does not validate their owner, expiry or revocation with ezSWM. Removing or rotating a client credential requires changing this configuration and restarting MCP. All accepted clients share the upstream account's permissions and attribution. Revoking the upstream token in ezSWM stops upstream requests, not acceptance of the separate HTTP credential. Use stdio when each user needs their own ezSWM identity.

Example process configuration, with both token files kept outside the repository:

```sh
EZSWM_URL=https://ezswm.example.com \
EZSWM_TOKEN_FILE=/ABS/secrets/ezswm-api-token \
EZSWM_MCP_AUTH_TOKEN_FILE=/ABS/secrets/ezswm-mcp-client-token \
PORT=3001 \
EZSWM_HTTP_ALLOWED_HOSTS=mcp.example.com,127.0.0.1:3001 \
EZSWM_HTTP_ALLOWED_ORIGINS=https://mcp.example.com \
node /ABS/ezswm/mcp/dist/index.js
```

Terminate TLS at a reverse proxy and forward `/mcp` to the loopback listener. List the exact forwarded `Host` value (including the port when present); unknown Hosts return 403. An `Origin` header, when present, must match an allowed URL origin; requests without it are permitted after the other checks. These are request validation rules, not a promise of browser CORS support.

To bind outside loopback, set `HOST` explicitly and require all three settings: `EZSWM_HTTP_ALLOW_REMOTE_BIND=true`, a non-empty `EZSWM_HTTP_ALLOWED_HOSTS`, and a non-empty `EZSWM_HTTP_ALLOWED_ORIGINS`. Never expose the plaintext listener directly to an untrusted network. SIGINT/SIGTERM initiate shutdown; the process has a five-second shutdown deadline.

### Remote client examples

OpenCode V2 supports custom Bearer headers with OAuth disabled. Provide `EZSWM_MCP_AUTH_TOKEN` in the client environment:

```json
{
  "mcp": {
    "servers": {
      "ezswm": {
        "type": "remote",
        "url": "https://mcp.example.com/mcp",
        "oauth": false,
        "headers": { "Authorization": "Bearer {env:EZSWM_MCP_AUTH_TOKEN}" }
      }
    }
  }
}
```

Cursor uses a different interpolation syntax in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ezswm": {
      "url": "https://mcp.example.com/mcp",
      "headers": { "Authorization": "Bearer ${env:EZSWM_MCP_AUTH_TOKEN}" }
    }
  }
}
```

These formats follow the official client documentation; live GUI connections and a real TLS reverse proxy have not been verified here. Use Claude Desktop's stdio configuration above rather than assuming custom remote headers are supported.

## Tools and troubleshooting

Read tools: `list_sites`, `get_site`, `list_switches`, `get_switch`, `list_vlans`, `get_vlan`, `list_networks`, `get_network`, `list_ip_allocations`, `list_ip_ranges`, `list_lags`, `list_device_types`, `get_settings`, `subnet_info`, `search`, `find_free_ip`, `export_documentation_data`, `list_activity`. Respect each tool's schema and `more_available` indicators; capped results are not a complete inventory. Documentation export is allowlisted, not a database backup. `list_activity` shows a sanitized activity log (actor, action, entity, undoability) without raw state snapshots.

Write tools: `create_switch`, `update_switch`, `update_port`, `update_ports`, `create_vlan`, `update_vlan`, `delete_vlan`, `create_network`, `update_network`, `delete_network`, `create_ip_allocation`, `update_ip_allocation`, `delete_ip_allocation`, `create_ip_range`, `update_ip_range`, `delete_ip_range`, `create_lag`, `update_lag`, `delete_lag`, `create_device_type`, `update_device_type`, `import_documentation_data`. Destructive tools and `undo_activity` use a two-phase contract: call without `confirm` for a server-side preview, then pass `confirm: true` with the returned impact/undo token. A stale token returns HTTP 409 with a fresh preview instead of mutating anything. Site create/delete, switch delete and category deletes are deliberately not exposed to MCP.

`undo_activity` can revert a bounded set of recent changes: VLAN, network, IP allocation and IP range create/update/delete actions, and site updates. Creating an entity is undone by deleting it (guarded, with impact preview). Other actions are reported as not undoable and are rejected with HTTP 422; the token's role is re-checked at execution time and conflicting state aborts the undo without partial writes.

- Startup failure: check the required URL and token file, file permissions and whether `PORT` was unintentionally inherited.
- HTTP 401: check the separate MCP client credential. An upstream authentication error instead requires replacing or renewing the app token.
- HTTP 403: check Host and Origin allowlists and the upstream account's current role.
- HTTP 406 when testing manually: send `Accept: application/json, text/event-stream`; an MCP client does this itself.
- After a full ezSWM restore, create a new upstream token: restores revoke all app API tokens. Never share token files or raw database snapshots.

Client references: [Claude Desktop/local MCP](https://modelcontextprotocol.io/docs/develop/connect-local-servers), [Cursor MCP](https://cursor.com/docs/mcp), [OpenCode V2 MCP](https://opencode.ai/v2/docs/mcp-servers).
