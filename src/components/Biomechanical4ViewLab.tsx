import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, OrbitControls, Environment, ContactShadows, Center } from '@react-three/drei';
import * as THREE from 'three';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Grid,
  Eye,
  Sliders,
  Compass,
  ArrowUpRight,
  Layers,
  Activity,
  CheckCircle2,
  ChevronRight,
  Info,
} from 'lucide-react';
import { BiomechanicalRigOverlay } from './BiomechanicalRigOverlay';
import { isRogueMeshBiomechanics } from '../App';

interface Biomechanical4ViewLabProps {
  onClose?: () => void;
}

// Single MoCap Skeleton Viewport
function MoCapSkeletonViewport({
  timeOverride,
  playing = true,
  cameraPosition = [0, 1.0, 2.5],
  target = [0, 0.85, 0],
  allowOrbit = true,
  showMarkers = true,
  showAxes = true,
  showForcePlates = true,
  showWorldAxes = true,
  showCoM = true,
  showMuscleGlow = true,
  currentProgress = 0,
}: {
  timeOverride?: number; // 0 to 1 progress freeze
  playing?: boolean;
  cameraPosition?: [number, number, number];
  target?: [number, number, number];
  allowOrbit?: boolean;
  showMarkers?: boolean;
  showAxes?: boolean;
  showForcePlates?: boolean;
  showWorldAxes?: boolean;
  showCoM?: boolean;
  showMuscleGlow?: boolean;
  currentProgress?: number;
}) {
  const { scene, animations } = useGLTF('/models/squat_clean.glb');
  const { actions, mixer } = useAnimations(animations, scene);
  const internalProgressRef = useRef(0);

  // Clean rogue meshes
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh && isRogueMeshBiomechanics(child.name)) {
        child.visible = false;
        child.scale.set(0.0001, 0.0001, 0.0001);
        return;
      }

      if (child.isMesh) {
        if (!child.userData.origMat) {
          child.material = child.material.clone();
          child.userData.origMat = child.material.clone();
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.roughness = 0.35;
          mat.metalness = 0.15;
          mat.color.setHex(0xe5e7eb); // sleek bone off-white
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  useEffect(() => {
    const action = actions['Squat'] || actions['mixamo.com'] || Object.values(actions)[0];
    if (!action) return;

    action.reset().play();
    if (timeOverride !== undefined) {
      action.paused = true;
      action.time = timeOverride * action.getClip().duration;
    } else {
      action.paused = !playing;
    }
  }, [timeOverride, playing, actions]);

  useFrame((_, delta) => {
    if (timeOverride !== undefined) {
      const action = actions['Squat'] || actions['mixamo.com'] || Object.values(actions)[0];
      if (action) {
        action.paused = true;
        action.time = timeOverride * action.getClip().duration;
      }
      return;
    }

    if (mixer && playing) {
      mixer.update(delta);
      const action = actions['Squat'] || actions['mixamo.com'] || Object.values(actions)[0];
      if (action) {
        internalProgressRef.current = (action.time / action.getClip().duration) % 1;
      }
    }

    // Muscle load visualization
    if (showMuscleGlow) {
      const prog = timeOverride !== undefined ? timeOverride : internalProgressRef.current;
      scene.traverse((child: any) => {
        if (child.isMesh && child.userData.origMat) {
          const mat = child.material as THREE.MeshStandardMaterial;
          const name = child.name.toLowerCase();
          const isPrimeMover = /quad|glute|femor|vastus|gastro/.test(name);
          if (isPrimeMover) {
            if (prog < 0.5) {
              mat.emissive.setHex(0x9333ea); // eccentric purple
              mat.emissiveIntensity = 0.35 + prog * 0.4;
            } else {
              mat.emissive.setHex(0xef4444); // concentric red
              mat.emissiveIntensity = 0.7 - (prog - 0.5) * 0.5;
            }
          } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      });
    }
  });

  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 4, 3]} intensity={2.2} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={1.5} color="#93c5fd" />
      <directionalLight position={[0, -1, 2]} intensity={0.6} color="#c084fc" />

      <Center position={[0, 0, 0]}>
        <primitive object={scene} />
        <BiomechanicalRigOverlay
          scene={scene}
          visible={showMarkers}
          showAxes={showAxes}
          showForcePlates={showForcePlates}
          showWorldAxes={showWorldAxes}
        />
      </Center>

      {/* Center of Mass (CoM) Projection */}
      {showCoM && (
        <group position={[0, 0.82, 0]}>
          <mesh>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshStandardMaterial color="#eab308" emissive="#ca8a04" emissiveIntensity={0.8} />
          </mesh>
          {/* Vertical plumb line to ground */}
          <line>
            <bufferGeometry
              attach="geometry"
              onUpdate={(geom) => {
                const positions = new Float32Array([0, 0, 0, 0, -0.82, 0]);
                geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
              }}
            />
            <lineDashedMaterial color="#eab308" dashSize={0.04} gapSize={0.02} />
          </line>
          {/* Ground Projection Target */}
          <mesh position={[0, -0.81, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.02, 0.05, 32]} />
            <meshBasicMaterial color="#eab308" transparent opacity={0.8} />
          </mesh>
        </group>
      )}

      {/* Lab Biomechanical Floor Grid */}
      <gridHelper args={[3.2, 16, '#4f46e5', '#1e293b']} position={[0, -0.005, 0]} />

      <ContactShadows position={[0, 0, 0]} opacity={0.65} blur={1.5} scale={2.4} far={1.0} color="#000000" />

      {allowOrbit && (
        <OrbitControls
          makeDefault
          target={target}
          minDistance={0.8}
          maxDistance={4.0}
          maxPolarAngle={Math.PI / 2 + 0.05}
        />
      )}
      <Environment preset="city" environmentIntensity={0.3} />
    </>
  );
}

