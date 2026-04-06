'use client';

import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#2d5a27', fontWeight: 500, fontSize: 14 }}>
        <span className="map-spinner" />
        🌿 Karte wird geladen…
      </div>
    </div>
  ),
});

export default function MapLoader() {
  return <Map />;
}
