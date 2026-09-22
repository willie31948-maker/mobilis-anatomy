import {
  RedFlagItem,
  ScreenItem,
  MuscleHypothesis,
  ImbalancePair,
  PrescribedExercise,
  AssessmentResult,
  AssessmentHistoryItem,
} from '../types/rehab';

export const RED_FLAGS: RedFlagItem[] = [
  {
    id: 'bladder_bowel',
    q: 'Any loss of bladder or bowel control, or numbness around the groin/saddle area?',
    why: 'Possible cauda equina syndrome — a surgical emergency. Hours matter.',
    urgency: 'emergency',
  },
  {
    id: 'progressive_weakness',
    q: 'Is there progressive weakness, or a foot/hand that drops or gives way?',
    why: 'Possible progressing motor nerve root compression requiring prompt medical evaluation.',
    urgency: 'urgent',
  },
  {
    id: 'unexplained_weight_loss',
    q: 'Unexplained weight loss, night sweats, or fever with this pain?',
    why: 'Systemic pathology (infection, malignancy) must be investigated and ruled out.',
    urgency: 'urgent',
  },
  {
    id: 'night_pain',
    q: 'Constant pain that is clearly worse at night and unrelieved by position changes?',
    why: 'Non-mechanical inflammatory or systemic pain pattern — needs medical evaluation.',
    urgency: 'urgent',
  },
  {
    id: 'trauma',
    q: 'Significant trauma (high-impact fall, collision), or inability to bear any weight?',
    why: 'Structural fracture, high-grade tear or joint compromise must be imaged.',
    urgency: 'urgent',
  },
  {
    id: 'calf_swelling',
    q: 'Hot, swollen, tender calf — particularly after surgery, immobility or a long flight?',
    why: 'Possible Deep Vein Thrombosis (DVT). Immediate medical emergency; do not stretch or massage.',
    urgency: 'emergency',
  },
  {
    id: 'cancer_history',
    q: 'Personal history of cancer, accompanied by new unexplained musculoskeletal pain?',
    why: 'Secondary bone or soft-tissue involvement must be excluded first.',
    urgency: 'urgent',
  },
  {
    id: 'steroid_osteoporosis',
    q: 'Long-term corticosteroid use or diagnosed osteoporosis, with new acute spinal pain?',
    why: 'Elevated risk of osteoporotic vertebral compression fracture.',
    urgency: 'urgent',
  },
];

