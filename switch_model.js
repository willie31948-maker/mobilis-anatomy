const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// replace squat_sync with squat_interactive
code = code.replace(/useGLTF\('\/squat_sync.glb'\)/g, "useGLTF('/squat_interactive.glb')");
code = code.replace(/useGLTF.preload\('\/squat_sync.glb'\)/g, "useGLTF.preload('/squat_interactive.glb')");

// Also change the action played to specifically 'squat' instead of first key
code = code.replace(
    /const actionName = Object.keys\(actions\)\[0\];/g,
    "const actionName = 'squat'; // Object.keys(actions)[0];"
);

fs.writeFileSync('src/App.tsx', code);
console.log("Switched to squat_interactive.glb");
