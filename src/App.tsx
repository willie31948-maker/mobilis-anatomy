import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, useAnimations, ContactShadows, Center } from '@react-three/drei';
import * as THREE from 'three';
import {
  Play,
  Pause,
  FastForward,
  Rewind,
  Info,
  Layers,
  Activity,
  Search,
  Camera,
  ClipboardList,
  Plus,
  Trash2,
  AlertCircle,
  FileText,
  X,
  CheckCircle,
  Columns,
  Sparkles,
  Eye,
  Dumbbell,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AnatomyMetadata, anatomyRegistry, normalizeAnatomyKey, getAnatomyData } from './data/anatomyData';
import { AssessmentState, PainSite } from './types/rehab';
import { AssessmentEngineView } from './components/AssessmentEngineView';
import { BiomechanicalRigOverlay } from './components/BiomechanicalRigOverlay';
import { Biomechanical4ViewLab } from './components/Biomechanical4ViewLab';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// DATA & METADATA
// ============================================================================
export function classifyStructure(rawName: string): 'nervous' | 'articular' | 'muscular' | 'skeletal' {
  const name = rawName.toLowerCase();

  // 1. Muscular System & Scapular Stabilizers (Must evaluate before any bone checks)
  const isMuscular =
    /infra|supra|spinatus|subscap|teres|deltoid|trapez|rhombo|levator|pectoral|latiss|serratus/i.test(name) ||
    /muscle|musculus|tendon|tendo|aponeuro|diaphragm|fascia|belly|insertio|origo|attachment/i.test(name) ||
    /femor|brachi|glute|abdomin|obliqu|erector|psoas|iliacus|quad|hamstring|gastro|soleus|tibial|perone/i.test(name) ||
    /bicep|tricep|pronat|supinat|flexor|extensor|piriform|obturat|gemell|gracil|sartori|adductor/i.test(name);

  if (isMuscular) {
    return 'muscular';
  }

  // 2. Nervous System
  if (/nerve|nervus|nervi|plexus|cord|brain|ganglion/i.test(name)) {
    return 'nervous';
  }

  // 3. Articular System (Joints, Ligaments, Cartilage)
  if (/ligament|ligamentum|articular|capsule|meniscus|labrum|cartilage|cartilago|synovial|discus/i.test(name)) {
    return 'articular';
  }

  // 4. Pure Skeletal Bones
  const isBone = /os_|bone|verteb|costa|rib|sternum|femur|tibia|fibula|patell|pelvi|ilium|ischium|pubis|sacrum|coccyx|scapul|clavic|humer|radius|ulna|cran|skull|mandib|maxil|carpi|tarsi|phalang|calcane|talus|hyoid|sphenoid|ethmoid|vomer|zygomat/i.test(name);
  if (isBone) {
    return 'skeletal';
  }

  // Fallback: Default unclassified soft tissue to muscular
  return 'muscular';
}

export function isRogueMeshBiomechanics(name: string) {
  const lower = name.toLowerCase();
  return ['disc', 'nucleus', 'ligament', 'costal', 'cartilage'].some(k => lower.includes(k));
}

function getSystem(name: string) {
  // Check explicit database metadata first
  const data = getAnatomyData(name);
  if (data && data.system === 'Skeletal') return 'skeleton';
  if (data && data.system === 'Muscular') return 'muscles';
  if (data && data.system === 'Articular') return 'joints';
  if (data && data.system === 'Nervous') return 'nerves';

  // Fallbacks based on regex classification if not strictly found in metadata
  const classification = classifyStructure(name);
  if (classification === 'nervous') return 'nerves';
  if (classification === 'articular') return 'joints';
  if (classification === 'muscular') return 'muscles';
  
  return 'skeleton'; 
}

function getLayer(meshName: string): number {
  if (meshName.toLowerCase().includes('mixamorig')) return 0;
  if (getSystem(meshName) === 'skeleton') return 0;
  const data = getAnatomyData(meshName);
  return data?.layer ?? 2;
}