export const SCREENS: ScreenItem[] = [
  // --- Lower Extremity & Foot/Ankle ---
  {
    id: 'overhead_squat_heels',
    name: 'Overhead Squat: Heels lift or torso pitches excessively forward',
    category: 'Lower Extremity',
    region: ['ankle', 'knee', 'hip'],
    instructions: 'Perform 5 slow bodyweight squats with arms overhead. Look for the heels leaving the floor.',
    compensationCues: 'Restricted ankle dorsiflexion restricts knee travel, forcing hip collapse or forward torso lean.',
    implies: [
      { muscle: 'soleus', state: 'short', weight: 3, because: 'Restricted soleus length restricts talocrural dorsiflexion.' },
      { muscle: 'gastrocnemius', state: 'short', weight: 2, because: 'Tightness limits closed-chain ankle excursion.' },
      { muscle: 'tibialis_anterior', state: 'weak', weight: 2, because: 'Inadequate active dorsiflexor recruitment.' },
    ],
  },
  {
    id: 'overhead_squat_knees_in',
    name: 'Overhead Squat: Knees cave inward (Valgus collapse)',
    category: 'Lower Extremity',
    region: ['hip', 'knee'],
    instructions: 'Observe knees relative to second toe during descent and ascent.',
    compensationCues: 'Femoral adduction and internal rotation caused by weak hip external rotators/abductors.',
    implies: [
      { muscle: 'gluteus_medius', state: 'weak', weight: 4, because: 'Failure of posterior fibres to control femoral adduction/internal rotation.' },
      { muscle: 'adductor_group', state: 'short', weight: 2, because: 'Adductor dominance pulls the knee toward the midline.' },
      { muscle: 'tfl', state: 'short', weight: 2, because: 'Compensates as a hip stabilizer, tightening the iliotibial band.' },
    ],
  },
  {
    id: 'single_leg_pelvic_drop',
    name: 'Single-Leg Stance: Pelvis drops on unsupported side (Trendelenburg)',
    category: 'Lower Extremity',
    region: ['hip', 'knee'],
    instructions: 'Stand on one leg for 15 seconds. Look for opposite hip dropping below level.',
    compensationCues: 'Classic sign of stance-side gluteus medius insufficiency in the frontal plane.',
    implies: [
      { muscle: 'gluteus_medius', state: 'weak', weight: 4, because: 'Trendelenburg sign — direct indicator of abductor/stabilizer failure.' },
      { muscle: 'quadratus_lumborum', state: 'short', weight: 2, because: 'Lateral trunk hiker substitutes for weak hip abduction.' },
    ],
  },
  {
    id: 'sit_and_reach_limited',
    name: 'Toe Touch / Forward Bend: Heavily restricted in posterior thighs',
    category: 'Lower Extremity',
    region: ['hip', 'knee'],
    instructions: 'Bend forward with knees straight. Note if hamstring tension blocks hip hinge.',
    compensationCues: 'Shortened or protectively tensioned hamstring complex restricting pelvic rotation.',
    implies: [
      { muscle: 'hamstrings', state: 'short', weight: 3, because: 'Tension restricts normal posterior chain excursion.' },
      { muscle: 'gastrocnemius', state: 'short', weight: 1, because: 'Superficial back line fascial continuity.' },
    ],
  },

  // --- Lumbo-Pelvic & Core ---
  {
    id: 'anterior_pelvic_tilt',
    name: 'Static Posture: Exaggerated lumbar curve with forward belt-line drop',
    category: 'Lumbo-Pelvic & Core',
    region: ['low back', 'hip'],
    instructions: 'View posture from the side in a mirror. Check ASIS level relative to PSIS.',
    compensationCues: 'Lower crossed pattern: short hip flexors & lumbar extensors paired with weak glutes & transverse abdominis.',
    implies: [
      { muscle: 'iliopsoas', state: 'short', weight: 4, because: 'Pulls the pelvis into anterior rotation and lumbar extension.' },
      { muscle: 'erector_spinae', state: 'short', weight: 2, because: 'Sustained hypertonicity in lumbar extensors.' },
      { muscle: 'gluteus_maximus', state: 'weak', weight: 3, because: 'Reciprocally inhibited by tonic hip flexors.' },
      { muscle: 'transversus_abdominis', state: 'weak', weight: 3, because: 'Lacks deep intra-abdominal pressure support.' },
    ],
  },
  {
    id: 'thomas_test_positive',
    name: 'Modified Thomas Test: Thigh does not rest flat when supine on edge',
    category: 'Lumbo-Pelvic & Core',
    region: ['hip', 'low back'],
    instructions: 'Lie on table/bed edge, pull one knee to chest. Observe if other thigh remains lifted.',
    compensationCues: 'Shortness in primary hip flexors (iliopsoas or rectus femoris).',
    implies: [
      { muscle: 'iliopsoas', state: 'short', weight: 4, because: 'Direct mechanical limitation of hip extension.' },
      { muscle: 'rectus_femoris', state: 'short', weight: 3, because: 'Bi-articular flexor contributes if knee remains extended.' },
    ],
  },
  {
    id: 'prone_hip_extension_hamstring_first',
    name: 'Prone Hip Extension: Hamstring & lower back fire before gluteus maximus',
    category: 'Lumbo-Pelvic & Core',
    region: ['hip', 'low back'],
    instructions: 'Lie face down and lift leg toward ceiling. Feel whether buttock or hamstring contracts first.',
    compensationCues: 'Altered motor recruitment pattern — synergist dominance of hamstring and lumbar spine.',
    implies: [
      { muscle: 'gluteus_maximus', state: 'weak', weight: 4, because: 'Delayed neuromuscular activation of primary hip extensor.' },
      { muscle: 'hamstrings', state: 'short', weight: 2, because: 'Overused synergist prone to chronic cramping or strains.' },
      { muscle: 'erector_spinae', state: 'short', weight: 2, because: 'Lumbar extension substitutes for true hip extension.' },
    ],
  },

  // --- Scapulo-Thoracic & Shoulder ---
  {
    id: 'overhead_squat_arms_fall',
    name: 'Overhead Squat: Arms fall forward out of vertical alignment',
    category: 'Scapulo-Thoracic',
    region: ['shoulder', 'upper back'],
    instructions: 'Hold dowel or arms overhead in squat. Look for arms pitching forward past ears.',
    compensationCues: 'Tight latissimus dorsi, pectoralis major or weak lower trapezius/rhomboids.',
    implies: [
      { muscle: 'latissimus_dorsi', state: 'short', weight: 3, because: 'Internal rotator and extensor restricting glenohumeral flexion.' },
      { muscle: 'pectoralis_minor', state: 'short', weight: 2, because: 'Anteriorly tilts scapula, blocking upward rotation.' },
      { muscle: 'lower_trapezius', state: 'weak', weight: 3, because: 'Inadequate upward rotation and scapular depression.' },
    ],
  },
  {
    id: 'rounded_shoulders',
    name: 'Relaxed Stance: Rounded shoulders with thumbs facing inward/backward',
    category: 'Scapulo-Thoracic',
    region: ['shoulder', 'upper back'],
    instructions: 'Stand naturally. Check if shoulders project forward of the lateral mid-line.',
    compensationCues: 'Upper crossed pattern: tight pectorals combined with inhibited scapular retractors.',
    implies: [
      { muscle: 'pectoralis_minor', state: 'short', weight: 3, because: 'Pulls coracoid process forward and down.' },
      { muscle: 'pectoralis_major', state: 'short', weight: 2, because: 'Internally rotates the humerus.' },
      { muscle: 'rhomboids', state: 'weak', weight: 3, because: 'Chronically lengthened and inhibited.' },
      { muscle: 'lower_trapezius', state: 'weak', weight: 2, because: 'Inhibited scapular anchor.' },
    ],
  },
  {
    id: 'scapular_winging',
    name: 'Wall Press / Push-Up: Shoulder blade lifts off rib cage (Winging)',
    category: 'Scapulo-Thoracic',
    region: ['shoulder', 'upper back'],
    instructions: 'Perform slow pushup against a wall. Look for medial border of scapula lifting.',
    compensationCues: 'Serratus anterior weakness failing to protract and secure the scapula against the thoracic wall.',
    implies: [
      { muscle: 'serratus_anterior', state: 'weak', weight: 4, because: 'Primary muscle stabilizing the scapula against the rib cage.' },
      { muscle: 'lower_trapezius', state: 'weak', weight: 2, because: 'Synergist in upward rotation and stabilizing force couple.' },
    ],
  },
  {
    id: 'painful_arc',
    name: 'Painful Arc: Shoulder pain occurs between 60° and 120° of abduction',
    category: 'Scapulo-Thoracic',
    region: ['shoulder'],
    instructions: 'Slowly raise the straight arm out to the side overhead. Note where pain is provoked.',
    compensationCues: 'Subacromial impingement due to inadequate humeral head depression by rotator cuff.',
    implies: [
      { muscle: 'rotator_cuff', state: 'weak', weight: 4, because: 'Infraspinatus/supraspinatus fail to centralize the humeral head.' },
      { muscle: 'pectoralis_minor', state: 'short', weight: 2, because: 'Anterior scapular tilt narrows the subacromial space.' },
      { muscle: 'lower_trapezius', state: 'weak', weight: 2, because: 'Fails to upwardly rotate the acromion out of the path.' },
    ],
  },
  {
    id: 'shrug_on_arm_raise',
    name: 'Shoulder Hitch: Shoulder elevates toward ear when lifting arm',
    category: 'Scapulo-Thoracic',
    region: ['shoulder', 'neck'],
    instructions: 'Raise arm out to the side. Look for the upper trap hiking the shoulder early.',
    compensationCues: 'Overactive upper trapezius substituting for deltoid or rotator cuff mechanics.',
    implies: [
      { muscle: 'upper_trapezius', state: 'short', weight: 3, because: 'Hyperactive compensator elevating the shoulder girdle.' },
      { muscle: 'lower_trapezius', state: 'weak', weight: 3, because: 'Fails to depress and stabilize the scapular base.' },
      { muscle: 'deltoid', state: 'weak', weight: 2, because: 'Weak active abduction force triggers compensation.' },
    ],
  },

  // --- Cervical & Head ---
  {
    id: 'forward_head',
    name: 'Side Posture: Ear sits clearly forward of the acromion shoulder line',
    category: 'Cervical & Head',
    region: ['neck', 'upper back'],
    instructions: 'Observe standing profile. Check alignment of ear canal to acromion process.',
    compensationCues: 'Upper cervical hyperextension paired with lower cervical flexion.',
    implies: [
      { muscle: 'suboccipitals', state: 'short', weight: 3, because: 'Tonic contraction to maintain horizontal gaze.' },
      { muscle: 'deep_neck_flexors', state: 'weak', weight: 4, because: 'Inability to maintain neutral cervical lordosis.' },
      { muscle: 'upper_trapezius', state: 'short', weight: 2, because: 'Sustains heavy postural load supporting head weight.' },
      { muscle: 'levator_scapulae', state: 'short', weight: 2, because: 'Chronically shortened in elevated/protracted posture.' },
    ],
  },
  {
    id: 'neck_rotation_limited',
    name: 'Cervical Rotation: Looking over shoulder is restricted or asymmetrical',
    category: 'Cervical & Head',
    region: ['neck'],
    instructions: 'Turn head fully left and right. Aim for chin to reach close to collarbone.',
    compensationCues: 'Unilateral hypertonicity in sternocleidomastoid, splenius, or levator scapulae.',
    implies: [
      { muscle: 'sternocleidomastoid', state: 'short', weight: 3, because: 'Contralateral rotator restriction.' },
      { muscle: 'levator_scapulae', state: 'short', weight: 2, because: 'Restricts combined cervical rotation and lateral flexion.' },
    ],
  },
  {
    id: 'chest_breathing',
    name: 'Apical Breathing: Shoulders and upper chest rise noticeably on inhale',
    category: 'Cervical & Head',
    region: ['neck', 'upper back'],
    instructions: 'Breathe normally with one hand on chest and one on belly.',
    compensationCues: 'Accessory respiratory muscles (scalenes, sternocleidomastoid) overworking at rest.',
    implies: [
      { muscle: 'scalenes', state: 'short', weight: 4, because: 'Overworked as primary rather than emergency accessory inducers.' },
      { muscle: 'transversus_abdominis', state: 'weak', weight: 2, because: 'Impaired diaphragmatic breathing coupling.' },
    ],
  },

  // --- Upper Extremity / Arm & Forearm ---
  {
    id: 'lateral_elbow_pain_gripping',
    name: 'Elbow Strain: Outer elbow pain with gripping, typing or lifting objects',
    category: 'Upper Extremity',
    region: ['forearm', 'elbow'],
    instructions: 'Extend wrist against resistance or pick up a kettle / heavy mug.',
    compensationCues: 'Lateral epicondylopathy — extensor carpi radialis brevis tendon load intolerance.',
    implies: [
      { muscle: 'wrist_extensors', state: 'weak', weight: 4, because: 'Common extensor tendon is overloaded relative to its capacity.' },
      { muscle: 'supinator', state: 'short', weight: 2, because: 'Shares lateral epicondyle origin and adds continuous tension.' },
    ],
  },
  {
    id: 'medial_elbow_pain_gripping',
    name: 'Golfer’s Elbow: Inner elbow soreness with palm-down lifting or wrist flex',
    category: 'Upper Extremity',
    region: ['forearm', 'elbow'],
    instructions: 'Flex wrist against resistance with palm facing up.',
    compensationCues: 'Medial epicondylopathy — load intolerance at the common flexor tendon.',
    implies: [
      { muscle: 'wrist_flexors', state: 'weak', weight: 4, because: 'Common flexor-pronator mass is under-conditioned for load.' },
      { muscle: 'pronators', state: 'short', weight: 2, because: 'Pronator teres maintains sustained shortening during desk work.' },
    ],
  },
  {
    id: 'grip_fatigue_desk',
    name: 'Forearm Cramping / Rapid fatigue after prolonged keyboard or mouse use',
    category: 'Upper Extremity',
    region: ['forearm', 'wrist', 'hand'],
    instructions: 'Note if forearm flexors ache after a work session.',
    compensationCues: 'Repetitive isometric finger flexion without extensor counterbalance.',
    implies: [
      { muscle: 'finger_flexors', state: 'short', weight: 3, because: 'Sustained shortening from continuous key presses.' },
      { muscle: 'finger_extensors', state: 'weak', weight: 3, because: 'Neglected antagonist group lacking endurance.' },
    ],
  },
];

