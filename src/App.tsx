import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, useAnimations, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Play, Pause, FastForward, Rewind, Info, Layers, Activity } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// DATA & METADATA
// ============================================================================
type AnatomyMetadata = {
  id: string;
  name: string;
  latin: string;
  layer: number; // 0=Bone, 1=Deep, 2=Intermediate, 3=Superficial
  origin: string;
  insertion: string;
  action: string;
  innervation: string;
};

const anatomyData: Record<string, AnatomyMetadata> = {
  // Skeleton / Layer 0
  femur: { id: 'femur', name: 'Femur', latin: 'Os femoris', layer: 0, origin: '-', insertion: '-', action: 'Structural support', innervation: '-' },
  pelvis: { id: 'pelvis', name: 'Pelvis', latin: 'Pelvis', layer: 0, origin: '-', insertion: '-', action: 'Core stability', innervation: '-' },
  tibia: { id: 'tibia', name: 'Tibia', latin: 'Os tibiae', layer: 0, origin: '-', insertion: '-', action: 'Structural support', innervation: '-' },
  fibula: { id: 'fibula', name: 'Fibula', latin: 'Os fibulae', layer: 0, origin: '-', insertion: '-', action: 'Structural support', innervation: '-' },
  spine: { id: 'spine', name: 'Spine', latin: 'Columna vertebralis', layer: 0, origin: '-', insertion: '-', action: 'Core axis', innervation: '-' },
  skull: { id: 'skull', name: 'Skull', latin: 'Cranium', layer: 0, origin: '-', insertion: '-', action: 'Protection', innervation: '-' },
  ribcage: { id: 'ribcage', name: 'Ribcage', latin: 'Thorax', layer: 0, origin: '-', insertion: '-', action: 'Protection', innervation: '-' },
  
  // Muscles / Layers 1-3
  gluteus_maximus: { id: 'gluteus_maximus', name: 'Gluteus Maximus', latin: 'M. gluteus maximus', layer: 3, origin: 'Ilium, sacrum, coccyx', insertion: 'Gluteal tuberosity, IT band', action: 'Hip extension, external rotation', innervation: 'Inferior gluteal nerve' },
  gluteus_medius: { id: 'gluteus_medius', name: 'Gluteus Medius', latin: 'M. gluteus medius', layer: 2, origin: 'Ilium', insertion: 'Greater trochanter', action: 'Hip abduction, stabilization', innervation: 'Superior gluteal nerve' },
  rectus_femoris: { id: 'rectus_femoris', name: 'Rectus Femoris', latin: 'M. rectus femoris', layer: 3, origin: 'AIIS', insertion: 'Tibial tuberosity (via patellar tendon)', action: 'Hip flexion, knee extension', innervation: 'Femoral nerve' },
  vastus_lateralis: { id: 'vastus_lateralis', name: 'Vastus Lateralis', latin: 'M. vastus lateralis', layer: 3, origin: 'Greater trochanter, linea aspera', insertion: 'Tibial tuberosity', action: 'Knee extension', innervation: 'Femoral nerve' },
  vastus_medialis: { id: 'vastus_medialis', name: 'Vastus Medialis', latin: 'M. vastus medialis', layer: 3, origin: 'Linea aspera', insertion: 'Tibial tuberosity', action: 'Knee extension', innervation: 'Femoral nerve' },
  biceps_femoris: { id: 'biceps_femoris', name: 'Biceps Femoris', latin: 'M. biceps femoris', layer: 3, origin: 'Ischial tuberosity (long head), linea aspera (short head)', insertion: 'Fibular head', action: 'Hip extension, knee flexion', innervation: 'Sciatic nerve' },
  semitendinosus: { id: 'semitendinosus', name: 'Semitendinosus', latin: 'M. semitendinosus', layer: 3, origin: 'Ischial tuberosity', insertion: 'Medial surface of tibia (pes anserinus)', action: 'Hip extension, knee flexion', innervation: 'Sciatic nerve' },
  gastrocnemius: { id: 'gastrocnemius', name: 'Gastrocnemius', latin: 'M. gastrocnemius', layer: 3, origin: 'Femoral condyles', insertion: 'Calcaneus (via Achilles tendon)', action: 'Plantar flexion, knee flexion', innervation: 'Tibial nerve' },
  soleus: { id: 'soleus', name: 'Soleus', latin: 'M. soleus', layer: 2, origin: 'Tibia and fibula', insertion: 'Calcaneus', action: 'Plantar flexion', innervation: 'Tibial nerve' },
  tibialis_anterior: { id: 'tibialis_anterior', name: 'Tibialis Anterior', latin: 'M. tibialis anterior', layer: 3, origin: 'Lateral surface of tibia', insertion: 'Medial cuneiform, base of 1st metatarsal', action: 'Dorsiflexion, inversion', innervation: 'Deep fibular nerve' },
  psoas_major: { id: 'psoas_major', name: 'Psoas Major', latin: 'M. psoas major', layer: 1, origin: 'T12-L5 vertebrae', insertion: 'Lesser trochanter', action: 'Hip flexion', innervation: 'Lumbar plexus' },
  iliacus: { id: 'iliacus', name: 'Iliacus', latin: 'M. iliacus', layer: 1, origin: 'Iliac fossa', insertion: 'Lesser trochanter', action: 'Hip flexion', innervation: 'Femoral nerve' },
  transversus_abdominis: { id: 'transversus_abdominis', name: 'Transversus Abdominis', latin: 'M. transversus abdominis', layer: 1, origin: 'Inguinal ligament, iliac crest, costal cartilages', insertion: 'Linea alba, pubic crest', action: 'Compresses abdomen, core stability', innervation: 'Lower intercostal nerves' },
  rectus_abdominis: { id: 'rectus_abdominis', name: 'Rectus Abdominis', latin: 'M. rectus abdominis', layer: 3, origin: 'Pubic crest, pubic symphysis', insertion: 'Xiphoid process, costal cartilages 5-7', action: 'Trunk flexion', innervation: 'Thoraco-abdominal nerves' },
  obliquus_externus: { id: 'obliquus_externus', name: 'External Oblique', latin: 'M. obliquus externus abdominis', layer: 3, origin: 'Lower 8 ribs', insertion: 'Linea alba, pubic tubercle, iliac crest', action: 'Trunk flexion, rotation', innervation: 'Lower intercostal nerves' },
};

