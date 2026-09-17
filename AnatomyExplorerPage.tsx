import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SynchronizedAnatomyViewer } from './SynchronizedAnatomyViewer';

export default function AnatomyExplorerPage() {
  const [activeMuscle, setActiveMuscle] = useState<string | null>(null);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas camera={{ position: [0, 1, 3], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} />
        <SynchronizedAnatomyViewer 
          selectedMuscle={activeMuscle} 
          onSelectMuscle={setActiveMuscle} 
        />
        <OrbitControls makeDefault />
      </Canvas>

      {/* Existing App Muscle Info Overlay */}
      {activeMuscle && (
        <div className="muscle-info-card">
          <h2>{activeMuscle.replace(/_/g, ' ')}</h2>
          <p>Contraction Type: Dynamic Eccentric / Concentric</p>
          <button onClick={() => setActiveMuscle(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
