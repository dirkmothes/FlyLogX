# FlyLogX

FlyLogX is a digital flight logbook and review management system for drones and aircraft.

## Goals

- digital flight entry
- digital logbook view
- roles for pilot, supervisor, and admin
- aircraft and unit management
- audit log, approval workflow, and exports

## Stack

- Frontend: Next.js + TypeScript
- Backend: FastAPI + Python
- Database: PostgreSQL
- Containerization: Docker Compose

## Repository Structure

- `frontend/` - web UI
- `backend/` - API and business logic
- `docs/` - architecture and ERD

## Development

```bash
docker compose up --build
```

The backend initialization runs Alembic migrations on startup and seeds a demo organization when the database is empty.

Frontend:
- `https://flylogx.tog.wan64.de`

Backend:
- internally via Traefik at `https://flylogx.tog.wan64.de/api`

API documentation:
- `https://flylogx.tog.wan64.de/api/docs` or directly inside the backend container

## Configuration

Example files for local configuration:

- `.env.example`
- `backend/.env.example`
- `frontend/.env.example`

Runtime data, exports, uploads, and local database files are excluded via `.gitignore` and are not versioned.

## Traefik

FlyLogX is prepared to run behind the existing Traefik instance.

- UI: `flylogx.tog.wan64.de`
- API: `flylogx.tog.wan64.de/api`
- TLS: via the Traefik cert resolver `production`
