const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const biomechStart = code.indexOf('function BiomechanicsModel');
const cameraAnimatorStart = code.indexOf('function CameraAnimator');

if (biomechStart !== -1 && cameraAnimatorStart !== -1) {
    let biomechCode = code.substring(biomechStart, cameraAnimatorStart);

    // 1. Update props
    biomechCode = biomechCode.replace(
        /function BiomechanicsModel\(\{\s*progress,\s*playing\s*\}\:\s*\{\s*progress:\s*number,\s*playing:\s*boolean\s*\}\)\s*\{/,
        "function BiomechanicsModel({ progress, playing, setProgress }: { progress: number, playing: boolean, setProgress: (p: number) => void }) {"
    );

    // 2. Update useFrame
    const oldUseFrame = `  useFrame((state, delta) => {
    if (mixer && mixer.update) {
      mixer.update(delta);
    }
  });`;
  
    const newUseFrame = `  useFrame((state, delta) => {
    if (mixer && mixer.update) {
      mixer.update(delta);
    }
    
    let currentProgress = progress;
    const actionName = Object.keys(actions)[0];
    const action = actions[actionName];
    if (action && playing) {
      currentProgress = (action.time / action.getClip().duration) % 1;
      setProgress(currentProgress);
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
        
        const isExtensor = ['gluteus_maximus', 'rectus_femoris', 'vastus_lateralis', 'vastus_medialis', 'soleus', 'gastrocnemius'].includes(id);
        const isFlexor = ['tibialis_anterior', 'psoas_major', 'iliacus'].includes(id);
        const isHamstring = ['biceps_femoris', 'semitendinosus'].includes(id);
        const isCore = ['transversus_abdominis', 'rectus_abdominis', 'obliquus_externus'].includes(id);

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
  });`;

    biomechCode = biomechCode.replace(oldUseFrame, newUseFrame);

    // Remove the old standalone useFrame that colored muscles (it was just doing it based on 'progress' prop)
    const oldMuscleColorFrameStart = biomechCode.indexOf('  useFrame(() => {\n    scene.traverse(');
    const oldMuscleColorFrameEnd = biomechCode.indexOf('  useEffect(() => {\n    const actionName', oldMuscleColorFrameStart);
    
    if (oldMuscleColorFrameStart !== -1 && oldMuscleColorFrameEnd !== -1) {
       biomechCode = biomechCode.substring(0, oldMuscleColorFrameStart) + biomechCode.substring(oldMuscleColorFrameEnd);
    }
    
    code = code.substring(0, biomechStart) + biomechCode + code.substring(cameraAnimatorStart);
    
    // 3. Update the component usage
    code = code.replace(
        /<BiomechanicsModel \s*progress=\{progress\}\s*playing=\{playing\}\s*\/>/m,
        `<BiomechanicsModel \n                  progress={progress}\n                  playing={playing}\n                  setProgress={setProgress}\n                />`
    );

    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed Biomechanics properly!");
} else {
    console.log("Could not find boundaries.");
}
