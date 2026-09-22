import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

export interface MarkerDef {
  id: string;
  name: string;
  parentBone: string;
  offset: [number, number, number]; // local offset in bone space
  colorType: 'cyan' | 'red';
  axes?: boolean;
}

// Full body optical motion-capture marker set modelled after Vicon Plug-in Gait / Helen Hayes marker set
export const MOCAP_MARKERS: MarkerDef[] = [
  // Head / Cranial (Front, Top, Back, Temples)
  { id: 'LFHD', name: 'Left Front Head', parentBone: 'mixamorig:Head', offset: [0.065, 0.08, 0.08], colorType: 'cyan', axes: true },
  { id: 'RFHD', name: 'Right Front Head', parentBone: 'mixamorig:Head', offset: [-0.065, 0.08, 0.08], colorType: 'cyan', axes: true },
  { id: 'LBHD', name: 'Left Back Head', parentBone: 'mixamorig:Head', offset: [0.065, 0.08, -0.07], colorType: 'red' },
  { id: 'RBHD', name: 'Right Back Head', parentBone: 'mixamorig:Head', offset: [-0.065, 0.08, -0.07], colorType: 'red' },
  { id: 'TOP_HEAD', name: 'Vertex Top Head', parentBone: 'mixamorig:HeadTop_End', offset: [0, 0.03, 0], colorType: 'cyan', axes: true },
  { id: 'CHIN', name: 'Gnathion / Chin', parentBone: 'mixamorig:Head', offset: [0, -0.07, 0.09], colorType: 'red' },

  // Spine & Thorax / Ribcage
  { id: 'C7', name: '7th Cervical Vertebra', parentBone: 'mixamorig:Neck', offset: [0, 0.02, -0.09], colorType: 'red', axes: true },
  { id: 'T10', name: '10th Thoracic Vertebra', parentBone: 'mixamorig:Spine1', offset: [0, 0.02, -0.11], colorType: 'red' },
  { id: 'CLAV', name: 'Suprasternal Clavicle Notch', parentBone: 'mixamorig:Spine2', offset: [0, 0.09, 0.09], colorType: 'cyan', axes: true },
  { id: 'STRN', name: 'Xiphoid Process Sternum', parentBone: 'mixamorig:Spine1', offset: [0, 0.04, 0.12], colorType: 'cyan', axes: true },
  { id: 'BAK', name: 'Right Scapular Spine', parentBone: 'mixamorig:RightShoulder', offset: [-0.06, 0.02, -0.08], colorType: 'red' },
  { id: 'L_SCAP', name: 'Left Scapular Spine', parentBone: 'mixamorig:LeftShoulder', offset: [0.06, 0.02, -0.08], colorType: 'red' },

  // Pelvis / Hips (ASIS, PSIS, Sacrum)
  { id: 'LASI', name: 'Left Anterior Superior Iliac Spine', parentBone: 'mixamorig:Hips', offset: [0.12, 0.02, 0.09], colorType: 'cyan', axes: true },
  { id: 'RASI', name: 'Right Anterior Superior Iliac Spine', parentBone: 'mixamorig:Hips', offset: [-0.12, 0.02, 0.09], colorType: 'cyan', axes: true },
  { id: 'LPSI', name: 'Left Posterior Superior Iliac Spine', parentBone: 'mixamorig:Hips', offset: [0.07, 0.03, -0.09], colorType: 'red' },
  { id: 'RPSI', name: 'Right Posterior Superior Iliac Spine', parentBone: 'mixamorig:Hips', offset: [-0.07, 0.03, -0.09], colorType: 'red' },
  { id: 'SACR', name: 'Sacral Base Wand', parentBone: 'mixamorig:Hips', offset: [0, 0.05, -0.11], colorType: 'cyan', axes: true },

  // Left Upper Limb (Shoulder, Arm, Elbow, Forearm, Wrist, Hand)
  { id: 'LSHO', name: 'Left Acromion Shoulder', parentBone: 'mixamorig:LeftShoulder', offset: [0.08, 0.05, 0], colorType: 'cyan', axes: true },
  { id: 'LUPA', name: 'Left Upper Arm Wand', parentBone: 'mixamorig:LeftArm', offset: [0.07, 0.12, 0.02], colorType: 'red', axes: true },
  { id: 'LELB', name: 'Left Lateral Epicondyle Elbow', parentBone: 'mixamorig:LeftForeArm', offset: [0.06, 0.01, -0.02], colorType: 'cyan', axes: true },
  { id: 'LMELB', name: 'Left Medial Epicondyle', parentBone: 'mixamorig:LeftForeArm', offset: [-0.04, 0.01, 0.01], colorType: 'red' },
  { id: 'LFRA', name: 'Left Forearm Wand', parentBone: 'mixamorig:LeftForeArm', offset: [0.06, 0.12, 0.02], colorType: 'red', axes: true },
  { id: 'LWRA', name: 'Left Radial Styloid Wrist', parentBone: 'mixamorig:LeftHand', offset: [0.04, 0.02, 0.02], colorType: 'cyan', axes: true },
  { id: 'LWRB', name: 'Left Ulnar Styloid Wrist', parentBone: 'mixamorig:LeftHand', offset: [-0.04, 0.02, -0.02], colorType: 'red', axes: true },
  { id: 'LFIN', name: 'Left 3rd Metacarpal Hand', parentBone: 'mixamorig:LeftHand', offset: [0, 0.14, 0], colorType: 'cyan', axes: true },
  { id: 'LTHUMB', name: 'Left 1st MCP Joint', parentBone: 'mixamorig:LeftHand', offset: [0.05, 0.07, 0.03], colorType: 'red' },

  // Right Upper Limb
  { id: 'RSHO', name: 'Right Acromion Shoulder', parentBone: 'mixamorig:RightShoulder', offset: [-0.08, 0.05, 0], colorType: 'cyan', axes: true },
  { id: 'RUPA', name: 'Right Upper Arm Wand', parentBone: 'mixamorig:RightArm', offset: [-0.07, 0.12, 0.02], colorType: 'red', axes: true },
  { id: 'RELB', name: 'Right Lateral Epicondyle Elbow', parentBone: 'mixamorig:RightForeArm', offset: [-0.06, 0.01, -0.02], colorType: 'cyan', axes: true },
  { id: 'RMELB', name: 'Right Medial Epicondyle', parentBone: 'mixamorig:RightForeArm', offset: [0.04, 0.01, 0.01], colorType: 'red' },
  { id: 'RFRA', name: 'Right Forearm Wand', parentBone: 'mixamorig:RightForeArm', offset: [-0.06, 0.12, 0.02], colorType: 'red', axes: true },
  { id: 'RWRA', name: 'Right Radial Styloid Wrist', parentBone: 'mixamorig:RightHand', offset: [-0.04, 0.02, 0.02], colorType: 'cyan', axes: true },
  { id: 'RWRB', name: 'Right Ulnar Styloid Wrist', parentBone: 'mixamorig:RightHand', offset: [0.04, 0.02, -0.02], colorType: 'red', axes: true },
  { id: 'RFIN', name: 'Right 3rd Metacarpal Hand', parentBone: 'mixamorig:RightHand', offset: [0, 0.14, 0], colorType: 'cyan', axes: true },
  { id: 'RTHUMB', name: 'Right 1st MCP Joint', parentBone: 'mixamorig:RightHand', offset: [-0.05, 0.07, 0.03], colorType: 'red' },

  // Left Lower Limb (Hip, Thigh, Knee, Shank, Ankle, Foot)
  { id: 'LTHI', name: 'Left Thigh Wand / Wand 1', parentBone: 'mixamorig:LeftUpLeg', offset: [0.08, 0.22, 0.04], colorType: 'red', axes: true },
  { id: 'LTHI_LO', name: 'Left Lower Thigh Wand', parentBone: 'mixamorig:LeftUpLeg', offset: [0.07, 0.35, -0.02], colorType: 'red' },
  { id: 'LKNE', name: 'Left Lateral Epicondyle Knee', parentBone: 'mixamorig:LeftLeg', offset: [0.07, 0.02, 0.01], colorType: 'cyan', axes: true },
  { id: 'LMKNE', name: 'Left Medial Epicondyle Knee', parentBone: 'mixamorig:LeftLeg', offset: [-0.05, 0.02, 0.01], colorType: 'red' },
  { id: 'LTIB', name: 'Left Shank Wand', parentBone: 'mixamorig:LeftLeg', offset: [0.07, 0.22, 0.03], colorType: 'red', axes: true },
  { id: 'LTIB_LO', name: 'Left Distal Shank Wand', parentBone: 'mixamorig:LeftLeg', offset: [0.06, 0.32, -0.02], colorType: 'red' },
  { id: 'LANK', name: 'Left Lateral Malleolus Ankle', parentBone: 'mixamorig:LeftFoot', offset: [0.05, 0.01, -0.02], colorType: 'cyan', axes: true },
  { id: 'LMANK', name: 'Left Medial Malleolus Ankle', parentBone: 'mixamorig:LeftFoot', offset: [-0.04, 0.01, 0.01], colorType: 'red' },
  { id: 'LHEE', name: 'Left Calcaneus Heel', parentBone: 'mixamorig:LeftFoot', offset: [0, -0.02, -0.08], colorType: 'red' },
  { id: 'LTOE', name: 'Left 2nd Metatarsal Head Toe', parentBone: 'mixamorig:LeftToeBase', offset: [0, 0.02, 0.08], colorType: 'cyan', axes: true },
  { id: 'LMT5', name: 'Left 5th Metatarsal Base', parentBone: 'mixamorig:LeftFoot', offset: [0.05, -0.01, 0.04], colorType: 'red' },

  // Right Lower Limb
  { id: 'RTHI', name: 'Right Thigh Wand / Wand 1', parentBone: 'mixamorig:RightUpLeg', offset: [-0.08, 0.22, 0.04], colorType: 'red', axes: true },
  { id: 'RTHI_LO', name: 'Right Lower Thigh Wand', parentBone: 'mixamorig:RightUpLeg', offset: [-0.07, 0.35, -0.02], colorType: 'red' },
  { id: 'RKNE', name: 'Right Lateral Epicondyle Knee', parentBone: 'mixamorig:RightLeg', offset: [-0.07, 0.02, 0.01], colorType: 'cyan', axes: true },
  { id: 'RMKNE', name: 'Right Medial Epicondyle Knee', parentBone: 'mixamorig:RightLeg', offset: [0.05, 0.02, 0.01], colorType: 'red' },
  { id: 'RTIB', name: 'Right Shank Wand', parentBone: 'mixamorig:RightLeg', offset: [-0.07, 0.22, 0.03], colorType: 'red', axes: true },
  { id: 'RTIB_LO', name: 'Right Distal Shank Wand', parentBone: 'mixamorig:RightLeg', offset: [-0.06, 0.32, -0.02], colorType: 'red' },
  { id: 'RANK', name: 'Right Lateral Malleolus Ankle', parentBone: 'mixamorig:RightFoot', offset: [-0.05, 0.01, -0.02], colorType: 'cyan', axes: true },
  { id: 'RMANK', name: 'Right Medial Malleolus Ankle', parentBone: 'mixamorig:RightFoot', offset: [0.04, 0.01, 0.01], colorType: 'red' },
  { id: 'RHEE', name: 'Right Calcaneus Heel', parentBone: 'mixamorig:RightFoot', offset: [0, -0.02, -0.08], colorType: 'red' },
  { id: 'RTOE', name: 'Right 2nd Metatarsal Head Toe', parentBone: 'mixamorig:RightToeBase', offset: [0, 0.02, 0.08], colorType: 'cyan', axes: true },
  { id: 'RMT5', name: 'Right 5th Metatarsal Base', parentBone: 'mixamorig:RightFoot', offset: [-0.05, -0.01, 0.04], colorType: 'red' },
];

