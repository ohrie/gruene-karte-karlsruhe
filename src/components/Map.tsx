'use client';

import { useEffect, useState, useCallback } from 'react';
import { Map, Source, Layer, NavigationControl, GeolocateControl } from '@vis.gl/react-maplibre';
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
  sandFillLayer,
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
  const [sand, setSand] = useState<FeatureCollection | null>(null);
  const [playgrounds, setPlaygrounds] = useState<FeatureCollection | null>(null);
  const [playgroundEquipment, setPlaygroundEquipment] = useState<FeatureCollection | null>(null);
  const [squares, setSquares] = useState<FeatureCollection | null>(null);
  const [outsideMask, setOutsideMask] = useState<FeatureCollection | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [parkOnly, setParkOnly] = useState(false);

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    let pending = 0;

    function load(path: string, onSuccess: (data: FeatureCollection) => void) {
      pending++;
      fetchGeoJSON(path)
        .then((data) => {
          onSuccess(data);
        })
        .catch((err) => console.warn(`Konnte ${path} nicht laden:`, err))
        .finally(() => {
          pending--;
          if (pending === 0) setDataLoaded(true);
        });
    }

    load(`${basePath}/data/boundary.geojson`, (data) => {
      if (data.features?.[0]) {
        const maskFeature = buildOutsideMask(data.features[0]);
        setOutsideMask({ type: 'FeatureCollection', features: [maskFeature] });
      }
    });
    load(`${basePath}/data/green-areas.geojson`, setGreenAreas);
    load(`${basePath}/data/water.geojson`, setWater);
    load(`${basePath}/data/paths.geojson`, setPaths);
    load(`${basePath}/data/squares.geojson`, setSquares);
    load(`${basePath}/data/sand.geojson`, setSand);
    load(`${basePath}/data/playgrounds.geojson`, setPlaygrounds);
    load(`${basePath}/data/playground-equipment.geojson`, setPlaygroundEquipment);
    load(`${basePath}/data/benches.geojson`, setBenches);
    load(`${basePath}/data/baumkataster.geojson`, setTrees);
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
        <NavigationControl position="top-right" visualizePitch={true} />
        <GeolocateControl
          position="top-right"
          trackUserLocation={true}
          showUserHeading={true}
          showAccuracyCircle={true}
        />
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
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(squaresFillLayer as any)} layout={{ visibility: parkOnly ? 'none' : 'visible' }} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(squaresOutlineLayer as any)} layout={{ visibility: parkOnly ? 'none' : 'visible' }} />
          </Source>
        )}

        {/* 5. Sand (natural=sand, playground=sandpit) */}
        {sand && (
          <Source id="sand" type="geojson" data={sand}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(sandFillLayer as any)} layout={{ visibility: parkOnly ? 'none' : 'visible' }} />
          </Source>
        )}

        {/* 6. Spielplätze — immer gerendert, Sichtbarkeit per layout-Property gesteuert */}
        {playgrounds && (
          <Source id="playgrounds" type="geojson" data={playgrounds}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(playgroundsFillLayer as any)} layout={{ visibility: parkOnly ? 'none' : 'visible' }} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(playgroundsOutlineLayer as any)} layout={{ visibility: parkOnly ? 'none' : 'visible' }} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(playgroundPolygonTableTennisLayer as any)} layout={{ ...(playgroundPolygonTableTennisLayer as any).layout, visibility: parkOnly ? 'none' : 'visible' }} />
          </Source>
        )}

        {/* 7. Spielgeräte — immer gerendert, Sichtbarkeit per layout-Property gesteuert */}
        {playgroundEquipment && (
          <Source id="playground-equipment" type="geojson" data={playgroundEquipment}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(playgroundTableTennisLayer as any)} layout={{ ...(playgroundTableTennisLayer as any).layout, visibility: parkOnly ? 'none' : 'visible' }} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(playgroundEquipmentLayer as any)} layout={{ visibility: parkOnly ? 'none' : 'visible' }} />
          </Source>
        )}

        {/* 8. Sitzbänke — ausgeblendet */}
        {/* {benches && (
          <Source id="benches" type="geojson" data={benches}>
            <Layer {...benchesLayer} />
          </Source>
        )} */}

        {/* 9. Bäume (ab Zoom 14) */}
        {trees && (
          <Source id="trees" type="geojson" data={trees}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(treesIndividualLayer as any)} filter={parkFilter} />
          </Source>
        )}

        {/* 10. Außenmaske */}
        {outsideMask && (
          <Source id="outside-mask" type="geojson" data={outsideMask}>
            <Layer {...outsideMaskLayer} />
          </Source>
        )}

        {/* 11. Labels — immer ganz oben (eigene Sources für korrekte Renderreihenfolge) */}
        {greenAreas && (
          <Source id="park-labels-src" type="geojson" data={greenAreas}>
            <Layer {...parkLabelsLayer} />
          </Source>
        )}
        {squares && (
          <Source id="square-labels-src" type="geojson" data={squares}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(squareLabelsLayer as any)} layout={{ ...(squareLabelsLayer as any).layout, visibility: parkOnly ? 'none' : 'visible' }} />
          </Source>
        )}
        {playgrounds && (
          <Source id="playground-labels-src" type="geojson" data={playgrounds}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(playgroundLabelsLayer as any)} layout={{ ...(playgroundLabelsLayer as any).layout, visibility: parkOnly ? 'none' : 'visible' }} />
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
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.92)',
            padding: '8px 18px',
            borderRadius: 999,
            fontSize: 13,
            color: '#2d5a27',
            fontWeight: 500,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            whiteSpace: 'nowrap',
          }}
        >
          <span className="map-spinner" />
          🌿 Karte wird geladen…
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
    <div
      style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 999,
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        border: '1px solid rgba(62, 108, 49, 0.3)',
        padding: 3,
        display: 'inline-flex',
        position: 'relative',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      role="group"
      aria-label="Ansicht wählen"
    >
      {/* Sliding pill */}
      <div
        style={{
          position: 'absolute',
          top: 3,
          bottom: 3,
          left: parkOnly ? 3 : 'calc(50% + 1px)',
          width: 'calc(50% - 4px)',
          borderRadius: 999,
          background: parkOnly
            ? 'linear-gradient(135deg, #3a8228 0%, #5aaa40 100%)'
            : 'linear-gradient(135deg, #22481d 0%, #3a8228 100%)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          transition: 'left 0.22s cubic-bezier(0.4,0,0.2,1), background 0.22s ease',
          pointerEvents: 'none',
        }}
      />
      <button
        type="button"
        onClick={() => onChange(true)}
        style={{
          position: 'relative',
          zIndex: 1,
          border: 'none',
          background: 'transparent',
          borderRadius: 999,
          padding: '6px 16px',
          fontSize: 12,
          fontWeight: 700,
          color: parkOnly ? '#fff' : '#5a7a52',
          cursor: 'pointer',
          transition: 'color 0.22s ease',
          minWidth: 60,
          textAlign: 'center',
        }}
        aria-pressed={parkOnly}
      >
        Parks
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        style={{
          position: 'relative',
          zIndex: 1,
          border: 'none',
          background: 'transparent',
          borderRadius: 999,
          padding: '6px 16px',
          fontSize: 12,
          fontWeight: 700,
          color: !parkOnly ? '#fff' : '#5a7a52',
          cursor: 'pointer',
          transition: 'color 0.22s ease',
          minWidth: 60,
          textAlign: 'center',
        }}
        aria-pressed={!parkOnly}
      >
        Alles
      </button>
    </div>
  );
}

type LegendProps = {
  parkOnly: boolean;
};

function Legend({ parkOnly }: LegendProps) {
  const [collapsed, setCollapsed] = useState(false);

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
        minWidth: 160,
      }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Legende aufklappen' : 'Legende zuklappen'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: collapsed ? 0 : 6,
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: '#2d5a27',
          textAlign: 'left',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13 }}>
          Grüne Karte Karlsruhe
        </span>
        {collapsed ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.5 5L7 9.5L11.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.5 9L7 4.5L11.5 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {!collapsed && items.map(({ color, label }) => (
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
