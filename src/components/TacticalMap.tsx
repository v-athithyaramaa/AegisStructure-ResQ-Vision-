'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Assessment } from '@/types';
import { Layers, Map as MapIcon, Plus, Minus, Eye, EyeOff } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */
delete (L.Icon.Default.prototype as any)._getIconUrl;
/* eslint-enable @typescript-eslint/no-explicit-any */
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createPinIcon = (color: string, shapeType: 'triangle' | 'octagon' | 'circle') => {
  let svgContent = '';
  
  if (shapeType === 'triangle') {
    // Triangle with exclamation mark
    svgContent = `<svg width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 0px 8px ${color}); position: relative; z-index: 10;">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>`;
  } else if (shapeType === 'octagon') {
    // Octagon
    svgContent = `<svg width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 0px 8px ${color}); position: relative; z-index: 10;">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>`;
  } else {
    // Circle
    svgContent = `<svg width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 0px 8px ${color}); position: relative; z-index: 10;">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>`;
  }

  const radarPulse = shapeType === 'triangle' ? `<div class="absolute inset-0 rounded-full radar-pulse-ring" style="background-color: ${color}; opacity: 0.4; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : '';

  return L.divIcon({
    className: 'custom-pin bg-transparent border-none',
    html: `<div class="relative w-8 h-8 flex items-center justify-center">
             ${radarPulse}
             ${svgContent}
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const stagingIcon = L.divIcon({
  className: 'custom-pin bg-transparent border-none',
  html: `<div class="relative w-8 h-8 flex items-center justify-center">
           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 0px 8px #06b6d4);">
             <circle cx="12" cy="12" r="10"></circle>
             <line x1="22" y1="12" x2="18" y2="12"></line>
             <line x1="6" y1="12" x2="2" y2="12"></line>
             <line x1="12" y1="6" x2="12" y2="2"></line>
             <line x1="12" y1="22" x2="12" y2="18"></line>
           </svg>
         </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
});

const icons = {
  GREEN_INSPECTED: createPinIcon('#10b981', 'circle'),
  YELLOW_RESTRICTED: createPinIcon('#f59e0b', 'octagon'),
  RED_UNSAFE: createPinIcon('#ef4444', 'triangle'),
};

interface TacticalMapProps {
  assessments: Assessment[];
  onSelect: (assessment: Assessment) => void;
  currentLocation?: { lat: number, lng: number } | null;
  crosshairMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  centerPos?: { lat: number, lng: number } | null;
  leftPanelCollapsed?: boolean;
  onOverrideSubmit?: (id: string, newStatus: string, badgeId: string, justification: string) => Promise<void>;
}

const MapEvents = ({ crosshairMode, onMapClick }: { crosshairMode?: boolean, onMapClick?: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      if (crosshairMode && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
};

// Custom Zoom Controller
const MapController = ({ zoomIn, zoomOut }: { zoomIn: boolean, zoomOut: boolean }) => {
  const map = useMap();
  useEffect(() => {
    if (zoomIn) map.zoomIn();
    if (zoomOut) map.zoomOut();
  }, [zoomIn, zoomOut, map]);
  return null;
};

const MapInvalidator = ({ collapsed }: { collapsed?: boolean }) => {
  const map = useMap();
  useEffect(() => {
    let frameId: number;
    const startTime = Date.now();
    const animate = () => {
      map.invalidateSize();
      if (Date.now() - startTime < 600) {
        frameId = requestAnimationFrame(animate);
      }
    };
    animate();
    return () => cancelAnimationFrame(frameId);
  }, [collapsed, map]);
  return null;
};

const PopupContent = ({ a, onSelect, onOverrideSubmit }: { a: Assessment; onSelect: (a: Assessment) => void; onOverrideSubmit?: (id: string, newStatus: string, badgeId: string, justification: string) => Promise<void> }) => {
  const [isOverrideMode, setIsOverrideMode] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState(a.placard_status);
  const [badgeId, setBadgeId] = useState('');
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOverrideSubmit = async () => {
    if (!badgeId || !justification) return;
    setIsSubmitting(true);
    try {
      if (onOverrideSubmit) {
        await onOverrideSubmit(a.id, overrideStatus, badgeId, justification);
      }
      setIsOverrideMode(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-w-[220px] text-sm text-slate-200 font-sans p-1">
      <div className="flex justify-between items-start mb-2 border-b border-slate-700/80 pb-2">
        <div>
          <div className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase mb-0.5">TRACK: USAR-TACTICAL</div>
          <h3 className="font-bold text-lg text-white leading-tight">{a.building_name}</h3>
        </div>
      </div>
      <div className="font-mono text-xs text-slate-400 mb-3 bg-slate-950/50 p-1.5 rounded border border-slate-800/50">
        ID: {a.id.substring(0, 8)} <br/>
        COORD: {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}
      </div>
      
      <div className="flex justify-between items-center mb-1 text-xs">
        <span className="text-slate-400 uppercase tracking-widest font-mono">Capacity</span>
        <span className={`font-mono font-bold ${
          a.placard_status === 'RED_UNSAFE' ? 'text-red-400' :
          a.placard_status === 'YELLOW_RESTRICTED' ? 'text-amber-400' :
          'text-emerald-400'
        }`}>{a.residual_capacity_score}%</span>
      </div>
      
      <div className="w-full bg-slate-800/50 rounded-full h-1.5 mb-4 border border-slate-700/50 overflow-hidden">
        <div 
          className={`h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] ${
            a.placard_status === 'RED_UNSAFE' ? 'bg-red-500 shadow-red-500/50' :
            a.placard_status === 'YELLOW_RESTRICTED' ? 'bg-amber-500 shadow-amber-500/50' :
            'bg-emerald-500 shadow-emerald-500/50'
          }`} 
          style={{ width: `${Math.max(0, Math.min(100, a.residual_capacity_score))}%` }}
        ></div>
      </div>
      
      <button 
        onClick={() => onSelect(a)}
        className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white py-2 rounded text-xs font-bold uppercase tracking-wider transition hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 mb-2"
      >
        View ATC-20 Placard
      </button>

      {/* Incident Commander Override */}
      <div className="mt-2 p-2 border border-amber-900/50 bg-amber-950/20 rounded">
        {!isOverrideMode ? (
          <button 
            onClick={() => setIsOverrideMode(true)}
            className="w-full text-amber-500 hover:text-amber-400 font-mono text-[10px] uppercase tracking-widest flex items-center justify-center transition"
          >
            Incident Commander Override
          </button>
        ) : (
          <div className="space-y-2 animate-in fade-in">
            <div className="text-amber-500 font-mono text-[10px] uppercase tracking-widest mb-1 border-b border-amber-900/50 pb-1 text-center">
              Override Authorization
            </div>
            
            <div>
              <select 
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value)}
                className="w-full bg-slate-900 border border-amber-900/50 text-white text-[10px] rounded p-1 outline-none focus:border-amber-500 font-mono"
              >
                <option value="GREEN_INSPECTED">GREEN_INSPECTED</option>
                <option value="YELLOW_RESTRICTED">YELLOW_RESTRICTED</option>
                <option value="RED_UNSAFE">RED_UNSAFE</option>
              </select>
            </div>
            <div>
              <input 
                type="text" 
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                placeholder="Badge ID"
                className="w-full bg-slate-900 border border-amber-900/50 text-white text-[10px] rounded p-1 outline-none focus:border-amber-500 font-mono uppercase"
              />
            </div>
            <div>
              <input 
                type="text" 
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Justification"
                className="w-full bg-slate-900 border border-amber-900/50 text-white text-[10px] rounded p-1 outline-none focus:border-amber-500 font-sans"
              />
            </div>
            <div className="flex justify-end gap-1 pt-1">
              <button 
                onClick={() => setIsOverrideMode(false)}
                className="px-2 py-1 rounded text-[10px] font-mono uppercase text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleOverrideSubmit}
                disabled={isSubmitting || !badgeId || !justification}
                className="px-2 py-1 rounded text-[10px] font-mono uppercase bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 transition"
              >
                {isSubmitting ? '...' : 'Override'}
              </button>
            </div>
          </div>
        )}
      </div>

      {a.override_badge_id && (
        <div className="text-[10px] font-mono text-amber-500 bg-amber-950/30 p-1 rounded border border-amber-900/50 uppercase text-center mt-2">
          Overridden by: {a.override_badge_id}
        </div>
      )}
    </div>
  );
};


export default function TacticalMap({ assessments, onSelect, currentLocation, crosshairMode, onMapClick, centerPos, leftPanelCollapsed, onOverrideSubmit }: TacticalMapProps) {
  const mapRef = useRef<L.Map>(null);
  
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');
  const [showCollapseGeofences, setShowCollapseGeofences] = useState(true);
  const [showEvacuationEgress, setShowEvacuationEgress] = useState(true);
  
  const [doZoomIn, setDoZoomIn] = useState(false);
  const [doZoomOut, setDoZoomOut] = useState(false);

  const handleZoomIn = () => { setDoZoomIn(true); setTimeout(() => setDoZoomIn(false), 50); };
  const handleZoomOut = () => { setDoZoomOut(true); setTimeout(() => setDoZoomOut(false), 50); };

  const defaultCenter: [number, number] = currentLocation ? [currentLocation.lat, currentLocation.lng] : [13.0827, 80.2707];

  useEffect(() => {
    if (mapRef.current && centerPos) {
      mapRef.current.flyTo([centerPos.lat, centerPos.lng], 16, { animate: true, duration: 1.5 });
    } else if (mapRef.current && assessments.length > 0 && !centerPos) {
      const bounds = L.latLngBounds(assessments.map(a => [a.latitude, a.longitude]));
      if (currentLocation) {
        bounds.extend([currentLocation.lat, currentLocation.lng]);
      }
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [assessments, currentLocation, centerPos]);

  return (
    <div className="relative w-full h-full">
      {/* Floating Tactical HUD Controls */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 p-2 rounded-lg shadow-2xl flex flex-col gap-2">
          <button 
            onClick={handleZoomIn}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 transition"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button 
            onClick={handleZoomOut}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 transition"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 p-2 rounded-lg shadow-2xl flex flex-col gap-2">
          <button 
            onClick={() => setMapStyle(mapStyle === 'dark' ? 'satellite' : 'dark')}
            className="p-1.5 bg-slate-800 hover:bg-cyan-900/50 hover:text-cyan-400 text-slate-300 rounded border border-slate-600 transition flex items-center justify-center"
            title="Toggle Map Style"
          >
            <MapIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowCollapseGeofences(!showCollapseGeofences)}
            className={`p-1.5 rounded border transition flex items-center justify-center ${showCollapseGeofences ? 'bg-red-900/40 text-red-400 border-red-800/50' : 'bg-slate-800 text-slate-500 border-slate-600'}`}
            title="Toggle Collapse Geofences"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowEvacuationEgress(!showEvacuationEgress)}
            className={`p-1.5 rounded border transition flex items-center justify-center ${showEvacuationEgress ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50' : 'bg-slate-800 text-slate-500 border-slate-600'}`}
            title="Toggle Evacuation Egress"
          >
            {showEvacuationEgress ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={12}
        zoomControl={false}
        className={`h-full w-full z-0 ${crosshairMode ? 'cursor-crosshair' : ''}`}
        ref={mapRef}
      >
        <MapInvalidator collapsed={leftPanelCollapsed} />
        <MapController zoomIn={doZoomIn} zoomOut={doZoomOut} />
        {mapStyle === 'dark' ? (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=cb1_40aw_1_584b3d3ad2dbeb79850d07e7"
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          />
        ) : (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
        )}
        <MapEvents crosshairMode={crosshairMode} onMapClick={onMapClick} />

        {assessments.map((a) => {
          let egressElements = null;
          if (a.placard_status === 'RED_UNSAFE' && a.collapse_radius_meters) {
            const latOffset = a.collapse_radius_meters / 111000;
            const safeLatOffset = latOffset * 3;
            const edgePos: [number, number] = [a.latitude + latOffset, a.longitude];
            const safePos: [number, number] = [a.latitude + safeLatOffset, a.longitude];
            
            if (showEvacuationEgress) {
              egressElements = (
                <React.Fragment>
                  <Polyline 
                    positions={[edgePos, safePos]} 
                    pathOptions={{ color: '#06b6d4', dashArray: '8, 8', className: 'animated-egress-line', weight: 3 }} 
                  />
                  <Marker position={safePos} icon={stagingIcon}>
                    <Popup className="tactical-popup border border-cyan-800/80 p-0 m-0">
                      <div className="font-mono text-xs text-cyan-400 p-2 uppercase tracking-widest bg-slate-900/80 backdrop-blur">
                        <span className="block text-white font-bold mb-1">Tactical Safe Egress Vector</span>
                        STATUS: ACTIVE
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            }
          }

          return (
            <React.Fragment key={a.id}>
              <Marker 
                position={[a.latitude, a.longitude]} 
                icon={icons[a.placard_status as keyof typeof icons] || icons['GREEN_INSPECTED']}
              >
                <Popup className="tactical-popup">
                  <PopupContent a={a} onSelect={onSelect} onOverrideSubmit={onOverrideSubmit} />
                </Popup>
              </Marker>

              {/* Pulsating Collapse Radius for Unsafe Buildings */}
              {a.placard_status === 'RED_UNSAFE' && a.collapse_radius_meters && showCollapseGeofences && (
                <Circle
                  center={[a.latitude, a.longitude]}
                  radius={a.collapse_radius_meters}
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.1,
                    weight: 1,
                    className: 'pulsating-circle'
                  }}
                />
              )}
              {egressElements}
            </React.Fragment>
          );
        })}

        {currentLocation && (
          <Circle 
            center={[currentLocation.lat, currentLocation.lng]}
            radius={300}
            pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.2, weight: 1 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
