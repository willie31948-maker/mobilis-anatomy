const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldSetup = `        if (!child.userData.originalMaterial) {
          child.material = child.material.clone();
          child.userData.originalMaterial = child.material.clone();
          
          const layer = getLayer(child.name);`;

const newSetup = `        if (!child.userData.originalMaterial) {
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
          
          const layer = getLayer(child.name);`;

code = code.replace(oldSetup, newSetup);

const oldUseFrameColor = `        const mat = child.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x5a5560);
        
        let isExtensor = false;`;

const newUseFrameColor = `        const mat = child.material as THREE.MeshStandardMaterial;
        
        let isExtensor = false;`;

code = code.replace(oldUseFrameColor, newUseFrameColor);

fs.writeFileSync('src/App.tsx', code);
console.log("Colors fixed!");
