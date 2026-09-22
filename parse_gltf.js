const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('test_sync.gltf'));
console.log('Keys:', Object.keys(doc));
if (doc.animations) {
    console.log('Animations:', doc.animations.length);
    console.log('First animation:', doc.animations[0].name);
}
