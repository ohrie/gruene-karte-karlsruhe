import type { LayerProps } from '@vis.gl/react-maplibre';

// ---------------------------------------------------------------------------
// Farbpalette — hell & freundlich
// ---------------------------------------------------------------------------

export const COLORS = {
  park: '#c8eaad',           // helles Wiesengrün
  parkLight: '#d4f0bc',
  garden: '#c8eaad',
  meadow: '#7ec453',         // mittleres Grün, dunkler als Park
  scrub: '#6aaa40',
  wood: '#4a8830',
  grassland: '#80c255',
  water: '#7ec8f5',          // helles Blau
  waterLine: '#5ab8f0',
  bench: '#d4922e',
  playground: '#f0b870',
  playgroundEquipment: '#e09050',
  square: '#c0aed8',         // gedämpftes Lavendel/Lila
  path: '#98c468',           // abgestimmtes Grün – dunkler & gesättigter als Park
  pathArea: '#b2d88a',       // helles Grün – harmoniert mit Park/Wiese
  treeIndividual: '#7aaa3a', // olivgrün – dezenter, leicht gelblich
  treeCluster: '#5a8a28',
  outsideMask: 'rgba(20, 20, 20, 0.55)',
} as const;

// ---------------------------------------------------------------------------
// Grünflächen
// ---------------------------------------------------------------------------

export const greenAreasFillLayer: LayerProps = {
  id: 'green-areas-fill',
  type: 'fill',
  paint: {
    'fill-color': [
      'case',
      ['in', ['get', 'leisure'], ['literal', ['park', 'garden', 'nature_reserve']]],
      COLORS.park,
      ['in', ['get', 'landuse'], ['literal', ['forest']]],
      COLORS.wood,
      ['in', ['get', 'natural'], ['literal', ['wood']]],
      COLORS.wood,
      ['in', ['get', 'natural'], ['literal', ['scrub', 'heath']]],
      COLORS.scrub,
      ['in', ['get', 'natural'], ['literal', ['grassland', 'fell']]],
      COLORS.grassland,
      ['in', ['get', 'landuse'], ['literal', ['meadow', 'grass', 'village_green', 'recreation_ground']]],
      COLORS.meadow,
      COLORS.park,
    ],
    'fill-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 0.75,
      16, 0.95,
    ],
  },
};

export const greenAreasOutlineLayer: LayerProps = {
  id: 'green-areas-outline',
  type: 'line',
  paint: {
    'line-color': '#6aaa40',
    'line-width': 0.8,
    'line-opacity': 0.35,
  },
};

// ---------------------------------------------------------------------------
// Park-Labels
// ---------------------------------------------------------------------------

export const parkLabelsLayer: LayerProps = {
  id: 'park-labels',
  type: 'symbol',
  minzoom: 13,
  filter: [
    'all',
    ['in', ['get', 'leisure'], ['literal', ['park', 'garden', 'nature_reserve']]],
    ['has', 'name'],
  ],
  layout: {
    'text-field': ['get', 'name'],
    'text-font': ['Noto Sans Regular'],
    'text-size': [
      'interpolate', ['linear'], ['zoom'],
      13, 10,
      15, 13,
      17, 16,
    ],
    'text-anchor': 'center',
    'text-max-width': 10,
    'text-padding': 20,
    'symbol-placement': 'point',
  },
  paint: {
    'text-color': '#2d6a1a',
    'text-halo-color': 'rgba(220, 245, 200, 0.9)',
    'text-halo-width': 1.5,
  },
};

// ---------------------------------------------------------------------------
// Wasser
// ---------------------------------------------------------------------------

export const waterFillLayer: LayerProps = {
  id: 'water-fill',
  type: 'fill',
  filter: ['==', ['geometry-type'], 'Polygon'],
  paint: {
    'fill-color': COLORS.water,
    'fill-opacity': 0.8,
  },
};

export const waterLineLayer: LayerProps = {
  id: 'water-line',
  type: 'line',
  filter: ['==', ['geometry-type'], 'LineString'],
  paint: {
    'line-color': COLORS.waterLine,
    'line-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 1,
      14, 3,
      18, 8,
    ],
    'line-opacity': 0.85,
  },
};

// ---------------------------------------------------------------------------
// Wege
// ---------------------------------------------------------------------------

export const pathsAreaFillLayer: LayerProps = {
  id: 'paths-area-fill',
  type: 'fill',
  minzoom: 14,
  filter: ['==', ['geometry-type'], 'Polygon'],
  paint: {
    'fill-color': COLORS.pathArea,
    'fill-opacity': 0.7,
  },
};

