/**
 * Schreibt public/data/meta.json mit dem jüngsten Änderungszeitpunkt aller
 * GeoJSON-Dateien in public/data. Die Karte liest diese Datei aus und zeigt
 * den Datenstand (Monat + Jahr) automatisch an.
 *
 * Ausführen: npm run generate-meta
 */

import { writeDataMeta } from './utils.js';

console.log('🗓  Datenstand wird ermittelt…');
writeDataMeta();
console.log('Fertig.');
