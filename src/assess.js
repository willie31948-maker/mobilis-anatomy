/**
 * Assessment engine.
 *
 * This produces RANKED HYPOTHESES with explicit confidence and reasoning, not
 * diagnoses. That distinction is a product decision, a legal one, and an
 * honest one -- see LEGAL.md. Concretely it means:
 *   - every finding carries the evidence that produced it
 *   - a finding never appears without its confidence
 *   - red flags short-circuit everything and produce a referral, not a programme
 *
 * The scoring is transparent and inspectable on purpose. A black-box score in
 * a health context is unauditable, and when it is wrong nobody can see why.
 */

const { MUSCLES } = require('../data/anatomy');

const byId = Object.fromEntries(MUSCLES.map((m) => [m.id, m]));

/**
 * RED FLAGS -- possible serious pathology.
 *
 * These are not "the app is being careful". Each maps to a condition where
 * delay causes permanent harm: cauda equina, fracture, DVT, infection, tumour,
 * or a progressing neurological lesion. The engine refuses to produce exercise
 * advice when one is present, and that refusal is tested.
 */
const RED_FLAGS = [
  { id: 'bladder_bowel', q: 'Any loss of bladder or bowel control, or numbness around the groin/saddle area?', why: 'Possible cauda equina syndrome — a surgical emergency. Hours matter.', urgency: 'emergency' },
  { id: 'progressive_weakness', q: 'Is there progressive weakness, or a foot/hand that drops or gives way?', why: 'Possible progressing nerve compression requiring prompt assessment.', urgency: 'urgent' },
  { id: 'unexplained_weight_loss', q: 'Unexplained weight loss, night sweats, or fever with this pain?', why: 'Systemic causes (infection, malignancy) must be excluded first.', urgency: 'urgent' },
  { id: 'night_pain', q: 'Constant pain that is clearly worse at night and unrelieved by position change?', why: 'Non-mechanical pattern — needs medical assessment rather than exercise.', urgency: 'urgent' },
  { id: 'trauma', q: 'Significant trauma (fall, collision, road accident), or unable to bear weight?', why: 'Fracture must be excluded before loading the area.', urgency: 'urgent' },
  { id: 'calf_swelling', q: 'Hot, swollen, tender calf — particularly after surgery, immobility or a long flight?', why: 'Possible deep vein thrombosis. Do not stretch, massage or exercise it.', urgency: 'emergency' },
  { id: 'cancer_history', q: 'History of cancer, with new unexplained musculoskeletal pain?', why: 'Bone metastasis must be excluded.', urgency: 'urgent' },
  { id: 'steroid_osteoporosis', q: 'Long-term corticosteroid use or known osteoporosis, with new spinal pain?', why: 'Raises the likelihood of vertebral fracture.', urgency: 'urgent' },
];

/**
 * Movement screen items. Each maps an observable finding to weighted evidence
 * about specific muscles. Weights are clinical-reasoning heuristics, not
 * validated diagnostic coefficients -- the UI says so, and so does the report.
 */