export const SYMPTOM_REGIONS: Record<string, string[]> = {
  neck: ['upper_trapezius', 'levator_scapulae', 'suboccipitals', 'deep_neck_flexors'],
  shoulder: ['rotator_cuff', 'pectoralis_minor', 'lower_trapezius', 'serratus_anterior', 'rhomboids'],
  'upper back': ['rhomboids', 'lower_trapezius', 'erector_spinae', 'latissimus_dorsi'],
  'low back': ['erector_spinae', 'quadratus_lumborum', 'transversus_abdominis', 'iliopsoas', 'gluteus_maximus'],
  hip: ['gluteus_medius', 'gluteus_maximus', 'iliopsoas', 'piriformis', 'tfl', 'adductor_group'],
  knee: ['quadriceps', 'gluteus_medius', 'soleus', 'hamstrings', 'rectus_femoris'],
  ankle: ['soleus', 'gastrocnemius', 'tibialis_anterior'],
  'lateral thigh': ['tfl', 'gluteus_medius'],
  groin: ['adductor_group', 'iliopsoas'],
  calf: ['gastrocnemius', 'soleus'],
  elbow: ['wrist_extensors', 'wrist_flexors'],
  forearm: ['wrist_extensors', 'wrist_flexors', 'finger_flexors', 'finger_extensors', 'pronators'],
  wrist: ['wrist_flexors', 'wrist_extensors'],
};

