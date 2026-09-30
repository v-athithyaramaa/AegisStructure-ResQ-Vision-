'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import the TacticalMap with SSR disabled
const TacticalMap = dynamic(() => import('./TacticalMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-neutral-900 flex items-center justify-center text-neutral-400">Initializing Tactical Command Map...</div>,
});

import { Assessment } from '@/types';

export default function TacticalMapWrapper({ 
  assessments, 
  onSelect, 
  currentLocation,
  crosshairMode,
  onMapClick,
  centerPos,
  leftPanelCollapsed,
  onOverrideSubmit
}: { 
  assessments: Assessment[], 
  onSelect: (a: Assessment) => void, 
  currentLocation?: {lat: number, lng: number} | null,
  crosshairMode?: boolean,
  onMapClick?: (lat: number, lng: number) => void,
  centerPos?: {lat: number, lng: number} | null,
  leftPanelCollapsed?: boolean,
  onOverrideSubmit?: (id: string, newStatus: string, badgeId: string, justification: string) => Promise<void>
}) {
  return <TacticalMap assessments={assessments} onSelect={onSelect} currentLocation={currentLocation} crosshairMode={crosshairMode} onMapClick={onMapClick} centerPos={centerPos} leftPanelCollapsed={leftPanelCollapsed} onOverrideSubmit={onOverrideSubmit} />;
}
