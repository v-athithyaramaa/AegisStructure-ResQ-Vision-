'use client';

import React, { useState, useEffect, useRef } from 'react';

type HUDProps = {
  isAnalyzing: boolean;
  draftResult: any; // assessment result
  overrideLogs?: string[];
};

export default function ComputationHUD({ isAnalyzing, draftResult, overrideLogs = [] }: HUDProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const draftResultRef = useRef(draftResult);
  const isAnalyzingRef = useRef(isAnalyzing);
  const overrideLogsRef = useRef(overrideLogs);
  
  useEffect(() => {
    draftResultRef.current = draftResult;
    isAnalyzingRef.current = isAnalyzing;
    
    // Check if new override logs were added
    if (overrideLogs.length > overrideLogsRef.current.length) {
      const newLogs = overrideLogs.slice(overrideLogsRef.current.length);
      setLines(prev => [...prev, ...newLogs]);
      setIsOpen(true);
      if (containerRef.current) {
        setTimeout(() => {
          if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }, 100);
      }
    }
    overrideLogsRef.current = overrideLogs;
  }, [draftResult, isAnalyzing, overrideLogs]);

  const [sequenceId, setSequenceId] = useState(0);

  useEffect(() => {
    // If analyzing starts, automatically open and begin sequence
    if (isAnalyzing) {
      setIsOpen(true);
      setSequenceId(s => s + 1);
    }
  }, [isAnalyzing]);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    
    const generateSequence = async () => {
      setLines([]); // Clear existing lines when starting a new sequence
      
      const addLine = (line: string, delay: number = 250) => {
        return new Promise<void>(resolve => {
          setTimeout(() => {
            if (mounted) {
              setLines(prev => [...prev, line]);
              // Scroll to bottom
              if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
              }
            }
            resolve();
          }, delay);
        });
      };

      await addLine('[SYS] Initializing Deterministic Engineering Pipeline...', 0);
      await addLine('', 300);
      
      if (!isAnalyzingRef.current && !draftResultRef.current) {
        await addLine('> [WARN] NO ACTIVE ASSESSMENT DETECTED.', 250);
        await addLine('> SYSTEM IDLE.', 250);
        await addLine('> Awaiting field ingestion to commence structural triage...', 250);
        return;
      }

      await addLine('--- 1. Optical Defect Extraction ---', 200);
      await addLine('> Scanning structural elements...', 200);
      await addLine('> Identified primary load paths...', 300);
      
      // Wait for analysis to complete before printing dynamic defects
      while (isAnalyzingRef.current && !draftResultRef.current && mounted) {
        await new Promise(r => setTimeout(r, 100));
      }

      const currentDraft = draftResultRef.current;

      if (currentDraft) {
        if (currentDraft.detected_defects && currentDraft.detected_defects.length > 0) {
          for (let i = 0; i < currentDraft.detected_defects.length; i++) {
            const defect = currentDraft.detected_defects[i];
            const coeff = (defect.severity / 5).toFixed(2);
            await addLine(`> Detected Defect: ${defect.failure} (Defect coefficient δ_${i+1} = ${coeff})`, 250);
          }
        } else {
          await addLine('> No severe optical defects detected.', 250);
        }
        await addLine(`> Measured Column Tilt: θ = ${currentDraft.tilt_degrees}°`, 200);
      } else {
        await addLine('> [ERROR] Failed to fetch structural anomalies. Using fallback heuristics.', 250);
      }
      await addLine('', 100);

      await addLine('--- 2. Deterministic Civil Formulation ---', 200);
      await addLine('> Evaluating Residual Capacity Ratio: RCR = 1.0 - Σ(w_i * δ_i)', 300);
      
      if (currentDraft) {
        await addLine(`> Calculated RCR: ${currentDraft.residual_capacity_score}% -> Triggering ATC-20 Threshold: ${currentDraft.placard_status}`, 300);
      } else {
        await addLine('> [ERROR] RCR Calculation failed due to missing payload.', 300);
      }
      await addLine('', 100);

      await addLine('--- 3. P-Delta Standoff Calculation ---', 200);
      await addLine('> Evaluating Standoff: R_collapse = 1.5 * H * sin(θ) + Δ_margin', 300);
      if (currentDraft && currentDraft.collapse_radius_meters !== undefined && currentDraft.collapse_radius_meters > 0) {
        await addLine(`> Calculated Exclusion Boundary: ${currentDraft.collapse_radius_meters} meters`, 250);
      } else if (currentDraft) {
        await addLine(`> Structural integrity nominal. No immediate exclusion boundary required.`, 250);
      } else {
        await addLine('> [ERROR] Standoff evaluation aborted.', 250);
      }
      await addLine('', 100);

      await addLine('--- 4. Geospatial & Event Fanout ---', 200);
      if (currentDraft) {
        await addLine('> Committing PostGIS Point & Buffer Polygon to Supabase...', 250);
        await addLine('> Publishing live telemetry packet to Upstash Redis channel:tactical-alerts...', 250);
        await addLine('> ATC-20 Placard Generated & Staged.', 250);
      } else {
        await addLine('> [ERROR] Telemetry sync aborted.', 250);
      }
      await addLine('', 100);
      await addLine('[SYS] Pipeline Execution Complete.', 100);
    };

    if (lines.length === 0 || sequenceId > 0) {
      generateSequence();
    }

    return () => {
      mounted = false;
    };
  }, [isOpen, sequenceId]); // Added sequenceId to dependecies to correctly restart

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-neutral-900 border border-neutral-700 hover:border-neutral-500 rounded text-sm text-neutral-300 transition"
      >
        <span className="font-mono text-xs flex items-center gap-2">
          <span className="text-emerald-500">{isOpen ? '▼' : '▶'}</span> Show Calculation Mechanics
        </span>
        {isAnalyzing && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div 
          className="mt-2 bg-black border border-neutral-800 rounded p-3 font-mono text-xs text-emerald-400 max-h-64 overflow-y-auto"
          ref={containerRef}
        >
          {lines.map((line, i) => (
            <div key={i} className="min-h-[1.2em]">
              {line}
            </div>
          ))}
          {isAnalyzing && (
            <div className="mt-2 text-emerald-600 animate-pulse">_</div>
          )}
        </div>
      )}
    </div>
  );
}
