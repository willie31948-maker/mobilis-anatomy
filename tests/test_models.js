/**
 * Verifies the 3D asset layer stays in sync with the reasoning engine.
 *
 * This is the failure mode that actually bites: someone renames a muscle id in
 * data/anatomy.js, or re-runs the extractor with a stale map, and the app
 * silently loses the ability to highlight that muscle. Nothing crashes — the
 * mesh just never lights up, which is very easy to miss by eye and impossible
 * to miss here.
 */

const fs = require('fs');
const path = require('path');
const { MUSCLES } = require('../data/anatomy');

const PASS = [], FAIL = [];
function check(name, cond, detail = '') {
  if (cond) { PASS.push(name); console.log(`  ok   ${name}`); }
  else { FAIL.push(name); console.log(`  FAIL ${name}${detail ? `  -> ${detail}` : ''}`); }
}

const ROOT = path.join(__dirname, '..');
const mapPath = path.join(ROOT, 'tools', 'muscle_map.json');
const modelsDir = path.join(ROOT, 'public', 'models');
const manifestPath = path.join(modelsDir, 'manifest.json');

console.log('\n--- muscle map ---');

const hasMap = fs.existsSync(mapPath);
check('tools/muscle_map.json exists', hasMap);
if (!hasMap) { console.log('\nskipping the rest'); process.exit(1); }

const mapping = JSON.parse(fs.readFileSync(mapPath, 'utf8')).map;
const engineIds = MUSCLES.map((m) => m.id);

const unmapped = engineIds.filter((id) => !mapping[id]);
check('every engine muscle has a mesh mapping', unmapped.length === 0, unmapped.join(', '));

const orphan = Object.keys(mapping).filter((id) => !engineIds.includes(id));
check('no mapping refers to a muscle the engine does not know', orphan.length === 0, orphan.join(', '));

check('every mapping lists at least one source mesh',
  Object.values(mapping).every((v) => Array.isArray(v) && v.length > 0));

console.log('\n--- exported models ---');

const hasManifest = fs.existsSync(manifestPath);
check('models/manifest.json exists (extractor has been run)', hasManifest);

if (hasManifest) {
  const man = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  check('extraction reported nothing missing', man.missing.length === 0, man.missing.join(', '));

  const exported = new Set(Object.keys(man.muscles).map((n) => n.replace(/__(l|r)$/, '')));
  const notExported = engineIds.filter((id) => !exported.has(id));
  check('every engine muscle has an exported mesh', notExported.length === 0, notExported.join(', '));

  check('both sides exported for every muscle', (() => {
    const bad = engineIds.filter((id) => !man.muscles[`${id}__l`] || !man.muscles[`${id}__r`]);
    return bad.length === 0;
  })());

  check('every region file referenced by the manifest exists on disk',
    Object.values(man.regions).every((r) => fs.existsSync(path.join(modelsDir, r.file))));

  console.log('\n--- skeletal context ---');

  check('context meshes were exported', Object.keys(man.context || {}).length > 0);
  check('context includes skull, arm and hand bones', (() => {
    const g = new Set(Object.values(man.context || {}).map((c) => c.group));
    return g.has('skull') && g.has('arm_bones') && g.has('hand_bones');
  })());
  check('every context mesh is prefixed bone__ so it can never be read as a muscle id',
    Object.keys(man.context || {}).every((n) => n.startsWith('bone__')));
  check('no context mesh name collides with a muscle id',
    Object.keys(man.context || {}).every((n) => !engineIds.includes(n.replace(/^bone__/, '').replace(/__.$/, ''))));

  const totalMB = Object.values(man.regions).reduce((s, r) => s + r.bytes, 0) / 1048576;
  check(`total payload stays web-sized (${totalMB.toFixed(1)} MB)`, totalMB < 12, `${totalMB.toFixed(1)} MB`);

  check('no exported mesh name contains a dot (glTF strips them)', (() => {
    return Object.keys(man.muscles).every((n) => !n.includes('.'));
  })());

  check('every exported name yields a known muscle id after stripping the side', (() => {
    return Object.keys(man.muscles).every((n) => engineIds.includes(n.replace(/__(l|r)$/, '')));
  })());

  check('every mesh respects the triangle budget', (() => {
    const over = Object.entries(man.muscles).filter(([, v]) => v.tris_after > 4200);
    return over.length === 0;
  })());

  check('decimation actually reduced the dense meshes', (() => {
    const reduced = Object.values(man.muscles).filter((v) => v.tris_after < v.tris_before);
    return reduced.length > 20;
  })());

  check('attribution to the source is recorded', /CC BY-SA/i.test(man.source));
}

console.log('\n--- viewer wiring ---');

const viewer = fs.readFileSync(path.join(ROOT, 'public', 'viewer3d.js'), 'utf8');
check('viewer strips the side suffix to recover the muscle id', viewer.includes('__(l|r)'));
check('viewer exposes paintStates for assessment colouring', viewer.includes('paintStates'));
check('viewer reports clicks by muscle id', viewer.includes('userData.muscleId'));
check('viewer renders bones as non-clickable context', viewer.includes("startsWith('bone__')") && viewer.includes('isBone'));
check('bones are given no muscleId (cannot be clicked as a muscle)', (() => {
  const i = viewer.indexOf("startsWith('bone__')");
  const seg = viewer.slice(i, i + 600);
  return !seg.includes('userData.muscleId');
})());
check('skeleton visibility is toggleable', viewer.includes('setBonesVisible'));

const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
check('page loads the viewer as a module', html.includes('type="module"') && html.includes('viewer3d.js'));
check('2D map still present as the fallback view', html.includes('data-mid'));
check('both renderers are reachable from the UI', html.includes("setMode('3d'") && html.includes("setMode('2d'"));
check('UI loads the arm, hand, jaw and context regions',
  ['arm','forearm','hand','jaw','context'].every((r) => html.includes(`'${r}'`)));
check('UI exposes the skeleton toggle', html.includes('toggleBones'));

console.log(`\n${PASS.length} passed, ${FAIL.length} failed`);
if (PASS.length < 25) { console.log(`FAIL — only ${PASS.length} assertions ran; expected at least 15`); process.exit(1); }
process.exit(FAIL.length ? 1 : 0);