export const pathsLineLayer: LayerProps = {
  id: 'paths-line',
  type: 'line',
  minzoom: 14,
  filter: ['==', ['geometry-type'], 'LineString'],
  paint: {
    'line-color': COLORS.path,
    'line-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, [
        'match',
        ['get', 'highway'],
        ['pedestrian', 'footway', 'path'], 0.5,
        ['cycleway', 'bridleway'], 0.8,
        ['steps'], 0.5,
        ['track'], 1,
        0.5,
      ],
      14, [
        'match',
        ['get', 'highway'],
        ['pedestrian', 'footway', 'path'], 2,
        ['cycleway', 'bridleway'], 2.5,
        ['steps'], 1.5,
        ['track'], 3,
        1.5,
      ],
      18, [
        'match',
        ['get', 'highway'],
        ['pedestrian', 'footway', 'path'], 5,
        ['cycleway', 'bridleway'], 6,
        ['steps'], 3,
        ['track'], 8,
        4,
      ],
    ],
    'line-opacity': 0.75,
  },
};

// ---------------------------------------------------------------------------
// Plätze
// ---------------------------------------------------------------------------

export const squaresFillLayer: LayerProps = {
  id: 'squares-fill',
  type: 'fill',
  paint: {
    'fill-color': COLORS.square,
    'fill-opacity': 0.6,
  },
};

export const squaresOutlineLayer: LayerProps = {
  id: 'squares-outline',
  type: 'line',
  paint: {
    'line-color': '#9080b8',
    'line-width': 1.2,
    'line-opacity': 0.6,
  },
};

export const squareLabelsLayer: LayerProps = {
  id: 'square-labels',
  type: 'symbol',
  minzoom: 14,
  filter: ['has', 'name'],
  layout: {
    'text-field': ['get', 'name'],
    'text-font': ['Noto Sans Regular'],
    'text-size': [
      'interpolate', ['linear'], ['zoom'],
      14, 9,
      16, 12,
      18, 15,
    ],
    'text-anchor': 'center',
    'text-max-width': 8,
    'text-padding': 15,
    'symbol-placement': 'point',
  },
  paint: {
    'text-color': '#4a3470',
    'text-halo-color': 'rgba(240, 235, 250, 0.9)',
    'text-halo-width': 1.5,
  },
};

// ---------------------------------------------------------------------------
// Spielplätze
// ---------------------------------------------------------------------------

export const playgroundsFillLayer: LayerProps = {
  id: 'playgrounds-fill',
  type: 'fill',
  paint: {
    'fill-color': COLORS.playground,
    'fill-opacity': 0.55,
  },
};

export const playgroundsOutlineLayer: LayerProps = {
  id: 'playgrounds-outline',
  type: 'line',
  paint: {
    'line-color': '#c07830',
    'line-width': 1,
    'line-opacity': 0.6,
  },
};

export const playgroundLabelsLayer: LayerProps = {
  id: 'playground-labels',
  type: 'symbol',
  minzoom: 16,
  filter: ['has', 'name'],
  layout: {
    'text-field': ['get', 'name'],
    'text-font': ['Noto Sans Regular'],
    'text-size': [
      'interpolate', ['linear'], ['zoom'],
      16, 10,
      18, 13,
    ],
    'text-anchor': 'center',
    'text-max-width': 8,
    'text-padding': 10,
    'symbol-placement': 'point',
  },
  paint: {
    'text-color': '#c07830',
    'text-halo-color': 'rgba(255, 240, 210, 0.9)',
    'text-halo-width': 1.5,
  },
};

// ---------------------------------------------------------------------------
// Spielgeräte
// ---------------------------------------------------------------------------

export const playgroundEquipmentLayer: LayerProps = {
  id: 'playground-equipment',
  type: 'circle',
  minzoom: 17,
  paint: {
    'circle-color': [
      'match',
      ['get', 'playground'],
      'swing', '#e57373',
      'slide', '#ffb74d',
      'climbing_frame', '#81c784',
      'sandpit', '#fff176',
      'springy', '#f06292',
      'roundabout', '#64b5f6',
      '#ba68c8',
    ],
    'circle-radius': 4,
    'circle-stroke-color': '#fff',
    'circle-stroke-width': 1,
    'circle-opacity': 0.9,
  },
};

// ---------------------------------------------------------------------------
// Sitzbänke
// ---------------------------------------------------------------------------

export const benchesLayer: LayerProps = {
  id: 'benches',
  type: 'circle',
  minzoom: 15,
  paint: {
    'circle-color': COLORS.bench,
    'circle-radius': 3,
    'circle-stroke-color': '#fff',
    'circle-stroke-width': 1,
    'circle-opacity': 0.85,
  },
};

