import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ClipboardList,
  Sliders,
  ChevronRight,
  Flame,
  Zap,
  RotateCcw,
  Printer,
  Sparkles,
  Dumbbell,
  Clock,
  Eye,
  Crosshair,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import {
  RED_FLAGS,
  SCREENS,
  SYMPTOM_REGIONS,
  assessClient,
  saveAssessmentToStorage,
  loadAssessmentHistory,
  getMeshKeywordsForMuscle,
} from '../services/assessmentEngine';
import {
  AssessmentResult,
  AssessmentHistoryItem,
  MuscleHypothesis,
  ImbalancePair,
  PrescribedExercise,
  PainSite,
} from '../types/rehab';
import { ScreenAnatomyModal } from './ScreenAnatomyModal';

interface AssessmentEngineViewProps {
  onHighlightMeshes: (highlights: { keywords: string[]; color: string; label: string }[]) => void;
  onSetCameraRegion: (region: 'full' | 'torso' | 'lower') => void;
  activePainSites: PainSite[];
  onAddPainSite: (region: string, severity: number) => void;
  onRemovePainSite: (id: string) => void;
}

export function AssessmentEngineView({
  onHighlightMeshes,
  onSetCameraRegion,
  activePainSites,
  onAddPainSite,
  onRemovePainSite,
}: AssessmentEngineViewProps) {
  // Navigation
  const [activeStep, setActiveStep] = useState<'intake' | 'safety' | 'screens' | 'analysis' | 'program' | 'history'>('intake');

  // Assessment State
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['low back', 'hip']);
  const [painLevel, setPainLevel] = useState<number>(4);
  const [provocativeMovement, setProvocativeMovement] = useState<string>('Squat');
  const [painPhase, setPainPhase] = useState<string>('Eccentric (Descent)');
  
  // Red Flag answers: record of flag ID -> boolean
  const [redFlagAnswers, setRedFlagAnswers] = useState<Record<string, boolean>>({});

  // Movement Screen findings: set of screen IDs selected
  const [screenFindings, setScreenFindings] = useState<string[]>([
    'anterior_pelvic_tilt',
    'overhead_squat_knees_in',
  ]);

  // Screen category filter
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Assessment Results
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(() => {
    return assessClient({
      findings: ['anterior_pelvic_tilt', 'overhead_squat_knees_in'],
      symptomRegions: ['low back', 'hip'],
      painLevel: 4,
      redFlagAnswers: {},
    });
  });

  // Client History
  const [history, setHistory] = useState<AssessmentHistoryItem[]>(() => loadAssessmentHistory());
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<AssessmentHistoryItem | null>(null);

  // Active highlighted hypothesis or pair in 3D
  const [active3DSelection, setActive3DSelection] = useState<string | null>(null);

  // Pop-out Movement Screen Visual Guide Modal
  const [activeModalScreenId, setActiveModalScreenId] = useState<string | null>(null);

  const modalScreen = useMemo(() => {
    if (!activeModalScreenId) return null;
    return SCREENS.find((s) => s.id === activeModalScreenId) || null;
  }, [activeModalScreenId]);

  const modalScreenIndex = useMemo(() => {
    if (!activeModalScreenId) return -1;
    return SCREENS.findIndex((s) => s.id === activeModalScreenId);
  }, [activeModalScreenId]);

  const handleNavigateModalScreen = (direction: 'prev' | 'next') => {
    if (modalScreenIndex === -1) return;
    const total = SCREENS.length;
    const nextIdx =
      direction === 'next'
        ? (modalScreenIndex + 1) % total
        : (modalScreenIndex - 1 + total) % total;
    setActiveModalScreenId(SCREENS[nextIdx].id);
  };

  const handlePreviewMusclesIn3D = (muscleKeywords: string[], label: string) => {
    const highlights: { keywords: string[]; color: string; label: string }[] = [];
    muscleKeywords.forEach((m) => {
      const kws = getMeshKeywordsForMuscle(m);
      highlights.push({
        keywords: kws,
        color: '#f43f5e',
        label: label || m,
      });
    });
    if (highlights.length > 0) {
      onHighlightMeshes(highlights);
    }
  };

  // Run or Refresh Analysis
  const runAnalysis = () => {
    const res = assessClient({
      findings: screenFindings,
      symptomRegions: selectedRegions,
      painLevel,
      redFlagAnswers,
    });
    setAssessmentResult(res);

    if (res.safe) {
      const saved = saveAssessmentToStorage(res, selectedRegions);
      setHistory(loadAssessmentHistory());
    }

    setActiveStep('analysis');
  };

  // Toggle Region
  const toggleRegion = (reg: string) => {
    setSelectedRegions((prev) => {
      const exists = prev.includes(reg);
      const next = exists ? prev.filter((r) => r !== reg) : [...prev, reg];
      if (!exists) {
        onAddPainSite(reg, painLevel);
      }
      return next;
    });
  };

  // Toggle Finding
  const toggleFinding = (id: string) => {
    setScreenFindings((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  // Check Red Flag count
  const redFlagCount = useMemo(() => {
    return Object.values(redFlagAnswers).filter(Boolean).length;
  }, [redFlagAnswers]);

  // Filtered Screens
  const filteredScreens = useMemo(() => {
    if (selectedCategory === 'All') return SCREENS;
    return SCREENS.filter((s) => s.category === selectedCategory);
  }, [selectedCategory]);

  // Categories
  const categories = ['All', 'Lower Extremity', 'Lumbo-Pelvic & Core', 'Scapulo-Thoracic', 'Cervical & Head', 'Upper Extremity'];

  // Highlight a specific hypothesis on the 3D avatar
  const highlightHypothesis3D = (h: MuscleHypothesis) => {
    setActive3DSelection(h.muscleId);
    const keywords = getMeshKeywordsForMuscle(h.muscleId);
    const color = h.state === 'short' ? '#f97316' : '#06b6d4';
    onHighlightMeshes([{ keywords, color, label: h.muscle }]);

    // Move camera appropriately
    if (['hip', 'thigh', 'calf', 'ankle', 'knee'].includes(h.region.toLowerCase())) {
      onSetCameraRegion('lower');
    } else {
      onSetCameraRegion('torso');
    }
  };

  // Highlight an entire antagonist pair on the 3D avatar
  const highlightPair3D = (pair: ImbalancePair) => {
    setActive3DSelection(`${pair.shortId}_vs_${pair.weakId}`);
    const shortKeywords = getMeshKeywordsForMuscle(pair.shortId);
    const weakKeywords = getMeshKeywordsForMuscle(pair.weakId);

    onHighlightMeshes([
      { keywords: shortKeywords, color: '#f97316', label: `${pair.short} (Overactive)` },
      { keywords: weakKeywords, color: '#06b6d4', label: `${pair.weak} (Inhibited)` },
    ]);

    if (['hip', 'thigh', 'calf'].includes(pair.shortId) || pair.weakId.includes('glute')) {
      onSetCameraRegion('lower');
    } else {
      onSetCameraRegion('torso');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 overflow-hidden select-none">
      {/* TOP SUB-NAVIGATION */}
      <div className="px-5 py-3 border-b border-gray-800 bg-gray-900/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">Movement Screen & Prehab Engine</h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Coach & Trainer Mode
              </span>
            </div>
            <p className="text-xs text-gray-400">Functional movement screening, red-flag safety triage, and 3D kinetic balance</p>
          </div>
        </div>

        {/* WORKFLOW TABS */}
        <div className="flex bg-gray-950 p-1 rounded-xl border border-gray-800 gap-1 text-xs">
          <button
            id="tab-btn-intake"
            onClick={() => setActiveStep('intake')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeStep === 'intake' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            1. Movement Intake
          </button>
          <button
            id="tab-btn-safety"
            onClick={() => setActiveStep('safety')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeStep === 'safety'
                ? 'bg-purple-600 text-white shadow-sm'
                : redFlagCount > 0
                ? 'text-red-400 font-semibold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            2. Red Flags (Safety)
            {redFlagCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {redFlagCount}
              </span>
            )}
          </button>
          <button
            id="tab-btn-screens"
            onClick={() => setActiveStep('screens')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeStep === 'screens' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            3. Movement Screens
            <span className="px-1.5 py-0.2 rounded-full bg-gray-800 text-[10px] text-gray-300">
              {screenFindings.length}
            </span>
          </button>
          <button
            id="tab-btn-analysis"
            onClick={runAnalysis}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeStep === 'analysis' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-400 hover:text-purple-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            4. 3D Movement Analysis
          </button>
          <button
            id="tab-btn-program"
            onClick={() => setActiveStep('program')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeStep === 'program' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            5. Corrective Plan
          </button>
          <button
            id="tab-btn-history"
            onClick={() => setActiveStep('history')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeStep === 'history' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            History ({history.length})
          </button>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ========================================================================= */}
        {/* STEP 1: PAIN & SYMPTOM INTAKE */}
        {/* ========================================================================= */}
        {activeStep === 'intake' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header info */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-purple-400" />
                Symptom & Pain Mapping
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Select your symptomatic body zones or click directly on the 3D anatomy viewer to record acute or recurring pain sites.
              </p>

              {/* Symptom Regions Grid */}
              <div className="mt-5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-3">
                  Reported Symptom Areas
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {Object.keys(SYMPTOM_REGIONS).map((reg) => {
                    const isSelected = selectedRegions.includes(reg);
                    return (
                      <button
                        key={reg}
                        id={`btn-region-${reg.replace(/\s+/g, '-')}`}
                        onClick={() => toggleRegion(reg)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all border ${
                          isSelected
                            ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-900/30'
                            : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                        }`}
                      >
                        {reg}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pain VAS Slider */}
              <div className="mt-8 pt-6 border-t border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Current Discomfort Intensity (Visual Analog Scale 0–10)
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {painLevel === 0 && 'Pain-free / Pure performance prehab screen'}
                      {painLevel >= 1 && painLevel <= 3 && 'Mild ache — noticeably stiff, but doesn’t restrict movement'}
                      {painLevel >= 4 && painLevel <= 6 && 'Moderate pain — interferes with lifting, sitting, or running'}
                      {painLevel >= 7 && 'Severe acute discomfort — protective guarding and significant limitation'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-2xl font-black ${
                        painLevel >= 7 ? 'text-red-400' : painLevel >= 4 ? 'text-orange-400' : 'text-emerald-400'
                      }`}
                    >
                      {painLevel}/10
                    </span>
                  </div>
                </div>

                <input
                  id="pain-severity-slider"
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={painLevel}
                  onChange={(e) => setPainLevel(parseInt(e.target.value, 10))}
                  className="w-full accent-purple-500 bg-gray-800 h-2.5 rounded-lg appearance-none cursor-pointer"
                />

                <div className="flex justify-between text-[11px] font-semibold text-gray-500 mt-2">
                  <span>0 - None</span>
                  <span>3 - Mild</span>
                  <span>6 - Moderate</span>
                  <span>10 - Unbearable</span>
                </div>
              </div>

              {/* Movement & Phase Cues */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-800">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                    Primary Provocative Movement
                  </label>
                  <select
                    id="select-provocative-movement"
                    value={provocativeMovement}
                    onChange={(e) => setProvocativeMovement(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-purple-500"
                  >
                    <option value="Squat">Squat / Deep Knee Flexion</option>
                    <option value="Hinge">Hip Hinge / Deadlift / Forward Bend</option>
                    <option value="Lunge">Single-Leg Lunge / Step-Up</option>
                    <option value="Overhead">Overhead Press / Reach</option>
                    <option value="Rotation">Trunk Rotation / Golf / Tennis Swing</option>
                    <option value="Sitting">Prolonged Desk Sitting / Commute</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                    Provocative Movement Phase
                  </label>
                  <select
                    id="select-pain-phase"
                    value={painPhase}
                    onChange={(e) => setPainPhase(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-purple-500"
                  >
                    <option value="Eccentric (Descent)">Eccentric (Yielding / Descent)</option>
                    <option value="Isometric (Bottom)">Isometric (Deepest Joint Angle)</option>
                    <option value="Concentric (Ascent)">Concentric (Push / Drive / Acceleration)</option>
                    <option value="Post-Workout">Post-Activity / Morning Stiffness</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Next Step Action */}
            <div className="flex justify-end">
              <button
                id="btn-next-safety"
                onClick={() => setActiveStep('safety')}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-purple-900/30"
              >
                Proceed to Red Flag Safety Screen <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: SAFETY & RED FLAGS SCREEN */}
        {/* ========================================================================= */}
        {activeStep === 'safety' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className={`w-5 h-5 ${redFlagCount > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
                  <div>
                    <h3 className="text-base font-semibold text-white">Trainer Safety Screening & Red Flag Triage</h3>
                    <p className="text-xs text-gray-400">
                      Standard scope-of-practice screening for coaches and trainers. Any positive answer indicates potential medical conditions requiring licensed medical clearance before exercising.
                    </p>
                  </div>
                </div>

                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    redFlagCount > 0
                      ? 'bg-red-500/20 text-red-400 border-red-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  }`}
                >
                  {redFlagCount > 0 ? `${redFlagCount} Alert(s) Triggered` : 'Safety Cleared'}
                </div>
              </div>

              {/* Red Flag Checklist */}
              <div className="space-y-3 mt-6">
                {RED_FLAGS.map((flag) => {
                  const isChecked = !!redFlagAnswers[flag.id];
                  return (
                    <div
                      key={flag.id}
                      onClick={() =>
                        setRedFlagAnswers((prev) => ({
                          ...prev,
                          [flag.id]: !prev[flag.id],
                        }))
                      }
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 ${
                        isChecked
                          ? 'bg-red-950/40 border-red-500/50 shadow-md shadow-red-950/40'
                          : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 w-4 h-4 rounded accent-red-500 bg-gray-900 border-gray-700 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-200">{flag.q}</p>
                          {flag.urgency === 'emergency' && (
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-red-600 text-white">
                              Emergency
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          <strong className="text-gray-300">Safety Rationale:</strong> {flag.why}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {redFlagCount > 0 && (
                <div className="mt-6 p-4 rounded-xl bg-red-900/30 border border-red-500/50 flex items-start gap-3 text-red-200 text-xs leading-relaxed">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-sm font-bold text-red-300 mb-1">
                      Medical Referral Required (Out of Coaching Scope)
                    </strong>
                    Based on reported symptoms, continuing with corrective exercise without medical clearance is contraindicated. Please refer the client to a qualified physician or licensed physical therapist for medical evaluation and clearance.
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Actions */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setActiveStep('intake')}
                className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-semibold border border-gray-800 transition-colors"
              >
                Back to Intake
              </button>
              <button
                id="btn-next-screens"
                onClick={() => setActiveStep('screens')}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-purple-900/30"
              >
                Continue to Movement Screens <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: MOVEMENT & ORTHOPEDIC SCREENS */}
        {/* ========================================================================= */}
        {activeStep === 'screens' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-semibold text-white">Functional Movement & Posture Screens</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Perform these standard assessments in front of a mirror or camera. Check any compensation you observe.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">Marked findings:</span>
                  <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                    {screenFindings.length} active
                  </span>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedCategory === cat
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-gray-950 text-gray-400 border border-gray-800 hover:text-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Informative Pop-out Guidance Banner */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-950/40 border border-purple-800/50 text-xs text-purple-200 mb-6">
                <Eye className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  <strong>Visual Movement Examples:</strong> Click <span className="font-semibold text-white underline">"View Anatomy Example &amp; What to Look For"</span> on any screen below to open a pop-out window showing visual diagrams of the flagged compensation, key observation cues, and underlying muscle anatomy before ticking the box.
                </span>
              </div>

              {/* Screen Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredScreens.map((screen) => {
                  const isChecked = screenFindings.includes(screen.id);
                  return (
                    <div
                      key={screen.id}
                      onClick={() => toggleFinding(screen.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isChecked
                          ? 'bg-purple-950/30 border-purple-500/60 shadow-md shadow-purple-950/30'
                          : 'bg-gray-950 border-gray-800/80 hover:border-gray-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-sm font-semibold text-gray-100 leading-snug">{screen.name}</h4>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-1 w-4 h-4 rounded accent-purple-500 bg-gray-900 border-gray-700 cursor-pointer shrink-0"
                          />
                        </div>

                        {screen.instructions && (
                          <div className="mt-2.5 text-xs text-gray-400">
                            <span className="text-gray-300 font-semibold">Test: </span>
                            {screen.instructions}
                          </div>
                        )}

                        {screen.compensationCues && (
                          <div className="mt-1.5 text-xs text-purple-300/90 italic">
                            <span className="font-semibold text-purple-400 not-italic">Significance: </span>
                            {screen.compensationCues}
                          </div>
                        )}

                        {/* Link to Pop-out Anatomy & Movement Example */}
                        <div className="mt-3 pt-2.5 border-t border-gray-800/80 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveModalScreenId(screen.id);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 hover:text-white bg-purple-900/50 hover:bg-purple-800/70 border border-purple-700/60 hover:border-purple-500/80 px-2.5 py-1.5 rounded-lg transition-all shadow-sm"
                            title="View anatomy illustration and what to look for before ticking"
                          >
                            <Eye className="w-3.5 h-3.5 text-purple-400" />
                            <span>View Anatomy Example &amp; What to Look For</span>
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-gray-800/60 flex items-center justify-between text-[11px] text-gray-400">
                        <span className="px-2 py-0.5 rounded bg-gray-900 text-gray-300 font-medium">
                          {screen.category}
                        </span>
                        <span className="text-purple-400">
                          {screen.implies.length} anatomical hypotheses
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Run Analysis Action */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setActiveStep('safety')}
                className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-semibold border border-gray-800 transition-colors"
              >
                Back to Red Flags
              </button>
              <button
                id="btn-compute-analysis"
                onClick={runAnalysis}
                className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all flex items-center gap-2.5 shadow-xl shadow-emerald-950/50"
              >
                <Sparkles className="w-4 h-4" />
                Compute 3D Anatomical Analysis
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: 3D ANATOMICAL ANALYSIS & MOVEMENT IMBALANCES */}
        {/* ========================================================================= */}
        {activeStep === 'analysis' && assessmentResult && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Safety Banner */}
            {!assessmentResult.safe && (
              <div className="p-5 rounded-2xl bg-red-950/40 border border-red-500/50 text-red-200">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldAlert className="w-6 h-6 text-red-400" />
                  <h4 className="text-base font-bold text-red-300">
                    Medical Referral Alert: Corrective Routine Paused
                  </h4>
                </div>
                <p className="text-xs leading-relaxed text-red-300/90">
                  {assessmentResult.redFlags.action}
                </p>
                <div className="mt-3 text-xs bg-red-900/30 p-3 rounded-lg border border-red-800/40">
                  <strong>Triggered Red Flags:</strong>
                  <ul className="list-disc ml-5 mt-1 space-y-1">
                    {assessmentResult.redFlags.triggered.map((t) => (
                      <li key={t.id}>{t.q}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Antagonist Imbalance Pairs (Reciprocal Inhibition) */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-bold text-white">Antagonist Imbalance Pairs & Kinetic Chains</h3>
                </div>
                <span className="text-xs text-gray-400">Reciprocal inhibition relationships</span>
              </div>
              <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                Postural dysfunction rarely stems from a single isolated muscle. When a tonic muscle is chronically shortened and overactive, it neurologically down-regulates its opposing phasic partner. Click any pair below to highlight both in the 3D viewer.
              </p>

              {assessmentResult.imbalancePairs.length === 0 ? (
                <div className="p-4 rounded-xl bg-gray-950 text-center text-xs text-gray-500">
                  No pronounced antagonist imbalance pairs identified from the current findings.
                </div>
              ) : (
                <div className="space-y-4">
                  {assessmentResult.imbalancePairs.map((pair, idx) => {
                    const isSelected = active3DSelection === `${pair.shortId}_vs_${pair.weakId}`;
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-950/40'
                            : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 rounded-md bg-orange-500/20 text-orange-400 text-xs font-bold border border-orange-500/30 flex items-center gap-1.5">
                              <Flame className="w-3.5 h-3.5" />
                              Short: {pair.short}
                            </span>
                            <span className="text-gray-500 text-xs font-bold">⇄</span>
                            <span className="px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/30 flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5" />
                              Inhibited: {pair.weak}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 font-mono">
                              Combined Confidence: {pair.combinedConfidence}%
                            </span>
                            <button
                              onClick={() => highlightPair3D(pair)}
                              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-purple-300 border border-purple-500/30 transition-colors flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" /> Highlight 3D
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-gray-300 leading-relaxed bg-gray-900/60 p-3 rounded-lg border border-gray-800/60">
                          {pair.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ranked Musculoskeletal Hypotheses */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Ranked Musculoskeletal Hypotheses</h3>
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  {assessmentResult.hypotheses.length} Identified Structures
                </span>
              </div>

              <div className="space-y-3">
                {assessmentResult.hypotheses.map((h) => {
                  const isSelected = active3DSelection === h.muscleId;
                  const isShort = h.state === 'short';
                  return (
                    <div
                      key={h.muscleId}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-purple-950/40 border-purple-500'
                          : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h4 className="text-sm font-bold text-white">{h.muscle}</h4>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isShort
                                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              }`}
                            >
                              {h.stateLabel}
                            </span>
                            <span className="text-[11px] text-gray-500 capitalize">{h.region}</span>
                          </div>

                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="w-32 bg-gray-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isShort ? 'bg-orange-500' : 'bg-cyan-500'
                                }`}
                                style={{ width: `${h.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-gray-400">
                              {h.confidence}% Confidence ({h.confidenceLabel})
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => highlightHypothesis3D(h)}
                          className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 border border-gray-700 transition-colors flex items-center gap-1.5 self-start sm:self-center"
                        >
                          <Crosshair className="w-3.5 h-3.5 text-purple-400" />
                          Focus 3D Mesh
                        </button>
                      </div>

                      {/* Evidence Details */}
                      <div className="mt-3 pt-3 border-t border-gray-800/80">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                          Screening Observations Supporting This Imbalance:
                        </span>
                        <ul className="space-y-1">
                          {h.reasons.map((r, i) => (
                            <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                              <span className="text-purple-400 mt-0.5">•</span>
                              <span>
                                <strong className="text-gray-200">{r.source}:</strong> {r.because}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setActiveStep('screens')}
                className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-semibold border border-gray-800 transition-colors"
              >
                Modify Screens
              </button>
              <button
                id="btn-view-program"
                onClick={() => setActiveStep('program')}
                className="px-7 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-purple-900/30"
              >
                <Dumbbell className="w-4 h-4" />
                Generate Corrective Mobility & Strength Routine
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: TARGETED CORRECTIVE MOBILITY & STRENGTH PROTOCOL */}
        {/* ========================================================================= */}
        {activeStep === 'program' && assessmentResult?.program && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base font-bold text-white">Targeted Corrective Routine</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Phase: {assessmentResult.program.stage}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Targeted corrective programming strictly respecting reciprocal inhibition: overactive tissues receive release & lengthening, while inhibited muscles receive motor activation and loaded strength.
                  </p>
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 border border-gray-700 transition-colors flex items-center gap-2 shrink-0 self-start"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Export Routine
                </button>
              </div>

              {/* Safety Rule Callout */}
              <div className="mb-6 p-4 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200 leading-relaxed flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" />
                <span>
                  <strong>Biomechanical Safety Enforced:</strong> Weak, overstretched tissues are never prescribed lengthening. Aching rhomboids or protectively lengthened hamstrings will receive activation and strength through full range, preventing postural worsening.
                </span>
              </div>

              {/* Exercise Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assessmentResult.program.exercises.map((ex) => {
                  const modeColor =
                    ex.mode === 'activate'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : ex.mode === 'strengthen'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : ex.mode === 'lengthen'
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                      : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';

                  return (
                    <div
                      key={ex.id}
                      className="p-5 rounded-xl bg-gray-950 border border-gray-800 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="text-sm font-bold text-white">{ex.name}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${modeColor}`}>
                            {ex.mode}
                          </span>
                        </div>

                        <div className="text-xs text-emerald-400 font-mono font-semibold mb-3 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Dose: {ex.dose}
                        </div>

                        <div className="text-xs text-gray-400 mb-3">
                          <strong className="text-gray-300">Target Anatomy: </strong>
                          {ex.addressesMuscles.join(', ')}
                        </div>

                        <div className="space-y-1.5 bg-gray-900/60 p-3 rounded-lg border border-gray-800/60">
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                            Key Execution Cues:
                          </span>
                          <ul className="space-y-1">
                            {ex.cues.map((c, i) => (
                              <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                                <span className="text-emerald-400">•</span>
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {ex.contraindications.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-800 text-[11px] text-red-400/90 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Avoid if: {ex.contraindications.join('; ')}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setActiveStep('analysis')}
                className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-semibold border border-gray-800 transition-colors"
              >
                Back to 3D Movement Analysis
              </button>
              <button
                onClick={() => setActiveStep('history')}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-900/30"
              >
                View Assessment History & Progress
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 6: CLIENT HISTORY & AUDIT TRAIL */}
        {/* ========================================================================= */}
        {activeStep === 'history' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-white">Client Assessment History & Progress Log</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Track your pain reduction trends and kinetic balance shifts across repeat assessments.
                  </p>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('mobilis_client_assessment_history_v1');
                    setHistory([]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-red-950/40 text-gray-400 hover:text-red-400 text-xs font-medium border border-gray-800 transition-colors"
                >
                  Clear History
                </button>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-xs">
                  No saved assessments found yet. Complete an intake and run the analysis to log your baseline.
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-gray-950 border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-white">
                            {new Date(item.timestamp).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.painLevel >= 7
                                ? 'bg-red-500/20 text-red-400'
                                : item.painLevel >= 4
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            VAS: {item.painLevel}/10
                          </span>
                          {item.safe ? (
                            <span className="text-[10px] text-emerald-400 font-semibold">Cleared</span>
                          ) : (
                            <span className="text-[10px] text-red-400 font-semibold">Red Flag</span>
                          )}
                        </div>

                        <div className="mt-2 text-xs text-gray-400 flex flex-wrap gap-2">
                          <span>Regions: {item.symptomRegions.join(', ')}</span>
                          {item.primaryImbalance && (
                            <span className="text-purple-400">• Primary: {item.primaryImbalance}</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setAssessmentResult(item.result);
                          setPainLevel(item.painLevel);
                          setSelectedRegions(item.symptomRegions);
                          setActiveStep('analysis');
                        }}
                        className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 border border-gray-700 transition-colors self-start sm:self-center"
                      >
                        Load Assessment
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-start">
              <button
                onClick={() => setActiveStep('intake')}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all"
              >
                Start New Assessment
              </button>
            </div>
          </div>
        )}

        {/* Pop-out Window: Movement Screen Anatomy & Visual Example */}
        {modalScreen && (
          <ScreenAnatomyModal
            screen={modalScreen}
            isFlagged={screenFindings.includes(modalScreen.id)}
            onToggleFlag={() => toggleFinding(modalScreen.id)}
            onClose={() => setActiveModalScreenId(null)}
            onNavigateScreen={handleNavigateModalScreen}
            onPreview3D={handlePreviewMusclesIn3D}
            currentIndex={modalScreenIndex}
            totalScreens={SCREENS.length}
          />
        )}
      </div>
    </div>
  );
}
