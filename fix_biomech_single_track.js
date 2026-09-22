const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Point to the new model
code = code.replace(/\/squat_interactive\.glb/g, '/models/squat_clean.glb');

// 2. Rewrite the effects in BiomechanicsModel
const oldEffectsPattern = /  useEffect\(\(\) => \{\n    const actionName = exercise;\n    const action = actions\[actionName\];[\s\S]*?  \}, \[actions, progress, playing, exercise\]\);/;

const newEffects = `  useEffect(() => {
    const squatAction = actions['Squat'] || Object.values(actions)[0];
    if (!squatAction) return;

    squatAction.reset().play();
    squatAction.paused = !playing;
  }, [playing, actions]);

  useEffect(() => {
    const squatAction = actions['Squat'] || Object.values(actions)[0];
    if (!squatAction) return;

    if (!playing) {
      const clipDuration = squatAction.getClip().duration;
      squatAction.time = progress * clipDuration;
    }
  }, [progress, playing, actions]);`;

code = code.replace(oldEffectsPattern, newEffects);

// 3. Update the useFrame logic to use the single action
const oldUseFramePattern = /    let currentProgress = progress;\n    const actionName = exercise;\n    const action = actions\[actionName\];\n    if \(action && playing\) \{/g;
const newUseFrame = `    let currentProgress = progress;
    const action = actions['Squat'] || Object.values(actions)[0];
    if (action && playing) {`;

code = code.replace(oldUseFramePattern, newUseFrame);

fs.writeFileSync('src/App.tsx', code);
console.log("Rewrote effects!");
