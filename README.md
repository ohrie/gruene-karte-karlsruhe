# Grüne Karte Karlsruhe

Interaktive Karte für Karlsruhe mit Fokus auf Grün- und Freiraumdaten.

## Was kann die Web-App?

- Stellt Grünflächen, Wasser, Wege, Plätze, Spielplätze, Spielgeräte, Bäume, Sandflächen, Radrouten und Straßenbeleuchtung auf einer Karte dar.
- Lädt GeoJSON-Daten aus `public/data` und rendert sie als thematische Layer (inkl. Labels und Legende) via Overpass.
- Moduswechsler (Parks / Grün / Plätze / Radrouten / Beleuchtung) mit URL-Parameter `?layer=` für direkten Deeplink.
- Zentriert auf Karlsruhe, mit URL-Hash für Zoom/Position im Link.
- Nutzt einen Außenmasken-Layer für klaren Fokus auf das Stadtgebiet.
- Lazy-Loading für große Datensätze (Beleuchtung wird erst beim Wechsel in den Beleuchtungs-Modus geladen).
- Deployment auf GitHub Pages (via `NEXT_PUBLIC_BASE_PATH`).

## Projektstruktur (kurz)

- `src/app`: Next.js App-Router (`layout.tsx`, `page.tsx`, globale Styles).
- `src/components`: Karten-UI (`Map.tsx`) und Client-only Loader (`MapLoader.tsx`).
- `src/lib/layerConfig.ts`: Alle MapLibre-Styles und Layer-Definitionen.
- `public/data`: Alle GeoJSON-Dateien, die direkt in die Karte geladen werden.
- `scripts`: Overpass-Download und Aufbereitung/Anreicherung der Geodaten.
- `public/tmp`: Zwischenstände beim Datenfetch (Cache für Teilabfragen).

## Layer und GeoJSON-Dateien

- `boundary.geojson`: Stadtgrenze Karlsruhe; wird genutzt, um die Außenmaske aufzubauen.
- `green-areas.geojson`: Parks, Gärten, Wälder, Wiesen, Blumenbeete etc.; Layer: `green-areas-fill`, `green-areas-outline`, `park-labels`.
- `water.geojson`: Flüsse, Bäche und Wasserflächen; Layer: `water-line`, `water-fill`, `water-line-labels`, `water-area-labels`.
- `paths.geojson`: Fuß-, Rad- und Nebenwege; Layer: `paths-area-fill`, `paths-line`.
- `squares.geojson`: Benannte Plätze; Layer: `squares-fill`, `squares-outline`, `square-labels`.
- `playgrounds.geojson`: Spielplatzflächen; Layer: `playgrounds-fill`, `playgrounds-outline`, `playground-labels`.
- `playground-equipment.geojson`: Spielgeräte als Punkte (z. B. Schaukel, Rutsche, Tischtennisplatte); Layer: `playground-equipment`, `playground-table-tennis`, `playground-polygon-table-tennis`.
- `sand.geojson`: Sandflächen und Sandkästen (natural=sand, playground=sandpit); Layer: `sand-fill`.
- `baumkataster.geojson`: Baumkataster der Stadt Karlsruhe; Layer: `trees-individual`, `trees-cluster`, `trees-cluster-count`.
- `radrouten.geojson`: Radrouten im Stadtgebiet; Layer: `radrouten-line`, `radrouten-label` (nur im Modus „Radrouten").
- `highways-lighting.geojson`: Straßenbeleuchtungsdaten; Layer: `highways-lit`, `highways-unlit`, `highways-unknown-lit`, `highways-label` (nur im Modus „Beleuchtung", lazy loaded).
- `benches.geojson`: Sitzbänke; Layer vorhanden (`benches`), aktuell in der Karte auskommentiert.
- `outside-mask` (kein eigenes GeoJSON im Repo): Laufzeit-Layer aus `boundary.geojson`, dunkelt alles außerhalb Karlsruhe ab.

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

Radrouten und Straßenbeleuchtung separat:

```bash
npx ts-node scripts/processRadrouten.ts
npx ts-node scripts/fetchHighwaysLighting.ts
```

Anschließend die App normal starten (`npm run dev`).

## Lizenz

Dieses Projekt steht unter der **GNU Affero General Public License v3.0 (AGPL-3.0)**.

Siehe die vollständigen Lizenzbedingungen in der Datei [`LICENSE`](./LICENSE).
