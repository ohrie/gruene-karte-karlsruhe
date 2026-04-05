import osmtogeojson from 'osmtogeojson';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FeatureCollection, Feature, GeoJsonProperties, Position } from 'geojson';
import { OVERPASS_URL, OUTPUT_DIR } from './config.js';

// ---------------------------------------------------------------------------
// Overpass
// ---------------------------------------------------------------------------

export async function runOverpassQuery(query: string): Promise<FeatureCollection> {
  console.log('  → Sende Overpass-Query...');
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Overpass-Fehler ${res.status}: ${text.slice(0, 500)}`);
  }
  const osm = await res.json();
  const geojson = osmtogeojson(osm) as FeatureCollection;
  console.log(`  ✓ ${geojson.features.length} Features erhalten`);
  return geojson;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// GeoJSON speichern
// ---------------------------------------------------------------------------

export function saveGeoJSON(filename: string, data: FeatureCollection): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const out = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(out, JSON.stringify(data));
  const bytes = fs.statSync(out).size;
  console.log(`  ✓ Gespeichert: ${filename} (${(bytes / 1024).toFixed(0)} KB)`);
}

// ---------------------------------------------------------------------------
// Koordinaten runden (5 Dezimalstellen ≈ 1m Präzision)
// ---------------------------------------------------------------------------

function roundPosition(pos: Position): Position {
  return pos.map((v) => Math.round(v * 1e5) / 1e5) as Position;
}

// Rekursiv: Position[] | Position[][] | Position[][][] usw.
type NestedPositions = Position | NestedPositions[];

function roundCoords(coords: NestedPositions): NestedPositions {
  if (typeof coords[0] === 'number') return roundPosition(coords as Position);
  return (coords as NestedPositions[]).map(roundCoords);
}

export function roundGeometry(fc: FeatureCollection): FeatureCollection {
  const rounded = JSON.parse(JSON.stringify(fc)) as FeatureCollection;
  for (const f of rounded.features) {
    if (!f.geometry) continue;
    const geom = f.geometry as { coordinates?: NestedPositions };
    if (geom.coordinates !== undefined) {
      geom.coordinates = roundCoords(geom.coordinates);
    }
  }
  return rounded;
}

// ---------------------------------------------------------------------------
// Deterministische Baumgröße
// ---------------------------------------------------------------------------

function deterministicDiameter(id: number): number {
  // Knuth multiplicative hash — deterministisch, kein Seed nötig
  const hash = ((id * 2654435761) >>> 0) % 1000;
  return 3 + (hash / 1000) * 12; // 3–15m
}

export function computeTreeDiameter(props: GeoJsonProperties, rawId: string | number): number {
  const id =
    typeof rawId === 'string'
      ? parseInt(rawId.replace(/^(node|way|relation)\//, ''), 10)
      : rawId;

  if (props) {
    if (props['diameter']) {
      const d = parseFloat(props['diameter']);
      if (!isNaN(d) && d > 0) return d;
    }
    if (props['diameter_crown']) {
      const d = parseFloat(props['diameter_crown']);
      if (!isNaN(d) && d > 0) return d;
    }
    if (props['circumference']) {
      const c = parseFloat(props['circumference']);
      if (!isNaN(c) && c > 0) return c / Math.PI;
    }
  }
  return deterministicDiameter(isNaN(id) ? 0 : id);
}

export function processTreeDiameters(fc: FeatureCollection): FeatureCollection {
  return {
    ...fc,
    features: fc.features.map((f: Feature) => ({
      ...f,
      properties: {
        ...f.properties,
        computed_diameter: computeTreeDiameter(f.properties, f.id ?? 0),
      },
    })),
  };
}
