const fs = require('fs');
let code = fs.readFileSync('src/data/anatomyData.ts', 'utf8');

const regex = /export function normalizeAnatomyKey[\s\S]*?return name;\n\}/;
const replacement = `export function normalizeAnatomyKey(rawName: string): string {
  if (!rawName) return '';
  let name = rawName.toLowerCase();
  
  // Strip bone__ prefix (specific to this model's exporter)
  name = name.replace(/^bone__/, '');
  
  // Strip trailing numbers like .001, _01, .002
  name = name.replace(/\\.\\d+$/, '').replace(/_\\d+$/, '');
  
  // Strip left/right indicators
  name = name.replace(/[._][lr]$/, '');
  name = name.replace(/__[lr]$/, '');
  name = name.replace(/\\b(left|right)\\b/g, '');
  
  // Strip filler anatomical terms that might be inconsistently applied
  name = name.replace(/\\b(muscle|musculus|bone|os|nerve|nervus|ligament)\\b/g, '');
  
  // Normalize spaces, hyphens, and multiple underscores into a single underscore
  name = name.trim().replace(/[\\s\\-.]+/g, '_').replace(/_+/g, '_');
  
  // Trim leading/trailing underscores
  name = name.replace(/_$/, '').replace(/^_/, '');
  
  return name;
}`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/data/anatomyData.ts', code);
