import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Camera,
  Activity,
  Flame,
  Zap,
  HelpCircle,
  Dumbbell
} from 'lucide-react';
import { ScreenItem } from '../types/rehab';
import { SCREEN_VISUAL_GUIDES, ScreenVisualGuide } from '../data/screenVisualData';
import { ScreenAnatomyDiagram } from './ScreenAnatomyDiagram';

interface ScreenAnatomyModalProps {
  screen: ScreenItem;
  isFlagged: boolean;
  onToggleFlag: () => void;
  onClose: () => void;
  onNavigateScreen: (direction: 'prev' | 'next') => void;
  onPreview3D?: (muscleKeywords: string[], label: string) => void;
  currentIndex: number;
  totalScreens: number;
}

export const ScreenAnatomyModal: React.FC<ScreenAnatomyModalProps> = ({
  screen,
  isFlagged,
  onToggleFlag,
  onClose,
  onNavigateScreen,
  onPreview3D,
  currentIndex,
  totalScreens,
}) => {
  const [viewMode, setViewMode] = useState<'fault' | 'optimal'>('fault');

  // Load rich visual guide metadata or fallback to screen defaults
  const guide: ScreenVisualGuide = SCREEN_VISUAL_GUIDES[screen.id] || {
    id: screen.id,
    title: screen.name,
    category: screen.category,
    bodyRegions: screen.region,
    cameraAngle: 'Lateral or Anterior View',
    repsAndTempo: '5 slow repetitions at controlled tempo',
    whatToLookFor: [
      screen.instructions || 'Perform movement and observe joint alignment in mirror.',
      screen.compensationCues || 'Look for compensatory alignment shifts or joint deviations.',
    ],
    flaggedThreshold: 'Noticeable deviation or loss of neutral alignment during movement.',
    optimalForm: 'Smooth, pain-free movement maintaining optimal joint stacking and motor control.',
    biomechanicalRootCause: screen.compensationCues || 'Kinetic chain muscle imbalance.',
    keyMuscles: screen.implies.map((imp) => ({
      muscleId: imp.muscle,
      name: imp.muscle.replace(/_/g, ' '),
      role: imp.state,
      effect: imp.because,
    })),
    coachingCue: 'Focus on clean joint alignment through the complete active range of motion.',
    faultBadge: 'Compensation Observed',
    optimalBadge: 'Optimal Movement',
  };

  // Close on Escape & Navigate with arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        onNavigateScreen('prev');
      } else if (e.key === 'ArrowRight') {
        onNavigateScreen('next');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigateScreen]);

  // Handler to highlight all screen muscles in 3D
  const handlePreviewAll3D = () => {
    if (!onPreview3D) return;
    const allKeywords = screen.implies.map((imp) => imp.muscle);
    onPreview3D(allKeywords, screen.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside to close backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Main Modal Dialog Window */}
      <div className="relative z-10 w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* ========================================================================= */}
        {/* MODAL HEADER */}
        {/* ========================================================================= */}
        <div className="px-5 py-4 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {guide.category}
              </span>
              <div className="flex items-center gap-1">
                {guide.bodyRegions.map((reg) => (
                  <span
                    key={reg}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900 text-slate-400 border border-slate-800"
                  >
                    {reg}
                  </span>
                ))}
              </div>
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-xs text-slate-400 font-mono">
                Screen {currentIndex + 1} of {totalScreens}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white truncate leading-snug">
              {guide.title}
            </h2>
          </div>

          {/* Quick Pager & Close */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => onNavigateScreen('prev')}
                title="Previous Screen (Left Arrow)"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigateScreen('next')}
                title="Next Screen (Right Arrow)"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              title="Close Guide (Esc)"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL BODY (SCROLLABLE CONTENT) */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* 1. ANATOMY & BIOMECHANICAL SKELETON DIAGRAM */}
          <div>
            <ScreenAnatomyDiagram
              screenId={screen.id}
              viewMode={viewMode}
              onToggleMode={setViewMode}
              onPreview3D={handlePreviewAll3D}
            />
          </div>

          {/* 2. OBSERVATION & THRESHOLD CHECKLIST */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: What to Look For */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                <Camera className="w-4 h-4 text-purple-400" />
                What to Observe Before Ticking
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 font-semibold shrink-0">Camera Angle:</span>
                  <span className="text-slate-300">{guide.cameraAngle}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 font-semibold shrink-0">Reps & Tempo:</span>
                  <span className="text-slate-300">{guide.repsAndTempo}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Specific Observation Points:
                </span>
                {guide.whatToLookFor.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-xs text-rose-200 leading-relaxed">
                <strong className="text-rose-300 block mb-0.5">Threshold to Flag Box:</strong>
                {guide.flaggedThreshold}
              </div>
            </div>

            {/* Right: Biomechanics & Optimal Form */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Biomechanical Mechanism & Kinetic Chain
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {guide.biomechanicalRootCause}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-200 leading-relaxed mt-3">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Optimal Movement Pattern
                </div>
                {guide.optimalForm}
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed mt-2">
                <div className="flex items-center gap-1.5 text-purple-300 font-semibold mb-1">
                  <Dumbbell className="w-3.5 h-3.5 text-purple-400" /> Practical Coaching Cue
                </div>
                <span className="italic text-slate-200">{guide.coachingCue}</span>
              </div>
            </div>
          </div>

          {/* 3. KEY MUSCLES & ANATOMICAL ROLES MATRIX */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                <HelpCircle className="w-4 h-4 text-purple-400" />
                Involved Musculature & Force Couples
              </div>
              <span className="text-[11px] text-slate-400">
                {guide.keyMuscles.length} key anatomical structures
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {guide.keyMuscles.map((m) => {
                const isShort = m.role === 'short';
                return (
                  <div
                    key={m.muscleId}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800/90 flex flex-col justify-between space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold text-white capitalize">
                          {m.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border flex items-center gap-1 ${
                            isShort
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          }`}
                        >
                          {isShort ? (
                            <>
                              <Flame className="w-3 h-3 text-rose-400" /> Short / Tonic
                            </>
                          ) : (
                            <>
                              <Zap className="w-3 h-3 text-cyan-400" /> Inhibited / Phasic
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {m.effect}
                      </p>
                    </div>

                    {onPreview3D && (
                      <button
                        type="button"
                        onClick={() => onPreview3D([m.muscleId], m.name)}
                        className="text-[10px] font-semibold text-purple-400 hover:text-purple-300 self-start flex items-center gap-1 pt-1"
                      >
                        <Sparkles className="w-3 h-3" /> Focus {m.name} in 3D
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER ACTION BAR */}
        {/* ========================================================================= */}
        <div className="px-5 py-4 bg-slate-900/95 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full shrink-0 ${
                isFlagged ? 'bg-purple-500 shadow-sm shadow-purple-500/80 animate-pulse' : 'bg-slate-700'
              }`}
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-300">Screen Status: </span>
              {isFlagged ? (
                <span className="text-purple-300 font-bold">
                  Flagged as Compensation (Finding Marked)
                </span>
              ) : (
                <span className="text-slate-400">
                  Not Flagged (Unchecked)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onPreview3D && (
              <button
                type="button"
                onClick={handlePreviewAll3D}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Preview 3D Avatar
              </button>
            )}

            {/* Primary Toggle / Tick Button */}
            <button
              type="button"
              id="modal-toggle-flag-btn"
              onClick={onToggleFlag}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg ${
                isFlagged
                  ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/80 shadow-rose-950/40'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40'
              }`}
            >
              {isFlagged ? (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  Unflag Finding (Untick Box)
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  Flag Compensation & Tick Box
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
