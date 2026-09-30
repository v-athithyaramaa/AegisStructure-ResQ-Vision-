'use client';

import React, { useState, useEffect } from 'react';

type Step = {
  targetId: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
};

const steps: Step[] = [
  {
    targetId: 'tour-header',
    title: 'Header / Telemetry Bar',
    content: 'Highlights the live GPS coordinates, Online/Offline buffer status, and audio alarm controls.',
    position: 'bottom'
  },
  {
    targetId: 'tour-scanner',
    title: 'Field Scanner Dropzone',
    content: 'Points to the drag-and-drop / video keyframe zone and preloaded test disaster presets.',
    position: 'right'
  },
  {
    targetId: 'tour-mechanics',
    title: 'Calculation Mechanics',
    content: 'Points to the ATC-20 RCR civil computation breakdown.',
    position: 'right'
  },
  {
    targetId: 'tour-map',
    title: 'Tactical Command Map',
    content: 'Highlights the Leaflet GIS canvas, color-coded hazard markers, and pulsating collapse perimeters.',
    position: 'left'
  },
  {
    targetId: 'tour-deliverables',
    title: 'Actionable Deliverables',
    content: 'Highlights the "Simulate Disaster Cluster", "Export GeoJSON", and printable "ATC-20 Placard" modal.',
    position: 'bottom'
  }
];

export default function GuidedTour({ 
  run, 
  onFinish 
}: { 
  run: boolean; 
  onFinish: () => void; 
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!run) return;

    const updateRect = () => {
      const el = document.getElementById(steps[currentStep].targetId);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    const observer = new MutationObserver(updateRect);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      observer.disconnect();
    };
  }, [run, currentStep]);

  if (!run || !isClient) return null;

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onFinish();
      setCurrentStep(0);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onFinish();
    setCurrentStep(0);
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto overflow-hidden">
      {/* Overlay Backdrop - only show shadow if we have a target */}
      {rect ? (
        <div
          className="absolute transition-all duration-500 ease-in-out pointer-events-none rounded-lg"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: '0 0 0 9999px rgba(9, 13, 22, 0.85)',
            border: '2px solid #06b6d4',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#090d16]/85 backdrop-blur-sm pointer-events-none" />
      )}

      {/* Popover */}
      <div
        className="absolute z-[10000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-5 rounded-xl shadow-2xl shadow-black/60 w-80 text-slate-200 transition-all duration-500 ease-in-out"
        style={{
          ...(rect ? getPopoverStyle(rect, step.position || 'bottom') : {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          })
        }}
      >
        <div className="mb-3">
          <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/50 border border-cyan-900/50 px-2 py-1 rounded tracking-widest uppercase">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mb-2 tracking-wide">{step.title}</h3>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">{step.content}</p>
        
        <div className="flex justify-between items-center">
          <button 
            onClick={handleSkip} 
            className="text-xs text-slate-500 hover:text-white transition uppercase tracking-widest font-mono"
          >
            Skip Tour
          </button>
          <div className="flex gap-2 font-mono text-xs uppercase tracking-wider">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-slate-700 transition"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded border border-cyan-500 transition shadow-[0_0_10px_rgba(6,182,212,0.3)]"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getPopoverStyle(rect: DOMRect, position: string): React.CSSProperties {
  const gap = 20;
  
  if (position === 'bottom') {
    return {
      top: rect.bottom + gap,
      left: Math.max(10, rect.left + rect.width / 2 - 160),
    };
  }
  if (position === 'top') {
    return {
      top: rect.top - gap - 200, // approximate height
      left: Math.max(10, rect.left + rect.width / 2 - 160),
    };
  }
  if (position === 'right') {
    return {
      top: Math.max(10, rect.top + rect.height / 2 - 100),
      left: rect.right + gap,
    };
  }
  if (position === 'left') {
    return {
      top: Math.max(10, rect.top + rect.height / 2 - 100),
      left: Math.max(10, rect.left - 320 - gap),
    };
  }
  
  return {
    top: rect.bottom + gap,
    left: rect.left,
  };
}
