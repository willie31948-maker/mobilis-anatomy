import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, useAnimations, ContactShadows, Center } from '@react-three/drei';
import * as THREE from 'three';
import { Play, Pause, FastForward, Rewind, Info, Layers, Activity, Search, Camera, ClipboardList, Plus, Trash2, AlertCircle, FileText, X, CheckCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AnatomyMetadata, anatomyRegistry, normalizeAnatomyKey, getAnatomyData } from './data/anatomyData';
import { AssessmentState, PainSite } from './types/rehab';

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
function AtlasModel({ activeLayer, systems, selectedId, onSelect, onFocusMesh, activePainSites, onHover }: {
  activeLayer: number,
  systems: Record<string, boolean>,
  selectedId: string | null,
  onSelect: (id: string | null) => void,
  onFocusMesh: (pos: THREE.Vector3 | null) => void,
  activePainSites: PainSite[],
  onHover: (meshName: string | null) => void
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
            mat.emissiveIntensity = 0.5;
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
function BiomechanicsModel({ progress, playing }: {
  progress: number,
  playing: boolean
}) {
  const { scene, animations } = useGLTF('/squat_sync.glb');
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

  useFrame(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        if (isRogueMeshBiomechanics(child.name)) {
          child.visible = false;
          child.raycast = () => null;
          return;
        }

        const id = normalizeAnatomyKey(child.name);
        const isBone = getSystem(child.name) === 'skeleton';
        
        child.visible = true;
        child.raycast = () => null; // disable selection in biomechanics

        const mat = child.material as THREE.MeshStandardMaterial;
        mat.roughness = 0.5;
        mat.metalness = 0.1;

        if (isBone) {
          mat.color.setHex(0xd0cbbd);
          mat.emissive.setHex(0x000000);
        } else {
          mat.color.setHex(0x5a5560); 
          
          const isExtensor = ['gluteus_maximus', 'rectus_femoris', 'vastus_lateralis', 'vastus_medialis', 'soleus', 'gastrocnemius'].includes(id);
          const isFlexor = ['tibialis_anterior', 'psoas_major', 'iliacus'].includes(id);
          const isHamstring = ['biceps_femoris', 'semitendinosus'].includes(id);
          const isCore = ['transversus_abdominis', 'rectus_abdominis', 'obliquus_externus'].includes(id);

          if (progress < 0.5) {
            if (isExtensor) {
              mat.emissive.setHex(0xaa22ff);
              mat.emissiveIntensity = 0.4 + (progress * 0.4);
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
              mat.emissiveIntensity = 0.8 - ((progress - 0.5) * 0.4);
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
      }
    });
  });

  useEffect(() => {
    const actionName = Object.keys(actions)[0];
    const action = actions[actionName];
    if (!action) return;

    action.play();
    if (!playing) {
      action.paused = true;
      action.time = progress * action.getClip().duration;
    } else {
      action.paused = false;
    }
  }, [actions, progress, playing]);

  useFrame((state, delta) => {
    if (mixer && mixer.update) {
      mixer.update(delta);
    }
  });

  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

useGLTF.preload('/squat_sync.glb');

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
        lower: { target: new THREE.Vector3(0, 0.45, 0), pos: new THREE.Vector3(0, 0.5, 1.4) }
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
  const [mode, setMode] = useState<'assess' | 'anatomy' | 'exercise' | 'programme' | 'saved'>('assess');
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

  // Assessment State
  const [assessment, setAssessment] = useState<AssessmentState>({
    isAssessmentMode: false,
    mapMode: '2D',
    bodyMapSide: 'Front',
    safetyAnswers: {},
    activePainSites: [],
    provocativeMovement: null,
    painPhase: null,
    irritability: null,
    romStatus: '',
    strengthRating: '',
    clinicalNotes: '',
    showFullReport: false
  });

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

  return (
    <div className="w-screen h-screen bg-[#111827] flex flex-col font-sans text-gray-100 overflow-hidden relative">
      {/* HEADER */}
      <header className="w-full z-20 bg-[#151b23] border-b border-gray-800 flex flex-col pt-4 shadow-sm">
        <div className="px-6 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">Mobilis</h1>
          <span className="text-gray-500 text-sm">movement assessment & corrective exercise — prototype</span>
        </div>
        
        <nav className="flex gap-8 px-6 mt-6">
          {['Assess', 'Anatomy', 'Exercise library', 'Programme', 'Saved'].map(tab => {
            const key = tab === 'Exercise library' ? 'exercise' : tab.toLowerCase();
            return (
              <button 
                key={key}
                onClick={() => setMode(key as any)}
                className={cn(
                  "pb-3 text-sm transition-all border-b-2",
                  mode === key 
                    ? "border-emerald-500 text-emerald-400 font-semibold" 
                    : "border-transparent text-gray-400 hover:text-gray-300 font-medium"
                )}
              >
                {tab}
              </button>
            )
          })}
        </nav>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative flex flex-col">
        {mode === 'assess' && assessment.mapMode === '2D' && (
          <div className="flex-1 p-6 overflow-y-auto w-full max-w-7xl mx-auto flex flex-col gap-6 bg-[#111827]">
            
            {/* Disclaimer Banner */}
            <div className="bg-[#2d2416]/40 border border-[#b45309]/50 rounded-lg p-4 text-sm text-[#fdba74]">
              This tool <strong className="font-semibold text-white">interprets what you report</strong> and returns ranked possibilities with its reasoning. It does not diagnose. Anything painful, worsening or unexplained needs a physiotherapist or doctor.
            </div>

            <div className="flex gap-6 flex-1 min-h-[500px]">
              {/* Left Column: Safety Screen */}
              <div className="flex-[3] bg-[#1a222e] border border-gray-800 rounded-xl p-6 overflow-y-auto shadow-lg">
                <h2 className="text-lg font-bold text-white mb-2">1. Safety screen</h2>
                <p className="text-sm text-gray-400 mb-6">Answer honestly. Any "yes" stops the assessment and sends you to a clinician — that is the correct outcome, not a failure of the app.</p>
                
                <div className="space-y-5">
                  {safetyQuestions.map((q, i) => (
                    <label key={i} className="flex items-start gap-4 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={!!assessment.safetyAnswers[i]}
                        onChange={(e) => setAssessment(a => ({...a, safetyAnswers: {...a.safetyAnswers, [i]: e.target.checked}}))}
                        className="mt-1 w-4 h-4 rounded border-gray-700 bg-gray-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900" 
                      />
                      <span className="text-sm text-gray-300 group-hover:text-gray-100 transition-colors leading-relaxed">{q}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Right Column: Body Map */}
              <div className="flex-[2] bg-[#1a222e] border border-gray-800 rounded-xl p-6 flex flex-col shadow-lg">
                <h2 className="text-lg font-bold text-white mb-4">Body map</h2>
                
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setAssessment(a => ({...a, mapMode: '2D'}))} className="flex-1 py-1.5 text-sm font-medium border border-emerald-500/50 bg-[#1f2937]/50 text-emerald-400 rounded-md">2D map</button>
                  <button onClick={() => setAssessment(a => ({...a, mapMode: '3D'}))} className="flex-1 py-1.5 text-sm font-medium border border-gray-700 bg-transparent text-gray-400 hover:text-gray-300 rounded-md transition-colors">3D anatomy</button>
                </div>

                <div className="flex gap-2 mb-8">
                  <button onClick={() => setAssessment(a => ({...a, bodyMapSide: 'Front'}))} className={cn("flex-1 py-1.5 text-sm font-medium border rounded-md transition-colors", assessment.bodyMapSide === 'Front' ? "border-emerald-500/50 text-emerald-400" : "border-gray-700 text-gray-400 hover:border-gray-600")}>Front</button>
                  <button onClick={() => setAssessment(a => ({...a, bodyMapSide: 'Back'}))} className={cn("flex-1 py-1.5 text-sm font-medium border rounded-md transition-colors", assessment.bodyMapSide === 'Back' ? "border-emerald-500/50 text-emerald-400" : "border-gray-700 text-gray-400 hover:border-gray-600")}>Back</button>
                </div>

                {/* SVG 2D Map Placeholder */}
                <div className="flex-1 flex justify-center items-center opacity-70">
                  <svg viewBox="0 0 200 400" className="w-full max-w-[200px] h-full overflow-visible">
                    <circle cx="100" cy="30" r="20" fill="none" stroke="#4b5563" strokeWidth="2"/>
                    <path d="M60,60 L140,60 L150,110 L50,110 Z" fill="none" stroke="#4b5563" strokeWidth="2"/>
                    <path d="M50,115 L150,115 L135,190 L65,190 Z" fill="none" stroke="#4b5563" strokeWidth="2"/>
                    <path d="M65,195 L135,195 L125,230 L75,230 Z" fill="none" stroke="#4b5563" strokeWidth="2"/>
                    <path d="M40,65 L60,120 L30,120 Z" fill="none" stroke="#4b5563" strokeWidth="2"/>
                    <path d="M160,65 L140,120 L170,120 Z" fill="none" stroke="#4b5563" strokeWidth="2"/>
                    <circle cx="35" cy="130" r="15" fill="#374151" stroke="#4b5563" strokeWidth="2"/>
                    <circle cx="165" cy="130" r="15" fill="#374151" stroke="#4b5563" strokeWidth="2"/>
                    <rect x="25" y="150" width="20" height="60" fill="none" stroke="#4b5563" strokeWidth="2"/>
                    <rect x="155" y="150" width="20" height="60" fill="none" stroke="#4b5563" strokeWidth="2"/>
                    <rect x="70" y="240" width="25" height="70" fill="none" stroke="#4b5563" strokeWidth="2"/>
                    <rect x="105" y="240" width="25" height="70" fill="none" stroke="#4b5563" strokeWidth="2"/>
                    <rect x="70" y="320" width="25" height="60" fill="none" stroke="#4b5563" strokeWidth="2"/>
                    <rect x="105" y="320" width="25" height="60" fill="none" stroke="#4b5563" strokeWidth="2"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3D CANVAS */}
        {(mode === 'anatomy' || mode === 'exercise' || (mode === 'assess' && assessment.mapMode === '3D')) && (
          <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(circle at 50% 45%, #162032 0%, #080c14 100%)' }}>
            <Canvas 
            camera={{ position: [0, 1.1, 2.6], fov: 40 }}
            gl={{ toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
          >
            <ambientLight intensity={1.0} />
            <directionalLight position={[2, 3, 3]} intensity={2.0} castShadow />
            <directionalLight position={[-2, 1, 1]} intensity={1.2} color="#e0e8ff" />
            <directionalLight position={[0, 3, -3]} intensity={2.5} color="#60a5fa" />
            
            <group position={[0, 0.9, 0]}>
              {(mode === 'anatomy' || mode === 'assess') ? (
                <AtlasModel 
                  activeLayer={activeLayer}
                  systems={systems}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onFocusMesh={handleMeshFocus}
                  activePainSites={assessment.activePainSites}
                  onHover={setInspectedMesh}
                />
              ) : (
                <BiomechanicsModel 
                  progress={progress}
                  playing={playing}
                />
              )}
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
        </div>
        )}

        {/* Camera Focus HUD (Bottom Center for better layout with sidebars) */}
        {(mode === 'anatomy' || mode === 'exercise' || (mode === 'assess' && assessment.mapMode === '3D')) && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
            {inspectedMesh && (
              <div className="bg-gray-900/90 text-gray-300 text-xs px-3 py-1 rounded-md border border-gray-700 shadow-md flex items-center gap-2">
                <Search className="w-3 h-3 text-emerald-400" />
                <span className="font-mono">{inspectedMesh}</span>
                <span className="text-gray-500">({getSystem(inspectedMesh)})</span>
              </div>
            )}
            <div className="flex bg-gray-900/80 backdrop-blur-md rounded-full border border-gray-700 shadow-xl p-1 gap-1">
              <button onClick={() => { setFocusPoint(null); setCameraFocus('full'); }} className={cn("px-4 py-1.5 rounded-full text-xs font-semibold transition-colors", cameraFocus === 'full' ? 'bg-emerald-500 text-gray-950' : 'text-gray-300 hover:text-white')}>Full Body</button>
              <button onClick={() => { setFocusPoint(null); setCameraFocus('torso'); }} className={cn("px-4 py-1.5 rounded-full text-xs font-semibold transition-colors", cameraFocus === 'torso' ? 'bg-emerald-500 text-gray-950' : 'text-gray-300 hover:text-white')}>Torso / Core</button>
              <button onClick={() => { setFocusPoint(null); setCameraFocus('lower'); }} className={cn("px-4 py-1.5 rounded-full text-xs font-semibold transition-colors", cameraFocus === 'lower' ? 'bg-emerald-500 text-gray-950' : 'text-gray-300 hover:text-white')}>Lower Limbs</button>
            </div>
          </div>
        )}

        {/* OVERLAYS: EXPLORER MODE */}
        {mode === 'anatomy' && (
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
                          <h3 className="text-xs font-semibold text-emerald-500 uppercase">Clinical Relevance</h3>
                          <p className="text-sm text-gray-300 mt-1 leading-snug italic">{activeMeta.clinicalRelevance}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Detailed clinical metadata for this specific mesh structure is not yet available in the database.</p>
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

        {/* OVERLAYS: BIOMECHANICS MODE */}
        {mode === 'exercise' && (
          <div className="absolute left-1/2 bottom-20 -translate-x-1/2 z-10 w-96 bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-xl p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex justify-between items-center">
              <span>Kinematic Playback</span>
              <span className="text-emerald-400 font-mono text-xs">{Math.round(progress * 100)}%</span>
            </h3>
            
            <div className="flex items-center gap-4 mb-4">
              <button 
                onClick={() => setPlaying(!playing)}
                className="w-10 h-10 rounded-full bg-emerald-500 text-gray-950 flex items-center justify-center hover:bg-emerald-400 transition-colors"
              >
                {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
              </button>
              
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={progress}
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
        {/* OVERLAYS: ASSESSMENT 3D MODE */}
        {mode === 'assess' && assessment.mapMode === '3D' && (
          <>
            {/* 3D Map Header Controls */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
              <button onClick={() => setAssessment(a => ({...a, mapMode: '2D'}))} className="px-6 py-2 text-sm font-medium border border-gray-700 bg-gray-900/80 text-gray-300 hover:text-white rounded-md shadow-lg backdrop-blur-md transition-colors">Return to 2D Intake</button>
              <button onClick={() => setAssessment(a => ({...a, mapMode: '3D'}))} className="px-6 py-2 text-sm font-medium border border-emerald-500/50 bg-gray-900/80 text-emerald-400 rounded-md shadow-lg backdrop-blur-md">3D anatomy</button>
            </div>

            {/* Left Sidebar: Assessment State */}
            <div className="absolute left-6 top-6 z-10 w-80 flex flex-col gap-4 max-h-[85vh]">
              <div className="bg-gray-900/90 backdrop-blur-md border border-purple-900/50 rounded-xl p-4 shadow-xl overflow-y-auto">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardList className="text-purple-400 w-5 h-5" />
                  <h3 className="text-sm font-semibold text-gray-100 uppercase tracking-wider">Clinical Intake</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase mb-1.5 block">Provocative Movement</label>
                    <select 
                      value={assessment.provocativeMovement || ''} 
                      onChange={e => setAssessment(a => ({...a, provocativeMovement: e.target.value as any || null}))}
                      className="w-full bg-gray-950 border border-gray-800 rounded-md p-2 text-sm text-gray-200 outline-none focus:border-purple-500"
                    >
                      <option value="">Select Movement...</option>
                      <option value="Squat">Squat</option>
                      <option value="Hinge">Hinge</option>
                      <option value="Lunge">Lunge</option>
                      <option value="Overhead">Overhead</option>
                      <option value="Rotation">Rotation</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase mb-1.5 block">Pain Phase</label>
                    <select 
                      value={assessment.painPhase || ''} 
                      onChange={e => setAssessment(a => ({...a, painPhase: e.target.value as any || null}))}
                      className="w-full bg-gray-950 border border-gray-800 rounded-md p-2 text-sm text-gray-200 outline-none focus:border-purple-500"
                    >
                      <option value="">Select Phase...</option>
                      <option value="Eccentric (Descent)">Eccentric (Descent)</option>
                      <option value="Isometric (Bottom)">Isometric (Bottom)</option>
                      <option value="Concentric (Ascent)">Concentric (Ascent)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase mb-1.5 block">Irritability</label>
                    <div className="flex gap-2">
                      {['Low', 'Moderate', 'High'].map(level => (
                        <button 
                          key={level}
                          onClick={() => setAssessment(a => ({...a, irritability: level as any}))}
                          className={cn(
                            "flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors",
                            assessment.irritability === level 
                              ? (level === 'High' ? 'bg-red-900/40 border-red-500/50 text-red-200' : level === 'Moderate' ? 'bg-orange-900/40 border-orange-500/50 text-orange-200' : 'bg-emerald-900/40 border-emerald-500/50 text-emerald-200')
                              : "bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700"
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Pain Sites List */}
              {assessment.activePainSites.length > 0 && (
                <div className="bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-xl p-4 shadow-xl overflow-y-auto flex-1">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Reported Pain Sites</h3>
                  <div className="space-y-3">
                    {assessment.activePainSites.map(site => (
                      <div key={site.id} className="bg-gray-950 border border-gray-800 rounded-lg p-3 relative group">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-200 capitalize leading-tight">{site.name}</h4>
                            <span className="text-xs text-gray-500">{site.system}</span>
                          </div>
                          <button onClick={() => removePainSite(site.id)} className="text-gray-600 hover:text-red-400 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-400">Severity</span>
                          <input 
                            type="range" min="1" max="10" step="1" 
                            value={site.severity}
                            onChange={(e) => updatePainSiteSeverity(site.id, parseInt(e.target.value))}
                            className="flex-1 accent-red-500"
                          />
                          <span className={cn(
                            "text-xs font-bold w-4 text-center",
                            site.severity >= 8 ? "text-red-400" : site.severity >= 4 ? "text-orange-400" : "text-emerald-400"
                          )}>{site.severity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={() => setAssessment(a => ({...a, showFullReport: true}))}
                className="mt-1 w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-purple-400 text-sm font-semibold py-3 rounded-xl transition-colors border border-purple-900/50 shadow-lg"
              >
                <FileText className="w-4 h-4" /> Open Full Assessment
              </button>
            </div>

            {/* Right Sidebar: Add Site Panel */}
            {selectedId && (
              <div className="absolute right-6 top-6 z-10 w-80 bg-gray-900/90 backdrop-blur-md border border-purple-900/30 rounded-xl overflow-hidden shadow-2xl transition-all animate-in slide-in-from-right-4 fade-in">
                <div className="p-4 border-b border-gray-800 bg-purple-950/20">
                  <div className="text-xs font-medium text-purple-400 uppercase tracking-wider mb-1">Select Structure</div>
                  <h2 className="text-lg font-bold text-white capitalize">{displayTitle}</h2>
                  <p className="text-sm text-gray-400 capitalize">{getSystem(selectedId)} System</p>
                </div>
                
                <div className="p-4">
                  {assessment.activePainSites.some(p => p.id === selectedId) ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-950/30 p-3 rounded-lg border border-emerald-900/50">
                      <AlertCircle className="w-4 h-4" />
                      Structure recorded in intake.
                    </div>
                  ) : (
                    <button 
                      onClick={addPainSite}
                      className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors shadow-lg shadow-purple-900/20"
                    >
                      <Plus className="w-4 h-4" /> Add to Pain Intake
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* FULL ASSESSMENT REPORT MODAL */}
      {assessment.showFullReport && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-gray-950/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-purple-900/50 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-full overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-bold text-white tracking-tight">Full Clinical Assessment Report</h2>
              </div>
              <button onClick={() => setAssessment(a => ({...a, showFullReport: false}))} className="text-gray-400 hover:text-white p-1 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-8 overflow-y-auto flex-1 grid grid-cols-2 gap-10">
              
              {/* Left Column: Subjective & Findings */}
              <div className="space-y-8">
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2 mb-4">Subjective & Triggers</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                      <span className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Provocative Movement</span>
                      <span className="text-sm font-medium text-gray-200">{assessment.provocativeMovement || 'Not recorded'}</span>
                    </div>
                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                      <span className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Pain Phase</span>
                      <span className="text-sm font-medium text-gray-200">{assessment.painPhase || 'Not recorded'}</span>
                    </div>
                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 col-span-2 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Irritability Level</span>
                        <span className="text-sm font-medium text-gray-200">{assessment.irritability || 'Not recorded'}</span>
                      </div>
                      {assessment.irritability && (
                        <div className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase",
                          assessment.irritability === 'High' ? "bg-red-900/50 text-red-400" :
                          assessment.irritability === 'Moderate' ? "bg-orange-900/50 text-orange-400" :
                          "bg-emerald-900/50 text-emerald-400"
                        )}>
                          {assessment.irritability}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2 mb-4">
                    Identified Pain Sites <span className="text-purple-400 ml-1">({assessment.activePainSites.length})</span>
                  </h3>
                  {assessment.activePainSites.length === 0 ? (
                    <p className="text-sm text-gray-500 italic p-4 bg-gray-950 rounded-xl border border-gray-800/50">No specific anatomical sites recorded. Use the 3D model to select structures.</p>
                  ) : (
                    <div className="space-y-3">
                      {assessment.activePainSites.map(site => (
                        <div key={site.id} className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex justify-between items-center">
                          <div>
                            <div className="text-sm font-bold text-gray-200 capitalize mb-0.5">{site.name}</div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{site.system} System</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Severity</div>
                            <div className={cn("text-base font-black font-mono", site.severity >= 8 ? "text-red-400" : site.severity >= 4 ? "text-orange-400" : "text-emerald-400")}>
                              {site.severity} <span className="text-gray-600 text-xs font-sans font-medium">/10</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Right Column: Objective & Plan */}
              <div className="space-y-8 flex flex-col">
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2 mb-4">Objective Findings</h3>
                  <div className="space-y-5">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Range of Motion (ROM)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. WNL, limited flexion..."
                        value={assessment.romStatus || ''}
                        onChange={e => setAssessment(a => ({...a, romStatus: e.target.value}))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Strength & Motor Control</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 4/5 weakness in abduction, compensatory shrugging..."
                        value={assessment.strengthRating || ''}
                        onChange={e => setAssessment(a => ({...a, strengthRating: e.target.value}))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-gray-700"
                      />
                    </div>
                  </div>
                </section>

                <section className="flex-1 flex flex-col min-h-[250px]">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2 mb-4">Clinical Notes & Plan</h3>
                  <textarea 
                    placeholder="Enter comprehensive assessment findings, functional goals, and treatment plan here..."
                    value={assessment.clinicalNotes || ''}
                    onChange={e => setAssessment(a => ({...a, clinicalNotes: e.target.value}))}
                    className="w-full flex-1 bg-gray-950 border border-gray-800 rounded-lg p-4 text-sm text-gray-200 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none placeholder:text-gray-700 leading-relaxed"
                  />
                </section>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-800 bg-gray-900/80 flex justify-end gap-4">
              <button onClick={() => setAssessment(a => ({...a, showFullReport: false}))} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={() => setAssessment(a => ({...a, showFullReport: false}))} className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-900/30 flex items-center gap-2 hover:shadow-purple-900/50">
                <CheckCircle className="w-4 h-4" /> Save Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
