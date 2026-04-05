'use client';

import { useEffect, useState, useCallback } from 'react';
import { Map, Source, Layer } from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FilterSpecification } from 'maplibre-gl';
import type { FeatureCollection, Feature, Polygon, MultiPolygon, Position } from 'geojson';
import { registerTableTennisIcon } from '@/lib/tableTennisIcon';

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
  playgroundPolygonTableTennisLayer,
  playgroundLabelsLayer,
  playgroundEquipmentLayer,
  playgroundTableTennisLayer,
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
  const [parkOnly, setParkOnly] = useState(false);

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    const files = [
      { path: `${basePath}/data/boundary.geojson`, key: 'boundary' },
      { path: `${basePath}/data/green-areas.geojson`, key: 'greenAreas' },
      { path: `${basePath}/data/water.geojson`, key: 'water' },
      { path: `${basePath}/data/baumkataster.geojson`, key: 'trees' },
      { path: `${basePath}/data/paths.geojson`, key: 'paths' },
      { path: `${basePath}/data/benches.geojson`, key: 'benches' },
      { path: `${basePath}/data/playgrounds.geojson`, key: 'playgrounds' },
      { path: `${basePath}/data/playground-equipment.geojson`, key: 'playgroundEquipment' },
      { path: `${basePath}/data/squares.geojson`, key: 'squares' },
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

  // MapLibre filter expression für Park-Only-Modus — wird direkt an Layer übergeben,
  // kein JS-Array-Durchlauf beim Umschalten nötig.
  // true = kein Filter (alle Features zeigen); wichtig: undefined würde den vorherigen Filter nicht löschen
  const parkFilter: FilterSpecification = parkOnly
    ? (['==', ['get', 'in-park'], 1] as FilterSpecification)
    : true;

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
        onLoad={(evt) => {
          registerTableTennisIcon(evt.target);
        }}
        attributionControl={{
          customAttribution:
            'Bäume: <a href="https://transparenz.karlsruhe.de/dataset/fachplane-baumkataster" target="_blank" rel="noopener">Fachpläne – Baumkataster</a>, Stadt Karlsruhe – <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener">dl-de/by-2-0</a>',
        }}
      >
        {/* 1. Grünflächen (unterste Ebene) */}
        {greenAreas && (
          <Source id="green-areas" type="geojson" data={greenAreas}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(greenAreasFillLayer as any)} filter={parkFilter} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(greenAreasOutlineLayer as any)} filter={parkFilter} />
          </Source>
        )}

        {/* 2. Wasser — Linie zuerst, damit Fläche die Linie überdeckt */}
        {water && (
          <Source id="water" type="geojson" data={water}>
            <Layer {...waterLineLayer} />
            <Layer {...waterFillLayer} />
          </Source>
        )}

        {/* 3. Wege — Filter mit vorhandenem Geometrie-Filter kombinieren */}
        {paths && (
          <Source id="paths" type="geojson" data={paths}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(pathsAreaFillLayer as any)} filter={parkOnly
              ? ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'in-park'], 1]] as FilterSpecification
              : (pathsAreaFillLayer as any).filter} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(pathsLineLayer as any)} filter={parkOnly
              ? ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'in-park'], 1]] as FilterSpecification
              : (pathsLineLayer as any).filter} />
          </Source>
        )}

        {/* 4. Plätze — immer gerendert, Sichtbarkeit per layout-Property gesteuert */}
        {squares && (
          <Source id="squares" type="geojson" data={squares}>
            <Layer {...squaresFillLayer} layout={{ visibility: parkOnly ? 'none' : 'visible' }} />
            <Layer {...squaresOutlineLayer} layout={{ visibility: parkOnly ? 'none' : 'visible' }} />
          </Source>
        )}

        {/* 5. Spielplätze — immer gerendert, Sichtbarkeit per layout-Property gesteuert */}
        {playgrounds && (
          <Source id="playgrounds" type="geojson" data={playgrounds}>
            <Layer {...playgroundsFillLayer} layout={{ visibility: parkOnly ? 'none' : 'visible' }} />
            <Layer {...playgroundsOutlineLayer} layout={{ visibility: parkOnly ? 'none' : 'visible' }} />
            <Layer {...playgroundPolygonTableTennisLayer} layout={{ ...playgroundPolygonTableTennisLayer.layout, visibility: parkOnly ? 'none' : 'visible' }} />
          </Source>
        )}

        {/* 6. Spielgeräte — immer gerendert, Sichtbarkeit per layout-Property gesteuert */}
        {playgroundEquipment && (
          <Source id="playground-equipment" type="geojson" data={playgroundEquipment}>
            <Layer {...playgroundTableTennisLayer} layout={{ ...playgroundTableTennisLayer.layout, visibility: parkOnly ? 'none' : 'visible' }} />
            <Layer {...playgroundEquipmentLayer} layout={{ visibility: parkOnly ? 'none' : 'visible' }} />
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
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(treesIndividualLayer as any)} filter={parkFilter} />
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
            <Layer {...squareLabelsLayer} layout={{ ...squareLabelsLayer.layout, visibility: parkOnly ? 'none' : 'visible' }} />
          </Source>
        )}
        {playgrounds && (
          <Source id="playground-labels-src" type="geojson" data={playgrounds}>
            <Layer {...playgroundLabelsLayer} layout={{ ...playgroundLabelsLayer.layout, visibility: parkOnly ? 'none' : 'visible' }} />
          </Source>
        )}
        {water && (
          <Source id="water-labels-src" type="geojson" data={water}>
            <Layer {...waterLineLabelsLayer} />
            <Layer {...waterAreaLabelsLayer} />
          </Source>
        )}
      </Map>

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

      <div
        style={{
          position: 'absolute',
          right: 12,
          bottom: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 10,
          zIndex: 2,
        }}
      >
        <Legend parkOnly={parkOnly} />
        <ParkModeSwitcher parkOnly={parkOnly} onChange={setParkOnly} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legende