// ============================================================================
// COMPONENT: ATLAS EXPLORER MODEL (Mode A)
// ============================================================================
function AtlasModel({ activeLayer, systems, selectedId, onSelect, onFocusMesh, activePainSites, onHover, customHighlights }: {
  activeLayer: number,
  systems: Record<string, boolean>,
  selectedId: string | null,
  onSelect: (id: string | null) => void,
  onFocusMesh: (pos: THREE.Vector3 | null) => void,
  activePainSites: PainSite[],
  onHover: (meshName: string | null) => void,
  customHighlights?: { keywords: string[]; color: string; label: string }[]
}) {
  const { scene } = useGLTF('/models/full_atlas_v5.glb');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        if (child.geometry && !child.geometry.hasAttribute('normal')) {
          child.geometry.computeVertexNormals();
        }
        if (!child.userData.originalMaterial) {
          child.material = child.material.clone();
          child.userData.originalMaterial = child.material.clone();
          
          const mat = child.material as THREE.MeshStandardMaterial;
          const sys = getSystem(child.name);
          
          mat.vertexColors = child.geometry.hasAttribute('color');
          if (mat.vertexColors) {
            mat.color.setHex(0xffffff);
          } else {
            // Fallback colors if the Blender model didn't export vertex colors properly
            if (sys === 'nerves') mat.color.setHex(0xeab308);
            else if (sys === 'joints') mat.color.setHex(0x5eead4);
            else if (sys === 'muscles') mat.color.setHex(0xb85834);
            else if (sys === 'skeleton') mat.color.setHex(0xe2ded4);
          }
          
          if (sys === 'nerves') {
            mat.roughness = 0.3;
            mat.metalness = 0.1;
          } else if (sys === 'joints') {
            mat.roughness = 0.6;
            mat.metalness = 0.05;
          } else if (sys === 'muscles') {
            mat.roughness = 0.45;
            mat.metalness = 0.1;
          } else if (sys === 'skeleton') {
            mat.roughness = 0.35;
            mat.metalness = 0.05;
          }
          mat.needsUpdate = true;
        }
        child.frustumCulled = false;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  useFrame(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        const id = normalizeAnatomyKey(child.name);
        const sys = getSystem(child.name);
        const layer = getLayer(child.name);

        let isVisible = systems[sys] ?? false;
        if (sys === 'muscles') {
          isVisible = systems.muscles && layer <= activeLayer;
        }

        child.visible = isVisible;
        child.raycast = isVisible ? THREE.Mesh.prototype.raycast : () => null;

        const mat = child.material as THREE.MeshStandardMaterial;
        mat.transparent = false;
        mat.opacity = 1;
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;

        if (sys === 'nerves') {
          mat.emissive.setHex(0x713f12);
          mat.emissiveIntensity = 0.5;
        } else if (sys === 'joints') {
          mat.transparent = true;
          mat.opacity = 0.85;
        }

        // Apply depth offsets to prevent Z-fighting
        if (sys !== 'skeleton' && sys !== 'joints') {
          mat.polygonOffset = true;
          mat.polygonOffsetFactor = -1.0;
          mat.polygonOffsetUnits = -4.0;
        } else {
          mat.depthTest = true;
          mat.depthWrite = true;
          mat.polygonOffset = false;
        }

        // Highlight based on custom Assessment Engine rules
        if (customHighlights && customHighlights.length > 0) {
          const meshLower = child.name.toLowerCase().replace(/[-_.]/g, ' ');
          for (const h of customHighlights) {
            const isMatch = h.keywords.some((kw) => {
              const kClean = kw.toLowerCase().replace(/[-_.]/g, ' ');
              return meshLower.includes(kClean) || id.includes(kClean);
            });
            if (isMatch) {
              mat.emissive.set(h.color);
              mat.emissiveIntensity = 0.85;
              break;
            }
          }
        }

        if (id === hoveredId) {
          mat.emissive.setHex(0xcceeff);
          mat.emissiveIntensity = 0.25;
        }
        
        const isPainSite = activePainSites.some(p => p.id === id);
        if (isPainSite) {
          const painSite = activePainSites.find(p => p.id === id)!;
          // Scale emissive intensity with severity
          mat.emissive.setHex(0xff2244);
          mat.emissiveIntensity = 0.3 + (painSite.severity / 10) * 0.7;
        }
        
        if (id === selectedId) {
          if (isPainSite) {
            mat.emissive.setHex(0xff5577); // Lighter red if selected
            mat.emissiveIntensity = 1.0;
          } else {
            mat.emissive.setHex(0x00ffff);
            mat.emissiveIntensity = 0.6;
          }
        }
      }
    });
  });

  return (
    <Center>
      <primitive 
        object={scene} 
        onPointerDown={(e: any) => {
          e.stopPropagation();
          console.log('Clicked Mesh:', e.object.name, 'Parent:', e.object.parent?.name);
        }}
        onPointerOver={(e: any) => {
          e.stopPropagation();
          setHoveredId(normalizeAnatomyKey(e.object.name));
          onHover(e.object.name);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredId(null);
          onHover(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e: any) => {
          e.stopPropagation();
          onSelect(normalizeAnatomyKey(e.object.name));
          
          const vec = new THREE.Vector3();
          e.object.getWorldPosition(vec);
          onFocusMesh(vec);
        }}
        onPointerMissed={() => {
          onSelect(null);
          onFocusMesh(null);
        }}
      />
    </Center>
  );
}

useGLTF.preload('/models/full_atlas_v5.glb');

