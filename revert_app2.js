const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldHeader = `  return (
    <div className="w-screen h-screen bg-gray-950 flex flex-col font-sans text-gray-100 overflow-hidden relative">
      {/* HEADER */}
      <header className="h-16 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <Activity className="text-emerald-400 w-6 h-6" />
          <h1 className="font-semibold text-lg tracking-wide text-white">Mobilis 3D</h1>
        </div>
        
        <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
          <button
            onClick={() => { setMode('explorer'); setPlaying(false); setCameraFocus('full'); setFocusPoint(null); }}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              mode === 'explorer' ? "bg-gray-800 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
            )}
          >
            <Layers className="w-4 h-4 inline-block mr-2" />
            Atlas Explorer
          </button>
          <button
            onClick={() => { setMode('biomechanics'); setAssessment(a => ({...a, isAssessmentMode: false})); setSelectedId(null); setCameraFocus('full'); setFocusPoint(null); }}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              mode === 'biomechanics' ? "bg-gray-800 text-emerald-400 shadow-sm" : "text-gray-400 hover:text-gray-200"
            )}
          >
            <Activity className="w-4 h-4 inline-block mr-2" />
            Biomechanics
          </button>
          <button
            onClick={() => { setMode('assessment'); setAssessment(a => ({...a, isAssessmentMode: true})); setSelectedId(null); setCameraFocus('full'); setFocusPoint(null); }}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              mode === 'assessment' ? "bg-gray-800 text-purple-400 shadow-sm" : "text-gray-400 hover:text-gray-200"
            )}
          >
            <ClipboardList className="w-4 h-4 inline-block mr-2" />
            Clinical Assessment
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative">
        {/* 3D CANVAS */}
        <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(circle at 50% 45%, #162032 0%, #080c14 100%)' }}>`;

const startIdx = code.indexOf('const safetyQuestions = [');
const endIdx = code.indexOf('<Canvas', startIdx);
if (startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + oldHeader + '\n            ' + code.substring(endIdx);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Revert phase 2 successful.");
} else {
    console.log("Could not find boundaries.");
}
