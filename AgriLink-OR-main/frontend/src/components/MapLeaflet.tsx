import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { M2Row } from '../api/types';

interface MapLeafletProps {
  farmLat: number;
  farmLon: number;
  rows: M2Row[];
}

export const MapLeaflet: React.FC<MapLeafletProps> = ({ farmLat, farmLon, rows }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Cleanup previous map instance if exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const validRows = rows.filter((r) => r.lat != null && r.lon != null && !isNaN(r.lat) && !isNaN(r.lon));
    
    // Center either on farm or average
    const initialLat = isNaN(farmLat) ? 14.30 : farmLat;
    const initialLon = isNaN(farmLon) ? 76.00 : farmLon;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: 7,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // Custom Origin Icon with pulsing ring
    const originIcon = L.divIcon({
      className: 'al-origin-wrapper',
      html: `
        <div style="position:relative; width:18px; height:18px;">
          <div style="position:absolute; inset:0; border-radius:50%; background:#D7263D; box-shadow:0 0 0 2.5px #fff, 0 3px 10px rgba(215,38,61,.7);"></div>
          <div style="position:absolute; inset:-5px; border-radius:50%; border:2px solid rgba(215,38,61,.6); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        </div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    L.marker([initialLat, initialLon], { icon: originIcon })
      .addTo(map)
      .bindTooltip('<strong>FPO Origin (Ship-from Depot)</strong><br/>Lat: ' + initialLat.toFixed(2) + ', Lon: ' + initialLon.toFixed(2));

    if (validRows.length > 0) {
      const netVals = validRows.map((r) => r.net_per_qtl);
      const minNet = Math.min(...netVals);
      const maxNet = Math.max(...netVals);
      const span = Math.max(maxNet - minNet, 1e-4);

      // Color interpolation: t=0 -> red (#D7263D), t=1 -> green (#16A34A)
      const getColor = (val: number) => {
        const t = Math.max(0, Math.min(1, (val - minNet) / span));
        const r = Math.round(215 * (1 - t) + 22 * t);
        const g = Math.round(38 * (1 - t) + 163 * t);
        const b = Math.round(61 * (1 - t) + 74 * t);
        return `rgb(${r}, ${g}, ${b})`;
      };

      const bounds: L.LatLngTuple[] = [[initialLat, initialLon]];

      validRows.forEach((r) => {
        const markerColor = getColor(r.net_per_qtl);
        const marker = L.circleMarker([r.lat!, r.lon!], {
          radius: 7,
          fillColor: markerColor,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map);

        const tooltipContent = `
          <div style="font-family: 'Segoe UI', sans-serif; font-size: 12px; padding: 2px;">
            <strong style="color: #171A21;">${r.market}</strong> ${r.district ? `(${r.district})` : ''}<br/>
            <span style="color: #D7263D; font-weight: bold;">Net Realisation: ₹${Math.round(r.net_per_qtl).toLocaleString()}/qtl</span><br/>
            <span style="color: #64748B;">Board Price: ₹${Math.round(r.board_price).toLocaleString()} · ${Math.round(r.km)} km</span><br/>
            <span style="color: #64748B;">Board Rank: #${r.rank_board}</span>
          </div>
        `;
        marker.bindTooltip(tooltipContent);
        bounds.push([r.lat!, r.lon!]);
      });

      if (bounds.length > 1) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 9 });
      }
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [farmLat, farmLon, rows]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-[460px] z-0" />

      {/* Floating Legend */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-sm border border-slate-200 border-l-4 border-l-crimson-brand rounded-xl p-3 shadow-md text-xs font-semibold text-slate-700 space-y-1.5 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block shadow-sm"></span>
          <span>Best Net Realisation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-crimson-brand inline-block shadow-sm"></span>
          <span>Worst Net Realisation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-crimson-brand inline-block ring-2 ring-white ring-offset-1 ring-offset-crimson-brand/40"></span>
          <span>FPO Origin Depot</span>
        </div>
      </div>
    </div>
  );
};
