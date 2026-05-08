/**
 * Konvertiert radrouten.json (UTM EPSG:32632) nach public/data/radrouten.geojson (WGS84).
 *
 * Ausführung: npm run process-radrouten
 */

import * as fs from 'fs';
import * as path from 'path';
import proj4 from 'proj4';

// ---------------------------------------------------------------------------
// Projektion
// ---------------------------------------------------------------------------

const UTM32N = '+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs';
const WGS84 = 'EPSG:4326';

function reprojectCoord(coord: [number, number]): [number, number] {
  const [lng, lat] = proj4(UTM32N, WGS84, [coord[0], coord[1]]);
  return [
    Math.round(lng * 1_000_000) / 1_000_000,
    Math.round(lat * 1_000_000) / 1_000_000,
  ];
}

// ---------------------------------------------------------------------------
// GeoJSON-Typen (minimal)
// ---------------------------------------------------------------------------

type Position = [number, number];

interface LineStringGeometry {
  type: 'LineString';
  coordinates: Position[];
}

interface MultiLineStringGeometry {
  type: 'MultiLineString';
  coordinates: Position[][];
}

interface Feature {
  type: 'Feature';
  id?: string | number;
  geometry: LineStringGeometry | MultiLineStringGeometry;
  geometry_name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

// ---------------------------------------------------------------------------
// Hauptprogramm
// ---------------------------------------------------------------------------

const INPUT_PATH = path.join(process.cwd(), 'ka_radnetz.json');
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'data', 'radrouten.geojson');

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Extrahiert alle Routennummern aus ueberoert_name, z.B. "Route 07 - ..." → "7".
 *  Bei mehreren Routen werden sie mit "/" getrennt, z.B. "1/20". */
function extractRoutenNr(ueberoertName: string | null | undefined): string | null {
  if (!ueberoertName) return null;
  const matches = [...ueberoertName.matchAll(/Route\s+(\d+)/g)].map((m) => String(parseInt(m[1], 10)));
  return matches.length > 0 ? matches.join('/') : null;
}

/** Bereinigt verkehrsbedeutung: "3 - Hauptradstrecke" → "Hauptradstrecke" */
function cleanVerkehrsbedeutung(raw: string | null | undefined): string {
  if (!raw) return 'Unbekannt';
  const match = raw.match(/^\d+\s*-\s*(.+)$/);
  if (match) return match[1].trim();
  return raw.trim();
}

// ---------------------------------------------------------------------------
// Hauptprogramm
// ---------------------------------------------------------------------------

console.log('Lese', INPUT_PATH);
const raw = fs.readFileSync(INPUT_PATH, 'utf-8');
const input: FeatureCollection = JSON.parse(raw);

console.log(`${input.features.length} Features gefunden. Reprojizierende Koordinaten…`);

const output: FeatureCollection = {
  type: 'FeatureCollection',
  features: input.features.map((feature) => {
    const geom = feature.geometry;
    let newGeometry: LineStringGeometry | MultiLineStringGeometry;

    if (geom.type === 'LineString') {
      newGeometry = {
        type: 'LineString',
        coordinates: geom.coordinates.map(reprojectCoord),
      };
    } else {
      newGeometry = {
        type: 'MultiLineString',
        coordinates: geom.coordinates.map((ring) => ring.map(reprojectCoord)),
      };
    }

    const props = feature.properties;
    const routenNr = extractRoutenNr(props.ueberoert_name);
    const verkehrsbedeutung = cleanVerkehrsbedeutung(props.verkehrsbedeutung);

    return {
      type: 'Feature',
      properties: {
        abschnitt_id: props.abschnitt_id,
        strasse: props.strasse,
        verkehrsbedeutung,
        ...(routenNr !== null ? { routenNr } : {}),
      },
      geometry: newGeometry,
    };
  }),
};

console.log('Schreibe', OUTPUT_PATH);
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output), 'utf-8');
console.log('Fertig.');
