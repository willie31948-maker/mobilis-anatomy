const fs = require('fs');

const missingMuscles = {
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
    relatedStructures: ['Mandible', 'Hyoid Bone']
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
    exercises: ['Finger Extensions', 'Reverse Wrist Curls']
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
    exercises: ['Grip Trainers', 'Wrist Curls']
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
    relatedStructures: ['Carpals', 'Metacarpals', 'Phalanges']
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
    relatedStructures: ['Mandible', 'Zygomatic Bone', 'Temporomandibular Joint']
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
    exercises: ['Bird Dog', 'Spinal Rotations']
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
    exercises: ['Calf Raises', 'Ankle Eversions']
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
    exercises: ['Pigeon Stretch', 'Figure-Four Stretch']
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
    relatedStructures: ['Radius', 'Ulna', 'Humerus']
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
    relatedStructures: ['Mandible', 'Sphenoid Bone']
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
    exercises: ['Side Planks', 'Suitcase Carries']
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
    relatedStructures: ['Cervical Spine', 'Ribs', 'Brachial Plexus']
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
    relatedStructures: ['Cervical Spine', 'Skull']
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
    relatedStructures: ['Sternum', 'Clavicle', 'Skull']
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
    relatedStructures: ['Skull', 'Cervical Spine']
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
    relatedStructures: ['Humerus', 'Radius', 'Ulna']
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
    relatedStructures: ['Temporal Bone', 'Mandible']
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
    relatedStructures: ['Tibia', 'Fibula', 'Foot Bones']
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
    exercises: ['Reverse Wrist Curls']
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
    exercises: ['Wrist Curls']
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
  const insertIndex = content.lastIndexOf('};');
  if (insertIndex > -1) {
    content = content.slice(0, insertIndex) + newEntries + content.slice(insertIndex);
    fs.writeFileSync('src/data/anatomyData.ts', content);
    console.log('Added more missing descriptions!');
  } else {
    console.log('Could not find end of anatomyRegistry');
  }
} else {
  console.log('No new entries needed.');
}
