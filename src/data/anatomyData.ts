export interface AnatomyMetadata {
  commonName: string;
  latinName: string;
  system: 'Skeletal' | 'Muscular' | 'Articular' | 'Nervous';
  layer: number; // 0: Bone, 1: Deep, 2: Intermediate, 3: Superficial
  origin?: string;
  insertion?: string;
  actions?: string[];
  innervation?: string;
  clinicalRelevance: string;
  aliases?: string[];
  relatedStructures?: string[];
  exercises?: string[];
}

export function normalizeAnatomyKey(rawName: string): string {
  if (!rawName) return '';
  let name = rawName.toLowerCase();
  
  // Strip bone__ prefix (specific to this model's exporter)
  name = name.replace(/^bone__/, '');
  
  // Strip trailing numbers like .001, _01, .002
  name = name.replace(/\.\d+$/, '').replace(/_\d+$/, '');
  
  // Strip left/right indicators
  name = name.replace(/[._][lr]$/, '');
  name = name.replace(/__[lr]$/, '');
  name = name.replace(/\b(left|right)\b/g, '');
  
  // Strip filler anatomical terms that might be inconsistently applied
  name = name.replace(/\b(musclel?s?|musculus|bones?|os|nerves?|nervus|ligaments?)\b/g, '');
  
  // Normalize spaces, hyphens, and multiple underscores into a single underscore
  name = name.trim().replace(/[\s\-.]+/g, '_').replace(/_+/g, '_');
  
  // Trim leading/trailing underscores
  name = name.replace(/_$/, '').replace(/^_/, '');
  
  return name;
}

export function getAnatomyData(rawName: string): AnatomyMetadata | null {
  if (!rawName) return null;

  // 1. Clean string: remove underscores, numbers, and extra spaces
  const clean = rawName
    .toLowerCase()
    .replace(/[-_.]/g, ' ')
    .replace(/\b(left|right|l|r|\d+)\b/g, '')
    .trim();

  // 2. Direct key check
  if (anatomyRegistry[rawName]) return anatomyRegistry[rawName];
  if (anatomyRegistry[clean]) return anatomyRegistry[clean];

  // 3. Search through registry keys, aliases, and common names
  const matchedKey = Object.entries(anatomyRegistry).find(([key, meta]) => {
    const simplifiedKey = key.toLowerCase().replace(/[-_.]/g, ' ');
    if (clean.includes(simplifiedKey) || simplifiedKey.includes(clean)) return true;
    
    if (meta.commonName) {
      const simplifiedCommon = meta.commonName.toLowerCase().replace(/[-_.]/g, ' ');
      if (clean.includes(simplifiedCommon) || simplifiedCommon.includes(clean)) return true;
    }
    
    if (meta.aliases) {
      for (const alias of meta.aliases) {
        const simplifiedAlias = alias.toLowerCase().replace(/[-_.]/g, ' ');
        if (clean.includes(simplifiedAlias) || simplifiedAlias.includes(clean)) return true;
      }
    }
    
    return false;
  });

  if (matchedKey) return matchedKey[1];

  return null;
}