// ============================================================================
// COMPONENT: BIOMECHANICS MODEL (Mode B)
// ============================================================================
function BiomechanicsModel({ progress, playing, progressRef, progressTextRef, exercise }: { progress: number, playing: boolean, progressRef: React.RefObject<HTMLInputElement>, progressTextRef: React.RefObject<HTMLSpanElement>, exercise: string }) {
  const { scene, animations } = useGLTF('/models/squat_clean.glb');
  const { actions, mixer } = useAnimations(animations, scene);
  
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh && isRogueMeshBiomechanics(child.name)) {
        child.visible = false;
        child.position.set(0, 0, 0);
        child.scale.set(0.0001, 0.0001, 0.0001);
        child.updateMatrixWorld(true);
        return;
      }
    });
  }, [scene]);

  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        if (child.geometry && !child.geometry.hasAttribute('normal')) {
          child.geometry.computeVertexNormals();
        }
        
        if (!child.userData.originalMaterial) {
          child.material = child.material.clone();
          child.userData.originalMaterial = child.material.clone();
          
          const mat = child.material as THREE.MeshStandardMaterial;
          const sys = getSystem(child.name);
          
          mat.vertexColors = child.geometry.hasAttribute('color');
          if (mat.vertexColors) {
            mat.color.setHex(0xffffff);
          } else {
            if (sys === 'nerves') mat.color.setHex(0xeab308);
            else if (sys === 'joints') mat.color.setHex(0x5eead4);
            else if (sys === 'muscles') mat.color.setHex(0xb85834);
            else if (sys === 'skeleton') mat.color.setHex(0xe2ded4);
          }

          if (sys === 'nerves') {
            mat.roughness = 0.3;
            mat.metalness = 0.1;
          } else if (sys === 'joints') {
            mat.roughness = 0.6;
            mat.metalness = 0.05;
          } else if (sys === 'muscles') {
            mat.roughness = 0.45;
            mat.metalness = 0.1;
          } else if (sys === 'skeleton') {
            mat.roughness = 0.35;
          }
          
          const layer = getLayer(child.name);
          if (layer > 0) {
            child.material.polygonOffset = true;
            child.material.polygonOffsetFactor = -1.0;
            child.material.polygonOffsetUnits = -4.0;
          } else {
            child.material.depthTest = true;
            child.material.depthWrite = true;
            child.material.polygonOffset = false;
          }
        }
        
        child.frustumCulled = false;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  useEffect(() => {
    const squatAction = actions['Squat'] || Object.values(actions)[0];
    if (!squatAction) return;

    squatAction.reset().play();
    squatAction.paused = !playing;
  }, [playing, actions]);

  useEffect(() => {
    const squatAction = actions['Squat'] || Object.values(actions)[0];
    if (!squatAction) return;

    if (!playing) {
      const clipDuration = squatAction.getClip().duration;
      squatAction.time = progress * clipDuration;
    }
  }, [progress, playing, actions]);

  useFrame((state, delta) => {
    if (mixer && mixer.update) {
      mixer.update(delta);
    }
    
    let currentProgress = progress;
    const action = actions['Squat'] || Object.values(actions)[0];
    if (action && playing) {
      currentProgress = (action.time / action.getClip().duration) % 1;
      if (progressRef.current) {
        progressRef.current.value = currentProgress.toString();
      }
      if (progressTextRef.current) {
        progressTextRef.current.innerText = Math.round(currentProgress * 100) + '%';
      }
    }

    scene.traverse((child: any) => {
      if (child.isMesh) {
        if (isRogueMeshBiomechanics(child.name)) {
          return;
        }

        const id = normalizeAnatomyKey(child.name);
        const isBone = getSystem(child.name) === 'skeleton';
        if (isBone) return;

        const mat = child.material as THREE.MeshStandardMaterial;
        
        let isExtensor = false;
        let isFlexor = false;
        let isHamstring = false;
        let isCore = ['transversus_abdominis', 'rectus_abdominis', 'obliquus_externus'].includes(id);
        let isUpperBack = false;

        if (exercise === 'squat' || exercise === 'lunge') {
            isExtensor = ['gluteus_maximus', 'rectus_femoris', 'vastus_lateralis', 'vastus_medialis', 'soleus', 'gastrocnemius'].includes(id);
            isFlexor = ['tibialis_anterior', 'psoas_major', 'iliacus'].includes(id);
            isHamstring = ['biceps_femoris', 'semitendinosus'].includes(id);
        } else if (exercise === 'hinge') {
            isExtensor = ['gluteus_maximus', 'biceps_femoris', 'semitendinosus', 'erector_spinae'].includes(id);
            isFlexor = ['rectus_femoris'].includes(id);
            isHamstring = false;
        } else if (exercise === 'row') {
            isExtensor = ['latissimus_dorsi', 'trapezius', 'rhomboideus', 'biceps_brachii', 'brachialis', 'posterior_deltoid'].includes(id);
            isFlexor = ['pectoralis_major', 'anterior_deltoid'].includes(id);
            isHamstring = ['gluteus_maximus', 'biceps_femoris'].includes(id);
        } else if (exercise === 'bird_dog') {
            isExtensor = ['gluteus_maximus', 'erector_spinae', 'posterior_deltoid'].includes(id);
            isFlexor = ['rectus_abdominis', 'iliacus'].includes(id);
            isCore = true; // heavy core stabilization
        } else if (exercise === 'dead_bug') {
            isFlexor = ['rectus_abdominis', 'transversus_abdominis', 'psoas_major'].includes(id);
            isExtensor = false;
            isCore = true;
        } else if (exercise === 'side_plank') {
            isCore = ['obliquus_externus', 'obliquus_internus', 'transversus_abdominis', 'gluteus_medius'].includes(id);
            isExtensor = ['latissimus_dorsi'].includes(id);
        }

        if (currentProgress < 0.5) {
          if (isExtensor) {
            mat.emissive.setHex(0xaa22ff);
            mat.emissiveIntensity = 0.4 + (currentProgress * 0.4);
          } else if (isFlexor) {
            mat.emissive.setHex(0xffaa00);
            mat.emissiveIntensity = 0.3;
          } else if (isCore || isHamstring) {
            mat.emissive.setHex(0xffaa00);
            mat.emissiveIntensity = 0.2;
          } else {
            mat.emissive.setHex(0x000000);
          }
        } else {
          if (isExtensor) {
            mat.emissive.setHex(0xff2244);
            mat.emissiveIntensity = 0.8 - ((currentProgress - 0.5) * 0.4);
          } else if (isFlexor) {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0.0;
          } else if (isCore || isHamstring) {
            mat.emissive.setHex(0xffaa00);
            mat.emissiveIntensity = 0.3;
          } else {
            mat.emissive.setHex(0x000000);
          }
        }
      }
    });
  });

  return (
    <Center>
      <primitive object={scene} />
      <BiomechanicalRigOverlay
        scene={scene}
        visible={true}
        showAxes={true}
        showForcePlates={true}
        showWorldAxes={true}
      />
    </Center>
  );
}

