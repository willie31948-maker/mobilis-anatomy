const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/<option value="Overhead">Overhead<\/option>\n\s*<option value="Rotation">Rotation<\/option>\n\s*<option value="push_up">Push Up<\/option>\n\s*<\/select>/g, '<option value="Overhead">Overhead</option>\n                      <option value="Rotation">Rotation</option>\n                    </select>');

code = code.replace(/<option value="Isometric \(Bottom\)">Isometric \(Bottom\)<\/option>\n\s*<option value="Concentric \(Ascent\)">Concentric \(Ascent\)<\/option>\n\s*<option value="push_up">Push Up<\/option>\n\s*<\/select>/g, '<option value="Isometric (Bottom)">Isometric (Bottom)</option>\n                      <option value="Concentric (Ascent)">Concentric (Ascent)</option>\n                    </select>');

fs.writeFileSync('src/App.tsx', code);