function getMuscleId(meshName: string): string {
  // Strip sides and bone prefixes
  return meshName.replace(/^(bone__)?/, '').replace(/__(l|r|c)(_\d+)?$/, '');
}

export function isBoneMesh(name: string) {
  if (!name) return false;
  if (name.startsWith('bone__')) return true;
  const lower = name.toLowerCase();
  const skeletalKeywords = [
    'vertebra', 'sacrum', 'coccyx', 'spine',
    'rib', 'sternum', 'xiphoid',
    'hip bone', 'ilium', 'ischium', 'pubis', 'pelvis',
    'femur', 'patella', 'tibia', 'fibula',
    'calcaneus', 'cuboid', 'cuneiform', 'metatarsal', 'navicular', 'talus', 'sesamoid',
    'humerus', 'radius', 'ulna', 'clavicle', 'scapula',
    'scaphoid', 'lunate', 'triquetrum', 'pisiform', 'trapezium', 'trapezoid', 'capitate', 'hamate', 'metacarpal',
    'parietal', 'frontal', 'occipital', 'temporal', 'mandible', 'maxilla', 'zygomatic', 'skull', 'hyoid',
    'skeletal', 'joints.g'
  ];
  if (skeletalKeywords.some(k => lower.includes(k))) return true;
  if (lower.includes('phalanx') && (lower.includes('foot') || lower.includes('hand'))) return true;
  return false;
}

export function isRogueMesh(name: string) {
  const lower = name.toLowerCase();
  return ['disc', 'nucleus', 'ligament', 'costal', 'cartilage'].some(k => lower.includes(k));
}

function getLayer(meshName: string): number {
  if (meshName.toLowerCase().includes('mixamorig')) return 0;
  if (isBoneMesh(meshName)) return 0;
  
  const id = getMuscleId(meshName);
  return anatomyData[id]?.layer ?? 2; // Default to layer 2 if unknown
}

