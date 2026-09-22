const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The bottom of canvas rendering had conditional `)}` and then camera focus HUD condition.
const closingCanvas = `</Canvas>
          </div>
        )}

        {/* Camera Focus HUD (Bottom Center for better layout with sidebars) */}
        {(mode === 'anatomy' || mode === 'exercise' || (mode === 'assess' && assessment.mapMode === '3D')) && (`

const newClosingCanvas = `</Canvas>
        </div>

        {/* Camera Focus HUD (Bottom Center for better layout with sidebars) */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">`

code = code.replace(closingCanvas, newClosingCanvas);

// Replace modes below in the overlay checks
code = code.replace(/\{mode === 'anatomy' && \(/g, "{mode === 'explorer' && (");
code = code.replace(/\{mode === 'exercise' && \(/g, "{mode === 'biomechanics' && (");
// Wait, for assessment mode, there was a complex condition: 
// {mode === 'assess' && assessment.mapMode === '3D' && (
// Let's replace that with {mode === 'assessment' && (
code = code.replace(/\{mode === 'assess' && assessment\.mapMode === '3D' && \([\s\S]*?\{\/\* Left Sidebar: Assessment State \*\/\}/m, "{mode === 'assessment' && (\n          <>\n            {/* Left Sidebar: Assessment State */}");

fs.writeFileSync('src/App.tsx', code);
console.log("Revert phase 3 successful.");
