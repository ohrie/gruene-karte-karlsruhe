# Grüne Karte Karlsruhe

Interaktive Karte für Karlsruhe mit Fokus auf Grün- und Freiraumdaten.

## Was kann die Web-App?

- Stellt Grünflächen, Wasser, Wege, Plätze, Spielplätze, Spielgeräte und Bäume auf einer Karte dar.
- Lädt GeoJSON-Daten aus `public/data` und rendert sie als thematische Layer (inkl. Labels und Legende) via Overpass.
- Zentriert auf Karlsruhe, mit URL-Hash für Zoom/Position im Link.
- Nutzt einen Außenmasken-Layer für klaren Fokus auf das Stadtgebiet.

## Setup

Voraussetzung: Node.js (empfohlen: aktuelle LTS-Version)

```bash
npm install
npm run dev
```

Danach im Browser öffnen:

- http://localhost:3000

## Daten aktualisieren (optional)

Die Daten sind bereits im Projekt enthalten. Für ein neues Update aus Overpass:

```bash
npm run fetch-data
npm run process-green-features
```

Anschließend die App normal starten (`npm run dev`).
