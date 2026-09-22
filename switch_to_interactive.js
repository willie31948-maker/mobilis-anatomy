const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Point to squat_interactive.glb
code = code.replace(/'\/models\/squat_clean\.glb'/g, "'/squat_interactive.glb'");
code = code.replace(/'\/squat_clean\.glb'/g, "'/squat_interactive.glb'");

// 2. Update useEffects for animation switching
const oldEffectsPattern = /  useEffect\(\(\) => \{\n    const squatAction = actions\['Squat'\] \|\| Object\.values\(actions\)\[0\];[\s\S]*?  \}, \[progress, playing, actions\]\);/;

const newEffects = `  useEffect(() => {
    const action = actions[exercise] || Object.values(actions)[0];
    if (!action) return;

    Object.values(actions).forEach(a => {
      if (a && a !== action) a.stop();
    });

    action.reset().play();
    action.paused = !playing;
  }, [playing, actions, exercise]);

  useEffect(() => {
    const action = actions[exercise] || Object.values(actions)[0];
    if (!action) return;

    if (!playing) {
      const clipDuration = action.getClip().duration;
      action.time = progress * clipDuration;
    }
  }, [progress, playing, actions, exercise]);`;

code = code.replace(oldEffectsPattern, newEffects);

// 3. Update useFrame for progress extraction
const oldUseFramePattern = /    const action = actions\['Squat'\] \|\| Object\.values\(actions\)\[0\];/;
const newUseFrame = `    const action = actions[exercise] || Object.values(actions)[0];`;
code = code.replace(oldUseFramePattern, newUseFrame);

// 4. Expand Color Logic
const oldColorLogic = /        if \(exercise === 'squat' \|\| exercise === 'lunge'\) \{[\s\S]*?        \} else if \(exercise === 'row'\) \{[\s\S]*?        \}/;

const newColorLogic = `        if (exercise === 'squat' || exercise === 'lunge') {
            isExtensor = ['gluteus_maximus', 'rectus_femoris', 'vastus_lateralis', 'vastus_medialis', 'soleus', 'gastrocnemius'].includes(id);
            isFlexor = ['tibialis_anterior', 'psoas_major', 'iliacus'].includes(id);
            isHamstring = ['biceps_femoris', 'semitendinosus'].includes(id);
        } else if (exercise === 'hinge') {
            isExtensor = ['gluteus_maximus', 'biceps_femoris', 'semitendinosus', 'erector_spinae'].includes(id);
            isFlexor = ['rectus_femoris'].includes(id);
            isHamstring = false;
        } else if (exercise === 'row') {
            isExtensor = ['latissimus_dorsi', 'trapezius', 'rhomboideus', 'biceps_brachii', 'brachialis', 'posterior_deltoid'].includes(id);
            isFlexor = ['pectoralis_major', 'anterior_deltoid'].includes(id);
            isHamstring = ['gluteus_maximus', 'biceps_femoris'].includes(id);
        } else if (exercise === 'bird_dog') {
            isExtensor = ['gluteus_maximus', 'erector_spinae', 'posterior_deltoid'].includes(id);
            isFlexor = ['rectus_abdominis', 'iliacus'].includes(id);
            isCore = true; // heavy core stabilization
        } else if (exercise === 'dead_bug') {
            isFlexor = ['rectus_abdominis', 'transversus_abdominis', 'psoas_major'].includes(id);
            isExtensor = false;
            isCore = true;
        } else if (exercise === 'side_plank') {
            isCore = ['obliquus_externus', 'obliquus_internus', 'transversus_abdominis', 'gluteus_medius'].includes(id);
            isExtensor = ['latissimus_dorsi'].includes(id);
        }`;
code = code.replace(oldColorLogic, newColorLogic);

// 5. Expand dropdown options
const oldSelect = /<option value="row">Bent Over Row<\/option>/;
const newSelect = `<option value="row">Bent Over Row</option>
                <option value="bird_dog">Bird Dog</option>
                <option value="dead_bug">Dead Bug</option>
                <option value="side_plank">Side Plank</option>`;
code = code.replace(oldSelect, newSelect);

fs.writeFileSync('src/App.tsx', code);
console.log("Interactive model fully integrated!");
