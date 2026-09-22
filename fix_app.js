const fs = require('fs');
let backup = fs.readFileSync('tmp_App.tsx', 'utf8');
let current = fs.readFileSync('src/App.tsx', 'utf8');

// The regex replaced everything from the first useFrame in AtlasModel to the end of BiomechanicsModel.
// Let's grab AtlasModel from backup
const atlasStart = backup.indexOf('function AtlasModel');
const atlasEnd = backup.indexOf('function BiomechanicsModel');
const atlasCode = backup.substring(atlasStart, atlasEnd);

// Let's grab BiomechanicsModel from backup
const biomechStart = backup.indexOf('function BiomechanicsModel');
const biomechEnd = backup.indexOf('function CameraAnimator');
const biomechCode = backup.substring(biomechStart, biomechEnd);

// And we need to place them back into current
// Currently, current starts with `function AtlasModel` normally, but inside it has the mangled useFrame.
const currentAtlasStart = current.indexOf('function AtlasModel');
const currentCameraAnimatorStart = current.indexOf('function CameraAnimator');

if (currentAtlasStart !== -1 && currentCameraAnimatorStart !== -1) {
    const fixedCode = current.substring(0, currentAtlasStart) + atlasCode + biomechCode + current.substring(currentCameraAnimatorStart);
    fs.writeFileSync('src/App.tsx', fixedCode);
    console.log("Recovered the components!");
} else {
    console.log("Could not find boundaries.");
}
