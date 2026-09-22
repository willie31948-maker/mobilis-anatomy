import re
import sys

def main():
    with open('src/App.tsx', 'r') as f:
        content = f.read()

    # The useFrames and useEffect block
    pattern = re.compile(r'  useFrame\(\(\) => \{[\s\S]*?\}\);(\s*)useEffect\(\(\) => \{[\s\S]*?\}, \[actions, progress, playing\]\);(\s*)useFrame\(\(state, delta\) => \{[\s\S]*?\}\);', re.MULTILINE)
    
    match = pattern.search(content)
    if not match:
        print("Could not find the useFrame blocks!")
        sys.exit(1)
        
    replacement = """
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
      }
    });
  });"""
    
    content = content.replace(match.group(0), replacement)
    
    with open('src/App.tsx', 'w') as f:
        f.write(content)
        
    print("Fixed useFrame blocks.")

main()
