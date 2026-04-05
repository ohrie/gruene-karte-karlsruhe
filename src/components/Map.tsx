'use client';

import { useEffect, useState, useCallback } from 'react';
import { Map, Source, Layer } from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Feature, Polygon, MultiPolygon, Position } from 'geojson';

import {
  greenAreasFillLayer,
  greenAreasOutlineLayer,
  parkLabelsLayer,
  waterFillLayer,
  waterLineLayer,
  waterLineLabelsLayer,
  waterAreaLabelsLayer,
  pathsAreaFillLayer,
  pathsLineLayer,
  squaresFillLayer,
  squaresOutlineLayer,
  squareLabelsLayer,
  playgroundsFillLayer,
  playgroundsOutlineLayer,
  playgroundEquipmentLayer,
  treesIndividualLayer,
  outsideMaskLayer,
} from '@/lib/layerConfig';

// ---------------------------------------------------------------------------
// Karlsruhe Mittelpunkt
// ---------------------------------------------------------------------------

const KA_CENTER: [number, number] = [8.4037, 49.0069];
const KA_ZOOM = 13;

// ---------------------------------------------------------------------------
// Außenmaske aufbauen
// ---------------------------------------------------------------------------

function buildOutsideMask(boundaryFeature: Feature): Feature<Polygon> {
  // GeoJSON-Weltbbox als äußerer Ring (counter-clockwise)
  const worldRing: Position[] = [
    [-180, -90],
    [-180, 90],
    [180, 90],
    [180, -90],
    [-180, -90],
  ];

  const geom = boundaryFeature.geometry as Polygon | MultiPolygon;

  let outerRing: Position[];
  if (geom.type === 'Polygon') {
    outerRing = geom.coordinates[0];
  } else {
    // MultiPolygon → größtes Polygon wählen
    outerRing = geom.coordinates.reduce((best, part) =>
      part[0].length > best.length ? part[0] : best,
      [] as Position[]
    );
  }

  // Ring umkehren → clockwise (GeoJSON-Loch)
  const holeRing = [...outerRing].reverse();

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [worldRing, holeRing],
    },
  };
}

// ---------------------------------------------------------------------------
// Daten laden
// ---------------------------------------------------------------------------

async function fetchGeoJSON(path: string): Promise<FeatureCollection> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Fehler beim Laden von ${path}: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Komponente
// ---------------------------------------------------------------------------