export function Biomechanical4ViewLab({ onClose }: Biomechanical4ViewLabProps) {
  const [viewMode, setViewMode] = useState<'4view' | 'single'>('4view');
  const [singleCameraPreset, setSingleCameraPreset] = useState<'anterior' | 'sagittal' | 'posterior' | 'isometric'>('isometric');

  // Overlays
  const [showMarkers, setShowMarkers] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [showForcePlates, setShowForcePlates] = useState(true);
  const [showWorldAxes, setShowWorldAxes] = useState(true);
  const [showCoM, setShowCoM] = useState(true);
  const [showMuscleGlow, setShowMuscleGlow] = useState(true);

  // Playback for single view / synchronized 4-view
  const [playing, setPlaying] = useState(true);
  const [scrubber, setScrubber] = useState(0.5);

  const getCameraConfig = (preset: string): { pos: [number, number, number]; target: [number, number, number] } => {
    switch (preset) {
      case 'anterior':
        return { pos: [0, 0.9, 2.5], target: [0, 0.85, 0] };
      case 'sagittal':
        return { pos: [2.5, 0.9, 0], target: [0, 0.85, 0] };
      case 'posterior':
        return { pos: [0, 0.9, -2.5], target: [0, 0.85, 0] };
      case 'isometric':
      default:
        return { pos: [1.6, 1.4, 2.1], target: [0, 0.85, 0] };
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* Top Laboratory Bar */}
      <header className="h-14 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between z-20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-sm">
            3D
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                Biomechanical MoCap Laboratory
              </h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                Helen Hayes / Plug-in Gait Rig
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Optical marker coordinate frames • Ground reaction force vectors • Bilateral force plates
            </p>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('4view')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === '4view'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> 4-Quadrant View (A-B-C-D)
            </button>
            <button
              onClick={() => setViewMode('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'single'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" /> 3D Orbit Free View
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </header>

      {/* Main View Area */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* VIEW MODE 1: 4-QUADRANT VIEW (A, B, C, D) MATCHING USER REFERENCE IMAGE */}
        {viewMode === '4view' ? (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1 bg-slate-900 p-1">
            {/* QUADRANT A: Standing Anterior View */}
            <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
              {/* Badge & Label */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
                <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-bold text-sm flex items-center justify-center shadow-lg shadow-purple-900/40">
                  A
                </span>
                <div className="bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-700">
                  <div className="text-xs font-bold text-white">Anterior Standing</div>
                  <div className="text-[10px] text-cyan-400 font-mono">Frontal (Coronal) Plane • 0% Depth</div>
                </div>
              </div>

              {/* Angle Metrics HUD Overlay */}
              <div className="absolute bottom-3 left-3 z-10 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-300 space-y-0.5 pointer-events-none">
                <div>Knee Valgus/Varus: <span className="text-emerald-400 font-bold">1.2° (Neutral)</span></div>
                <div>Pelvic Tilt: <span className="text-emerald-400 font-bold">0.4°</span></div>
                <div>GRF Symmetry: <span className="text-cyan-400 font-bold">50.2% L / 49.8% R</span></div>
              </div>

              <Canvas
                camera={{ position: [0, 0.9, 2.45], fov: 40 }}
                gl={{ toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
              >
                <MoCapSkeletonViewport
                  timeOverride={0.0}
                  cameraPosition={[0, 0.9, 2.45]}
                  target={[0, 0.85, 0]}
                  allowOrbit={true}
                  showMarkers={showMarkers}
                  showAxes={showAxes}
                  showForcePlates={showForcePlates}
                  showWorldAxes={showWorldAxes}
                  showCoM={showCoM}
                  showMuscleGlow={showMuscleGlow}
                />
              </Canvas>
            </div>

            {/* QUADRANT B: Standing Sagittal View */}
            <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
              {/* Badge & Label */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
                <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-bold text-sm flex items-center justify-center shadow-lg shadow-purple-900/40">
                  B
                </span>
                <div className="bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-700">
                  <div className="text-xs font-bold text-white">Sagittal Standing</div>
                  <div className="text-[10px] text-cyan-400 font-mono">Lateral Profile Plane • 0% Depth</div>
                </div>
              </div>

              {/* Angle Metrics HUD Overlay */}
              <div className="absolute bottom-3 left-3 z-10 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-300 space-y-0.5 pointer-events-none">
                <div>Lumbar Lordosis: <span className="text-emerald-400 font-bold">28.4°</span></div>
                <div>Trunk Lean: <span className="text-emerald-400 font-bold">2.1°</span></div>
                <div>Ankle Neutral: <span className="text-cyan-400 font-bold">90.0°</span></div>
              </div>

              <Canvas
                camera={{ position: [2.45, 0.9, 0], fov: 40 }}
                gl={{ toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
              >
                <MoCapSkeletonViewport
                  timeOverride={0.0}
                  cameraPosition={[2.45, 0.9, 0]}
                  target={[0, 0.85, 0]}
                  allowOrbit={true}
                  showMarkers={showMarkers}
                  showAxes={showAxes}
                  showForcePlates={showForcePlates}
                  showWorldAxes={showWorldAxes}
                  showCoM={showCoM}
                  showMuscleGlow={showMuscleGlow}
                />
              </Canvas>
            </div>

            {/* QUADRANT C: Squat Depth Anterior View */}
            <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
              {/* Badge & Label */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
                <span className="w-7 h-7 rounded-lg bg-cyan-600 text-white font-bold text-sm flex items-center justify-center shadow-lg shadow-cyan-900/40">
                  C
                </span>
                <div className="bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-700">
                  <div className="text-xs font-bold text-white">Anterior Squat Depth</div>
                  <div className="text-[10px] text-cyan-400 font-mono">Frontal (Coronal) Plane • Max Flexion (50%)</div>
                </div>
              </div>

              {/* Angle Metrics HUD Overlay */}
              <div className="absolute bottom-3 left-3 z-10 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-300 space-y-0.5 pointer-events-none">
                <div>Femur Abduction: <span className="text-cyan-400 font-bold">24.6°</span></div>
                <div>Dynamic Valgus: <span className="text-emerald-400 font-bold">&lt; 2.0° (Stable)</span></div>
                <div>Tibial Rotation: <span className="text-slate-300 font-bold">8.5° Ext</span></div>
              </div>

              <Canvas
                camera={{ position: [0, 0.7, 2.45], fov: 40 }}
                gl={{ toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
              >
                <MoCapSkeletonViewport
                  timeOverride={0.48}
                  cameraPosition={[0, 0.7, 2.45]}
                  target={[0, 0.65, 0]}
                  allowOrbit={true}
                  showMarkers={showMarkers}
                  showAxes={showAxes}
                  showForcePlates={showForcePlates}
                  showWorldAxes={showWorldAxes}
                  showCoM={showCoM}
                  showMuscleGlow={showMuscleGlow}
                />
              </Canvas>
            </div>

            {/* QUADRANT D: Squat Depth Sagittal View */}
            <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
              {/* Badge & Label */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
                <span className="w-7 h-7 rounded-lg bg-cyan-600 text-white font-bold text-sm flex items-center justify-center shadow-lg shadow-cyan-900/40">
                  D
                </span>
                <div className="bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-700">
                  <div className="text-xs font-bold text-white">Sagittal Squat Depth</div>
                  <div className="text-[10px] text-cyan-400 font-mono">Lateral Profile Plane • Max Flexion (50%)</div>
                </div>
              </div>

              {/* Angle Metrics HUD Overlay */}
              <div className="absolute bottom-3 left-3 z-10 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-300 space-y-0.5 pointer-events-none">
                <div>Knee Flexion: <span className="text-cyan-400 font-bold">114.8°</span></div>
                <div>Hip Flexion: <span className="text-cyan-400 font-bold">102.3°</span></div>
                <div>Dorsiflexion: <span className="text-emerald-400 font-bold">28.5°</span></div>
                <div>Trunk Angle: <span className="text-amber-400 font-bold">42.1°</span></div>
              </div>

              <Canvas
                camera={{ position: [2.45, 0.7, 0], fov: 40 }}
                gl={{ toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
              >
                <MoCapSkeletonViewport
                  timeOverride={0.48}
                  cameraPosition={[2.45, 0.7, 0]}
                  target={[0, 0.65, 0]}
                  allowOrbit={true}
                  showMarkers={showMarkers}
                  showAxes={showAxes}
                  showForcePlates={showForcePlates}
                  showWorldAxes={showWorldAxes}
                  showCoM={showCoM}
                  showMuscleGlow={showMuscleGlow}
                />
              </Canvas>
            </div>
          </div>
        ) : (
          /* VIEW MODE 2: SINGLE 3D INTERACTIVE ORBIT VIEW */
          <div className="w-full h-full relative bg-slate-950">
            {/* Camera angle presets */}
            <div className="absolute top-4 left-4 z-10 flex bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 shadow-xl gap-1">
              {(['isometric', 'anterior', 'sagittal', 'posterior'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSingleCameraPreset(preset)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                    singleCameraPreset === preset
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Interactive Single 3D Canvas */}
            <Canvas
              camera={{
                position: getCameraConfig(singleCameraPreset).pos,
                fov: 40,
              }}
              gl={{ toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
            >
              <MoCapSkeletonViewport
                playing={playing}
                cameraPosition={getCameraConfig(singleCameraPreset).pos}
                target={getCameraConfig(singleCameraPreset).target}
                allowOrbit={true}
                showMarkers={showMarkers}
                showAxes={showAxes}
                showForcePlates={showForcePlates}
                showWorldAxes={showWorldAxes}
                showCoM={showCoM}
                showMuscleGlow={showMuscleGlow}
              />
            </Canvas>
          </div>
        )}
      </div>

      {/* Bottom Control Deck */}
      <footer className="h-16 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between z-20 shrink-0">
        {/* Overlay Feature Toggles */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Overlays:</span>
          
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showMarkers}
              onChange={(e) => setShowMarkers(e.target.checked)}
              className="accent-cyan-500 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-400" /> Retro-Markers</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showAxes}
              onChange={(e) => setShowAxes(e.target.checked)}
              className="accent-purple-500 rounded cursor-pointer"
            />
            <span>Joint Triad Axes (X/Y/Z)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showForcePlates}
              onChange={(e) => setShowForcePlates(e.target.checked)}
              className="accent-purple-500 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500" /> Force Plates & GRF</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showWorldAxes}
              onChange={(e) => setShowWorldAxes(e.target.checked)}
              className="accent-blue-500 rounded cursor-pointer"
            />
            <span>Lab Origin Tripod</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showCoM}
              onChange={(e) => setShowCoM(e.target.checked)}
              className="accent-amber-500 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" /> Center of Mass (CoM)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showMuscleGlow}
              onChange={(e) => setShowMuscleGlow(e.target.checked)}
              className="accent-rose-500 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /> Muscle Glow</span>
          </label>
        </div>

        {/* Legend / Info */}
        <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-red-400 font-bold">X: Mediolateral</span>
            <span className="text-emerald-400 font-bold">Y: Anteroposterior</span>
            <span className="text-blue-400 font-bold">Z: Vertical</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
