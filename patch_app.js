const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("const { scene, animations } = useGLTF('/models/squat_clean.glb');", "const { scene, animations } = useGLTF('/models/animated.glb');");

code = code.replace("useGLTF.preload('/models/full_atlas_v5.glb');", "useGLTF.preload('/models/full_atlas_v5.glb');\nuseGLTF.preload('/models/animated.glb');");

code = code.replace(/  useEffect\(\(\) => \{\n    const squatAction = actions\['Squat'\] \|\| Object\.values\(actions\)\[0\];\n    if \(\!squatAction\) return;\n\n    squatAction\.reset\(\)\.play\(\);\n    squatAction\.paused = \!playing;\n  \}, \[playing, actions\]\);/g, `  useEffect(() => {
    if (mixer) mixer.stopAllAction();
    let actionKey = exercise;
    let action = actions[actionKey];
    if (!action) {
      const possibleKey = Object.keys(actions).find(k => k.toLowerCase() === exercise.toLowerCase());
      if (possibleKey) action = actions[possibleKey];
    }
    if (!action) action = actions['squat'] || actions['Squat'] || Object.values(actions)[0];
    if (action) {
      action.reset().play();
      action.paused = !playing;
    }
  }, [exercise, playing, actions, mixer]);`);

code = code.replace(/  useEffect\(\(\) => \{\n    const squatAction = actions\['Squat'\] \|\| Object\.values\(actions\)\[0\];\n    if \(\!squatAction\) return;\n\n    if \(\!playing\) \{\n      const clipDuration = squatAction\.getClip\(\)\.duration;\n      squatAction\.time = progress \* clipDuration;\n    \}\n  \}, \[progress, playing, actions\]\);/g, `  useEffect(() => {
    let actionKey = exercise;
    let action = actions[actionKey];
    if (!action) {
      const possibleKey = Object.keys(actions).find(k => k.toLowerCase() === exercise.toLowerCase());
      if (possibleKey) action = actions[possibleKey];
    }
    if (!action) action = actions['squat'] || actions['Squat'] || Object.values(actions)[0];
    
    if (action && !playing) {
      const clipDuration = action.getClip().duration;
      action.time = progress * clipDuration;
    }
  }, [progress, playing, exercise, actions]);`);

code = code.replace(/    const action = actions\['Squat'\] \|\| Object\.values\(actions\)\[0\];/g, `    let actionKey = exercise;
    let action = actions[actionKey];
    if (!action) {
      const possibleKey = Object.keys(actions).find(k => k.toLowerCase() === exercise.toLowerCase());
      if (possibleKey) action = actions[possibleKey];
    }
    if (!action) action = actions['squat'] || actions['Squat'] || Object.values(actions)[0];`);

// Fix the Muscle coloring logic to support push_up (which will fallback to squat/elbow_extension animation visually or just stay static)
code = code.replace(/        \} else if \(exercise === 'side_plank'\) \{/g, `        } else if (exercise === 'push_up') {
            isExtensor = ['pectoralis_major', 'triceps_brachii', 'anterior_deltoid', 'serratus_anterior'].includes(id);
            isFlexor = ['biceps_brachii', 'posterior_deltoid', 'rhomboideus'].includes(id);
            isCore = true;
        } else if (exercise === 'side_plank') {`);

// Update dropdown
code = code.replace(/<option value="hinge" disabled>Hip Hinge \(Coming Soon\)<\/option>/g, '<option value="hinge">Hip Hinge (RDL)</option>');
code = code.replace(/<option value="lunge" disabled>Forward Lunge \(Coming Soon\)<\/option>/g, '<option value="lunge">Forward Lunge</option>');
code = code.replace(/<option value="row" disabled>Bent Over Row \(Coming Soon\)<\/option>/g, '<option value="row">Bent Over Row</option>');
code = code.replace(/<\/select>/g, '  <option value="push_up">Push Up</option>\n              </select>');

fs.writeFileSync('src/App.tsx', code);
