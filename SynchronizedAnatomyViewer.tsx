import React, { useEffect, useState, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

interface ModelProps {
  onSelectMuscle: (muscleName: string | null) => void;
  selectedMuscle: string | null;
  isPaused?: boolean;
}

export function SynchronizedAnatomyViewer({ onSelectMuscle, selectedMuscle, isPaused = false }: ModelProps) {
  const group = useRef<THREE.Group>(null!);
  const { scene, materials, animations } = useGLTF('/squat_interactive-transformed.glb') as any;
  const { actions, names } = useAnimations(animations, group);
  const [hovered, setHovered] = useState<string | null>(null);

  // 1. Play the synchronized squat animation
  useEffect(() => {
    if (names.length > 0) {
      const action = actions[names[0]];
      action?.reset().fadeIn(0.2).play();
      if (isPaused) {
        action?.pause();
      }
    }
  }, [actions, names, isPaused]);

  // 2. Raycast handler for muscle selection
  const handleClick = (e: any) => {
    e.stopPropagation(); // Prevents clicks passing through to bones behind
    const objectName = e.object.name;

    // Filter out clicks on bones or the rig
    if (!objectName.includes('mixamorig') && !objectName.toLowerCase().includes('bone')) {
      onSelectMuscle(objectName);
    }
  };

  // 3. Dynamic highlighting for active / hovered muscles during motion
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isSkinnedMesh && child.material) {
        // Clone material instance so highlights don't bleed across all meshes
        if (!child.userData.originalEmissive) {
          child.material = child.material.clone();
          child.userData.originalEmissive = child.material.emissive?.clone() || new THREE.Color(0x000000);
        }

        if (child.name === selectedMuscle) {
          child.material.emissive.setHex(0x00ff88); // Bright highlight for selected muscle
          child.material.emissiveIntensity = 0.6;
        } else if (child.name === hovered) {
          child.material.emissive.setHex(0x3399ff); // Subtle hover glow
          child.material.emissiveIntensity = 0.3;
        } else {
          child.material.emissive.copy(child.userData.originalEmissive);
          child.material.emissiveIntensity = 0;
        }
      }
    });
  }, [selectedMuscle, hovered, scene]);

  return (
    <primitive
      ref={group}
      object={scene}
      onClick={handleClick}
      onPointerOver={(e: any) => {
        e.stopPropagation();
        setHovered(e.object.name);
      }}
      onPointerOut={() => setHovered(null)}
      onPointerMissed={() => onSelectMuscle(null)} // Deselect when clicking empty space
    />
  );
}

useGLTF.preload('/squat_interactive-transformed.glb');
