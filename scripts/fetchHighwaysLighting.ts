/**
 * Lädt alle beleuchtungsrelevanten Straßen und Wege für Karlsruhe von Overpass
 * und speichert sie als GeoJSON in public/data/highways-lighting.geojson.
 *
 * Ausführen: npm run fetch-highways-lighting
 */

import type { FeatureCollection } from 'geojson';
import { AREA_ID, OUTPUT_DIR } from './config.js';
import { runOverpassQuery, saveGeoJSON, roundGeometry } from './utils.js';

const HIGHWAYS_LIGHTING_QUERY = `
[out:json][timeout:180];
area(${AREA_ID})->.searchArea;
(
  way["highway"~"^(primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|service|pedestrian|footway|path|cycleway|steps|bridleway|track)$"](area.searchArea);
);
out body;
>;
out skel qt;
`;

function stripProperties(fc: FeatureCollection): FeatureCollection {
  const before = fc.features.length;
  fc.features = fc.features.map((f) => ({
    ...f,
    properties: {
      highway: (f.properties as Record<string, unknown>)?.highway ?? null,
      lit:     (f.properties as Record<string, unknown>)?.lit ?? null,
      name:    (f.properties as Record<string, unknown>)?.name ?? null,
    },
  }));
  console.log(`  ✂  Properties auf highway/lit/name reduziert (${before} Features)`);
  return fc;
}

async function main() {
  console.log('💡 Straßenbeleuchtung Karlsruhe — Daten werden geladen\n');
  console.log('[1/1] Highways mit Beleuchtungsattributen...');

  const raw = await runOverpassQuery(HIGHWAYS_LIGHTING_QUERY);
  let geojson = roundGeometry(raw) as FeatureCollection;
  geojson = stripProperties(geojson);
  saveGeoJSON('highways-lighting.geojson', geojson);

  console.log('\n✅ Fertig! Daten in public/data/ gespeichert.');
}

main().catch((err) => {
  console.error('Fataler Fehler:', err);
  process.exit(1);
});
