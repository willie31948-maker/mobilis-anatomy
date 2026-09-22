import re
import sys

def main():
    with open('src/App.tsx', 'r') as f:
        content = f.read()

    # Define the new modal JSX
    new_modal = """
      {/* FULL ASSESSMENT REPORT MODAL */}
      {assessment.showFullReport && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-gray-950/90 backdrop-blur-sm">
          <div className="bg-gray-900 border border-emerald-900/50 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-full overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-emerald-400" />
                <h2 className="text-xl font-bold text-white tracking-tight">Full Clinical Assessment</h2>
              </div>
              <button onClick={() => setAssessment(a => ({...a, showFullReport: false}))} className="text-gray-400 hover:text-white p-1 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-8 overflow-y-auto flex-1 grid grid-cols-2 gap-10">
              
              {/* Left Column: Safety & Movement */}
              <div className="space-y-8">
                <section>
                  <h3 className="text-lg font-bold text-white mb-2">1. Safety screen</h3>
                  <p className="text-sm text-gray-400 mb-6">Answer honestly. Any "yes" stops the assessment and sends you to a clinician — that is the correct outcome, not a failure of the app.</p>
                  <div className="space-y-5">
                    {safetyQuestions.map((q, i) => (
                      <label key={'safety-'+i} className="flex items-start gap-4 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={!!assessment.safetyAnswers[i]}
                          onChange={(e) => setAssessment(a => ({...a, safetyAnswers: {...a.safetyAnswers, [i]: e.target.checked}}))}
                          className="mt-1 w-4 h-4 rounded border-gray-700 bg-gray-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900" 
                        />
                        <span className="text-sm text-gray-300 group-hover:text-gray-100 transition-colors leading-relaxed">{q}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-white mb-2">2. Movement screen</h3>
                  <p className="text-sm text-gray-400 mb-6">Tick what you observe. A mirror or a phone video is enough for most of these.</p>
                  <div className="space-y-5">
                    {[
                      "Overhead squat: heels lift or torso pitches forward",
                      "Overhead squat: knees fall inward (valgus)",
                      "Overhead squat: arms fall forward",
                      "Single-leg stance: pelvis drops on the unsupported side",
                      "Lying on the back at the table edge, the tested thigh will not rest flat",
                      "Standing side-on: pronounced low back arch, belt line tips forward",
                      "Standing relaxed: shoulders rounded forward, palms face backward",
                      "Standing side-on: ear sits clearly ahead of the shoulder",
                      "Push-up or wall press: shoulder blade lifts away from the ribs",
                      "Raising the arm out to the side hurts between roughly 60 and 120 degrees",
                      "Lying face down lifting the leg: hamstring and low back fire before the glute",
                      "Seated or standing forward bend is clearly limited by the back of the thighs",
                      "Pain on the outside of the elbow when gripping, lifting or shaking hands",
                      "Pain on the inside of the elbow when gripping or with palm-down lifting",
                      "Forearms ache or grip tires easily after typing, mouse or phone use",
                      "Turning the palm fully up (elbow tucked in) is limited or uneven side to side",
                      "Raising the arm out to the side, the shoulder hitches up toward the ear",
                      "Hand numbness or pins and needles, especially at night or when driving",
                      "You clench or grind your teeth, or wake with a tight, tired jaw",
                      "Recurrent headaches at the temple, behind the eye, or around the ear",
                      "You breathe mainly into the chest — shoulders rise with each breath",
                      "Turning the head to look over one shoulder is clearly harder than the other"
                    ].map((q, i) => (
                      <label key={'movement-'+i} className="flex items-start gap-4 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={!!assessment.movementAnswers[i]}
                          onChange={(e) => setAssessment(a => ({...a, movementAnswers: {...a.movementAnswers, [i]: e.target.checked}}))}
                          className="mt-1 w-4 h-4 rounded border-gray-700 bg-gray-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900" 
                        />
                        <span className="text-sm text-gray-300 group-hover:text-gray-100 transition-colors leading-relaxed">{q}</span>
                      </label>
                    ))}
                  </div>
                </section>
              </div>

              {/* Right Column: Location & Analysis */}
              <div className="space-y-8 flex flex-col">
                <section>
                  <h3 className="text-lg font-bold text-white mb-6">3. Where do you feel it?</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "neck", "shoulder", "upper back", "low back", "hip", "knee", "ankle",
                      "lateral thigh", "groin", "calf", "arm", "elbow", "forearm", "wrist",
                      "hand", "jaw", "head", "shin"
                    ].map(part => {
                      const isSelected = assessment.painLocations.includes(part);
                      return (
                        <button
                          key={part}
                          onClick={() => setAssessment(a => ({
                            ...a,
                            painLocations: isSelected 
                              ? a.painLocations.filter(p => p !== part)
                              : [...a.painLocations, part]
                          }))}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                            isSelected 
                              ? 'bg-emerald-900/50 border-emerald-500/50 text-emerald-400' 
                              : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
                          }`}
                        >
                          {part}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="bg-gray-950 rounded-xl border border-gray-800 p-6 flex-1 flex flex-col justify-end">
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold text-gray-300">Pain right now (0 = none, 10 = worst)</h3>
                      <span className="text-2xl font-black text-emerald-400">Level: {assessment.currentPainLevel}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="10" 
                      step="1"
                      value={assessment.currentPainLevel}
                      onChange={e => setAssessment(a => ({...a, currentPainLevel: parseInt(e.target.value)}))}
                      className="w-full accent-emerald-500 bg-gray-800 h-2 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs font-medium text-gray-500 mt-2">
                      <span>0</span>
                      <span>10</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setAssessment(a => ({...a, showFullReport: false}))} 
                    className="w-full py-4 rounded-xl text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-900/30 flex justify-center items-center gap-2 hover:shadow-emerald-900/50"
                  >
                    <Activity className="w-5 h-5" /> Analyse
                  </button>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

    pattern = re.compile(r'\{\/\* FULL ASSESSMENT REPORT MODAL \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*\)\}\s*<\/div>\s*\);\s*\}', re.MULTILINE)
    
    if not pattern.search(content):
        print("Pattern not found. Saving content to debug.txt")
        with open('debug.txt', 'w') as out:
            out.write(content)
        sys.exit(1)

    new_content = pattern.sub(new_modal, content)
    
    with open('src/App.tsx', 'w') as f:
        f.write(new_content)
        
    print("Replaced modal successfully!")

if __name__ == '__main__':
    main()