const SCREENS = [
  {
    id: 'overhead_squat_heels',
    name: 'Overhead squat: heels lift or torso pitches forward',
    region: ['ankle', 'knee', 'hip'],
    implies: [
      { muscle: 'soleus', state: 'short', weight: 3, because: 'Limited ankle dorsiflexion forces the heel up or the torso forward.' },
      { muscle: 'gastrocnemius', state: 'short', weight: 2, because: 'Contributes to the same dorsiflexion restriction.' },
    ],
  },
  {
    id: 'overhead_squat_knees_in',
    name: 'Overhead squat: knees fall inward (valgus)',
    region: ['hip', 'knee'],
    implies: [
      { muscle: 'gluteus_medius', state: 'weak', weight: 3, because: 'Frontal-plane hip control fails, so the femur adducts and internally rotates.' },
      { muscle: 'adductor_group', state: 'short', weight: 2, because: 'Adductor dominance pulls the thigh inward.' },
      { muscle: 'soleus', state: 'short', weight: 1, because: 'Restricted dorsiflexion is compensated by pronation and valgus.' },
    ],
  },
  {
    id: 'overhead_squat_arms_fall',
    name: 'Overhead squat: arms fall forward',
    region: ['shoulder'],
    implies: [
      { muscle: 'latissimus_dorsi', state: 'short', weight: 3, because: 'Restricts shoulder flexion, so the arms drop as the torso descends.' },
      { muscle: 'pectoralis_major', state: 'short', weight: 2, because: 'Limits overhead reach.' },
      { muscle: 'lower_trapezius', state: 'weak', weight: 2, because: 'Insufficient upward rotation to keep the arms overhead.' },
    ],
  },
  {
    id: 'single_leg_pelvic_drop',
    name: 'Single-leg stance: pelvis drops on the unsupported side',
    region: ['hip'],
    implies: [
      { muscle: 'gluteus_medius', state: 'weak', weight: 4, because: 'Trendelenburg sign — the classic direct indicator of hip abductor insufficiency.' },
      { muscle: 'quadratus_lumborum', state: 'short', weight: 1, because: 'Often compensates by hiking the opposite hip.' },
    ],
  },
  {
    id: 'thomas_test_positive',
    name: 'Lying on the back at the table edge, the tested thigh will not rest flat',
    region: ['hip'],
    implies: [
      { muscle: 'iliopsoas', state: 'short', weight: 4, because: 'Modified Thomas position — the thigh stays lifted when hip flexors are short.' },
      { muscle: 'rectus_femoris', state: 'short', weight: 2, because: 'A two-joint hip flexor contributing to the same restriction.' },
    ],
  },
  {
    id: 'anterior_pelvic_tilt',
    name: 'Standing side-on: pronounced low back arch, belt line tips forward',
    region: ['hip', 'spine'],
    implies: [
      { muscle: 'iliopsoas', state: 'short', weight: 3, because: 'Pulls the pelvis into anterior tilt.' },
      { muscle: 'erector_spinae', state: 'short', weight: 2, because: 'Overactive lumbar extensors maintain the arch.' },
      { muscle: 'gluteus_maximus', state: 'weak', weight: 3, because: 'Cannot counter the tilt with posterior rotation.' },
      { muscle: 'transversus_abdominis', state: 'weak', weight: 2, because: 'Deep core insufficient to control pelvic position.' },
    ],
  },
  {
    id: 'rounded_shoulders',
    name: 'Standing relaxed: shoulders rounded forward, palms face backward',
    region: ['shoulder'],
    implies: [
      { muscle: 'pectoralis_minor', state: 'short', weight: 3, because: 'Anteriorly tilts the scapula.' },
      { muscle: 'pectoralis_major', state: 'short', weight: 2, because: 'Internally rotates the humerus.' },
      { muscle: 'rhomboids', state: 'weak', weight: 3, because: 'Long and weak in the protracted position.' },
      { muscle: 'lower_trapezius', state: 'weak', weight: 2, because: 'Fails to hold the scapula down and back.' },
    ],
  },
  {
    id: 'forward_head',
    name: 'Standing side-on: ear sits clearly ahead of the shoulder',
    region: ['neck'],
    implies: [
      { muscle: 'suboccipitals', state: 'short', weight: 3, because: 'Upper cervical extensors shorten to keep the eyes level.' },
      { muscle: 'deep_neck_flexors', state: 'weak', weight: 4, because: 'Cannot hold the head over the trunk — the primary driver.' },
      { muscle: 'upper_trapezius', state: 'short', weight: 2, because: 'Overworks supporting head weight.' },
      { muscle: 'levator_scapulae', state: 'short', weight: 2, because: 'Shortens with the same posture.' },
    ],
  },
  {
    id: 'scapular_winging',
    name: 'Push-up or wall press: shoulder blade lifts away from the ribs',
    region: ['shoulder'],
    implies: [
      { muscle: 'serratus_anterior', state: 'weak', weight: 4, because: 'Direct sign — serratus holds the scapula against the ribcage.' },
      { muscle: 'lower_trapezius', state: 'weak', weight: 2, because: 'Shares the upward-rotation role.' },
    ],
  },
  {
    id: 'painful_arc',
    name: 'Raising the arm out to the side hurts between roughly 60 and 120 degrees',
    region: ['shoulder'],
    implies: [
      { muscle: 'rotator_cuff', state: 'weak', weight: 3, because: 'Failure to centre the humeral head narrows the subacromial space.' },
      { muscle: 'pectoralis_minor', state: 'short', weight: 2, because: 'Anterior scapular tilt further reduces that space.' },
      { muscle: 'lower_trapezius', state: 'weak', weight: 2, because: 'Insufficient upward rotation during elevation.' },
    ],
  },
  {
    id: 'prone_hip_extension_hamstring_first',
    name: 'Lying face down lifting the leg: hamstring and low back fire before the glute',
    region: ['hip'],
    implies: [
      { muscle: 'gluteus_maximus', state: 'weak', weight: 4, because: 'Altered firing order — glute max is delayed or under-recruited.' },
      { muscle: 'hamstrings', state: 'short', weight: 2, because: 'Takes over hip extension, becoming chronically overworked.' },
      { muscle: 'erector_spinae', state: 'short', weight: 2, because: 'Substitutes with lumbar extension.' },
    ],
  },
  {
    id: 'sit_and_reach_limited',
    name: 'Seated or standing forward bend is clearly limited by the back of the thighs',
    region: ['thigh'],
    implies: [
      { muscle: 'hamstrings', state: 'short', weight: 3, because: 'Restricts hip flexion with the knees straight.' },
      { muscle: 'gastrocnemius', state: 'short', weight: 1, because: 'Contributes via the posterior chain.' },
    ],
  },

  // ---- Arm, forearm, hand ----------------------------------------------
  {
    id: 'lateral_elbow_pain_gripping',
    name: 'Pain on the outside of the elbow when gripping, lifting or shaking hands',
    region: ['forearm'],
    implies: [
      { muscle: 'wrist_extensors', state: 'weak', weight: 4, because: 'Classic lateral epicondylalgia pattern — the extensor tendon is under-conditioned for the load placed on it.' },
      { muscle: 'supinator', state: 'short', weight: 1, because: 'Shares the lateral epicondyle origin and can contribute.' },
    ],
  },
  {
    id: 'medial_elbow_pain_gripping',
    name: 'Pain on the inside of the elbow when gripping or with palm-down lifting',
    region: ['forearm'],
    implies: [
      { muscle: 'wrist_flexors', state: 'weak', weight: 4, because: 'Medial epicondylalgia — the common flexor tendon is overloaded relative to its capacity.' },
      { muscle: 'pronators', state: 'short', weight: 2, because: 'Pronator teres shares that origin and is overworked in palm-down work.' },
    ],
  },
  {
    id: 'grip_fatigue_desk',
    name: 'Forearms ache or grip tires easily after typing, mouse or phone use',
    region: ['forearm'],
    implies: [
      { muscle: 'finger_flexors', state: 'short', weight: 3, because: 'Sustained low-level gripping keeps the flexors shortened for hours.' },
      { muscle: 'finger_extensors', state: 'weak', weight: 3, because: 'The opposing group is almost never trained, so the imbalance grows.' },
      { muscle: 'pronators', state: 'short', weight: 2, because: 'The forearm sits pronated for the whole working day.' },
    ],
  },
  {
    id: 'limited_forearm_rotation',
    name: 'Turning the palm fully up (elbow tucked in) is limited or uneven side to side',
    region: ['forearm'],
    implies: [
      { muscle: 'pronators', state: 'short', weight: 3, because: 'Short pronators restrict supination range.' },
      { muscle: 'supinator', state: 'weak', weight: 2, because: 'Cannot achieve full range actively.' },
    ],
  },
  {
    id: 'shrug_on_arm_raise',
    name: 'Raising the arm out to the side, the shoulder hitches up toward the ear',
    region: ['shoulder'],
    implies: [
      { muscle: 'upper_trapezius', state: 'short', weight: 3, because: 'Substitutes by elevating the whole shoulder girdle.' },
      { muscle: 'deltoid', state: 'weak', weight: 2, because: 'Insufficient abduction force, so the shrug compensates.' },
      { muscle: 'lower_trapezius', state: 'weak', weight: 3, because: 'Fails to anchor the scapula down, allowing the hitch.' },
    ],
  },
  {
    id: 'hand_numbness_night',
    name: 'Hand numbness or pins and needles, especially at night or when driving',
    region: ['hand'],
    implies: [
      { muscle: 'finger_flexors', state: 'short', weight: 2, because: 'Their tendons share the carpal tunnel with the median nerve.' },
      { muscle: 'scalenes', state: 'short', weight: 2, because: 'The brachial plexus passes between the scalenes; tightness can contribute.' },
      { muscle: 'pectoralis_minor', state: 'short', weight: 2, because: 'The plexus passes beneath it; a short pec minor can compress it.' },
    ],
  },

  // ---- Head and jaw -----------------------------------------------------
  {
    id: 'jaw_clenching',
    name: 'You clench or grind your teeth, or wake with a tight, tired jaw',
    region: ['jaw'],
    implies: [
      { muscle: 'masseter', state: 'short', weight: 4, because: 'The primary clenching muscle; it is chronically overactive in bruxism.' },
      { muscle: 'temporalis', state: 'short', weight: 3, because: 'Co-contracts with masseter and refers to the temple.' },
      { muscle: 'pterygoids', state: 'short', weight: 2, because: 'Involved in grinding and side-to-side movement.' },
    ],
  },
  {
    id: 'headache_temple_jaw',
    name: 'Recurrent headaches at the temple, behind the eye, or around the ear',
    region: ['jaw', 'neck'],
    implies: [
      { muscle: 'temporalis', state: 'short', weight: 3, because: 'Refers directly to the temple and eyebrow.' },
      { muscle: 'sternocleidomastoid', state: 'short', weight: 3, because: 'Refers to the forehead, behind the eye and the ear — often mistaken for migraine.' },
      { muscle: 'suboccipitals', state: 'short', weight: 3, because: 'Classic cervicogenic headache source at the base of the skull.' },
      { muscle: 'upper_trapezius', state: 'short', weight: 2, because: 'Refers up the neck to the temple.' },
    ],
  },
  {
    id: 'chest_breathing',
    name: 'You breathe mainly into the chest — shoulders rise with each breath',
    region: ['neck'],
    implies: [
      { muscle: 'scalenes', state: 'short', weight: 4, because: 'Accessory breathing muscles working with every breath rather than only under exertion.' },
      { muscle: 'sternocleidomastoid', state: 'short', weight: 3, because: 'Also recruited as an accessory breathing muscle.' },
      { muscle: 'upper_trapezius', state: 'short', weight: 2, because: 'Elevates the shoulder girdle with each breath.' },
      { muscle: 'transversus_abdominis', state: 'weak', weight: 2, because: 'Diaphragmatic and deep core function are coupled.' },
    ],
  },
  {
    id: 'neck_rotation_limited',
    name: 'Turning the head to look over one shoulder is clearly harder than the other',
    region: ['neck'],
    implies: [
      { muscle: 'sternocleidomastoid', state: 'short', weight: 3, because: 'Rotates the head to the opposite side; shortness limits rotation toward its own side.' },
      { muscle: 'splenius', state: 'short', weight: 3, because: 'Rotates to the same side; shortness limits rotation away from it.' },
      { muscle: 'levator_scapulae', state: 'short', weight: 2, because: 'Restricts combined rotation and side bend.' },
    ],
  },
];