// ============================================================================
// COMPONENT: ANATOMY MODEL
// ============================================================================
function AnatomicalModel({
  mode,
  activeLayer,
  progress,
  playing,
  onSelect,
  selectedId
}: {
  mode: 'explorer' | 'biomechanics',
  activeLayer: number,
  progress: number,
  playing: boolean,
  onSelect: (id: string | null) => void,
  selectedId: string | null
}) {
  const { scene, animations } = useGLTF('/squat_sync.glb');
  const { actions, mixer } = useAnimations(animations, scene);
  
  // Hide Rogue Meshes
  useMemo(() => {
    scene.traverse((child: any) => {
      // 1. Rogue Mesh Filtering
      if (child.isMesh && isRogueMesh(child.name)) {
        child.visible = false;
        child.position.set(0, 0, 0);
        child.scale.set(0.0001, 0.0001, 0.0001);
        child.updateMatrixWorld(true);
        return;
      }
    });
  }, [scene]);

  // Clone materials on mount to avoid mutating shared references
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        // Fix up normal computation if needed
        if (child.geometry && !child.geometry.hasAttribute('normal')) {
          child.geometry.computeVertexNormals();
        }
        
        // Ensure unique material
        if (!child.userData.originalMaterial) {
          child.material = child.material.clone();
          child.userData.originalMaterial = child.material.clone();
          
          // Visual Clipping & Z-Fighting Mitigation (Depth Offsets)
          const layer = getLayer(child.name);
          if (layer > 0) {
            // Muscles: Pull surface slightly forward in depth buffer
            child.material.polygonOffset = true;
            child.material.polygonOffsetFactor = -1.0;
            child.material.polygonOffsetUnits = -4.0;
          } else {
            // Bones: Standard depth handling
            child.material.depthTest = true;
            child.material.depthWrite = true;
            child.material.polygonOffset = false;
          }
        }
        
        // Basic mesh setup
        child.frustumCulled = false;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  // Handle Mode & Layers
  useFrame(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        if (isRogueMesh(child.name)) {
          child.visible = false;
          child.raycast = () => null;
          return;
        }

        const id = getMuscleId(child.name);
        const layer = getLayer(child.name);
        const isBone = layer === 0;
        
        // Visibility based on layer slider in explorer mode
        if (mode === 'explorer') {
          // If we hide it, we must ensure it still doesn't mess with Bounds. But Bounds only observes layout bounds changes, not simple visibility toggles during useFrame if it doesn't scale.
          child.visible = layer <= activeLayer;
        } else {
          // Biomechanics mode: show bones and all muscles (or maybe just superficially?)
          child.visible = true; 
        }

        // Raycast masking: Disable raycasting for hidden meshes, or if they are bones
        child.raycast = child.visible && !isBone ? THREE.Mesh.prototype.raycast : () => null;

        // Material Updates
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.roughness = 0.5;
        mat.metalness = 0.1;

        if (mode === 'explorer') {
          // Explorer styling
          if (isBone) {
            mat.color.setHex(0xe8e5d9); // Bone color
            mat.emissive.setHex(0x000000);
          } else {
            mat.color.setHex(0xa64b4b); // Default muscle color
            
            // Hover/Selection highlight
            if (id === selectedId) {
              mat.emissive.setHex(0x00ffff);
              mat.emissiveIntensity = 0.4;
            } else {
              mat.emissive.setHex(0x000000);
              mat.emissiveIntensity = 0.0;
            }
          }
        } else if (mode === 'biomechanics') {
          // Biomechanics styling (Heatmaps based on squat phase)
          if (isBone) {
            mat.color.setHex(0xd0cbbd);
            mat.emissive.setHex(0x000000);
          } else {
            mat.color.setHex(0x5a5560); // Darker base for heatmap contrast
            
            // Phase logic based on progress (0.0 -> 0.5 descent, 0.5 -> 1.0 ascent)
            // Agonists for extension (Glutes, Quads)
            const isExtensor = ['gluteus_maximus', 'rectus_femoris', 'vastus_lateralis', 'vastus_medialis', 'soleus', 'gastrocnemius'].includes(id);
            // Antagonists/Flexors (Hamstrings, Tibialis Anterior, Psoas)
            const isFlexor = ['tibialis_anterior', 'psoas_major', 'iliacus'].includes(id);
            const isHamstring = ['biceps_femoris', 'semitendinosus'].includes(id);
            const isCore = ['transversus_abdominis', 'rectus_abdominis', 'obliquus_externus'].includes(id);

            // Eccentric Descent (0 - 0.5)
            if (progress < 0.5) {
              if (isExtensor) {
                mat.emissive.setHex(0xaa22ff); // Eccentric yielding (purple/blue)
                mat.emissiveIntensity = 0.4 + (progress * 0.4);
              } else if (isFlexor) {
                mat.emissive.setHex(0xffaa00); // Concentric pull (amber)
                mat.emissiveIntensity = 0.3;
              } else if (isCore || isHamstring) {
                mat.emissive.setHex(0xffaa00); // Synergist/Stabilizer
                mat.emissiveIntensity = 0.2;
              } else {
                mat.emissive.setHex(0x000000);
              }
            } else {
              // Concentric Ascent (0.5 - 1.0)
              if (isExtensor) {
                mat.emissive.setHex(0xff2244); // Concentric push (red)
                mat.emissiveIntensity = 0.8 - ((progress - 0.5) * 0.4);
              } else if (isFlexor) {
                mat.emissive.setHex(0x000000); // Relaxing
                mat.emissiveIntensity = 0.0;
              } else if (isCore || isHamstring) {
                mat.emissive.setHex(0xffaa00); // Synergist/Stabilizer
                mat.emissiveIntensity = 0.3;
              } else {
                mat.emissive.setHex(0x000000);
              }
            }
          }
        }
      }
    });
  });

  // Handle Animation Playback & Scrubbing
  useEffect(() => {
    const actionName = Object.keys(actions)[0]; // Use first available animation
    const action = actions[actionName];
    if (!action) return;

    if (mode === 'explorer') {
      action.play();
      action.paused = true;
      action.time = 0;
    } else {
      action.play();
      if (!playing) {
        action.paused = true;
        action.time = progress * action.getClip().duration;
      } else {
        action.paused = false;
      }
    }
  }, [mode, actions, progress, playing]);

  // Sync external progress state if playing
  useFrame(() => {
    if (mode === 'biomechanics' && playing) {
      const actionName = Object.keys(actions)[0];
      const action = actions[actionName];
      if (action && action.getClip()) {
        const duration = action.getClip().duration;
        // This won't update React state to avoid re-renders, but keeps the animation flowing.
        // We handle the slider sync in a more complex way if needed, but for now R3F drives it.
      }
    }
  });

  return (
    <primitive 
      object={scene} 
      onPointerOver={(e: any) => {
        if (mode === 'explorer') {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        if (mode === 'explorer') {
          document.body.style.cursor = 'auto';
        }
      }}
      onClick={(e: any) => {
        if (mode === 'explorer') {
          e.stopPropagation();
          onSelect(getMuscleId(e.object.name));
        }
      }}
      onPointerMissed={() => onSelect(null)}
    />
  );
}

