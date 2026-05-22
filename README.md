# FlyLogX

FlyLogX ist ein digitales Flugzeitennachweis- und Prüfverwaltungssystem für Drohnen und Luftfahrzeuge.

## Zielbild

- digitale Flugerfassung
- digitale Nachweisheft-Ansicht
- Rollen für Pilot, Vorgesetzten und Admin
- Luftfahrzeug- und Einheitenverwaltung
- Audit-Log, Freigabe-Workflow und Exporte

## Stack

- Frontend: Next.js + TypeScript
- Backend: FastAPI + Python
- Datenbank: PostgreSQL
- Container: Docker Compose

## Repo-Struktur

- `frontend/` - Weboberfläche
- `backend/` - API und Fachlogik
- `docs/` - Architektur und ERD

## Entwicklung

```bash
docker compose up --build
```

Die Backend-Initialisierung führt beim Start die Alembic-Migrationen aus und seedet eine Demo-Organisation, wenn die Datenbank leer ist.

Frontend:
- `https://flylogx.tog.wan64.de`

Backend:
- intern über Traefik unter `https://flylogx.tog.wan64.de/api`

API-Dokumentation:
- `https://flylogx.tog.wan64.de/api/docs` oder direkt intern im Backend-Container

## Konfiguration

Beispieldateien für lokale Konfiguration:

- `.env.example`
- `backend/.env.example`
- `frontend/.env.example`

Laufzeitdaten, Exporte, Uploads und lokale Datenbankdateien sind per `.gitignore` ausgeschlossen und werden nicht versioniert.

## Traefik

FlyLogX ist für den Betrieb hinter dem vorhandenen Traefik vorbereitet.

- UI: `flylogx.tog.wan64.de`
- API: `flylogx.tog.wan64.de/api`
- TLS: über den Traefik-Certresolver `production`
