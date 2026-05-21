# Infrastructure Conventions

## General Philosophy

Bestehende Patterns haben Priorität vor neuen Patterns.

Der Agent soll:
- bestehende Strukturen erkennen
- vorhandene Konventionen übernehmen
- konsistent mit bestehender Infrastruktur arbeiten

---

## Docker Conventions

### Container

- sprechende Namen verwenden
- konsistente Naming-Schemes einhalten
- keine zufälligen Containernamen

### Networks

- bestehende Netzwerke bevorzugen
- keine unnötigen neuen Netzwerke erzeugen
- gemeinsame Reverse-Proxy-Netzwerke respektieren

### Volumes

- persistente Daten niemals überschreiben
- bestehende Volume-Struktur respektieren

---

## Docker Compose Conventions

Bevorzugte Struktur:

```yaml
services:
  app:
  database:
  redis:
  proxy:
```

Compose-Dateien zuerst analysieren bevor neue Services ergänzt werden.

---

## Traefik Conventions

### Reverse Proxy

Traefik gilt als zentrale Routing-Instanz.

Der Agent soll:
- bestehende Labels analysieren
- bestehende EntryPoints weiterverwenden
- bestehende Zertifikatsstrategie respektieren
- bestehende Middlewares übernehmen wenn möglich

### Labels

Bestehende Label-Konventionen haben Priorität.

Neue Labels:
- minimal halten
- konsistent benennen
- keine redundanten Regeln erzeugen

---

## Git Conventions

### Commits

- kleine Änderungen bevorzugen
- nachvollziehbare Änderungen
- keine unnötigen Refactors

### Branches

Vor Änderungen:
- aktuelle Branch-Strategie analysieren
- bestehendes Workflow-Modell respektieren

---

## AI Agent Behaviour

Vor jeder Implementierung:

1. Bestehende Lösung suchen
2. Bestehende Patterns prüfen
3. Infrastruktur analysieren
4. Auswirkungen bewerten
5. Erst dann Änderungen durchführen
