/**
 * Verarbeitet baumkataster.geojson und paths.geojson gegen green-areas.geojson:
 *
 * Bäume: Setzt insideGreenArea: 1 | 0 und in-park: 1 | 0 pro Feature
 * Wege:  Entfernt alle Features, bei denen kein Vertex in einer Grünfläche liegt,
 *        und setzt in-park: 1 | 0 auf den verbleibenden Features
 *
 * Ausführung: npm run process-green-features
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// GeoJSON-Typen (minimale lokale Typen, kein externer Import nötig)
// ---------------------------------------------------------------------------

type Position = [number, number];
type Ring = Position[];

interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

interface PolygonEntry {
  bbox: BBox;
  rings: Ring[]; // rings[0] = outer ring, rings[1..] = holes
}

// ---------------------------------------------------------------------------
// Geometrie-Hilfsfunktionen
// ---------------------------------------------------------------------------

function ringBBox(ring: Ring): BBox {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLng, minLat, maxLng, maxLat };
}

function unionBBox(boxes: BBox[]): BBox {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const b of boxes) {
    if (b.minLng < minLng) minLng = b.minLng;
    if (b.minLat < minLat) minLat = b.minLat;
    if (b.maxLng > maxLng) maxLng = b.maxLng;
    if (b.maxLat > maxLat) maxLat = b.maxLat;
  }
  return { minLng, minLat, maxLng, maxLat };
}

function bboxContainsPoint(bbox: BBox, lng: number, lat: number): boolean {
  return lng >= bbox.minLng && lng <= bbox.maxLng &&
    lat >= bbox.minLat && lat <= bbox.maxLat;
}

/** Ray Casting: prüft ob (lng, lat) innerhalb eines Rings liegt */
function ringContainsPoint(ring: Ring, lng: number, lat: number): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Prüft ob Punkt im Polygon liegt (Außenring innen, alle Löcher außen) */
function polygonContainsPoint(rings: Ring[], lng: number, lat: number): boolean {
  if (!ringContainsPoint(rings[0], lng, lat)) return false;
  for (let i = 1; i < rings.length; i++) {
    if (ringContainsPoint(rings[i], lng, lat)) return false;
  }
  return true;
}