// ---------------------------------------------------------------------------
// Bäume — Einzelbäume
// Zufällige Farbvariation via Feature-ID (Pseudo-Zufall, kein Netzwerk-Request)
// ---------------------------------------------------------------------------

export const treesIndividualLayer: LayerProps = {
  id: 'trees-individual',
  type: 'circle',
  minzoom: 14,
  paint: {
    // Bäume innerhalb von Grünflächen: bisherige Olivgrün-Töne
    // Bäume außerhalb: helle, gedämpfte Grüntöne (Fokus bleibt auf Grünflächen)
    'circle-color': [
      'case',
      ['==', ['get', 'insideGreenArea'], 1],
      ['match',
        ['%', ['to-number', ['get', 'LFDBNR'], 0], 6],
        0, '#7aaa3a',
        1, '#8ab840',
        2, '#6a9e30',
        3, '#90c045',
        4, '#7db535',
        '#82b23c', // 5 + default
      ],
      ['match',
        ['%', ['to-number', ['get', 'LFDBNR'], 0], 6],
        0, '#b8d498',
        1, '#c2da9e',
        2, '#aece90',
        3, '#cce6a6',
        4, '#b6d294',
        '#bcd89a', // 5 + default
      ],
    ],
    'circle-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      14, 0.0,
      15, ['case', ['==', ['get', 'insideGreenArea'], 1], 0.25, 0.15],
      16, ['case', ['==', ['get', 'insideGreenArea'], 1], 0.55, 0.30],
      17, ['case', ['==', ['get', 'insideGreenArea'], 1], 0.75, 0.45],
      18, ['case', ['==', ['get', 'insideGreenArea'], 1], 0.9, 0.55],
    ],
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      14, 1,
      15, 1.5,
      16, 3,
      17, 6,
      18, 10,
      20, 18,
    ],
    'circle-stroke-width': 0,
  },
};

// ---------------------------------------------------------------------------
// Bäume — geclustert (nur für Source mit cluster:true benötigt)
// ---------------------------------------------------------------------------

export const treesClusterLayer: LayerProps = {
  id: 'trees-cluster',
  type: 'circle',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': COLORS.treeCluster,
    'circle-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 0.45,
      13, 0.3,
    ],
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      8, 50,
      12, 200,
      18, 500,
      24,
    ],
    'circle-stroke-width': 0,
  },
};

export const treesClusterCountLayer: LayerProps = {
  id: 'trees-cluster-count',
  type: 'symbol',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['Noto Sans Regular'],
    'text-size': 10,
  },
  paint: {
    'text-color': '#fff',
    'text-halo-color': COLORS.treeCluster,
    'text-halo-width': 1,
  },
};

// ---------------------------------------------------------------------------
// Wasser-Labels
// ---------------------------------------------------------------------------

// Flüsse (LineString) — Text folgt der Linie
export const waterLineLabelsLayer: LayerProps = {
  id: 'water-line-labels',
  type: 'symbol',
  minzoom: 13,
  filter: ['all', ['==', ['geometry-type'], 'LineString'], ['has', 'name']],
  layout: {
    'text-field': ['get', 'name'],
    'text-font': ['Noto Sans Regular'],
    'text-size': ['interpolate', ['linear'], ['zoom'], 13, 9, 16, 13],
    'text-max-width': 6,
    'symbol-placement': 'line',
    'text-pitch-alignment': 'viewport',
  },
  paint: {
    'text-color': '#1a6090',
    'text-halo-color': 'rgba(200, 235, 255, 0.9)',
    'text-halo-width': 1.5,
  },
};

// Seen / Wasserflächen (Polygon) — Text zentral
export const waterAreaLabelsLayer: LayerProps = {
  id: 'water-area-labels',
  type: 'symbol',
  minzoom: 13,
  filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['has', 'name']],
  layout: {
    'text-field': ['get', 'name'],
    'text-font': ['Noto Sans Regular'],
    'text-size': ['interpolate', ['linear'], ['zoom'], 13, 9, 16, 14],
    'text-anchor': 'center',
    'text-max-width': 8,
    'text-padding': 10,
    'symbol-placement': 'point',
  },
  paint: {
    'text-color': '#1a6090',
    'text-halo-color': 'rgba(200, 235, 255, 0.9)',
    'text-halo-width': 1.5,
  },
};

// ---------------------------------------------------------------------------
// Außenmaske (Bereich außerhalb Karlsruhe)
// ---------------------------------------------------------------------------

export const outsideMaskLayer: LayerProps = {
  id: 'outside-mask',
  type: 'fill',
  paint: {
    'fill-color': '#101a10',
    'fill-opacity': 0.55,
  },
};
