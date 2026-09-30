'use client';

import React, { useState } from 'react';
import { X, Printer, ShieldAlert } from 'lucide-react';
import { Assessment } from '@/types';
import { QRCodeSVG } from 'qrcode.react';

interface PlacardModalProps {
  assessment: Assessment;
  onClose: () => void;
  onOverrideSubmit?: (id: string, newStatus: string, badgeId: string, justification: string) => Promise<void>;
}

export default function PlacardModal({ assessment, onClose, onOverrideSubmit }: PlacardModalProps) {
  const [isOverrideMode, setIsOverrideMode] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState(assessment.placard_status);
  const [badgeId, setBadgeId] = useState('');
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!assessment) return null;

  const isRed = assessment.placard_status === 'RED_UNSAFE';
  const isYellow = assessment.placard_status === 'YELLOW_RESTRICTED';

  const colorClass = isRed ? 'bg-red-600' : isYellow ? 'bg-amber-400' : 'bg-emerald-500';
  const textColorClass = isYellow ? 'text-black' : 'text-white';
  const title = isRed ? 'UNSAFE' : isYellow ? 'RESTRICTED USE' : 'INSPECTED';
  const subtitle = isRed ? 'DO NOT ENTER OR OCCUPY' : 
                   isYellow ? 'AUTHORIZED RESCUE CREWS ONLY' : 
                   'NO APPARENT STRUCTURAL HAZARD';

  const handlePrint = () => {
    window.print();
  };

  const handleOverrideSubmit = async () => {
    if (!badgeId || !justification) return;
    setIsSubmitting(true);
    try {
      if (onOverrideSubmit) {
        await onOverrideSubmit(assessment.id, overrideStatus, badgeId, justification);
      }
      setIsOverrideMode(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#090d16]/80 backdrop-blur-md print:bg-white print:p-0 transition-all duration-300">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl text-slate-200 rounded-lg shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] print:max-w-none print:h-screen print:shadow-none print:rounded-none print:border-none print:text-black">
        
        {/* Header - Screen Only */}
        <div className="flex justify-between items-center p-3 border-b border-slate-800 bg-slate-950 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
            <h2 className="text-sm font-mono tracking-widest text-cyan-400 uppercase">ATC-20 Placard // UPLINK: SECURE</h2>
          </div>
          <div className="flex space-x-2">
            <button onClick={handlePrint} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition" title="Print Placard">
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition" title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Placard Area */}
        <div className="flex-1 overflow-y-auto p-8 print:p-0 bg-slate-900 print:bg-white">
          <div className={`w-full h-40 ${colorClass} ${textColorClass} flex flex-col items-center justify-center text-center p-4 print:-webkit-print-color-adjust-exact shadow-inner`}>
            <h1 className="text-5xl font-black tracking-widest">{title}</h1>
            <h2 className="text-2xl font-bold mt-2 uppercase">{subtitle}</h2>
          </div>

          <div className="p-6 border-4 border-slate-700 print:border-black mt-4 print:mt-0 bg-slate-800/50 print:bg-white">
            <div className="grid grid-cols-2 gap-4 border-b-2 border-slate-700 print:border-black pb-4 mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 print:text-gray-500 uppercase tracking-widest font-mono">Building Name</p>
                <p className="text-lg font-semibold text-white print:text-black">{assessment.building_name}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 print:text-gray-500 uppercase tracking-widest font-mono">Coordinates</p>
                <p className="text-lg font-mono text-cyan-400 print:text-black">{assessment.latitude.toFixed(5)}, {assessment.longitude.toFixed(5)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b-2 border-slate-700 print:border-black pb-4 mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 print:text-gray-500 uppercase tracking-widest font-mono">Inspector ID</p>
                <p className="text-lg font-mono text-white print:text-black">{assessment.inspector_id}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 print:text-gray-500 uppercase tracking-widest font-mono">Date & Time</p>
                <p className="text-lg font-mono text-white print:text-black">{assessment.created_at ? new Date(assessment.created_at).toLocaleString() : 'N/A'}</p>
              </div>
            </div>

            <div className="mb-4 border-b-2 border-slate-700 print:border-black pb-4">
              <p className="text-xs font-bold text-slate-400 print:text-gray-500 uppercase tracking-widest font-mono mb-2">Structural Assessment</p>
              <div className="flex space-x-8">
                <div>
                  <span className="text-slate-400 print:text-gray-500 text-sm font-mono">Residual Capacity:</span>
                  <span className="ml-2 font-mono font-bold text-lg text-white print:text-black">{assessment.residual_capacity_score}%</span>
                </div>
                <div>
                  <span className="text-slate-400 print:text-gray-500 text-sm font-mono">Tilt:</span>
                  <span className="ml-2 font-mono font-bold text-lg text-white print:text-black">{assessment.tilt_degrees}°</span>
                </div>
                {isRed && (
                  <div>
                    <span className="text-slate-400 print:text-gray-500 text-sm font-mono">Collapse Radius:</span>
                    <span className="ml-2 font-mono font-bold text-lg text-red-400 print:text-red-600">{assessment.collapse_radius_meters}m</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-bold text-slate-400 print:text-gray-500 uppercase tracking-widest font-mono mb-2">Tactical Action Plan</p>
              <p className="font-semibold text-lg leading-relaxed text-white print:text-black">{assessment.incident_action_plan}</p>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-slate-700 print:border-black flex justify-between items-end">
              <div>
                <p className="text-xs font-bold text-slate-400 print:text-gray-500 uppercase tracking-widest font-mono mb-1">Verification QR</p>
                <div className="p-2 border border-slate-600 print:border-2 print:border-black inline-block bg-white rounded-sm">
                  <QRCodeSVG value={`AegisStructure || ID: ${assessment.id} || ${assessment.placard_status}`} size={80} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono text-slate-500 print:text-gray-400 tracking-widest mb-2">AEGIS_STRUCTURE_RESQ_VISION_2026</p>
                {assessment.override_badge_id && (
                  <p className="text-[10px] font-mono text-amber-500 uppercase tracking-widest">
                    OVERRIDE BY {assessment.override_badge_id}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Incident Commander Override Section */}
          <div className="mt-4 p-4 border border-amber-900/50 bg-amber-950/20 rounded print:hidden">
            {!isOverrideMode ? (
              <button 
                onClick={() => setIsOverrideMode(true)}
                className="text-amber-500 hover:text-amber-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2 transition"
              >
                <ShieldAlert className="w-4 h-4" /> Incident Commander Override
              </button>
            ) : (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-amber-500 font-mono text-xs uppercase tracking-widest mb-2 border-b border-amber-900/50 pb-2">
                  <ShieldAlert className="w-4 h-4" /> Incident Commander Override
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-amber-500/70 font-mono uppercase tracking-widest mb-1">Target Status</label>
                    <select 
                      value={overrideStatus}
                      onChange={(e) => setOverrideStatus(e.target.value)}
                      className="w-full bg-slate-900 border border-amber-900/50 text-white text-sm rounded p-2 outline-none focus:border-amber-500 font-mono"
                    >
                      <option value="GREEN_INSPECTED">GREEN_INSPECTED</option>
                      <option value="YELLOW_RESTRICTED">YELLOW_RESTRICTED</option>
                      <option value="RED_UNSAFE">RED_UNSAFE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-amber-500/70 font-mono uppercase tracking-widest mb-1">Authorized Badge ID</label>
                    <input 
                      type="text" 
                      value={badgeId}
                      onChange={(e) => setBadgeId(e.target.value)}
                      placeholder="e.g. CMD-ALPHA-01"
                      className="w-full bg-slate-900 border border-amber-900/50 text-white text-sm rounded p-2 outline-none focus:border-amber-500 font-mono uppercase"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] text-amber-500/70 font-mono uppercase tracking-widest mb-1">Override Justification</label>
                  <input 
                    type="text" 
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Field audit confirms..."
                    className="w-full bg-slate-900 border border-amber-900/50 text-white text-sm rounded p-2 outline-none focus:border-amber-500 font-sans"
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    onClick={() => setIsOverrideMode(false)}
                    className="px-3 py-1.5 rounded text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleOverrideSubmit}
                    disabled={isSubmitting || !badgeId || !justification}
                    className="px-4 py-1.5 rounded text-xs font-mono uppercase tracking-widest bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 transition"
                  >
                    {isSubmitting ? 'Verifying...' : 'Authorize Override'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: auto; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}} />
    </div>
  );
}
