import re
import sys

def main():
    with open('src/App.tsx', 'r') as f:
        content = f.read()

    # 1. Add refs to App component
    app_state_pattern = r'const \[playing, setPlaying\] = useState\(false\);\n  const \[progress, setProgress\] = useState\(0\);'
    app_state_replacement = """const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<HTMLInputElement>(null);
  const progressTextRef = useRef<HTMLSpanElement>(null);"""
    content = re.sub(app_state_pattern, app_state_replacement, content)

    # 2. Update BiomechanicsModel signature
    old_sig = "function BiomechanicsModel({ progress, playing, setProgress }: { progress: number, playing: boolean, setProgress: (p: number) => void }) {"
    new_sig = "function BiomechanicsModel({ progress, playing, progressRef, progressTextRef }: { progress: number, playing: boolean, progressRef: React.RefObject<HTMLInputElement>, progressTextRef: React.RefObject<HTMLSpanElement> }) {"
    content = content.replace(old_sig, new_sig)

    # 3. Update BiomechanicsModel usage
    old_usage = """                <BiomechanicsModel 
                  progress={progress}
                  playing={playing}
                  setProgress={setProgress}
                />"""
    new_usage = """                <BiomechanicsModel 
                  progress={progress}
                  playing={playing}
                  progressRef={progressRef}
                  progressTextRef={progressTextRef}
                />"""
    content = content.replace(old_usage, new_usage)

    # 4. Update the useFrame block inside BiomechanicsModel
    # Note: we previously replaced the useFrame logic. Let's find it.
    old_update = """    if (action && playing) {
      currentProgress = (action.time / action.getClip().duration) % 1;
      setProgress(currentProgress);
    }"""
    new_update = """    if (action && playing) {
      currentProgress = (action.time / action.getClip().duration) % 1;
      if (progressRef.current) {
        progressRef.current.value = currentProgress.toString();
      }
      if (progressTextRef.current) {
        progressTextRef.current.innerText = Math.round(currentProgress * 100) + '%';
      }
    }"""
    content = content.replace(old_update, new_update)

    # 5. Update the UI overlay
    old_overlay = """        {/* OVERLAYS: BIOMECHANICS MODE */}
        {mode === 'biomechanics' && (
          <div className="absolute left-1/2 bottom-20 -translate-x-1/2 z-10 w-96 bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-xl p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex justify-between items-center">
              <span>Kinematic Playback</span>
              <span className="text-emerald-400 font-mono text-xs">{Math.round(progress * 100)}%</span>
            </h3>
            
            <div className="flex items-center gap-4 mb-4">
              <button 
                onClick={() => setPlaying(!playing)}
                className="w-10 h-10 rounded-full bg-emerald-500 text-gray-950 flex items-center justify-center hover:bg-emerald-400 transition-colors"
              >
                {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
              </button>
              
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={progress}
                onChange={(e) => {
                  setPlaying(false);
                  setProgress(parseFloat(e.target.value));
                }}
                className="flex-1 accent-emerald-500 cursor-pointer"
              />
            </div>"""
            
    new_overlay = """        {/* OVERLAYS: BIOMECHANICS MODE */}
        {mode === 'biomechanics' && (
          <div className="absolute left-1/2 bottom-20 -translate-x-1/2 z-10 w-96 bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-xl p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex justify-between items-center">
              <span>Kinematic Playback</span>
              <span ref={progressTextRef} className="text-emerald-400 font-mono text-xs">{Math.round(progress * 100)}%</span>
            </h3>
            
            <div className="mb-4">
              <select className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-sm text-gray-200 outline-none focus:border-emerald-500 transition-colors">
                <option value="squat">Bodyweight Squat</option>
                <option value="hinge" disabled>Hip Hinge (Coming Soon)</option>
                <option value="lunge" disabled>Forward Lunge (Coming Soon)</option>
                <option value="overhead" disabled>Overhead Press (Coming Soon)</option>
              </select>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <button 
                onClick={() => setPlaying(!playing)}
                className="w-10 h-10 rounded-full bg-emerald-500 text-gray-950 flex items-center justify-center hover:bg-emerald-400 transition-colors"
              >
                {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
              </button>
              
              <input 
                ref={progressRef}
                type="range" 
                min="0" max="1" step="0.01" 
                defaultValue={progress}
                onChange={(e) => {
                  setPlaying(false);
                  setProgress(parseFloat(e.target.value));
                }}
                className="flex-1 accent-emerald-500 cursor-pointer"
              />
            </div>"""
    content = content.replace(old_overlay, new_overlay)

    with open('src/App.tsx', 'w') as f:
        f.write(content)
        
    print("Fixed biomechanics playback!")

main()
