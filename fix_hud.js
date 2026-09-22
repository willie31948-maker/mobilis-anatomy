const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldStr = `              </div>
            <div className="flex bg-gray-900/80 backdrop-blur-md rounded-full border border-gray-700 shadow-xl p-1 gap-1">`;
const newStr = `              </div>
            )}
            <div className="flex bg-gray-900/80 backdrop-blur-md rounded-full border border-gray-700 shadow-xl p-1 gap-1">`;

code = code.replace(oldStr, newStr);

// Also I left a rogue `)}` at the end of that div:
const rogue = `            </div>
          </div>
        )}

        {/* OVERLAYS: EXPLORER MODE */}`;
const clean = `            </div>
          </div>

        {/* OVERLAYS: EXPLORER MODE */}`;

code = code.replace(rogue, clean);

fs.writeFileSync('src/App.tsx', code);
