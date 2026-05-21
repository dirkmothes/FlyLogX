# Project Context

## Environment

Dieses Projekt läuft auf einem Linux-Server und verwendet containerisierte Services.

Die Infrastruktur basiert primär auf:

- Docker
- Docker Compose
- Traefik Reverse Proxy
- Git-basierter Versionsverwaltung

Der AI-Agent soll davon ausgehen, dass:
- mehrere Services parallel betrieben werden können
- bestehende Container produktiv genutzt werden
- Routing zentral über Traefik erfolgt
- Services über Docker-Netzwerke verbunden sind
- Infrastruktur bereits gewachsene Strukturen enthält

---

## Core Principles

Der Agent soll:

- bestehende Architektur respektieren
- vorhandene Konventionen übernehmen
- bestehende Netzwerke weiterverwenden
- vorhandene Traefik-Konfigurationen berücksichtigen
- Infrastruktur zuerst analysieren bevor Änderungen erfolgen
- konsistente Lösungen bevorzugen

---

## Deployment Philosophy

Read-first, modify-second.

Vor jeder Änderung:
1. Bestehende Struktur analysieren
2. Compose-Dateien prüfen
3. Netzwerke prüfen
4. Traefik-Labels prüfen
5. Vorhandene Service-Muster prüfen

---

## Infrastructure Assumptions

Mögliche Bestandteile der Umgebung:

- mehrere Compose-Projekte
- gemeinsame Reverse-Proxy-Struktur
- gemeinsame Docker-Netzwerke
- bestehende Volumes
- produktive Container
- persistente Datenhaltung

Der Agent darf niemals destruktive Änderungen ohne explizite Freigabe durchführen.

---

## Security Rules

Verboten ohne explizite Anweisung:

- docker system prune
- Container löschen
- Volumes löschen
- Netzwerke löschen
- produktive Compose-Stacks überschreiben
- Secrets ausgeben
- `.env` Inhalte ausgeben

Falls `.env` Dateien existieren:
- nur Existenz erwähnen
- niemals Inhalte ausgeben

---

## Expected Workflow

1. Umgebung analysieren
2. Infrastruktur verstehen
3. Bestehende Konventionen erkennen
4. Änderungen planen
5. Erst danach implementieren

---

## Git Expectations

Vor Änderungen:

- git status prüfen
- bestehende Branch-Struktur prüfen
- bestehende Konventionen erkennen
- unnötige Formatierungsänderungen vermeiden

Der Agent soll möglichst kleine und nachvollziehbare Änderungen erzeugen.
