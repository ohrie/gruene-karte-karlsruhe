/**
 * Lädt alle Geodaten für die Grünkarte Karlsruhe von Overpass herunter
 * und speichert sie als GeoJSON in public/data/.
 *
 * Ausführen: npm run fetch-data
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { AREA_ID, RELATION_ID, OUTPUT_DIR } from './config.js';
import {
  runOverpassQuery,
  saveGeoJSON,
  delay,
  roundGeometry,
  processTreeDiameters,
} from './utils.js';

function fileExists(filename: string): boolean {
  return fs.existsSync(path.join(OUTPUT_DIR, filename));
}

// ---------------------------------------------------------------------------
// Overpass-Queries
// ---------------------------------------------------------------------------

const BOUNDARY_QUERY = `
[out:json][timeout:60];
relation(${RELATION_ID});
out geom;
`;

// Grünflächen aufgeteilt in 3 kleinere Queries um Overpass-Timeout (504) zu vermeiden
const GREEN_AREAS_PARKS_QUERY = `
[out:json][timeout:90];
area(${AREA_ID})->.searchArea;
(
  way["leisure"="park"](area.searchArea);
  relation["leisure"="park"](area.searchArea);
  way["leisure"="nature_reserve"](area.searchArea);
  relation["leisure"="nature_reserve"](area.searchArea);
);
out body;
>;
out skel qt;
`;

const GREEN_AREAS_FOREST_QUERY = `
[out:json][timeout:90];
area(${AREA_ID})->.searchArea;
(
  way["landuse"="forest"](area.searchArea);
  relation["landuse"="forest"](area.searchArea);
  way["natural"="wood"](area.searchArea);
  relation["natural"="wood"](area.searchArea);
);
out body;
>;
out skel qt;
`;

const GREEN_AREAS_GROUND_QUERY = `
[out:json][timeout:90];
area(${AREA_ID})->.searchArea;
(
  way["landuse"="meadow"](area.searchArea);
  way["landuse"="grass"](area.searchArea);
  way["landuse"="village_green"](area.searchArea);
  way["landuse"="recreation_ground"](area.searchArea);
  way["natural"="scrub"](area.searchArea);
  way["natural"="heath"](area.searchArea);
  way["natural"="grassland"](area.searchArea);
  way["natural"="fell"](area.searchArea);
);
out body;
>;
out skel qt;
`;

const WATER_QUERY = `
[out:json][timeout:120];
area(${AREA_ID})->.searchArea;
(
  way["natural"="water"](area.searchArea);
  relation["natural"="water"](area.searchArea);
  way["waterway"="riverbank"](area.searchArea);
  relation["waterway"="riverbank"](area.searchArea);
  way["landuse"="basin"](area.searchArea);
  way["landuse"="reservoir"](area.searchArea);
  way["leisure"="swimming_pool"](area.searchArea);
  way["waterway"~"^(river|stream|canal|ditch)$"](area.searchArea);
);
out body;
>;
out skel qt;
`;

const TREES_QUERY = `
[out:json][timeout:120];
area(${AREA_ID})->.searchArea;
node["natural"="tree"](area.searchArea);
out body;
`;

const PATHS_QUERY = `
[out:json][timeout:180];
area(${AREA_ID})->.searchArea;
(
  way["area:highway"](area.searchArea);
  way["highway"]["area"="yes"](area.searchArea);
  way["highway"~"^(footway|path|cycleway|pedestrian|steps|bridleway|track)$"](area.searchArea);
);
out body;
>;
out skel qt;
`;

const BENCHES_QUERY = `
[out:json][timeout:60];
area(${AREA_ID})->.searchArea;
node["amenity"="bench"](area.searchArea);
out body;
`;

const PLAYGROUNDS_QUERY = `
[out:json][timeout:60];
area(${AREA_ID})->.searchArea;
(
  way["leisure"="playground"](area.searchArea);
  relation["leisure"="playground"](area.searchArea);
);
out body;
>;
out skel qt;
`;

const PLAYGROUND_EQUIPMENT_QUERY = `
[out:json][timeout:60];
area(${AREA_ID})->.searchArea;
node["playground"](area.searchArea);
out body;
`;

const SQUARES_QUERY = `
[out:json][timeout:60];
area(${AREA_ID})->.searchArea;
(
  way["place"="square"](area.searchArea);
  relation["place"="square"](area.searchArea);
);
out body;
>;
out skel qt;
`;

// ---------------------------------------------------------------------------
// Hauptprogramm
// ---------------------------------------------------------------------------

type QueryEntry = {
  name: string;
  filename: string;
  /** Ein oder mehrere Overpass-Queries — bei mehreren werden die Ergebnisse zusammengeführt */
  query: string | string[];
  postProcess?: (fc: ReturnType<typeof roundGeometry>) => ReturnType<typeof roundGeometry>;
};