// ---------------------------------------------------------------------------

type ParkModeSwitcherProps = {
  parkOnly: boolean;
  onChange: (active: boolean) => void;
};

function ParkModeSwitcher({ parkOnly, onChange }: ParkModeSwitcherProps) {
  return (
    <button
      type="button"
      aria-pressed={parkOnly}
      onClick={() => onChange(!parkOnly)}
      style={{
        border: '1px solid rgba(62, 108, 49, 0.35)',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.95)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        color: '#22481d',
        fontSize: 12,
        fontWeight: 700,
        padding: '8px 12px',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {parkOnly ? 'Modus: Nur Parks' : 'Modus: Alle Grünflächen'}
    </button>
  );
}

type LegendProps = {
  parkOnly: boolean;
};

function Legend({ parkOnly }: LegendProps) {
  const items = parkOnly
    ? [
      { color: '#c8eaad', label: 'Parks' },
      { color: '#7ec8f5', label: 'Wasser' },
      { color: '#98c468', label: 'Wege im Park' },
      { color: '#3a8228', label: 'Bäume im Park' },
    ]
    : [
      { color: '#c8eaad', label: 'Parks' },
      { color: '#7ec453', label: 'Wiesen & Grünflächen' },
      { color: '#4a8830', label: 'Wald' },
      { color: '#6aaa40', label: 'Gebüsch & Heide' },
      { color: '#7ec8f5', label: 'Wasser' },
      { color: '#f0b870', label: 'Spielplätze' },
      { color: '#c8d8c4', label: 'Plätze' },
      { color: '#3a8228', label: 'Bäume' },
      { color: '#98c468', label: 'Wege' },
      { color: '#d4922e', label: 'Sitzbänke' },
    ];

  return (
    <div
      style={{
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
        Grüne Karte Karlsruhe
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