export const ANATOMY_METRIC_MAP: Record<string, {
  name: string;
  region: string;
  tendency: 'tonic' | 'phasic';
  antagonists: string[];
  meshKeywords: string[];
  notes: string;
}> = {
  iliopsoas: {
    name: 'Iliopsoas',
    region: 'hip',
    tendency: 'tonic',
    antagonists: ['gluteus_maximus'],
    meshKeywords: ['psoas', 'iliacus'],
    notes: 'Shortens with prolonged sitting. Tight psoas feeds anterior pelvic tilt and reciprocally inhibits gluteus maximus.',
  },
  gluteus_maximus: {
    name: 'Gluteus Maximus',
    region: 'hip',
    tendency: 'phasic',
    antagonists: ['iliopsoas'],
    meshKeywords: ['gluteus_maximus', 'gluteus maximus'],
    notes: 'Primary hip extensor. Frequently inhibited in sitting populations; leading to compensatory hamstring dominance.',
  },
  gluteus_medius: {
    name: 'Gluteus Medius',
    region: 'hip',
    tendency: 'phasic',
    antagonists: ['adductor_group', 'tfl'],
    meshKeywords: ['gluteus_medius', 'gluteus medius'],
    notes: 'Pelvic stabilizer during single-leg stance. Insufficiency leads to knee valgus, ITB friction, and lateral hip pain.',
  },
  tfl: {
    name: 'Tensor Fasciae Latae (TFL)',
    region: 'hip',
    tendency: 'tonic',
    antagonists: ['gluteus_maximus'],
    meshKeywords: ['tensor_fasciae_latae', 'tfl'],
    notes: 'Becomes dominant when gluteus medius under-fires, creating excessive lateral knee and IT band tension.',
  },
  adductor_group: {
    name: 'Hip Adductor Complex',
    region: 'hip',
    tendency: 'tonic',
    antagonists: ['gluteus_medius'],
    meshKeywords: ['adductor', 'gracilis'],
    notes: 'Pulls femur inward. Hyperactivity reinforces knee valgus and pelvic torsion.',
  },
  hamstrings: {
    name: 'Hamstring Complex',
    region: 'thigh',
    tendency: 'tonic',
    antagonists: ['quadriceps'],
    meshKeywords: ['biceps_femoris', 'semitendinosus', 'semimembranosus', 'hamstring'],
    notes: 'Often feels tight while protectively lengthened in anterior pelvic tilt. Stretching can aggravate strain risk.',
  },
  rectus_femoris: {
    name: 'Rectus Femoris',
    region: 'thigh',
    tendency: 'tonic',
    antagonists: ['hamstrings'],
    meshKeywords: ['rectus_femoris', 'quadriceps'],
    notes: 'Two-joint muscle crossing hip and knee. Contributes to anterior pelvic tilt and patellofemoral compression.',
  },
  quadriceps: {
    name: 'Quadriceps Femoris',
    region: 'thigh',
    tendency: 'phasic',
    antagonists: ['hamstrings'],
    meshKeywords: ['vastus_lateralis', 'vastus_medialis', 'rectus_femoris'],
    notes: 'Knee extensor and deceleration absorber. Quadriceps dominance without hip drive strains the patellar tendon.',
  },
  soleus: {
    name: 'Soleus',
    region: 'calf',
    tendency: 'tonic',
    antagonists: ['tibialis_anterior'],
    meshKeywords: ['soleus'],
    notes: 'Deep calf muscle. Shortness directly prevents ankle dorsiflexion, precipitating heel rise and knee collapse.',
  },
  gastrocnemius: {
    name: 'Gastrocnemius',
    region: 'calf',
    tendency: 'tonic',
    antagonists: ['tibialis_anterior'],
    meshKeywords: ['gastrocnemius'],
    notes: 'Superficial two-joint calf muscle. Shortness restricts knee extension and dorsiflexion.',
  },
  tibialis_anterior: {
    name: 'Tibialis Anterior',
    region: 'calf',
    tendency: 'phasic',
    antagonists: ['soleus', 'gastrocnemius'],
    meshKeywords: ['tibialis_anterior'],
    notes: 'Primary ankle dorsiflexor and medial arch suspender. Weakness promotes foot pronation and gait slumping.',
  },
  erector_spinae: {
    name: 'Erector Spinae',
    region: 'spine',
    tendency: 'tonic',
    antagonists: ['rectus_abdominis', 'transversus_abdominis'],
    meshKeywords: ['erector_spinae', 'longissimus', 'iliocostalis', 'spinalis'],
    notes: 'Lumbar extensors. Overactive in anterior pelvic tilt and desk slouching recovery.',
  },
  quadratus_lumborum: {
    name: 'Quadratus Lumborum (QL)',
    region: 'spine',
    tendency: 'tonic',
    antagonists: ['gluteus_medius'],
    meshKeywords: ['quadratus_lumborum'],
    notes: 'Lateral stabilizer that hikes the pelvis when the stance-side glute medius fails.',
  },
  transversus_abdominis: {
    name: 'Transversus Abdominis',
    region: 'core',
    tendency: 'phasic',
    antagonists: ['erector_spinae'],
    meshKeywords: ['transversus_abdominis', 'transverse'],
    notes: 'Deep abdominal corset responsible for feedforward intra-abdominal stabilization before limb movement.',
  },
  rectus_abdominis: {
    name: 'Rectus Abdominis',
    region: 'core',
    tendency: 'phasic',
    antagonists: ['erector_spinae'],
    meshKeywords: ['rectus_abdominis'],
    notes: 'Primary sagittal trunk flexor and intra-abdominal compressor.',
  },
  pectoralis_minor: {
    name: 'Pectoralis Minor',
    region: 'shoulder',
    tendency: 'tonic',
    antagonists: ['lower_trapezius', 'rhomboids'],
    meshKeywords: ['pectoralis_minor', 'pectoralis'],
    notes: 'Pulls coracoid process forward and down, directly narrowing the subacromial space for rotator cuff tendons.',
  },
  pectoralis_major: {
    name: 'Pectoralis Major',
    region: 'shoulder',
    tendency: 'tonic',
    antagonists: ['rhomboids'],
    meshKeywords: ['pectoralis_major', 'pectoralis'],
    notes: 'Internal rotator. Sustained shortening causes protracted shoulders and forward palm orientation.',
  },
  latissimus_dorsi: {
    name: 'Latissimus Dorsi',
    region: 'upper back',
    tendency: 'tonic',
    antagonists: ['lower_trapezius', 'deltoid'],
    meshKeywords: ['latissimus_dorsi', 'latissimus'],
    notes: 'Large back muscle inserting onto humerus. Shortness blocks full overhead arm elevation.',
  },
  rhomboids: {
    name: 'Rhomboid Major & Minor',
    region: 'upper back',
    tendency: 'phasic',
    antagonists: ['pectoralis_minor', 'pectoralis_major'],
    meshKeywords: ['rhomboid'],
    notes: 'Scapular retractors. In rounded shoulders they are stretched and aching; stretching them further worsens posture.',
  },
  lower_trapezius: {
    name: 'Lower Trapezius',
    region: 'upper back',
    tendency: 'phasic',
    antagonists: ['upper_trapezius', 'pectoralis_minor'],
    meshKeywords: ['trapezius'],
    notes: 'Essential for scapular upward rotation and posterior tilt. Very commonly dormant in shoulder impingement.',
  },
  upper_trapezius: {
    name: 'Upper Trapezius',
    region: 'neck',
    tendency: 'tonic',
    antagonists: ['lower_trapezius'],
    meshKeywords: ['trapezius'],
    notes: 'Hyperactive elevator that takes over arm elevation when deltoid or lower traps are weak.',
  },
  serratus_anterior: {
    name: 'Serratus Anterior',
    region: 'shoulder',
    tendency: 'phasic',
    antagonists: ['rhomboids'],
    meshKeywords: ['serratus_anterior', 'serratus'],
    notes: 'The boxer muscle that anchors the scapula against the thoracic wall. Weakness produces winging.',
  },
  rotator_cuff: {
    name: 'Rotator Cuff Complex',
    region: 'shoulder',
    tendency: 'phasic',
    antagonists: ['pectoralis_major', 'latissimus_dorsi'],
    meshKeywords: ['supraspinatus', 'infraspinatus', 'subscapularis', 'teres_minor'],
    notes: 'Dynamic stabilizers that seat the humeral head in the glenoid fossa. Under-conditioning causes impingement.',
  },
  deep_neck_flexors: {
    name: 'Deep Cervical Flexors (Longus Colli/Capitis)',
    region: 'neck',
    tendency: 'phasic',
    antagonists: ['suboccipitals'],
    meshKeywords: ['longus_colli', 'neck'],
    notes: 'Maintain neutral cervical curvature. Weakness triggers the forward head posture compensation.',
  },
  suboccipitals: {
    name: 'Suboccipital Muscle Group',
    region: 'neck',
    tendency: 'tonic',
    antagonists: ['deep_neck_flexors'],
    meshKeywords: ['suboccipital', 'splenius', 'neck'],
    notes: 'Base of skull extensors. Tonic shortening produces cervicogenic headaches and upper cervical stiffness.',
  },
  scalenes: {
    name: 'Scalene Group',
    region: 'neck',
    tendency: 'tonic',
    antagonists: ['deep_neck_flexors'],
    meshKeywords: ['scalene', 'neck'],
    notes: 'Accessory breathing muscles. Shortened by apical chest breathing; can entrap the brachial plexus.',
  },
  wrist_extensors: {
    name: 'Common Wrist Extensors',
    region: 'forearm',
    tendency: 'phasic',
    antagonists: ['wrist_flexors'],
    meshKeywords: ['extensor_carpi', 'extensor'],
    notes: 'Origin at lateral epicondyle. Overload produces tennis elbow symptoms during repetitive gripping.',
  },
  wrist_flexors: {
    name: 'Common Wrist Flexors',
    region: 'forearm',
    tendency: 'tonic',
    antagonists: ['wrist_extensors'],
    meshKeywords: ['flexor_carpi', 'flexor'],
    notes: 'Origin at medial epicondyle. Under conditioned for heavy eccentric load, prone to golfer elbow.',
  },
  finger_flexors: {
    name: 'Finger Flexors (Superficialis / Profundus)',
    region: 'forearm',
    tendency: 'tonic',
    antagonists: ['finger_extensors'],
    meshKeywords: ['flexor_digitorum', 'flexor'],
    notes: 'Maintained in persistent contraction during keyboard and smartphone grip work.',
  },
  finger_extensors: {
    name: 'Finger Extensors',
    region: 'forearm',
    tendency: 'phasic',
    antagonists: ['finger_flexors'],
    meshKeywords: ['extensor_digitorum', 'extensor'],
    notes: 'Neglected antagonist group needing targeted activation to balance grip endurance.',
  },
};

