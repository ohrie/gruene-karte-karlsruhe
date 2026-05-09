'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  radRoutenLineLayer,
  radRoutenLabelLayer,
  highwaysLitLayer,
  highwaysUnlitLayer,
  highwaysUnknownLitLayer,
  highwaysLabelLayer,
} from '@/lib/layerConfig';

// ---------------------------------------------------------------------------
// Karlsruhe Mittelpunkt
// ---------------------------------------------------------------------------

const KA_CENTER: [number, number] = [8.4037, 49.0069];
const KA_ZOOM = 13;

// ---------------------------------------------------------------------------
// Modus
// ---------------------------------------------------------------------------

type MapMode = 'gruen' | 'parks' | 'radrouten' | 'plaetze' | 'beleuchtung';

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
  const [radRouten, setRadRouten] = useState<FeatureCollection | null>(null);
  const [outsideMask, setOutsideMask] = useState<FeatureCollection | null>(null);
  const [highwaysLighting, setHighwaysLighting] = useState<FeatureCollection | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [mode, setMode] = useState<MapMode>(() => {
    if (typeof window === 'undefined') return 'gruen';
    const param = new URLSearchParams(window.location.search).get('layer');
    const valid: MapMode[] = ['gruen', 'parks', 'radrouten', 'plaetze', 'beleuchtung'];
    return valid.includes(param as MapMode) ? (param as MapMode) : 'gruen';
  });

  const handleModeChange = useCallback((newMode: MapMode) => {
    setMode(newMode);
    const url = new URL(window.location.href);
    url.searchParams.set('layer', newMode);
    window.history.replaceState(null, '', url.toString());
  }, []);

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
    load(`${basePath}/data/radrouten.geojson`, setRadRouten);
  }, []);

  useEffect(() => {
    if (mode !== 'beleuchtung' || highwaysLighting !== null) return;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    fetchGeoJSON(`${basePath}/data/highways-lighting.geojson`)
      .then(setHighwaysLighting)
      .catch((err) => console.warn('Konnte highways-lighting.geojson nicht laden:', err));
  }, [mode, highwaysLighting]);

  const handleMapError = useCallback((e: { error: Error }) => {
    console.error('MapLibre Fehler:', e.error);
  }, []);

  // Abgeleitete Sichtbarkeits-Flags
  const showParkOnly = mode === 'parks';
  const showGreen = mode === 'gruen' || mode === 'parks';
  const showSquares = mode === 'gruen' || mode === 'plaetze';
  const showPlaygrounds = mode === 'gruen';
  const showWater = mode === 'gruen' || mode === 'parks';
  const showTrees = mode === 'gruen' || mode === 'parks';
  const showPaths = mode === 'gruen' || mode === 'parks';
  const showSand = mode === 'gruen';
  const showRadRouten = mode === 'radrouten';
  const showBeleuchtung = mode === 'beleuchtung';

  // OSM-Relationen, die im Park-Modus ausgeblendet werden sollen
  const EXCLUDED_PARK_RELATION_IDS = ['relation/33947'];

  // MapLibre filter expression für Park-Only-Modus
  const parkFilter: FilterSpecification = showParkOnly
    ? (['all',
        ['==', ['get', 'in-park'], 1],
        ['match', ['id'], EXCLUDED_PARK_RELATION_IDS, false, true],
      ] as FilterSpecification)
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
        mapStyle={
          mode === 'beleuchtung'
            ? 'https://tiles.openfreemap.org/styles/dark'
            : 'https://tiles.openfreemap.org/styles/positron'
        }
        hash={true}
        onError={handleMapError}
        onLoad={(evt) => {
          registerTableTennisIcon(evt.target);
        }}
        attributionControl={{
          customAttribution: [
            'Bäume: <a href="https://transparenz.karlsruhe.de/dataset/fachplane-baumkataster" target="_blank" rel="noopener">Fachpläne – Baumkataster</a>, Stadt Karlsruhe – <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener">dl-de/by-2-0</a>',
            ...(showRadRouten ? ['Radnetz: <a href="https://transparenz.karlsruhe.de/dataset/radnetz-stadt-karlsruhe" target="_blank" rel="noopener">Radnetz Stadt Karlsruhe</a> – <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC-BY 4.0</a>'] : []),
          ],
        }}
      >
        <NavigationControl position="top-right" visualizePitch={true} />
        <GeolocateControl
          position="top-right"
          trackUserLocation={true}
          showAccuracyCircle={true}
        />
        {/* 1. Grünflächen (unterste Ebene) */}
        {greenAreas && showGreen && (
          <Source id="green-areas" type="geojson" data={greenAreas}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(greenAreasFillLayer as any)} filter={parkFilter} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(greenAreasOutlineLayer as any)} filter={parkFilter} />
          </Source>
        )}

        {/* 2. Wasser — Linie zuerst, damit Fläche die Linie überdeckt */}
        {water && showWater && (
          <Source id="water" type="geojson" data={water}>
            <Layer {...waterLineLayer} />
            <Layer {...waterFillLayer} />
          </Source>
        )}

        {/* 3. Wege — Filter mit vorhandenem Geometrie-Filter kombinieren */}
        {paths && showPaths && (
          <Source id="paths" type="geojson" data={paths}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(pathsAreaFillLayer as any)} filter={showParkOnly
              ? ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'in-park'], 1]] as FilterSpecification
              : (pathsAreaFillLayer as any).filter} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(pathsLineLayer as any)} filter={showParkOnly
              ? ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'in-park'], 1]] as FilterSpecification
              : (pathsLineLayer as any).filter} />
          </Source>
        )}

        {/* 4. Plätze */}
        {squares && (
          <Source id="squares" type="geojson" data={squares}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(squaresFillLayer as any)} layout={{ visibility: showSquares ? 'visible' : 'none' }} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(squaresOutlineLayer as any)} layout={{ visibility: showSquares ? 'visible' : 'none' }} />
          </Source>
        )}

        {/* 5. Sand (natural=sand, playground=sandpit) */}
        {sand && (
          <Source id="sand" type="geojson" data={sand}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(sandFillLayer as any)} layout={{ visibility: showSand ? 'visible' : 'none' }} />
          </Source>
        )}

        {/* 6. Spielplätze */}
        {playgrounds && (
          <Source id="playgrounds" type="geojson" data={playgrounds}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(playgroundsFillLayer as any)} layout={{ visibility: showPlaygrounds ? 'visible' : 'none' }} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(playgroundsOutlineLayer as any)} layout={{ visibility: showPlaygrounds ? 'visible' : 'none' }} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(playgroundPolygonTableTennisLayer as any)} layout={{ ...(playgroundPolygonTableTennisLayer as any).layout, visibility: showPlaygrounds ? 'visible' : 'none' }} />
          </Source>
        )}

        {/* 7. Spielgeräte */}
        {playgroundEquipment && (
          <Source id="playground-equipment" type="geojson" data={playgroundEquipment}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(playgroundTableTennisLayer as any)} layout={{ ...(playgroundTableTennisLayer as any).layout, visibility: showPlaygrounds ? 'visible' : 'none' }} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(playgroundEquipmentLayer as any)} layout={{ visibility: showPlaygrounds ? 'visible' : 'none' }} />
          </Source>
        )}

        {/* 8. Sitzbänke — ausgeblendet */}
        {/* {benches && (
          <Source id="benches" type="geojson" data={benches}>
            <Layer {...benchesLayer} />
          </Source>
        )} */}

        {/* 9. Bäume (ab Zoom 14) */}
        {trees && showTrees && (
          <Source id="trees" type="geojson" data={trees}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(treesIndividualLayer as any)} filter={parkFilter} />
          </Source>
        )}

        {/* 10. Radrouten */}
        {radRouten && showRadRouten && (
          <Source id="radrouten" type="geojson" data={radRouten}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(radRoutenLineLayer as any)} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(radRoutenLabelLayer as any)} />
          </Source>
        )}

        {/* 10b. Straßenbeleuchtung */}
        {highwaysLighting && showBeleuchtung && (
          <Source id="highways-lighting" type="geojson" data={highwaysLighting}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(highwaysUnknownLitLayer as any)} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(highwaysUnlitLayer as any)} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(highwaysLitLayer as any)} />
          </Source>
        )}

        {/* 11. Außenmaske */}
        {outsideMask && (
          <Source id="outside-mask" type="geojson" data={outsideMask}>
            <Layer {...outsideMaskLayer} />
          </Source>
        )}

        {/* 12. Labels — immer ganz oben (eigene Sources für korrekte Renderreihenfolge) */}
        {greenAreas && showGreen && (
          <Source id="park-labels-src" type="geojson" data={greenAreas}>
            <Layer {...parkLabelsLayer} />
          </Source>
        )}
        {squares && (
          <Source id="square-labels-src" type="geojson" data={squares}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(squareLabelsLayer as any)} layout={{ ...(squareLabelsLayer as any).layout, visibility: showSquares ? 'visible' : 'none' }} />
          </Source>
        )}
        {playgrounds && (
          <Source id="playground-labels-src" type="geojson" data={playgrounds}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(playgroundLabelsLayer as any)} layout={{ ...(playgroundLabelsLayer as any).layout, visibility: showPlaygrounds ? 'visible' : 'none' }} />
          </Source>
        )}
        {water && showWater && (
          <Source id="water-labels-src" type="geojson" data={water}>
            <Layer {...waterLineLabelsLayer} />
            <Layer {...waterAreaLabelsLayer} />
          </Source>
        )}
        {highwaysLighting && showBeleuchtung && (
          <Source id="highways-label-src" type="geojson" data={highwaysLighting}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Layer {...(highwaysLabelLayer as any)} />
          </Source>
        )}
      </Map>

      {/* Ladeindikator */}
      {!dataLoaded && (
        <div
          style={{
            position: 'absolute',
            top: 72,
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
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
        }}
      >
        <ModeSwitcher mode={mode} onChange={handleModeChange} />
      </div>

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
        <Legend mode={mode} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modus-Switcher
// ---------------------------------------------------------------------------

type ModeSwitcherProps = {
  mode: MapMode;
  onChange: (mode: MapMode) => void;
};

const MODE_CONFIG: Record<MapMode, { label: string; gradient: string; icon: string }> = {
  parks: { label: 'Parks', gradient: 'linear-gradient(135deg, #3a8228 0%, #5aaa40 100%)', icon: '🌳' },
  gruen: { label: 'Grün', gradient: 'linear-gradient(135deg, #22481d 0%, #3a8228 100%)', icon: '🌿' },
  plaetze: { label: 'Plätze', gradient: 'linear-gradient(135deg, #5a4088 0%, #8060b8 100%)', icon: '🏛️' },
  radrouten: { label: 'Radrouten', gradient: 'linear-gradient(135deg, #c03020 0%, #e84040 100%)', icon: '🚲' },
  beleuchtung: { label: 'Beleuchtung', gradient: 'linear-gradient(135deg, #1a1a3a 0%, #c8920a 100%)', icon: '💡' },
};

const MODES: MapMode[] = ['gruen', 'parks', 'plaetze', 'radrouten', 'beleuchtung'];

function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = MODE_CONFIG[mode];

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
      {/* Dropdown list — opens above the trigger button */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.97)',
            borderRadius: 14,
            boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
            border: '1px solid rgba(0,0,0,0.08)',
            overflow: 'hidden',
            minWidth: 170,
          }}
          role="listbox"
          aria-label="Ansicht wählen"
        >
          {MODES.map((m) => {
            const cfg = MODE_CONFIG[m];
            const isActive = m === mode;
            return (
              <button
                key={m}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => { onChange(m); setOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  border: 'none',
                  background: isActive ? 'rgba(0,0,0,0.05)' : 'transparent',
                  padding: '11px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: cfg.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {cfg.icon}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#1a1a1a' : '#444',
                  }}
                >
                  {cfg.label}
                </span>
                {isActive && (
                  <span style={{ marginLeft: 'auto', color: '#3a8228', fontSize: 16 }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Trigger button */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.97)',
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 999,
          padding: '8px 14px 8px 10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: current.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            flexShrink: 0,
          }}
        >
          {current.icon}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap' }}>
          {current.label}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: '#666',
          }}
        >
          <path d="M2.5 5L7 9.5L11.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legende
// ---------------------------------------------------------------------------

type LegendProps = {
  mode: MapMode;
};

type LegendItem = { color: string; label: string; type?: 'line' | 'area' };

const LEGEND_ITEMS: Record<MapMode, LegendItem[]> = {
  parks: [
    { color: '#c8eaad', label: 'Parks' },
    { color: '#7ec8f5', label: 'Wasser' },
    { color: '#98c468', label: 'Wege im Park' },
    { color: '#3a8228', label: 'Bäume im Park' },
  ],
  gruen: [
    { color: '#c8eaad', label: 'Parks' },
    { color: '#7ec453', label: 'Wiesen & Grünflächen' },
    { color: '#4a8830', label: 'Wald' },
    { color: '#6aaa40', label: 'Gebüsch & Heide' },
    { color: '#7ec8f5', label: 'Wasser' },
    { color: '#f0b870', label: 'Spielplätze' },
    { color: '#c8d8c4', label: 'Plätze' },
    { color: '#3a8228', label: 'Bäume' },
    { color: '#98c468', label: 'Wege' },
  ],
  plaetze: [
    { color: '#c2b6d3', label: 'Plätze' },
  ],
  radrouten: [
    { color: '#2e9e4f', label: 'Hauptradstrecke', type: 'line' },
    { color: '#f5820a', label: 'Radstrecke', type: 'line' },
    { color: '#4a7fc1', label: 'Nebenradstrecke', type: 'line' },
  ],
  beleuchtung: [
    { color: '#ffd166', label: 'Beleuchtet (lit=yes)', type: 'line' },
    { color: '#4a4a6a', label: 'Unbekannt / keine Daten', type: 'line' },
    { color: '#1a1a2e', label: 'Unbeleuchtet (lit=no)', type: 'line' },
  ],
};

function Legend({ mode }: LegendProps) {
  const [collapsed, setCollapsed] = useState(false);
  const items = LEGEND_ITEMS[mode];

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
          Legende
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
      {!collapsed && items.map(({ color, label, type }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {type === 'line' ? (
            <div
              style={{
                width: 20,
                height: 3,
                borderRadius: 2,
                background: color,
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: color,
                flexShrink: 0,
              }}
            />
          )}
          <span style={{ color: '#333' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}
