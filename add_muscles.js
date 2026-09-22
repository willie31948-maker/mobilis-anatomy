const fs = require('fs');

const missingMuscles = {
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
    exercises: ['Deadlifts', 'Back Extensions', 'Good Mornings', 'Bird Dog']
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
    exercises: ['Bent Over Rows', 'Face Pulls', 'Seated Cable Rows']
  },
  rhomboideus: { // Alias
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
    exercises: ['Bent Over Rows', 'Face Pulls', 'Seated Cable Rows']
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
    exercises: ['Leg Raises', 'High Knees', 'Sit-ups']
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
    exercises: ['Romanian Deadlifts', 'Leg Curls', 'Glute-Ham Raises']
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
    exercises: ['Squats', 'Leg Press', 'Leg Extensions', 'Lunges']
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
    exercises: ['Y-Raises', 'Face Pulls', 'Wall Slides']
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
    exercises: ['Shrugs', 'Farmer\'s Walks']
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
    exercises: ['External Rotations', 'Internal Rotations', 'Face Pulls']
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
    exercises: ['Chin Tucks', 'Neck Curls']
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
    exercises: ['Front Raises', 'Overhead Press']
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
    exercises: ['Reverse Flyes', 'Face Pulls']
  },
  obliquus_internus: {
    commonName: 'Internal Oblique',
    latinName: 'Musculus obliquus internus abdominis',
    system: 'Muscular',
    layer: 2,
    origin: 'Thoracolumbar fascia, iliac crest, and inguinal ligament',
    insertion: 'Lower ribs, linea alba, and pubis',
    actions: ['Trunk rotation (ipsilateral)', 'Trunk lateral flexion', 'Abdominal compression'],
    innervation: 'Thoracoabdominal nerves (T7-T11) and subcostal nerve (T12)',
    clinicalRelevance: 'Works synergistically with the contralateral external oblique to rotate the torso. Core stabilization.',
    relatedStructures: ['Ribs', 'Pelvis', 'Linea Alba'],
    exercises: ['Woodchoppers', 'Russian Twists', 'Side Planks']
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
    exercises: ['Front Raises', 'Dumbbell Flyes']
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
    exercises: ['Clamshells', 'Side Lying Leg Raises']
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
    exercises: ['Dips', 'Pullover']
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
    exercises: ['Shrugs', 'Neck Stretches']
  }
};

let content = fs.readFileSync('src/data/anatomyData.ts', 'utf8');

let newEntries = '';
for (const [key, meta] of Object.entries(missingMuscles)) {
  if (!content.includes(key + ': {') && !content.includes(`'${key}': {`)) {
    newEntries += `  ${key}: {\n`;
    for (const [k, v] of Object.entries(meta)) {
      if (Array.isArray(v)) {
        newEntries += `    ${k}: [${v.map(s => `'${s.replace(/'/g, "\\'")}'`).join(', ')}],\n`;
      } else if (typeof v === 'number') {
        newEntries += `    ${k}: ${v},\n`;
      } else {
        newEntries += `    ${k}: '${v.replace(/'/g, "\\'")}',\n`;
      }
    }
    newEntries += `  },\n`;
  }
}

if (newEntries) {
  // Find where to insert it: inside anatomyRegistry.
  // E.g., just before the final `};` in the file.
  const insertIndex = content.lastIndexOf('};');
  if (insertIndex > -1) {
    content = content.slice(0, insertIndex) + newEntries + content.slice(insertIndex);
    fs.writeFileSync('src/data/anatomyData.ts', content);
    console.log('Added missing descriptions!');
  } else {
    console.log('Could not find end of anatomyRegistry');
  }
} else {
  console.log('No new entries needed.');
}
