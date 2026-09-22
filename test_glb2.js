const fs = require('fs');
const buf = fs.readFileSync('public/models/full_atlas_v5.glb');
const str = buf.toString('utf8');
const regex = /\"([^\"]*?oblique[^\"]*?)\"/gi;
let m;
const unique = new Set();
while ((m = regex.exec(str)) !== null) {
  unique.add(m[1]);
}
console.log(Array.from(unique));