export const anatomyRegistry: Record<string, AnatomyMetadata> = {
  // ==========================================
  // SKELETAL SYSTEM (Layer 0)
  // ==========================================
  femur: {
    commonName: 'Femur',
    latinName: 'Os femoris',
    system: 'Skeletal',
    layer: 0,
    clinicalRelevance: 'The longest and strongest bone in the human body. Femoral neck fractures are common in osteoporotic populations. Serves as a major attachment site for the gluteal and quadriceps muscle groups.'
  },
  pelvis: {
    commonName: 'Pelvis',
    latinName: 'Pelvis',
    system: 'Skeletal',
    layer: 0,
    clinicalRelevance: 'Transfers weight from the axial skeleton to the lower appendicular skeleton. Common site of avulsion fractures in athletes (e.g., ASIS, ischial tuberosity) and stability issues in gait.'
  },
  tibia: {
    commonName: 'Tibia',
    latinName: 'Os tibiae',
    system: 'Skeletal',
    layer: 0,
    clinicalRelevance: 'The primary weight-bearing bone of the lower leg. Highly susceptible to stress fractures (shin splints) and Osgood-Schlatter disease at the tibial tuberosity.'
  },
  fibula: {
    commonName: 'Fibula',
    latinName: 'Os fibulae',
    system: 'Skeletal',
    layer: 0,
    clinicalRelevance: 'Non-weight-bearing bone primarily functioning for muscle attachment and lateral ankle stability (lateral malleolus). Often fractured in severe ankle sprains.'
  },
  spine: {
    commonName: 'Vertebral Column',
    latinName: 'Columna vertebralis',
    system: 'Skeletal',
    layer: 0,
    clinicalRelevance: 'Protects the spinal cord and supports the skull and thorax. Susceptible to disc herniations (especially L4-L5, L5-S1), scoliosis, and degenerative joint diseases.'
  },
  skull: {
    commonName: 'Skull',
    latinName: 'Cranium',
    system: 'Skeletal',
    layer: 0,
    clinicalRelevance: 'Protects the brain and provides structural support for the face. Trauma can lead to concussions, epidural/subdural hematomas, or basilar skull fractures.'
  },
  ribcage: {
    commonName: 'Rib Cage',
    latinName: 'Thorax',
    system: 'Skeletal',
    layer: 0,
    clinicalRelevance: 'Protects vital cardiopulmonary organs and assists in respiration. Rib fractures can lead to pneumothorax or flail chest in severe trauma.'
  },
  scapula: {
    commonName: 'Scapula (Shoulder Blade)',
    latinName: 'Scapula',
    system: 'Skeletal',
    layer: 0,
    clinicalRelevance: 'Provides attachment for the rotator cuff and stabilizes the shoulder via the scapulothoracic joint. Scapular dyskinesis is a common cause of shoulder impingement.'
  },
  humerus: {
    commonName: 'Humerus',
    latinName: 'Humerus',
    system: 'Skeletal',
    layer: 0,
    clinicalRelevance: 'Fractures can damage the radial nerve (spiral groove), axillary nerve (surgical neck), or ulnar nerve (medial epicondyle).'
  },
  clavicle: {
    commonName: 'Clavicle (Collarbone)',
    latinName: 'Clavicula',
    system: 'Skeletal',
    layer: 0,
    clinicalRelevance: 'One of the most frequently fractured bones, typically from falls onto an outstretched hand (FOOSH). Forms the acromioclavicular (AC) joint, a common site of separation.'
  },

  // ==========================================
  // MUSCULAR SYSTEM (Layers 1-3)
  // ==========================================
  gluteus_maximus: {
    commonName: 'Gluteus Maximus',
    latinName: 'Musculus gluteus maximus',
    system: 'Muscular',
    layer: 3,
    origin: 'Ilium, sacrum, coccyx, and sacrotuberous ligament',
    insertion: 'Gluteal tuberosity of femur and iliotibial (IT) tract',
    actions: ['Hip extension', 'Hip external rotation', 'Upper fibers assist in abduction'],
    innervation: 'Inferior gluteal nerve (L5, S1, S2)',
    clinicalRelevance: 'Weakness leads to "gluteal amnesia" and compensatory lower back pain. Vital for explosive movements like sprinting, jumping, and squatting.',
    relatedStructures: ['Femur', 'Pelvis', 'Hamstrings', 'Iliotibial Tract'],
    exercises: ['Barbell Squats', 'Hip Thrusts', 'Deadlifts', 'Kettlebell Swings']
  },
  gluteus_medius: {
    commonName: 'Gluteus Medius',
    latinName: 'Musculus gluteus medius',
    system: 'Muscular',
    layer: 2,
    origin: 'Outer surface of ilium (between posterior and anterior gluteal lines)',
    insertion: 'Lateral surface of the greater trochanter of femur',
    actions: ['Hip abduction', 'Hip internal rotation (anterior fibers)', 'Pelvic stabilization during single-leg stance'],
    innervation: 'Superior gluteal nerve (L4, L5, S1)',
    clinicalRelevance: 'Weakness causes Trendelenburg gait (pelvic drop on contralateral side). Major target in physical therapy for knee tracking issues and IT band syndrome.',
    relatedStructures: ['Pelvis', 'Femur', 'Tensor Fasciae Latae', 'Gluteus Minimus'],
    exercises: ['Lateral Band Walks', 'Clamshells', 'Single-Leg Deadlifts']
  },
  rectus_femoris: {
    commonName: 'Rectus Femoris',
    latinName: 'Musculus rectus femoris',
    system: 'Muscular',
    layer: 3,
    origin: 'Anterior inferior iliac spine (AIIS) and ilium above the acetabulum',
    insertion: 'Tibial tuberosity (via patellar ligament)',
    actions: ['Hip flexion', 'Knee extension'],
    innervation: 'Femoral nerve (L2, L3, L4)',
    clinicalRelevance: 'Bi-articular muscle prone to active insufficiency. Common site of tears or strains in kicking sports. AIIS avulsion fractures can occur in adolescents.',
    relatedStructures: ['Pelvis', 'Patella', 'Tibia', 'Vastus Group'],
    exercises: ['Leg Extensions', 'Bulgarian Split Squats', 'Lunges']
  },
  vastus_lateralis: {
    commonName: 'Vastus Lateralis',
    latinName: 'Musculus vastus lateralis',
    system: 'Muscular',
    layer: 3,
    origin: 'Greater trochanter, intertrochanteric line, and linea aspera of femur',
    insertion: 'Tibial tuberosity (via patellar ligament) and lateral patellar retinaculum',
    actions: ['Knee extension'],
    innervation: 'Femoral nerve (L2, L3, L4)',
    clinicalRelevance: 'Overactivity compared to the vastus medialis often contributes to lateral patellar tracking issues and patellofemoral pain syndrome (PFPS).',
    relatedStructures: ['Femur', 'Patella', 'Iliotibial Tract', 'Rectus Femoris'],
    exercises: ['Hack Squats', 'Leg Press (Narrow Stance)', 'Cycling']
  },
  vastus_medialis: {
    commonName: 'Vastus Medialis',
    latinName: 'Musculus vastus medialis',
    system: 'Muscular',
    layer: 3,
    origin: 'Intertrochanteric line and medial lip of linea aspera',
    insertion: 'Tibial tuberosity (via patellar ligament) and medial patellar retinaculum',
    actions: ['Knee extension (specifically terminal extension)'],
    innervation: 'Femoral nerve (L2, L3, L4)',
    clinicalRelevance: 'The oblique fibers (VMO) are critical for dynamic medial stabilization of the patella. Frequently atrophies quickly following knee injuries (e.g., ACL tears).',
    relatedStructures: ['Femur', 'Patella', 'Adductor Longus'],
    exercises: ['Terminal Knee Extensions (TKE)', 'Cyclist Squats', 'Step-Ups']
  },
  biceps_femoris: {
    commonName: 'Biceps Femoris (Hamstring)',
    latinName: 'Musculus biceps femoris',
    system: 'Muscular',
    layer: 3,
    origin: 'Ischial tuberosity (long head), linea aspera (short head)',
    insertion: 'Head of fibula and lateral condyle of tibia',
    actions: ['Hip extension (long head)', 'Knee flexion', 'Knee external rotation (when flexed)'],
    innervation: 'Sciatic nerve (Tibial division for long head; Common fibular division for short head)',
    clinicalRelevance: 'Most frequently injured hamstring muscle, especially during the terminal swing phase of sprinting. Tightness can cause posterior pelvic tilt and lumbar strain.',
    relatedStructures: ['Pelvis', 'Fibula', 'Sciatic Nerve', 'Semitendinosus'],
    exercises: ['Romanian Deadlifts (RDL)', 'Lying Leg Curls', 'Nordic Hamstring Curls']
  },
  semitendinosus: {
    commonName: 'Semitendinosus (Hamstring)',
    latinName: 'Musculus semitendinosus',
    system: 'Muscular',
    layer: 3,
    origin: 'Ischial tuberosity',
    insertion: 'Medial surface of proximal tibia (Pes Anserinus)',
    actions: ['Hip extension', 'Knee flexion', 'Knee internal rotation (when flexed)'],
    innervation: 'Sciatic nerve (Tibial division)',
    clinicalRelevance: 'Tendon is frequently harvested for ACL reconstruction autografts. Part of the pes anserinus complex, which can develop bursitis.',
    relatedStructures: ['Pelvis', 'Tibia', 'Semimembranosus', 'Sartorius'],
    exercises: ['Good Mornings', 'Seated Leg Curls', 'Glute-Ham Raises']
  },
  gastrocnemius: {
    commonName: 'Gastrocnemius (Calf)',
    latinName: 'Musculus gastrocnemius',
    system: 'Muscular',
    layer: 3,
    origin: 'Medial and lateral condyles of the femur',
    insertion: 'Calcaneus (via Achilles tendon)',
    actions: ['Ankle plantarflexion', 'Knee flexion'],
    innervation: 'Tibial nerve (S1, S2)',
    clinicalRelevance: 'Bi-articular muscle. Susceptible to "tennis leg" (medial head tear). Together with the soleus, transmits massive force through the Achilles tendon, prone to tendinopathy or rupture.',
    relatedStructures: ['Femur', 'Calcaneus', 'Achilles Tendon', 'Soleus'],
    exercises: ['Standing Calf Raises', 'Jump Rope', 'Sprinting']
  },
  soleus: {
    commonName: 'Soleus',
    latinName: 'Musculus soleus',
    system: 'Muscular',
    layer: 2,
    origin: 'Posterior surface of the tibia and fibula, soleal line',
    insertion: 'Calcaneus (via Achilles tendon)',
    actions: ['Ankle plantarflexion'],
    innervation: 'Tibial nerve (S1, S2)',
    clinicalRelevance: 'The "second heart" of the body, aiding in venous return. A powerhouse postural muscle with predominantly slow-twitch type I fibers.',
    relatedStructures: ['Tibia', 'Fibula', 'Calcaneus', 'Achilles Tendon'],
    exercises: ['Seated Calf Raises', 'Bent-Knee Calf Raises', 'Running (Endurance)']
  },
  tibialis_anterior: {
    commonName: 'Tibialis Anterior',
    latinName: 'Musculus tibialis anterior',
    system: 'Muscular',
    layer: 3,
    origin: 'Lateral condyle and upper half of lateral surface of tibia',
    insertion: 'Medial cuneiform and base of first metatarsal',
    actions: ['Ankle dorsiflexion', 'Foot inversion'],
    innervation: 'Deep fibular nerve (L4, L5)',
    clinicalRelevance: 'Weakness or denervation causes "foot drop", leading to a steppage gait. Overuse is the primary cause of anterior shin splints.',
    relatedStructures: ['Tibia', 'First Metatarsal', 'Extensor Digitorum Longus'],
    exercises: ['Toe Raises', 'Resistance Band Dorsiflexion', 'Heel Walks']
  },
  psoas_major: {
    commonName: 'Psoas Major',
    latinName: 'Musculus psoas major',
    system: 'Muscular',
    layer: 1,
    origin: 'Transverse processes, bodies, and discs of T12-L5 vertebrae',
    insertion: 'Lesser trochanter of the femur (with iliacus)',
    actions: ['Hip flexion', 'Lumbar spine stabilization', 'Trunk lateral flexion'],
    innervation: 'Lumbar plexus (L1, L2, L3)',
    clinicalRelevance: 'Tightness leads to an anterior pelvic tilt and excessive lumbar lordosis, causing lower back pain. Can compress the lumbar plexus if inflamed.',
    relatedStructures: ['Lumbar Spine', 'Femur', 'Iliacus', 'Diaphragm'],
    exercises: ['Hanging Leg Raises', 'Jackknives', 'Sprinter Sit-Ups']
  },
  iliacus: {
    commonName: 'Iliacus',
    latinName: 'Musculus iliacus',
    system: 'Muscular',
    layer: 1,
    origin: 'Iliac fossa of the pelvis',
    insertion: 'Lesser trochanter of the femur (with psoas major)',
    actions: ['Hip flexion'],
    innervation: 'Femoral nerve (L2, L3)',
    clinicalRelevance: 'Functions seamlessly with the psoas as the primary hip flexor (iliopsoas). Susceptible to iliopsoas bursitis or snapping hip syndrome.',
    relatedStructures: ['Pelvis', 'Femur', 'Psoas Major'],
    exercises: ['High Knees', 'Resistance Band Hip Flexion', 'Knee Drives']
  },
  transversus_abdominis: {    aliases: ['Transversus Abdominis Muscle'],
    commonName: 'Transversus Abdominis',
    latinName: 'Musculus transversus abdominis',
    system: 'Muscular',
    layer: 1,
    origin: 'Inguinal ligament, iliac crest, thoracolumbar fascia, and lower six costal cartilages',
    insertion: 'Linea alba, pubic crest, and pectineal line',
    actions: ['Compresses abdominal contents', 'Increases intra-abdominal pressure', 'Core stabilization'],
    innervation: 'Lower intercostal nerves, iliohypogastric, and ilioinguinal nerves',
    clinicalRelevance: 'The innermost abdominal layer acting as the body’s natural corset. Critical for spinal stability; its delayed activation is strongly linked to chronic lower back pain.',
    relatedStructures: ['Thoracolumbar Fascia', 'Linea Alba', 'Internal Oblique', 'Diaphragm'],
    exercises: ['Stomach Vacuums', 'Planks', 'Dead Bugs', 'Bird-Dog']
  },
  rectus_abdominis: {
    commonName: 'Rectus Abdominis',
    latinName: 'Musculus rectus abdominis',
    system: 'Muscular',
    layer: 3,
    origin: 'Pubic crest and pubic symphysis',
    insertion: 'Xiphoid process and costal cartilages of ribs 5-7',
    actions: ['Trunk flexion', 'Compresses abdominal viscera', 'Posterior pelvic tilt'],
    innervation: 'Thoraco-abdominal nerves (T7-T11)',
    clinicalRelevance: 'The "six-pack" muscle, segmented by tendinous intersections. Can separate during pregnancy (diastasis recti).',
    relatedStructures: ['Pubis', 'Rib Cage', 'Linea Alba', 'External Oblique'],
    exercises: ['Crunches', 'V-Ups', 'Cable Woodchoppers', 'Ab-Wheel Rollouts']
  },
  obliquus_externus: {
    commonName: 'External Oblique',
    aliases: ['External Abdominal Oblique'],
    latinName: 'Musculus obliquus externus abdominis',
    system: 'Muscular',
    layer: 3,
    origin: 'External surfaces of ribs 5-12',
    insertion: 'Linea alba, pubic tubercle, and anterior half of iliac crest',
    actions: ['Bilateral trunk flexion', 'Unilateral contralateral rotation', 'Unilateral lateral flexion'],
    innervation: 'Thoraco-abdominal nerves (T7-T11) and subcostal nerve (T12)',
    clinicalRelevance: 'Works synergistically with the internal obliques to produce rotational power. Important for athletic twisting movements (e.g., throwing, swinging).',
    relatedStructures: ['Rib Cage', 'Pelvis', 'Internal Oblique', 'Serratus Anterior'],
    exercises: ['Russian Twists', 'Bicycle Crunches', 'Side Planks', 'Pallof Press']
  },
  pectoralis_major: {
    commonName: 'Pectoralis Major',
    latinName: 'Musculus pectoralis major',
    system: 'Muscular',
    layer: 3,
    origin: 'Clavicle, sternum, and upper costal cartilages',
    insertion: 'Greater tubercle and lateral lip of the bicipital groove of humerus',
    actions: ['Shoulder flexion', 'Shoulder adduction', 'Shoulder internal rotation'],
    innervation: 'Medial and lateral pectoral nerves',
    clinicalRelevance: 'A primary pushing muscle. Tears often occur at the musculotendinous junction during heavy bench pressing.',
    relatedStructures: ['Clavicle', 'Sternum', 'Humerus', 'Deltoid (Anterior)', 'Coracobrachialis'],
    exercises: ['Bench Press', 'Push-Ups', 'Cable Crossovers', 'Dumbbell Flyes']
  },
  latissimus_dorsi: {
    commonName: 'Latissimus Dorsi',
    latinName: 'Musculus latissimus dorsi',
    system: 'Muscular',
    layer: 3,
    origin: 'Spinous processes of T7-L5, thoracolumbar fascia, iliac crest, and inferior 3 or 4 ribs',
    insertion: 'Floor of the bicipital groove of the humerus',
    actions: ['Shoulder extension', 'Shoulder adduction', 'Shoulder internal rotation'],
    innervation: 'Thoracodorsal nerve (C6, C7, C8)',
    clinicalRelevance: 'The broadest muscle of the back, critical for pulling movements and spinal stabilization. Tightness can restrict overhead shoulder mobility.',
    relatedStructures: ['Thoracolumbar Fascia', 'Humerus', 'Teres Major', 'Rhomboids'],
    exercises: ['Pull-Ups', 'Lat Pulldowns', 'Barbell Rows', 'Straight-Arm Pulldowns']
  },
  trapezius: {
    commonName: 'Trapezius',
    latinName: 'Musculus trapezius',
    system: 'Muscular',
    layer: 3,
    origin: 'Occipital bone, ligamentum nuchae, and spinous processes of C7-T12',
    insertion: 'Clavicle, acromion, and spine of the scapula',
    actions: ['Scapular elevation (upper)', 'Scapular retraction (middle)', 'Scapular depression (lower)'],
    innervation: 'Spinal accessory nerve (CN XI)',
    clinicalRelevance: 'Highly susceptible to tension and trigger points due to poor posture or stress. Crucial for neck stability and shoulder mechanics.',
    relatedStructures: ['Scapula', 'Clavicle', 'Rhomboids', 'Levator Scapulae'],
    exercises: ['Barbell Shrugs', 'Face Pulls', 'Farmer\'s Walks', 'Y-Raises']
  },
  deltoid: {
    commonName: 'Deltoid',
    latinName: 'Musculus deltoideus',
    system: 'Muscular',
    layer: 3,
    origin: 'Lateral third of clavicle, acromion, and spine of scapula',
    insertion: 'Deltoid tuberosity of the humerus',
    actions: ['Shoulder abduction', 'Shoulder flexion (anterior)', 'Shoulder extension (posterior)'],
    innervation: 'Axillary nerve (C5, C6)',
    clinicalRelevance: 'Primary shoulder abductor. Vulnerable to strains during repetitive overhead lifting. Axillary nerve damage can cause profound weakness.',
    relatedStructures: ['Clavicle', 'Scapula', 'Humerus', 'Rotator Cuff'],
    exercises: ['Overhead Press', 'Lateral Raises', 'Front Raises', 'Reverse Pec Deck']
  },
  biceps_brachii: {
    commonName: 'Biceps Brachii',
    latinName: 'Musculus biceps brachii',
    system: 'Muscular',
    layer: 3,
    origin: 'Coracoid process (short head) and supraglenoid tubercle (long head)',
    insertion: 'Radial tuberosity and bicipital aponeurosis',
    actions: ['Elbow flexion', 'Forearm supination', 'Weak shoulder flexion'],
    innervation: 'Musculocutaneous nerve (C5, C6)',
    clinicalRelevance: 'Long head tendon frequently irritated in the bicipital groove (biceps tendinitis). Distal tendon ruptures occur with heavy eccentric loads.',
    relatedStructures: ['Scapula', 'Radius', 'Brachialis', 'Coracobrachialis'],
    exercises: ['Barbell Curls', 'Dumbbell Curls', 'Preacher Curls', 'Chin-Ups']
  },
  triceps_brachii: {
    commonName: 'Triceps Brachii',
    latinName: 'Musculus triceps brachii',
    system: 'Muscular',
    layer: 3,
    origin: 'Infraglenoid tubercle (long head), posterior humerus (lateral and medial heads)',
    insertion: 'Olecranon process of ulna',
    actions: ['Elbow extension', 'Shoulder extension (long head)'],
    innervation: 'Radial nerve (C6, C7, C8)',
    clinicalRelevance: 'Makes up 2/3 of upper arm mass. Vulnerable to tendinopathy at the olecranon ("weightlifter\'s elbow").',
    relatedStructures: ['Humerus', 'Ulna', 'Scapula', 'Anconeus'],
    exercises: ['Triceps Pushdowns', 'Skull Crushers', 'Close-Grip Bench Press', 'Dips']
  },
  brachialis: {
    commonName: 'Brachialis',
    latinName: 'Musculus brachialis',
    system: 'Muscular',
    layer: 2,
    origin: 'Distal anterior half of the humerus',
    insertion: 'Coronoid process and tuberosity of the ulna',
    actions: ['Elbow flexion (in all forearm positions)'],
    innervation: 'Musculocutaneous nerve and radial nerve',
    clinicalRelevance: 'The primary flexor of the elbow. Lies deep to the biceps but generates more pure flexion force, regardless of supination/pronation.',
    relatedStructures: ['Humerus', 'Ulna', 'Biceps Brachii', 'Brachioradialis'],
    exercises: ['Hammer Curls', 'Reverse Curls', 'Pull-Ups']
  },
  brachioradialis: {
    commonName: 'Brachioradialis',
    latinName: 'Musculus brachioradialis',
    system: 'Muscular',
    layer: 3,
    origin: 'Lateral supracondylar ridge of the humerus',
    insertion: 'Styloid process of the radius',
    actions: ['Elbow flexion (optimal in mid-prone position)'],
    innervation: 'Radial nerve (C5, C6)',
    clinicalRelevance: 'Contributes strongly to elbow flexion when the forearm is semi-pronated (hammer grip). Provides stability to the lateral elbow.',
    relatedStructures: ['Humerus', 'Radius', 'Brachialis', 'Extensor Carpi Radialis Longus'],
    exercises: ['Hammer Curls', 'Reverse Grip Barbell Curls', 'Zottman Curls']
  },
  serratus_anterior: {
    commonName: 'Serratus Anterior',
    latinName: 'Musculus serratus anterior',
    system: 'Muscular',
    layer: 2,
    origin: 'Outer surfaces of upper 8 or 9 ribs',
    insertion: 'Costal (anterior) surface of the medial border of the scapula',
    actions: ['Scapular protraction', 'Scapular upward rotation', 'Holds scapula against thoracic wall'],
    innervation: 'Long thoracic nerve (C5, C6, C7)',
    clinicalRelevance: 'Known as the "boxer\'s muscle." Damage to the long thoracic nerve results in medial "winging" of the scapula.',
    relatedStructures: ['Rib Cage', 'Scapula', 'Pectoralis Minor', 'External Oblique'],
    exercises: ['Scapular Push-Ups', 'Plank Protraction', 'Dumbbell Pullovers', 'Serratus Wall Slides']
  },

  // ==========================================
  // ARTICULAR & NERVOUS SYSTEMS
  // ==========================================
  sciatic_nerve: {
    commonName: 'Sciatic Nerve',
    latinName: 'Nervus ischiadicus',
    system: 'Nervous',
    layer: 1,
    actions: ['Motor to posterior thigh and all leg/foot muscles', 'Sensory to lateral leg and foot'],
    clinicalRelevance: 'The largest nerve in the body. Compression by a herniated disc or the piriformis muscle causes sciatica (radiating pain, numbness, or weakness down the posterior leg).'
  },
  femoral_nerve: {
    commonName: 'Femoral Nerve',
    latinName: 'Nervus femoralis',
    system: 'Nervous',
    layer: 1,
    actions: ['Motor to anterior thigh (quadriceps)', 'Sensory to anterior thigh and medial leg (via saphenous nerve)'],
    clinicalRelevance: 'Vulnerable to injury during pelvic surgeries or hip arthroplasty. Damage results in an inability to extend the knee (buckling) and sensory loss on the medial leg.'
  },
  anterior_cruciate_ligament: {
    commonName: 'Anterior Cruciate Ligament (ACL)',
    latinName: 'Ligamentum cruciatum anterius',
    system: 'Articular',
    layer: 1,
    actions: ['Prevents anterior translation of the tibia', 'Provides rotational stability to the knee'],
    clinicalRelevance: 'One of the most frequently torn ligaments in sports involving cutting or pivoting. Often requires surgical reconstruction using autografts (patellar or hamstring).'
  },
  patellar_ligament: {
    commonName: 'Patellar Tendon / Ligament',
    latinName: 'Ligamentum patellae',
    system: 'Articular',
    layer: 3,
    actions: ['Transmits force from the quadriceps to the tibia for knee extension'],
    clinicalRelevance: 'Frequent site of jumper’s knee (patellar tendinopathy) due to repetitive eccentric loading. Also susceptible to complete rupture under high sudden loads.'
  },
  erector_spinae: {
    commonName: 'Erector Spinae',
    latinName: 'Musculus erector spinae',
    system: 'Muscular',
    layer: 2,
    origin: 'Sacrum, iliac crest, spinous processes of lower lumbar and sacral vertebrae',
    insertion: 'Ribs, spinous and transverse processes of thoracic and cervical vertebrae, and skull',
    actions: ['Spinal extension', 'Spinal lateral flexion'],
    innervation: 'Posterior branches of the spinal nerves',
    clinicalRelevance: 'Crucial for maintaining posture and lifting safely. Often a primary site of lower back pain and strain.',
    relatedStructures: ['Spine', 'Pelvis', 'Multifidus', 'Quadratus lumborum'],
    exercises: ['Deadlifts', 'Back Extensions', 'Good Mornings', 'Bird Dog'],
  },
  rhomboids: {
    commonName: 'Rhomboids (Major & Minor)',
    latinName: 'Musculi rhomboidei',
    system: 'Muscular',
    layer: 2,
    origin: 'Spinous processes of C7-T5',
    insertion: 'Medial border of the scapula',
    actions: ['Scapular retraction', 'Scapular downward rotation'],
    innervation: 'Dorsal scapular nerve (C4, C5)',
    clinicalRelevance: 'Prone to weakness and lengthening due to rounded-shoulder postures. Strengthening is key for shoulder health.',
    relatedStructures: ['Scapula', 'Trapezius', 'Levator scapulae'],
    exercises: ['Bent Over Rows', 'Face Pulls', 'Seated Cable Rows'],
  },
  rhomboideus: {
    commonName: 'Rhomboids',
    latinName: 'Musculi rhomboidei',
    system: 'Muscular',
    layer: 2,
    origin: 'Spinous processes of C7-T5',
    insertion: 'Medial border of the scapula',
    actions: ['Scapular retraction', 'Scapular downward rotation'],
    innervation: 'Dorsal scapular nerve (C4, C5)',
    clinicalRelevance: 'Prone to weakness and lengthening due to rounded-shoulder postures. Strengthening is key for shoulder health.',
    relatedStructures: ['Scapula', 'Trapezius', 'Levator scapulae'],
    exercises: ['Bent Over Rows', 'Face Pulls', 'Seated Cable Rows'],
  },
  iliopsoas: {
    commonName: 'Iliopsoas',
    latinName: 'Musculus iliopsoas',
    system: 'Muscular',
    layer: 1,
    origin: 'Iliac fossa (Iliacus) and T12-L5 vertebrae (Psoas major)',
    insertion: 'Lesser trochanter of the femur',
    actions: ['Hip flexion', 'External rotation of the thigh'],
    innervation: 'Femoral nerve (L2-L4) and anterior rami of L1-L3',
    clinicalRelevance: 'Primary hip flexor. Can cause lower back pain if excessively tight, leading to anterior pelvic tilt.',
    relatedStructures: ['Femur', 'Pelvis', 'Lumbar Spine'],
    exercises: ['Leg Raises', 'High Knees', 'Sit-ups'],
  },
  hamstrings: {
    commonName: 'Hamstrings Group',
    latinName: 'Musculi ischiocrurales',
    system: 'Muscular',
    layer: 3,
    origin: 'Ischial tuberosity (except short head of biceps femoris on linea aspera)',
    insertion: 'Tibia (medial condyle) and Fibula (head)',
    actions: ['Knee flexion', 'Hip extension'],
    innervation: 'Sciatic nerve (L5-S2)',
    clinicalRelevance: 'Frequent site of strain in sprinting sports. Crucial for deceleration and ACL protection.',
    relatedStructures: ['Pelvis', 'Femur', 'Tibia', 'Fibula'],
    exercises: ['Romanian Deadlifts', 'Leg Curls', 'Glute-Ham Raises'],
  },
  quadriceps: {
    commonName: 'Quadriceps Group',
    latinName: 'Musculus quadriceps femoris',
    system: 'Muscular',
    layer: 3,
    origin: 'Anterior inferior iliac spine (Rectus Femoris) and body of femur (Vastus muscles)',
    insertion: 'Tibial tuberosity via the patellar ligament',
    actions: ['Knee extension', 'Hip flexion (Rectus Femoris only)'],
    innervation: 'Femoral nerve (L2-L4)',
    clinicalRelevance: 'Primary knee extensor, vital for walking, running, and jumping. Weakness can lead to patellofemoral tracking issues.',
    relatedStructures: ['Femur', 'Patella', 'Tibia'],
    exercises: ['Squats', 'Leg Press', 'Leg Extensions', 'Lunges'],
  },
  lower_trapezius: {
    commonName: 'Lower Trapezius',
    latinName: 'Musculus trapezius (pars ascendens)',
    system: 'Muscular',
    layer: 3,
    origin: 'Spinous processes of T4-T12',
    insertion: 'Base of the scapular spine',
    actions: ['Scapular depression', 'Scapular upward rotation'],
    innervation: 'Accessory nerve (CN XI)',
    clinicalRelevance: 'Often weak in general populations. Essential for safe overhead shoulder mechanics.',
    relatedStructures: ['Scapula', 'Thoracic Spine'],
    exercises: ['Y-Raises', 'Face Pulls', 'Wall Slides'],
  },
  upper_trapezius: {
    commonName: 'Upper Trapezius',
    latinName: 'Musculus trapezius (pars descendens)',
    system: 'Muscular',
    layer: 3,
    origin: 'Occipital bone, ligamentum nuchae, spinous processes C1-C7',
    insertion: 'Lateral third of clavicle and acromion',
    actions: ['Scapular elevation', 'Neck extension'],
    innervation: 'Accessory nerve (CN XI)',
    clinicalRelevance: 'Frequently carries tension and trigger points. Can cause cervicogenic headaches when overactive.',
    relatedStructures: ['Scapula', 'Clavicle', 'Cervical Spine'],
    exercises: ['Shrugs', 'Farmer\'s Walks'],
  },
  rotator_cuff: {
    commonName: 'Rotator Cuff',
    latinName: 'Musculi rotatoris',
    system: 'Muscular',
    layer: 2,
    origin: 'Various fossae of the scapula',
    insertion: 'Greater and lesser tubercles of the humerus',
    actions: ['Shoulder stabilization', 'Internal/External rotation', 'Abduction'],
    innervation: 'Suprascapular, axillary, and subscapular nerves',
    clinicalRelevance: 'Common site of tendinopathy and tears, especially in overhead athletes.',
    relatedStructures: ['Scapula', 'Humerus', 'Glenohumeral Joint'],
    exercises: ['External Rotations', 'Internal Rotations', 'Face Pulls'],
  },
  deep_neck_flexors: {
    commonName: 'Deep Neck Flexors',
    latinName: 'Musculi colli profundi',
    system: 'Muscular',
    layer: 1,
    origin: 'Anterior surfaces of cervical and upper thoracic vertebrae',
    insertion: 'Occipital bone and cervical vertebrae above',
    actions: ['Cervical flexion', 'Craniocervical flexion', 'Neck stabilization'],
    innervation: 'Ventral rami of cervical nerves',
    clinicalRelevance: 'Often weak in "forward head posture," leading to neck pain and headaches. Targeted in neck rehabilitation.',
    relatedStructures: ['Cervical Spine', 'Skull'],
    exercises: ['Chin Tucks', 'Neck Curls'],
  },
  anterior_deltoid: {
    commonName: 'Anterior Deltoid',
    latinName: 'Musculus deltoideus (pars clavicularis)',
    system: 'Muscular',
    layer: 3,
    origin: 'Lateral third of the clavicle',
    insertion: 'Deltoid tuberosity of the humerus',
    actions: ['Shoulder flexion', 'Shoulder internal rotation'],
    innervation: 'Axillary nerve (C5, C6)',
    clinicalRelevance: 'Primary pushing muscle in overhead and forward movements.',
    relatedStructures: ['Clavicle', 'Humerus'],
    exercises: ['Front Raises', 'Overhead Press'],
  },
  posterior_deltoid: {
    commonName: 'Posterior Deltoid',
    latinName: 'Musculus deltoideus (pars spinalis)',
    system: 'Muscular',
    layer: 3,
    origin: 'Spine of the scapula',
    insertion: 'Deltoid tuberosity of the humerus',
    actions: ['Shoulder extension', 'Shoulder external rotation'],
    innervation: 'Axillary nerve (C5, C6)',
    clinicalRelevance: 'Often neglected in favor of anterior pressing muscles; crucial for shoulder balance.',
    relatedStructures: ['Scapula', 'Humerus'],
    exercises: ['Reverse Flyes', 'Face Pulls'],
  },
  obliquus_internus: {
    commonName: 'Internal Oblique',
    aliases: ['Internal Abdominal Oblique'],
    latinName: 'Musculus obliquus internus abdominis',
    system: 'Muscular',
    layer: 2,
    origin: 'Thoracolumbar fascia, iliac crest, and inguinal ligament',
    insertion: 'Lower ribs, linea alba, and pubis',
    actions: ['Trunk rotation (ipsilateral)', 'Trunk lateral flexion', 'Abdominal compression'],
    innervation: 'Thoracoabdominal nerves (T7-T11) and subcostal nerve (T12)',
    clinicalRelevance: 'Works synergistically with the contralateral external oblique to rotate the torso. Core stabilization.',
    relatedStructures: ['Ribs', 'Pelvis', 'Linea Alba'],
    exercises: ['Woodchoppers', 'Russian Twists', 'Side Planks'],
  },
  coracobrachialis: {
    commonName: 'Coracobrachialis',
    latinName: 'Musculus coracobrachialis',
    system: 'Muscular',
    layer: 2,
    origin: 'Coracoid process of the scapula',
    insertion: 'Medial surface of the mid-humerus',
    actions: ['Shoulder flexion', 'Shoulder adduction'],
    innervation: 'Musculocutaneous nerve (C5-C7)',
    clinicalRelevance: 'Can be involved in shoulder impingement or pain at the coracoid process.',
    relatedStructures: ['Scapula', 'Humerus', 'Biceps Brachii (Short Head)'],
    exercises: ['Front Raises', 'Dumbbell Flyes'],
  },
  tfl: {
    commonName: 'Tensor Fasciae Latae',
    latinName: 'Musculus tensor fasciae latae',
    system: 'Muscular',
    layer: 3,
    origin: 'Anterior superior iliac spine (ASIS)',
    insertion: 'Iliotibial (IT) tract',
    actions: ['Hip abduction', 'Hip flexion', 'Hip internal rotation'],
    innervation: 'Superior gluteal nerve (L4-S1)',
    clinicalRelevance: 'Often becomes tight in runners and cyclists, contributing to IT band syndrome.',
    relatedStructures: ['Pelvis', 'IT Band', 'Femur'],
    exercises: ['Clamshells', 'Side Lying Leg Raises'],
  },
  pectoralis_minor: {
    commonName: 'Pectoralis Minor',
    latinName: 'Musculus pectoralis minor',
    system: 'Muscular',
    layer: 2,
    origin: 'Anterior surfaces of ribs 3-5',
    insertion: 'Coracoid process of the scapula',
    actions: ['Scapular anterior tilt', 'Scapular depression', 'Assists in respiration'],
    innervation: 'Medial pectoral nerve (C8, T1)',
    clinicalRelevance: 'Often shortened in rounded-shoulder posture, contributing to thoracic outlet syndrome.',
    relatedStructures: ['Ribs', 'Scapula', 'Coracoid Process'],
    exercises: ['Dips', 'Pullover'],
  },
  levator_scapulae: {
    commonName: 'Levator Scapulae',
    latinName: 'Musculus levator scapulae',
    system: 'Muscular',
    layer: 2,
    origin: 'Transverse processes of C1-C4',
    insertion: 'Superior angle and medial border of the scapula',
    actions: ['Scapular elevation', 'Neck lateral flexion (ipsilateral)'],
    innervation: 'Dorsal scapular nerve (C4-C5)',
    clinicalRelevance: 'Commonly a site of stiffness and trigger points in people working at desks or computers.',
    relatedStructures: ['Cervical Spine', 'Scapula'],
    exercises: ['Shrugs', 'Neck Stretches'],
  },
  digastric: {
    commonName: 'Digastric',
    latinName: 'Musculus digastricus',
    system: 'Muscular',
    layer: 2,
    origin: 'Mastoid notch (posterior belly) and digastric fossa of mandible (anterior belly)',
    insertion: 'Hyoid bone',
    actions: ['Depresses mandible', 'Elevates hyoid bone'],
    innervation: 'Facial nerve (posterior) and trigeminal nerve (anterior)',
    clinicalRelevance: 'Assists in swallowing and opening the mouth.',
    relatedStructures: ['Mandible', 'Hyoid Bone'],
  },
  finger_extensors: {
    commonName: 'Finger Extensors',
    latinName: 'Musculi extensores digitorum',
    system: 'Muscular',
    layer: 3,
    origin: 'Lateral epicondyle of the humerus',
    insertion: 'Extensor expansions of digits 2-5',
    actions: ['Finger extension', 'Wrist extension'],
    innervation: 'Radial nerve (C7, C8)',
    clinicalRelevance: 'Overuse can lead to lateral epicondylitis (tennis elbow).',
    relatedStructures: ['Radius', 'Ulna', 'Phalanges'],
    exercises: ['Finger Extensions', 'Reverse Wrist Curls'],
  },
  finger_flexors: {
    commonName: 'Finger Flexors',
    latinName: 'Musculi flexores digitorum',
    system: 'Muscular',
    layer: 3,
    origin: 'Medial epicondyle of the humerus and anterior ulna/radius',
    insertion: 'Middle and distal phalanges of digits 2-5',
    actions: ['Finger flexion', 'Wrist flexion'],
    innervation: 'Median and ulnar nerves',
    clinicalRelevance: 'Overuse can lead to medial epicondylitis (golfer\'s elbow) or carpal tunnel compression.',
    relatedStructures: ['Radius', 'Ulna', 'Phalanges'],
    exercises: ['Grip Trainers', 'Wrist Curls'],
  },
  hand_intrinsics: {
    commonName: 'Intrinsic Hand Muscles',
    latinName: 'Musculi manus',
    system: 'Muscular',
    layer: 1,
    origin: 'Carpal and metacarpal bones',
    insertion: 'Phalanges',
    actions: ['Fine motor control of fingers', 'Abduction/Adduction of digits'],
    innervation: 'Ulnar and median nerves',
    clinicalRelevance: 'Crucial for grip strength and dexterity. Wasting is a sign of nerve entrapment (e.g., ulnar nerve).',
    relatedStructures: ['Carpals', 'Metacarpals', 'Phalanges'],
  },
  masseter: {
    commonName: 'Masseter',
    latinName: 'Musculus masseter',
    system: 'Muscular',
    layer: 3,
    origin: 'Zygomatic arch',
    insertion: 'Mandibular angle and ramus',
    actions: ['Elevates mandible (closing mouth)'],
    innervation: 'Mandibular nerve (V3 of Trigeminal)',
    clinicalRelevance: 'One of the strongest muscles for its size. Often involved in TMJ disorders and bruxism (teeth grinding).',
    relatedStructures: ['Mandible', 'Zygomatic Bone', 'Temporomandibular Joint'],
  },
  multifidus: {
    commonName: 'Multifidus',
    latinName: 'Musculus multifidus',
    system: 'Muscular',
    layer: 1,
    origin: 'Sacrum, posterior iliac spine, transverse processes of T1-T12 and articular processes of C4-C7',
    insertion: 'Spinous processes of vertebrae (spanning 2-4 segments above origin)',
    actions: ['Spinal extension', 'Spinal stabilization'],
    innervation: 'Posterior rami of spinal nerves',
    clinicalRelevance: 'Key stabilizer of the spine. Atrophy is strongly correlated with chronic lower back pain.',
    relatedStructures: ['Spine', 'Sacrum', 'Erector Spinae'],
    exercises: ['Bird Dog', 'Spinal Rotations'],
  },
  peroneals: {
    commonName: 'Peroneals (Fibularis Group)',
    latinName: 'Musculi fibulares',
    system: 'Muscular',
    layer: 3,
    origin: 'Lateral surface of the fibula',
    insertion: 'Medial cuneiform and metatarsals (1 and 5)',
    actions: ['Foot eversion', 'Plantarflexion'],
    innervation: 'Superficial fibular (peroneal) nerve',
    clinicalRelevance: 'Important for lateral ankle stability. Frequently injured or strained during ankle sprains.',
    relatedStructures: ['Fibula', 'Ankle Joint', 'Metatarsals'],
    exercises: ['Calf Raises', 'Ankle Eversions'],
  },
  piriformis: {
    commonName: 'Piriformis',
    latinName: 'Musculus piriformis',
    system: 'Muscular',
    layer: 2,
    origin: 'Anterior surface of the sacrum',
    insertion: 'Greater trochanter of the femur',
    actions: ['Hip external rotation', 'Hip abduction'],
    innervation: 'Nerve to piriformis (L5, S1, S2)',
    clinicalRelevance: 'Can compress the sciatic nerve (Piriformis Syndrome), causing pain down the leg.',
    relatedStructures: ['Sacrum', 'Femur', 'Sciatic Nerve'],
    exercises: ['Pigeon Stretch', 'Figure-Four Stretch'],
  },
  pronators: {
    commonName: 'Pronator Group',
    latinName: 'Musculi pronatores',
    system: 'Muscular',
    layer: 2,
    origin: 'Medial epicondyle of humerus and distal ulna',
    insertion: 'Lateral surface of the radius',
    actions: ['Forearm pronation'],
    innervation: 'Median nerve',
    clinicalRelevance: 'Pronator teres can entrap the median nerve (Pronator Teres Syndrome).',
    relatedStructures: ['Radius', 'Ulna', 'Humerus'],
  },
  pterygoids: {
    commonName: 'Pterygoids (Medial & Lateral)',
    latinName: 'Musculi pterygoidei',
    system: 'Muscular',
    layer: 1,
    origin: 'Sphenoid bone and pterygoid plates',
    insertion: 'Mandible (condyle and angle)',
    actions: ['Mandibular elevation', 'Side-to-side jaw movement', 'Protrusion'],
    innervation: 'Mandibular nerve (V3)',
    clinicalRelevance: 'Crucial for chewing (mastication). Implicated in temporomandibular joint (TMJ) dysfunction.',
    relatedStructures: ['Mandible', 'Sphenoid Bone'],
  },
  quadratus_lumborum: {
    commonName: 'Quadratus Lumborum',
    latinName: 'Musculus quadratus lumborum',
    system: 'Muscular',
    layer: 2,
    origin: 'Iliac crest and iliolumbar ligament',
    insertion: 'Twelfth rib and transverse processes of L1-L4',
    actions: ['Spinal lateral flexion', 'Bilateral extension', 'Stabilizes 12th rib during respiration'],
    innervation: 'Subcostal nerve (T12) and anterior rami of L1-L4',
    clinicalRelevance: 'A very common source of lower back pain, especially when lifting improperly or sitting asymmetrically.',
    relatedStructures: ['Pelvis', 'Ribs', 'Lumbar Spine'],
    exercises: ['Side Planks', 'Suitcase Carries'],
  },
  scalenes: {
    commonName: 'Scalenes (Anterior, Middle, Posterior)',
    latinName: 'Musculi scaleni',
    system: 'Muscular',
    layer: 2,
    origin: 'Transverse processes of cervical vertebrae (C2-C7)',
    insertion: 'First and second ribs',
    actions: ['Neck lateral flexion', 'Elevates ribs during forced inspiration'],
    innervation: 'Cervical spinal nerves (C3-C8)',
    clinicalRelevance: 'Can compress the brachial plexus and subclavian artery, causing Thoracic Outlet Syndrome.',
    relatedStructures: ['Cervical Spine', 'Ribs', 'Brachial Plexus'],
  },
  splenius: {
    commonName: 'Splenius (Capitis & Cervicis)',
    latinName: 'Musculi splenii',
    system: 'Muscular',
    layer: 2,
    origin: 'Ligamentum nuchae and spinous processes of C7-T6',
    insertion: 'Mastoid process, occipital bone, and transverse processes of C1-C3',
    actions: ['Neck extension', 'Head rotation (ipsilateral)'],
    innervation: 'Posterior rami of cervical spinal nerves',
    clinicalRelevance: 'Commonly strained in whiplash injuries.',
    relatedStructures: ['Cervical Spine', 'Skull'],
  },
  sternocleidomastoid: {
    commonName: 'Sternocleidomastoid (SCM)',
    latinName: 'Musculus sternocleidomastoideus',
    system: 'Muscular',
    layer: 3,
    origin: 'Manubrium of the sternum and medial clavicle',
    insertion: 'Mastoid process of the temporal bone',
    actions: ['Neck flexion', 'Head rotation (contralateral)'],
    innervation: 'Accessory nerve (CN XI)',
    clinicalRelevance: 'Frequently involved in tension headaches and neck stiffness (torticollis).',
    relatedStructures: ['Sternum', 'Clavicle', 'Skull'],
  },
  suboccipitals: {
    commonName: 'Suboccipitals',
    latinName: 'Musculi suboccipitales',
    system: 'Muscular',
    layer: 1,
    origin: 'Atlas (C1) and Axis (C2)',
    insertion: 'Occipital bone',
    actions: ['Fine movements of the head', 'Head extension'],
    innervation: 'Suboccipital nerve (C1)',
    clinicalRelevance: 'Strongly associated with cervicogenic headaches due to tension from forward head posture.',
    relatedStructures: ['Skull', 'Cervical Spine'],
  },
  supinator: {
    commonName: 'Supinator',
    latinName: 'Musculus supinator',
    system: 'Muscular',
    layer: 2,
    origin: 'Lateral epicondyle of humerus and proximal ulna',
    insertion: 'Proximal third of the radius',
    actions: ['Forearm supination'],
    innervation: 'Deep branch of the radial nerve',
    clinicalRelevance: 'Can entrap the radial nerve (Radial Tunnel Syndrome), causing lateral elbow pain.',
    relatedStructures: ['Humerus', 'Radius', 'Ulna'],
  },
  temporalis: {
    commonName: 'Temporalis',
    latinName: 'Musculus temporalis',
    system: 'Muscular',
    layer: 3,
    origin: 'Temporal fossa',
    insertion: 'Coronoid process of the mandible',
    actions: ['Mandibular elevation', 'Mandibular retraction'],
    innervation: 'Mandibular nerve (V3 of Trigeminal)',
    clinicalRelevance: 'Involved in chewing and TMJ disorders. Tension here frequently causes tension-type headaches.',
    relatedStructures: ['Temporal Bone', 'Mandible'],
  },
  tibialis_posterior: {
    commonName: 'Tibialis Posterior',
    latinName: 'Musculus tibialis posterior',
    system: 'Muscular',
    layer: 2,
    origin: 'Posterior aspect of tibia, fibula, and interosseous membrane',
    insertion: 'Navicular, cuneiforms, and bases of metatarsals 2-4',
    actions: ['Foot inversion', 'Plantarflexion'],
    innervation: 'Tibial nerve',
    clinicalRelevance: 'Primary dynamic stabilizer of the medial longitudinal arch. Dysfunction leads to acquired flatfoot.',
    relatedStructures: ['Tibia', 'Fibula', 'Foot Bones'],
  },
  wrist_extensors: {
    commonName: 'Wrist Extensors',
    latinName: 'Musculi extensores carpi',
    system: 'Muscular',
    layer: 3,
    origin: 'Lateral epicondyle of the humerus',
    insertion: 'Bases of the metacarpals',
    actions: ['Wrist extension'],
    innervation: 'Radial nerve',
    clinicalRelevance: 'Commonly injured in lateral epicondylitis (tennis elbow).',
    relatedStructures: ['Humerus', 'Radius', 'Metacarpals'],
    exercises: ['Reverse Wrist Curls'],
  },
  wrist_flexors: {
    commonName: 'Wrist Flexors',
    latinName: 'Musculi flexores carpi',
    system: 'Muscular',
    layer: 3,
    origin: 'Medial epicondyle of the humerus',
    insertion: 'Carpal and metacarpal bones',
    actions: ['Wrist flexion'],
    innervation: 'Median and ulnar nerves',
    clinicalRelevance: 'Commonly injured in medial epicondylitis (golfer\'s elbow).',
    relatedStructures: ['Humerus', 'Ulna', 'Carpals'],
    exercises: ['Wrist Curls'],
  },
};
