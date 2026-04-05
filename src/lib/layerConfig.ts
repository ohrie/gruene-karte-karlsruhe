import type { LayerProps } from '@vis.gl/react-maplibre';

// ---------------------------------------------------------------------------
// Farbpalette
// ---------------------------------------------------------------------------

export const COLORS = {
  park: '#2d5a27',
  parkLight: '#3a7a35',
  garden: '#2d5a27',
  meadow: '#7ab648',
  scrub: '#5a8a3e',
  wood: '#3d6b2e',
  grassland: '#8bc34a',
  water: '#4a90d9',
  waterLine: '#3a80c9',
  bench: '#c17f24',
  playground: '#e8a55a',
  playgroundEquipment: '#d4813a',
  square: '#b5c4b1',
  path: '#a8c89a',
  pathArea: '#c5dbb8',
  treeIndividual: '#4a7c3f',
  treeCluster: '#3a6b2f',
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
      10, 0.7,
      16, 0.9,
    ],
  },
};

export const greenAreasOutlineLayer: LayerProps = {
  id: 'green-areas-outline',
  type: 'line',
  paint: {
    'line-color': COLORS.wood,
    'line-width': 0.8,
    'line-opacity': 0.4,
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
  filter: ['==', ['geometry-type'], 'Polygon'],
  paint: {
    'fill-color': COLORS.pathArea,
    'fill-opacity': 0.7,
  },
};

export const pathsLineLayer: LayerProps = {
  id: 'paths-line',
  type: 'line',
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
    'fill-opacity': 0.65,
  },
};

export const squaresOutlineLayer: LayerProps = {
  id: 'squares-outline',
  type: 'line',
  paint: {
    'line-color': '#8fa88c',
    'line-width': 1,
    'line-opacity': 0.5,
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

// ---------------------------------------------------------------------------
// Spielgeräte
// ---------------------------------------------------------------------------

export const playgroundEquipmentLayer: LayerProps = {
  id: 'playground-equipment',
  type: 'circle',
  minzoom: 15,
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
      '#ba68c8', // default
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
// Bäume — geclustert
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
      10, 0.4,
      13, 0.25,
    ],
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      8, 50,
      12, 200,
      18, 500,
      24,
    ],
    'circle-stroke-color': '#2d5a27',
    'circle-stroke-width': 0.5,
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

// Einzelne Bäume (ungeclusterte Punkte)
export const treesIndividualLayer: LayerProps = {
  id: 'trees-individual',
  type: 'circle',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': COLORS.treeIndividual,
    'circle-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      13, 0.3,
      16, 0.65,
      18, 0.8,
    ],
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 2,
      14, 4,
      16, 6,
      18, 9,
    ],
    'circle-stroke-color': '#2d5a27',
    'circle-stroke-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      14, 0,
      16, 0.5,
      18, 1,
    ],
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
