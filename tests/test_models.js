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
  if (cond) { PASS.push(name); console.log('  ok   ' + name); }
  else { FAIL.push(name); console.log(' FAIL  ' + name + (detail ? ': ' + detail : '')); }
}

const ROOT = path.join(__dirname, '..');
const mapPath = path.join(ROOT, 'tools', 'muscle_map.json');
const modelsDir = path.join(ROOT, 'public', 'models');
const manifestPath = path.join(modelsDir, 'manifest.json');


const hasMap = fs.existsSync(mapPath);
check('tools/muscle_map.json exists', hasMap);

const mapping = JSON.parse(fs.readFileSync(mapPath, 'utf8')).map;
const engineIds = MUSCLES.map((m) => m.id);

const unmapped = engineIds.filter((id) => !mapping[id]);
check('every engine muscle has a mesh mapping', unmapped.length === 0, unmapped.join(', '));

const orphan = Object.keys(mapping).filter((id) => !engineIds.includes(id));
check('no mapping refers to a muscle the engine does not know', orphan.length === 0, orphan.join(', '));

check('every mapping lists at least one source mesh',
  Object.values(mapping).every((v) => Array.isArray(v) && v.length > 0));


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


  check('context meshes were exported', Object.keys(man.context || {}).length > 0);
  check('context includes skull, arm and hand bones', (() => {
    const g = new Set(Object.values(man.context || {}).map((c) => c.group));
    return g.has('skull') && g.has('arm_bones') && g.has('hand_bones');
  })());
  check('context includes full axial and appendicular skeleton: spine, ribcage, sternum, pelvis, leg and foot bones', (() => {
    const g = new Set(Object.values(man.context || {}).map((c) => c.group));
    return ['spine', 'ribcage', 'sternum', 'pelvis', 'leg_bones', 'foot_bones'].every((k) => g.has(k));
  })());
  check('all full skeleton context meshes are present in manifest (17 groups)', (() => {
    const expected = [
      'bone__skull__c', 'bone__skull__l', 'bone__skull__r',
      'bone__spine__c', 'bone__ribcage__l', 'bone__ribcage__r', 'bone__sternum__c',
      'bone__pelvis__l', 'bone__pelvis__r',
      'bone__arm_bones__l', 'bone__arm_bones__r', 'bone__hand_bones__l', 'bone__hand_bones__r',
      'bone__leg_bones__l', 'bone__leg_bones__r', 'bone__foot_bones__l', 'bone__foot_bones__r'
    ];
    return expected.every((name) => man.context[name] !== undefined);
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


console.log('\n' + PASS.length + ' passed, ' + FAIL.length + ' failed'); process.exit(FAIL.length ? 1 : 0);