const SYMPTOM_REGIONS = {
  neck: ['upper_trapezius', 'levator_scapulae', 'suboccipitals', 'deep_neck_flexors'],
  shoulder: ['rotator_cuff', 'pectoralis_minor', 'lower_trapezius', 'serratus_anterior', 'rhomboids'],
  'upper back': ['rhomboids', 'lower_trapezius', 'erector_spinae', 'latissimus_dorsi'],
  'low back': ['erector_spinae', 'quadratus_lumborum', 'multifidus', 'transversus_abdominis', 'iliopsoas', 'gluteus_maximus'],
  hip: ['gluteus_medius', 'gluteus_maximus', 'iliopsoas', 'piriformis', 'tfl', 'adductor_group'],
  knee: ['quadriceps', 'gluteus_medius', 'soleus', 'hamstrings', 'rectus_femoris'],
  ankle: ['soleus', 'gastrocnemius', 'peroneals', 'tibialis_anterior'],
  'lateral thigh': ['tfl', 'gluteus_medius'],
  groin: ['adductor_group', 'iliopsoas'],
  calf: ['gastrocnemius', 'soleus'],
  arm: ['biceps_brachii', 'triceps_brachii', 'brachialis', 'deltoid'],
  elbow: ['wrist_extensors', 'wrist_flexors', 'biceps_brachii', 'triceps_brachii'],
  forearm: ['wrist_extensors', 'wrist_flexors', 'finger_flexors', 'finger_extensors', 'pronators', 'supinator'],
  wrist: ['wrist_flexors', 'wrist_extensors', 'finger_flexors'],
  hand: ['hand_intrinsics', 'finger_flexors', 'finger_extensors'],
  jaw: ['masseter', 'temporalis', 'pterygoids', 'digastric'],
  head: ['suboccipitals', 'temporalis', 'sternocleidomastoid', 'splenius'],
  shin: ['tibialis_anterior', 'soleus'],
};

