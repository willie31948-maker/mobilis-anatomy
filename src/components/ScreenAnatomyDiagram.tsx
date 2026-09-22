import React from 'react';
import { AlertCircle, CheckCircle2, Eye, Sparkles } from 'lucide-react';

interface ScreenAnatomyDiagramProps {
  screenId: string;
  viewMode: 'fault' | 'optimal';
  onToggleMode: (mode: 'fault' | 'optimal') => void;
  onPreview3D?: () => void;
}

export const ScreenAnatomyDiagram: React.FC<ScreenAnatomyDiagramProps> = ({
  screenId,
  viewMode,
  onToggleMode,
  onPreview3D,
}) => {
  const isFault = viewMode === 'fault';

  return (
    <div className="relative w-full rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden shadow-2xl flex flex-col">
      {/* Visual Header Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            Biomechanical Anatomy Visual
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
              isFault
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {isFault ? 'Flagged Compensation' : 'Optimal Reference'}
          </span>
        </div>

        {/* View Mode Toggle Pill */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => onToggleMode('fault')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              isFault
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Flagged Fault
          </button>
          <button
            type="button"
            onClick={() => onToggleMode('optimal')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              !isFault
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Optimal Form
          </button>
        </div>
      </div>

      {/* Main SVG Anatomy Viewport */}
      <div className="relative w-full h-72 sm:h-80 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950 flex items-center justify-center p-4">
        {/* Subtle coordinate grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Dynamic SVG Biomechanical Renderer */}
        <svg
          viewBox="0 0 600 320"
          className="w-full h-full max-h-80 select-none overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="shortMuscleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="weakMuscleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="optimalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.9" />
            </linearGradient>
            <filter id="glowShort" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f43f5e" floodOpacity="0.6" />
            </filter>
            <filter id="glowWeak" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#06b6d4" floodOpacity="0.6" />
            </filter>
            <filter id="glowOptimal" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Render Specific Diagram by Screen ID */}
          {renderBiomechanicalDiagram(screenId, isFault)}
        </svg>

        {/* Floating In-Diagram Legend & Quick 3D Preview */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px]">
            {isFault ? (
              <>
                <span className="flex items-center gap-1.5 text-rose-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                  Short / Overactive
                </span>
                <span className="text-slate-600">|</span>
                <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                  Inhibited / Weak
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                Balanced Kinetic Symmetry
              </span>
            )}
          </div>

          {onPreview3D && (
            <button
              type="button"
              onClick={onPreview3D}
              className="bg-purple-900/80 hover:bg-purple-800 text-purple-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-purple-500/40 shadow-lg shadow-purple-950/50 flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              Preview in 3D Avatar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// BIOMECHANICAL DIAGRAM DISPATCHER
// =============================================================================
function renderBiomechanicalDiagram(screenId: string, isFault: boolean) {
  switch (screenId) {
    case 'overhead_squat_heels':
      return <OverheadSquatHeelsDiagram isFault={isFault} />;
    case 'overhead_squat_knees_in':
      return <OverheadSquatKneesInDiagram isFault={isFault} />;
    case 'single_leg_pelvic_drop':
      return <TrendelenburgPelvicDropDiagram isFault={isFault} />;
    case 'sit_and_reach_limited':
      return <ToeTouchHamstringDiagram isFault={isFault} />;
    case 'anterior_pelvic_tilt':
      return <AnteriorPelvicTiltDiagram isFault={isFault} />;
    case 'thomas_test_positive':
      return <ThomasTestDiagram isFault={isFault} />;
    case 'prone_hip_extension_hamstring_first':
      return <ProneHipExtensionDiagram isFault={isFault} />;
    case 'overhead_squat_arms_fall':
      return <OverheadSquatArmsFallDiagram isFault={isFault} />;
    case 'rounded_shoulders':
      return <RoundedShouldersDiagram isFault={isFault} />;
    case 'scapular_winging':
      return <ScapularWingingDiagram isFault={isFault} />;
    case 'painful_arc':
      return <PainfulArcDiagram isFault={isFault} />;
    case 'shrug_on_arm_raise':
      return <ShrugOnArmRaiseDiagram isFault={isFault} />;
    case 'forward_head':
      return <ForwardHeadDiagram isFault={isFault} />;
    case 'neck_rotation_limited':
      return <NeckRotationDiagram isFault={isFault} />;
    case 'chest_breathing':
      return <ApicalBreathingDiagram isFault={isFault} />;
    case 'lateral_elbow_pain_gripping':
      return <LateralElbowDiagram isFault={isFault} />;
    case 'medial_elbow_pain_gripping':
      return <MedialElbowDiagram isFault={isFault} />;
    case 'grip_fatigue_desk':
      return <GripFatigueDiagram isFault={isFault} />;
    default:
      return <DefaultBiomechDiagram isFault={isFault} />;
  }
}

// =============================================================================
// 1. OVERHEAD SQUAT: HEELS LIFT / TORSO PITCH (ANATOMICALLY ACCURATE SKELETON)
// =============================================================================
function OverheadSquatHeelsDiagram({ isFault }: { isFault: boolean }) {
  return (
    <g id="diagram-squat-heels">
      {/* Ground Plane */}
      <line x1="40" y1="275" x2="560" y2="275" stroke="#475569" strokeWidth="2" />
      <text x="550" y="292" fill="#64748b" fontSize="10" textAnchor="end">Ground Plane</text>

      {isFault ? (
        /* ==================== FAULT STATE (HEELS LIFT + EXCESSIVE FORWARD PITCH) ==================== */
        <g id="squat-heels-fault">
          {/* Plantar Footbed with Elevated Calcaneus / Heel Lift */}
          <path
            d="M 165 275 L 245 245 L 240 238 L 175 268 Z"
            fill="#1e293b"
            stroke="#f43f5e"
            strokeWidth="2.5"
          />
          <circle cx="240" cy="242" r="3.5" fill="#f43f5e" />

          {/* Heel Lift Elevation Gap Indicator */}
          <line x1="245" y1="275" x2="245" y2="246" stroke="#f43f5e" strokeWidth="2" strokeDasharray="2 2" />
          <path d="M 240 246 L 250 246 M 240 275 L 250 275" stroke="#f43f5e" strokeWidth="2" />
          <polygon points="245,246 242,253 248,253" fill="#f43f5e" />

          {/* Hyperactive / Short Calf Muscle (Gastrocnemius & Soleus) */}
          <path
            d="M 238 238 Q 248 210 228 185 Q 212 215 238 238"
            fill="url(#shortMuscleGrad)"
            filter="url(#glowShort)"
          />

          {/* Tibia & Fibula (Shin - Vertical / Restricted Dorsiflexion) */}
          <line x1="238" y1="238" x2="222" y2="185" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
          <line x1="244" y1="236" x2="228" y2="188" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />

          {/* Patella & Knee Joint */}
          <circle cx="218" cy="185" r="5" fill="#38bdf8" />
          <circle cx="222" cy="185" r="7" fill="#f43f5e" stroke="#0f172a" strokeWidth="1.5" />

          {/* Weak / Strained Tibialis Anterior */}
          <path
            d="M 175 268 Q 192 230 218 188"
            stroke="#06b6d4"
            strokeWidth="3"
            strokeDasharray="3 3"
            fill="none"
            filter="url(#glowWeak)"
          />

          {/* Femur (Thigh) - Excessive horizontal pushback */}
          <line x1="222" y1="185" x2="330" y2="202" stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />

          {/* Anatomical Pelvis & Acetabulum */}
          <path
            d="M 320 188 Q 345 192 342 210 Q 325 212 315 200 Z"
            fill="#1e293b"
            stroke="#f43f5e"
            strokeWidth="2"
          />
          <circle cx="330" cy="202" r="7" fill="#f43f5e" stroke="#0f172a" strokeWidth="1.5" />

          {/* Overactive / Straining Lumbar Erectors */}
          <path
            d="M 325 198 Q 275 160 215 152"
            stroke="url(#shortMuscleGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            filter="url(#glowShort)"
          />

          {/* Spine Column (Severe Forward Trunk Pitch) */}
          <line x1="330" y1="202" x2="210" y2="148" stroke="#cbd5e1" strokeWidth="6.5" strokeLinecap="round" />

          {/* Ribcage Outline */}
          <path
            d="M 285 185 Q 260 162 235 155 L 245 145 Q 275 152 300 178 Z"
            fill="#1e293b"
            stroke="#64748b"
            strokeWidth="1.5"
            opacity="0.6"
          />

          {/* Shoulder & Cervical Spine */}
          <circle cx="210" cy="148" r="6" fill="#38bdf8" />
          <line x1="210" y1="148" x2="195" y2="140" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="185" cy="132" r="13" fill="#1e293b" stroke="#f43f5e" strokeWidth="2.5" />

          {/* Struggling Overhead Arms (Dropped forward / Latissimus tightness) */}
          <line x1="210" y1="148" x2="135" y2="110" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="135" cy="110" r="7" fill="#0f172a" stroke="#f43f5e" strokeWidth="2.2" />
          <circle cx="135" cy="110" r="16" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x="135" y="90" fill="#f43f5e" fontSize="10" fontWeight="bold" textAnchor="middle">Bar</text>

          {/* Broken Angle Reference Lines */}
          <line x1="238" y1="238" x2="205" y2="138" stroke="#f43f5e" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
          <line x1="330" y1="202" x2="160" y2="125" stroke="#f43f5e" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />

          {/* Callouts */}
          <rect x="265" y="242" width="175" height="26" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="352" y="259" fill="#fecdd3" fontSize="10" fontWeight="bold" textAnchor="middle">
            ▲ HEEL LIFTS (GAP &gt; 0.5cm)
          </text>

          <rect x="335" y="195" width="180" height="26" rx="6" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
          <text x="425" y="212" fill="#fed7aa" fontSize="10" fontWeight="bold" textAnchor="middle">
            Short Soleus &amp; Gastroc
          </text>

          <rect x="270" y="105" width="235" height="30" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="387" y="124" fill="#fda4af" fontSize="10" fontWeight="bold" textAnchor="middle">
            Excessive Forward Pitch (Broken Parallel)
          </text>

          <text x="180" y="305" fill="#f43f5e" fontSize="10" fontWeight="bold" textAnchor="middle">
            Restricted Talocrural Dorsiflexion (&lt;10°)
          </text>
        </g>
      ) : (
        /* ==================== OPTIMAL STATE (ANATOMICALLY ACCURATE SKELETON) ==================== */
        <g id="squat-heels-optimal">
          {/* Plumb Balance Line (Dropping from Bar/Torso to Midfoot) */}
          <line x1="215" y1="35" x2="215" y2="275" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x="220" y="292" fill="#64748b" fontSize="9">Base Plumb Line</text>

          {/* Foot (Tripod Flat on Floor - Calcaneus Anchored) */}
          <path
            d="M 165 275 L 255 275 L 250 268 L 175 270 Z"
            fill="#1e293b"
            stroke="#10b981"
            strokeWidth="2.5"
          />
          <circle cx="250" cy="272" r="3.5" fill="#10b981" />

          {/* Active Tibialis Anterior */}
          <path d="M 175 270 Q 195 225 185 188" stroke="#10b981" strokeWidth="3" fill="none" opacity="0.8" />

          {/* Tibia & Fibula (Forward Ankle Dorsiflexion ~49°) */}
          <line x1="250" y1="268" x2="180" y2="185" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
          <line x1="255" y1="266" x2="185" y2="188" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />

          {/* Patella & Knee Joint */}
          <circle cx="174" cy="185" r="5" fill="#38bdf8" />
          <circle cx="180" cy="185" r="7" fill="#10b981" stroke="#0f172a" strokeWidth="1.5" />

          {/* Femur (Thigh) */}
          <line x1="180" y1="185" x2="275" y2="195" stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />

          {/* Anatomical Pelvis & Acetabulum */}
          <path
            d="M 265 180 Q 290 185 285 204 Q 268 206 260 192 Z"
            fill="#1e293b"
            stroke="#10b981"
            strokeWidth="2"
          />
          <circle cx="275" cy="195" r="7" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />

          {/* Torso / Spine (Strictly Parallel to Shins ~49°) */}
          <line x1="275" y1="195" x2="205" y2="112" stroke="#cbd5e1" strokeWidth="6.5" strokeLinecap="round" />

          {/* Ribcage Outline */}
          <path
            d="M 255 175 Q 230 148 215 132 L 225 122 Q 248 138 270 166 Z"
            fill="#1e293b"
            stroke="#64748b"
            strokeWidth="1.5"
            opacity="0.6"
          />

          {/* Shoulder & Cervical Spine */}
          <circle cx="205" cy="112" r="6" fill="#38bdf8" />
          <line x1="205" y1="112" x2="195" y2="100" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="188" cy="88" r="13" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2.5" />

          {/* Arms Overhead (Extended inline with Torso Vector) */}
          <line x1="205" y1="112" x2="145" y2="42" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />

          {/* The Barbell / Bar (Overhead Stacked with Midfoot) */}
          <circle cx="145" cy="42" r="7" fill="#0f172a" stroke="#10b981" strokeWidth="2.5" />
          <circle cx="145" cy="42" r="18" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x="145" y="18" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">Bar</text>

          {/* Kinematic Angle Arcs & Reference Dashes */}
          <line x1="205" y1="150" x2="275" y2="150" stroke="#64748b" strokeWidth="1.2" strokeDasharray="3 3" />
          <path d="M 255 150 A 20 20 0 0 1 240 135" fill="none" stroke="#10b981" strokeWidth="1.8" />
          <text x="310" y="146" fill="#a7f3d0" fontSize="10" fontWeight="bold">Trunk Angle (~49°)</text>

          <line x1="180" y1="185" x2="135" y2="180" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
          <path d="M 158 183 A 22 22 0 0 1 195 204" fill="none" stroke="#10b981" strokeWidth="1.8" />
          <text x="80" y="188" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="end">Knee Angle (~90°)</text>

          <line x1="180" y1="185" x2="180" y2="275" stroke="#10b981" strokeWidth="1.2" strokeDasharray="2 2" />
          <line x1="165" y1="260" x2="165" y2="275" stroke="#64748b" strokeWidth="1.2" strokeDasharray="2 2" />
          <path d="M 180 262 L 165 262" stroke="#10b981" strokeWidth="1.5" />
          <text x="155" y="258" fill="#a7f3d0" fontSize="9" fontWeight="bold" textAnchor="end">
            Anterior knee-over-toe
          </text>

          {/* Parallelism Callout Badges */}
          <rect x="365" y="70" width="215" height="32" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="472" y="90" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
            ✓ Torso Strictly Parallel to Shins
          </text>

          <rect x="365" y="235" width="215" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="472" y="253" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Flat Calcaneus Anchored (Tripod)
          </text>

          <text x="220" y="308" fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="middle">
            Full 20°+ Talocrural Dorsiflexion
          </text>
        </g>
      )}
    </g>
  );
}

// =============================================================================
// 2. OVERHEAD SQUAT: KNEE VALGUS COLLAPSE (ANATOMICALLY ACCURATE)
// =============================================================================
function OverheadSquatKneesInDiagram({ isFault }: { isFault: boolean }) {
  // Stance geometry (Anatomical Frontal Squat)
  // Left foot ankle: 205, Right foot ankle: 395 (Center: 300)
  // Left hip socket: 265, Right hip socket: 335 (Height in squat: y=185)
  // Optimal knees: 205 & 395 (directly in line with feet over 2nd toe, y=195)
  // Valgus fault knees: 260 & 340 (collapsed medially inward toward center, y=195)
  const leftKneeX = isFault ? 260 : 205;
  const rightKneeX = isFault ? 340 : 395;
  const kneeY = 195;
  const hipY = 185;

  return (
    <g id="diagram-squat-valgus">
      {/* Ground Plane */}
      <line x1="60" y1="275" x2="540" y2="275" stroke="#475569" strokeWidth="2" />
      <text x="530" y="292" fill="#64748b" fontSize="10" textAnchor="end">Ground Plane</text>

      {/* Center Plumb Line (Center of Mass & Symmetry Axis) */}
      <line x1="300" y1="20" x2="300" y2="275" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x="305" y="292" fill="#64748b" fontSize="9">Midline</text>

      {/* Feet / Footbeds (Grounded flat at 205 and 395) */}
      {/* Left Foot */}
      <path
        d="M 180 275 L 230 275 L 225 268 L 185 268 Z"
        fill="#1e293b"
        stroke={isFault ? '#f43f5e' : '#10b981'}
        strokeWidth="2.2"
      />
      <circle cx="205" cy="272" r="3" fill={isFault ? '#f43f5e' : '#10b981'} />

      {/* Right Foot */}
      <path
        d="M 370 275 L 420 275 L 415 268 L 375 268 Z"
        fill="#1e293b"
        stroke={isFault ? '#f43f5e' : '#10b981'}
        strokeWidth="2.2"
      />
      <circle cx="395" cy="272" r="3" fill={isFault ? '#f43f5e' : '#10b981'} />

      {/* Vertical Kinematic Foot-Tracking Reference Lines (from 2nd toe upward) */}
      <line x1="205" y1="120" x2="205" y2="275" stroke="#475569" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.7" />
      <line x1="395" y1="120" x2="395" y2="275" stroke="#475569" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.7" />

      {/* Anatomical Pelvic Basin / Hips (Descended in deep squat) */}
      {/* Pelvic Bowl Contour */}
      <path
        d="M 255 172 Q 300 178 345 172 L 340 188 Q 300 196 260 188 Z"
        fill="#1e293b"
        stroke="#94a3b8"
        strokeWidth="2"
      />
      {/* Hip Joint Centers (Acetabulum) */}
      <circle cx="265" cy={hipY} r="6" fill="#38bdf8" />
      <circle cx="335" cy={hipY} r="6" fill="#38bdf8" />

      {/* Femurs (Thigh Bones) */}
      <line
        x1="265"
        y1={hipY}
        x2={leftKneeX}
        y2={kneeY}
        stroke="#cbd5e1"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <line
        x1="335"
        y1={hipY}
        x2={rightKneeX}
        y2={kneeY}
        stroke="#cbd5e1"
        strokeWidth="6.5"
        strokeLinecap="round"
      />

      {/* Tibias (Shin Bones) */}
      <line
        x1={leftKneeX}
        y1={kneeY}
        x2="205"
        y2="268"
        stroke="#cbd5e1"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <line
        x1={rightKneeX}
        y1={kneeY}
        x2="395"
        y2="268"
        stroke="#cbd5e1"
        strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* Knee Patella Joint Nodes */}
      <circle cx={leftKneeX} cy={kneeY} r="7.5" fill={isFault ? '#f43f5e' : '#10b981'} stroke="#0f172a" strokeWidth="1.5" />
      <circle cx={rightKneeX} cy={kneeY} r="7.5" fill={isFault ? '#f43f5e' : '#10b981'} stroke="#0f172a" strokeWidth="1.5" />

      {/* Torso & Spine Structure (Frontal Squat Alignment) */}
      {/* Spine Column from Sacrum to Thorax */}
      <line x1="300" y1="180" x2="300" y2="92" stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />
      <circle cx="300" cy="180" r="4" fill="#64748b" />

      {/* Ribcage Outline */}
      <path
        d="M 275 145 Q 265 118 280 96 L 320 96 Q 335 118 325 145 Z"
        fill="#1e293b"
        stroke="#64748b"
        strokeWidth="1.5"
        opacity="0.6"
      />

      {/* Clavicles & Shoulder Girdle */}
      <line x1="245" y1="92" x2="355" y2="92" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
      <circle cx="245" cy="92" r="5" fill="#38bdf8" />
      <circle cx="355" cy="92" r="5" fill="#38bdf8" />

      {/* Neck & Head */}
      <line x1="300" y1="92" x2="300" y2="78" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
      <circle cx="300" cy="64" r="14" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2.5" />

      {/* Overhead Arms (Snatch / Overhead Squat Y-Hold) */}
      <line x1="245" y1="92" x2="215" y2="28" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="355" y1="92" x2="385" y2="28" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="215" cy="28" r="4" fill="#38bdf8" />
      <circle cx="385" cy="28" r="4" fill="#38bdf8" />

      {/* Overhead Barbell */}
      <line
        x1="150"
        y1="28"
        x2="450"
        y2="28"
        stroke={isFault ? '#f43f5e' : '#10b981'}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Weight Plates / Collars */}
      <rect x="165" y="16" width="6" height="24" rx="2" fill={isFault ? '#f43f5e' : '#10b981'} />
      <rect x="429" y="16" width="6" height="24" rx="2" fill={isFault ? '#f43f5e' : '#10b981'} />
      <text x="300" y="20" fill={isFault ? '#f43f5e' : '#10b981'} fontSize="10" fontWeight="bold" textAnchor="middle">
        Overhead Bar
      </text>

      {isFault ? (
        /* ==================== FAULT: KNEE VALGUS COLLAPSE ==================== */
        <g id="valgus-fault-layer">
          {/* Hyperactive Adductors (Inner Thighs Shortened & Pulling In) */}
          <path
            d="M 268 182 Q 262 188 262 195"
            stroke="url(#shortMuscleGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            filter="url(#glowShort)"
          />
          <path
            d="M 332 182 Q 338 188 338 195"
            stroke="url(#shortMuscleGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            filter="url(#glowShort)"
          />

          {/* Inhibited / Underactive Gluteus Medius & Minimus */}
          <circle cx="250" cy="170" r="10" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="3 3" filter="url(#glowWeak)" />
          <circle cx="350" cy="170" r="10" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="3 3" filter="url(#glowWeak)" />

          {/* Medial Inward Collapse Vector Arrows */}
          <line x1="205" y1="195" x2="250" y2="195" stroke="#f43f5e" strokeWidth="2.5" />
          <polygon points="253,195 245,191 245,199" fill="#f43f5e" />

          <line x1="395" y1="195" x2="350" y2="195" stroke="#f43f5e" strokeWidth="2.5" />
          <polygon points="347,195 355,191 355,199" fill="#f43f5e" />

          {/* Valgus Angle Arc Indicators at Knees */}
          <path d="M 260 195 L 245 220" stroke="#f43f5e" strokeWidth="1.2" strokeDasharray="2 2" />
          <path d="M 340 195 L 355 220" stroke="#f43f5e" strokeWidth="1.2" strokeDasharray="2 2" />

          {/* Callout Badges */}
          <rect x="190" y="214" width="220" height="28" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="300" y="232" fill="#fecdd3" fontSize="11" fontWeight="bold" textAnchor="middle">
            ▲ KNEE VALGUS COLLAPSE (MEDIAL)
          </text>

          <rect x="25" y="152" width="180" height="28" rx="6" fill="#083344" stroke="#06b6d4" strokeWidth="1.2" />
          <text x="115" y="170" fill="#a5f3fc" fontSize="10" fontWeight="bold" textAnchor="middle">
            Weak Gluteus Medius / Max
          </text>

          <rect x="395" y="152" width="180" height="28" rx="6" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
          <text x="485" y="170" fill="#fed7aa" fontSize="10" fontWeight="bold" textAnchor="middle">
            Short Adductors &amp; TFL
          </text>

          {/* Foot Pronation Callout */}
          <text x="300" y="260" fill="#f43f5e" fontSize="9.5" fontWeight="bold" textAnchor="middle">
            Subtalar Eversion / Arch Collapse
          </text>
        </g>
      ) : (
        /* ==================== OPTIMAL: NEUTRAL KNEE TRACKING ==================== */
        <g id="valgus-optimal-layer">
          {/* Active Gluteus Medius / Abductors Firing */}
          <circle cx="248" cy="170" r="11" fill="#10b981" opacity="0.35" />
          <circle cx="352" cy="170" r="11" fill="#10b981" opacity="0.35" />
          <path d="M 248 162 Q 240 170 252 178" stroke="#10b981" strokeWidth="2.5" fill="none" />
          <path d="M 352 162 Q 360 170 348 178" stroke="#10b981" strokeWidth="2.5" fill="none" />

          {/* Knee Alignment Indicators (Centered directly on vertical foot axis) */}
          <circle cx="205" cy="195" r="13" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
          <circle cx="395" cy="195" r="13" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />

          {/* Callout Badges */}
          <rect x="180" y="214" width="240" height="30" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="300" y="233" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
            ✓ Neutral Tracking (Centered Over 2nd Toe)
          </text>

          <rect x="25" y="152" width="180" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="115" y="170" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Gluteus Medius Active
          </text>

          <rect x="395" y="152" width="180" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="485" y="170" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Balanced Adductor Length
          </text>
        </g>
      )}
    </g>
  );
}

// =============================================================================
// 3. SINGLE LEG STANCE: PELVIC DROP (TRENDELENBURG SIGN - ANATOMICALLY ACCURATE)
// =============================================================================
function TrendelenburgPelvicDropDiagram({ isFault }: { isFault: boolean }) {
  // Stance Leg (Left): Grounded at x=250, Hip at (250, 145), Knee at (250, 205), Ankle at (250, 268)
  // Segment lengths: Femur = 60px, Tibia = 63px (Preserved 100% symmetrically on both sides)
  //
  // Non-Weight-Bearing Leg (Right):
  // Optimal: Right Hip at (350, 145) [Level Horizon 0°], Right Knee at (350, 205), Right Foot hovering at y=265
  // Fault: Right Hip drops to (350, 165) [Pelvic Drop >10°], Right Knee displaced to (350, 225), Right Foot displaced down
  const rightHipY = isFault ? 165 : 145;
  const rightKneeY = rightHipY + 60; // Exact identical 60px femur length
  const rightAnkleY = rightKneeY + 60; // Exact identical tibia length
  const spineTopX = isFault ? 255 : 295; // Compensatory lateral trunk lean in fault

  return (
    <g id="diagram-trendelenburg">
      {/* Ground Plane */}
      <line x1="60" y1="275" x2="540" y2="275" stroke="#475569" strokeWidth="2" />
      <text x="530" y="292" fill="#64748b" fontSize="10" textAnchor="end">Ground Plane</text>

      {/* Horizontal Pelvic Level Reference (0° Horizon Guideline) */}
      <line x1="160" y1="145" x2="440" y2="145" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
      <text x="155" y="148" fill="#94a3b8" fontSize="9" textAnchor="end">0° Pelvic Horizon</text>

      {/* Horizontal Knee Level Reference Line (shows knee drop in fault) */}
      <line x1="180" y1="205" x2="420" y2="205" stroke="#475569" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />

      {/* Plumb Line through Stance Leg */}
      <line x1="250" y1="25" x2="250" y2="275" stroke="#334155" strokeWidth="1.2" strokeDasharray="3 3" />

      {/* ================= STANCE LEG (LEFT - GROUNDED) ================= */}
      {/* Planted Footbed (Tripod Flat Grounded) */}
      <path
        d="M 225 275 L 275 275 L 270 268 L 230 268 Z"
        fill="#1e293b"
        stroke="#10b981"
        strokeWidth="2.2"
      />
      <circle cx="250" cy="272" r="3" fill="#10b981" />

      {/* Stance Tibia (Shin - 63px column) */}
      <line x1="250" y1="268" x2="250" y2="205" stroke="#cbd5e1" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="250" cy="205" r="7" fill="#10b981" stroke="#0f172a" strokeWidth="1.5" />

      {/* Stance Femur (Thigh - 60px) */}
      <line x1="250" y1="205" x2="250" y2="145" stroke="#cbd5e1" strokeWidth="6.5" strokeLinecap="round" />

      {/* Greater Trochanter Stance Joint */}
      <circle cx="250" cy="145" r="7" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />

      {/* ================= ANATOMICAL PELVIS GIRDLE ================= */}
      {/* Pelvic Basin Contour */}
      <path
        d={`M 235 132 Q 300 138 365 ${rightHipY - 13} L 355 ${rightHipY + 5} Q 300 ${isFault ? 168 : 158} 245 152 Z`}
        fill="#1e293b"
        stroke={isFault ? '#f43f5e' : '#10b981'}
        strokeWidth="2"
      />
      {/* Sacrum Center */}
      <circle cx="300" cy={isFault ? 155 : 145} r="5" fill="#64748b" />

      {/* Contralateral Right Hip Joint */}
      <circle cx="350" cy={rightHipY} r="7" fill={isFault ? '#f43f5e' : '#10b981'} stroke="#0f172a" strokeWidth="1.5" />

      {/* ================= NON-WEIGHT-BEARING LEG (RIGHT - UNILATERALLY SYMMETRICAL) ================= */}
      {/* Contralateral Femur (Identical 60px bone length) */}
      <line
        x1="350"
        y1={rightHipY}
        x2="350"
        y2={rightKneeY}
        stroke="#cbd5e1"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <circle cx="350" cy={rightKneeY} r="7" fill={isFault ? '#f43f5e' : '#10b981'} stroke="#0f172a" strokeWidth="1.5" />

      {/* Contralateral Tibia (Identical 60px bone length) */}
      <line
        x1="350"
        y1={rightKneeY}
        x2="350"
        y2={rightAnkleY}
        stroke="#cbd5e1"
        strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* Suspended Right Foot (Hovering in optimal, dropped in fault) */}
      <path
        d={`M 325 ${rightAnkleY + 7} L 375 ${rightAnkleY + 7} L 370 ${rightAnkleY} L 330 ${rightAnkleY} Z`}
        fill="#1e293b"
        stroke={isFault ? '#f43f5e' : '#38bdf8'}
        strokeWidth="2"
      />
      <circle cx="350" cy={rightAnkleY + 4} r="3" fill={isFault ? '#f43f5e' : '#38bdf8'} />

      {/* ================= TORSO & SPINE STRUCTURE ================= */}
      {/* Spine Column with Lateral Compensation Curve in Fault */}
      {isFault ? (
        <path
          d={`M 300 155 Q 285 115 ${spineTopX} 82`}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="6.5"
          strokeLinecap="round"
        />
      ) : (
        <line x1="300" y1="145" x2={spineTopX} y2="82" stroke="#cbd5e1" strokeWidth="6.5" strokeLinecap="round" />
      )}

      {/* Ribcage Outline */}
      <path
        d={`M ${spineTopX - 25} 130 Q ${spineTopX - 35} 105 ${spineTopX - 20} 86 L ${spineTopX + 20} 86 Q ${spineTopX + 35} 105 ${spineTopX + 25} 130 Z`}
        fill="#1e293b"
        stroke="#64748b"
        strokeWidth="1.5"
        opacity="0.6"
      />

      {/* Shoulder Girdle */}
      <line
        x1={spineTopX - 45}
        y1={isFault ? 80 : 82}
        x2={spineTopX + 45}
        y2={isFault ? 88 : 82}
        stroke="#cbd5e1"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx={spineTopX - 45} cy={isFault ? 80 : 82} r="5" fill="#38bdf8" />
      <circle cx={spineTopX + 45} cy={isFault ? 88 : 82} r="5" fill="#38bdf8" />

      {/* Neck & Head */}
      <line x1={spineTopX} y1="82" x2={spineTopX} y2="68" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
      <circle cx={spineTopX} cy="52" r="14" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2.5" />

      {/* Arms in Balance Posture */}
      <line x1={spineTopX - 45} y1="82" x2={spineTopX - 65} y2="135" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
      <line x1={spineTopX + 45} y1="82" x2={spineTopX + 65} y2="135" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
      <circle cx={spineTopX - 65} cy="135" r="3.5" fill="#38bdf8" />
      <circle cx={spineTopX + 65} cy="135" r="3.5" fill="#38bdf8" />

      {/* ================= BIOMECHANICAL MUSCLE HIGHLIGHTS & CALLOUTS ================= */}
      {isFault ? (
        /* ==================== FAULT: POSITIVE TRENDELENBURG ==================== */
        <g id="trendelenburg-fault-layer">
          {/* Weak / Inhibited Stance Gluteus Medius & Minimus */}
          <circle cx="236" cy="138" r="12" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="3 3" filter="url(#glowWeak)" />
          <path d="M 235 128 Q 225 142 244 148" stroke="#06b6d4" strokeWidth="3" strokeDasharray="3 3" fill="none" />

          {/* Hyperactive / Straining Contralateral QL / Lat Flexors */}
          <path
            d="M 315 152 Q 330 130 320 95"
            stroke="url(#shortMuscleGrad)"
            strokeWidth="5.5"
            strokeLinecap="round"
            filter="url(#glowShort)"
          />

          {/* Pelvic Drop Deviation Arc & Angle */}
          <path d="M 390 145 A 50 50 0 0 1 385 165" fill="none" stroke="#f43f5e" strokeWidth="2" />
          <line x1="350" y1="145" x2="420" y2="145" stroke="#f43f5e" strokeWidth="1.2" strokeDasharray="2 2" />
          <line x1="350" y1="165" x2="420" y2="165" stroke="#f43f5e" strokeWidth="1.2" strokeDasharray="2 2" />
          <line x1="410" y1="145" x2="410" y2="165" stroke="#f43f5e" strokeWidth="2" />
          <polygon points="410,165 406,157 414,157" fill="#f43f5e" />
          <text x="425" y="158" fill="#f43f5e" fontSize="10" fontWeight="bold">Drop &gt; 8°</text>

          {/* Knee Level Drop Indicator */}
          <line x1="350" y1="205" x2="395" y2="205" stroke="#f43f5e" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="350" y1="225" x2="395" y2="225" stroke="#f43f5e" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="390" y1="205" x2="390" y2="225" stroke="#f43f5e" strokeWidth="1.5" />
          <polygon points="390,225 387,218 393,218" fill="#f43f5e" />

          {/* Trunk Lean Vector Indicator */}
          <path d="M 295 40 Q 275 42 260 48" fill="none" stroke="#fb923c" strokeWidth="2" markerEnd="url(#arrowEnd)" />
          <text x="250" y="36" fill="#fed7aa" fontSize="9.5" fontWeight="bold">Trunk Lean</text>

          {/* Callout Badges */}
          <rect x="290" y="235" width="225" height="30" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="402" y="254" fill="#fecdd3" fontSize="11" fontWeight="bold" textAnchor="middle">
            ▲ POSITIVE TRENDELENBURG (PELVIC DROP)
          </text>

          <rect x="25" y="155" width="180" height="28" rx="6" fill="#083344" stroke="#06b6d4" strokeWidth="1.2" />
          <text x="115" y="173" fill="#a5f3fc" fontSize="10" fontWeight="bold" textAnchor="middle">
            Weak Stance Gluteus Medius
          </text>

          <rect x="360" y="92" width="200" height="28" rx="6" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
          <text x="460" y="110" fill="#fed7aa" fontSize="10" fontWeight="bold" textAnchor="middle">
            Straining Contralateral QL
          </text>
        </g>
      ) : (
        /* ==================== OPTIMAL: NEGATIVE TRENDELENBURG ==================== */
        <g id="trendelenburg-optimal-layer">
          {/* Strongly Firing Stance Gluteus Medius & Minimus */}
          <path
            d="M 235 130 Q 228 142 248 148"
            stroke="url(#optimalGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            filter="url(#glowOptimal)"
          />
          <circle cx="236" cy="138" r="10" fill="#10b981" opacity="0.35" />

          {/* Symmetrical Core / QL Balance */}
          <line x1="275" y1="138" x2="275" y2="92" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          <line x1="325" y1="138" x2="325" y2="92" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />

          {/* Bilateral Limb Symmetry Indicator */}
          <text x="350" y="280" fill="#38bdf8" fontSize="9.5" fontWeight="bold" textAnchor="middle">
            (Lifted Foot Clear)
          </text>

          {/* Callout Badges */}
          <rect x="360" y="125" width="205" height="32" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="462" y="145" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
            ✓ Level Pelvic Horizon (0° Deviation)
          </text>

          <rect x="25" y="155" width="180" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="115" y="173" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Stance Gluteus Medius Active
          </text>

          <rect x="360" y="82" width="205" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="462" y="100" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Symmetrical Upright Spine
          </text>
        </g>
      )}
    </g>
  );
}

// =============================================================================
// 4. FORWARD BEND / TOE TOUCH: HAMSTRING RESTRICTION (ANATOMICALLY DETAILED)
// =============================================================================
function ToeTouchHamstringDiagram({ isFault }: { isFault: boolean }) {
  // Lateral toe touch standing coordinates
  const ankleX = 330;
  const ankleY = 268;
  const kneeX = 330;
  const kneeY = 200;
  const hipX = isFault ? 320 : 310;
  const hipY = 140;

  return (
    <g id="diagram-toe-touch">
      {/* Ground Plane */}
      <line x1="60" y1="275" x2="540" y2="275" stroke="#475569" strokeWidth="2" />
      <text x="530" y="292" fill="#64748b" fontSize="10" textAnchor="end">Ground Plane</text>

      {/* Grounded Foot */}
      <path
        d="M 290 275 L 355 275 L 350 266 L 300 268 Z"
        fill="#1e293b"
        stroke="#cbd5e1"
        strokeWidth="2"
      />
      <circle cx={ankleX} cy={ankleY} r="3.5" fill="#38bdf8" />

      {/* Extended Lower Leg (Tibia/Fibula) */}
      <line x1={ankleX} y1={ankleY} x2={kneeX} y2={kneeY} stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
      <circle cx={kneeX} cy={kneeY} r="6.5" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />

      {/* Thigh (Femur) */}
      <line x1={kneeX} y1={kneeY} x2={hipX} y2={hipY} stroke="#cbd5e1" strokeWidth="6.5" strokeLinecap="round" />
      <circle cx={hipX} cy={hipY} r="7" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />

      {/* Anatomical Pelvis Profile */}
      <path
        d={isFault
          ? `M 295 130 Q 320 115 345 125 Q 350 148 335 156 Q 305 154 295 130 Z`
          : `M 285 155 Q 295 120 330 118 Q 345 138 335 160 Q 300 166 285 155 Z`}
        fill="#1e293b"
        stroke={isFault ? '#f43f5e' : '#10b981'}
        strokeWidth="2.2"
      />

      {/* Posterior Hamstring Highlight (Biceps Femoris / Semimembranosus) */}
      <path
        d={`M ${hipX + 8} ${hipY + 5} L ${kneeX + 8} ${kneeY - 5}`}
        stroke={isFault ? 'url(#shortMuscleGrad)' : 'url(#optimalGrad)'}
        strokeWidth="7"
        strokeLinecap="round"
        filter={isFault ? 'url(#glowShort)' : 'url(#glowOptimal)'}
      />

      {isFault ? (
        /* ==================== FAULT: HAMSTRING TENSION BLOCKS HIP HINGE ==================== */
        <g id="fault-hamstring">
          {/* Compensatory Thoracic / Lumbar Rounding with Blocked Hip Flexion */}
          <path
            d={`M ${hipX} ${hipY} C 290 105 240 100 220 135 C 205 155 200 180 200 198`}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Ribcage */}
          <ellipse cx="225" cy="140" rx="18" ry="14" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" opacity="0.6" transform="rotate(-30 225 140)" />

          {/* Cervical & Head */}
          <circle cx="192" cy="210" r="14" fill="#1e293b" stroke="#f43f5e" strokeWidth="2.5" />

          {/* Reaching Arms stuck at mid-shin level */}
          <line x1="220" y1="140" x2="210" y2="205" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="210" cy="205" r="4.5" fill="#f43f5e" />

          {/* Distance Gap Indicator to Floor */}
          <line x1="210" y1="205" x2="210" y2="275" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3 3" />
          <text x="218" y="245" fill="#f43f5e" fontSize="10" fontWeight="bold">Gap &gt; 15cm</text>

          {/* Sacral/Pelvic Angle Vector showing lack of anterior rotation (<70°) */}
          <line x1={hipX} y1={hipY} x2={hipX - 45} y2={hipY - 25} stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="2 2" />
          <text x={hipX - 60} y={hipY - 30} fill="#f43f5e" fontSize="9" fontWeight="bold">Pelvis Stuck</text>

          {/* Callouts */}
          <rect x="355" y="70" width="220" height="30" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="465" y="89" fill="#fecdd3" fontSize="10.5" fontWeight="bold" textAnchor="middle">
            ▲ Tight Hamstrings Block Pelvic Hinge
          </text>

          <rect x="30" y="100" width="180" height="30" rx="6" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
          <text x="120" y="119" fill="#fed7aa" fontSize="10" fontWeight="bold" textAnchor="middle">
            Spine Over-Flexion Stress
          </text>

          <rect x="30" y="150" width="160" height="28" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="110" y="168" fill="#fda4af" fontSize="10" fontWeight="bold" textAnchor="middle">
            Fingertips at Mid-Shin
          </text>
        </g>
      ) : (
        /* ==================== OPTIMAL: FULL HIP HINGE & HAMSTRING COMPLIANCE ==================== */
        <g id="optimal-hamstring">
          {/* True 80°+ Anterior Pelvic Rotation & Long Spine */}
          <path
            d={`M ${hipX} ${hipY} L 265 170 L 245 225`}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Ribcage */}
          <ellipse cx="258" cy="185" rx="16" ry="12" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" opacity="0.6" transform="rotate(-60 258 185)" />

          {/* Cervical & Head */}
          <circle cx="240" cy="242" r="14" fill="#1e293b" stroke="#10b981" strokeWidth="2.5" />

          {/* Arms reaching fully to toes/floor */}
          <line x1="265" y1="170" x2="270" y2="270" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="270" cy="270" r="4.5" fill="#10b981" />

          {/* Callouts */}
          <rect x="355" y="70" width="220" height="32" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="465" y="90" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
            ✓ Full Anterior Pelvic Tilt (&gt;80°)
          </text>

          <rect x="30" y="130" width="180" height="30" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="120" y="149" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Fingertips Touch Toes
          </text>

          <rect x="355" y="115" width="220" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="465" y="133" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Normal Hamstring Extensibility
          </text>
        </g>
      )}
    </g>
  );
}

// =============================================================================
// 5. ANTERIOR PELVIC TILT (LOWER CROSSED PATTERN - ANATOMICALLY ACCURATE SKELETON)
// =============================================================================
function AnteriorPelvicTiltDiagram({ isFault }: { isFault: boolean }) {
  // Lateral (side-profile) coordinates:
  // Plumb Line at x=280
  // Ankle/Malleolus at (280, 268)
  const asisX = isFault ? 248 : 256;
  const asisY = isFault ? 158 : 144;
  const psisX = isFault ? 304 : 296;
  const psisY = isFault ? 130 : 138;
  const hipX = isFault ? 278 : 280;
  const hipY = 145;
  const kneeX = isFault ? 282 : 280;
  const kneeY = 205;
  const shoulderX = isFault ? 280 : 280;
  const shoulderY = 78;
  const headX = isFault ? 274 : 280;
  const headY = 42;

  return (
    <g id="diagram-apt">
      {/* Ground Plane */}
      <line x1="60" y1="275" x2="540" y2="275" stroke="#475569" strokeWidth="2" />
      <text x="530" y="292" fill="#64748b" fontSize="10" textAnchor="end">Ground Plane</text>

      {/* Ideal Gravitational Plumb Line (Ear -> Shoulder -> Hip -> Knee -> Lateral Malleolus) */}
      <line x1="280" y1="20" x2="280" y2="275" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x="284" y="28" fill="#64748b" fontSize="9">Plumb Line</text>

      {/* ================= LOWER EXTREMITY (SIDE PROFILE) ================= */}
      {/* Foot Base (Calcaneus & Metatarsals) */}
      <path
        d="M 240 275 L 305 275 L 300 266 L 250 268 Z"
        fill="#1e293b"
        stroke={isFault ? '#f43f5e' : '#10b981'}
        strokeWidth="2.2"
      />
      <circle cx="280" cy="270" r="3.5" fill="#38bdf8" />

      {/* Tibia & Fibula (Shin) */}
      <line x1="280" y1="268" x2={kneeX} y2={kneeY} stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
      <line x1="284" y1="266" x2={kneeX + 3} y2={kneeY} stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />

      {/* Patella (Knee Cap) & Joint */}
      <circle cx={kneeX - 6} cy={kneeY} r="4.5" fill="#38bdf8" />
      <circle cx={kneeX} cy={kneeY} r="7" fill={isFault ? '#f43f5e' : '#10b981'} stroke="#0f172a" strokeWidth="1.5" />

      {/* Femur (Thigh) */}
      <line x1={kneeX} y1={kneeY} x2={hipX} y2={hipY} stroke="#cbd5e1" strokeWidth="6.5" strokeLinecap="round" />

      {/* Greater Trochanter & Acetabular Joint */}
      <circle cx={hipX} cy={hipY} r="7" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />

      {/* ================= ANATOMICAL PELVIC BONE PROFILE ================= */}
      {/* Iliac Crest & Pelvic Bowl Contour */}
      <path
        d={`M ${asisX} ${asisY} Q ${hipX} ${hipY - 24} ${psisX} ${psisY} Q ${hipX + 16} ${hipY + 12} ${hipX} ${hipY + 18} Q ${hipX - 14} ${hipY + 14} ${asisX} ${asisY}`}
        fill="#1e293b"
        stroke={isFault ? '#f43f5e' : '#10b981'}
        strokeWidth="2.5"
      />
      {/* ASIS Landmark (Front) */}
      <circle cx={asisX} cy={asisY} r="4.5" fill="#f43f5e" />
      <text x={asisX - 6} y={asisY + 4} fill="#fecdd3" fontSize="8.5" fontWeight="bold" textAnchor="end">ASIS</text>

      {/* PSIS Landmark (Back) */}
      <circle cx={psisX} cy={psisY} r="4.5" fill="#38bdf8" />
      <text x={psisX + 6} y={psisY + 4} fill="#a5f3fc" fontSize="8.5" fontWeight="bold">PSIS</text>

      {/* ASIS-PSIS Tilt Horizon Line */}
      <line x1={asisX - 10} y1={asisY} x2={psisX + 10} y2={psisY} stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="1.5" strokeDasharray="3 3" />

      {/* ================= VERTEBRAL COLUMN & RIBCAGE ================= */}
      {/* Segmented Spinal Curvature */}
      {isFault ? (
        /* Hyperlordotic Lumbar & Compensatory Thoracic Kyphosis */
        <path
          d={`M ${hipX + 4} ${hipY - 9} Q 260 116 ${shoulderX} ${shoulderY}`}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="6.5"
          strokeLinecap="round"
        />
      ) : (
        /* Neutral S-Curve */
        <path
          d={`M ${hipX + 2} ${hipY - 10} Q 274 115 ${shoulderX} ${shoulderY}`}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="6.5"
          strokeLinecap="round"
        />
      )}

      {/* Ribcage Outline */}
      <path
        d={`M ${shoulderX - 16} 122 Q ${shoulderX - 26} 98 ${shoulderX - 8} ${shoulderY + 6} L ${shoulderX + 12} ${shoulderY + 6} Q ${shoulderX + 22} 98 ${shoulderX + 12} 122 Z`}
        fill="#1e293b"
        stroke="#64748b"
        strokeWidth="1.5"
        opacity="0.6"
      />

      {/* Shoulder Joint & Cervical Spine */}
      <circle cx={shoulderX} cy={shoulderY} r="6" fill="#38bdf8" />
      <line x1={shoulderX} y1={shoulderY} x2={headX} y2={headY + 12} stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />

      {/* Skull / Cranium with Eye Orbit & Mandible Profile */}
      <circle cx={headX} cy={headY} r="14" fill="#1e293b" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="2.5" />
      <circle cx={headX - 6} cy={headY - 2} r="2.5" fill="#64748b" />

      {/* Hanging Arm Profile */}
      <line x1={shoulderX} y1={shoulderY} x2={isFault ? 280 : 278} y2="148" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
      <circle cx={isFault ? 280 : 278} cy="148" r="3.5" fill="#38bdf8" />

      {/* ================= MUSCULAR IMBALANCE HIGHLIGHTS (LOWER CROSSED) ================= */}
      {isFault ? (
        /* ==================== FAULT: LOWER CROSSED SYNDROME ==================== */
        <g id="apt-fault-cross">
          {/* 1. SHORT / TIGHT ILIOPSOAS & RECTUS FEMORIS (Front-Down Force Vector) */}
          <path
            d={`M 264 118 Q ${asisX - 2} 140 ${hipX - 4} 164`}
            stroke="url(#shortMuscleGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            filter="url(#glowShort)"
          />
          {/* Anterior pull vector arrow */}
          <line x1={asisX} y1={asisY} x2={asisX - 12} y2={asisY + 14} stroke="#f43f5e" strokeWidth="2" />
          <polygon points={`${asisX - 12},${asisY + 14} ${asisX - 7},${asisY + 8} ${asisX - 14},${asisY + 7}`} fill="#f43f5e" />

          {/* 2. SHORT / HYPERACTIVE LUMBAR ERECTORS (Back-Up Force Vector) */}
          <path
            d={`M ${psisX - 2} ${psisY + 2} Q 268 112 ${shoulderX - 2} ${shoulderY + 18}`}
            stroke="url(#shortMuscleGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            filter="url(#glowShort)"
          />

          {/* 3. WEAK / INHIBITED GLUTEUS MAXIMUS (Back-Down Failure) */}
          <path
            d={`M ${psisX + 4} ${psisY + 6} Q ${hipX + 24} 158 ${hipX + 8} 178`}
            stroke="#06b6d4"
            strokeWidth="3.5"
            strokeDasharray="3 3"
            fill="none"
            filter="url(#glowWeak)"
          />

          {/* 4. WEAK / INHIBITED RECTUS ABDOMINIS & TRANSVERSE ABDOMINIS */}
          <path
            d={`M ${shoulderX - 14} 105 Q 242 126 ${asisX + 2} ${asisY - 4}`}
            stroke="#06b6d4"
            strokeWidth="3.5"
            strokeDasharray="3 3"
            fill="none"
            filter="url(#glowWeak)"
          />

          {/* Lower Crossed Visual 'X' Lines (Connecting Tight pairs & Weak pairs) */}
          <line x1="250" y1="108" x2={hipX + 16} y2="176" stroke="#06b6d4" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.7" />
          <line x1={shoulderX} y1="95" x2={hipX - 10} y2="170" stroke="#ea580c" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />

          {/* Pelvic Tilt Angle Arc */}
          <line x1={asisX} y1={asisY} x2={asisX + 60} y2={asisY} stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
          <path d={`M ${asisX + 35} ${asisY} A 35 35 0 0 1 ${asisX + 32} ${asisY - 14}`} fill="none" stroke="#f43f5e" strokeWidth="1.8" />
          <text x="320" y={asisY + 2} fill="#f43f5e" fontSize="10" fontWeight="bold">Tilt &gt; 15° (Excessive)</text>

          {/* Callout Badges */}
          <rect x="360" y="80" width="215" height="30" rx="6" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
          <text x="467" y="99" fill="#fed7aa" fontSize="10" fontWeight="bold" textAnchor="middle">
            Short Lumbar Extensors / QL
          </text>

          <rect x="25" y="115" width="180" height="30" rx="6" fill="#083344" stroke="#06b6d4" strokeWidth="1.2" />
          <text x="115" y="134" fill="#a5f3fc" fontSize="10" fontWeight="bold" textAnchor="middle">
            Inhibited Abdominals
          </text>

          <rect x="25" y="165" width="180" height="30" rx="6" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
          <text x="115" y="184" fill="#fed7aa" fontSize="10" fontWeight="bold" textAnchor="middle">
            Short Iliopsoas &amp; Rectus Fem
          </text>

          <rect x="360" y="165" width="215" height="30" rx="6" fill="#083344" stroke="#06b6d4" strokeWidth="1.2" />
          <text x="467" y="184" fill="#a5f3fc" fontSize="10" fontWeight="bold" textAnchor="middle">
            Inhibited Gluteus Maximus
          </text>

          {/* Summary Banner */}
          <rect x="180" y="240" width="240" height="28" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="300" y="258" fill="#fecdd3" fontSize="11" fontWeight="bold" textAnchor="middle">
            ▲ ANTERIOR PELVIC TILT / LORDOSIS
          </text>
        </g>
      ) : (
        /* ==================== OPTIMAL: NEUTRAL PELVIS & BALANCED CORE ==================== */
        <g id="apt-optimal-cross">
          {/* Active Gluteus Maximus Support */}
          <path
            d={`M ${psisX + 2} ${psisY + 4} Q ${hipX + 22} 158 ${hipX + 6} 178`}
            stroke="url(#optimalGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            filter="url(#glowOptimal)"
          />

          {/* Active Abdominal Wall Support */}
          <path
            d={`M ${shoulderX - 10} 105 Q 255 125 ${asisX + 2} ${asisY - 2}`}
            stroke="url(#optimalGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            filter="url(#glowOptimal)"
          />

          {/* Flexible, Balanced Hip Flexor & Lumbar Spine */}
          <circle cx={asisX} cy={asisY} r="9" fill="#10b981" opacity="0.3" />

          {/* Callout Badges */}
          <rect x="360" y="80" width="215" height="30" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="467" y="99" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Neutral Lumbar Lordosis (~30°)
          </text>

          <rect x="25" y="135" width="190" height="30" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="120" y="154" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Balanced Psoas &amp; Core Tone
          </text>

          <rect x="360" y="155" width="215" height="30" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="467" y="174" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Active Gluteus Maximus
          </text>

          {/* Summary Banner */}
          <rect x="180" y="240" width="240" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="300" y="258" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
            ✓ Optimal Pelvic Inclination (5°-10°)
          </text>
        </g>
      )}
    </g>
  );
}

// =============================================================================
// 6. MODIFIED THOMAS TEST (ANATOMICALLY ACCURATE SKELETON)
// =============================================================================
function ThomasTestDiagram({ isFault }: { isFault: boolean }) {
  const thighRotation = isFault ? 'rotate(-24 250 175)' : 'rotate(0 250 175)';

  return (
    <g id="diagram-thomas">
      {/* Treatment Table Surface & Legs */}
      <rect x="50" y="175" width="200" height="14" rx="2" fill="#334155" stroke="#475569" strokeWidth="1.5" />
      <line x1="250" y1="175" x2="250" y2="280" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
      <line x1="70" y1="189" x2="70" y2="280" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
      <text x="150" y="205" fill="#64748b" fontSize="9.5" textAnchor="middle">Examination Table Edge</text>

      {/* Supine Lumbar & Thoracic Spine flat on table */}
      <line x1="90" y1="168" x2="250" y2="168" stroke="#cbd5e1" strokeWidth="6.5" strokeLinecap="round" />

      {/* Pelvis on Table Edge */}
      <path
        d="M 230 156 Q 260 156 265 174 Q 255 186 230 178 Z"
        fill="#1e293b"
        stroke="#38bdf8"
        strokeWidth="2"
      />
      <circle cx="250" cy="175" r="6" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />

      {/* Skull & Pillow */}
      <rect x="70" y="162" width="25" height="12" rx="3" fill="#475569" />
      <circle cx="82" cy="155" r="14" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2.5" />

      {/* Flexed Contralateral Knee Hugged to Chest */}
      <path d="M 235 168 Q 185 105 155 130" fill="none" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
      <circle cx="155" cy="130" r="5" fill="#38bdf8" />
      <line x1="155" y1="130" x2="165" y2="168" stroke="#94a3b8" strokeWidth="4.5" strokeLinecap="round" />
      {/* Arms gripping shin */}
      <path d="M 120 160 Q 140 135 155 130" fill="none" stroke="#cbd5e1" strokeWidth="3" />

      {/* Test Leg Hanging off Table Edge */}
      <g transform={thighRotation}>
        {/* Test Femur */}
        <line x1="250" y1="175" x2="365" y2="175" stroke="#cbd5e1" strokeWidth="6.5" strokeLinecap="round" />
        {/* Patella & Knee Joint */}
        <circle cx="365" cy="175" r="6.5" fill={isFault ? '#f43f5e' : '#10b981'} stroke="#0f172a" strokeWidth="1.5" />
        {/* Tibia hanging vertically (80°-90° flexion) */}
        <line x1="365" y1="175" x2={isFault ? 385 : 365} y2="255" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
        {/* Foot */}
        <path d={isFault ? "M 385 255 L 405 265 L 390 270 Z" : "M 365 255 L 385 265 L 370 270 Z"} fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.5" />
      </g>

      {isFault ? (
        /* ==================== FAULT: POSITIVE THOMAS (SHORT ILIOPSOAS / RECTUS FEMORIS) ==================== */
        <g id="thomas-fault">
          {/* Tight Iliopsoas Muscle Highlight */}
          <path
            d="M 240 162 Q 285 142 325 155"
            stroke="url(#shortMuscleGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            filter="url(#glowShort)"
          />

          {/* Table Level Reference Line */}
          <line x1="250" y1="175" x2="380" y2="175" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Elevation Angle Deviation Arc */}
          <path d="M 345 175 A 95 95 0 0 0 338 138" fill="none" stroke="#f43f5e" strokeWidth="2" />
          <text x="360" y="152" fill="#f43f5e" fontSize="10" fontWeight="bold">&gt; 15° Elevation</text>

          {/* Callouts */}
          <rect x="330" y="65" width="245" height="30" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="452" y="84" fill="#fecdd3" fontSize="10.5" fontWeight="bold" textAnchor="middle">
            ▲ POSITIVE THOMAS TEST (THIGH RISES)
          </text>

          <rect x="330" y="105" width="245" height="28" rx="6" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
          <text x="452" y="123" fill="#fed7aa" fontSize="10" fontWeight="bold" textAnchor="middle">
            Short / Contracted Iliopsoas
          </text>
        </g>
      ) : (
        /* ==================== OPTIMAL: NEGATIVE THOMAS TEST ==================== */
        <g id="thomas-optimal">
          {/* Compliant, Lengthened Psoas */}
          <path d="M 240 166 Q 285 166 330 172" stroke="url(#optimalGrad)" strokeWidth="6" strokeLinecap="round" filter="url(#glowOptimal)" />

          {/* Callouts */}
          <rect x="330" y="75" width="245" height="32" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="452" y="95" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
            ✓ Thigh Rests Parallel to Table (0°)
          </text>

          <rect x="330" y="118" width="245" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="452" y="136" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Full Hip Flexor &amp; Rectus Extensibility
          </text>
        </g>
      )}
    </g>
  );
}

// =============================================================================
// 7. PRONE HIP EXTENSION: HAMSTRING VS GLUTE ACTIVATION SEQUENCE
// =============================================================================
function ProneHipExtensionDiagram({ isFault }: { isFault: boolean }) {
  // Biomechanical coordinate geometry
  const matY = 220;
  const hipX = 265;
  const hipY = isFault ? 204 : 208; // In fault, excessive anterior tilt pivots hip slightly
  const kneeX = 380;
  const kneeY = isFault ? 166 : 176; // Active extension height
  const ankleX = 468;
  const ankleY = isFault ? 150 : 162;

  // Lumbar spine curvature
  // In fault: Hyperlordosis (lumbar dips down/arches forward into hyper-extension)
  const lumbarPath = isFault
    ? `M 155 204 Q 210 200 238 214 Q 252 215 ${hipX} ${hipY - 12}`
    : `M 155 205 Q 210 205 240 206 Q 252 206 ${hipX} ${hipY - 10}`;

  return (
    <g id="diagram-prone-ext">
      {/* Exercise Mat / Plinth Platform */}
      <rect x="50" y={matY} width="500" height="14" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
      <line x1="50" y1={matY} x2="550" y2={matY} stroke="#475569" strokeWidth="2" />
      <text x="540" y={matY + 26} fill="#64748b" fontSize="9.5" textAnchor="end">Rigid Examination Surface / Mat</text>

      {/* Horizontal Baseline Reference */}
      <line x1="265" y1="208" x2="490" y2="208" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

      {/* ================= STATIONARY CONTRALATERAL LOWER LIMB (RESTING ON MAT) ================= */}
      <g id="resting-leg" opacity="0.35">
        {/* Resting Femur & Tibia */}
        <line x1="265" y1="210" x2="385" y2="214" stroke="#64748b" strokeWidth="5.5" strokeLinecap="round" />
        <circle cx="385" cy="214" r="4.5" fill="#475569" />
        <line x1="385" y1="214" x2="475" y2="214" stroke="#64748b" strokeWidth="4.5" strokeLinecap="round" />
        {/* Foot flat on dorsum */}
        <path d="M 475 214 L 495 217 L 485 212 Z" fill="#64748b" />
      </g>

      {/* ================= PRONE UPPER SKELETON (TORSO, RIBS, CRANIUM) ================= */}
      {/* Head Resting on Forearms */}
      <ellipse cx="108" cy="202" rx="14" ry="12" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
      {/* Forearms folded beneath head */}
      <line x1="94" y1="212" x2="135" y2="212" stroke="#94a3b8" strokeWidth="4.5" strokeLinecap="round" />
      {/* Cervical & Upper Thoracic Spine */}
      <line x1="120" y1="204" x2="155" y2="204" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />

      {/* Thoracic Ribcage (Resting on Mat) */}
      <ellipse cx="180" cy={isFault ? 198 : 200} rx="26" ry="14" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
      <path d="M 160 200 Q 180 190 200 200" stroke="#334155" strokeWidth="1" />
      <path d="M 165 205 Q 180 196 195 205" stroke="#334155" strokeWidth="1" />

      {/* Lumbar Spine & Vertebral Segments (L1 - L5) */}
      <path
        d={lumbarPath}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Vertebral disc markers */}
      <circle cx="190" cy={isFault ? 204 : 205} r="2" fill="#38bdf8" />
      <circle cx="212" cy={isFault ? 208 : 205.5} r="2" fill="#38bdf8" />
      <circle cx="232" cy={isFault ? 213 : 206} r="2" fill="#38bdf8" />
      <circle cx="248" cy={isFault ? 212 : 206.5} r="2" fill="#38bdf8" />

      {/* ================= PELVIC BONE & SACRUM ================= */}
      {/* Iliac Wing & Ischium Profile */}
      <path
        d={isFault
          ? `M 248 196 Q ${hipX + 8} 190 ${hipX + 16} 206 Q ${hipX} 218 244 216 Q 242 204 248 196 Z`
          : `M 246 194 Q ${hipX + 8} 192 ${hipX + 16} 206 Q ${hipX + 2} 214 244 212 Q 242 202 246 194 Z`}
        fill="#1e293b"
        stroke={isFault ? '#f43f5e' : '#10b981'}
        strokeWidth="2.2"
      />
      {/* Greater Trochanter Joint */}
      <circle cx={hipX} cy={hipY} r="7" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
      <text x={hipX - 16} y="232" fill="#64748b" fontSize="8.5">Acetabulum</text>

      {/* ================= ACTIVELY EXTENDED TEST LOWER LIMB ================= */}
      {/* Femur Bone Shaft */}
      <line x1={hipX} y1={hipY} x2={kneeX} y2={kneeY} stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />
      {/* Femoral Condyle & Knee Joint */}
      <circle cx={kneeX} cy={kneeY} r="6.5" fill={isFault ? '#f43f5e' : '#10b981'} stroke="#0f172a" strokeWidth="1.5" />
      <text x={kneeX} y={kneeY + 16} fill="#64748b" fontSize="8.5" textAnchor="middle">Patella / Knee</text>

      {/* Tibia & Fibula */}
      <line x1={kneeX} y1={kneeY} x2={ankleX} y2={ankleY} stroke="#cbd5e1" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx={ankleX} cy={ankleY} r="4.5" fill="#38bdf8" />

      {/* Foot (Ankle & Metatarsals in Plantar/Neutral Extension) */}
      <path
        d={`M ${ankleX} ${ankleY} L ${ankleX + 22} ${ankleY - 8} L ${ankleX + 14} ${ankleY + 4} Z`}
        fill="#1e293b"
        stroke="#cbd5e1"
        strokeWidth="1.5"
      />

      {/* Extension Range Arc & Degree Label */}
      <path
        d={`M ${hipX + 60} 208 A 60 60 0 0 0 ${hipX + 56} ${isFault ? 186 : 192}`}
        fill="none"
        stroke={isFault ? '#f43f5e' : '#10b981'}
        strokeWidth="2"
      />
      <text x={hipX + 68} y={isFault ? 194 : 198} fill={isFault ? '#f43f5e' : '#10b981'} fontSize="9" fontWeight="bold">
        {isFault ? '15° Ext + Lordosis' : '10°-15° Pure Hip Ext'}
      </text>

      {/* ================= MUSCLE ACTIVATION OVERLAYS & FIRING ORDER ================= */}
      {isFault ? (
        /* ==================== FAULT: SYNERGISTIC DOMINANCE (HAMSTRING 1ST -> ERECTORS 2ND -> GLUTE 3RD) ==================== */
        <g id="prone-fault-sequence">
          {/* 1. HAMSTRING DOMINANCE (FIRES 1ST) - Biceps Femoris & Semitendinosus */}
          <path
            d={`M ${hipX + 10} 210 Q ${hipX + 65} ${kneeY + 18} ${kneeX - 4} ${kneeY + 4}`}
            stroke="url(#shortMuscleGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="url(#glowShort)"
          />
          {/* 1st Firing Badge on Hamstrings */}
          <g transform={`translate(${hipX + 50}, ${kneeY + 22})`}>
            <rect x="0" y="0" width="138" height="22" rx="4" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
            <text x="69" y="15" fill="#fecdd3" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              1st Firing: Hamstrings (Dominant)
            </text>
          </g>

          {/* 2. LUMBAR HYPERACTIVITY (FIRES 2ND) - Erector Spinae & Quadratus Lumborum */}
          <path
            d="M 195 198 Q 235 204 258 195"
            stroke="url(#shortMuscleGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            filter="url(#glowShort)"
          />
          {/* Upward Lordotic Torque Arrow */}
          <line x1="225" y1="218" x2="225" y2="234" stroke="#f43f5e" strokeWidth="2" markerEnd="url(#arrow)" />
          {/* 2nd Firing Badge on Lower Back */}
          <g transform="translate(145, 160)">
            <rect x="0" y="0" width="138" height="22" rx="4" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
            <text x="69" y="15" fill="#fed7aa" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              2nd Firing: Lumbar Erectors
            </text>
          </g>

          {/* 3. DORMANT / INHIBITED GLUTEUS MAXIMUS (FIRES 3RD OR DELAYED) */}
          <path
            d={`M 252 195 Q ${hipX + 16} 184 ${hipX + 22} 204`}
            stroke="#06b6d4"
            strokeWidth="4"
            strokeDasharray="3 3"
            strokeLinecap="round"
            filter="url(#glowWeak)"
          />
          {/* Delayed Glute Badge */}
          <g transform={`translate(${hipX - 10}, 128)`}>
            <rect x="0" y="0" width="135" height="22" rx="4" fill="#083344" stroke="#06b6d4" strokeWidth="1.2" />
            <text x="67" y="15" fill="#a5f3fc" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              3rd / Delayed: Glute Max
            </text>
          </g>

          {/* Clinical Diagnostic Callouts */}
          <rect x="290" y="42" width="285" height="32" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="432" y="62" fill="#fecdd3" fontSize="10.5" fontWeight="bold" textAnchor="middle">
            ▲ FAULTY FIRING ORDER (HAMSTRING 1ST)
          </text>

          <rect x="290" y="80" width="285" height="30" rx="6" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
          <text x="432" y="99" fill="#fed7aa" fontSize="10" fontWeight="bold" textAnchor="middle">
            Synergistic Dominance &amp; Lumbar Hyperextension
          </text>
        </g>
      ) : (
        /* ==================== OPTIMAL: GLUTEUS MAXIMUS INITIATES FIRST WITH PELVIC STABILITY ==================== */
        <g id="prone-optimal-sequence">
          {/* 1. PRIMARY GLUTEUS MAXIMUS INITIATION (FIRES 1ST) */}
          <path
            d={`M 250 193 Q ${hipX + 18} 184 ${hipX + 26} 205`}
            stroke="url(#optimalGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="url(#glowOptimal)"
          />
          {/* 1st Firing Badge on Glute Max */}
          <g transform={`translate(${hipX - 15}, 142)`}>
            <rect x="0" y="0" width="152" height="22" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
            <text x="76" y="15" fill="#a7f3d0" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              ✓ 1st Firing: Gluteus Maximus
            </text>
          </g>

          {/* 2. SYNERGISTIC HAMSTRINGS (FIRES 2ND AS ASSISTOR) */}
          <path
            d={`M ${hipX + 12} 210 Q ${hipX + 65} ${kneeY + 16} ${kneeX - 4} ${kneeY + 4}`}
            stroke="#10b981"
            strokeWidth="4.5"
            strokeLinecap="round"
            opacity="0.7"
          />
          {/* 2nd Firing Badge on Hamstrings */}
          <g transform={`translate(${hipX + 50}, ${kneeY + 22})`}>
            <rect x="0" y="0" width="138" height="22" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
            <text x="69" y="15" fill="#a7f3d0" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              ✓ 2nd: Synergistic Hamstring
            </text>
          </g>

          {/* 3. NEUTRAL LUMBAR CORE STABILIZERS (FIRES 3RD / STABILIZING ONLY) */}
          <path
            d="M 195 204 Q 225 204 250 204"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* Pelvis Pinned / ASIS Contact Indicator */}
          <circle cx="250" cy="214" r="3.5" fill="#10b981" />
          <text x="220" y="235" fill="#10b981" fontSize="8.5" fontWeight="bold">ASIS Grounded</text>

          {/* Clinical Diagnostic Callouts */}
          <rect x="290" y="45" width="285" height="32" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="432" y="65" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
            ✓ Normal Recruitment (Glute Max 1st)
          </text>

          <rect x="290" y="84" width="285" height="30" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="432" y="103" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Stable Pelvis &amp; Neutral Lumbar Spine (0° Arch)
          </text>
        </g>
      )}
    </g>
  );
}

// =============================================================================
// 8. OVERHEAD SQUAT: ARMS FALL FORWARD (ANATOMICALLY ACCURATE)
// =============================================================================
function OverheadSquatArmsFallDiagram({ isFault }: { isFault: boolean }) {
  return (
    <g id="diagram-arms-fall">
      {/* Ground Plane */}
      <line x1="40" y1="275" x2="560" y2="275" stroke="#475569" strokeWidth="2" />
      <text x="550" y="292" fill="#64748b" fontSize="10" textAnchor="end">Ground Plane</text>

      {/* Base Plumb Line */}
      <line x1="215" y1="35" x2="215" y2="275" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />

      {/* Squat Foot Base (Tripod Flat on Floor) */}
      <path
        d="M 170 275 L 255 275 L 250 268 L 180 270 Z"
        fill="#1e293b"
        stroke="#10b981"
        strokeWidth="2.5"
      />
      <circle cx="250" cy="272" r="3.5" fill="#10b981" />

      {/* Shin / Tibia (Angled forward 49°) */}
      <line x1="250" y1="268" x2="180" y2="185" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
      <circle cx="180" cy="185" r="6" fill="#10b981" />

      {/* Thigh / Femur */}
      <line x1="180" y1="185" x2="275" y2="195" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
      <circle cx="275" cy="195" r="7" fill="#38bdf8" />

      {/* Torso / Spine (Strictly Parallel to Shins) */}
      <line x1="275" y1="195" x2="205" y2="112" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
      <circle cx="205" cy="112" r="6" fill={isFault ? '#f43f5e' : '#38bdf8'} />

      {/* Head & Neck (Neutral alignment) */}
      <line x1="205" y1="112" x2="195" y2="100" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
      <circle cx="188" cy="88" r="14" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2.5" />

      {isFault ? (
        /* ==================== ARMS FALL FAULT ==================== */
        <g id="arms-fall-fault">
          {/* Spinal Axis Extension Reference (Where arms SHOULD be) */}
          <line x1="205" y1="112" x2="145" y2="42" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          <circle cx="145" cy="42" r="5" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2 2" />

          {/* Fallen Arms Line (Pitched 35° forward below spinal plane) */}
          <line x1="205" y1="112" x2="120" y2="105" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />

          {/* Barbell Falling Forward */}
          <circle cx="120" cy="105" r="7" fill="#0f172a" stroke="#f43f5e" strokeWidth="2.5" />
          <circle cx="120" cy="105" r="16" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x="120" y="82" fill="#f43f5e" fontSize="10" fontWeight="bold" textAnchor="middle">Bar</text>

          {/* Angle Deviation Arc between Spinal Axis and Arms */}
          <path d="M 175 78 A 45 45 0 0 1 155 108" fill="none" stroke="#f43f5e" strokeWidth="2" />
          <text x="175" y="105" fill="#fda4af" fontSize="10" fontWeight="bold">35° Drop</text>

          {/* Short Latissimus Dorsi & Pec Minor (Posterior/Lateral Thorax) */}
          <path
            d="M 260 180 Q 235 145 208 118"
            stroke="url(#shortMuscleGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            filter="url(#glowShort)"
          />

          {/* Weak Lower Trapezius / Rhomboids */}
          <path
            d="M 245 150 L 220 125"
            stroke="#06b6d4"
            strokeWidth="3.5"
            strokeDasharray="3 3"
            filter="url(#glowWeak)"
          />

          {/* Callouts */}
          <rect x="290" y="45" width="240" height="30" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="410" y="64" fill="#fecdd3" fontSize="11" fontWeight="bold" textAnchor="middle">
            ▲ Arms Pitch Forward (&gt;15° below spine)
          </text>

          <rect x="300" y="115" width="220" height="28" rx="6" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
          <text x="410" y="133" fill="#fed7aa" fontSize="10" fontWeight="bold" textAnchor="middle">
            Short Latissimus Dorsi &amp; Pec Minor
          </text>

          <rect x="300" y="155" width="220" height="28" rx="6" fill="#083344" stroke="#06b6d4" strokeWidth="1.2" />
          <text x="410" y="173" fill="#a5f3fc" fontSize="10" fontWeight="bold" textAnchor="middle">
            Weak Lower Trapezius &amp; Rhomboids
          </text>
        </g>
      ) : (
        /* ==================== ARMS OPTIMAL ==================== */
        <g id="arms-fall-optimal">
          {/* Arms Overhead (Locked inline with spinal axis) */}
          <line x1="205" y1="112" x2="145" y2="42" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />

          {/* Barbell Overhead Stacked with Midfoot */}
          <circle cx="145" cy="42" r="7" fill="#0f172a" stroke="#10b981" strokeWidth="2.5" />
          <circle cx="145" cy="42" r="18" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x="145" y="18" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">Bar</text>

          {/* Active Mid/Lower Trapezius */}
          <path d="M 255 170 L 215 120" stroke="#10b981" strokeWidth="4" strokeLinecap="round" opacity="0.6" />

          {/* Callouts */}
          <rect x="310" y="45" width="220" height="32" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="420" y="65" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
            ✓ Arms Lock Inline with Spine (180°)
          </text>

          <rect x="310" y="90" width="220" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="420" y="108" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Barbell Stacked Over Midfoot
          </text>
        </g>
      )}
    </g>
  );
}

// =============================================================================
// 9. ROUNDED SHOULDERS & INTERNAL ARM ROTATION (DUAL PERSPECTIVE: ANTERIOR + SAGITTAL)
// =============================================================================
function RoundedShouldersDiagram({ isFault }: { isFault: boolean }) {
  // Left Sub-Panel: Anterior (Frontal) View (X: 10 to 290, Center = 150)
  const frontCenterX = 150;
  const frontSternalNotchY = 90;
  const frontSternumBottomY = 162;

  // Frontal Bilateral Shoulder Coordinates
  // Fault: Narrowed slumped shoulders (span 100px), inward pectoral pull
  // Optimal: Broad open chest (span 144px), retracted girdle
  const fLeftAcromionX = isFault ? 100 : 78;
  const fLeftAcromionY = isFault ? 104 : 96;
  const fRightAcromionX = isFault ? 200 : 222;
  const fRightAcromionY = isFault ? 104 : 96;

  const fLeftElbowX = isFault ? 92 : 68;
  const fLeftElbowY = isFault ? 176 : 172;
  const fRightElbowX = isFault ? 208 : 232;
  const fRightElbowY = isFault ? 176 : 172;

  const fLeftWristX = isFault ? 88 : 64;
  const fLeftWristY = isFault ? 236 : 234;
  const fRightWristX = isFault ? 212 : 236;
  const fRightWristY = isFault ? 236 : 234;

  // Right Sub-Panel: Sagittal (Lateral Profile) View (X: 310 to 590, Plumb Line = 465)
  const plumbX = 465;
  const sEarX = isFault ? 418 : 465;
  const sEarY = 56;
  const sAcromionX = isFault ? 408 : 465;
  const sAcromionY = 118;
  const sElbowX = isFault ? 402 : 465;
  const sElbowY = 188;
  const sWristX = isFault ? 398 : 465;
  const sWristY = 246;

  return (
    <g id="diagram-rounded-shoulders-dual">
      {/* Central Viewport Divider */}
      <line x1="300" y1="20" x2="300" y2="295" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />

      {/* ========================================================================= */}
      {/* LEFT PANEL: ANTERIOR (FRONT) VIEW - BILATERAL ARMS & INTERNAL ROTATION   */}
      {/* ========================================================================= */}
      <g id="panel-anterior-view">
        {/* Panel Header Badge */}
        <rect x="22" y="14" width="256" height="24" rx="5" fill="#0f172a" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="1" />
        <text x="150" y="30" fill={isFault ? '#fda4af' : '#6ee7b7'} fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
          1. ANTERIOR (FRONT) VIEW: ARM ROTATION
        </text>

        {/* Bi-Acromial Width Line */}
        <line x1={fLeftAcromionX} y1="62" x2={fRightAcromionX} y2="62" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="1.5" strokeDasharray="2 2" />
        <circle cx={fLeftAcromionX} cy="62" r="2" fill={isFault ? '#f43f5e' : '#10b981'} />
        <circle cx={fRightAcromionX} cy="62" r="2" fill={isFault ? '#f43f5e' : '#10b981'} />
        <text x={frontCenterX} y="57" fill={isFault ? '#fda4af' : '#a7f3d0'} fontSize="8" fontWeight="bold" textAnchor="middle">
          {isFault ? 'Narrowed Shoulder Span (Slumped Inward)' : 'Broad Neutral Width (Open)'}
        </text>

        {/* Cranium & Cervical Spine */}
        <ellipse cx={frontCenterX} cy="50" rx="14" ry="16" fill="#1e293b" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="2" />
        <circle cx={frontCenterX - 4} cy="48" r="1.5" fill="#64748b" />
        <circle cx={frontCenterX + 4} cy="48" r="1.5" fill="#64748b" />
        <line x1={frontCenterX} y1="66" x2={frontCenterX} y2={frontSternalNotchY} stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />

        {/* Ribcage Outline */}
        <path
          d={isFault
            ? `M 115 ${frontSternumBottomY + 20} C 105 125 120 98 ${frontCenterX} 96 C 180 98 195 125 185 ${frontSternumBottomY + 20} C 165 ${frontSternumBottomY + 28} 135 ${frontSternumBottomY + 28} 115 ${frontSternumBottomY + 20} Z`
            : `M 104 ${frontSternumBottomY + 20} C 92 125 115 94 ${frontCenterX} 92 C 185 94 208 125 196 ${frontSternumBottomY + 20} C 172 ${frontSternumBottomY + 28} 128 ${frontSternumBottomY + 28} 104 ${frontSternumBottomY + 20} Z`}
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1.2"
          opacity="0.65"
        />

        {/* Sternum */}
        <line x1={frontCenterX} y1={frontSternalNotchY} x2={frontCenterX} y2={frontSternumBottomY} stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx={frontCenterX} cy={frontSternalNotchY} r="3.5" fill="#38bdf8" />
        <circle cx={frontCenterX} cy={frontSternumBottomY} r="2.5" fill="#64748b" />

        {/* Bilateral Clavicles */}
        <path d={`M ${frontCenterX} ${frontSternalNotchY} Q ${isFault ? '128 94' : '120 88'} ${fLeftAcromionX} ${fLeftAcromionY}`} stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d={`M ${frontCenterX} ${frontSternalNotchY} Q ${isFault ? '172 94' : '180 88'} ${fRightAcromionX} ${fRightAcromionY}`} stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" fill="none" />

        {/* Glenohumeral Joints */}
        <circle cx={fLeftAcromionX} cy={fLeftAcromionY} r="6.5" fill={isFault ? '#f43f5e' : '#10b981'} stroke="#0f172a" strokeWidth="1.5" />
        <circle cx={fRightAcromionX} cy={fRightAcromionY} r="6.5" fill={isFault ? '#f43f5e' : '#10b981'} stroke="#0f172a" strokeWidth="1.5" />

        {/* Upper Arms (Humerus) */}
        <line x1={fLeftAcromionX} y1={fLeftAcromionY} x2={fLeftElbowX} y2={fLeftElbowY} stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
        <line x1={fRightAcromionX} y1={fRightAcromionY} x2={fRightElbowX} y2={fRightElbowY} stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
        <circle cx={fLeftElbowX} cy={fLeftElbowY} r="4.5" fill="#38bdf8" />
        <circle cx={fRightElbowX} cy={fRightElbowY} r="4.5" fill="#38bdf8" />

        {/* Forearms */}
        <line x1={fLeftElbowX} y1={fLeftElbowY} x2={fLeftWristX} y2={fLeftWristY} stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
        <line x1={fRightElbowX} y1={fRightElbowY} x2={fRightWristX} y2={fRightWristY} stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx={fLeftWristX} cy={fLeftWristY} r="3.5" fill="#38bdf8" />
        <circle cx={fRightWristX} cy={fRightWristY} r="3.5" fill="#38bdf8" />

        {/* Hand Phenotypes & Rotations */}
        {isFault ? (
          <g id="fault-anterior-hands">
            {/* Left Hand: Dorsum & Knuckles Facing Forward */}
            <rect x={fLeftWristX - 6} y={fLeftWristY} width="12" height="20" rx="3" fill="#1e293b" stroke="#f43f5e" strokeWidth="1.5" />
            <circle cx={fLeftWristX - 3.5} cy={fLeftWristY + 10} r="1.2" fill="#f43f5e" />
            <circle cx={fLeftWristX - 1.2} cy={fLeftWristY + 11} r="1.2" fill="#f43f5e" />
            <circle cx={fLeftWristX + 1.2} cy={fLeftWristY + 11} r="1.2" fill="#f43f5e" />
            <circle cx={fLeftWristX + 3.5} cy={fLeftWristY + 10} r="1.2" fill="#f43f5e" />

            {/* Right Hand: Dorsum & Knuckles Facing Forward */}
            <rect x={fRightWristX - 6} y={fRightWristY} width="12" height="20" rx="3" fill="#1e293b" stroke="#f43f5e" strokeWidth="1.5" />
            <circle cx={fRightWristX - 3.5} cy={fRightWristY + 10} r="1.2" fill="#f43f5e" />
            <circle cx={fRightWristX - 1.2} cy={fRightWristY + 11} r="1.2" fill="#f43f5e" />
            <circle cx={fRightWristX + 1.2} cy={fRightWristY + 11} r="1.2" fill="#f43f5e" />
            <circle cx={fRightWristX + 3.5} cy={fRightWristY + 10} r="1.2" fill="#f43f5e" />

            {/* Internal Rotation Torque Spiral Indicator */}
            <path d={`M ${fLeftElbowX + 9} ${fLeftElbowY - 24} C ${fLeftElbowX - 9} ${fLeftElbowY - 18} ${fLeftElbowX - 7} ${fLeftElbowY - 8} ${fLeftElbowX + 8} ${fLeftElbowY - 6}`} fill="none" stroke="#f43f5e" strokeWidth="1.8" markerEnd="url(#arrow)" />
            <path d={`M ${fRightElbowX - 9} ${fRightElbowY - 24} C ${fRightElbowX + 9} ${fRightElbowY - 18} ${fRightElbowX + 7} ${fRightElbowY - 8} ${fRightElbowX - 8} ${fRightElbowY - 6}`} fill="none" stroke="#f43f5e" strokeWidth="1.8" markerEnd="url(#arrow)" />

            {/* Bottom Callout Badge */}
            <rect x="26" y="264" width="248" height="26" rx="5" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
            <text x="150" y="281" fill="#fecdd3" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              ▲ Gorilla Sign: Knuckles Forward (IR)
            </text>
          </g>
        ) : (
          <g id="optimal-anterior-hands">
            {/* Left Hand: Thumbs Pointing Forward */}
            <path d={`M ${fLeftWristX} ${fLeftWristY} L ${fLeftWristX - 2} ${fLeftWristY + 20} L ${fLeftWristX + 3} ${fLeftWristY + 20} Z`} fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
            <line x1={fLeftWristX} y1={fLeftWristY + 5} x2={fLeftWristX - 6} y2={fLeftWristY + 10} stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />

            {/* Right Hand: Thumbs Pointing Forward */}
            <path d={`M ${fRightWristX} ${fRightWristY} L ${fRightWristX + 2} ${fRightWristY + 20} L ${fRightWristX - 3} ${fRightWristY + 20} Z`} fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
            <line x1={fRightWristX} y1={fRightWristY + 5} x2={fRightWristX + 6} y2={fRightWristY + 10} stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />

            {/* Bottom Callout Badge */}
            <rect x="26" y="264" width="248" height="26" rx="5" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
            <text x="150" y="281" fill="#a7f3d0" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              ✓ Neutral Arms: Thumbs Straight Forward
            </text>
          </g>
        )}
      </g>

      {/* ========================================================================= */}
      {/* RIGHT PANEL: SAGITTAL (PROFILE) VIEW - PLUMB LINE & FORWARD SLUMP         */}
      {/* ========================================================================= */}
      <g id="panel-sagittal-view">
        {/* Panel Header Badge */}
        <rect x="322" y="14" width="256" height="24" rx="5" fill="#0f172a" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="1" />
        <text x="450" y="30" fill={isFault ? '#fda4af' : '#6ee7b7'} fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
          2. SAGITTAL (PROFILE) VIEW: FORWARD SLUMP
        </text>

        {/* Coronal Plumb Line */}
        <line x1={plumbX} y1="45" x2={plumbX} y2="258" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
        <text x={plumbX + 5} y="54" fill="#64748b" fontSize="8">Plumb Line</text>

        {/* Thoracic Vertebral Spine */}
        {isFault ? (
          <path d="M 465 245 C 460 200 500 150 450 102" fill="none" stroke="#cbd5e1" strokeWidth="6.5" strokeLinecap="round" />
        ) : (
          <path d="M 465 245 C 465 200 471 150 465 102" fill="none" stroke="#cbd5e1" strokeWidth="6.5" strokeLinecap="round" />
        )}

        {/* Ribcage Outline */}
        <path
          d={isFault
            ? "M 425 168 Q 395 138 425 110 L 468 108 Q 492 142 465 174 Z"
            : "M 436 168 Q 412 138 438 110 L 472 108 Q 490 142 468 174 Z"}
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1.2"
          opacity="0.65"
        />

        {/* Cervical Spine & Cranium */}
        <line x1={isFault ? 450 : 465} y1="102" x2={sEarX} y2={sEarY + 12} stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
        <ellipse cx={sEarX} cy={sEarY} rx="15" ry="17" fill="#1e293b" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="2" />
        <circle cx={sEarX} cy={sEarY} r="3" fill="#38bdf8" />
        <text x={sEarX - 16} y={sEarY - 8} fill="#64748b" fontSize="7.5">Auditory Meatus</text>

        {/* Clavicle & Shoulder Joint (Acromion) */}
        <line x1={isFault ? 435 : 450} y1="104" x2={sAcromionX} y2={sAcromionY} stroke="#cbd5e1" strokeWidth="5.5" strokeLinecap="round" />
        <circle cx={sAcromionX} cy={sAcromionY} r="7.5" fill={isFault ? '#f43f5e' : '#10b981'} stroke="#0f172a" strokeWidth="1.5" />

        {/* Profile Humerus & Forearm */}
        <line x1={sAcromionX} y1={sAcromionY} x2={sElbowX} y2={sElbowY} stroke="#cbd5e1" strokeWidth="5.5" strokeLinecap="round" />
        <circle cx={sElbowX} cy={sElbowY} r="4.5" fill="#38bdf8" />
        <line x1={sElbowX} y1={sElbowY} x2={sWristX} y2={sWristY} stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx={sWristX} cy={sWristY} r="3.5" fill="#38bdf8" />

        {isFault ? (
          <g id="fault-sagittal-mechanics">
            {/* Tight Pectoralis Minor / Major Pull Vector */}
            <path d={`M 430 148 Q 412 132 ${sAcromionX} ${sAcromionY}`} stroke="url(#shortMuscleGrad)" strokeWidth="6.5" strokeLinecap="round" filter="url(#glowShort)" />

            {/* Strained Rhomboids / Lower Traps */}
            <path d="M 478 118 Q 494 142 476 170" stroke="#06b6d4" strokeWidth="3" strokeDasharray="3 3" filter="url(#glowWeak)" />

            {/* Anterior Displacement Vector Arrow */}
            <line x1={plumbX} y1={sAcromionY} x2={sAcromionX} y2={sAcromionY} stroke="#f43f5e" strokeWidth="2" markerEnd="url(#arrow)" />
            <text x="412" y={sAcromionY - 12} fill="#f43f5e" fontSize="9" fontWeight="bold">
              &gt; 2.5cm Anterior Drift
            </text>

            {/* Forward Head Offset Arrow */}
            <line x1={plumbX} y1={sEarY} x2={sEarX} y2={sEarY} stroke="#ea580c" strokeWidth="1.5" markerEnd="url(#arrow)" />

            {/* Bottom Callout Badge */}
            <rect x="326" y="264" width="248" height="26" rx="5" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
            <text x="450" y="281" fill="#fecdd3" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              ▲ Hyper-Kyphosis &amp; Humeral Protraction
            </text>
          </g>
        ) : (
          <g id="optimal-sagittal-mechanics">
            {/* Active Periscapular Stabilization */}
            <path d="M 468 114 Q 476 138 470 165" stroke="url(#optimalGrad)" strokeWidth="5.5" strokeLinecap="round" filter="url(#glowOptimal)" />

            {/* 0cm Deviation Stacking Badge */}
            <circle cx={plumbX} cy={sAcromionY} r="4" fill="#10b981" />
            <text x="474" y={sAcromionY + 4} fill="#a7f3d0" fontSize="8.5" fontWeight="bold">0cm Alignment</text>

            {/* Bottom Callout Badge */}
            <rect x="326" y="264" width="248" height="26" rx="5" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
            <text x="450" y="281" fill="#a7f3d0" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              ✓ Ear &amp; Acromion Stacked on Plumb Line
            </text>
          </g>
        )}
      </g>
    </g>
  );
}

// =============================================================================
// 10. SCAPULAR WINGING / WALL PRESS (DUAL PERSPECTIVE: POSTERIOR + SAGITTAL WALL PRESS)
// =============================================================================
function ScapularWingingDiagram({ isFault }: { isFault: boolean }) {
  // Left Panel (Posterior / Back View): Center = 150
  const backCenterX = 150;
  const backSpineTopY = 78;
  const backSpineBottomY = 245;

  // Right Panel (Sagittal Wall Press View): Torso at ~390, Wall at 565
  const wallX = 565;
  const torsoX = 390;
  const torsoY = 155;
  const shoulderX = 415;
  const shoulderY = 120;
  const handX = 562;
  const handY = 120;

  return (
    <g id="diagram-winging-dual">
      {/* Central Viewport Divider */}
      <line x1="300" y1="20" x2="300" y2="295" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />

      {/* ========================================================================= */}
      {/* LEFT PANEL: POSTERIOR (BACK) VIEW - SCAPULAE & THORACIC SKELETON          */}
      {/* ========================================================================= */}
      <g id="panel-posterior-view">
        {/* Header Badge */}
        <rect x="22" y="14" width="256" height="24" rx="5" fill="#0f172a" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="1" />
        <text x="150" y="30" fill={isFault ? '#fda4af' : '#6ee7b7'} fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
          1. POSTERIOR (BACK) VIEW: SCAPULAE
        </text>

        {/* Cranium (Posterior Occiput) */}
        <ellipse cx={backCenterX} cy="48" rx="15" ry="17" fill="#1e293b" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="2" />
        <line x1={backCenterX} y1="65" x2={backCenterX} y2={backSpineTopY} stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />

        {/* Ribcage Contour (Back Outline) */}
        <path
          d={`M 100 215 C 85 140 108 96 ${backCenterX} 94 C 192 96 215 140 200 215 C 180 230 120 230 100 215 Z`}
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1.2"
          opacity="0.6"
        />

        {/* Thoracic Vertebral Spine with Spinous Processes */}
        <line x1={backCenterX} y1={backSpineTopY} x2={backCenterX} y2={backSpineBottomY} stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
        <circle cx={backCenterX} cy="96" r="2.5" fill="#38bdf8" />
        <circle cx={backCenterX} cy="120" r="2.5" fill="#38bdf8" />
        <circle cx={backCenterX} cy="144" r="2.5" fill="#38bdf8" />
        <circle cx={backCenterX} cy="168" r="2.5" fill="#38bdf8" />
        <circle cx={backCenterX} cy="192" r="2.5" fill="#38bdf8" />
        <circle cx={backCenterX} cy="216" r="2.5" fill="#38bdf8" />
        <text x={backCenterX} y="235" fill="#64748b" fontSize="7.5" textAnchor="middle">Thoracic Spine</text>

        {/* Bilateral Shoulder Joints (Reaching Forward) */}
        <line x1={backCenterX} y1={backSpineTopY + 8} x2="82" y2="105" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
        <line x1={backCenterX} y1={backSpineTopY + 8} x2="218" y2="105" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="82" cy="105" r="6" fill={isFault ? '#f43f5e' : '#10b981'} stroke="#0f172a" strokeWidth="1.5" />
        <circle cx="218" cy="105" r="6" fill={isFault ? '#f43f5e' : '#10b981'} stroke="#0f172a" strokeWidth="1.5" />

        {/* Arms Forward into Screen */}
        <line x1="82" y1="105" x2="65" y2="155" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" opacity="0.8" />
        <line x1="218" y1="105" x2="235" y2="155" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" opacity="0.8" />

        {/* RIGHT SCAPULA (Subject's Right = Viewer's Left): Normal / Control Baseline */}
        <path
          d="M 94 112 L 132 118 L 118 172 Z"
          fill="#1e293b"
          stroke="#10b981"
          strokeWidth="2"
        />
        <text x="70" y="140" fill="#6ee7b7" fontSize="7.5" fontWeight="bold">Flush</text>

        {/* LEFT SCAPULA (Subject's Left = Viewer's Right): Winging in Fault vs Stable in Optimal */}
        {isFault ? (
          <g id="fault-posterior-winging">
            {/* Winged Scapula: Lifted & Tilted Medial Border */}
            <path
              d="M 206 112 L 160 120 L 175 180 Z"
              fill="#4c0519"
              stroke="#f43f5e"
              strokeWidth="2.5"
              filter="url(#glowShort)"
            />
            {/* Medial Border Prominence Highlight Line */}
            <line x1="160" y1="120" x2="175" y2="180" stroke="#f43f5e" strokeWidth="3.5" strokeLinecap="round" />

            {/* Winging Lift Distance Arrow */}
            <line x1="150" y1="150" x2="168" y2="150" stroke="#f43f5e" strokeWidth="2" markerEnd="url(#arrow)" />
            <text x="178" y="146" fill="#f43f5e" fontSize="8" fontWeight="bold">&gt; 1.5cm Lift</text>

            {/* Weak Serratus Anterior Inactive Slings */}
            <path d="M 206 112 Q 225 130 205 155" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="3 3" fill="none" filter="url(#glowWeak)" />

            {/* Callout Badge */}
            <rect x="26" y="264" width="248" height="26" rx="5" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
            <text x="150" y="281" fill="#fecdd3" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              ▲ Medial Border &amp; Inferior Angle Prominent
            </text>
          </g>
        ) : (
          <g id="optimal-posterior-stable">
            {/* Stable Scapula Flush against Thoracic Wall */}
            <path
              d="M 206 112 L 168 118 L 182 172 Z"
              fill="#064e3b"
              stroke="#10b981"
              strokeWidth="2"
            />
            {/* Active Serratus Anterior Muscular Slings */}
            <path d="M 206 112 Q 225 130 202 155" stroke="url(#optimalGrad)" strokeWidth="4.5" strokeLinecap="round" fill="none" filter="url(#glowOptimal)" />

            {/* Callout Badge */}
            <rect x="26" y="264" width="248" height="26" rx="5" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
            <text x="150" y="281" fill="#a7f3d0" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              ✓ Bilateral Scapulae Flush to Ribcage
            </text>
          </g>
        )}
      </g>

      {/* ========================================================================= */}
      {/* RIGHT PANEL: SAGITTAL (PROFILE) VIEW - ACTIVE WALL PRESS MECHANICS        */}
      {/* ========================================================================= */}
      <g id="panel-sagittal-wall-press">
        {/* Header Badge */}
        <rect x="322" y="14" width="256" height="24" rx="5" fill="#0f172a" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="1" />
        <text x="450" y="30" fill={isFault ? '#fda4af' : '#6ee7b7'} fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
          2. SAGITTAL (PROFILE) VIEW: WALL PRESS
        </text>

        {/* The Wall Surface */}
        <line x1={wallX} y1="45" x2={wallX} y2="258" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
        {/* Wall Texture Hatching */}
        <line x1={wallX} y1="60" x2={wallX + 12} y2="52" stroke="#334155" strokeWidth="1.5" />
        <line x1={wallX} y1="100" x2={wallX + 12} y2="92" stroke="#334155" strokeWidth="1.5" />
        <line x1={wallX} y1="140" x2={wallX + 12} y2="132" stroke="#334155" strokeWidth="1.5" />
        <line x1={wallX} y1="180" x2={wallX + 12} y2="172" stroke="#334155" strokeWidth="1.5" />
        <line x1={wallX} y1="220" x2={wallX + 12} y2="212" stroke="#334155" strokeWidth="1.5" />
        <text x={wallX - 8} y="54" fill="#94a3b8" fontSize="8" textAnchor="end">Wall Surface</text>

        {/* Angled Forward Torso & Thoracic Cage in Isometric Press */}
        <path
          d={`M ${torsoX - 25} 245 C ${torsoX - 20} 185 ${torsoX - 5} 135 ${torsoX + 25} 112 L ${torsoX + 5} 168 Z`}
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1.5"
          opacity="0.7"
        />

        {/* Cervical Spine & Cranium Pitched Forward */}
        <line x1={torsoX + 20} y1="112" x2={torsoX + 32} y2="72" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
        <ellipse cx={torsoX + 36} cy="58" rx="14" ry="16" fill="#1e293b" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="2" />

        {/* Glenohumeral Joint */}
        <circle cx={shoulderX} cy={shoulderY} r="7" fill={isFault ? '#f43f5e' : '#10b981'} stroke="#0f172a" strokeWidth="1.5" />

        {/* Extended Arm Under Isometric Press against Wall */}
        <line x1={shoulderX} y1={shoulderY} x2="485" y2="120" stroke="#cbd5e1" strokeWidth="5.5" strokeLinecap="round" />
        <circle cx="485" cy="120" r="4.5" fill="#38bdf8" />
        <line x1="485" y1="120" x2={handX} y2={handY} stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />

        {/* Hand Palm Pressed on Wall */}
        <rect x={handX - 2} y={handY - 14} width="5" height="28" rx="2" fill="#38bdf8" stroke="#0f172a" strokeWidth="1" />
        {/* Isometric Force Reaction Arrow */}
        <line x1={handX - 5} y1="102" x2={handX - 35} y2="102" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x={handX - 20} y="96" fill="#38bdf8" fontSize="7.5" fontWeight="bold" textAnchor="middle">Press Force</text>

        {isFault ? (
          <g id="fault-sagittal-scapular-lift">
            {/* Scapula Blade Lifting Posteriorly off Ribcage */}
            <path
              d={`M ${shoulderX - 10} 118 L ${shoulderX - 36} 132 L ${shoulderX - 44} 168 Z`}
              fill="#4c0519"
              stroke="#f43f5e"
              strokeWidth="2.5"
              filter="url(#glowShort)"
            />

            {/* Posterior Protrusion Vector Arrow */}
            <line x1={shoulderX - 22} y1="148" x2={shoulderX - 56} y2="148" stroke="#f43f5e" strokeWidth="2.5" markerEnd="url(#arrow)" />
            <text x={shoulderX - 60} y="142" fill="#f43f5e" fontSize="8.5" fontWeight="bold" textAnchor="end">
              Posterior Lift
            </text>

            {/* Inactive Serratus Anterior (Cannot Protracted / Pin Scapula) */}
            <path
              d={`M ${shoulderX - 18} 128 Q ${shoulderX + 15} 145 ${shoulderX - 5} 165`}
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeDasharray="3 3"
              fill="none"
              filter="url(#glowWeak)"
            />
            <text x="390" y="196" fill="#a5f3fc" fontSize="8" fontWeight="bold">Serratus Inactive</text>

            {/* Callout Badge */}
            <rect x="326" y="264" width="248" height="26" rx="5" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
            <text x="450" y="281" fill="#fecdd3" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              ▲ Scapula Fails to Stabilize Under Load
            </text>
          </g>
        ) : (
          <g id="optimal-sagittal-scapular-anchor">
            {/* Scapula Blade Flat and Tightly Anchored to Thoracic Wall */}
            <path
              d={`M ${shoulderX - 10} 118 L ${shoulderX - 24} 130 L ${shoulderX - 20} 165 Z`}
              fill="#064e3b"
              stroke="#10b981"
              strokeWidth="2"
            />

            {/* Active Serratus Anterior Hugging Scapula to Ribcage */}
            <path
              d={`M ${shoulderX - 14} 126 Q ${shoulderX + 22} 142 ${shoulderX + 2} 162`}
              stroke="url(#optimalGrad)"
              strokeWidth="5.5"
              strokeLinecap="round"
              fill="none"
              filter="url(#glowOptimal)"
            />
            <text x="396" y="196" fill="#a7f3d0" fontSize="8" fontWeight="bold">Serratus Anterior Active</text>

            {/* Scapular Anchor Force Pinning Arrow */}
            <line x1={shoulderX - 40} y1="145" x2={shoulderX - 22} y2="145" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow)" />

            {/* Callout Badge */}
            <rect x="326" y="264" width="248" height="26" rx="5" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
            <text x="450" y="281" fill="#a7f3d0" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              ✓ Scapula Tightly Anchored During Press
            </text>
          </g>
        )}
      </g>
    </g>
  );
}

// =============================================================================
// 11. PAINFUL ARC (60°-120° SUBACROMIAL IMPINGEMENT)
// =============================================================================
function PainfulArcDiagram({ isFault }: { isFault: boolean }) {
  // Left Panel: Frontal Human Figure performing lateral arm raise (0° -> 180°)
  const bodyX = 110;
  const pivotX = 145; // Right glenohumeral joint (Subject's right / Viewer's right)
  const pivotY = 112;
  const armLen = 92;

  // Arc keypoints with radius = armLen
  const p0X = pivotX;
  const p0Y = pivotY + armLen; // 0° (down at side)
  const p60X = pivotX + armLen * Math.cos((30 * Math.PI) / 180); // 60° from down (30° below horizontal)
  const p60Y = pivotY + armLen * Math.sin((30 * Math.PI) / 180);
  const p90X = pivotX + armLen; // 90° horizontal
  const p90Y = pivotY;
  const p120X = pivotX + armLen * Math.cos((30 * Math.PI) / 180); // 120° from down (30° above horizontal)
  const p120Y = pivotY - armLen * Math.sin((30 * Math.PI) / 180);
  const p180X = pivotX;
  const p180Y = pivotY - armLen; // 180° (straight overhead)

  return (
    <g id="diagram-painful-arc-crystal-clear">
      {/* Viewport Split Line */}
      <line x1="285" y1="15" x2="285" y2="290" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />

      {/* ========================================================================= */}
      {/* LEFT PANEL: STANDING FIGURE RAISING ARM (THE 0°-180° ARC)                 */}
      {/* ========================================================================= */}
      <g id="panel-arm-raise-motion">
        {/* Panel Header */}
        <rect x="18" y="14" width="252" height="24" rx="5" fill="#0f172a" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="1" />
        <text x="144" y="30" fill={isFault ? '#fda4af' : '#6ee7b7'} fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
          1. ACTIVE ARM RAISE (LATERAL ARC)
        </text>

        {/* --- Motion Guide Arc (0° to 180°) --- */}
        <path
          d={`M ${p0X} ${p0Y} A ${armLen} ${armLen} 0 0 0 ${p180X} ${p180Y}`}
          fill="none"
          stroke="#475569"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />

        {/* 60° - 120° Critical Pain Zone Sector */}
        <path
          d={`M ${pivotX} ${pivotY} L ${p60X} ${p60Y} A ${armLen} ${armLen} 0 0 0 ${p120X} ${p120Y} Z`}
          fill={isFault ? '#f43f5e' : '#10b981'}
          opacity={isFault ? 0.32 : 0.12}
          stroke={isFault ? '#f43f5e' : '#10b981'}
          strokeWidth="1.5"
        />

        {/* Angle Boundary Radial Markers */}
        <line x1={pivotX} y1={pivotY} x2={p60X + 8} y2={p60Y + 5} stroke={isFault ? '#f43f5e' : '#64748b'} strokeWidth="1.2" strokeDasharray="2 2" />
        <text x={p60X + 12} y={p60Y + 8} fill={isFault ? '#fda4af' : '#94a3b8'} fontSize="8" fontWeight="bold">60°</text>

        <line x1={pivotX} y1={pivotY} x2={p120X + 8} y2={p120Y - 5} stroke={isFault ? '#f43f5e' : '#64748b'} strokeWidth="1.2" strokeDasharray="2 2" />
        <text x={p120X + 12} y={p120Y - 4} fill={isFault ? '#fda4af' : '#94a3b8'} fontSize="8" fontWeight="bold">120°</text>

        {/* Motion Curve Directional Arrows */}
        <path
          d={`M ${p60X - 10} ${p60Y + 12} Q ${p90X + 12} ${p90Y} ${p120X - 8} ${p120Y - 14}`}
          fill="none"
          stroke={isFault ? '#f43f5e' : '#10b981'}
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />

        {/* --- FRONT-FACING HUMAN BODY --- */}
        {/* Head */}
        <ellipse cx={bodyX} cy="52" rx="14" ry="16" fill="#1e293b" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="2" />
        <circle cx={bodyX - 4} cy="50" r="1.5" fill="#94a3b8" />
        <circle cx={bodyX + 4} cy="50" r="1.5" fill="#94a3b8" />

        {/* Neck & Torso Spine */}
        <line x1={bodyX} y1="68" x2={bodyX} y2="195" stroke="#cbd5e1" strokeWidth="5.5" strokeLinecap="round" />

        {/* Clavicles & Shoulder Girdle */}
        <line x1={bodyX - 35} y1={pivotY} x2={pivotX} y2={pivotY} stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />

        {/* Ribcage Outline */}
        <path
          d={`M ${bodyX - 28} ${pivotY + 8} C ${bodyX - 35} 150 ${bodyX - 25} 180 ${bodyX - 20} 195 L ${bodyX + 20} 195 C ${bodyX + 25} 180 ${bodyX + 35} 150 ${bodyX + 28} ${pivotY + 8} Z`}
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1.5"
          opacity="0.65"
        />

        {/* Pelvis & Hip Base */}
        <path d={`M ${bodyX - 25} 195 Q ${bodyX} 205 ${bodyX + 25} 195 L ${bodyX + 20} 225 L ${bodyX - 20} 225 Z`} fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />

        {/* Left Arm (Resting neutral at side) */}
        <circle cx={bodyX - 35} cy={pivotY} r="5.5" fill="#64748b" />
        <line x1={bodyX - 35} y1={pivotY} x2={bodyX - 38} y2="160" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx={bodyX - 38} cy="160" r="3.5" fill="#38bdf8" />
        <line x1={bodyX - 38} y1="160" x2={bodyX - 40} y2="200" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
        <circle cx={bodyX - 40} cy="200" r="3" fill="#38bdf8" />

        {/* Right Shoulder Joint (Active Glenohumeral Pivot) */}
        <circle cx={pivotX} cy={pivotY} r="7" fill={isFault ? '#f43f5e' : '#10b981'} stroke="#0f172a" strokeWidth="1.5" />

        {/* Ghost Position 1: Arm at 0° (Start: hanging at side) */}
        <line x1={pivotX} y1={pivotY + 8} x2={p0X} y2={p0Y} stroke="#475569" strokeWidth="3" strokeDasharray="3 3" strokeLinecap="round" opacity="0.45" />
        <circle cx={p0X} cy={p0Y} r="3" fill="#475569" opacity="0.6" />
        <text x={p0X + 8} y={p0Y + 2} fill="#64748b" fontSize="7.5">0° (Start)</text>

        {/* Ghost Position 3: Arm at 180° (Finish: straight overhead) */}
        <line x1={pivotX} y1={pivotY - 8} x2={p180X} y2={p180Y} stroke="#475569" strokeWidth="3" strokeDasharray="3 3" strokeLinecap="round" opacity="0.45" />
        <circle cx={p180X} cy={p180Y} r="3" fill="#475569" opacity="0.6" />
        <text x={p180X + 8} y={p180Y + 8} fill="#64748b" fontSize="7.5">180° (Overhead)</text>

        {/* Active Position 2: Arm at 90° Abduction (Raised horizontally to side) */}
        <line x1={pivotX} y1={pivotY} x2={pivotX + 48} y2={pivotY} stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
        <circle cx={pivotX + 48} cy={pivotY} r="4.5" fill="#38bdf8" />
        <line x1={pivotX + 48} y1={pivotY} x2={p90X} y2={p90Y} stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
        <circle cx={p90X} cy={p90Y} r="4" fill={isFault ? '#f43f5e' : '#10b981'} />
        {/* Hand */}
        <line x1={p90X} y1={p90Y} x2={p90X + 10} y2={p90Y} stroke="#cbd5e1" strokeWidth="3.5" strokeLinecap="round" />
        <text x={p90X + 12} y={p90Y - 5} fill={isFault ? '#fda4af' : '#a7f3d0'} fontSize="8" fontWeight="bold">90° (Mid-Arc)</text>

        {/* Shoulder Pain Flare in Fault State */}
        {isFault ? (
          <g id="shoulder-pain-burst">
            {/* Pulsing red pain burst at shoulder */}
            <circle cx={pivotX} cy={pivotY - 4} r="14" fill="#f43f5e" opacity="0.4" filter="url(#glowShort)" />
            <circle cx={pivotX} cy={pivotY - 4} r="6" fill="#f43f5e" />
            {/* Pain burst rays */}
            <line x1={pivotX - 8} y1={pivotY - 14} x2={pivotX - 13} y2={pivotY - 19} stroke="#f43f5e" strokeWidth="2" />
            <line x1={pivotX} y1={pivotY - 14} x2={pivotX} y2={pivotY - 21} stroke="#f43f5e" strokeWidth="2" />
            <line x1={pivotX + 8} y1={pivotY - 14} x2={pivotX + 13} y2={pivotY - 19} stroke="#f43f5e" strokeWidth="2" />
            <rect x="75" y="240" width="145" height="20" rx="4" fill="#4c0519" stroke="#f43f5e" strokeWidth="1" />
            <text x="147" y="254" fill="#fecdd3" fontSize="8.5" fontWeight="bold" textAnchor="middle">
              ⚡ PAIN FELT AT 60°–120°
            </text>
          </g>
        ) : (
          <g id="shoulder-pain-free">
            <rect x="75" y="240" width="145" height="20" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
            <text x="147" y="254" fill="#a7f3d0" fontSize="8.5" fontWeight="bold" textAnchor="middle">
              ✓ PAIN-FREE 0°–180° ARC
            </text>
          </g>
        )}
      </g>

      {/* ========================================================================= */}
      {/* RIGHT PANEL: ZOOMED SUBACROMIAL JOINT ANATOMY (WHY IT PINCHES)           */}
      {/* ========================================================================= */}
      <g id="panel-joint-cross-section">
        {/* Panel Header */}
        <rect x="305" y="14" width="275" height="24" rx="5" fill="#0f172a" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="1" />
        <text x="442" y="30" fill={isFault ? '#fda4af' : '#6ee7b7'} fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
          2. SHOULDER JOINT CROSS-SECTION
        </text>

        {/* Anatomical Chamber Container */}
        <rect x="305" y="46" width="275" height="150" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />

        {/* 1. Acromion Bone Roof (Rigid Bone Shelf on Top) */}
        <path
          d="M 330 68 Q 380 64 450 68 C 470 70 485 78 495 90 L 480 92 C 465 82 450 78 390 76 L 330 76 Z"
          fill="#334155"
          stroke="#94a3b8"
          strokeWidth="1.8"
        />
        <text x="350" y="62" fill="#94a3b8" fontSize="8.5" fontWeight="bold">Acromion Bone (Roof)</text>

        {/* 2. Humeral Head (Arm Bone Ball) */}
        {/* In Fault: Humeral head translates UPWARD to Y=122 (pinching gap). In Optimal: Settles down to Y=136 */}
        <circle
          cx="445"
          cy={isFault ? 124 : 136}
          r="34"
          fill="#0f172a"
          stroke={isFault ? '#f43f5e' : '#10b981'}
          strokeWidth="2"
        />
        <text x="445" y={isFault ? 138 : 150} fill="#cbd5e1" fontSize="8.5" textAnchor="middle" fontWeight="bold">Humeral Head</text>
        <text x="445" y={isFault ? 148 : 160} fill="#64748b" fontSize="7.5" textAnchor="middle">(Arm Bone)</text>

        {/* 3. Supraspinatus Muscle & Tendon Sliding Through the Tunnel */}
        {isFault ? (
          /* FAULT: Supraspinatus Tendon PINCHED & CRUSHED */
          <g id="zoom-fault-pinch">
            {/* Tendon passing between Acromion and Humeral Head */}
            <path
              d="M 330 92 C 370 92 410 88 440 90 C 465 92 475 96 482 108"
              fill="none"
              stroke="url(#shortMuscleGrad)"
              strokeWidth="7"
              strokeLinecap="round"
              filter="url(#glowShort)"
            />
            {/* Compression Pinch Zone */}
            <ellipse cx="435" cy="88" rx="14" ry="6" fill="#f43f5e" opacity="0.75" />
            <text x="435" y="90" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">CRUSHED</text>

            {/* Gap Measurement Arrow (< 5mm) */}
            <line x1="390" y1="78" x2="390" y2="92" stroke="#f43f5e" strokeWidth="1.5" />
            <polyline points="387,81 390,78 393,81" fill="none" stroke="#f43f5e" strokeWidth="1.5" />
            <polyline points="387,89 390,92 393,89" fill="none" stroke="#f43f5e" strokeWidth="1.5" />
            <text x="382" y="87" fill="#f43f5e" fontSize="7.5" fontWeight="bold" textAnchor="end">&lt; 5mm</text>

            {/* Superior Drift Vector Arrow */}
            <line x1="445" y1="168" x2="445" y2="156" stroke="#f43f5e" strokeWidth="2" markerEnd="url(#arrow)" />
            <text x="458" y="166" fill="#f43f5e" fontSize="7" fontWeight="bold">Upward Shift</text>

            <text x="330" y="118" fill="#fda4af" fontSize="8" fontWeight="bold">Supraspinatus Tendon</text>
            <text x="330" y="128" fill="#f43f5e" fontSize="7.5">Punched under rigid bone shelf</text>
          </g>
        ) : (
          /* OPTIMAL: Smooth Gliding Tendon with Wide Clearance (> 10mm) */
          <g id="zoom-optimal-clear">
            {/* Tendon gliding smoothly */}
            <path
              d="M 330 96 C 370 96 410 96 440 102 C 465 106 475 112 482 122"
              fill="none"
              stroke="url(#optimalGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              filter="url(#glowOptimal)"
            />
            {/* Clearance Measurement Arrow (> 10mm) */}
            <line x1="390" y1="78" x2="390" y2="102" stroke="#10b981" strokeWidth="1.5" />
            <polyline points="387,81 390,78 393,81" fill="none" stroke="#10b981" strokeWidth="1.5" />
            <polyline points="387,99 390,102 393,99" fill="none" stroke="#10b981" strokeWidth="1.5" />
            <text x="382" y="92" fill="#10b981" fontSize="7.5" fontWeight="bold" textAnchor="end">&gt; 10mm</text>

            <text x="330" y="118" fill="#a7f3d0" fontSize="8" fontWeight="bold">Supraspinatus Tendon</text>
            <text x="330" y="128" fill="#6ee7b7" fontSize="7.5">Wide subacromial gliding tunnel</text>
          </g>
        )}

        {/* Lower Diagnostic Explanation Box */}
        {isFault ? (
          <g id="box-fault-diag">
            <rect x="305" y="204" width="275" height="58" rx="5" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
            <text x="315" y="219" fill="#fecdd3" fontSize="9" fontWeight="bold">Clinical Subacromial Impingement:</text>
            <text x="315" y="234" fill="#fed7aa" fontSize="8">• As arm reaches 60°–120°, bone pinches the tendon</text>
            <text x="315" y="247" fill="#fed7aa" fontSize="8">• Past 120°, tendon clears the roof and pain stops</text>
          </g>
        ) : (
          <g id="box-optimal-diag">
            <rect x="305" y="204" width="275" height="58" rx="5" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
            <text x="315" y="219" fill="#a7f3d0" fontSize="9" fontWeight="bold">Healthy Rotator Cuff Mechanics:</text>
            <text x="315" y="234" fill="#d1fae5" fontSize="8">• Rotator cuff actively pulls bone downward during lift</text>
            <text x="315" y="247" fill="#d1fae5" fontSize="8">• Zero tendon friction or pinch throughout full 180°</text>
          </g>
        )}
      </g>

      {/* Bottom Summary Bar */}
      <rect x="18" y="270" width="562" height="22" rx="4" fill="#0f172a" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="1" />
      <text x="299" y="284" fill={isFault ? '#fda4af' : '#a7f3d0'} fontSize="9" fontWeight="bold" textAnchor="middle">
        {isFault
          ? 'Painful Arc: Lifting the arm sideways pinches the tendon between 60° and 120°'
          : 'Healthy Shoulder: Free, uninhibited tendon clearance across the entire 0°–180° arm raise'}
      </text>
    </g>
  );
}

// =============================================================================
// 12. SHOULDER HITCH / ELEVATION (UPPER TRAPEZIUS DOMINANCE)
// =============================================================================
function ShrugOnArmRaiseDiagram({ isFault }: { isFault: boolean }) {
  const shoulderY = isFault ? 100 : 130;

  return (
    <g id="diagram-shrug">
      {/* Resting Horizontal Shoulder Level Reference Line */}
      <line x1="160" y1="130" x2="420" y2="130" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x="430" y="133" fill="#64748b" fontSize="9">Neutral Shoulder Plane</text>

      {/* Head, Cervical Spine, Thoracic Column */}
      <circle cx="200" cy="65" r="15" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2.5" />
      <line x1="200" y1="80" x2="200" y2="250" stroke="#cbd5e1" strokeWidth="6.5" strokeLinecap="round" />

      {/* Clavicle to Acromion */}
      <line x1="200" y1="120" x2="300" y2={shoulderY} stroke="#cbd5e1" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="300" cy={shoulderY} r="7.5" fill={isFault ? '#f43f5e' : '#10b981'} stroke="#0f172a" strokeWidth="1.5" />

      {/* Abducting Arm at 60° */}
      <line x1="300" y1={shoulderY} x2="390" y2={shoulderY + 35} stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
      <circle cx="390" cy={shoulderY + 35} r="4" fill="#38bdf8" />

      {isFault ? (
        /* ==================== FAULT: EARLY HIKE / UPPER TRAP OVERACTIVATION ==================== */
        <g id="shrug-fault">
          {/* Hyperactive Upper Trapezius contracting and hiking acromion */}
          <path
            d={`M 206 82 Q 250 80 300 ${shoulderY}`}
            stroke="url(#shortMuscleGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            filter="url(#glowShort)"
          />
          {/* Hike Vector Arrow */}
          <line x1="300" y1="130" x2="300" y2="100" stroke="#f43f5e" strokeWidth="2" markerEnd="url(#arrow)" />

          {/* Callouts */}
          <rect x="330" y="55" width="235" height="30" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="447" y="74" fill="#fecdd3" fontSize="10.5" fontWeight="bold" textAnchor="middle">
            ▲ EARLY SHOULDER HIKE / SHRUG
          </text>

          <rect x="330" y="95" width="235" height="28" rx="6" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
          <text x="447" y="113" fill="#fed7aa" fontSize="10" fontWeight="bold" textAnchor="middle">
            Hyperactive Upper Trap &amp; Levator
          </text>
        </g>
      ) : (
        /* ==================== OPTIMAL: SCAPULOHUMERAL RHYTHM (2:1 RATIO) ==================== */
        <g id="shrug-optimal">
          {/* Balanced Lower Trapezius / Serratus Force Couple */}
          <path d="M 285 145 L 245 180" stroke="url(#optimalGrad)" strokeWidth="6" strokeLinecap="round" filter="url(#glowOptimal)" />

          {/* Callouts */}
          <rect x="330" y="65" width="235" height="32" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="447" y="85" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
            ✓ 2:1 Scapulohumeral Rhythm
          </text>

          <rect x="330" y="108" width="235" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="447" y="126" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Depressed &amp; Stable Shoulder Girdle
          </text>
        </g>
      )}
    </g>
  );
}

// =============================================================================
// 13. FORWARD HEAD POSTURE (CRANIOVERTEBRAL ANGLE FAULT)
// =============================================================================
function ForwardHeadDiagram({ isFault }: { isFault: boolean }) {
  const headX = isFault ? 245 : 300;
  const earY = isFault ? 72 : 55;
  const acromionX = 300;
  const acromionY = 145;

  return (
    <g id="diagram-fhp">
      {/* Plumb Line Up from Acromion Pivot */}
      <line x1={acromionX} y1="25" x2={acromionX} y2="260" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x={acromionX + 6} y="35" fill="#64748b" fontSize="9">Acromion Plumb Line</text>

      {/* Thoracic Spine Profile */}
      <line x1={acromionX} y1={acromionY} x2={acromionX} y2="250" stroke="#cbd5e1" strokeWidth="6.5" strokeLinecap="round" />

      {/* Shoulder Joint */}
      <circle cx={acromionX} cy={acromionY} r="7.5" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />

      {/* Cervical Vertebrae (C1-C7) */}
      <path
        d={isFault
          ? `M ${acromionX} ${acromionY} C ${acromionX} 115 ${headX + 15} 100 ${headX} ${earY + 14}`
          : `M ${acromionX} ${acromionY} C ${acromionX} 115 ${headX} 100 ${headX} ${earY + 14}`}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* Skull / Cranium with Eye Landmark */}
      <circle cx={headX} cy={earY} r="16" fill="#1e293b" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="2.5" />
      <circle cx={headX - 6} cy={earY - 2} r="2.5" fill="#64748b" />
      {/* External Auditory Meatus (Ear canal) */}
      <circle cx={headX} cy={earY} r="3" fill="#38bdf8" />

      {isFault ? (
        /* ==================== FAULT: FORWARD HEAD (>2.5CM ANTERIOR TRANSLATION) ==================== */
        <g id="fhp-fault">
          {/* Suboccipital Compression & Shortening Flash */}
          <circle cx={headX + 14} cy={earY + 10} r="8" fill="#f43f5e" opacity="0.7" filter="url(#glowShort)" />

          {/* Forward Translation Gap Vector */}
          <line x1={acromionX} y1={earY} x2={headX} y2={earY} stroke="#f43f5e" strokeWidth="2" markerEnd="url(#arrow)" />
          <text x="260" y={earY - 8} fill="#f43f5e" fontSize="9.5" fontWeight="bold">Forward &gt; 2.5cm</text>

          {/* Short Suboccipitals / SCM */}
          <path d={`M ${acromionX - 10} ${acromionY - 10} Q ${headX + 20} 105 ${headX + 5} ${earY + 8}`} stroke="url(#shortMuscleGrad)" strokeWidth="6" filter="url(#glowShort)" />

          {/* Callouts */}
          <rect x="25" y="60" width="195" height="30" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="122" y="79" fill="#fecdd3" fontSize="10.5" fontWeight="bold" textAnchor="middle">
            ▲ FORWARD HEAD POSTURE
          </text>

          <rect x="25" y="100" width="195" height="28" rx="6" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
          <text x="122" y="118" fill="#fed7aa" fontSize="10" fontWeight="bold" textAnchor="middle">
            Suboccipital Hypertonicity
          </text>

          <rect x="350" y="150" width="215" height="30" rx="6" fill="#083344" stroke="#06b6d4" strokeWidth="1.2" />
          <text x="457" y="169" fill="#a5f3fc" fontSize="10" fontWeight="bold" textAnchor="middle">
            Weak Deep Cervical Flexors
          </text>
        </g>
      ) : (
        /* ==================== OPTIMAL: NEUTRAL CERVICAL STACK ==================== */
        <g id="fhp-optimal">
          {/* Active Deep Neck Flexors (Longus Colli / Capitis) */}
          <path d="M 292 120 L 292 75" stroke="url(#optimalGrad)" strokeWidth="5" strokeLinecap="round" filter="url(#glowOptimal)" />

          {/* Callouts */}
          <rect x="340" y="70" width="225" height="32" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="452" y="90" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
            ✓ Ear Vertically Stacked with Acromion
          </text>

          <rect x="340" y="112" width="225" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="452" y="130" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Normal Craniovertebral Angle (&gt;50°)
          </text>
        </g>
      )}
    </g>
  );
}

// =============================================================================
// 14. CERVICAL ROTATION ASYMMETRY (TRANSVERSE PLANE ATLAS-AXIS C1-C2)
// =============================================================================
function NeckRotationDiagram({ isFault }: { isFault: boolean }) {
  const rotAngle = isFault ? -50 : -80; // 50° restricted vs 80° normal physiological cervical rotation

  return (
    <g id="diagram-neck-rot">
      {/* Transverse View of Shoulders & Torso Base */}
      <ellipse cx="300" cy="190" rx="130" ry="40" fill="#1e293b" stroke="#475569" strokeWidth="2.5" />
      <line x1="170" y1="190" x2="430" y2="190" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x="440" y="193" fill="#64748b" fontSize="9">Coronal Shoulder Plane</text>

      {/* Neutral Midline Sagittal Axis */}
      <line x1="300" y1="190" x2="300" y2="35" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x="306" y="45" fill="#64748b" fontSize="9">0° Neutral</text>

      {/* Target Normal 80° Rotation Reference Arc */}
      <path d="M 300 95 A 95 95 0 0 0 206 180" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

      {/* Rotating Cranium & C1-C2 Complex (Top-Down View) */}
      <g transform={`rotate(${rotAngle} 300 190)`}>
        {/* Cranium / Skull Contour */}
        <ellipse cx="300" cy="190" rx="28" ry="36" fill="#1e293b" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="2.5" />
        {/* Nose / Chin Direction Pointer */}
        <polygon points="300,146 293,158 307,158" fill={isFault ? '#f43f5e' : '#10b981'} />
        {/* Sightline Vector */}
        <line x1="300" y1="146" x2="300" y2="90" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="3" markerEnd="url(#arrow)" />
        {/* Ear Landmarks */}
        <circle cx="270" cy="190" r="4" fill="#38bdf8" />
        <circle cx="330" cy="190" r="4" fill="#38bdf8" />
      </g>

      {isFault ? (
        /* ==================== FAULT: ASYMMETRICAL / RESTRICTED ROTATION (<60°) ==================== */
        <g id="neck-rot-fault">
          {/* Deficit Sector Arc */}
          <path d="M 235 125 A 95 95 0 0 0 206 180" fill="none" stroke="#f43f5e" strokeWidth="3" />
          <text x="180" y="145" fill="#f43f5e" fontSize="10" fontWeight="bold">30° Deficit</text>

          {/* SCM / Levator Scapulae Hypertonicity Highlight */}
          <path d="M 320 185 Q 360 160 380 180" stroke="url(#shortMuscleGrad)" strokeWidth="6" strokeLinecap="round" filter="url(#glowShort)" />

          {/* Callouts */}
          <rect x="25" y="55" width="225" height="30" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="137" y="74" fill="#fecdd3" fontSize="10.5" fontWeight="bold" textAnchor="middle">
            ▲ RESTRICTED ROTATION (&lt; 60°)
          </text>

          <rect x="25" y="95" width="225" height="28" rx="6" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
          <text x="137" y="113" fill="#fed7aa" fontSize="10" fontWeight="bold" textAnchor="middle">
            Hypertonic Contralateral SCM / Levator
          </text>
        </g>
      ) : (
        /* ==================== OPTIMAL: SYMMETRIC FULL ROTATION (80°-90°) ==================== */
        <g id="neck-rot-optimal">
          {/* Full Range Arc */}
          <path d="M 300 95 A 95 95 0 0 0 206 180" fill="none" stroke="#10b981" strokeWidth="2.5" />
          <text x="215" y="125" fill="#10b981" fontSize="10" fontWeight="bold">80°-90°</text>

          {/* Callouts */}
          <rect x="25" y="65" width="230" height="32" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="140" y="85" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
            ✓ Symmetrical Cervical Mobility
          </text>

          <rect x="25" y="108" width="230" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="140" y="126" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Full 80° Active Range of Motion
          </text>
        </g>
      )}
    </g>
  );
}

// =============================================================================
// 15. APICAL CHEST BREATHING VS 360° DIAPHRAGMATIC EXPANSION
// =============================================================================
function ApicalBreathingDiagram({ isFault }: { isFault: boolean }) {
  return (
    <g id="diagram-breathing">
      {/* Midline Spine */}
      <line x1="300" y1="50" x2="300" y2="260" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />

      {/* Head & Neck */}
      <circle cx="300" cy="45" r="15" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />

      {/* Clavicles */}
      <line x1="300" y1="75" x2="230" y2={isFault ? 65 : 75} stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
      <line x1="300" y1="75" x2="370" y2={isFault ? 65 : 75} stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />

      {/* Thorax / Ribcage */}
      <path
        d={isFault
          ? "M 300 75 C 220 90 220 180 300 200 C 380 180 380 90 300 75 Z"
          : "M 300 75 C 200 110 200 210 300 230 C 400 210 400 110 300 75 Z"}
        fill="#1e293b"
        stroke={isFault ? '#f43f5e' : '#10b981'}
        strokeWidth="2.5"
      />

      {/* Diaphragm Dome Profile */}
      <path
        d={isFault ? "M 245 180 Q 300 150 355 180" : "M 225 210 Q 300 195 375 210"}
        fill="none"
        stroke={isFault ? '#f43f5e' : '#10b981'}
        strokeWidth="4"
        strokeDasharray={isFault ? "3 3" : "none"}
      />

      {isFault ? (
        /* ==================== FAULT: APICAL ELEVATION / ACCESSORY MUSCLE OVERUSE ==================== */
        <g id="breathing-fault">
          {/* Vertical Elevation Arrows on Scalenes / SCM */}
          <line x1="270" y1="70" x2="270" y2="40" stroke="#f43f5e" strokeWidth="2.5" markerEnd="url(#arrow)" />
          <line x1="330" y1="70" x2="330" y2="40" stroke="#f43f5e" strokeWidth="2.5" markerEnd="url(#arrow)" />

          {/* Hyperactive Scalenes & Upper Traps */}
          <path d="M 285 55 L 245 70" stroke="url(#shortMuscleGrad)" strokeWidth="5" filter="url(#glowShort)" />
          <path d="M 315 55 L 355 70" stroke="url(#shortMuscleGrad)" strokeWidth="5" filter="url(#glowShort)" />

          {/* Inhibited / Flattened Diaphragm Label */}
          <text x="300" y="165" fill="#f43f5e" fontSize="9.5" fontWeight="bold" textAnchor="middle">Inhibited Diaphragm</text>

          {/* Callouts */}
          <rect x="340" y="90" width="230" height="30" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="455" y="109" fill="#fecdd3" fontSize="10.5" fontWeight="bold" textAnchor="middle">
            ▲ APICAL ACCESSORY HEAVE
          </text>

          <rect x="340" y="130" width="230" height="28" rx="6" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
          <text x="455" y="148" fill="#fed7aa" fontSize="10" fontWeight="bold" textAnchor="middle">
            Scalenes &amp; SCM Hyperactivity
          </text>
        </g>
      ) : (
        /* ==================== OPTIMAL: 360° DIAPHRAGMATIC INHALATION ==================== */
        <g id="breathing-optimal">
          {/* Lateral Expansion Vector Arrows */}
          <line x1="220" y1="160" x2="175" y2="160" stroke="#10b981" strokeWidth="2.5" markerEnd="url(#arrow)" />
          <line x1="380" y1="160" x2="425" y2="160" stroke="#10b981" strokeWidth="2.5" markerEnd="url(#arrow)" />

          {/* Active Diaphragm Descent Indicator */}
          <line x1="300" y1="190" x2="300" y2="215" stroke="#10b981" strokeWidth="2.5" markerEnd="url(#arrow)" />

          {/* Callouts */}
          <rect x="340" y="70" width="230" height="32" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="455" y="90" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
            ✓ 360° Lower Ribcage Expansion
          </text>

          <rect x="340" y="112" width="230" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="455" y="130" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Relaxed Cervical Girdle &amp; Scalenes
          </text>
        </g>
      )}
    </g>
  );
}

// =============================================================================
// 16. LATERAL ELBOW PAIN (LATERAL EPICONDYLITIS / EXTENSOR CARPI RADIALIS)
// =============================================================================
function LateralElbowDiagram({ isFault }: { isFault: boolean }) {
  return (
    <g id="diagram-lateral-elbow">
      {/* Humerus Bone */}
      <line x1="80" y1="160" x2="230" y2="160" stroke="#cbd5e1" strokeWidth="8" strokeLinecap="round" />
      <circle cx="230" cy="160" r="10" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
      <text x="140" y="145" fill="#64748b" fontSize="9">Humerus</text>

      {/* Forearm Radius & Ulna */}
      <line x1="230" y1="160" x2="380" y2="160" stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />
      <text x="300" y="180" fill="#64748b" fontSize="9">Radius / Ulna</text>

      {/* Wrist & Hand in Extension */}
      <line x1="380" y1="160" x2="450" y2={isFault ? 120 : 140} stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
      <circle cx="380" cy="160" r="6" fill="#38bdf8" />

      {/* Common Extensor Tendon Trajectory */}
      <path
        d={isFault ? "M 230 152 Q 310 148 380 152 L 450 120" : "M 230 152 Q 310 152 380 154 L 450 140"}
        fill="none"
        stroke={isFault ? "url(#shortMuscleGrad)" : "url(#optimalGrad)"}
        strokeWidth="6.5"
        strokeLinecap="round"
        filter={isFault ? "url(#glowShort)" : "url(#glowOptimal)"}
      />

      {isFault ? (
        /* ==================== FAULT: LATERAL EPICONDYLAR TENOSYNOVITIS ==================== */
        <g id="tennis-fault">
          {/* Epicondyle Micro-tear Flash */}
          <circle cx="230" cy="150" r="14" fill="#f43f5e" opacity="0.6" filter="url(#glowShort)" />
          <circle cx="230" cy="150" r="5" fill="#f43f5e" />

          {/* Callouts */}
          <rect x="220" y="55" width="250" height="30" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="345" y="74" fill="#fecdd3" fontSize="10.5" fontWeight="bold" textAnchor="middle">
            ▲ LATERAL EPICONDYLE TENDINOPATHY
          </text>

          <rect x="220" y="95" width="250" height="28" rx="6" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
          <text x="345" y="113" fill="#fed7aa" fontSize="10" fontWeight="bold" textAnchor="middle">
            Extensor Carpi Radialis Brevis Strain
          </text>
        </g>
      ) : (
        /* ==================== OPTIMAL: EXTENSOR TENDON HOMEOSTASIS ==================== */
        <g id="tennis-optimal">
          <rect x="220" y="65" width="250" height="32" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="345" y="85" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
            ✓ Normal Extensor Tendon Compliance
          </text>

          <rect x="220" y="108" width="250" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="345" y="126" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Pain-Free Resisted Wrist Extension
          </text>
        </g>
      )}
    </g>
  );
}

// =============================================================================
// 17. MEDIAL ELBOW PAIN (MEDIAL EPICONDYLITIS / PRONATOR TERES)
// =============================================================================
function MedialElbowDiagram({ isFault }: { isFault: boolean }) {
  return (
    <g id="diagram-medial-elbow">
      {/* Humerus Bone */}
      <line x1="80" y1="160" x2="230" y2="160" stroke="#cbd5e1" strokeWidth="8" strokeLinecap="round" />
      <circle cx="230" cy="160" r="10" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
      <text x="140" y="145" fill="#64748b" fontSize="9">Humerus</text>

      {/* Forearm */}
      <line x1="230" y1="160" x2="380" y2="160" stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />

      {/* Wrist & Hand in Flexion */}
      <line x1="380" y1="160" x2="450" y2={isFault ? 200 : 180} stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
      <circle cx="380" cy="160" r="6" fill="#38bdf8" />

      {/* Common Flexor / Pronator Trajectory */}
      <path
        d={isFault ? "M 230 168 Q 310 172 380 168 L 450 200" : "M 230 168 Q 310 168 380 166 L 450 180"}
        fill="none"
        stroke={isFault ? "url(#shortMuscleGrad)" : "url(#optimalGrad)"}
        strokeWidth="6.5"
        strokeLinecap="round"
        filter={isFault ? "url(#glowShort)" : "url(#glowOptimal)"}
      />

      {isFault ? (
        /* ==================== FAULT: MEDIAL EPICONDYLE OVERLOAD ==================== */
        <g id="golf-fault">
          {/* Medial Epicondyle Stress Starburst */}
          <circle cx="230" cy="170" r="14" fill="#f43f5e" opacity="0.6" filter="url(#glowShort)" />
          <circle cx="230" cy="170" r="5" fill="#f43f5e" />

          {/* Callouts */}
          <rect x="220" y="55" width="250" height="30" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="345" y="74" fill="#fecdd3" fontSize="10.5" fontWeight="bold" textAnchor="middle">
            ▲ MEDIAL EPICONDYLE OVERLOAD
          </text>

          <rect x="220" y="95" width="250" height="28" rx="6" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
          <text x="345" y="113" fill="#fed7aa" fontSize="10" fontWeight="bold" textAnchor="middle">
            Flexor-Pronator Tendon Microtrauma
          </text>
        </g>
      ) : (
        /* ==================== OPTIMAL: MEDIAL COMPARTMENT HEALTH ==================== */
        <g id="golf-optimal">
          <rect x="220" y="65" width="250" height="32" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="345" y="85" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
            ✓ Healthy Flexor-Pronator Origin
          </text>

          <rect x="220" y="108" width="250" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="345" y="126" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Pain-Free Wrist &amp; Finger Flexion
          </text>
        </g>
      )}
    </g>
  );
}

// =============================================================================
// 18. GRIP FATIGUE / FOREARM CRAMPING
// =============================================================================
function GripFatigueDiagram({ isFault }: { isFault: boolean }) {
  return (
    <g id="diagram-grip-fatigue">
      {/* Forearm Skeletal Axis */}
      <line x1="120" y1="160" x2="350" y2="160" stroke="#cbd5e1" strokeWidth="7.5" strokeLinecap="round" />
      <circle cx="350" cy="160" r="7" fill="#38bdf8" />

      {/* Clutched Fist / Phalanges */}
      <circle cx="395" cy="160" r="18" fill="#1e293b" stroke={isFault ? '#f43f5e' : '#10b981'} strokeWidth="2.5" />
      {/* Finger Joints */}
      <circle cx="390" cy="150" r="3.5" fill="#cbd5e1" />
      <circle cx="400" cy="160" r="3.5" fill="#cbd5e1" />
      <circle cx="390" cy="170" r="3.5" fill="#cbd5e1" />

      {/* Forearm Compartment Belly */}
      <path
        d="M 160 152 L 330 152"
        stroke={isFault ? "url(#shortMuscleGrad)" : "url(#optimalGrad)"}
        strokeWidth="9"
        strokeLinecap="round"
        filter={isFault ? "url(#glowShort)" : "url(#glowOptimal)"}
      />

      {isFault ? (
        /* ==================== FAULT: ISCHEMIC FOREARM FATIGUE & CONTRACTURE ==================== */
        <g id="grip-fault">
          {/* Tension Stress Waves */}
          <circle cx="245" cy="152" r="12" fill="#f43f5e" opacity="0.5" filter="url(#glowShort)" />

          {/* Callouts */}
          <rect x="210" y="55" width="260" height="30" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <text x="340" y="74" fill="#fecdd3" fontSize="10.5" fontWeight="bold" textAnchor="middle">
            ▲ PREMATURE GRIP FATIGUE / CRAMP
          </text>

          <rect x="210" y="95" width="260" height="28" rx="6" fill="#431407" stroke="#ea580c" strokeWidth="1.2" />
          <text x="340" y="113" fill="#fed7aa" fontSize="10" fontWeight="bold" textAnchor="middle">
            Flexor Digitorum Ischemic Overload
          </text>
        </g>
      ) : (
        /* ==================== OPTIMAL: SUSTAINED GRIP ENDURANCE ==================== */
        <g id="grip-optimal">
          <rect x="210" y="65" width="260" height="32" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="340" y="85" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
            ✓ Optimal Grip Endurance &amp; Bloodflow
          </text>

          <rect x="210" y="108" width="260" height="28" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <text x="340" y="126" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
            ✓ Balanced Flexor &amp; Extensor Recruitment
          </text>
        </g>
      )}
    </g>
  );
}

// =============================================================================
// DEFAULT FALLBACK BIOMECH DIAGRAM
// =============================================================================
function DefaultBiomechDiagram({ isFault }: { isFault: boolean }) {
  return (
    <g id="diagram-default">
      <line x1="120" y1="260" x2="480" y2="260" stroke="#475569" strokeWidth="2" />
      <line x1="300" y1="260" x2="300" y2="100" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
      <circle cx="300" cy="70" r="16" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
      {isFault ? (
        <rect x="200" y="120" width="200" height="30" rx="6" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
      ) : (
        <rect x="200" y="120" width="200" height="30" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
      )}
    </g>
  );
}
