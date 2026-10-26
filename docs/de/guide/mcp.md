# MCP-Anbindung

Das eigenständige Workspace-Paket `mcp/` verbindet einen MCP-Client mit einer bestehenden ezSWM-Instanz. Es öffnet keine SQLite-Datenbank; Authentifizierung, Rollenprüfung und Fachlogik bleiben in der App. Dieser Branch bietet 18 lesende Werkzeuge (darunter `find_free_ip` und `list_activity`) und 23 schreibende Werkzeuge (darunter `undo_activity`) über stdio oder Streamable HTTP.

Das npm-Paket und das GHCR-Image sind Release-Artefakte. Solange ihre Veröffentlichung nicht bestätigt ist, verwende den Quellcode-Build, statt vorhandene Registry-Pakete vorauszusetzen.

## Build und Zugangsdaten

Verwende das getestete Node.js 24.22.1 und die im Repository festgelegte pnpm-Version. Im Repository-Hauptverzeichnis:

```sh
pnpm install --frozen-lockfile
pnpm --filter ezswm-mcp build
```

Erstelle unter **Einstellungen → Konto → API-Tokens** ein Token für ein lokales Konto. Für die lesenden Werkzeuge genügt ein Viewer. Speichere das Token außerhalb des Repositorys in einer Datei, die nur das ausführende Konto lesen kann. Keine Secrets in eingecheckte Client-Konfigurationen schreiben. `EZSWM_TOKEN_FILE` enthält den absoluten Dateipfad; alternativ kann `EZSWM_TOKEN` über die Prozessumgebung gesetzt werden. Das Token muss mit `ezswm_` beginnen.

`EZSWM_URL` ist die Basis-URL der App, etwa `https://ezswm.example.com`. HTTPS ist erforderlich, außer bei Loopback-HTTP. `EZSWM_ALLOW_INSECURE_HTTP=true` erlaubt einen vertrauenswürdigen HTTP-Upstream außerhalb von Loopback, legt das Bearer-Secret aber im betreffenden Netz offen; bevorzuge HTTPS. `EZSWM_TIMEOUT_MS` beträgt standardmäßig 15000.

Für stdio darf `PORT` nicht gesetzt sein. Logs gehen nach stderr, stdout bleibt MCP-Nachrichten vorbehalten.

## Lokale Clients (stdio)

Ersetze alle `/ABS/...`-Pfade durch absolute Pfade auf dem Client-Rechner. Der Client startet den Prozess; für diese Beispiele ist kein zusätzlicher HTTP-Listener nötig.

### Claude Desktop

Öffne **Settings → Developer → Edit Config**, ergänze `claude_desktop_config.json` und starte die App vollständig neu:

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