function screenRedFlags(answers = {}) {
  const triggered = RED_FLAGS.filter((f) => answers[f.id] === true);
  if (!triggered.length) return { clear: true, triggered: [] };
  const emergency = triggered.some((f) => f.urgency === 'emergency');
  return {
    clear: false,
    emergency,
    triggered,
    action: emergency
      ? 'Seek emergency medical care now. Do not exercise, stretch or massage the area.'
      : 'See a doctor or physiotherapist before starting any exercise programme.',
  };
}

/**
 * Core reasoning. Accumulates weighted evidence per muscle+state, then converts
 * to a bounded confidence. Confidence deliberately saturates below 100%: this
 * engine reasons from self-reported findings, and certainty is not available
 * from that input. A screen that reported 95% confidence would be lying.
 */
function assess({ findings = [], symptomRegions = [], painLevel = 0, redFlagAnswers = {} } = {}) {
  const flags = screenRedFlags(redFlagAnswers);
  if (!flags.clear) {
    return {
      safe: false,
      redFlags: flags,
      hypotheses: [],
      message: 'Assessment stopped. Findings here need a clinician, not an exercise programme.',
    };
  }

  const evidence = new Map();
  const add = (muscleId, state, weight, because, source) => {
    if (!byId[muscleId]) return;
    const key = `${muscleId}:${state}`;
    if (!evidence.has(key)) {
      evidence.set(key, { muscleId, state, score: 0, reasons: [] });
    }
    const e = evidence.get(key);
    e.score += weight;
    e.reasons.push({ source, because, weight });
  };

  for (const fid of findings) {
    const screen = SCREENS.find((s) => s.id === fid);
    if (!screen) continue;
    for (const imp of screen.implies) {
      add(imp.muscle, imp.state, imp.weight, imp.because, screen.name);
    }
  }

  // Symptom location is weak evidence on its own -- it narrows the field rather
  // than identifying a cause. Weighted low on purpose so that a movement finding
  // always outranks "it hurts here".
  for (const region of symptomRegions) {
    const candidates = SYMPTOM_REGIONS[region.toLowerCase()] || [];
    for (const mId of candidates) {
      const m = byId[mId];
      if (!m) continue;
      const state = m.tendency === 'tonic' ? 'short' : 'weak';
      add(mId, state, 1, `Symptoms reported in the ${region}, a region this muscle commonly refers to.`, `Reported symptom area: ${region}`);
    }
  }

  const maxScore = Math.max(1, ...Array.from(evidence.values(), (e) => e.score));
  const hypotheses = Array.from(evidence.values())
    .map((e) => {
      const m = byId[e.muscleId];
      // Saturating curve: strong evidence approaches but never reaches certainty.
      const confidence = Math.round((1 - Math.exp(-e.score / 4)) * 88);
      return {
        muscle: m.name,
        muscleId: e.muscleId,
        region: m.region,
        state: e.state,
        stateLabel: e.state === 'short' ? 'likely short / overactive' : 'likely long / underactive',
        score: e.score,
        confidence,
        confidenceLabel: confidence >= 60 ? 'moderate' : confidence >= 35 ? 'low-moderate' : 'low',
        reasons: e.reasons,
        note: m.notes,
      };
    })
    .sort((a, b) => b.score - a.score || a.muscle.localeCompare(b.muscle));

  const pairs = findImbalancePairs(hypotheses);

  return {
    safe: true,
    redFlags: flags,
    painLevel,
    hypotheses,
    imbalancePairs: pairs,
    disclaimer:
      'These are ranked possibilities generated from what you reported, not a diagnosis. ' +
      'Confidence reflects how much of the entered evidence points one way — it is not a probability of being correct.',
  };
}

