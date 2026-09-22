const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Point back to squat_clean.glb
code = code.replace(/'\/squat_interactive\.glb'/g, "'/models/squat_clean.glb'");

// 2. Revert useEffects for animation switching
const oldEffectsPattern = /  useEffect\(\(\) => \{\n    const action = actions\[exercise\] \|\| Object\.values\(actions\)\[0\];[\s\S]*?  \}, \[progress, playing, actions, exercise\]\);/;

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

// 3. Revert useFrame for progress extraction
const oldUseFramePattern = /    const action = actions\[exercise\] \|\| Object\.values\(actions\)\[0\];/;
const newUseFrame = `    const action = actions['Squat'] || Object.values(actions)[0];`;
code = code.replace(oldUseFramePattern, newUseFrame);

// 4. Revert dropdown options
const oldSelect = /<option value="row">Bent Over Row<\/option>\n                <option value="bird_dog">Bird Dog<\/option>\n                <option value="dead_bug">Dead Bug<\/option>\n                <option value="side_plank">Side Plank<\/option>/;
const newSelect = `<option value="row" disabled>Bent Over Row (Coming Soon)</option>`;
code = code.replace(oldSelect, newSelect);
code = code.replace(/<option value="hinge">Hip Hinge<\/option>/, '<option value="hinge" disabled>Hip Hinge (Coming Soon)</option>');
code = code.replace(/<option value="lunge">Forward Lunge<\/option>/, '<option value="lunge" disabled>Forward Lunge (Coming Soon)</option>');

fs.writeFileSync('src/App.tsx', code);
console.log("Reverted to single-track squat model!");
