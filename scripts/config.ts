import * as dotenv from 'node:fs';
import * as path from 'node:path';

// Load .env.local manually for scripts (not using Next.js env loading)
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  try {
    const content = dotenv.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local not found — use defaults
  }
}

loadEnv();

export const OVERPASS_URL =
  process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter';

/** Overpass area ID for Karlsruhe (OSM relation 62518 + 3_600_000_000) */
export const AREA_ID = '3600062518';

/** OSM relation ID for Karlsruhe city boundary */
export const RELATION_ID = '62518';

/** Output directory for GeoJSON files */
export const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data');
