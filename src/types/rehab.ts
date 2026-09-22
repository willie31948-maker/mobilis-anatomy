export interface PainSite {
  id: string;
  name: string;
  system: string;
  region: 'Cervical' | 'Shoulder' | 'Lumbar' | 'Hip' | 'Knee' | 'Ankle' | 'Other';
  severity: number; // 1-10
}

export interface RedFlagItem {
  id: string;
  q: string;
  why: string;
  urgency: 'emergency' | 'urgent';
}

export interface ScreenItem {
  id: string;
  name: string;
  category: 'Lower Extremity' | 'Lumbo-Pelvic & Core' | 'Scapulo-Thoracic' | 'Cervical & Head' | 'Upper Extremity';
  region: string[];
  instructions?: string;
  compensationCues?: string;
  implies: Array<{
    muscle: string;
    state: 'short' | 'weak';
    weight: number;
    because: string;
  }>;
}

export interface HypothesisReason {
  source: string;
  because: string;
  weight: number;
}

export interface MuscleHypothesis {
  muscle: string;
  muscleId: string;
  region: string;
  state: 'short' | 'weak';
  stateLabel: string;
  score: number;
  confidence: number;
  confidenceLabel: 'moderate' | 'low-moderate' | 'low';
  reasons: HypothesisReason[];
  note?: string;
}

export interface ImbalancePair {
  short: string;
  shortId: string;
  weak: string;
  weakId: string;
  combinedConfidence: number;
  explanation: string;
}

export interface PrescribedExercise {
  id: string;
  name: string;
  mode: 'lengthen' | 'strengthen' | 'activate' | 'mobilise' | 'release';
  targets: string[];
  addressesMuscles: string[];
  stage: string[];
  equipment: string;
  dose: string;
  cues: string[];
  contraindications: string[];
}

export interface AssessmentResult {
  safe: boolean;
  redFlags: {
    clear: boolean;
    emergency?: boolean;
    triggered: RedFlagItem[];
    action?: string;
  };
  painLevel: number;
  hypotheses: MuscleHypothesis[];
  imbalancePairs: ImbalancePair[];
  disclaimer: string;
  program?: {
    ok: boolean;
    reason?: string;
    message?: string;
    stage: 'acute' | 'subacute' | 'chronic';
    exercises: PrescribedExercise[];
  };
}

export interface AssessmentHistoryItem {
  id: string;
  timestamp: string;
  painLevel: number;
  symptomRegions: string[];
  primaryImbalance?: string;
  topHypothesesCount: number;
  safe: boolean;
  result: AssessmentResult;
}

export interface AssessmentState {
  isAssessmentMode: boolean;
  activePainSites: PainSite[];
  provocativeMovement: 'Squat' | 'Hinge' | 'Overhead' | 'Lunge' | 'Rotation' | null;
  painPhase: 'Eccentric (Descent)' | 'Isometric (Bottom)' | 'Concentric (Ascent)' | null;
  irritability: 'Low' | 'Moderate' | 'High' | null;
  romStatus: string;
  strengthRating: string;
  coachNotes: string;
  clinicalNotes?: string;
  showFullReport: boolean;
  
  // Full Assessment Fields
  safetyAnswers: Record<string, boolean>;
  movementAnswers: Record<string, boolean>;
  painLocations: string[];
  currentPainLevel: number;
}

