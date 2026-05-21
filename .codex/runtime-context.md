# Runtime Context

> Diese Datei beschreibt den aktuell erkannten Infrastrukturzustand.
> Sie darf vom Agenten aktualisiert werden.

---

## Docker

Status: UNKNOWN

Zu prüfen:
- Docker installiert?
- Docker Daemon aktiv?
- Benutzerrechte vorhanden?
- Laufende Container?
- Vorhandene Netzwerke?
- Vorhandene Volumes?

---

## Docker Compose

Status: UNKNOWN

Zu prüfen:
- `docker compose`
- `docker-compose`
- vorhandene compose-Dateien
- Multi-stack Struktur

---

## Traefik

Status: UNKNOWN

Zu prüfen:
- laufender Traefik Container
- veröffentlichte Ports
- verwendete Netzwerke
- vorhandene Router-Labels
- TLS/ACME Konfiguration
- gemeinsame Proxy-Netzwerke

---

## Git Repository

Status: UNKNOWN

Zu prüfen:
- Git Repository vorhanden?
- Remote vorhanden?
- Branch-Strategie
- Dirty Working Tree
- Submodule vorhanden?

---

## Services

Noch nicht analysiert.

---

## Known Networks

Noch nicht analysiert.

---

## Known Volumes

Noch nicht analysiert.

---

## Reverse Proxy Routing

Noch nicht analysiert.

---

## Open Questions

- Welche Services laufen produktiv?
- Welche Netzwerke sind shared?
- Welche Domains/Subdomains existieren?
- Welche Compose-Projekte existieren?
- Gibt es gemeinsame Infrastructure-Stacks?