Unter macOS liegt die Datei in `~/Library/Application Support/Claude/`, unter Windows in `%APPDATA%\Claude\`. Findet die GUI Node.js nicht, verwende dessen absoluten Programmpfad. Dieses Beispiel setzt keine Variablenersetzung voraus.

### Cursor

Verwende projektbezogen `.cursor/mcp.json` oder global `~/.cursor/mcp.json`:

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

Ergänze `opencode.json` oder `opencode.jsonc`. Native V2-Konfiguration verwendet `mcp.servers`, keine projektbezogene `.mcp.json`:

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

### Docker-Image über stdio

Das Image aus `mcp/Dockerfile` setzt standardmäßig `PORT=3000` (HTTP-Modus). Für stdio **musst** du das mit einem leeren `PORT` überschreiben, sonst startet es einen HTTP-Listener und verlangt das Client-Credential. Baue das Image lokal im Repository-Hauptverzeichnis (ein veröffentlichtes Image wird nicht vorausgesetzt) und nutze eine private Env-Datei (Modus `600`, außerhalb des Repositorys) mit `EZSWM_URL` und `EZSWM_TOKEN`:

```sh
docker build --build-arg VERSION=0.46.0 -f mcp/Dockerfile -t ezswm-mcp:local .
docker run -i --rm --env-file /ABS/secrets/ezswm-mcp.env -e PORT= ezswm-mcp:local
```

Das Image läuft als Nicht-Root-Benutzer `node`. Umgebungsvariablen sind für jeden sichtbar, der `docker inspect` auf den Container ausführen darf; für eine Token-Datei diese schreibgeschützt an einen für UID 1000 lesbaren Pfad mounten und `EZSWM_TOKEN_FILE` setzen. `EZSWM_URL` muss aus dem Container erreichbar sein (etwa über ein gemeinsames Netzwerk oder die Host-Adresse, nicht das `localhost` des Containers). Ein ungesetztes `PORT` gilt nur für den Quellcode-Build oben.

## Gehostetes HTTP

`PORT` aktiviert zustandsloses Streamable HTTP unter `/mcp`. Standardmäßig wird an `127.0.0.1` gebunden. Jede Anfrage benötigt ein Bearer-Client-Secret, auch die Initialisierung. Es gibt keinen anonymen Modus und keinen OAuth-Flow.

**Grenze der Zugangsdaten:** Das Upstream-`EZSWM_TOKEN` bleibt ausschließlich beim MCP-Server. Clients verwenden ein anderes Token aus `EZSWM_MCP_AUTH_TOKEN` (kommagetrennte Allowlist) oder `EZSWM_MCP_AUTH_TOKEN_FILE`. Diese Secrets müssen mit `ezswm_` beginnen. Die aktuelle HTTP-Implementierung vergleicht sie jedoch nur mit einer statischen lokalen Allowlist; Eigentümer, Ablauf und Widerruf werden nicht bei ezSWM geprüft. Zum Entfernen oder Rotieren eines Client-Secrets musst du die Konfiguration ändern und MCP neu starten. Alle zugelassenen Clients teilen Berechtigungen und Aktivitätszuordnung des Upstream-Kontos. Der Widerruf des Upstream-Tokens in ezSWM stoppt App-Aufrufe, nicht die Annahme des separaten HTTP-Secrets. Das Upstream-Token wird nur beim MCP-Start gelesen; wer `EZSWM_TOKEN` oder den Inhalt von `EZSWM_TOKEN_FILE` ersetzt, muss MCP neu starten. API-Tokens wird außerdem der Layout-Template-Dateiexport (`GET /api/layout-templates/{id}/export`) verweigert, wie `/api/export/templates`; übrige Layout-Template-Routen und angemeldete Browser-Sitzungen bleiben unverändert. Verwende stdio, wenn jeder Benutzer seine eigene ezSWM-Identität benötigt.

Beispiel mit beiden Token-Dateien außerhalb des Repositorys:

```sh
EZSWM_URL=https://ezswm.example.com \
EZSWM_TOKEN_FILE=/ABS/secrets/ezswm-api-token \
EZSWM_MCP_AUTH_TOKEN_FILE=/ABS/secrets/ezswm-mcp-client-token \
PORT=3001 \
EZSWM_HTTP_ALLOWED_HOSTS=mcp.example.com,127.0.0.1:3001 \
EZSWM_HTTP_ALLOWED_ORIGINS=https://mcp.example.com \
node /ABS/ezswm/mcp/dist/index.js
```

Terminiere TLS an einem Reverse-Proxy und leite `/mcp` an den Loopback-Listener weiter. Erlaube den tatsächlich weitergeleiteten `Host`-Wert einschließlich Port, falls vorhanden. Unbekannte Hosts liefern 403. Ein vorhandener `Origin`-Header muss zu einem erlaubten URL-Origin passen; fehlt er, gelten weiterhin die übrigen Prüfungen. Diese Regeln sind keine Zusage für Browser-CORS-Unterstützung.

Für einen Bind außerhalb von Loopback sind ein expliziter `HOST` und alle drei Einstellungen nötig: `EZSWM_HTTP_ALLOW_REMOTE_BIND=true`, eine nicht leere `EZSWM_HTTP_ALLOWED_HOSTS`- und eine nicht leere `EZSWM_HTTP_ALLOWED_ORIGINS`-Liste. Den unverschlüsselten Listener niemals direkt in einem nicht vertrauenswürdigen Netz anbieten. SIGINT/SIGTERM leiten das Beenden ein; nach fünf Sekunden gilt ein Prozess-Abbruchlimit.

### Remote-Clients

OpenCode V2 unterstützt eigene Bearer-Header bei deaktiviertem OAuth. Setze `EZSWM_MCP_AUTH_TOKEN` in der Client-Umgebung:

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

Cursor verwendet in `.cursor/mcp.json` eine andere Variablenersetzung:

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

Die Formate folgen den offiziellen Client-Dokumentationen. Echte GUI-Verbindungen und ein realer TLS-Reverse-Proxy wurden hier noch nicht geprüft. Verwende für Claude Desktop das stdio-Beispiel, statt Unterstützung eigener Remote-Header vorauszusetzen.

## Verifikationsstand

Geprüft am 25.10.2026 gegen isolierte Wegwerf-App-Container (Version 0.46.0) und das lokal gebaute MCP-Image, gesteuert mit dem offiziellen MCP-SDK-Client (Host-Node.js 22.23.2; Container mit Node.js 24.22.1):

- stdio (Docker mit `-e PORT=`) und zustandsloses HTTP melden sich als `ezswm-mcp` 0.46.0 und listen genau 41 Werkzeuge (die 18 lesenden und 23 schreibenden unten); `list_sites` lieferte den Test-Standort.
- HTTP: fehlendes und falsches Credential ergeben 401; unbekannter `Host` oder `Origin` ergibt 403.
- Mit einem Admin-Upstream-Token legte `create_vlan` ein VLAN an, `get_vlan`/`list_vlans` lasen dieselbe ID, denselben Namen und dieselbe VLAN-Nummer zurück. Mit einem Viewer-Upstream-Token funktionierte `get_vlan`, während `create_vlan` einen MCP-Fehler mit HTTP 403 lieferte; eine unabhängige Abfrage zeigte kein neues VLAN.
- Nach dem Widerruf des Upstream-App-Tokens (HTTP 204) lieferten die nächsten Aufrufe derselben MCP-Verbindung einen Fehler mit HTTP 401; App und Daten blieben intakt. Das getrennte statische HTTP-Client-Credential wird dadurch nicht widerrufen, nur die Upstream-Aufrufe schlagen fehl.

Nicht verifiziert: die übrigen Schreibwerkzeuge (nur ein VLAN-Create, kein Live-Update/-Delete), zustandsbehaftete Sessions (HTTP ist zustandslos), GUI-Clients wie Claude Desktop, Cursor oder OpenCode, ein TLS-Reverse-Proxy und Docker Compose (Images wurden direkt mit `docker run` gestartet). Eine Registry-Veröffentlichung wird nicht behauptet. Dies ist kein Ergebnis der vollständigen Testsuite.

## Werkzeuge und Fehlerbehebung

Lesende Werkzeuge: `list_sites`, `get_site`, `list_switches`, `get_switch`, `list_vlans`, `get_vlan`, `list_networks`, `get_network`, `list_ip_allocations`, `list_ip_ranges`, `list_lags`, `list_device_types`, `get_settings`, `subnet_info`, `search`, `find_free_ip`, `export_documentation_data`, `list_activity`. Beachte das jeweilige Schema und `more_available`-Hinweise. Gekürzte Ergebnisse sind kein vollständiges Inventar; der erlaubnislistenbasierte Dokumentationsexport ist kein Datenbank-Backup. `list_activity` zeigt ein bereinigtes Aktivitätsprotokoll (Akteur, Aktion, Entität, Undo-Fähigkeit) ohne Rohzustände.

Schreibende Werkzeuge: `create_switch`, `update_switch`, `update_port`, `update_ports`, `create_vlan`, `update_vlan`, `delete_vlan`, `create_network`, `update_network`, `delete_network`, `create_ip_allocation`, `update_ip_allocation`, `delete_ip_allocation`, `create_ip_range`, `update_ip_range`, `delete_ip_range`, `create_lag`, `update_lag`, `delete_lag`, `create_device_type`, `update_device_type`, `undo_activity`, `import_documentation_data`. Destruktive Werkzeuge und `undo_activity` nutzen einen zweiphasigen Vertrag: erst ohne `confirm` eine serverseitige Vorschau, dann `confirm: true` mit dem gelieferten Impact-/Undo-Token. Ein veraltetes Token liefert HTTP 409 mit frischer Vorschau, ohne etwas zu ändern. Standort-Anlegen/Löschen, Switch-Löschen und Kategorie-Löschungen sind bewusst nicht über MCP freigegeben.

`undo_activity` kann eine begrenzte Menge jüngster Änderungen zurücknehmen: VLAN-, Netzwerk-, IP-Zuweisungs- und IP-Range-Aktionen (Anlegen und Ändern) sowie ausschließlich Standort-Änderungen. Das Anlegen einer Entität wird per Guarded-Delete rückgängig gemacht (mit Impact-Vorschau); Änderungen stellen den aufgezeichneten Vorzustand wieder her. Löschvorgänge beliebiger Entitäten werden absichtlich nicht wiederhergestellt. Änderungen erfordern einen vorhandenen, gültigen Vorzustands-Snapshot; ein Änderungseintrag mit fehlendem oder fehlerhaftem Snapshot wird abgelehnt (Anlegen braucht keinen). Alle anderen Aktionen (auch Löschaktionen, Standort anlegen, Switch-, LAG-, Gerätetyp-, Import-, Zugangsdaten- und Einstellungsaktionen) gelten als nicht undo-fähig und werden mit HTTP 422 abgelehnt. Undo ist zweiphasig: zuerst Vorschau, dann Bestätigung mit `expectedUndoToken`; ein veraltetes Token liefert HTTP 409 mit frischer Vorschau. Die Administratorrolle wird bei der Ausführung erneut gelesen; Prüfung der Zustandsbedingung und Schreibvorgang laufen in einer Transaktion, sodass Konflikte ohne Teilwrites abbrechen.

- Startfehler: URL, Token-Datei, Leserechte und versehentlich geerbtes `PORT` prüfen (das Docker-Image setzt `PORT=3000`; für stdio `-e PORT=` übergeben).
- HTTP 401: separates MCP-Client-Secret prüfen. Bei einem Authentifizierungsfehler der App stattdessen das Upstream-Token ersetzen.
- HTTP 403: Host-/Origin-Allowlisten und aktuelle Rolle des App-Kontos prüfen.
- HTTP 406 beim manuellen Test: `Accept: application/json, text/event-stream` mitsenden; MCP-Clients erledigen das selbst.
- Nach vollständiger ezSWM-Wiederherstellung neues Upstream-Token erstellen: Restores widerrufen alle App-API-Tokens. Token-Dateien und Datenbankkopien niemals weitergeben.

Client-Referenzen: [Claude Desktop/lokales MCP](https://modelcontextprotocol.io/docs/develop/connect-local-servers), [Cursor MCP](https://cursor.com/docs/mcp), [OpenCode V2 MCP](https://opencode.ai/v2/docs/mcp-servers).