interface BiomechanicalRigOverlayProps {
  scene: THREE.Group | THREE.Object3D;
  visible?: boolean;
  showAxes?: boolean;
  showForcePlates?: boolean;
  showWorldAxes?: boolean;
}

export function BiomechanicalRigOverlay({
  scene,
  visible = true,
  showAxes = true,
  showForcePlates = true,
  showWorldAxes = true,
}: BiomechanicalRigOverlayProps) {
  const containerRef = useRef<THREE.Group>(null);
  const markersRef = useRef<{ [id: string]: THREE.Group }>({});

  // Map bones from the scene
  const boneMap = useMemo(() => {
    const map: { [name: string]: THREE.Object3D } = {};
    scene.traverse((child) => {
      if (child.name) {
        map[child.name] = child;
      }
    });
    return map;
  }, [scene]);

  // Update marker positions frame-by-frame as the animation plays
  useFrame(() => {
    if (!visible) return;

    MOCAP_MARKERS.forEach((m) => {
      const bone = boneMap[m.parentBone];
      const markerGroup = markersRef.current[m.id];
      if (bone && markerGroup) {
        const localPos = new THREE.Vector3(...m.offset);
        const worldPos = localPos.applyMatrix4(bone.matrixWorld);
        markerGroup.position.copy(worldPos);
        markerGroup.quaternion.copy(bone.quaternion);
      }
    });
  });

  if (!visible) return null;

  return (
    <group ref={containerRef}>
      {/* 1. MOCAP SPHERICAL RETRO-REFLECTIVE MARKERS */}
      {MOCAP_MARKERS.map((m) => {
        const isCyan = m.colorType === 'cyan';
        const color = isCyan ? '#00e5ff' : '#991b1b'; // bright cyan or deep retro-red/maroon
        const emissive = isCyan ? '#00b4d8' : '#7f1d1d';
        const radius = isCyan ? 0.024 : 0.019; // Joint centers slightly larger

        return (
          <group
            key={m.id}
            ref={(el) => {
              if (el) markersRef.current[m.id] = el;
            }}
          >
            {/* Retro-Reflective Spherical Bead */}
            <mesh castShadow>
              <sphereGeometry args={[radius, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={emissive}
                emissiveIntensity={isCyan ? 0.8 : 0.4}
                roughness={0.2}
                metalness={0.6}
              />
            </mesh>

            {/* Triad Coordinate Axes (Red=X, Green=Y, Blue=Z) */}
            {showAxes && m.axes && (
              <group scale={[0.13, 0.13, 0.13]}>
                {/* X Axis - Red */}
                <line>
                  <bufferGeometry
                    attach="geometry"
                    onUpdate={(geom) => {
                      const positions = new Float32Array([0, 0, 0, 1, 0, 0]);
                      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                    }}
                  />
                  <lineBasicMaterial color="#ef4444" linewidth={2} />
                </line>
                {/* Y Axis - Green */}
                <line>
                  <bufferGeometry
                    attach="geometry"
                    onUpdate={(geom) => {
                      const positions = new Float32Array([0, 0, 0, 0, 1, 0]);
                      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                    }}
                  />
                  <lineBasicMaterial color="#22c55e" linewidth={2} />
                </line>
                {/* Z Axis - Blue */}
                <line>
                  <bufferGeometry
                    attach="geometry"
                    onUpdate={(geom) => {
                      const positions = new Float32Array([0, 0, 0, 0, 0, 1]);
                      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                    }}
                  />
                  <lineBasicMaterial color="#3b82f6" linewidth={2} />
                </line>
              </group>
            )}
          </group>
        );
      })}

      {/* 2. DUAL FORCE PLATES (PURPLE RECTANGULAR PLATFORMS UNDER EACH FOOT) */}
      {showForcePlates && (
        <group position={[0, -0.005, 0]}>
          {/* Left Foot Force Plate */}
          <group position={[0.16, 0, 0.04]}>
            {/* Top Plate Surface */}
            <mesh receiveShadow>
              <boxGeometry args={[0.26, 0.015, 0.44]} />
              <meshStandardMaterial
                color="#4a154b"
                emissive="#2d0a31"
                emissiveIntensity={0.3}
                roughness={0.4}
                metalness={0.5}
              />
            </mesh>
            {/* High-visibility purple neon border */}
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(0.26, 0.015, 0.44)]} />
              <lineBasicMaterial color="#a855f7" linewidth={2} />
            </lineSegments>
            {/* Corner Sensor Pins (Cyan) */}
            {[
              [-0.12, 0.01, -0.2],
              [0.12, 0.01, -0.2],
              [-0.12, 0.01, 0.2],
              [0.12, 0.01, 0.2],
            ].map(([x, y, z], idx) => (
              <mesh key={idx} position={[x, y, z]}>
                <sphereGeometry args={[0.008, 12, 12]} />
                <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.9} />
              </mesh>
            ))}
          </group>

          {/* Right Foot Force Plate */}
          <group position={[-0.16, 0, 0.04]}>
            {/* Top Plate Surface */}
            <mesh receiveShadow>
              <boxGeometry args={[0.26, 0.015, 0.44]} />
              <meshStandardMaterial
                color="#4a154b"
                emissive="#2d0a31"
                emissiveIntensity={0.3}
                roughness={0.4}
                metalness={0.5}
              />
            </mesh>
            {/* High-visibility purple neon border */}
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(0.26, 0.015, 0.44)]} />
              <lineBasicMaterial color="#a855f7" linewidth={2} />
            </lineSegments>
            {/* Corner Sensor Pins (Cyan) */}
            {[
              [-0.12, 0.01, -0.2],
              [0.12, 0.01, -0.2],
              [-0.12, 0.01, 0.2],
              [0.12, 0.01, 0.2],
            ].map(([x, y, z], idx) => (
              <mesh key={idx} position={[x, y, z]}>
                <sphereGeometry args={[0.008, 12, 12]} />
                <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.9} />
              </mesh>
            ))}
          </group>
        </group>
      )}

      {/* 3. GROUND REACTION FORCE (GRF) VECTORS (VERTICAL BLUE ARROWS FROM PLATES) */}
      {showForcePlates && (
        <group>
          {/* Left GRF Vector Arrow */}
          <group position={[0.16, 0.01, 0.04]}>
            {/* Stem */}
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.007, 0.007, 0.44, 16]} />
              <meshStandardMaterial color="#2563eb" emissive="#1d4ed8" emissiveIntensity={0.8} />
            </mesh>
            {/* Arrowhead */}
            <mesh position={[0, 0.47, 0]}>
              <coneGeometry args={[0.024, 0.07, 16]} />
              <meshStandardMaterial color="#3b82f6" emissive="#60a5fa" emissiveIntensity={1.0} />
            </mesh>
          </group>

          {/* Right GRF Vector Arrow */}
          <group position={[-0.16, 0.01, 0.04]}>
            {/* Stem */}
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.007, 0.007, 0.44, 16]} />
              <meshStandardMaterial color="#2563eb" emissive="#1d4ed8" emissiveIntensity={0.8} />
            </mesh>
            {/* Arrowhead */}
            <mesh position={[0, 0.47, 0]}>
              <coneGeometry args={[0.024, 0.07, 16]} />
              <meshStandardMaterial color="#3b82f6" emissive="#60a5fa" emissiveIntensity={1.0} />
            </mesh>
          </group>
        </group>
      )}

      {/* 4. LAB GLOBAL COORDINATE TRIPOD (PROMINENT X-Y-Z AXIS IN CORNER OF FORCE PLATE) */}
      {showWorldAxes && (
        <group position={[-0.42, 0, 0.2]}>
          {/* Origin sphere */}
          <mesh position={[0, 0.02, 0]}>
            <sphereGeometry args={[0.025, 16, 16]} />
            <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.9} />
          </mesh>

          {/* X Axis Arrow (Red, pointing Right/Lateral) */}
          <group>
            <mesh position={[0.16, 0.02, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <cylinderGeometry args={[0.009, 0.009, 0.32, 16]} />
              <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.8} />
            </mesh>
            <mesh position={[0.34, 0.02, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.022, 0.06, 16]} />
              <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.0} />
            </mesh>
            <Text
              position={[0.42, 0.02, 0]}
              fontSize={0.08}
              color="#ef4444"
              anchorX="center"
              anchorY="middle"
            >
              X
            </Text>
          </group>

          {/* Y Axis Arrow (Green, pointing Forward/Anterior) */}
          <group>
            <mesh position={[0, 0.02, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.009, 0.009, 0.32, 16]} />
              <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.8} />
            </mesh>
            <mesh position={[0, 0.02, 0.34]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.022, 0.06, 16]} />
              <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={1.0} />
            </mesh>
            <Text
              position={[0, 0.02, 0.42]}
              fontSize={0.08}
              color="#22c55e"
              anchorX="center"
              anchorY="middle"
            >
              Y
            </Text>
          </group>

          {/* Z Axis Arrow (Blue, pointing Upward/Vertical) */}
          <group>
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.011, 0.011, 0.4, 16]} />
              <meshStandardMaterial color="#2563eb" emissive="#1d4ed8" emissiveIntensity={0.9} />
            </mesh>
            <mesh position={[0, 0.44, 0]}>
              <coneGeometry args={[0.026, 0.07, 16]} />
              <meshStandardMaterial color="#3b82f6" emissive="#60a5fa" emissiveIntensity={1.0} />
            </mesh>
            <Text
              position={[0, 0.54, 0]}
              fontSize={0.11}
              color="#3b82f6"
              anchorX="center"
              anchorY="middle"
            >
              Z
            </Text>
          </group>
        </group>
      )}
    </group>
  );
}
