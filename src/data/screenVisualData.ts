export interface ScreenVisualMuscle {
  muscleId: string;
  name: string;
  role: 'short' | 'weak';
  effect: string;
}

export interface ScreenVisualGuide {
  id: string;
  title: string;
  category: string;
  bodyRegions: string[];
  cameraAngle: string;
  repsAndTempo: string;
  whatToLookFor: string[];
  flaggedThreshold: string;
  optimalForm: string;
  biomechanicalRootCause: string;
  keyMuscles: ScreenVisualMuscle[];
  coachingCue: string;
  faultBadge: string;
  optimalBadge: string;
}

export const SCREEN_VISUAL_GUIDES: Record<string, ScreenVisualGuide> = {
  overhead_squat_heels: {
    id: 'overhead_squat_heels',
    title: 'Overhead Squat: Heel Elevation & Forward Torso Pitch',
    category: 'Lower Extremity',
    bodyRegions: ['Ankle', 'Knee', 'Hip', 'Thorax'],
    cameraAngle: 'Lateral (Side View) — 90° to the client',
    repsAndTempo: '5 slow repetitions at 3-1-2 tempo (3s descent, 1s hold at bottom)',
    whatToLookFor: [
      'Watch the calcaneus (heel bone) relative to the floor during the descent.',
      'Check if the heels lift off the ground or weight shifts predominantly into the forefoot.',
      'Observe if the torso angle pitches significantly forward past the angle of the tibia (shin).',
      'Look for the client compensating by hyperextending the lumbar spine or cutting depth short.',
    ],
    flaggedThreshold: 'Heel elevates by > 0.5 cm off the deck or client loses heel ground contact before thighs reach parallel.',
    optimalForm: 'Heels remain anchored and flush with the floor throughout the entire movement; torso stays roughly parallel to the shin line.',
    biomechanicalRootCause:
      'Shortness in the triceps surae (soleus and gastrocnemius) restricts talocrural dorsiflexion (closed-chain tibial forward travel over the talus). To descend into depth without falling backward, the kinetic chain compensates by elevating the calcaneus and hinging the torso excessively forward.',
    keyMuscles: [
      {
        muscleId: 'soleus',
        name: 'Soleus',
        role: 'short',
        effect: 'Primary mechanical barrier restricting closed-chain tibial forward excursion.',
      },
      {
        muscleId: 'gastrocnemius',
        name: 'Gastrocnemius',
        role: 'short',
        effect: 'Bi-articular calf muscle; tight Achilles tendon complex forces early heel rise.',
      },
      {
        muscleId: 'tibialis_anterior',
        name: 'Tibialis Anterior',
        role: 'weak',
        effect: 'Inadequate active dorsiflexor pull to counter posterior calf stiffness.',
      },
    ],
    coachingCue: '“Keep your tripod foot (big toe, pinky toe, heel) glued down like wet cement while sitting between your hips.”',
    faultBadge: 'Heels Lift / Torso Pitch',
    optimalBadge: 'Flat Foot / Parallel Torso',
  },

  overhead_squat_knees_in: {
    id: 'overhead_squat_knees_in',
    title: 'Overhead Squat: Knee Valgus Collapse (Knees In)',
    category: 'Lower Extremity',
    bodyRegions: ['Knee', 'Hip', 'Foot'],
    cameraAngle: 'Anterior (Frontal View) — directly in front of client',
    repsAndTempo: '5 repetitions; observe during both descent and turnaround/ascent',
    whatToLookFor: [
      'Observe the patella (kneecap) relative to the second and third toes.',
      'Look for medial displacement (caving inward) of one or both knees during descent or bottom reversal.',
      'Notice if the medial longitudinal arch of the foot collapses (pronation) concurrently with knee caving.',
    ],
    flaggedThreshold: 'Knees migrate medial to the inside edge of the big toe during any phase of the squat.',
    optimalForm: 'Knees track cleanly over the second and third toes with steady frontal plane alignment and stable arches.',
    biomechanicalRootCause:
      'Failure of the hip abductors and external rotators (primarily gluteus medius posterior fibres) to resist the torque of hip flexion, allowing the adductor complex and tensor fasciae latae to internally rotate and adduct the femur.',
    keyMuscles: [
      {
        muscleId: 'gluteus_medius',
        name: 'Gluteus Medius',
        role: 'weak',
        effect: 'Underactive posterior fibres fail to stabilize and externally rotate the femur.',
      },
      {
        muscleId: 'adductor_group',
        name: 'Adductor Complex',
        role: 'short',
        effect: 'Overactive inner thigh muscles actively pull the distal femur toward midline.',
      },
      {
        muscleId: 'tfl',
        name: 'Tensor Fasciae Latae (TFL)',
        role: 'short',
        effect: 'Compensates as a primary hip stabilizer, tightening ITB and driving internal rotation.',
      },
    ],
    coachingCue: '“Screw your feet into the floor and drive your knees outward over your shoelaces.”',
    faultBadge: 'Valgus Caving Inward',
    optimalBadge: 'Knees Tracking 2nd Toe',
  },

  single_leg_pelvic_drop: {
    id: 'single_leg_pelvic_drop',
    title: 'Single-Leg Stance: Pelvic Drop (Trendelenburg Sign)',
    category: 'Lower Extremity',
    bodyRegions: ['Hip', 'Pelvis', 'Core'],
    cameraAngle: 'Posterior or Anterior (Front/Back View) at pelvis height',
    repsAndTempo: 'Hold single-leg balance for 15 seconds per side; perform 2 trials',
    whatToLookFor: [
      'Levelness of the iliac crests (belt line) when unsupported foot leaves the floor.',
      'Notice if the unsupported hip immediately drops below horizontal level.',
      'Check for lateral trunk lean toward the stance leg as an inverted pendulum compensation.',
    ],
    flaggedThreshold: 'Pelvis drops > 5° on the unsupported side, or torso leans laterally over stance leg to prevent falling.',
    optimalForm: 'Pelvis remains level horizontally throughout the 15-second single-leg hold without trunk twisting.',
    biomechanicalRootCause:
      'The stance-leg hip abductor (gluteus medius) lacks isometric strength in the frontal plane to anchor the pelvis to the femoral head, allowing gravity to pull the floating side downward.',
    keyMuscles: [
      {
        muscleId: 'gluteus_medius',
        name: 'Gluteus Medius (Stance Side)',
        role: 'weak',
        effect: 'Fails to exert downward lever force on the ilium to level the pelvic girdle.',
      },
      {
        muscleId: 'quadratus_lumborum',
        name: 'Quadratus Lumborum (Floating Side)',
        role: 'short',
        effect: 'Hyperactive lateral flank hiker substituting for true gluteal stabilization.',
      },
    ],
    coachingCue: '“Stand tall on the right leg, push the floor away, and keep your belt buckle parallel to the ceiling.”',
    faultBadge: 'Trendelenburg Hip Drop',
    optimalBadge: 'Level Pelvic Horizon',
  },

  sit_and_reach_limited: {
    id: 'sit_and_reach_limited',
    title: 'Forward Bend / Toe Touch: Posterior Chain Restriction',
    category: 'Lower Extremity',
    bodyRegions: ['Hip', 'Hamstrings', 'Lumbar Spine'],
    cameraAngle: 'Lateral (Side View)',
    repsAndTempo: '3 smooth forward folds with knees extended and feet touching',
    whatToLookFor: [
      'Examine if the pelvis rotates anteriorly over the femoral heads (hip hinge).',
      'Look for the pelvis getting stuck in posterior tilt with the movement coming entirely from spinal flexion.',
      'Check if the client feels intense tightness or pulling in the upper/mid hamstrings behind the knees.',
    ],
    flaggedThreshold: 'Fingertips fail to reach past mid-shin without bending the knees, or pelvis unable to reach 70° of anterior tilt.',
    optimalForm: 'Smooth hip hinge with pelvis rotating forward over the thighs; fingertips reach ankle level or toes with natural spinal curvature.',
    biomechanicalRootCause:
      'Shortened or hypertonic hamstring complex (semimembranosus, semitendinosus, biceps femoris) mechanically anchors the ischial tuberosities, blocking forward pelvic rotation.',
    keyMuscles: [
      {
        muscleId: 'hamstrings',
        name: 'Hamstring Complex',
        role: 'short',
        effect: 'Tension locks the pelvis in posterior orientation, overloading the lumbar spine.',
      },
      {
        muscleId: 'gastrocnemius',
        name: 'Gastrocnemius',
        role: 'short',
        effect: 'Continuous superficial back line fascial tension restricts distal chain excursion.',
      },
    ],
    coachingCue: '“Reach your sit-bones up toward the back corner of the room while hinging at the hips.”',
    faultBadge: 'Hamstring Block / Lumbar Flexion',
    optimalBadge: 'Smooth Hip Hinge to Toes',
  },

  anterior_pelvic_tilt: {
    id: 'anterior_pelvic_tilt',
    title: 'Static Posture: Anterior Pelvic Tilt (Lower Crossed Pattern)',
    category: 'Lumbo-Pelvic & Core',
    bodyRegions: ['Low Back', 'Hip', 'Abdominals'],
    cameraAngle: 'Sagittal (Side View) in natural relaxed standing posture',
    repsAndTempo: 'Observe static resting stance for 10-15 seconds from both sides',
    whatToLookFor: [
      'Compare height of the anterior superior iliac spine (ASIS) to posterior superior iliac spine (PSIS).',
      'Look for deep lumbar lordosis (excessive lower back arch) with protruding abdomen.',
      'Check for hyperextended knees (genu recurvatum) paired with the forward pelvic tilt.',
    ],
    flaggedThreshold: 'ASIS is more than 15mm lower than PSIS, creating a visibly exaggerated hollow in the lower back.',
    optimalForm: 'ASIS and PSIS are roughly within 5-8mm of horizontal alignment; neutral lumbar curve with engaged core.',
    biomechanicalRootCause:
      'Janda Lower Crossed Syndrome: tonic hyperactive hip flexors (iliopsoas, rectus femoris) and lumbar extensors (erector spinae) pull the pelvis forward and down, while reciprocally inhibiting the gluteus maximus and deep abdominals.',
    keyMuscles: [
      {
        muscleId: 'iliopsoas',
        name: 'Iliopsoas',
        role: 'short',
        effect: 'Originates on lumbar spine and inserts on lesser trochanter; pulls pelvis forward.',
      },
      {
        muscleId: 'erector_spinae',
        name: 'Erector Spinae (Lumbar)',
        role: 'short',
        effect: 'Shortened spinal extensors lock lumbar vertebrae into hyperextension.',
      },
      {
        muscleId: 'gluteus_maximus',
        name: 'Gluteus Maximus',
        role: 'weak',
        effect: 'Inhibited by overactive hip flexors, leaving hip extension power dormant.',
      },
      {
        muscleId: 'transversus_abdominis',
        name: 'Transversus Abdominis',
        role: 'weak',
        effect: 'Lacks resting intra-abdominal tone, allowing the anterior abdominal wall to distend.',
      },
    ],
    coachingCue: '“Gently zip your belt buckle up toward your belly button and softly squeeze your glutes.”',
    faultBadge: 'Anterior Tilt & Hyper-Lordosis',
    optimalBadge: 'Neutral Pelvis & Spine',
  },

  thomas_test_positive: {
    id: 'thomas_test_positive',
    title: 'Modified Thomas Test: Elevated Thigh / Hip Flexor Tightness',
    category: 'Lumbo-Pelvic & Core',
    bodyRegions: ['Hip', 'Low Back', 'Thigh'],
    cameraAngle: 'Lateral (Side View) at table edge level',
    repsAndTempo: 'Perform on both right and left legs; client holds opposite knee firmly against chest',
    whatToLookFor: [
      'Does the posterior thigh of the test leg rest flat against the treatment table or bed?',
      'Does the test knee hang bent at 90° or does it kick forward into extension?',
      'Does the thigh abduct outward away from midline as it hangs off the table?',
    ],
    flaggedThreshold: 'Test thigh remains elevated above horizontal (table plane), indicating hip flexor contracture.',
    optimalForm: 'Posterior thigh rests completely flat on the table while knee remains naturally flexed to approximately 80-90°.',
    biomechanicalRootCause:
      'Severe contracture of the iliopsoas (if thigh remains elevated above table) or rectus femoris (if knee extends outward when pressing thigh down), preventing full 0° hip extension.',
    keyMuscles: [
      {
        muscleId: 'iliopsoas',
        name: 'Iliopsoas',
        role: 'short',
        effect: 'Deep hip flexor tightness blocks hip from extending to neutral 0° line.',
      },
      {
        muscleId: 'rectus_femoris',
        name: 'Rectus Femoris',
        role: 'short',
        effect: 'Bi-articular quadricep muscle pulls knee into extension when hip is held neutral.',
      },
    ],
    coachingCue: '“Let the hanging leg relax completely like a heavy pendulum while keeping the other knee hugging your ribs.”',
    faultBadge: 'Thigh Elevated Off Table',
    optimalBadge: 'Thigh Flat on Table Surface',
  },

  prone_hip_extension_hamstring_first: {
    id: 'prone_hip_extension_hamstring_first',
    title: 'Prone Hip Extension: Altered Firing Order (Hamstring First)',
    category: 'Lumbo-Pelvic & Core',
    bodyRegions: ['Glute', 'Hamstring', 'Low Back'],
    cameraAngle: 'Lateral or Palpatory View while client lies prone on mat',
    repsAndTempo: '3 slow straight-leg raises per leg while lightly palpating glute and hamstring',
    whatToLookFor: [
      'Observe or feel the sequence of muscle contraction as the leg lifts off the mat.',
      'Check if the hamstring or contralateral lower back muscles contract before the gluteus maximus.',
      'Look for the client hiking the pelvis or extending the lumbar spine before the hip actually moves.',
    ],
    flaggedThreshold: 'Hamstrings or lumbar erectors fire distinctly prior to gluteus maximus contraction during hip extension.',
    optimalForm: 'Gluteus maximus fires first, followed smoothly by the ipsilateral hamstrings and contralateral lumbar stabilizers.',
    biomechanicalRootCause:
      'Altered motor control & synergistic dominance: due to dormant glute activation, the hamstring and lumbar extensors compensate by taking over the workload of hip extension, leading to hamstring strains and low back fatigue.',
    keyMuscles: [
      {
        muscleId: 'gluteus_maximus',
        name: 'Gluteus Maximus',
        role: 'weak',
        effect: 'Delayed neuromuscular recruitment; fails to initiate primary hip extension force.',
      },
      {
        muscleId: 'hamstrings',
        name: 'Hamstring Complex',
        role: 'short',
        effect: 'Overused synergist that prematurely cramps or tightens under hip extension loading.',
      },
      {
        muscleId: 'erector_spinae',
        name: 'Erector Spinae',
        role: 'short',
        effect: 'Substitutes lumbar hyperextension for true coxofemoral joint extension.',
      },
    ],
    coachingCue: '“Squeeze your glute first like you are holding a coin between your cheeks, then float the leg 2 inches.”',
    faultBadge: 'Hamstring/Back Dominant',
    optimalBadge: 'Glute-Initiated Extension',
  },

  overhead_squat_arms_fall: {
    id: 'overhead_squat_arms_fall',
    title: 'Overhead Squat: Arms Fall Forward Out of Vertical Alignment',
    category: 'Scapulo-Thoracic',
    bodyRegions: ['Shoulder', 'Upper Back', 'Lats'],
    cameraAngle: 'Lateral (Side View) aligned with client’s ear and shoulder',
    repsAndTempo: '5 overhead squats holding a lightweight dowel or hands raised overhead',
    whatToLookFor: [
      'Watch the angle of the arms relative to the torso during the descent.',
      'Look for the arms pitching forward past the ears, breaking the vertical alignment with the spine.',
      'Check if the elbows bend or shoulders internally rotate to compensate.',
    ],
    flaggedThreshold: 'Arms fall forward past the coronal plane of the head/ears by more than 15° during the descent.',
    optimalForm: 'Arms remain locked overhead in line with the torso throughout the entire range of motion.',
    biomechanicalRootCause:
      'Restricted latissimus dorsi, pectoralis major/minor, and teres major limit glenohumeral flexion and upward scapular rotation, combined with weak lower trapezius and rhomboids unable to maintain thoracic extension.',
    keyMuscles: [
      {
        muscleId: 'latissimus_dorsi',
        name: 'Latissimus Dorsi',
        role: 'short',
        effect: 'Internal rotator and extensor of humerus; when tight, anchors arms forward.',
      },
      {
        muscleId: 'pectoralis_minor',
        name: 'Pectoralis Minor',
        role: 'short',
        effect: 'Anteriorly tilts the scapula, physically blocking upward rotation.',
      },
      {
        muscleId: 'lower_trapezius',
        name: 'Lower Trapezius',
        role: 'weak',
        effect: 'Underactive scapular depressor; cannot lock scapulae downward and back.',
      },
    ],
    coachingCue: '“Keep your knuckles reaching for the sky behind your ears as you sink into your hips.”',
    faultBadge: 'Arms Pitching Forward',
    optimalBadge: 'Arms Inline with Spine',
  },

  rounded_shoulders: {
    id: 'rounded_shoulders',
    title: 'Relaxed Stance: Rounded Shoulders & Internal Arm Rotation',
    category: 'Scapulo-Thoracic',
    bodyRegions: ['Shoulder', 'Chest', 'Upper Back'],
    cameraAngle: 'Lateral and Frontal View in normal resting standing posture',
    repsAndTempo: 'Observe natural standing posture after client takes 3 natural steps in place',
    whatToLookFor: [
      'Look at the acromion process relative to the plumb line of the ear canal.',
      'Check hand orientation: do the thumbs point inward toward the thighs or backward (showing backs of hands)?',
      'Look for protracted, flared shoulder blades (winging anteriorly).',
    ],
    flaggedThreshold: 'Shoulder joint sits anterior to the ear plumb line and hands show dorsal knuckles facing forward at rest.',
    optimalForm: 'Acromion aligns directly under the earlobe; thumbs point straight forward with chest open.',
    biomechanicalRootCause:
      'Upper Crossed Syndrome: chronic desk/sitting posture causes shortening of the anterior chest wall (pectoralis minor & major), which pulls the coracoid process forward and down while overstretching and weakening rhomboids and lower trapezius.',
    keyMuscles: [
      {
        muscleId: 'pectoralis_minor',
        name: 'Pectoralis Minor',
        role: 'short',
        effect: 'Pulls the scapula into protraction and anterior tilt.',
      },
      {
        muscleId: 'pectoralis_major',
        name: 'Pectoralis Major',
        role: 'short',
        effect: 'Internally rotates the humerus, turning thumbs inward.',
      },
      {
        muscleId: 'rhomboids',
        name: 'Rhomboids',
        role: 'weak',
        effect: 'Chronically overstretched and inhibited; fails to retract scapulae.',
      },
      {
        muscleId: 'lower_trapezius',
        name: 'Lower Trapezius',
        role: 'weak',
        effect: 'Inhibited scapular anchor; allows shoulder girdle to hike and round.',
      },
    ],
    coachingCue: '“Roll your collarbones wide like a coat hanger and rotate your thumbs forward.”',
    faultBadge: 'Protracted Shoulders / Knuckles Forward',
    optimalBadge: 'Open Chest / Thumbs Forward',
  },

  scapular_winging: {
    id: 'scapular_winging',
    title: 'Wall Press / Push-Up: Scapular Winging (Medial Border Lift)',
    category: 'Scapulo-Thoracic',
    bodyRegions: ['Scapula', 'Upper Back', 'Ribcage'],
    cameraAngle: 'Posterior-Oblique (Rear 45° Angle) looking at the thoracic cage',
    repsAndTempo: '5 slow wall push-ups or floor push-ups with 3-second descent',
    whatToLookFor: [
      'Watch the medial border and inferior angle of the scapula as the client pushes away from the wall/floor.',
      'Look for the shoulder blade lifting off the ribcage like an angel wing.',
      'Notice any instability or shuddering in the shoulder blade during pressing.',
    ],
    flaggedThreshold: 'Medial border of the scapula lifts > 1cm away from the posterior ribcage during eccentric or concentric push.',
    optimalForm: 'Scapula remains flat and flush against the thoracic wall throughout the entire push and lockout range.',
    biomechanicalRootCause:
      'Weakness or inhibition of the serratus anterior (and lower trapezius force couple), which is the primary muscle responsible for protracting and holding the scapula firmly against the contour of the ribcage.',
    keyMuscles: [
      {
        muscleId: 'serratus_anterior',
        name: 'Serratus Anterior',
        role: 'weak',
        effect: 'Primary anchor pinning medial scapula to thoracic cage; insufficiency causes winging.',
      },
      {
        muscleId: 'lower_trapezius',
        name: 'Lower Trapezius',
        role: 'weak',
        effect: 'Synergistic stabilizer in upward rotation and posterior tilt.',
      },
    ],
    coachingCue: '“Push the wall away from your chest and wrap your armpits forward around your ribs.”',
    faultBadge: 'Scapular Winging Off Ribcage',
    optimalBadge: 'Scapula Glued Flush to Ribs',
  },

  painful_arc: {
    id: 'painful_arc',
    title: 'Painful Arc: Shoulder Discomfort Between 60° and 120°',
    category: 'Scapulo-Thoracic',
    bodyRegions: ['Shoulder', 'Rotator Cuff'],
    cameraAngle: 'Anterior (Frontal View)',
    repsAndTempo: 'Slowly raise straight arm out to the side overhead (coronal plane abduction)',
    whatToLookFor: [
      'Ask the client to note if sharp pinching or pain arises specifically between 60° and 120° of arm abduction.',
      'Observe if the pain subsides once the arm passes 120° overhead.',
      'Check if client winces or alters scapular mechanics to bypass the painful window.',
    ],
    flaggedThreshold: 'Clear pain or pinching reproduced between 60° and 120° of abduction that eases above 120°.',
    optimalForm: 'Smooth, pain-free abduction through the full 180° arc with seamless humerothoracic rhythm.',
    biomechanicalRootCause:
      'Subacromial impingement: the supraspinatus tendon or subacromial bursa becomes compressed under the coracoacromial arch during mid-range abduction, usually caused by poor humeral head depression by the infraspinatus/subscapularis or lack of acromial upward rotation.',
    keyMuscles: [
      {
        muscleId: 'rotator_cuff',
        name: 'Rotator Cuff (Infraspinatus / Supraspinatus)',
        role: 'weak',
        effect: 'Fails to depress and center the humeral head in the glenoid during abduction.',
      },
      {
        muscleId: 'pectoralis_minor',
        name: 'Pectoralis Minor',
        role: 'short',
        effect: 'Anteriorly tilts the acromion, narrowing the subacromial space.',
      },
      {
        muscleId: 'lower_trapezius',
        name: 'Lower Trapezius',
        role: 'weak',
        effect: 'Fails to upwardly rotate the acromion out of the path of the greater tubercle.',
      },
    ],
    coachingCue: '“Reach out long to the walls as you lift, creating space inside your shoulder joint.”',
    faultBadge: 'Impingement Arc (60°-120°)',
    optimalBadge: 'Smooth 180° Pain-Free Arc',
  },

  shrug_on_arm_raise: {
    id: 'shrug_on_arm_raise',
    title: 'Shoulder Hitch: Early Clavicular Hike During Arm Elevation',
    category: 'Scapulo-Thoracic',
    bodyRegions: ['Shoulder', 'Neck', 'Trapezius'],
    cameraAngle: 'Anterior (Frontal View)',
    repsAndTempo: 'Raise straight arms out to the side to 90° abduction (3 repetitions)',
    whatToLookFor: [
      'Observe the upper trapezius and clavicle as the arm starts lifting.',
      'Look for the shoulder hiking upward toward the ear in the first 30-60° of movement.',
      'Check if the client tilts their neck toward the working side.',
    ],
    flaggedThreshold: 'Noticeable shoulder girdle elevation occurs before the arm reaches 60° of abduction.',
    optimalForm: 'Scapula stabilizes downward and outwardly rotates smoothly; no shrugging occurs before 90°.',
    biomechanicalRootCause:
      'Overactive upper trapezius and levator scapulae substituting for weak deltoid/supraspinatus force initiation and deficient lower trapezius/serratus scapular depression.',
    keyMuscles: [
      {
        muscleId: 'upper_trapezius',
        name: 'Upper Trapezius',
        role: 'short',
        effect: 'Hyperactive elevator jumping in early to substitute for arm abduction.',
      },
      {
        muscleId: 'lower_trapezius',
        name: 'Lower Trapezius',
        role: 'weak',
        effect: 'Fails to provide downward anchoring counter-torque on the scapular spine.',
      },
      {
        muscleId: 'deltoid',
        name: 'Deltoid / Supraspinatus',
        role: 'weak',
        effect: 'Weak active abduction forces compensatory upper girdle hiking.',
      },
    ],
    coachingCue: '“Keep a long, proud neck and slide your shoulder blades down into your back pockets as you lift.”',
    faultBadge: 'Early Shoulder Shrug',
    optimalBadge: 'Depressed Scapula / Pure Abduction',
  },

  forward_head: {
    id: 'forward_head',
    title: 'Side Posture: Forward Head Posture (Cervical Protraction)',
    category: 'Cervical & Head',
    bodyRegions: ['Neck', 'Upper Back', 'Cervical Spine'],
    cameraAngle: 'Sagittal (Side View) in natural relaxed standing posture',
    repsAndTempo: 'Observe natural resting standing profile for 10 seconds',
    whatToLookFor: [
      'Compare the vertical plumb line of the external auditory meatus (ear canal) to the acromion tip.',
      'Look for the head projecting forward like a crane, accompanied by chin jutting upward.',
      'Check for a pronounced hunch or hump at the cervico-thoracic junction (C7-T1).',
    ],
    flaggedThreshold: 'Ear canal sits more than 2.5 cm (1 inch) forward of the middle of the acromion shoulder line.',
    optimalForm: 'Ear canal sits vertically stacked directly above the acromion process and lateral hip joint.',
    biomechanicalRootCause:
      'Upper cervical hyperextension paired with lower cervical flexion: chronically shortened suboccipitals, sternocleidomastoid, and upper trapezius pull the skull forward, while the deep neck flexors (longus colli, longus capitis) become inhibited.',
    keyMuscles: [
      {
        muscleId: 'suboccipitals',
        name: 'Suboccipitals',
        role: 'short',
        effect: 'Tonic contraction at base of skull tilts the chin up to maintain horizontal vision.',
      },
      {
        muscleId: 'deep_neck_flexors',
        name: 'Deep Neck Flexors (Longus Colli/Capitis)',
        role: 'weak',
        effect: 'Underactive deep stabilizers fail to maintain neutral cervical lordosis.',
      },
      {
        muscleId: 'upper_trapezius',
        name: 'Upper Trapezius & Levator Scapulae',
        role: 'short',
        effect: 'Bear excessive continuous tensile load supporting the forward cantilevered skull.',
      },
    ],
    coachingCue: '“Gently draw your chin straight back as if making a double chin, lengthening the crown of your head to the ceiling.”',
    faultBadge: 'Forward Head Cantilever',
    optimalBadge: 'Stacked Ear-Over-Shoulder',
  },

  neck_rotation_limited: {
    id: 'neck_rotation_limited',
    title: 'Cervical Rotation: Asymmetry or Restricted Range of Motion',
    category: 'Cervical & Head',
    bodyRegions: ['Neck', 'Cervical Spine'],
    cameraAngle: 'Anterior (Frontal View) or Superior (Bird’s Eye View)',
    repsAndTempo: 'Rotate head smoothly to left shoulder, hold 2s, then to right shoulder',
    whatToLookFor: [
      'Check if the chin can reach within 1 finger-width of the clavicle (collarbone) on both sides.',
      'Look for visible asymmetry between left and right turning capacity.',
      'Notice if the client tilts their head or hikes a shoulder to fake rotation.',
    ],
    flaggedThreshold: 'Rotation is less than 75° (chin cannot reach collarbone) or there is a > 15° asymmetry between sides.',
    optimalForm: 'Chin reaches cleanly to collarbone line (80-90° of smooth rotation) without pain, hitching, or lateral tilt.',
    biomechanicalRootCause:
      'Unilateral hypertonicity and fascial restrictions in the contralateral sternocleidomastoid, ipsilateral splenius capitis/cervicis, and levator scapulae blocking atlantoaxial and lower cervical facet joint gliding.',
    keyMuscles: [
      {
        muscleId: 'sternocleidomastoid',
        name: 'Sternocleidomastoid (SCM)',
        role: 'short',
        effect: 'Contralateral rotator restriction blocks full excursion.',
      },
      {
        muscleId: 'levator_scapulae',
        name: 'Levator Scapulae',
        role: 'short',
        effect: 'Tension restricts combined cervical rotation and lateral flexion mechanics.',
      },
    ],
    coachingCue: '“Keep your shoulders still and glide your gaze over your collarbone without letting your head tip.”',
    faultBadge: 'Restricted Turning (<75°)',
    optimalBadge: 'Full 85°-90° Symmetrical Turn',
  },

  chest_breathing: {
    id: 'chest_breathing',
    title: 'Apical Breathing: Vertical Chest & Shoulder Heave',
    category: 'Cervical & Head',
    bodyRegions: ['Neck', 'Ribcage', 'Core'],
    cameraAngle: 'Anterior / 45° Angle during quiet, uncoached breathing',
    repsAndTempo: 'Observe 5 natural respiratory cycles at rest with one hand on chest, one on lower ribs',
    whatToLookFor: [
      'Watch which hand moves first: the upper chest hand or the lower rib hand.',
      'Look for the clavicles and shoulder tops rising vertically toward the ears during inhalation.',
      'Notice tense neck muscles (scalenes, SCM) visibly flexing with each breath.',
    ],
    flaggedThreshold: 'Upper chest and shoulder girdle move vertically on inhale while lower lateral ribs remain stationary.',
    optimalForm: 'Inhale produces 360° circumferential lateral ribcage expansion into the belly and flanks; neck remains soft.',
    biomechanicalRootCause:
      'Accessory respiratory muscles (scalenes, sternocleidomastoid, pectoralis minor) are overactive as primary breath inducers, caused by poor diaphragmatic excursion and restricted lower thoracic mobility.',
    keyMuscles: [
      {
        muscleId: 'scalenes',
        name: 'Scalene Group',
        role: 'short',
        effect: 'Overworked lifting 1st and 2nd ribs during every resting breath (20,000 times/day).',
      },
      {
        muscleId: 'transversus_abdominis',
        name: 'Transversus Abdominis',
        role: 'weak',
        effect: 'Poor deep core pressure regulation disrupts natural respiratory diaphragm coupling.',
      },
    ],
    coachingCue: '“Breathe wide into your lower belt line and back ribs, keeping your neck and collarbones completely silent.”',
    faultBadge: 'Vertical Neck Heave',
    optimalBadge: '360° Lateral Expansion',
  },

  lateral_elbow_pain_gripping: {
    id: 'lateral_elbow_pain_gripping',
    title: 'Elbow Strain: Outer Elbow Soreness with Gripping & Typing',
    category: 'Upper Extremity',
    bodyRegions: ['Elbow', 'Forearm', 'Wrist'],
    cameraAngle: 'Lateral Forearm View during resisted wrist extension or gripping',
    repsAndTempo: 'Test wrist extension against gentle manual resistance or pick up a loaded mug/kettle',
    whatToLookFor: [
      'Check for localized tenderness 1-2 cm distal to the lateral epicondyle.',
      'Ask if pain is provoked when extending the wrist against resistance with the elbow straight.',
      'Observe if gripping tools, tennis rackets, or keyboard use sparks burning ache.',
    ],
    flaggedThreshold: 'Discomfort or noticeable weakness provoked by resisted middle finger or wrist extension.',
    optimalForm: 'Pain-free full wrist extension under load; comfortable firm grip with relaxed forearm tendons.',
    biomechanicalRootCause:
      'Lateral epicondylopathy (tennis elbow overload): repetitive eccentric wrist extensor loading without sufficient capacity in the extensor carpi radialis brevis (ECRB) tendon, compounded by a tight supinator muscle.',
    keyMuscles: [
      {
        muscleId: 'wrist_extensors',
        name: 'Wrist Extensors (ECRB / ECRL)',
        role: 'weak',
        effect: 'Tendon capacity is exceeded by repetitive daily gripping and keyboard demand.',
      },
      {
        muscleId: 'supinator',
        name: 'Supinator',
        role: 'short',
        effect: 'Shares lateral epicondylar origin and places sustained mechanical traction on the zone.',
      },
    ],
    coachingCue: '“Keep your wrist neutral when gripping; do not let your wrist collapse into cocked-back positions.”',
    faultBadge: 'Lateral Tendon Overload',
    optimalBadge: 'Balanced Pain-Free Gripping',
  },

  medial_elbow_pain_gripping: {
    id: 'medial_elbow_pain_gripping',
    title: 'Golfer’s Elbow: Inner Elbow Soreness with Wrist Flexion',
    category: 'Upper Extremity',
    bodyRegions: ['Elbow', 'Forearm', 'Wrist'],
    cameraAngle: 'Medial Forearm View during resisted wrist flexion with palm upward',
    repsAndTempo: 'Resist wrist flexion with forearm supinated (palm up) and elbow extended',
    whatToLookFor: [
      'Check for tenderness right on or slightly distal to the medial epicondyle (funny bone side).',
      'Ask if carrying groceries with palms facing forward or pulling on a barbell provokes sharp ache.',
      'Observe if prolonged mouse work with forearm pronated causes medial elbow fatigue.',
    ],
    flaggedThreshold: 'Localized tenderness or weakness during resisted wrist flexion or pronation.',
    optimalForm: 'Pain-free wrist flexion and forearm pronation under full working load.',
    biomechanicalRootCause:
      'Medial epicondylopathy: load intolerance at the common flexor tendon origin (flexor carpi radialis, pronator teres) from repetitive wrist flexion and pronation overload.',
    keyMuscles: [
      {
        muscleId: 'wrist_flexors',
        name: 'Wrist Flexors (FCR / FCU)',
        role: 'weak',
        effect: 'Common flexor tendon lacks tensile capacity for repeated traction loads.',
      },
      {
        muscleId: 'pronators',
        name: 'Pronator Teres',
        role: 'short',
        effect: 'Sustains continuous shortened contraction during keyboard typing and desk setups.',
      },
    ],
    coachingCue: '“Distribute pulling loads through your whole arm and back rather than curling with your wrists.”',
    faultBadge: 'Medial Epicondyle Stress',
    optimalBadge: 'Conditioned Flexor Mass',
  },

  grip_fatigue_desk: {
    id: 'grip_fatigue_desk',
    title: 'Forearm Cramping: Rapid Fatigue from Keyboard & Mouse',
    category: 'Upper Extremity',
    bodyRegions: ['Forearm', 'Wrist', 'Hand'],
    cameraAngle: 'Dorsal and Palmar Forearm View in active workstation posture',
    repsAndTempo: 'Assess forearm endurance: 30 seconds of rapid finger flexion/extension repetitions',
    whatToLookFor: [
      'Look for forearm flexor tightness, aching, or cramping after desk work or keyboard sessions.',
      'Check for loss of wrist extensor endurance: does the wrist drop into flexion during typing?',
      'Check for stiffness when trying to open fingers flat after gripping.',
    ],
    flaggedThreshold: 'Rapid fatigue, aching, or muscle stiffness within 30 seconds of finger movement or normal desk work.',
    optimalForm: 'Smooth, untroubled finger dexterity with balanced endurance between flexors and extensors.',
    biomechanicalRootCause:
      'Muscle imbalance from continuous static isometric contractions of deep finger flexors without antagonist extensor recruitment, creating ischemic trigger points and shortened fascial compartments.',
    keyMuscles: [
      {
        muscleId: 'finger_flexors',
        name: 'Finger Flexors (FDS / FDP)',
        role: 'short',
        effect: 'Sustained shortening from continuous key presses and mouse clutching.',
      },
      {
        muscleId: 'finger_extensors',
        name: 'Finger Extensors (Extensor Digitorum)',
        role: 'weak',
        effect: 'Neglected antagonist group lacking endurance to support neutral wrist posture.',
      },
    ],
    coachingCue: '“Take hourly micro-breaks to splay your fingers wide and open your palms to the sky.”',
    faultBadge: 'Flexor Cramping / Extensor Fatigue',
    optimalBadge: 'Balanced Forearm Endurance',
  },
};