useGLTF.preload('/squat_sync.glb');

// ============================================================================
// COMPONENT: CAMERA ANIMATOR
// ============================================================================
function CameraAnimator({ focus }: { focus: string }) {
  const { camera, controls } = useThree();
  const [animating, setAnimating] = useState(false);
  const prevFocus = useRef(focus);

  useEffect(() => {
    if (focus !== prevFocus.current) {
      setAnimating(true);
      prevFocus.current = focus;
    }
  }, [focus]);

  useFrame((state, delta) => {
    if (!controls || !animating) return;
    const ctrl = controls as any;
    
    // Use a smooth, framerate-independent lerp factor
    const speed = 6 * delta; 
    
    const targets: Record<string, { target: THREE.Vector3, pos: THREE.Vector3 }> = {
      full: { target: new THREE.Vector3(0, 0.9, 0), pos: new THREE.Vector3(0, 1.1, 2.6) },
      torso: { target: new THREE.Vector3(0, 1.25, 0), pos: new THREE.Vector3(0, 1.3, 1.25) },
      lower: { target: new THREE.Vector3(0, 0.45, 0), pos: new THREE.Vector3(0, 0.5, 1.4) }
    };

    const dest = targets[focus] || targets.full;
    
    // Always update controls.target first so we pivot correctly around the focal point
    ctrl.target.lerp(dest.target, speed);
    camera.position.lerp(dest.pos, speed);
    
    ctrl.update();

    // Stop animating once we reach the destination to return manual control to the user
    if (camera.position.distanceTo(dest.pos) < 0.05 && ctrl.target.distanceTo(dest.target) < 0.05) {
      setAnimating(false);
    }
  });

  // Also stop animating immediately if the user interacts (scrolls, drags)
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
  const [mode, setMode] = useState<'explorer' | 'biomechanics'>('explorer');
  const [activeLayer, setActiveLayer] = useState<number>(3); // 0=Bone, 1, 2, 3
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cameraFocus, setCameraFocus] = useState<string>('full'); // full, torso, lower
  
  // Biomechanics State
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);

  // Derive active metadata
  const activeMeta = selectedId ? anatomyData[selectedId] || { 
    name: selectedId.replace(/_/g, ' '), 
    latin: 'Unknown', layer: 2, origin: 'N/A', insertion: 'N/A', action: 'N/A', innervation: 'N/A' 
  } : null;

  return (
    <div className="w-screen h-screen bg-gray-950 flex flex-col font-sans text-gray-100 overflow-hidden relative">
      {/* HEADER */}
      <header className="h-16 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <Activity className="text-emerald-400 w-6 h-6" />
          <h1 className="font-semibold text-lg tracking-wide text-white">Mobilis 3D</h1>
        </div>
        
        <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
          <button
            onClick={() => { setMode('explorer'); setPlaying(false); }}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              mode === 'explorer' ? "bg-gray-800 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
            )}
          >
            <Layers className="w-4 h-4 inline-block mr-2" />
            Layered Explorer
          </button>
          <button
            onClick={() => { setMode('biomechanics'); setSelectedId(null); }}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              mode === 'biomechanics' ? "bg-gray-800 text-emerald-400 shadow-sm" : "text-gray-400 hover:text-gray-200"
            )}
          >
            <Activity className="w-4 h-4 inline-block mr-2" />
            Biomechanics
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative">
        {/* 3D CANVAS */}
        <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(circle at 50% 45%, #162032 0%, #080c14 100%)' }}>
          <Canvas camera={{ position: [0, 1.1, 2.6], fov: 40 }}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[2, 3, 3]} intensity={1.2} castShadow />
            <directionalLight position={[-2, 1, 1]} intensity={0.5} color="#e0e8ff" />
            <directionalLight position={[0, 3, -3]} intensity={1.5} color="#60a5fa" />
            
            <group position={[0, 0.9, 0]}>
              <AnatomicalModel 
                mode={mode} 
                activeLayer={activeLayer} 
                progress={progress} 
                playing={playing} 
                onSelect={setSelectedId} 
                selectedId={selectedId} 
              />
            </group>
            
            <CameraAnimator focus={cameraFocus} />

            <ContactShadows position={[0, 0, 0]} opacity={0.65} blur={1.8} scale={2.5} far={1.2} resolution={512} color="#000000" />
            
            <OrbitControls 
              makeDefault 
              target={[0, 0.9, 0]} 
              minDistance={0.8} 
              maxDistance={4.5}
              maxPolarAngle={Math.PI / 2 + 0.05}
            />
            <Environment preset="city" environmentIntensity={0.25} />
          </Canvas>
        </div>

        {/* Camera Focus HUD */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex bg-gray-900/80 backdrop-blur-md rounded-full border border-gray-700 shadow-xl p-1 gap-1">
          <button onClick={() => setCameraFocus('full')} className={cn("px-4 py-1.5 rounded-full text-xs font-semibold transition-colors", cameraFocus === 'full' ? 'bg-emerald-500 text-gray-950' : 'text-gray-300 hover:text-white')}>Full Body</button>
          <button onClick={() => setCameraFocus('torso')} className={cn("px-4 py-1.5 rounded-full text-xs font-semibold transition-colors", cameraFocus === 'torso' ? 'bg-emerald-500 text-gray-950' : 'text-gray-300 hover:text-white')}>Torso / Core</button>
          <button onClick={() => setCameraFocus('lower')} className={cn("px-4 py-1.5 rounded-full text-xs font-semibold transition-colors", cameraFocus === 'lower' ? 'bg-emerald-500 text-gray-950' : 'text-gray-300 hover:text-white')}>Lower Limbs</button>
        </div>

        {/* OVERLAYS: EXPLORER MODE */}
        {mode === 'explorer' && (
          <>
            {/* Layer Controls */}
            <div className="absolute left-6 top-6 z-10 w-64 bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-xl p-4 shadow-xl">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Depth Layer</h3>
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

            {/* Metadata Drawer */}
            {activeMeta && (
              <div className="absolute right-6 top-6 z-10 w-80 bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-xl overflow-hidden shadow-2xl transition-all animate-in slide-in-from-right-4 fade-in">
                <div className="bg-emerald-950/40 border-b border-emerald-900/30 p-4">
                  <h2 className="text-lg font-bold text-white capitalize">{activeMeta.name}</h2>
                  <p className="text-xs italic text-emerald-400">{activeMeta.latin}</p>
                </div>
                <div className="p-4 space-y-4 text-sm">
                  <div>
                    <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Origin</span>
                    <span className="text-gray-200">{activeMeta.origin}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Insertion</span>
                    <span className="text-gray-200">{activeMeta.insertion}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</span>
                    <span className="text-gray-200">{activeMeta.action}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Innervation</span>
                    <span className="text-gray-200">{activeMeta.innervation}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* OVERLAYS: BIOMECHANICS MODE */}
        {mode === 'biomechanics' && (
          <>
            {/* Playback Controls */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-[500px] bg-gray-900/95 backdrop-blur-md border border-gray-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <button 
                  onClick={() => setPlaying(!playing)}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 transition-colors"
                >
                  {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                </button>
                
                <div className="flex-1 flex flex-col justify-center">
                  <input 
                    type="range" 
                    min="0" max="1" step="0.001"
                    value={progress}
                    onChange={(e) => {
                      setPlaying(false);
                      setProgress(parseFloat(e.target.value));
                    }}
                    className="w-full accent-emerald-500 h-1.5 cursor-pointer"
                  />
                  <div className="flex justify-between mt-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <span>Standing</span>
                    <span>Deep Squat</span>
                    <span>Return</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Biomechanics HUD */}
            <div className="absolute right-6 top-6 z-10 w-72 bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-xl p-5 shadow-xl">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">Kinematic State</h3>
              
              <div className="space-y-4">
                <div>
                  <span className="block text-xs font-medium text-gray-500 mb-1">Current Phase</span>
                  <div className={cn(
                    "px-3 py-1.5 rounded text-sm font-bold border",
                    progress < 0.5 
                      ? "bg-purple-950/30 text-purple-400 border-purple-900/50" 
                      : "bg-red-950/30 text-red-400 border-red-900/50"
                  )}>
                    {progress < 0.5 ? "Eccentric Descent" : "Concentric Ascent"}
                  </div>
                </div>
                
                <div className="pt-2 border-t border-gray-800">
                  <span className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Activation Legend</span>
                  <ul className="space-y-2 text-xs">
                    <li className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[#ff2244] shadow-[0_0_8px_#ff2244]" />
                      <span className="text-gray-300">Agonist (Concentric)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[#aa22ff] shadow-[0_0_8px_#aa22ff]" />
                      <span className="text-gray-300">Agonist (Eccentric)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-[#ffaa00] shadow-[0_0_8px_#ffaa00]" />
                      <span className="text-gray-300">Synergist / Stabilizer</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