export const CLINICAL_EXERCISE_DATABASE: PrescribedExercise[] = [
  // --- Hip & Core Prehab/Rehab ---
  {
    id: 'half_kneeling_hip_flexor_stretch',
    name: 'Half-Kneeling Posterior Tilt Hip Flexor Stretch',
    mode: 'lengthen',
    targets: ['iliopsoas', 'rectus_femoris'],
    addressesMuscles: ['Iliopsoas', 'Rectus Femoris'],
    stage: ['subacute', 'chronic'],
    equipment: 'Floor mat',
    dose: '3 sets × 35s hold per side',
    cues: [
      'Kneel on the rear knee with front foot planted flat.',
      'Squeeze the glute on the kneeling side FIRST to induce posterior pelvic tilt.',
      'Maintain an upright spine and shift slightly forward until tension is felt in the anterior hip crease, not the lower back.',
    ],
    contraindications: ['Acute anterior hip impingement', 'Severe knee bursitis in kneeling position'],
  },
  {
    id: 'glute_bridge_isometric',
    name: 'Supine Glute Bridge with Isometric Peak Hold',
    mode: 'activate',
    targets: ['gluteus_maximus'],
    addressesMuscles: ['Gluteus Maximus'],
    stage: ['acute', 'subacute', 'chronic'],
    equipment: 'Bodyweight',
    dose: '3 sets × 12 reps (3-second peak squeeze)',
    cues: [
      'Lie supine with feet flat and knees bent at 90 degrees.',
      'Gently brace the lower abdomen to eliminate lumbar hyperextension.',
      'Drive strictly through the heels, locking out the hip with glute contraction rather than lower back arch.',
    ],
    contraindications: ['Acute facet joint lock'],
  },
  {
    id: 'side_lying_clam_clamshell',
    name: 'Side-Lying Clamshell with Neutral Pelvis',
    mode: 'activate',
    targets: ['gluteus_medius'],
    addressesMuscles: ['Gluteus Medius'],
    stage: ['acute', 'subacute', 'chronic'],
    equipment: 'Optional light resistance band',
    dose: '3 sets × 15 reps per side',
    cues: [
      'Lie on your side with hips stacked directly over each other at 45 degrees of flexion.',
      'Keep ankles glued together and elevate the top knee without rolling the pelvis backward.',
      'Feel the contraction in the upper posterior glute pocket.',
    ],
    contraindications: ['Acute trochanteric bursitis (perform standing if painful)'],
  },
  {
    id: 'dead_bug_core_stabilizer',
    name: 'Contralateral Dead Bug with Lumbar Contact',
    mode: 'activate',
    targets: ['transversus_abdominis', 'rectus_abdominis'],
    addressesMuscles: ['Transversus Abdominis', 'Rectus Abdominis'],
    stage: ['acute', 'subacute', 'chronic'],
    equipment: 'Bodyweight',
    dose: '3 sets × 10 reps per side (slow tempo)',
    cues: [
      'Lie supine and actively pin the natural lumbar curve flat into the mat.',
      'Slowly extend opposite arm and leg while holding full abdominal brace.',
      'If the lower back lifts off the floor, shorten the range of motion.',
    ],
    contraindications: ['Acute disc protrusion with severe flexion intolerance'],
  },
  {
    id: 'slant_board_soleus_dorsiflexion',
    name: 'Wall-Assisted Bent-Knee Soleus Mobilization',
    mode: 'mobilise',
    targets: ['soleus', 'gastrocnemius'],
    addressesMuscles: ['Soleus', 'Gastrocnemius'],
    stage: ['subacute', 'chronic'],
    equipment: 'Wall or doorframe',
    dose: '3 sets × 40s per side',
    cues: [
      'Place front foot 3-4 inches from the wall, keep heel grounded.',
      'Bend both knees and drive the front knee forward over the second toe.',
      'Ensure the heel never lifts and the knee does not cave inward.',
    ],
    contraindications: ['Acute anterior ankle impingement'],
  },

  // --- Shoulder & Scapular Prehab/Rehab ---
  {
    id: 'doorway_pec_minor_stretch',
    name: 'High-Arm Doorway Pectoralis Minor Lengthening',
    mode: 'lengthen',
    targets: ['pectoralis_minor', 'pectoralis_major'],
    addressesMuscles: ['Pectoralis Minor', 'Pectoralis Major'],
    stage: ['subacute', 'chronic'],
    equipment: 'Doorframe',
    dose: '3 sets × 30s per side',
    cues: [
      'Place forearm against doorframe with elbow positioned above shoulder height (120°).',
      'Step forward gently with the same-side leg while keeping the core braced.',
      'Focus on feeling the stretch under the collarbone and front of shoulder, not in the back.',
    ],
    contraindications: ['Anterior shoulder instability / prior anterior dislocation'],
  },
  {
    id: 'prone_y_lower_trap_raise',
    name: 'Prone Incline Y-Raise for Lower Trapezius',
    mode: 'strengthen',
    targets: ['lower_trapezius'],
    addressesMuscles: ['Lower Trapezius'],
    stage: ['subacute', 'chronic'],
    equipment: 'Incline bench or stability ball',
    dose: '3 sets × 12 reps with thumbs up',
    cues: [
      'Set arms at a 30-degree angle from the body forming a "Y" shape.',
      'Point thumbs toward the ceiling and lead the raise by pulling the lower shoulder blades down and back.',
      'Do not shrug into the ears or arch the lower back.',
    ],
    contraindications: ['Acute rotator cuff tear in abduction'],
  },
  {
    id: 'serratus_wall_slide_foam_roller',
    name: 'Forearm Wall Slide with Serratus Push-Away',
    mode: 'activate',
    targets: ['serratus_anterior'],
    addressesMuscles: ['Serratus Anterior'],
    stage: ['subacute', 'chronic'],
    equipment: 'Wall and optional mini-band or foam roller',
    dose: '3 sets × 10 reps',
    cues: [
      'Rest forearms on the wall with elbows at 90 degrees.',
      'Gently push your chest away from the wall to wrap the shoulder blades around the ribcage.',
      'Slide forearms upward while maintaining constant forward pressure into the wall.',
    ],
    contraindications: ['Severe subacromial bursitis during overhead reach'],
  },
  {
    id: 'side_lying_external_rotation',
    name: 'Side-Lying Infraspinatus / Rotator Cuff External Rotation',
    mode: 'strengthen',
    targets: ['rotator_cuff'],
    addressesMuscles: ['Rotator Cuff Complex'],
    stage: ['acute', 'subacute', 'chronic'],
    equipment: 'Light dumbbell (1-3 kg) or light band',
    dose: '3 sets × 15 reps (2-second eccentric descent)',
    cues: [
      'Lie on your unaffected side with a rolled towel under the working elbow.',
      'Keep elbow pinned at 90 degrees of flexion at your side.',
      'Rotate forearm upward toward ceiling, pause for 1 second, then lower with control.',
    ],
    contraindications: ['Full thickness infraspinatus rupture'],
  },

  // --- Cervical & Posture Prehab/Rehab ---
  {
    id: 'chin_tuck_deep_flexor',
    name: 'Supine Double Chin Axial Neck Elongation',
    mode: 'activate',
    targets: ['deep_neck_flexors'],
    addressesMuscles: ['Deep Cervical Flexors (Longus Colli/Capitis)'],
    stage: ['acute', 'subacute', 'chronic'],
    equipment: 'Floor or rolled towel',
    dose: '3 sets × 10 reps (5-second hold)',
    cues: [
      'Lie supine on the floor with eyes looking straight up.',
      'Gently nod the head as if saying "yes", lengthening the back of the neck toward the floor.',
      'Do NOT jam the chin down with force or lift the head off the floor.',
    ],
    contraindications: ['Acute cervical radiculopathy with radiating arm symptoms'],
  },
  {
    id: 'suboccipital_trigger_release',
    name: 'Suboccipital Base-of-Skull Myofascial Release',
    mode: 'release',
    targets: ['suboccipitals'],
    addressesMuscles: ['Suboccipital Muscle Group'],
    stage: ['acute', 'subacute', 'chronic'],
    equipment: 'Two tennis balls taped together or foam roller',
    dose: '2-3 minutes of diaphragmatic breathing',
    cues: [
      'Rest the base of your skull directly on the massage balls.',
      'Allow the weight of your head to sink into the balls without active pressing.',
      'Take deep belly breaths to encourage neurological relaxation.',
    ],
    contraindications: ['Vertebrobasilar artery insufficiency symptoms (dizziness, nausea)'],
  },

  // --- Forearm & Elbow Prehab/Rehab ---
  {
    id: 'wrist_extensor_eccentric_tyler_twist',
    name: 'Eccentric Wrist Extensor Loading (Tennis Elbow)',
    mode: 'strengthen',
    targets: ['wrist_extensors'],
    addressesMuscles: ['Common Wrist Extensors'],
    stage: ['subacute', 'chronic'],
    equipment: 'Light dumbbell or resistance bar',
    dose: '3 sets × 12 slow eccentric repetitions',
    cues: [
      'Rest forearm on table with wrist hanging over the edge, palm down.',
      'Use the opposite hand to lift the weight up into wrist extension.',
      'Slowly lower the weight downward across a 4-second count using only the injured side.',
    ],
    contraindications: ['Acute tendon tear or calcific tendinitis flare'],
  },
  {
    id: 'wrist_flexor_stretch_mobilize',
    name: 'Prayer Stance Forearm & Carpal Tunnel Mobilization',
    mode: 'lengthen',
    targets: ['wrist_flexors', 'finger_flexors'],
    addressesMuscles: ['Common Wrist Flexors', 'Finger Flexors'],
    stage: ['acute', 'subacute', 'chronic'],
    equipment: 'Bodyweight',
    dose: '3 sets × 25s hold',
    cues: [
      'Place palms together in front of chest with fingers pointing upward.',
      'Slowly lower hands while keeping palm bases connected until a gentle stretch is felt in the forearms.',
      'Breathe deeply; release immediately if numbness or tingling is provoked.',
    ],
    contraindications: ['Acute carpal tunnel syndrome with progressive sensory deficit'],
  },
];