/**
 * Identify antagonist pairs where one side is short and the other weak.
 *
 * This is the clinically interesting output: a short/weak PAIR explains a
 * pattern, where a single tight muscle explains only a symptom. It is also
 * what stops the app recommending stretching for a muscle that is already long.
 */
function findImbalancePairs(hypotheses) {
  const pairs = [];
  const seen = new Set();
  for (const h of hypotheses) {
    const m = byId[h.muscleId];
    for (const antId of m.antagonists || []) {
      const other = hypotheses.find((x) => x.muscleId === antId);
      if (!other) continue;
      if (h.state === other.state) continue;
      const key = [h.muscleId, antId].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const short = h.state === 'short' ? h : other;
      const weak = h.state === 'weak' ? h : other;
      pairs.push({
        short: short.muscle,
        shortId: short.muscleId,
        weak: weak.muscle,
        weakId: weak.muscleId,
        combinedConfidence: Math.round((short.confidence + weak.confidence) / 2),
        explanation:
          `${short.muscle} appears short/overactive while ${weak.muscle} appears long/underactive. ` +
          'These oppose each other, so treating only one side tends to relapse: the short side needs ' +
          'length and downtraining, the long side needs strength through range.',
      });
    }
  }
  return pairs.sort((a, b) => b.combinedConfidence - a.combinedConfidence);
}

module.exports = { assess, screenRedFlags, findImbalancePairs, RED_FLAGS, SCREENS, SYMPTOM_REGIONS };