async function main() {
  console.log('🌿 Grünkarte Karlsruhe — Daten werden geladen\n');

  const queries: QueryEntry[] = [
    { name: 'Stadtgrenze', filename: 'boundary.geojson', query: BOUNDARY_QUERY },
    {
      name: 'Grünflächen',
      filename: 'green-areas.geojson',
      query: [GREEN_AREAS_PARKS_QUERY, GREEN_AREAS_FOREST_QUERY, GREEN_AREAS_GROUND_QUERY],
    },
    { name: 'Wasser', filename: 'water.geojson', query: WATER_QUERY },
    {
      name: 'Bäume',
      filename: 'trees.geojson',
      query: TREES_QUERY,
      postProcess: processTreeDiameters,
    },
    { name: 'Wege', filename: 'paths.geojson', query: PATHS_QUERY },
    { name: 'Sitzbänke', filename: 'benches.geojson', query: BENCHES_QUERY },
    { name: 'Spielplätze', filename: 'playgrounds.geojson', query: PLAYGROUNDS_QUERY },
    {
      name: 'Spielgeräte',
      filename: 'playground-equipment.geojson',
      query: PLAYGROUND_EQUIPMENT_QUERY,
    },
    { name: 'Plätze', filename: 'squares.geojson', query: SQUARES_QUERY },
  ];

  const missing = queries.filter(({ filename }) => !fileExists(filename));
  const skipped = queries.length - missing.length;
  if (skipped > 0) {
    console.log(`⏭  ${skipped} Datei(en) bereits vorhanden, werden übersprungen.\n`);
  }
  if (missing.length === 0) {
    console.log('✅ Alle Dateien vorhanden. Nichts zu tun.');
    return;
  }

  for (let i = 0; i < missing.length; i++) {
    const { name, filename, query, postProcess } = missing[i];
    console.log(`[${i + 1}/${missing.length}] ${name}...`);

    try {
      const parts = Array.isArray(query) ? query : [query];
      const results = await Promise.resolve().then(async () => {
        const collected = [];
        for (let p = 0; p < parts.length; p++) {
          if (p > 0) await delay(3000);
          console.log(`  → Teil ${p + 1}/${parts.length}...`);
          collected.push(await runOverpassQuery(parts[p]));
        }
        return collected;
      });
      let geojson = results.length === 1
        ? results[0]
        : { type: 'FeatureCollection' as const, features: results.flatMap((r) => r.features) };
      geojson = roundGeometry(geojson);
      if (postProcess) geojson = postProcess(geojson);
      saveGeoJSON(filename, geojson);
    } catch (err) {
      console.error(`  ✗ Fehler bei "${name}":`, err);
    }

    // Overpass-Rate-Limit: 2 Slots → zwischen Requests warten
    if (i < missing.length - 1) {
      console.log('  ⏳ 3s Pause...\n');
      await delay(3000);
    }
  }

  console.log('\n✅ Fertig! Alle Daten in public/data/ gespeichert.');
}

main().catch((err) => {
  console.error('Fataler Fehler:', err);
  process.exit(1);
});