useGLTF.preload('/models/squat_clean.glb');

// ============================================================================
// COMPONENT: CAMERA ANIMATOR
// ============================================================================
function CameraAnimator({ focus, focusPoint }: { focus: string, focusPoint: THREE.Vector3 | null }) {
  const { camera, controls } = useThree();
  const [animating, setAnimating] = useState(false);
  const prevFocus = useRef(focus);
  const prevFocusPoint = useRef(focusPoint);

  useEffect(() => {
    if (focus !== prevFocus.current || focusPoint !== prevFocusPoint.current) {
      setAnimating(true);
      prevFocus.current = focus;
      prevFocusPoint.current = focusPoint;
    }
  }, [focus, focusPoint]);

  useFrame((state, delta) => {
    if (!controls || !animating) return;
    const ctrl = controls as any;
    const speed = 6 * delta; 
    
    let targetVec = new THREE.Vector3(0, 0.9, 0);
    let posVec = new THREE.Vector3(0, 1.1, 2.6);

    if (focusPoint && focus === 'mesh') {
      targetVec = focusPoint.clone();
      // Calculate a comfortable offset. Z+1.2 and slightly up.
      posVec = focusPoint.clone().add(new THREE.Vector3(0, 0.2, 1.2));
    } else {
      const targets: Record<string, { target: THREE.Vector3, pos: THREE.Vector3 }> = {
        full: { target: new THREE.Vector3(0, 0.9, 0), pos: new THREE.Vector3(0, 1.1, 2.6) },
        torso: { target: new THREE.Vector3(0, 1.25, 0), pos: new THREE.Vector3(0, 1.3, 1.25) },
        lower: { target: new THREE.Vector3(0, 0.45, 0), pos: new THREE.Vector3(0, 0.5, 1.4) },
        cervical: { target: new THREE.Vector3(0, 1.55, 0), pos: new THREE.Vector3(0, 1.55, 0.85) },
        neck: { target: new THREE.Vector3(0, 1.55, 0), pos: new THREE.Vector3(0, 1.55, 0.85) },
        shoulder: { target: new THREE.Vector3(0, 1.4, 0), pos: new THREE.Vector3(0, 1.4, 1.1) },
        lumbar: { target: new THREE.Vector3(0, 1.05, 0), pos: new THREE.Vector3(0, 1.1, 1.15) },
        spine: { target: new THREE.Vector3(0, 1.15, 0), pos: new THREE.Vector3(0, 1.2, 1.2) },
        hip: { target: new THREE.Vector3(0, 0.85, 0), pos: new THREE.Vector3(0, 0.88, 1.15) },
        knee: { target: new THREE.Vector3(0, 0.48, 0), pos: new THREE.Vector3(0, 0.5, 1.15) },
        ankle: { target: new THREE.Vector3(0, 0.15, 0), pos: new THREE.Vector3(0, 0.2, 0.85) }
      };
      const dest = targets[focus] || targets.full;
      targetVec = dest.target;
      posVec = dest.pos;
    }

    ctrl.target.lerp(targetVec, speed);
    camera.position.lerp(posVec, speed);
    
    ctrl.update();

    if (camera.position.distanceTo(posVec) < 0.05 && ctrl.target.distanceTo(targetVec) < 0.05) {
      setAnimating(false);
    }
  });

  useEffect(() => {
    if (!controls) return;
    const ctrl = controls as any;
    const onStart = () => setAnimating(false);
    ctrl.addEventListener('start', onStart);
    return () => ctrl.removeEventListener('start', onStart);
  }, [controls]);
  
  return null;
}

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const [mode, setMode] = useState<'explorer' | 'biomechanics' | 'assessment'>('explorer');
  const [activeLayer, setActiveLayer] = useState<number>(3); // 0=Bone, 1, 2, 3
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectedMesh, setInspectedMesh] = useState<string | null>(null);
  
  // Camera State
  const [cameraFocus, setCameraFocus] = useState<string>('full'); 
  const [focusPoint, setFocusPoint] = useState<THREE.Vector3 | null>(null);
  
  // Atlas System State
  const [systems, setSystems] = useState({
    skeleton: true,
    muscles: true,
    joints: true,
    nerves: true
  });
  
  // Biomechanics State
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exercise, setExercise] = useState('squat');
  const progressRef = useRef<HTMLInputElement>(null);
  const progressTextRef = useRef<HTMLSpanElement>(null);

  // Assessment State & Layout
  const [assessmentLayout, setAssessmentLayout] = useState<'split' | 'console' | 'avatar'>('split');
  const [custom3DHighlights, setCustom3DHighlights] = useState<{ keywords: string[]; color: string; label: string }[]>([]);

  const [assessment, setAssessment] = useState<AssessmentState>({
    isAssessmentMode: false,
    safetyAnswers: {}, movementAnswers: {}, painLocations: [], currentPainLevel: 0,
    activePainSites: [],
    provocativeMovement: null,
    painPhase: null,
    irritability: null,
    romStatus: '',
    strengthRating: '',
    coachNotes: '',
    showFullReport: false
  });

  const safetyQuestions = [
    "Any loss of bladder or bowel control, or numbness around the groin/saddle area?",
    "Is there progressive weakness, or a foot/hand that drops or gives way?",
    "Unexplained weight loss, night sweats, or fever with this pain?",
    "Constant pain that is clearly worse at night and unrelieved by position change?",
    "Significant trauma (fall, collision, road accident), or unable to bear weight?",
    "Hot, swollen, tender calf — particularly after surgery, immobility or a long flight?",
    "History of cancer, with new unexplained musculoskeletal pain?",
    "Long-term corticosteroid use or known osteoporosis, with new spinal pain?"
  ];

  const toggleSystem = (sys: keyof typeof systems) => {
    setSystems(prev => ({ ...prev, [sys]: !prev[sys] }));
  };

  const handleMeshFocus = (pos: THREE.Vector3 | null) => {
    setFocusPoint(pos);
    if (pos) {
      setCameraFocus('mesh');
    }
  };

  let activeMeta = selectedId ? getAnatomyData(selectedId) : null;
  const sysClass = selectedId ? getSystem(selectedId) : null;
  
  if (!activeMeta && selectedId && sysClass) {
    activeMeta = {
      commonName: normalizeAnatomyKey(selectedId).replace(/_/g, ' '),
      latinName: 'Structura Anatomica',
      system: sysClass === 'skeleton' ? 'Skeletal' : 
              sysClass === 'joints' ? 'Articular' : 
              sysClass === 'nerves' ? 'Nervous' : 'Muscular',
      layer: sysClass === 'skeleton' ? 0 : 2,
      clinicalRelevance: sysClass === 'skeleton' ? 'Provides structural framework, organ protection, and mechanical leverage for movement.' :
                         sysClass === 'joints' ? 'Facilitates articulation and provides structural stability to the skeletal system.' :
                         sysClass === 'nerves' ? 'Transmits somatosensory and motor signals to coordinate physiological functions.' :
                         'Primary soft tissue. Provides biomechanical leverage and joint stabilization.'
    };
  }
  
  const addPainSite = () => {
    if (!selectedId) return;
    const sys = getSystem(selectedId);
    const existingIndex = assessment.activePainSites.findIndex(p => p.id === selectedId);
    
    if (existingIndex >= 0) return; // Already exists

    const newSite: PainSite = {
      id: selectedId,
      name: normalizeAnatomyKey(selectedId).replace(/_/g, ' '),
      system: sys === 'skeleton' ? 'Skeletal' : sys === 'joints' ? 'Articular' : sys === 'nerves' ? 'Nervous' : 'Muscular',
      region: 'Other',
      severity: 5
    };

    setAssessment(prev => ({
      ...prev,
      activePainSites: [...prev.activePainSites, newSite]
    }));
  };

  const removePainSite = (id: string) => {
    setAssessment(prev => ({
      ...prev,
      activePainSites: prev.activePainSites.filter(p => p.id !== id)
    }));
  };

  const updatePainSiteSeverity = (id: string, severity: number) => {
    setAssessment(prev => ({
      ...prev,
      activePainSites: prev.activePainSites.map(p => p.id === id ? { ...p, severity } : p)
    }));
  };

  const displayTitle = activeMeta ? activeMeta.commonName : (selectedId ? normalizeAnatomyKey(selectedId).replace(/_/g, ' ') : 'Unknown Structure');

    return (
    <div className="w-screen h-screen bg-gray-950 flex flex-col font-sans text-gray-100 overflow-hidden relative">
      {/* HEADER */}
      <header className="h-16 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <Activity className="text-emerald-400 w-6 h-6" />
          <h1 className="font-semibold text-lg tracking-wide text-white">Mobilis 3D</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {mode === 'assessment' && (
            <div className="hidden sm:flex bg-gray-950 p-1 rounded-lg border border-purple-900/40 gap-1 text-xs">
              <button
                onClick={() => setAssessmentLayout('split')}
                className={cn(
                  "px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5",
                  assessmentLayout === 'split' ? "bg-purple-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
                )}
              >
                <Columns className="w-3.5 h-3.5" />
                Split View
              </button>
              <button
                onClick={() => setAssessmentLayout('console')}
                className={cn(
                  "px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5",
                  assessmentLayout === 'console' ? "bg-purple-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
                )}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Assessment Console
              </button>
              <button
                onClick={() => setAssessmentLayout('avatar')}
                className={cn(
                  "px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5",
                  assessmentLayout === 'avatar' ? "bg-purple-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                3D Avatar Focus
              </button>
            </div>
          )}

          <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
            <button
              onClick={() => { setMode('explorer'); setPlaying(false); setCameraFocus('full'); setFocusPoint(null); }}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                mode === 'explorer' ? "bg-gray-800 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
              )}
            >
              <Layers className="w-4 h-4 inline-block mr-2" />
              Atlas Explorer
            </button>
            <button
              onClick={() => { setMode('biomechanics'); setAssessment(a => ({...a, isAssessmentMode: false})); setSelectedId(null); setCameraFocus('full'); setFocusPoint(null); }}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                mode === 'biomechanics' ? "bg-gray-800 text-emerald-400 shadow-sm" : "text-gray-400 hover:text-gray-200"
              )}
            >
              <Activity className="w-4 h-4 inline-block mr-2" />
              Biomechanics
            </button>
            <button
              onClick={() => { setMode('assessment'); setAssessment(a => ({...a, isAssessmentMode: true})); setSelectedId(null); setCameraFocus('full'); setFocusPoint(null); }}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                mode === 'assessment' ? "bg-gray-800 text-purple-400 shadow-sm" : "text-gray-400 hover:text-gray-200"
              )}
            >
              <ClipboardList className="w-4 h-4 inline-block mr-2" />
              Movement Assessment
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative flex overflow-hidden">
        {mode === 'biomechanics' ? (
          <Biomechanical4ViewLab />
        ) : (
          <>
            {/* 3D VIEWPORT CONTAINER */}
            <div 
              className={cn(
                "relative h-full transition-all duration-300 overflow-hidden",
                mode === 'assessment' && assessmentLayout === 'console'
                  ? "hidden"
                  : mode === 'assessment' && assessmentLayout === 'split'
                  ? "w-full md:w-[42%] lg:w-[44%] shrink-0 border-r border-gray-800"
                  : "w-full shrink-0"
              )}
              style={{ background: 'radial-gradient(circle at 50% 45%, #162032 0%, #080c14 100%)' }}
            >
              <Canvas 
                camera={{ position: [0, 1.1, 2.6], fov: 40 }}
                gl={{ toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
              >
                <ambientLight intensity={1.0} />
                <directionalLight position={[2, 3, 3]} intensity={2.0} castShadow />
                <directionalLight position={[-2, 1, 1]} intensity={1.2} color="#e0e8ff" />
                <directionalLight position={[0, 3, -3]} intensity={2.5} color="#60a5fa" />
                
                <group position={[0, 0.9, 0]}>
                  <AtlasModel 
                    activeLayer={activeLayer}
                    systems={systems}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onFocusMesh={handleMeshFocus}
                    activePainSites={assessment.activePainSites}
                    onHover={setInspectedMesh}
                    customHighlights={custom3DHighlights}
                  />
                </group>
                
                <CameraAnimator focus={cameraFocus} focusPoint={focusPoint} />

                <ContactShadows position={[0, 0, 0]} opacity={0.65} blur={1.8} scale={2.5} far={1.2} resolution={512} color="#000000" />
                
                <OrbitControls 
                  makeDefault 
                  target={[0, 0.9, 0]} 
                  minDistance={0.5} 
                  maxDistance={4.5}
                  maxPolarAngle={Math.PI / 2 + 0.05}
                />
                <Environment preset="city" environmentIntensity={0.25} />
              </Canvas>

              {/* Camera Focus HUD (Centered in visible 3D canvas viewport) */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 pointer-events-auto">
                {inspectedMesh && (
                  <div className="bg-gray-900/90 text-gray-300 text-xs px-3 py-1 rounded-md border border-gray-700 shadow-md flex items-center gap-2 max-w-[240px] truncate">
                    <Search className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="font-mono truncate">{inspectedMesh}</span>
                    <span className="text-gray-500 shrink-0">({getSystem(inspectedMesh)})</span>
                  </div>
                )}
                <div className="flex bg-gray-900/80 backdrop-blur-md rounded-full border border-gray-700 shadow-xl p-1 gap-1">
                  <button onClick={() => { setFocusPoint(null); setCameraFocus('full'); }} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold transition-colors", cameraFocus === 'full' ? 'bg-emerald-500 text-gray-950' : 'text-gray-300 hover:text-white')}>Full Body</button>
                  <button onClick={() => { setFocusPoint(null); setCameraFocus('torso'); }} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold transition-colors", cameraFocus === 'torso' ? 'bg-emerald-500 text-gray-950' : 'text-gray-300 hover:text-white')}>Torso</button>
                  <button onClick={() => { setFocusPoint(null); setCameraFocus('lower'); }} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold transition-colors", cameraFocus === 'lower' ? 'bg-emerald-500 text-gray-950' : 'text-gray-300 hover:text-white')}>Lower</button>
                </div>
              </div>

              {/* Assessment Mode Overlays on the 3D viewport */}
              {mode === 'assessment' && (
                <>
                  {/* Kinetic 3D Highlights Floating Badge */}
                  {custom3DHighlights.length > 0 && (
                    <div className="absolute top-4 left-4 z-10 max-w-[280px] pointer-events-auto">
                      <div className="bg-gray-900/90 backdrop-blur-md border border-purple-900/50 rounded-xl p-3 shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Kinetic 3D Highlights
                          </span>
                          <button
                            onClick={() => setCustom3DHighlights([])}
                            className="text-[10px] text-gray-400 hover:text-white uppercase font-semibold"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {custom3DHighlights.map((h, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-md font-semibold border flex items-center gap-1.5"
                              style={{
                                backgroundColor: `${h.color}22`,
                                borderColor: `${h.color}66`,
                                color: h.color,
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: h.color }} />
                              {h.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Selected Mesh Action in 3D viewport */}
                  {selectedId && (
                    <div className="absolute bottom-16 left-4 z-10 w-64 bg-gray-900/95 backdrop-blur-md border border-purple-500/50 rounded-xl p-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                      <div className="text-[10px] uppercase font-bold text-purple-400">Selected Anatomy</div>
                      <div className="text-xs font-bold text-white capitalize leading-tight mb-2 truncate">{displayTitle}</div>
                      <button
                        onClick={addPainSite}
                        className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-md shadow-purple-900/40 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add as Symptom Site
                      </button>
                    </div>
                  )}

                  {/* Avatar Focus Mode: Floating button to return to Assessment Console */}
                  {assessmentLayout === 'avatar' && (
                    <div className="absolute bottom-4 right-4 z-10 pointer-events-auto">
                      <button
                        onClick={() => setAssessmentLayout('split')}
                        className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-2xl shadow-purple-900/50 flex items-center gap-2 border border-purple-400/30 transition-all hover:scale-[1.02]"
                      >
                        <ClipboardList className="w-4 h-4" /> Open Assessment Console
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ASSESSMENT ENGINE VIEW CONTAINER (Console or Split) */}
            {mode === 'assessment' && assessmentLayout !== 'avatar' && (
              <div
                className={cn(
                  "relative h-full flex flex-col bg-gray-950 overflow-hidden",
                  assessmentLayout === 'console'
                    ? "w-full"
                    : "w-full md:w-[58%] lg:w-[56%] flex-1"
                )}
              >
                <AssessmentEngineView
                  onHighlightMeshes={setCustom3DHighlights}
                  onSetCameraRegion={(reg) => {
                    setCameraFocus(reg);
                    setFocusPoint(null);
                  }}
                  activePainSites={assessment.activePainSites}
                  onAddPainSite={(reg, sev) => {
                    const id = reg.toLowerCase().replace(/\s+/g, '_');
                    if (!assessment.activePainSites.some((p) => p.id === id)) {
                      setAssessment((prev) => ({
                        ...prev,
                        activePainSites: [
                          ...prev.activePainSites,
                          {
                            id,
                            name: reg,
                            system: 'Muscular',
                            region: (['Cervical', 'Shoulder', 'Lumbar', 'Hip', 'Knee', 'Ankle'].includes(reg)
                              ? reg
                              : 'Other') as any,
                            severity: sev,
                          },
                        ],
                      }));
                    }
                  }}
                  onRemovePainSite={(id) => {
                    setAssessment((prev) => ({
                      ...prev,
                      activePainSites: prev.activePainSites.filter((p) => p.id !== id),
                    }));
                  }}
                />
              </div>
            )}

            {/* OVERLAYS: EXPLORER MODE */}
            {mode === 'explorer' && (
              <>
                {/* Left Sidebar: Systems & Layers */}
                <div className="absolute left-6 top-6 z-10 w-72 flex flex-col gap-4">
                  {/* System Toggles */}
                  <div className="bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-xl p-4 shadow-xl">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Anatomical Systems</h3>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={systems.skeleton} onChange={() => toggleSystem('skeleton')} className="w-4 h-4 rounded accent-emerald-500 cursor-pointer" />
                        <span className="text-sm text-gray-200">Skeletal System</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={systems.muscles} onChange={() => toggleSystem('muscles')} className="w-4 h-4 rounded accent-emerald-500 cursor-pointer" />
                        <span className="text-sm text-gray-200">Muscular System</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={systems.joints} onChange={() => toggleSystem('joints')} className="w-4 h-4 rounded accent-emerald-500 cursor-pointer" />
                        <span className="text-sm text-gray-200">Articular System (Joints)</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={systems.nerves} onChange={() => toggleSystem('nerves')} className="w-4 h-4 rounded accent-emerald-500 cursor-pointer" />
                        <span className="text-sm text-gray-200">Nervous System</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Depth Layer for Muscles */}
                  <div className={cn("bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-xl p-4 shadow-xl transition-opacity", !systems.muscles && "opacity-50 pointer-events-none")}>
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Muscle Depth</h3>
                    <input 
                      type="range" 
                      min="0" max="3" step="1" 
                      value={activeLayer}
                      onChange={(e) => setActiveLayer(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 mb-2 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs font-medium text-gray-500">
                      <span className={activeLayer === 0 ? "text-emerald-400" : ""}>Bone</span>
                      <span className={activeLayer === 1 ? "text-emerald-400" : ""}>Deep</span>
                      <span className={activeLayer === 2 ? "text-emerald-400" : ""}>Mid</span>
                      <span className={activeLayer === 3 ? "text-emerald-400" : ""}>Surface</span>
                    </div>
                  </div>
                </div>

                {/* Metadata Drawer (Right Sidebar) */}
                {selectedId && (
                  <div className="absolute right-6 top-6 z-10 w-80 bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-xl overflow-hidden shadow-2xl transition-all animate-in slide-in-from-right-4 fade-in max-h-[85vh] flex flex-col">
                    <div className={cn("border-b p-4 shrink-0", 
                      getSystem(selectedId) === 'nerves' ? "bg-yellow-950/40 border-yellow-900/30" :
                      getSystem(selectedId) === 'joints' ? "bg-cyan-950/40 border-cyan-900/30" :
                      getSystem(selectedId) === 'muscles' ? "bg-orange-950/40 border-orange-900/30" :
                      "bg-emerald-950/40 border-emerald-900/30"
                    )}>
                      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                        {getSystem(selectedId) === 'nerves' ? "Peripheral Nervous System" :
                         getSystem(selectedId) === 'joints' ? "Articular Capsule & Ligament" :
                         getSystem(selectedId) === 'muscles' ? "Skeletal Muscle" : "Bone"}
                      </div>
                      <h2 className="text-lg font-bold text-white capitalize">{displayTitle}</h2>
                      {activeMeta?.latinName && <p className="text-sm italic text-gray-400 font-serif mt-1">{activeMeta.latinName}</p>}
                    </div>
                    
                    <div className="p-4 space-y-4 overflow-y-auto flex-1">
                      {activeMeta ? (
                        <>
                          {activeMeta.origin && (
                            <div>
                              <h3 className="text-xs font-semibold text-gray-500 uppercase">Origin</h3>
                              <p className="text-sm text-gray-300 mt-1 leading-snug">{activeMeta.origin}</p>
                            </div>
                          )}
                          {activeMeta.insertion && (
                            <div>
                              <h3 className="text-xs font-semibold text-gray-500 uppercase">Insertion</h3>
                              <p className="text-sm text-gray-300 mt-1 leading-snug">{activeMeta.insertion}</p>
                            </div>
                          )}
                          {activeMeta.actions && activeMeta.actions.length > 0 && (
                            <div>
                              <h3 className="text-xs font-semibold text-gray-500 uppercase">Actions</h3>
                              <ul className="list-disc list-outside ml-4 mt-1 text-sm text-gray-300 space-y-0.5">
                                {activeMeta.actions.map((act, i) => <li key={i}>{act}</li>)}
                              </ul>
                            </div>
                          )}
                          {activeMeta.innervation && (
                            <div>
                              <h3 className="text-xs font-semibold text-gray-500 uppercase">Innervation</h3>
                              <p className="text-sm text-gray-300 mt-1 leading-snug">{activeMeta.innervation}</p>
                            </div>
                          )}
                          {activeMeta.relatedStructures && activeMeta.relatedStructures.length > 0 && (
                            <div>
                              <h3 className="text-xs font-semibold text-gray-500 uppercase">Related Structures</h3>
                              <div className="flex flex-wrap gap-2 mt-1.5">
                                {activeMeta.relatedStructures.map((struct, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-gray-800/80 text-gray-300 rounded text-xs border border-gray-700/50">
                                    {struct}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {activeMeta.exercises && activeMeta.exercises.length > 0 && (
                            <div>
                              <h3 className="text-xs font-semibold text-gray-500 uppercase">Training & Exercises</h3>
                              <ul className="list-disc list-outside ml-4 mt-1 text-sm text-gray-300 space-y-0.5">
                                {activeMeta.exercises.map((ex, i) => <li key={i}>{ex}</li>)}
                              </ul>
                            </div>
                          )}
                          {activeMeta.clinicalRelevance && (
                            <div className="pt-3 border-t border-gray-800">
                              <h3 className="text-xs font-semibold text-emerald-500 uppercase">Functional & Movement Role</h3>
                              <p className="text-sm text-gray-300 mt-1 leading-snug italic">{activeMeta.clinicalRelevance}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Detailed functional movement metadata for this specific mesh structure is not yet available in the database.</p>
                      )}

                      <button 
                        onClick={() => {
                          // Trigger a re-focus
                          setCameraFocus('');
                          setTimeout(() => setCameraFocus('mesh'), 10);
                        }}
                        className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-lg transition-colors border border-gray-700"
                      >
                        <Camera className="w-4 h-4" /> Focus Camera
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* OVERLAYS: BIOMECHANICS MODE */}
        {mode === 'biomechanics' && (
          <div className="absolute left-1/2 bottom-20 -translate-x-1/2 z-10 w-96 bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-xl p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex justify-between items-center">
              <span>Kinematic Playback</span>
              <span ref={progressTextRef} className="text-emerald-400 font-mono text-xs">{Math.round(progress * 100)}%</span>
            </h3>
            
            <div className="mb-4">
              <select 
                value={exercise}
                onChange={(e) => {
                  setPlaying(false);
                  setProgress(0);
                  if (progressRef.current) progressRef.current.value = "0";
                  if (progressTextRef.current) progressTextRef.current.innerText = "0%";
                  setExercise(e.target.value);
                }}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-emerald-500 transition-colors">
                <option value="squat">Bodyweight Squat</option>
                <option value="hinge" disabled>Hip Hinge (Coming Soon)</option>
                <option value="lunge" disabled>Forward Lunge (Coming Soon)</option>
                <option value="row" disabled>Bent Over Row (Coming Soon)</option>
              </select>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <button 
                onClick={() => {
                  if (playing) {
                    if (progressRef.current) {
                      setProgress(parseFloat(progressRef.current.value));
                    }
                  }
                  setPlaying(!playing);
                }}
                className="w-10 h-10 rounded-full bg-emerald-500 text-gray-950 flex items-center justify-center hover:bg-emerald-400 transition-colors"
              >
                {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
              </button>
              
              <input 
                ref={progressRef}
                type="range" 
                min="0" max="1" step="0.01" 
                defaultValue={progress}
                onChange={(e) => {
                  setPlaying(false);
                  setProgress(parseFloat(e.target.value));
                }}
                className="flex-1 accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-800 pt-3">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#aa22ff]" /> Eccentric (Yield)</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ffaa00]" /> Stabilizer</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ff2244]" /> Concentric (Push)</span>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

