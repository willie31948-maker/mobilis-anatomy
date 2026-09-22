const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/\{\(mode === 'anatomy' \|\| mode === 'assess'\) \? \(/g, "{(mode === 'explorer' || mode === 'assessment') ? (");

const hudRegex = /\{\(mode === 'anatomy' \|\| mode === 'exercise' \|\| \(mode === 'assess' && assessment\.mapMode === '3D'\)\) && \(\s*(<div className="absolute bottom-6 left-1\/2 -translate-x-1\/2 z-10 flex flex-col items-center gap-2">[\s\S]*?)<\/div>\n\s*\)\}/;
code = code.replace(hudRegex, (match, p1) => {
    return p1 + "</div>";
});

fs.writeFileSync('src/App.tsx', code);
console.log("Revert phase 4 successful.");