/** Prüft ob mindestens ein PolygonEntry den Punkt enthält */
function anyPolygonContainsPoint(polygons: PolygonEntry[], lng: number, lat: number): boolean {
  for (const p of polygons) {
    if (!bboxContainsPoint(p.bbox, lng, lat)) continue;
    if (polygonContainsPoint(p.rings, lng, lat)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Grünflächen einlesen und in PolygonEntry[] umwandeln
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPolygonEntries(feature: any): PolygonEntry[] {
  const entries: PolygonEntry[] = [];
  const geom = feature.geometry;
  if (!geom) return entries;

  if (geom.type === 'Polygon') {
    const rings: Ring[] = geom.coordinates;
    entries.push({ bbox: unionBBox(rings.map(ringBBox)), rings });
  } else if (geom.type === 'MultiPolygon') {
    for (const polygonCoords of geom.coordinates) {
      const rings: Ring[] = polygonCoords;
      entries.push({ bbox: unionBBox(rings.map(ringBBox)), rings });
    }
  }
  return entries;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isParkFeature(feature: any): boolean {
  return feature?.properties?.leisure === 'park';
}

// ---------------------------------------------------------------------------
// Koordinaten aus beliebiger Geometrie sammeln
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectVertices(geometry: any): Position[] {
  const vertices: Position[] = [];
  if (!geometry) return vertices;

  function recurse(coords: unknown): void {
    if (!Array.isArray(coords) || coords.length === 0) return;
    if (typeof coords[0] === 'number') {
      vertices.push(coords as Position);
    } else {
      for (const sub of coords) recurse(sub);
    }
  }

  recurse(geometry.coordinates);
  return vertices;
}

// ---------------------------------------------------------------------------
// Hilfsfunktion: Datei lesen
// ---------------------------------------------------------------------------

function readGeoJSON(filePath: string): { type: string; features: unknown[] } {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// Hauptprogramm
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

console.log('Lade green-areas.geojson…');
const greenAreasGeoJSON = readGeoJSON(path.join(DATA_DIR, 'green-areas.geojson'));
console.log(`  ${greenAreasGeoJSON.features.length} Grünflächen-Features geladen`);

console.log('Lade playgrounds.geojson…');
const playgroundsGeoJSON = readGeoJSON(path.join(DATA_DIR, 'playgrounds.geojson'));
console.log(`  ${playgroundsGeoJSON.features.length} Spielplatz-Features geladen`);

// Alle Grünflächen- und Spielplatz-Polygone vorbereiten
const greenPolygons: PolygonEntry[] = [];
for (const feature of [...greenAreasGeoJSON.features, ...playgroundsGeoJSON.features]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  greenPolygons.push(...extractPolygonEntries(feature as any));
}
console.log(`  ${greenPolygons.length} Polygone/Teilflächen extrahiert (inkl. Spielplätze)`);

const parkPolygons: PolygonEntry[] = [];
for (const feature of greenAreasGeoJSON.features) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = feature as any;
  if (!isParkFeature(f)) continue;
  parkPolygons.push(...extractPolygonEntries(f));
}
console.log(`  ${parkPolygons.length} Park-Polygone/Teilflächen extrahiert`);

// ---------------------------------------------------------------------------
// 1. Baumkataster verarbeiten
// ---------------------------------------------------------------------------

console.log('\nVerarbeite baumkataster.geojson…');
const treesPath = path.join(DATA_DIR, 'baumkataster.geojson');
const treesGeoJSON = readGeoJSON(treesPath);

let treesInside = 0;
let treesOutside = 0;

for (const feature of treesGeoJSON.features) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = feature as any;
  if (!f.properties || typeof f.properties !== 'object') f.properties = {};
  if (!f.geometry || f.geometry.type !== 'Point') {
    f.properties.insideGreenArea = 0;
    f.properties['in-park'] = 0;
    treesOutside++;
    continue;
  }
  const [lng, lat] = f.geometry.coordinates as [number, number];
  const inside = anyPolygonContainsPoint(greenPolygons, lng, lat) ? 1 : 0;
  const inPark = anyPolygonContainsPoint(parkPolygons, lng, lat) ? 1 : 0;
  f.properties.insideGreenArea = inside;
  f.properties['in-park'] = inPark;
  if (inside) treesInside++; else treesOutside++;
}

console.log(`  ${treesInside} Bäume innerhalb, ${treesOutside} außerhalb von Grünflächen`);
fs.writeFileSync(treesPath, JSON.stringify(treesGeoJSON), 'utf-8');
console.log('  baumkataster.geojson gespeichert');

// ---------------------------------------------------------------------------
// 2. Wege filtern
// ---------------------------------------------------------------------------

console.log('\nVerarbeite paths.geojson…');
const pathsPath = path.join(DATA_DIR, 'paths.geojson');
const pathsGeoJSON = readGeoJSON(pathsPath);

const totalPaths = pathsGeoJSON.features.length;
let pathsKept = 0;

const filteredFeatures = pathsGeoJSON.features.filter((feature) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = feature as any;
  if (!f.properties || typeof f.properties !== 'object') f.properties = {};
  let hasGreenVertex = false;
  let inPark = 0;
  const vertices = collectVertices(f.geometry);

  for (const [lng, lat] of vertices) {
    if (inPark === 0 && anyPolygonContainsPoint(parkPolygons, lng, lat)) {
      inPark = 1;
    }
    if (anyPolygonContainsPoint(greenPolygons, lng, lat)) {
      hasGreenVertex = true;
    }
  }

  if (!hasGreenVertex) return false;
  f.properties['in-park'] = inPark;
  pathsKept++;
  return true;
});

console.log(`  ${pathsKept} von ${totalPaths} Wegen behalten (${totalPaths - pathsKept} entfernt)`);

pathsGeoJSON.features = filteredFeatures;
fs.writeFileSync(pathsPath, JSON.stringify(pathsGeoJSON), 'utf-8');
console.log('  paths.geojson gespeichert');

// ---------------------------------------------------------------------------
// 3. Grünflächen mit in-park markieren
// ---------------------------------------------------------------------------

console.log('\nVerarbeite green-areas.geojson (in-park markieren)…');

let greenAreasInPark = 0;
let greenAreasOutOfPark = 0;

for (const feature of greenAreasGeoJSON.features) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = feature as any;
  if (!f.properties || typeof f.properties !== 'object') f.properties = {};
  if (isParkFeature(f)) {
    f.properties['in-park'] = 1;
    greenAreasInPark++;
    continue;
  }
  const vertices = collectVertices(f.geometry);
  const inPark = vertices.some(([lng, lat]) => anyPolygonContainsPoint(parkPolygons, lng, lat)) ? 1 : 0;
  f.properties['in-park'] = inPark;
  if (inPark) greenAreasInPark++; else greenAreasOutOfPark++;
}

console.log(`  ${greenAreasInPark} Grünflächen-Features in Parks, ${greenAreasOutOfPark} außerhalb`);
fs.writeFileSync(path.join(DATA_DIR, 'green-areas.geojson'), JSON.stringify(greenAreasGeoJSON), 'utf-8');
console.log('  green-areas.geojson gespeichert');

console.log('\nFertig.');