export default function GrunkartMap() {
  const [greenAreas, setGreenAreas] = useState<FeatureCollection | null>(null);
  const [water, setWater] = useState<FeatureCollection | null>(null);
  const [trees, setTrees] = useState<FeatureCollection | null>(null);
  const [paths, setPaths] = useState<FeatureCollection | null>(null);
  const [benches, setBenches] = useState<FeatureCollection | null>(null);
  const [playgrounds, setPlaygrounds] = useState<FeatureCollection | null>(null);
  const [playgroundEquipment, setPlaygroundEquipment] = useState<FeatureCollection | null>(null);
  const [squares, setSquares] = useState<FeatureCollection | null>(null);
  const [outsideMask, setOutsideMask] = useState<FeatureCollection | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const files = [
      { path: '/data/boundary.geojson', key: 'boundary' },
      { path: '/data/green-areas.geojson', key: 'greenAreas' },
      { path: '/data/water.geojson', key: 'water' },
      { path: '/data/baumkataster.geojson', key: 'trees' },
      { path: '/data/paths.geojson', key: 'paths' },
      { path: '/data/benches.geojson', key: 'benches' },
      { path: '/data/playgrounds.geojson', key: 'playgrounds' },
      { path: '/data/playground-equipment.geojson', key: 'playgroundEquipment' },
      { path: '/data/squares.geojson', key: 'squares' },
    ];

    Promise.allSettled(files.map((f) => fetchGeoJSON(f.path))).then((results) => {
      const data: Record<string, FeatureCollection> = {};
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          data[files[i].key] = result.value;
        } else {
          console.warn(`Konnte ${files[i].path} nicht laden:`, result.reason);
        }
      });

      if (data.greenAreas) setGreenAreas(data.greenAreas);
      if (data.water) setWater(data.water);
      if (data.trees) setTrees(data.trees);
      if (data.paths) setPaths(data.paths);
      if (data.benches) setBenches(data.benches);
      if (data.playgrounds) setPlaygrounds(data.playgrounds);
      if (data.playgroundEquipment) setPlaygroundEquipment(data.playgroundEquipment);
      if (data.squares) setSquares(data.squares);

      if (data.boundary?.features?.[0]) {
        const maskFeature = buildOutsideMask(data.boundary.features[0]);
        setOutsideMask({ type: 'FeatureCollection', features: [maskFeature] });
      }

      setDataLoaded(true);
    });
  }, []);

  const handleMapError = useCallback((e: { error: Error }) => {
    console.error('MapLibre Fehler:', e.error);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Map
        initialViewState={{
          longitude: KA_CENTER[0],
          latitude: KA_CENTER[1],
          zoom: KA_ZOOM,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        hash={true}
        onError={handleMapError}
      >
        {/* 1. Grünflächen (unterste Ebene) */}
        {greenAreas && (
          <Source id="green-areas" type="geojson" data={greenAreas}>
            <Layer {...greenAreasFillLayer} />
            <Layer {...greenAreasOutlineLayer} />
          </Source>
        )}

        {/* 2. Wasser — Linie zuerst, damit Fläche die Linie überdeckt */}
        {water && (
          <Source id="water" type="geojson" data={water}>
            <Layer {...waterLineLayer} />
            <Layer {...waterFillLayer} />
          </Source>
        )}

        {/* 3. Wege */}
        {paths && (
          <Source id="paths" type="geojson" data={paths}>
            <Layer {...pathsAreaFillLayer} />
            <Layer {...pathsLineLayer} />
          </Source>
        )}

        {/* 4. Plätze */}
        {squares && (
          <Source id="squares" type="geojson" data={squares}>
            <Layer {...squaresFillLayer} />
            <Layer {...squaresOutlineLayer} />
          </Source>
        )}

        {/* 5. Spielplätze */}
        {playgrounds && (
          <Source id="playgrounds" type="geojson" data={playgrounds}>
            <Layer {...playgroundsFillLayer} />
            <Layer {...playgroundsOutlineLayer} />
          </Source>
        )}

        {/* 6. Spielgeräte */}
        {playgroundEquipment && (
          <Source id="playground-equipment" type="geojson" data={playgroundEquipment}>
            <Layer {...playgroundEquipmentLayer} />
          </Source>
        )}

        {/* 7. Sitzbänke — ausgeblendet */}
        {/* {benches && (
          <Source id="benches" type="geojson" data={benches}>
            <Layer {...benchesLayer} />
          </Source>
        )} */}

        {/* 8. Bäume (ab Zoom 14) */}
        {trees && (
          <Source id="trees" type="geojson" data={trees}>
            <Layer {...treesIndividualLayer} />
          </Source>
        )}

        {/* 9. Außenmaske */}
        {outsideMask && (
          <Source id="outside-mask" type="geojson" data={outsideMask}>
            <Layer {...outsideMaskLayer} />
          </Source>
        )}

        {/* 10. Labels — immer ganz oben (eigene Sources für korrekte Renderreihenfolge) */}
        {greenAreas && (
          <Source id="park-labels-src" type="geojson" data={greenAreas}>
            <Layer {...parkLabelsLayer} />
          </Source>
        )}
        {squares && (
          <Source id="square-labels-src" type="geojson" data={squares}>
            <Layer {...squareLabelsLayer} />
          </Source>
        )}
        {water && (
          <Source id="water-labels-src" type="geojson" data={water}>
            <Layer {...waterLineLabelsLayer} />
            <Layer {...waterAreaLabelsLayer} />
          </Source>
        )}
      </Map>

      {/* Lizenzhinweis */}
      <Attribution />

      {/* Ladeindikator */}
      {!dataLoaded && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255,255,255,0.9)',
            padding: '12px 24px',
            borderRadius: 8,
            fontSize: 14,
            color: '#2d5a27',
            fontWeight: 500,
            pointerEvents: 'none',
          }}
        >
          🌿 Karte wird geladen...
        </div>
      )}

      {/* Legende */}
      <Legend />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lizenzhinweis
// ---------------------------------------------------------------------------

function Attribution() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        background: 'rgba(255,255,255,0.85)',
        borderRadius: 4,
        padding: '3px 7px',
        fontSize: 10,
        lineHeight: 1.5,
        color: '#555',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        maxWidth: 420,
        pointerEvents: 'auto',
      }}
    >
      Bäume:{' '}
      <a
        href="https://transparenz.karlsruhe.de/dataset/fachplane-baumkataster"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#2d5a27' }}
      >
        Fachpläne – Baumkataster
      </a>
      , Stadt Karlsruhe –{' '}
      <a
        href="https://www.govdata.de/dl-de/by-2-0"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#2d5a27' }}
      >
        dl-de/by-2-0
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legende
// ---------------------------------------------------------------------------

function Legend() {
  const items = [
    { color: '#c8eaad', label: 'Parks & Gärten' },
    { color: '#7ec453', label: 'Wiesen & Grünflächen' },
    { color: '#4a8830', label: 'Wald' },
    { color: '#6aaa40', label: 'Gebüsch & Heide' },
    { color: '#7ec8f5', label: 'Wasser' },
    { color: '#f0b870', label: 'Spielplätze' },
    { color: '#c8d8c4', label: 'Plätze' },
    { color: '#3a8228', label: 'Bäume' },
    { color: '#d4922e', label: 'Sitzbänke' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        right: 12,
        background: 'rgba(255,255,255,0.92)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        lineHeight: 1.7,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        pointerEvents: 'none',
        minWidth: 160,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#2d5a27', fontSize: 13 }}>
        Grünkarte Karlsruhe
      </div>
      {items.map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: color,
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#333' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}
