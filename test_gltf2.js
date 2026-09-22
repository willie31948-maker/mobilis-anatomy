const fs = require('fs');
const gltf = fs.readFileSync('public/squat_sync.glb');
// find 'animations' string
const str = gltf.slice(0, 10000).toString('utf-8');
if (str.includes('"animations"')) {
    console.log('Contains animations array in JSON chunk');
} else {
    console.log('No animations found in first 10KB');
}