export function assessClient(input: {
  findings: string[];
  symptomRegions: string[];
  painLevel: number;
  redFlagAnswers: Record<string, boolean>;
}): AssessmentResult {
  const { findings, symptomRegions, painLevel, redFlagAnswers } = input;

  // 1. Red Flags Triage
  const triggeredFlags = RED_FLAGS.filter((f) => redFlagAnswers[f.id] === true);
  if (triggeredFlags.length > 0) {
    const isEmergency = triggeredFlags.some((f) => f.urgency === 'emergency');
    return {
      safe: false,
      redFlags: {
        clear: false,
        emergency: isEmergency,
        triggered: triggeredFlags,
        action: isEmergency
          ? 'URGENT MEDICAL TRIAGE: Please seek emergency medical care immediately. Do NOT perform exercise, stretching, or joint loading.'
          : 'MEDICAL REFERRAL ADVISED: Reported indicators fall outside the scope of personal training and coaching. Please consult a qualified medical physician or physical therapist for medical clearance before starting exercise.',
      },
      painLevel,
      hypotheses: [],
      imbalancePairs: [],
      disclaimer: 'Assessment halted for safety. Red-flag findings take precedence over automated corrective exercise programming.',
    };
  }

  // 2. Accumulate Evidence
  const evidenceMap = new Map<string, {
    muscleId: string;
    state: 'short' | 'weak';
    score: number;
    reasons: Array<{ source: string; because: string; weight: number }>;
  }>();

  const addEvidence = (muscleId: string, state: 'short' | 'weak', weight: number, because: string, source: string) => {
    const key = `${muscleId}:${state}`;
    if (!evidenceMap.has(key)) {
      evidenceMap.set(key, { muscleId, state, score: 0, reasons: [] });
    }
    const item = evidenceMap.get(key)!;
    item.score += weight;
    item.reasons.push({ source, because, weight });
  };

  for (const findingId of findings) {
    const screen = SCREENS.find((s) => s.id === findingId);
    if (!screen) continue;
    for (const imp of screen.implies) {
      addEvidence(imp.muscle, imp.state, imp.weight, imp.because, screen.name);
    }
  }

  // Add symptom regions
  for (const region of symptomRegions) {
    const candidates = SYMPTOM_REGIONS[region.toLowerCase()] || [];
    for (const mId of candidates) {
      const meta = ANATOMY_METRIC_MAP[mId];
      if (!meta) continue;
      const state = meta.tendency === 'tonic' ? 'short' : 'weak';
      addEvidence(
        mId,
        state,
        1,
        `Reported symptoms in the ${region}, a frequent referral and load-sharing zone for this structure.`,
        `Reported Area: ${region}`
      );
    }
  }

  // 3. Format Hypotheses
  const hypotheses: MuscleHypothesis[] = Array.from(evidenceMap.values())
    .map((e) => {
      const meta = ANATOMY_METRIC_MAP[e.muscleId] || {
        name: e.muscleId.replace(/_/g, ' '),
        region: 'General',
        tendency: 'tonic',
        antagonists: [],
        meshKeywords: [e.muscleId],
        notes: '',
      };

      const confidence = Math.min(88, Math.round((1 - Math.exp(-e.score / 4)) * 88));
      const confidenceLabel: 'moderate' | 'low-moderate' | 'low' =
        confidence >= 60 ? 'moderate' : confidence >= 35 ? 'low-moderate' : 'low';

      return {
        muscle: meta.name,
        muscleId: e.muscleId,
        region: meta.region,
        state: e.state,
        stateLabel: e.state === 'short' ? 'Likely Short / Overactive (Tonic)' : 'Likely Inhibited / Weak (Phasic)',
        score: e.score,
        confidence,
        confidenceLabel,
        reasons: e.reasons,
        note: meta.notes,
      };
    })
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence);

  // 4. Find Imbalance Pairs
  const imbalancePairs: ImbalancePair[] = [];
  const seenPairKeys = new Set<string>();

  for (const h of hypotheses) {
    const meta = ANATOMY_METRIC_MAP[h.muscleId];
    if (!meta || !meta.antagonists) continue;

    for (const antId of meta.antagonists) {
      const opposing = hypotheses.find((x) => x.muscleId === antId);
      if (!opposing || opposing.state === h.state) continue;

      const key = [h.muscleId, antId].sort().join('::');
      if (seenPairKeys.has(key)) continue;
      seenPairKeys.add(key);

      const shortHypothesis = h.state === 'short' ? h : opposing;
      const weakHypothesis = h.state === 'weak' ? h : opposing;

      imbalancePairs.push({
        short: shortHypothesis.muscle,
        shortId: shortHypothesis.muscleId,
        weak: weakHypothesis.muscle,
        weakId: weakHypothesis.muscleId,
        combinedConfidence: Math.round((shortHypothesis.confidence + weakHypothesis.confidence) / 2),
        explanation: `${shortHypothesis.muscle} demonstrates tonic shortening / overactivity, which reciprocally inhibits ${weakHypothesis.muscle}. Corrective programming must release and lengthen the short side while actively recruiting the inhibited side.`,
      });
    }
  }

  imbalancePairs.sort((a, b) => b.combinedConfidence - a.combinedConfidence);

  // 5. Generate Corrective Plan
  const programStage: 'acute' | 'subacute' | 'chronic' =
    painLevel >= 7 ? 'acute' : painLevel >= 4 ? 'subacute' : 'chronic';

  const selectedExercises: PrescribedExercise[] = [];
  const chosenIds = new Set<string>();

  for (const h of hypotheses.slice(0, 6)) {
    const validModes = h.state === 'short' ? ['release', 'lengthen', 'mobilise'] : ['activate', 'strengthen'];

    const matches = CLINICAL_EXERCISE_DATABASE.filter(
      (ex) =>
        ex.targets.includes(h.muscleId) &&
        validModes.includes(ex.mode) &&
        ex.stage.includes(programStage)
    );

    for (const ex of matches) {
      if (!chosenIds.has(ex.id)) {
        chosenIds.add(ex.id);
        selectedExercises.push(ex);
        if (selectedExercises.length >= 6) break;
      }
    }
    if (selectedExercises.length >= 6) break;
  }

  return {
    safe: true,
    redFlags: {
      clear: true,
      triggered: [],
    },
    painLevel,
    hypotheses,
    imbalancePairs,
    disclaimer:
      'NON-DIAGNOSTIC NOTICE: These observations, movement screens, and 3D kinetic analyses are educational tools for trainers, coaches, and athletes. They are not medical diagnoses, physical therapy prescriptions, or clinical treatments. Always refer clients with red flags or persistent symptoms to a licensed healthcare professional.',
    program: {
      ok: true,
      stage: programStage,
      exercises: selectedExercises,
    },
  };
}

export function getMeshKeywordsForMuscle(muscleId: string): string[] {
  const entry = ANATOMY_METRIC_MAP[muscleId];
  return entry ? entry.meshKeywords : [muscleId];
}

const STORAGE_KEY = 'mobilis_client_assessment_history_v1';

export function saveAssessmentToStorage(result: AssessmentResult, symptomRegions: string[]): AssessmentHistoryItem {
  const item: AssessmentHistoryItem = {
    id: `assess_${Date.now()}`,
    timestamp: new Date().toISOString(),
    painLevel: result.painLevel,
    symptomRegions,
    primaryImbalance: result.imbalancePairs[0] ? `${result.imbalancePairs[0].short} vs ${result.imbalancePairs[0].weak}` : undefined,
    topHypothesesCount: result.hypotheses.length,
    safe: result.safe,
    result,
  };

  try {
    const existing = loadAssessmentHistory();
    const updated = [item, ...existing].slice(0, 20); // Keep last 20
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save assessment to localStorage', err);
  }

  return item;
}

export function loadAssessmentHistory(): AssessmentHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load assessment history', err);
    return [];
  }
}
