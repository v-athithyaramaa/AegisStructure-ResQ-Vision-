'use client';

import React, { useState, useEffect, useRef } from 'react';
import TacticalMapWrapper from '@/components/TacticalMapWrapper';
import PlacardModal from '@/components/PlacardModal';
import MissionBriefing from '@/components/MissionBriefing';
import GuidedTour from '@/components/GuidedTour';
import ComputationHUD from '@/components/ComputationHUD';
import { saveToOfflineQueue, getOfflineQueue, flushOfflineQueue } from '@/lib/offlineStorage';
import { Camera, Send, Navigation, Volume2, VolumeX, Download, Target, Map, Battery, Signal, ChevronRight, ChevronLeft, ChevronDown, CheckCircle2, ShieldAlert, Wifi, WifiOff, RefreshCcw } from 'lucide-react';
import { Assessment, Defect } from '@/types';
import exifr from 'exifr';
import { playTacticalKlaxon } from '@/lib/audioAlert';

export default function Dashboard() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  
  const [imageBase64, setImageBase64] = useState<string>('');
  const [isVideoFrame, setIsVideoFrame] = useState<boolean>(false);
  const [exifData, setExifData] = useState<any>(null);
  
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [crosshairMode, setCrosshairMode] = useState<boolean>(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [draftResult, setDraftResult] = useState<Assessment | null>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  
  const [klaxonEnabled, setKlaxonEnabled] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState<boolean>(false);
  
  const [centerPos, setCenterPos] = useState<{lat: number, lng: number} | null>(null);

  const [showBriefing, setShowBriefing] = useState<boolean>(false);
  const [showTour, setShowTour] = useState<boolean>(false);
  
  const [expandedDefects, setExpandedDefects] = useState<Record<number, boolean>>({});
  
  const [toastMessage, setToastMessage] = useState<{message: string, type: 'success'|'info'|'warning'|'error'} | null>(null);

  const [overrideLogs, setOverrideLogs] = useState<string[]>([]);

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);
  const [showOfflineDrawer, setShowOfflineDrawer] = useState<boolean>(false);
  const [offlineDrafts, setOfflineDrafts] = useState<any[]>([]);

  const showToast = (message: string, type: 'success'|'info'|'warning'|'error' = 'info') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const hasSeenBriefing = localStorage.getItem('hasSeenBriefing');
    if (!hasSeenBriefing) {
      setShowBriefing(true);
      localStorage.setItem('hasSeenBriefing', 'true');
    }
  }, []);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('aegis_tour_completed');
    if (!showBriefing && !tourCompleted) {
      setShowTour(true);
    }
  }, [showBriefing]);

  const loadOfflineQueue = async () => {
    const q = await getOfflineQueue();
    setOfflineDrafts(q);
    setOfflineQueueCount(q.length);
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);
    loadOfflineQueue();

    const handleOnline = () => {
      setIsOnline(true);
      loadOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      loadOfflineQueue();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    // Poll the queue length periodically in case of background changes
    const interval = setInterval(loadOfflineQueue, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll for incidents stream
  useEffect(() => {
    const fetchStream = async () => {
      try {
        const res = await fetch('/api/assess/stream');
        const json = await res.json();
        if (json.success) {
          setAssessments(json.data);
        }
      } catch (err) {
        console.error('Stream fetch error:', err);
      }
    };
    
    fetchStream();
    const interval = setInterval(fetchStream, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleGeolocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      }, () => {
        setCrosshairMode(true);
      });
    } else {
      setCrosshairMode(true);
    }
  };

  useEffect(() => {
    handleGeolocation();
  }, []);



  const handleForceSync = async () => {
    if (!isOnline) {
      showToast('CANNOT SYNC: NETWORK UNREACHABLE', 'error');
      return;
    }
    showToast('FLUSHING MESH BUFFER UPSTREAM...', 'info');
    await flushOfflineQueue();
    await loadOfflineQueue();
    // Re-fetch stream
    const res = await fetch('/api/assess/stream');
    const json = await res.json();
    if (json.success) setAssessments(json.data);
    showToast('SYNC COMPLETE', 'success');
  };

  const processFile = async (file: File) => {
    setExifData(null);
    if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.crossOrigin = "anonymous";
      
      video.onloadeddata = () => {
        video.currentTime = 1.0;
      };

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg");
          setImageBase64(dataUrl);
          setIsVideoFrame(true);
          setDraftResult(null);
        }
        URL.revokeObjectURL(url);
      };
    } else if (file.type.startsWith('image/')) {
      setIsVideoFrame(false);
      try {
        const data = await exifr.parse(file);
        if (data) {
          setExifData({
            make: data.Make || 'Unknown',
            model: data.Model || 'Generic',
            iso: data.ISO || 'Auto',
            focalLength: data.FocalLength ? `${data.FocalLength}mm` : 'N/A',
            altitude: data.GPSAltitude ? `${data.GPSAltitude.toFixed(1)}m` : 'N/A'
          });
        }
        const gps = await exifr.gps(file);
        if (gps && gps.latitude && gps.longitude) {
          setLocation({ lat: gps.latitude, lng: gps.longitude });
          setExifData((prev: any) => prev ? { ...prev, lat: gps.latitude, lng: gps.longitude } : prev);
          console.log("Extracted GPS from EXIF:", gps);
        } else {
          handleGeolocation();
        }
      } catch (err) {
        console.warn("Could not extract EXIF GPS:", err);
        handleGeolocation();
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
        setDraftResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const analyzeImage = async () => {
    if (!imageBase64) return;
    
    const targetLocation = location || { lat: 13.0827, lng: 80.2707 };
    
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/assess/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          latitude: targetLocation.lat,
          longitude: targetLocation.lng,
          buildingName: "Field Capture Building",
          inspectorId: "USAR-ALPHA-1"
        })
      });
      
      const json = await res.json();
      if (json.success) {
        setDraftResult(json.data);
        if (json.data.placard_status === 'RED_UNSAFE' && klaxonEnabled) {
          playTacticalKlaxon();
        }
      } else {
        showToast('Analysis failed: ' + json.error, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Analysis error.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const transmitToCommand = async () => {
    if (!draftResult) return;
    
    const targetLocation = location || { lat: 13.0827, lng: 80.2707 };
    
    setIsTransmitting(true);
    const payload = {
      building_name: "Field Capture Building",
      inspector_id: "USAR-ALPHA-1",
      latitude: targetLocation.lat,
      longitude: targetLocation.lng,
      placard_status: draftResult.placard_status,
      residual_capacity_score: draftResult.residual_capacity_score,
      tilt_degrees: draftResult.tilt_degrees,
      detected_defects: draftResult.detected_defects,
      collapse_radius_meters: draftResult.collapse_radius_meters,
      incident_action_plan: draftResult.incident_action_plan,
      structural_archetype: draftResult.structural_archetype,
    };

    try {
      const res = await fetch('/api/assess/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Network response not ok");
      
      const streamRes = await fetch('/api/assess/stream');
      const streamJson = await streamRes.json();
      if (streamJson.success) setAssessments(streamJson.data);
      
      showToast('ASSESSMENT SYNCED TO COMMAND NODE', 'success');
      setDraftResult(null);
      setImageBase64('');
      setExifData(null);
    } catch (err) {
      console.error(err);
      await saveToOfflineQueue(payload);
      showToast('NETWORK UNAVAILABLE. SAVED TO OFFLINE QUEUE.', 'warning');
      setDraftResult(null);
      setImageBase64('');
      setExifData(null);
    } finally {
      setIsTransmitting(false);
    }
  };

  const simulateDisasterCluster = async () => {
    const baseLat = location?.lat || 19.0431;
    const baseLng = location?.lng || 72.8242;

    const mock1 = {
      building_name: "Simulated Sector 4 (Red)",
      inspector_id: "USAR-SIM-1",
      latitude: baseLat + 0.005,
      longitude: baseLng + 0.005,
      placard_status: "RED_UNSAFE",
      residual_capacity_score: 15,
      tilt_degrees: 8,
      detected_defects: [{ element: "Column", failure: "Shear", severity: 5, rebar_exposed: true }],
      collapse_radius_meters: 150,
      incident_action_plan: "Immediate Evacuation",
      structural_archetype: "RC Frame"
    };
    const mock2 = {
      building_name: "Simulated Sector 4 (Yellow)",
      inspector_id: "USAR-SIM-1",
      latitude: baseLat - 0.005,
      longitude: baseLng - 0.005,
      placard_status: "YELLOW_RESTRICTED",
      residual_capacity_score: 55,
      tilt_degrees: 2,
      detected_defects: [],
      collapse_radius_meters: 0,
      incident_action_plan: "Caution",
      structural_archetype: "Masonry"
    };
    const mock3 = {
      building_name: "Simulated Sector 4 (Green)",
      inspector_id: "USAR-SIM-1",
      latitude: baseLat + 0.005,
      longitude: baseLng - 0.005,
      placard_status: "GREEN_INSPECTED",
      residual_capacity_score: 95,
      tilt_degrees: 0,
      detected_defects: [],
      collapse_radius_meters: 0,
      incident_action_plan: "Normal Operations",
      structural_archetype: "Steel"
    };

    await fetch('/api/assess/save', { method: 'POST', body: JSON.stringify(mock1), headers: {'Content-Type': 'application/json'} });
    await fetch('/api/assess/save', { method: 'POST', body: JSON.stringify(mock2), headers: {'Content-Type': 'application/json'} });
    await fetch('/api/assess/save', { method: 'POST', body: JSON.stringify(mock3), headers: {'Content-Type': 'application/json'} });
    
    if (klaxonEnabled) playTacticalKlaxon();
    
    const res = await fetch('/api/assess/stream');
    const json = await res.json();
    if (json.success) {
      setAssessments(json.data);
      setCenterPos({ lat: mock1.latitude, lng: mock1.longitude });
    }
    showToast('SIMULATED CLUSTER DEPLOYED', 'warning');
  };

  const recenterLatest = () => {
    const latestRed = assessments.find(a => a.placard_status === 'RED_UNSAFE');
    if (latestRed) {
      setCenterPos({ lat: latestRed.latitude, lng: latestRed.longitude });
      showToast('RECENTERING ON CRITICAL TARGET', 'info');
    } else if (assessments.length > 0) {
      setCenterPos({ lat: assessments[0].latitude, lng: assessments[0].longitude });
      showToast('RECENTERING ON LAST TARGET', 'info');
    } else {
      showToast('NO TARGETS AVAILABLE', 'warning');
    }
  };

  const exportGeoJSON = () => {
    const features = assessments.map(a => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.longitude, a.latitude] },
      properties: { ...a }
    }));
    
    assessments.forEach(a => {
      if (a.placard_status === 'RED_UNSAFE' && a.collapse_radius_meters) {
        const points = 32;
        const coords = [];
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const dx = (a.collapse_radius_meters * Math.cos(angle)) / 111320;
          const dy = (a.collapse_radius_meters * Math.sin(angle)) / 111320; 
          coords.push([a.longitude + dx, a.latitude + dy]);
        }
        features.push({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [coords] },
          properties: { type: "collapse_radius", building_id: a.id }
        } as any);
      }
    });
  
    const geojson = {
      type: "FeatureCollection",
      features
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mission-export.geojson";
    a.click();
    URL.revokeObjectURL(url);
    showToast('MISSION DATA EXPORTED', 'success');
  };

  const handleOverrideSubmit = async (id: string, newStatus: string, badgeId: string, justification: string) => {
    try {
      const payload = {
        id,
        placard_status: newStatus,
        override_badge_id: badgeId,
        override_justification: justification,
      };
      
      const res = await fetch('/api/assess/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      
      if (json.success) {
        showToast(`OVERRIDE AUTHORIZED BY ${badgeId}`, 'success');
        setAssessments(prev => prev.map(a => a.id === id ? { ...a, placard_status: newStatus, override_badge_id: badgeId, override_justification: justification } : a));
        setSelectedAssessment(prev => prev && prev.id === id ? { ...prev, placard_status: newStatus, override_badge_id: badgeId, override_justification: justification } : prev);
        
        // Log override in Computation HUD
        setOverrideLogs(prev => [
          ...prev, 
          `> [OVERRIDE] ${new Date().toLocaleTimeString()} - Authorized by ${badgeId}`,
          `> Status modified to: ${newStatus}`,
          `> Justification: ${justification}`
        ]);
      } else {
        showToast('OVERRIDE REJECTED: ' + json.error, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('OVERRIDE NETWORK FAILURE', 'error');
    }
  };

  const toggleDefect = (index: number) => {
    setExpandedDefects(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="flex h-screen print:h-auto print:overflow-visible print:bg-none print:bg-white bg-[#090d16] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-[#090d16] to-[#090d16] text-slate-200 overflow-hidden font-sans">
      
      {/* Toast Notification HUD */}
      {toastMessage && (
        <div className="absolute bottom-6 right-6 z-[9999] animate-in slide-in-from-right-8 fade-in duration-300 print:hidden">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-2xl ${
            toastMessage.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400' :
            toastMessage.type === 'warning' ? 'bg-amber-950/80 border-amber-500/50 text-amber-400' :
            toastMessage.type === 'error' ? 'bg-red-950/80 border-red-500/50 text-red-400' :
            'bg-cyan-950/80 border-cyan-500/50 text-cyan-400'
          }`}>
            {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {toastMessage.type === 'error' && <ShieldAlert className="w-5 h-5" />}
            <span className="font-mono text-xs font-bold tracking-wider uppercase">{toastMessage.message}</span>
          </div>
        </div>
      )}

      {/* Left Panel: Field Inspection Scanner */}
      <div className={`${leftPanelCollapsed ? 'w-0 opacity-0' : 'w-1/3 min-w-[420px]'} print:hidden transition-all duration-500 ease-in-out border-r border-slate-800/80 bg-slate-900/70 backdrop-blur-md flex flex-col z-10 shadow-[0_0_50px_-12px_rgba(0,0,0,1)] relative overflow-y-auto`}>
        
        {/* Executive Mission Telemetry Header */}
        <div id="tour-header" className="p-4 border-b border-slate-800/80 bg-slate-950/80 sticky top-0 z-20 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-black text-2xl tracking-wider text-white">AegisStructure</h1>
              <p className="text-[10px] font-mono text-cyan-500 tracking-widest uppercase">ResQ-Vision // Tactical Command</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button 
                onClick={() => setShowOfflineDrawer(!showOfflineDrawer)}
                className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-mono tracking-widest transition border shadow-sm ${
                  isOnline && offlineQueueCount === 0 
                    ? 'bg-slate-900 border-slate-700 text-emerald-400 hover:bg-slate-800' 
                    : 'bg-amber-950/50 border-amber-900/50 text-amber-400 hover:bg-amber-900/40'
                }`}
              >
                {isOnline && offlineQueueCount === 0 ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    0 QUEUED (ONLINE)
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    {offlineQueueCount} PENDING SYNC (OFFLINE MESH BUFFER)
                  </>
                )}
              </button>
              <div className="flex gap-3 text-slate-500">
                <div className="flex items-center gap-1" title="Signal Strength"><Signal className="w-3 h-3 text-emerald-500" /></div>
                <div className="flex items-center gap-1" title="Battery Power"><Battery className="w-3 h-3 text-emerald-500" /> 84%</div>
              </div>
            </div>
          </div>
          
          {/* Tactical Quick Actions Dock */}
          <div id="tour-deliverables" className="flex gap-2 items-center">
            <button 
              onClick={() => setShowTour(true)} 
              className="text-slate-400 hover:text-white px-2 py-1 text-[10px] font-mono tracking-widest uppercase flex items-center gap-1 border border-slate-700 rounded bg-slate-800 transition shadow-sm"
            >
              Tour
            </button>
            <button 
              onClick={simulateDisasterCluster}
              className="text-amber-400 hover:text-amber-300 px-2 py-1 text-[10px] font-mono tracking-widest uppercase flex items-center gap-1 border border-amber-900/50 rounded bg-amber-950/30 transition shadow-sm"
            >
              Simulate Sector 4
            </button>
            <button 
              onClick={recenterLatest}
              className="text-emerald-400 hover:text-emerald-300 px-2 py-1 text-[10px] font-mono tracking-widest uppercase flex items-center gap-1 border border-emerald-900/50 rounded bg-emerald-950/30 transition shadow-sm"
            >
              Recenter
            </button>
            <button 
              onClick={exportGeoJSON}
              className="text-cyan-400 hover:text-cyan-300 px-2 py-1 text-[10px] font-mono tracking-widest uppercase flex items-center gap-1 border border-cyan-900/50 rounded bg-cyan-950/30 transition shadow-sm"
            >
              Export
            </button>
            <button onClick={() => setKlaxonEnabled(!klaxonEnabled)} className="text-slate-400 hover:text-white p-1 ml-auto transition">
              {klaxonEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Offline Mesh Buffer Drawer */}
        {showOfflineDrawer && (
          <div className="bg-slate-950 border-b border-slate-800/80 p-4 shadow-inner animate-in slide-in-from-top-2 fade-in">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h3 className="font-mono text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <WifiOff className="w-4 h-4" /> Mesh Buffer Queue ({offlineQueueCount})
              </h3>
              <button 
                onClick={handleForceSync}
                disabled={!isOnline || offlineQueueCount === 0}
                className="flex items-center gap-1 bg-amber-900/40 hover:bg-amber-800/50 text-amber-400 border border-amber-800/50 px-3 py-1.5 rounded text-[10px] font-mono tracking-widest uppercase transition disabled:opacity-50"
              >
                <RefreshCcw className="w-3 h-3" /> Force Sync Upstream
              </button>
            </div>
            {offlineQueueCount === 0 ? (
              <p className="text-xs text-slate-500 font-mono italic">No offline payloads queued.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {offlineDrafts.map((draft, idx) => (
                  <div key={draft.id || idx} className="bg-slate-900 p-2 rounded border border-slate-700/80 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-300">{draft.payload.building_name || 'Unknown Building'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{new Date(draft.timestamp).toLocaleString()}</p>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      draft.payload.placard_status === 'RED_UNSAFE' ? 'bg-red-950/50 text-red-400' :
                      draft.payload.placard_status === 'YELLOW_RESTRICTED' ? 'bg-amber-950/50 text-amber-400' :
                      'bg-emerald-950/50 text-emerald-400'
                    }`}>
                      {draft.payload.placard_status?.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-4 space-y-6">
          {/* Location status HUD */}
          <div className="flex items-center justify-between text-xs font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/80 shadow-inner">
            <div className="flex items-center text-cyan-400">
              <Navigation className="w-4 h-4 mr-2" />
              {location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "AWAITING TELEMETRY..."}
            </div>
            <div className="flex gap-3 uppercase tracking-widest text-[10px]">
              <button 
                onClick={() => setCrosshairMode(!crosshairMode)} 
                className={`flex items-center ${crosshairMode ? 'text-cyan-400 font-bold' : 'text-slate-500'} hover:text-cyan-300 transition`}
                title="Target coordinates on map"
              >
                <Target className="w-3 h-3 mr-1" />
                Target
              </button>
              <button onClick={handleGeolocation} className="text-emerald-500 hover:text-emerald-400 transition font-bold">Sync GPS</button>
            </div>
          </div>

          {/* Image/Video Upload Area */}
          <div 
            id="tour-scanner"
            className={`border-2 border-dashed ${isDragging ? 'border-cyan-500 bg-cyan-900/20' : 'border-slate-700 hover:bg-slate-800/50'} rounded-xl p-1 text-center transition cursor-pointer relative overflow-hidden group shadow-lg`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input 
              type="file" 
              accept="image/*,video/mp4,video/webm,video/quicktime,video/x-msvideo" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
              onChange={handleFileChange}
              ref={fileInputRef}
            />
            {imageBase64 ? (
              <div className={`relative aspect-video w-full bg-black rounded-lg overflow-hidden ${isAnalyzing ? 'before:absolute before:inset-0 before:bg-gradient-to-b before:from-transparent before:via-cyan-500/20 before:to-transparent before:animate-scan before:z-10' : ''}`}>
                <img src={imageBase64} alt="Capture" className="w-full h-full object-cover opacity-80" />
                {isVideoFrame && (
                  <div className="absolute top-2 right-2 bg-slate-900/80 text-cyan-400 font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-cyan-800/80 backdrop-blur-sm z-10 shadow-lg">
                    Video Frame Extracted
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-900/60 backdrop-blur-sm transition z-10">
                  <span className="text-sm font-bold tracking-widest uppercase font-mono text-white border border-slate-500 px-4 py-2 rounded">Re-Acquire Target</span>
                </div>
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-slate-500 pointer-events-none">
                <Camera className="w-10 h-10 mb-3 opacity-50 text-cyan-500" />
                <p className="font-bold text-sm tracking-widest uppercase text-slate-300">Acquire Visual Telemetry</p>
                <p className="text-[10px] font-mono text-slate-600 mt-2 uppercase tracking-widest">Drop Media / Tap to Capture</p>
              </div>
            )}
          </div>
          
          {/* Micro-tags for EXIF Data */}
          {exifData && (
            <div className="flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-widest">
              <span className="bg-slate-800/50 border border-slate-700 px-2 py-1 rounded text-slate-400">CAM: {exifData.make} {exifData.model}</span>
              <span className="bg-slate-800/50 border border-slate-700 px-2 py-1 rounded text-slate-400">ISO: {exifData.iso}</span>
              <span className="bg-slate-800/50 border border-slate-700 px-2 py-1 rounded text-slate-400">FOCAL: {exifData.focalLength}</span>
              <span className="bg-slate-800/50 border border-slate-700 px-2 py-1 rounded text-slate-400">ALT: {exifData.altitude}</span>
              {exifData.lat && exifData.lng && (
                <span className="bg-cyan-900/50 border border-cyan-700 px-2 py-1 rounded text-cyan-400 font-bold shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                  GPS: {exifData.lat.toFixed(5)}, {exifData.lng.toFixed(5)}
                </span>
              )}
            </div>
          )}

          {/* Analyze Trigger */}
          {imageBase64 && !draftResult && (
            <button 
              onClick={analyzeImage}
              disabled={isAnalyzing}
              className="w-full py-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-widest uppercase font-mono text-sm flex items-center justify-center transition disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processing Core Telemetry...
                </>
              ) : (
                "Execute ATC-20 Protocol"
              )}
            </button>
          )}

          <div id="tour-mechanics">
            <ComputationHUD isAnalyzing={isAnalyzing} draftResult={draftResult} overrideLogs={overrideLogs} />
          </div>
          
          {/* AI Assessment Results */}
          {draftResult && (
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 space-y-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-lg text-white font-sans tracking-wide">Automated ATC-20 Rapid Triage Assessment</h3>
                <span className={`px-2 py-1 rounded text-xs font-bold font-mono tracking-widest uppercase shadow-inner ${
                  draftResult.placard_status === 'RED_UNSAFE' ? 'bg-red-950/50 text-red-400 border border-red-900/50 shadow-red-900/20' :
                  draftResult.placard_status === 'YELLOW_RESTRICTED' ? 'bg-amber-950/50 text-amber-400 border border-amber-900/50 shadow-amber-900/20' :
                  'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50 shadow-emerald-900/20'
                }`}>
                  {draftResult.placard_status.replace('_', ' ')}
                </span>
              </div>

              {/* Residual Capacity Gauge - SVG Circular Arc */}
              <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-lg border border-slate-800/50">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">FEMA P-154 Rapid Visual Screening Score</span>
                  <span className={`text-3xl font-black font-mono ${
                    draftResult.placard_status === 'RED_UNSAFE' ? 'text-red-400' :
                    draftResult.placard_status === 'YELLOW_RESTRICTED' ? 'text-amber-400' :
                    'text-emerald-400'
                  }`}>{draftResult.residual_capacity_score}%</span>
                </div>
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <path
                      className="text-slate-800"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className={`transition-all duration-1000 ease-out ${
                        draftResult.placard_status === 'RED_UNSAFE' ? 'text-red-500' :
                        draftResult.placard_status === 'YELLOW_RESTRICTED' ? 'text-amber-500' :
                        'text-emerald-500'
                      }`}
                      strokeDasharray={`${Math.max(0, Math.min(100, draftResult.residual_capacity_score))}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                  </svg>
                </div>
              </div>

              {/* Diagnostic Confidence Gauge & Fallback Alert */}
              {draftResult.confidence_score !== undefined && (
                <>
                  <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-lg border border-slate-800/50">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">Optical Diagnostic Confidence</span>
                      <span className={`text-3xl font-black font-mono ${
                        draftResult.confidence_score < 75 ? 'text-amber-500' : 'text-cyan-400'
                      }`}>{draftResult.confidence_score}%</span>
                    </div>
                    <div className="relative w-16 h-16">
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        <path
                          className="text-slate-800"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        />
                        <path
                          className={`transition-all duration-1000 ease-out ${
                            draftResult.confidence_score < 75 ? 'text-amber-500' : 'text-cyan-500'
                          }`}
                          strokeDasharray={`${Math.max(0, Math.min(100, draftResult.confidence_score))}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        />
                      </svg>
                    </div>
                  </div>
                  
                  {draftResult.confidence_score < 75 && (
                    <div className="bg-amber-950/40 border border-amber-900 text-amber-400 p-3 rounded-lg flex items-start gap-3 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                      <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-mono font-bold tracking-widest uppercase leading-relaxed">
                        ⚠️ LOW OPTICAL CONFIDENCE ({'<'}75%): SECONDARY STRUCTURAL VALIDATION REQUIRED — ENTRY RESTRICTED
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                  <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest mb-1">P-Delta Dynamic Standoff Boundary {"($R_{\\text{collapse}}$)"}</p>
                  <p className="font-mono font-bold text-lg text-white">{draftResult.collapse_radius_meters}m</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                  <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest mb-1">Inter-story Drift &amp; Angular Deflection {"($\\theta$)"}</p>
                  <p className="font-mono font-bold text-lg text-white">{draftResult.tilt_degrees}°</p>
                </div>
              </div>

              <div>
                <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest mb-2 border-b border-slate-800 pb-1">Primary Load-Path Failure Mode(s)</p>
                <div className="space-y-2">
                  {draftResult.detected_defects?.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No critical defects detected.</p>
                  )}
                  {draftResult.detected_defects?.map((d: Defect, i: number) => (
                    <div key={i} className="bg-slate-900 rounded-lg border border-slate-700/80 overflow-hidden">
                      <button 
                        onClick={() => toggleDefect(i)}
                        className="w-full flex justify-between items-center p-3 text-left hover:bg-slate-800/50 transition"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${d.severity >= 4 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}></div>
                          <span className="font-bold text-slate-200 text-sm tracking-wide">{d.element}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider ${d.severity >= 4 ? 'bg-red-950 text-red-400 border border-red-900' : 'bg-amber-950 text-amber-400 border border-amber-900'}`}>
                            Sev {d.severity}/5
                          </span>
                          {expandedDefects[i] ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                        </div>
                      </button>
                      {expandedDefects[i] && (
                        <div className="p-3 bg-slate-950/50 border-t border-slate-800/50 text-xs text-slate-400">
                          <p className="font-mono mb-2 text-slate-300">FAILURE: <span className="text-white">{d.failure}</span></p>
                          {d.rebar_exposed && (
                            <span className="inline-flex items-center gap-1 bg-red-950/30 text-red-500 px-1.5 py-0.5 rounded border border-red-900/50 text-[10px] font-mono tracking-widest uppercase">
                              <ShieldAlert className="w-3 h-3" /> Rebar Exposed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={transmitToCommand}
                disabled={isTransmitting}
                className="w-full py-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold font-mono tracking-widest text-sm uppercase flex items-center justify-center transition disabled:opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                {isTransmitting ? "Uplinking Data..." : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Transmit to Command
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Collapse Toggle Button */}
      <button 
        onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
        className="absolute top-1/2 -translate-y-1/2 z-50 bg-slate-800/80 backdrop-blur border border-slate-600 text-slate-300 p-1.5 rounded-r-md hover:bg-slate-700 transition shadow-xl print:hidden"
        style={{ left: leftPanelCollapsed ? '0' : 'max(33.333333%, 420px)' }}
        title={leftPanelCollapsed ? "Expand Panel" : "Collapse Panel"}
      >
        {leftPanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Right Panel: Tactical Map */}
      <div id="tour-map" className="flex-1 relative bg-[#090d16] print:hidden">
        {crosshairMode && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[400] bg-cyan-950/80 text-cyan-400 text-[10px] font-mono uppercase tracking-widest py-1.5 px-4 rounded-sm border border-cyan-500 pointer-events-none animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            Awaiting Target Selection via Crosshair
          </div>
        )}

        <TacticalMapWrapper 
          assessments={assessments} 
          onSelect={setSelectedAssessment} 
          currentLocation={location} 
          crosshairMode={crosshairMode}
          onMapClick={(lat, lng) => {
            setLocation({ lat, lng });
            setCrosshairMode(false);
          }}
          centerPos={centerPos}
          leftPanelCollapsed={leftPanelCollapsed}
          onOverrideSubmit={handleOverrideSubmit}
        />
      </div>

      {/* Modal Overlay */}
      {selectedAssessment && (
        <PlacardModal 
          assessment={selectedAssessment} 
          onClose={() => setSelectedAssessment(null)} 
          onOverrideSubmit={handleOverrideSubmit}
        />
      )}

      {/* Mission Briefing Overlay */}
      {showBriefing && (
        <MissionBriefing 
          onClose={() => setShowBriefing(false)} 
          onLaunchSimulation={simulateDisasterCluster} 
        />
      )}

      <GuidedTour 
        run={showTour} 
        onFinish={() => { 
          setShowTour(false); 
          localStorage.setItem('aegis_tour_completed', 'true'); 
        }} 
      />
    </div>
  );
}

