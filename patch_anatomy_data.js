const fs = require('fs');
let code = fs.readFileSync('src/data/anatomyData.ts', 'utf8');

// 1. Add aliases to AnatomyMetadata
code = code.replace(
  /clinicalRelevance: string;\n  relatedStructures\?: string\[\];/,
  "clinicalRelevance: string;\n  aliases?: string[];\n  relatedStructures?: string[];"
);

// 2. Fix normalizeAnatomyKey to properly strip .l and .r
code = code.replace(
  /name = name\.replace\(\/_l\$\/, ''\)\.replace\(\/_r\$\/, ''\);\n  name = name\.replace\(\/__l\$\/, ''\)\.replace\(\/__r\$\/, ''\);\n  name = name\.replace\(\/\\bleft\\b\/g, ''\)\.replace\(\/\\bright\\b\/g, ''\);\n  \n  \/\/ Strip filler anatomical terms that might be inconsistently applied\n  name = name\.replace\(\/\\bmusclel\?\\b\/g, ''\)\.replace\(\/\\bmusculus\\b\/g, ''\)/,
  `name = name.replace(/[._][lr]$/, '').replace(/[._][lr]$/, '');
  name = name.replace(/__[lr]$/, '');
  name = name.replace(/\\b(left|right)\\b/g, '');
  
  // Strip filler anatomical terms that might be inconsistently applied
  name = name.replace(/\\b(muscle|musculus|bone|os|nerve|nervus|ligament)\\b/g, '');`
);
code = code.replace(
  /name = name\.trim\(\)\.replace\(\/\[\\s\\-\]\+\/g, '_'\)\.replace\(\/_+\/g, '_'\);/,
  "name = name.trim().replace(/[\\s\\-.]+/g, '_').replace(/_+/g, '_');"
);

// 3. Update getAnatomyData to check aliases
const oldMatching = /    if \(clean\.includes\(simplifiedKey\) \|\| clean\.includes\(commonSimplified\)\) return true;\n    if \(simplifiedKey\.includes\(clean\) \|\| commonSimplified\.includes\(clean\)\) return true;\n    return false;/;
const newMatching = `    if (clean.includes(simplifiedKey) || clean.includes(commonSimplified)) return true;
    if (simplifiedKey.includes(clean) || commonSimplified.includes(clean)) return true;
    
    // Check aliases
    if (anatomyRegistry[key].aliases) {
      for (const alias of anatomyRegistry[key].aliases) {
        const aliasClean = alias.toLowerCase().replace(/[-_.]/g, ' ');
        if (clean.includes(aliasClean) || aliasClean.includes(clean)) return true;
      }
    }
    return false;`;
code = code.replace(oldMatching, newMatching);

// 4. Add aliases to the obliques in the registry
code = code.replace(
  /  obliquus_externus: \{\n    commonName: 'External Oblique',/,
  "  obliquus_externus: {\n    commonName: 'External Oblique',\n    aliases: ['External Abdominal Oblique'],"
);
code = code.replace(
  /  obliquus_internus: \{\n    commonName: 'Internal Oblique',/,
  "  obliquus_internus: {\n    commonName: 'Internal Oblique',\n    aliases: ['Internal Abdominal Oblique'],"
);

fs.writeFileSync('src/data/anatomyData.ts', code);
console.log("Patched anatomyData.ts successfully!");
