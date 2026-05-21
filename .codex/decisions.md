# Architecture Decisions

## ADR-0001
### Docker-Based Infrastructure

Die Infrastruktur basiert primär auf Docker und Docker Compose.

Konsequenzen:
- Services sollen containerisiert bleiben
- Compose-basierte Deployments bevorzugen
- Infrastrukturänderungen Compose-kompatibel halten

---

## ADR-0002
### Traefik as Central Reverse Proxy

Traefik wird als zentrale Reverse-Proxy-Instanz betrachtet.

Konsequenzen:
- neue Services sollen Traefik-kompatibel integriert werden
- bestehende Routing-Strukturen respektieren
- bestehende Netzwerke bevorzugen

---

## ADR-0003
### Infrastructure Preservation

Bestehende Infrastruktur hat Priorität vor Neuaufbau.

Konsequenzen:
- bestehende Container nicht unnötig ersetzen
- bestehende Netzwerke weiterverwenden
- bestehende Volumes respektieren

---

## ADR-0004
### Read-First Workflow

Analyse vor Änderung.

Konsequenzen:
- zuerst Infrastruktur analysieren
- bestehende Konfiguration verstehen
- erst danach Änderungen durchführen

---

## ADR-0005
### Git-Centric Workflow

Alle Änderungen sollen Git-kompatibel und nachvollziehbar bleiben.

Konsequenzen:
- kleine Änderungen bevorzugen
- minimale Diffs erzeugen
- bestehende Struktur respektieren
