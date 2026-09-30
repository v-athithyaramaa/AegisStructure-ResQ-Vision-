import React, { useState } from 'react';
import { ShieldAlert, ChevronRight, ChevronLeft, Camera, Activity, Map, Download } from 'lucide-react';

interface MissionBriefingProps {
  onClose: () => void;
  onLaunchSimulation: () => void;
}

export default function MissionBriefing({ onClose, onLaunchSimulation }: MissionBriefingProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "AegisStructure (ResQ-Vision) — Tactical USAR Operational Platform",
      subtitle: "Incident Command Protocol",
      content: (
        <div className="space-y-4">
          <p className="text-neutral-300 text-sm leading-relaxed">
            Mission Statement: Rapid structural triage for first responders under FEMA P-154 & ATC-20 standards to evaluate collapse risk, estimate residual load capacity, and map exclusion perimeters in real time.
          </p>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 space-y-3">
            <h4 className="font-bold text-xs text-neutral-400 uppercase tracking-wider">Key Indicators Legend</h4>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 mt-1 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
              <div>
                <p className="font-bold text-red-400 text-sm">RED PLACARD: Unsafe / Imminent Collapse</p>
                <p className="text-xs text-neutral-400">&lt;40% Residual Capacity — Entry Prohibited.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-amber-500 mt-1 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
              <div>
                <p className="font-bold text-amber-400 text-sm">YELLOW PLACARD: Restricted Use</p>
                <p className="text-xs text-neutral-400">40–75% Capacity — Structural shoring required.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
              <div>
                <p className="font-bold text-emerald-400 text-sm">GREEN PLACARD: Inspected / Low Apparent Risk</p>
                <p className="text-xs text-neutral-400">&gt;75% Capacity — Safe for operational access.</p>
              </div>
            </div>
          </div>
        </div>
      ),
      icon: <ShieldAlert className="w-8 h-8 text-blue-400" />
    },
    {
      title: "Step 1: Scanner Panel",
      subtitle: "Field Capture & Triage",
      content: (
        <div className="space-y-3 text-neutral-300 text-sm">
          <p>
            The left panel is your primary interface for field data ingestion.
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li><strong>Dropzone:</strong> Drag & drop structural imagery or video feeds.</li>
            <li><strong>EXIF GPS Reading:</strong> Automatically extracts geotags from drone or phone camera metadata.</li>
            <li><strong>Pre-loaded Test Disaster Presets:</strong> Quickly evaluate simulated structural damage.</li>
          </ul>
        </div>
      ),
      icon: <Camera className="w-8 h-8 text-emerald-400" />
    },
    {
      title: "Step 2: ATC-20 AI Diagnostic Engine",
      subtitle: "Automated Structural Taxonomy",
      content: (
        <div className="space-y-3 text-neutral-300 text-sm">
          <p>
            Upon image ingestion, our multimodal AI engine automatically classifies damage types according to standardized taxonomies.
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li>Identifies shear failure, concrete spalling, and rebar exposure.</li>
            <li>Calculates structural tilt angle dynamically.</li>
            <li>Generates a Residual Capacity Ratio (RCR) to output a recommended placard status.</li>
          </ul>
        </div>
      ),
      icon: <Activity className="w-8 h-8 text-amber-400" />
    },
    {
      title: "Step 3: Tactical GIS Command Map",
      subtitle: "Situational Awareness",
      content: (
        <div className="space-y-3 text-neutral-300 text-sm">
          <p>
            The right panel provides an interactive, real-time tactical overlay of the disaster zone.
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li><strong>Hazard Markers:</strong> Color-coded pins map assessed structures.</li>
            <li><strong>Pulsating Debris Radiuses:</strong> Visualizes theoretical collapse exclusion perimeters.</li>
            <li><strong>Tactical Controls:</strong> Use "Simulate Disaster Cluster" to inject test data, or "Recenter" to focus on active triage.</li>
          </ul>
        </div>
      ),
      icon: <Map className="w-8 h-8 text-blue-400" />
    },
    {
      title: "Step 4: Actionable Outputs",
      subtitle: "Interoperability & Reporting",
      content: (
        <div className="space-y-3 text-neutral-300 text-sm">
          <p>
            Seamlessly integrate with wider military and emergency response ecosystems.
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li><strong>ATC-20 Placard Modal:</strong> Click any map marker to view a printable, standardized safety placard.</li>
            <li><strong>Export Mission GeoJSON:</strong> Export incident data for direct ingestion into ATAK, QGIS, or other command platforms.</li>
          </ul>
        </div>
      ),
      icon: <Download className="w-8 h-8 text-purple-400" />
    }
  ];

  const currentStep = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleLaunch = () => {
    onLaunchSimulation();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-neutral-950 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden flex flex-col transform transition-all">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-800 flex items-center gap-4 bg-neutral-900/50">
          <div className="p-2 bg-neutral-800 rounded-lg shadow-inner">
            {currentStep.icon}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black tracking-wide text-white">{currentStep.title}</h2>
            <p className="text-xs text-neutral-400 uppercase font-semibold tracking-wider">{currentStep.subtitle}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition p-1"
            title="Skip Briefing"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 min-h-[220px]">
          <div className="animate-in slide-in-from-right-4 fade-in duration-300" key={step}>
            {currentStep.content}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`w-2 h-2 rounded-full transition-all duration-300 ${i === step ? 'bg-blue-500 w-6' : 'bg-neutral-700'}`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <button 
                onClick={handlePrev}
                className="px-4 py-2 rounded-md font-semibold text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </button>
            )}
            
            {step < steps.length - 1 ? (
              <button 
                onClick={handleNext}
                className="px-4 py-2 rounded-md font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white transition flex items-center shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <button 
                onClick={handleLaunch}
                className="px-5 py-2 rounded-md font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              >
                ⚡ Launch Interactive Simulation
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
