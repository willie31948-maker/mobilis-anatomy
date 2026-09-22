const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add exercise state
const stateReplacement = `  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exercise, setExercise] = useState('squat');
  const progressRef = useRef<HTMLInputElement>(null);`;
code = code.replace(/  const \[playing, setPlaying\] = useState\(false\);\n  const \[progress, setProgress\] = useState\(0\);\n  const progressRef = useRef<HTMLInputElement>\(null\);/, stateReplacement);

// 2. Pass exercise to BiomechanicsModel
code = code.replace(
    /function BiomechanicsModel\(\{ progress, playing, progressRef, progressTextRef \}: \{ progress: number, playing: boolean, progressRef: React.RefObject<HTMLInputElement>, progressTextRef: React.RefObject<HTMLSpanElement> \}\) \{/,
    "function BiomechanicsModel({ progress, playing, progressRef, progressTextRef, exercise }: { progress: number, playing: boolean, progressRef: React.RefObject<HTMLInputElement>, progressTextRef: React.RefObject<HTMLSpanElement>, exercise: string }) {"
);

const usageReplacement = `<BiomechanicsModel 
                  progress={progress}
                  playing={playing}
                  progressRef={progressRef}
                  progressTextRef={progressTextRef}
                  exercise={exercise}
                />`;
code = code.replace(/<BiomechanicsModel \n                  progress=\{progress\}\n                  playing=\{playing\}\n                  progressRef=\{progressRef\}\n                  progressTextRef=\{progressTextRef\}\n                \/>/, usageReplacement);


// 3. Update the actionName
code = code.replace(
    /const actionName = 'squat'; \/\/ Object\.keys\(actions\)\[0\];/g,
    "const actionName = exercise;"
);

// 4. Update the select element
const selectReplacement = `<select 
                value={exercise}
                onChange={(e) => {
                  setPlaying(false);
                  setProgress(0);
                  if (progressRef.current) progressRef.current.value = "0";
                  if (progressTextRef.current) progressTextRef.current.innerText = "0%";
                  setExercise(e.target.value);
                }}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-emerald-500 transition-colors">`;
code = code.replace(/<select className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-emerald-500 transition-colors">/, selectReplacement);

code = code.replace(/<option value="hinge" disabled>/, '<option value="hinge">');
code = code.replace(/<option value="lunge" disabled>/, '<option value="lunge">');
code = code.replace(/<option value="overhead" disabled>Overhead Press \(Coming Soon\)/, '<option value="row">Bent Over Row');

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed dropdown");
