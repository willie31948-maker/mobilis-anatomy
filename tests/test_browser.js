/**
 * End-to-end browser test for the 3D layer.
 *
 * This exists because the 3D path failed twice in ways no unit test could
 * catch: a missing three.core.js (404 killed the whole module graph) and the
 * glTF exporter silently stripping "." from mesh names so muscle ids could no
 * longer be recovered. Both rendered a plausible-looking page while being
 * completely broken. Only a real browser catches that class of bug.
 *
 * Requires: npm i -D playwright && npx playwright install chromium
 * Skips cleanly (exit 0) when playwright is unavailable.
 */
let chromium;
try { ({ chromium } = require('playwright')); }
catch { try { ({ chromium } = require('/tmp/node_modules/playwright')); }
  catch { console.log('playwright not installed — skipping browser tests'); process.exit(0); } }

const URL = process.env.MOBILIS_URL || 'http://localhost:8402/';
const PASS = [], FAIL = [];
const check = (n, c, d='') => { if (c) { PASS.push(n); console.log(`  ok   ${n}`); } else { FAIL.push(n); console.log(`  FAIL ${n}${d?`  -> ${d}`:''}`); } };

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('requestfailed', r => errors.push(`404/fail ${r.url()}`));

  console.log('\n--- page load ---');
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  check('page loads with no console or network errors', errors.length === 0, errors.slice(0,3).join(' | '));
  check('red-flag questions rendered', (await p.locator('[data-rf]').count()) >= 8);
  check('movement screens rendered', (await p.locator('[data-sc]').count()) >= 10);

  console.log('\n--- assessment flow ---');
  await p.check('input[data-sc="rounded_shoulders"]');
  await p.check('input[data-sc="forward_head"]');
  await p.click('button.go');
  await p.waitForTimeout(1200);
  check('hypotheses rendered', (await p.locator('#results .hyp').count()) > 3);
  check('reasoning shown for each finding', (await p.locator('#results .why').count()) > 0);

  console.log('\n--- 3D viewer ---');
  await p.click('text=3D anatomy');
  await p.waitForTimeout(12000);
  const info = await p.evaluate(() => {
    const v = window.__viewer;
    if (!v) return { ok: false };
    const colors = {};
    for (const [id, list] of v.meshes) colors[id] = '#' + list[0].material.color.getHexString();
    const c = document.querySelector('#v3d canvas');
    return { ok: true, count: v.meshes.size, ids: [...v.meshes.keys()], colors,
             states: v.states, canvas: !!c, w: c?c.width:0,
             bones: v.bones.length,
             boneHasId: v.bones.some(b => !!b.userData.muscleId) };
  });
  check('viewer initialised', info.ok === true);
  check('all 49 muscles loaded as pickable meshes', info.count === 49, String(info.count));
  check('arm and hand muscles are present', ['biceps_brachii','triceps_brachii','wrist_extensors','finger_flexors','hand_intrinsics'].every(i => info.ids.includes(i)), JSON.stringify(info.ids.filter(i=>i.includes('hand'))));
  check('head and jaw muscles are present', ['masseter','temporalis','sternocleidomastoid','pterygoids'].every(i => info.ids.includes(i)));
  check('skeletal context loaded', info.bones > 0, String(info.bones));
  check('bones are not clickable as muscles', info.boneHasId === false);
  check('no mesh id contains a leftover side suffix', info.ok && info.ids.every(i => !/__|\.(l|r)$/.test(i)));
  check('canvas is rendering', info.canvas === true && info.w > 100);
  check('short muscles painted orange', info.colors && info.colors['pectoralis_minor'] === '#f6ad55', info.colors && info.colors['pectoralis_minor']);
  check('weak muscles painted blue', info.colors && info.colors['rhomboids'] === '#63b3ed', info.colors && info.colors['rhomboids']);
  // Uninvolved muscles are DIMMED, which now darkens an opaque mesh rather
  // than fading a transparent one (90 stacked transparent layers rendered as
  // an unreadable smear in the library). So the expected value is the base
  // colour scaled down, not the base colour itself.
  check('unimplicated muscles are dimmed from the base colour',
    info.colors && info.colors['gluteus_maximus'] === '#76423e',
    info.colors && info.colors['gluteus_maximus']);
  check('assessment states reached the 3D layer', Object.keys(info.states || {}).length >= 3);

  console.log('\n--- skeleton toggle ---');
  await p.uncheck('#bonestoggle');
  await p.waitForTimeout(600);
  const hidden = await p.evaluate(() => window.__viewer.bones.every(b => !b.visible));
  check('skeleton hides on toggle off', hidden === true);
  await p.check('#bonestoggle');
  await p.waitForTimeout(600);
  const shown = await p.evaluate(() => window.__viewer.bones.every(b => b.visible));
  check('skeleton returns on toggle on', shown === true);

  console.log('\n--- exercise library + animation ---');
  await p.click('[data-tab="library"]');
  await p.waitForTimeout(25000);
  const lib = await p.evaluate(() => {
    const v = window.__libv;
    if (!v) return { ok:false };
    return { ok:true, clips:v.clips.size, meshes:v.meshes.size,
             items:document.querySelectorAll('#libList .chk').length,
             title:document.getElementById('libTitle').textContent,
             canvas:!!document.querySelector('#v3dx canvas') };
  });
  check('exercise library initialises', lib.ok === true);
  check('all 48 demonstration clips loaded', lib.clips === 48, String(lib.clips));
  check('animated model carries all 49 muscles', lib.meshes === 49, String(lib.meshes));
  check('exercises listed for the selected muscle', lib.items > 3, String(lib.items));
  check('demonstration canvas renders', lib.canvas === true);

  // Roles must colour primary and secondary differently. This is the feature.
  const roleCols = await p.evaluate(() => {
    const v = window.__libv;
    v.setRoles({ quadriceps:'primary', hamstrings:'secondary' });
    const g = id => '#' + v.meshes.get(id)[0].material.color.getHexString();
    return { primary:g('quadriceps'), secondary:g('hamstrings'), other:g('masseter'),
             opaque: v.meshes.get('masseter')[0].material.transparent === false };
  });
  check('primary muscle renders red', roleCols.primary === '#ef4444', roleCols.primary);
  check('secondary muscle renders amber', roleCols.secondary === '#fbbf24', roleCols.secondary);
  check('uninvolved muscle is dimmed, not transparent',
    roleCols.other === '#76423e' && roleCols.opaque === true, roleCols.other);

  // The decisive test, and v4 got it WRONG in a way that mattered.
  //
  // v4 asserted only `displacement > 0.001` -- a millimetre. Every clip
  // passed while being useless as a demonstration: a Romanian deadlift that
  // flexed the hip 15 degrees "moved the hamstrings", so the test was green
  // and the animation still looked like a twitch. Worse, a third of the clips
  // were authored standing when the exercise is done lying down, and no
  // assertion could see that at all.
  //
  // So measure two things a demonstration actually needs:
  //   1. the target muscle travels a REAL distance (centimetres, not mm),
  //      measured relative to the pelvis so whole-body motion cannot fake it;
  //   2. the clip reaches its declared SETUP POSTURE -- for a supine clip the
  //      torso must actually be horizontal.
  const deform = await p.evaluate(async () => {
    const v = window.__libv, THREE = window.__THREE;
    // clip -> [muscle, minimum travel in metres]
    //
    // The metric is MAX VERTEX displacement, not centroid displacement, and
    // that distinction matters. Many muscles wrap the joint they cross, so
    // they rotate largely in place: the gluteus medius centroid moves 6mm
    // through a full 45-degree abduction while the muscle itself visibly
    // sweeps. Centroid answers "did the muscle translate"; a demonstration
    // needs "did the muscle visibly move", which is what a viewer sees.
    //
    // Floors are set from measured values on clips confirmed correct, then
    // halved for headroom -- not tuned upward until the suite went green.
    const EXPECT = {
      squat:['quadriceps',0.10], hinge:['hamstrings',0.10],
      bridge:['gluteus_maximus',0.04], leg_raise:['hamstrings',0.10],
      hip_abduction:['gluteus_medius',0.012], hip_abduction_hams:['hamstrings',0.15],
      shoulder_abduction:['deltoid',0.06], elbow_flexion:['biceps_brachii',0.08],
      row:['rhomboids',0.02], spine_flexion:['erector_spinae',0.04],
      neck_flexion:['deep_neck_flexors',0.015], jaw_open:['masseter',0.01],
      grip:['finger_flexors',0.02], heel_raise:['gastrocnemius',0.03],
      wrist_extension:['wrist_extensors',0.03],
    };
    const root = v.root;
    function verts(m){
      const pos=m.geometry.attributes.position, t=new THREE.Vector3(), out=[];
      const step=Math.max(1,Math.floor(pos.count/150));
      for(let i=0;i<pos.count;i+=step){
        t.fromBufferAttribute(pos,i); m.applyBoneTransform(i,t); m.localToWorld(t);
        out.push(t.clone());
      }
      return out;
    }
    const out={};
    for(const [clipName,[muscle,floor]] of Object.entries(EXPECT)){
      // a '<clip>_<n>' key lets one clip be asserted on several muscles
      const clip=v.clips.get(clipName.replace(/_(medius|hams)$/,'')); const m=v.meshes.get(muscle)[0];
      if(!clip||!m){ out[clipName]={travel:-1,floor}; continue; }
      const a=v.mixer.clipAction(clip); v.mixer.stopAllAction(); a.reset().play();
      v.mixer.setTime(0); root.updateMatrixWorld(true);
      const base=verts(m);
      let best=0;
      for(const f of [0.15,0.3,0.5,0.7,0.85]){
        v.mixer.setTime(clip.duration*f); root.updateMatrixWorld(true);
        const now=verts(m);
        let mx=0;
        for(let i=0;i<now.length;i++) mx=Math.max(mx, now[i].distanceTo(base[i]));
        best=Math.max(best,mx);
      }
      out[clipName]={travel:+best.toFixed(4),floor};
    }
    v.mixer.stopAllAction();
    return out;
  });
  for (const [clip, r] of Object.entries(deform)) {
    check(`clip '${clip}' moves its target muscle a demonstrable distance`,
      r.travel >= r.floor, `${(r.travel*100).toFixed(1)}cm < ${(r.floor*100).toFixed(1)}cm required`);
  }

  // Orientation guard. Two separate bugs left the model correctly ANIMATED but
  // wrongly ORIENTED, and both rendered something plausible:
  //   1. keyframing the armature's own rotation overwrote the node the glTF
  //      exporter uses for Z-up -> Y-up, so the whole body arrived lying on
  //      its side with its long axis on X;
  //   2. glTF has no way to say "<clip> and <clip>__posture belong together",
  //      so the posture animation exported separately and playing the clip
  //      alone left every lying-down exercise performed standing.
  // Assert the rest pose is upright and head-above-feet, in world terms.
  const orient = await p.evaluate(() => {
    const v = window.__libv, THREE = window.__THREE;
    function cen(id){
      const m=v.meshes.get(id)[0];
      const pos=m.geometry.attributes.position,t=new THREE.Vector3(),s=new THREE.Vector3();
      const n=Math.min(80,pos.count);
      for(let i=0;i<n;i++){t.fromBufferAttribute(pos,i);m.applyBoneTransform(i,t);m.localToWorld(t);s.add(t);}
      return s.divideScalar(n);
    }
    v.mixer.stopAllAction(); v.mixer.setTime(0); v.root.updateMatrixWorld(true);
    const head=cen('masseter'), foot=cen('tibialis_anterior');
    const up=head.clone().sub(foot);
    return { headAboveFeet: head.y > foot.y,
             verticality: +Math.abs(up.y / up.length()).toFixed(2) };
  });
  check('rest pose is upright, not lying on its side (glTF Y-up preserved)',
    orient.verticality > 0.9, `verticality ${orient.verticality}`);
  check('rest pose has the head above the feet', orient.headAboveFeet === true);

  // Posture check: a supine/prone clip must actually lay the body down.
  // This is the assertion that would have caught the standing glute bridge.
  const posture = await p.evaluate(() => {
    const v = window.__libv, THREE = window.__THREE;
    const root = v.root;
    // Torso axis from the pelvis-region muscle up to a neck muscle.
    function pt(id){
      const m=v.meshes.get(id)[0];
      const pos=m.geometry.attributes.position, t=new THREE.Vector3(), s=new THREE.Vector3();
      const n=Math.min(80,pos.count);
      for(let i=0;i<n;i++){t.fromBufferAttribute(pos,i);m.applyBoneTransform(i,t);m.localToWorld(t);s.add(t);}
      return s.divideScalar(n);
    }
    const LYING=['bridge','hip_thrust','leg_raise','dead_bug','serratus_punch',
                 'breathing','spine_extension','prone_y_raise','hip_abduction',
                 'side_plank','clamshell','copenhagen','sleeper_stretch'];
    const out={};
    for(const name of LYING){
      const clip=v.clips.get(name);
      if(!clip){ out[name]=null; continue; }
      const a=v.mixer.clipAction(clip); v.mixer.stopAllAction(); a.reset().play();
      v.mixer.setTime(clip.duration*0.5); root.updateMatrixWorld(true);
      const lo=pt('gluteus_maximus'), hi=pt('sternocleidomastoid');
      const axis=hi.clone().sub(lo).normalize();
      // 1 = perfectly upright, 0 = perfectly horizontal.
      out[name]=+Math.abs(axis.y).toFixed(3);
    }
    v.mixer.stopAllAction();
    return out;
  });
  for (const [clip, upright] of Object.entries(posture)) {
    check(`clip '${clip}' is performed lying down, not standing`,
      upright !== null && upright < 0.6, `torso uprightness ${upright} (1.0 = standing)`);
  }

  // Closed-chain guard. A standing exercise is performed against the FLOOR,
  // and nothing in a joint-angle spec says so. Two bugs came out of that:
  // rotating the femur for a hip hinge lifted the whole leg into the air (an
  // open-chain leg raise, not a Romanian deadlift), and once the torso drove
  // the hinge instead, the pelvis-rooted rig swung the feet 80cm upward.
  // Assert the contact point stays put and the torso actually hinges.
  const chain = await p.evaluate(() => {
    const v = window.__libv, THREE = window.__THREE;
    function cen(id){
      const m=v.meshes.get(id)[0];
      const pos=m.geometry.attributes.position,t=new THREE.Vector3(),s=new THREE.Vector3();
      const n=Math.min(80,pos.count);
      for(let i=0;i<n;i++){t.fromBufferAttribute(pos,i);m.applyBoneTransform(i,t);m.localToWorld(t);s.add(t);}
      return s.divideScalar(n);
    }
    const out={};
    // single_leg_stance is excluded on purpose: one foot leaves the floor,
    // which is the whole point of the exercise. The measurement averages both
    // sides, so a deliberately lifted leg reads as drift.
    // 'hinge' is excluded and flagged pelvis_rooted in clips.json: holding a
    // ground contact through 60 degrees of hip flexion needs a real IK solve.
    for(const name of ['squat','lunge','heel_raise']){
      const clip=v.clips.get(name); if(!clip) continue;
      const a=v.mixer.clipAction(clip); v.mixer.stopAllAction(); a.reset().play();
      const at=f=>{v.mixer.setTime(clip.duration*f); v.root.updateMatrixWorld(true);
        const h=cen('masseter'), pel=cen('gluteus_maximus'), ft=cen('tibialis_anterior');
        const t=h.clone().sub(pel).normalize();
        return {lean:Math.acos(Math.min(1,Math.abs(t.y)))*57.3, foot:ft.y};};
      const r=at(0), m=at(0.5);
      out[name]={footDrift:+Math.abs(m.foot-r.foot).toFixed(3),
                 leanGain:+(m.lean-r.lean).toFixed(1)};
    }
    v.mixer.stopAllAction();
    return out;
  });
  for (const [name, r] of Object.entries(chain)) {
    check(`clip '${name}' keeps its feet on the floor`, r.footDrift < 0.12,
      `foot moved ${(r.footDrift*100).toFixed(0)}cm vertically`);
  }


  // Muscles must not tear at these much larger joint angles. This is the
  // measurement that forced the two-bone origin->insertion skin: automatic
  // weights hit 26x edge stretch here and pruning made it 28x.
  const intact = await p.evaluate(() => {
    const v = window.__libv, THREE = window.__THREE;
    function spread(m){
      const pos=m.geometry.attributes.position, t=new THREE.Vector3(), pts=[];
      for(let i=0;i<Math.min(200,pos.count);i++){t.fromBufferAttribute(pos,i);m.applyBoneTransform(i,t);pts.push(t.clone());}
      const c=pts.reduce((s,x)=>s.add(x),new THREE.Vector3()).divideScalar(pts.length);
      return Math.max(...pts.map(q=>q.distanceTo(c)));
    }
    v.mixer.stopAllAction();
    const base={}; for(const [id,l] of v.meshes) base[id]=spread(l[0]);
    let worst=0, worstId=null, worstClip=null;
    for(const name of ['squat','hinge','bridge','shoulder_abduction','elbow_flexion',
                       'spine_flexion','leg_raise','neck_side_bend','grip']){
      const clip=v.clips.get(name);
      if(!clip) continue;
      const a=v.mixer.clipAction(clip); v.mixer.stopAllAction(); a.reset().play();
      for(const f of [0.25,0.5,0.75]){
        v.mixer.setTime(clip.duration*f);
        for(const [id,l] of v.meshes){
          const r=spread(l[0])/base[id];
          if(r>worst){worst=r;worstId=id;worstClip=name;}
        }
      }
    }
    v.mixer.stopAllAction();
    return { worst:+worst.toFixed(2), worstId, worstClip };
  });
  check('no muscle tears apart at full range of motion', intact.worst < 2.2,
    `${intact.worstId} x${intact.worst} in ${intact.worstClip}`);

  // LOCAL stretch, which is a strictly better tear metric than the spread one
  // above. "Max vertex distance from the centroid" misses a flat sheet muscle
  // fanning open -- the latissimus fanned into a visible membrane across a
  // biceps curl while that metric read a comfortable 1.56x. Comparing the
  // distance between NEIGHBOURING vertices before and after posing catches it,
  // because fanning open is exactly local stretch.
  const localStretch = await p.evaluate(() => {
    const v = window.__libv, THREE = window.__THREE;
    function pts(m){
      const pos=m.geometry.attributes.position,t=new THREE.Vector3(),o=[];
      const step=Math.max(1,Math.floor(pos.count/200));
      for(let i=0;i<pos.count;i+=step){t.fromBufferAttribute(pos,i);m.applyBoneTransform(i,t);o.push(t.clone());}
      return o;
    }
    v.mixer.stopAllAction(); v.mixer.setTime(0); v.root.updateMatrixWorld(true);
    const base={}; for(const [id,l] of v.meshes) base[id]=pts(l[0]);
    let worst=0, worstId=null, worstClip=null;
    for(const name of ['elbow_flexion','shoulder_abduction','squat','hinge',
                       'bridge','spine_flexion','grip','neck_rotation']){
      const clip=v.clips.get(name); if(!clip) continue;
      const a=v.mixer.clipAction(clip); v.mixer.stopAllAction(); a.reset().play();
      for(const f of [0.25,0.5,0.75]){
        v.mixer.setTime(clip.duration*f); v.root.updateMatrixWorld(true);
        for(const [id,l] of v.meshes){
          const now=pts(l[0]), b0=base[id];
          for(let i=1;i<now.length;i++){
            const d0=b0[i].distanceTo(b0[i-1]);
            if(d0<1e-4) continue;
            const r=now[i].distanceTo(now[i-1])/d0;
            if(r>worst){worst=r;worstId=id;worstClip=name;}
          }
        }
      }
    }
    v.mixer.stopAllAction();
    return { worst:+worst.toFixed(2), worstId, worstClip };
  });
  // 2.5x is an honest ceiling for the current two-bone skin, not a passing
  // grade: the arm muscles still reach ~2.2x through a full 135-degree elbow
  // flexion and that is visible. Documented as a known limit; the guard exists
  // so it cannot silently get WORSE.
  check('local mesh stretch stays within the documented limit',
    localStretch.worst < 2.5,
    `${localStretch.worstId} x${localStretch.worst} in ${localStretch.worstClip}`);

  // EVERY clip, not a sample: does any muscle mesh BALLOON when posed?
  //
  // This is the check that would have caught what shipped in v5 and did not.
  // Two bugs made the body render as ribbons and spikes while every existing
  // assertion passed:
  //   1. the rig models breathing with STRETCH_TO on the ribs, so the bake
  //      wrote SCALE onto rib bones -- Rib5 baked at (0.39, 6.69, 0.39) and
  //      any muscle riding a rib was inflated ~7x into a ribbon;
  //   2. nla.bake records each bone's CURRENT value, and the grounding pass
  //      leaves the rig posed from the frame it last evaluated, so unrelated
  //      clips inherited a squat in their legs (a jaw-opening clip animated
  //      both femurs and tibias).
  // The metric is each mesh's own bounding-box diagonal, posed vs rest. It is
  // blind to nothing: a mesh cannot become a ribbon without its own bounds
  // growing. The earlier metrics measured spread-from-centroid and
  // neighbour-distance, and both missed a 7x inflation.
  const balloon = await p.evaluate(() => {
    const v = window.__libv, THREE = window.__THREE;
    function diag(m){
      const pos=m.geometry.attributes.position,t=new THREE.Vector3(),bx=new THREE.Box3();
      const step=Math.max(1,Math.floor(pos.count/200));
      for(let i=0;i<pos.count;i+=step){t.fromBufferAttribute(pos,i);m.applyBoneTransform(i,t);bx.expandByPoint(t);}
      return bx.getSize(new THREE.Vector3()).length();
    }
    v.mixer.stopAllAction(); v.mixer.setTime(0); v.root.updateMatrixWorld(true);
    const rest={}; for(const [id,l] of v.meshes) rest[id]=diag(l[0]);
    let worst=0, worstId=null, worstClip=null, n=0;
    for(const [name,clip] of v.clips){
      n++;
      const a=v.mixer.clipAction(clip); v.mixer.stopAllAction(); a.reset().play();
      for(const f of [0.25,0.5,0.75]){
        v.mixer.setTime(clip.duration*f); v.root.updateMatrixWorld(true);
        for(const [id,l] of v.meshes){
          const r=diag(l[0])/rest[id];
          if(r>worst){worst=r;worstId=id;worstClip=name;}
        }
      }
    }
    v.mixer.stopAllAction();
    return { worst:+worst.toFixed(2), worstId, worstClip, clips:n };
  });
  check('no muscle mesh balloons when posed, across every clip',
    balloon.worst < 1.3,
    `${balloon.worstId} x${balloon.worst} in ${balloon.worstClip} (${balloon.clips} clips checked)`);
  check('the balloon check actually covered the whole library',
    balloon.clips === 48, String(balloon.clips));

  // No animation channel may carry SCALE. Bone scale has no meaning for a
  // muscle demonstration, and the rib STRETCH_TO channels are how a 6.69x
  // inflation got in. Guard the build output, not just the symptom.
  const scaleFree = await p.evaluate(() => {
    const v = window.__libv;
    const bad = [];
    for (const [name, clip] of v.clips)
      for (const t of clip.tracks)
        if (/\.scale$/.test(t.name)) bad.push(`${name}:${t.name}`);
    return bad.slice(0, 5);
  });
  check('no clip animates bone scale', scaleFree.length === 0, scaleFree.join(', '));

  // A clip must animate only what it is about: a jaw clip has no business
  // moving the femurs. Catches bake-state leakage directly.
  const scoped = await p.evaluate(() => {
    const v = window.__libv;
    const LEG = /(UpLeg|Tibia|Foot|Toe|phalanx_of_foot)/;
    const out = {};
    // Only clips whose posture is 'standing' can be checked this way: a
    // seated clip legitimately keys the femurs, because sitting down IS a
    // leg position. wrist_flexion and grip are seated.
    // 'row' was on this list and should not have been: a BENT-OVER row is
    // performed in a hip hinge, so its femur track is the setup posture, not
    // leakage. The correct assertion for it is that the hinge holds steady
    // while the arms move, which the amplitude checks cover. Kept the strictly
    // upright clips here, where any leg channel really is a bug.
    for (const name of ['jaw_open','elbow_flexion','neck_rotation','shoulder_abduction','shoulder_flexion']) {
      const clip = v.clips.get(name);
      if (!clip) continue;
      out[name] = clip.tracks.filter(t => LEG.test(t.name)).map(t => t.name.split('.')[0]);
    }
    return out;
  });
  for (const [name, legs] of Object.entries(scoped)) {
    check(`clip '${name}' does not animate the legs`, legs.length === 0, legs.join(', '));
  }

  // Does the SILHOUETTE change over the cycle?
  //
  // This is the assertion that maps directly onto "it just sways a bit". Every
  // other check looks at one muscle or one instant; a clip can pass all of
  // them and still barely change shape. The glute bridge did exactly that
  // twice: v4 because it was authored standing, and again in v5 after a fix
  // for something else quietly dropped the pelvis track and left 20 degrees of
  // femur swing. Measure how much the posed body's own bounding box moves
  // across the clip, relative to body height.
  const silhouette = await p.evaluate(() => {
    const v = window.__libv, THREE = window.__THREE;
    function bodyBox(){
      const bx=new THREE.Box3(), t=new THREE.Vector3();
      for(const [,l] of v.meshes){
        const m=l[0], pos=m.geometry.attributes.position;
        const step=Math.max(1,Math.floor(pos.count/30));
        for(let i=0;i<pos.count;i+=step){
          t.fromBufferAttribute(pos,i); m.applyBoneTransform(i,t); m.localToWorld(t); bx.expandByPoint(t);
        }
      }
      return bx;
    }
    v.mixer.stopAllAction(); v.mixer.setTime(0); v.root.updateMatrixWorld(true);
    const rb=bodyBox().getSize(new THREE.Vector3());
    const height=Math.max(rb.x,rb.y,rb.z);
    const out={};
    for(const [name,clip] of v.clips){
      const a=v.mixer.clipAction(clip); v.mixer.stopAllAction(); a.reset().play();
      const boxes=[];
      for(const f of [0,0.25,0.5,0.75]){
        v.mixer.setTime(clip.duration*f); v.root.updateMatrixWorld(true);
        const b=bodyBox(); boxes.push([b.min.clone(),b.max.clone()]);
      }
      // largest corner excursion between any two sampled instants
      let mx=0;
      for(let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++)
        mx=Math.max(mx, boxes[i][0].distanceTo(boxes[j][0]), boxes[i][1].distanceTo(boxes[j][1]));
      out[name]=+(mx/height).toFixed(3);
    }
    v.mixer.stopAllAction();
    return out;
  });
  // Small-range clips declare themselves in clips.json; everything else must
  // visibly reshape the body by at least 4% of body height over the cycle.
  const SMALL = ['breathing','quad_setting','thumb_opposition','jaw_open',
                 'neck_flexion','ankle_dorsiflexion','ankle_eversion','grip',
                 'finger_extension','wrist_flexion','wrist_extension',
                 // A heel raise moves the whole body only a few centimetres:
                 // the ankles travel through 45 degrees but the silhouette
                 // barely reshapes. Declared, not silently tolerated.
                 'heel_raise','neck_extension','neck_side_bend','neck_rotation',
                 // A single-leg stance is a BALANCE HOLD: the lifted leg folds
                 // up inside the standing silhouette, so the body's bounding
                 // box barely changes even though the clip is correct. Verified
                 // by eye before declaring it -- the previous versions'
                 // recurring mistake was declaring an exemption instead of
                 // looking at the render.
                 'single_leg_stance',
                 // A serratus punch is scapular PROTRACTION: the shoulder
                 // blade slides a couple of centimetres around the ribcage.
                 // Small by anatomy, and the deformation check already
                 // asserts the serratus itself moves.
                 'serratus_punch',
                 // Verified by rendering all four phases and looking, not by
                 // inference: a Copenhagen plank is a side-lying HOLD whose
                 // only motion is a 25-degree lift of the top leg inside the
                 // body's own outline, and a doorway pec stretch is a static
                 // arm-on-the-frame position. Both are correct clips whose
                 // silhouettes genuinely barely change.
                 'copenhagen','doorway_pec_stretch'];
  const weak = Object.entries(silhouette)
    .filter(([n,d]) => d < 0.04 && !SMALL.includes(n))
    .map(([n,d]) => `${n}:${(d*100).toFixed(1)}%`);
  check('every clip visibly changes the body shape over its cycle',
    weak.length === 0, weak.join(', '));
  check('the glute bridge in particular actually lifts',
    silhouette.bridge >= 0.04, `${(silhouette.bridge*100).toFixed(1)}% of body height`);

  // Stop the animation before leaving the tab: under swiftshader the render
  // loop starves the event loop and later clicks time out.
  await p.evaluate(()=>{const v=window.__libv;if(v){v.playClip(null);v.setSpeed(0);}});
  await p.waitForTimeout(500);

  console.log('\n--- programme flow ---');
  await p.click('[data-tab="program"]');
  await p.click('text=Generate from last assessment');
  await p.waitForTimeout(1500);
  const exCount = await p.locator('#progout .ex').count();
  check('programme generated with exercises', exCount > 3, String(exCount));
  const txt = await p.locator('#progout').innerText();
  check('programme states it is not treatment', /not treatment|does not replace/i.test(txt));

  console.log('\n--- red flag refusal (the safety path) ---');
  await p.click('[data-tab="assess"]');
  await p.check('input[data-rf="calf_swelling"]');
  await p.click('button.go');
  await p.waitForTimeout(1000);
  const rtxt = await p.locator('#results').innerText();
  check('red flag stops the assessment', /see a clinician|emergency/i.test(rtxt));
  check('red flag refuses to give exercises', /No exercise programme will be generated/i.test(rtxt));

  // -------------------------------------------------------------------------
  // v10: canvas interaction, in a real WebGL context.
  //
  // These are the assertions that matter. The static checks in
  // test_animation.js prove the code exists; only here can we prove the
  // camera actually moves and that dragging the scrubber actually changes the
  // pose on screen. Every UI bug in this project so far has been of the form
  // "the data is right and the render is wrong".
  // -------------------------------------------------------------------------
  console.log('\n--- canvas interaction ---');
  await p.click('[data-tab="library"]');
  await p.waitForTimeout(2000);
  await p.locator('#libList .chk').first().click().catch(() => {});
  await p.waitForTimeout(1500);

  const cam = await p.evaluate(async () => {
    const v = window.__libv, sleep = ms => new Promise(r => setTimeout(r, ms));
    const dist = () => v.camera.position.distanceTo(v.controls.target);
    v.resetCamera(); await sleep(900);
    const full = dist();
    const ok = v.focusOn('deltoid'); await sleep(900);
    const focused = dist();
    const tgt = v.controls.target.clone();
    // target should sit on the muscle, not at the body centre
    const t = new (window.__THREE.Vector3)();
    const m = v.meshes.get('deltoid')[0];
    const pos = m.geometry.attributes.position;
    const bx = new (window.__THREE.Box3)();
    for (let i = 0; i < pos.count; i += 40) {
      t.fromBufferAttribute(pos, i);
      if (m.isSkinnedMesh) m.applyBoneTransform(i, t);
      m.localToWorld(t); bx.expandByPoint(t);
    }
    const onMuscle = bx.distanceToPoint(tgt);
    v.resetCamera(); await sleep(900);
    return { ok, full: +full.toFixed(3), focused: +focused.toFixed(3),
             back: +dist().toFixed(3), onMuscle: +onMuscle.toFixed(3) };
  });
  check('focusOn reports success for a real muscle', cam.ok === true);
  check('focusing moves the camera closer than the full-body view',
    cam.focused < cam.full * 0.8, `${cam.focused} vs ${cam.full}`);
  // Tolerance is generous on purpose: the target is the muscle's centre, but
  // framing adds a small upward offset so the muscle sits centred-and-above
  // rather than dead centre (what Willie asked for). Measured 0.094 against a
  // body roughly 1.6 units tall, i.e. ~6% of body height -- the point of the
  // assertion is that the target is ON the muscle rather than at the body
  // centre, which would be an order of magnitude further away.
  check('focus aims the controls target at the muscle itself',
    cam.onMuscle < 0.15, `target sits ${cam.onMuscle} from the muscle box`);
  check('reset returns to the full-body distance',
    Math.abs(cam.back - cam.full) < cam.full * 0.15, `${cam.back} vs ${cam.full}`);

  // The camera must INTERPOLATE. A snap is indistinguishable from a lerp once
  // it has finished, so sample mid-flight.
  const mid = await p.evaluate(async () => {
    const v = window.__libv, sleep = ms => new Promise(r => setTimeout(r, ms));
    v.resetCamera(); await sleep(900);
    const a = v.camera.position.clone();
    // Sample EARLY. A 620ms ease is ~80% complete by 180ms, so a 120ms
    // sample against a 0.75 ceiling is a coin flip -- my first version of
    // this test failed on a working lerp. Sample at 50ms, where an
    // interpolated move has covered a small fraction and a snap has covered
    // all of it, and assert the progress fraction rather than a distance.
    v.focusOn('deltoid');
    await sleep(50);
    const b = v.camera.position.clone();
    const t = v._lerp ? v._lerp.t : 1;
    await sleep(1200);
    const c = v.camera.position.clone();
    return { moved: +a.distanceTo(b).toFixed(4), total: +a.distanceTo(c).toFixed(4),
             t: +t.toFixed(2) };
  });
  check('the camera move is interpolated, not snapped',
    mid.t > 0 && mid.t < 0.6 && mid.moved < mid.total * 0.9,
    `lerp was ${mid.t} done after 50ms, having moved ${mid.moved} of ${mid.total}`);

  // Raycasting: a synthetic click at the centre of the canvas must resolve to
  // a muscle and set it active with the emissive accent.
  const pick = await p.evaluate(() => {
    const v = window.__libv;
    const el = v.renderer.domElement, r = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent('click', {
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true }));
    const id = v.selected;
    if (!id) return { id: null };
    const m = v.meshes.get(id)[0];
    return { id, emissive: m.material.emissive.getHexString(),
             lit: m.material.emissive.getHex() !== 0 };
  });
  check('clicking the 3D mesh selects a muscle', !!pick.id, JSON.stringify(pick));
  check('the selected muscle carries an emissive accent', pick.lit === true,
    `emissive=${pick.emissive}`);
  check('only the selected muscle is lit', await p.evaluate(() => {
    const v = window.__libv;
    let lit = 0;
    for (const [, list] of v.meshes)
      if (list[0].material.emissive.getHex() !== 0) lit++;
    return lit === 1;
  }));

  // Scrubbing must change the POSE, not just a number.
  const scrub = await p.evaluate(async () => {
    const v = window.__libv, THREE = window.__THREE;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const sample = () => {
      const m = v.meshes.get('gluteus_maximus')[0];
      const pos = m.geometry.attributes.position, t = new THREE.Vector3();
      const out = [];
      for (let i = 0; i < pos.count; i += Math.max(1, Math.floor(pos.count / 40))) {
        t.fromBufferAttribute(pos, i); m.applyBoneTransform(i, t); m.localToWorld(t);
        out.push(t.clone());
      }
      return out;
    };
    const r = document.getElementById('libScrub');
    if (!r || r.disabled) return { skipped: true };
    r.dispatchEvent(new Event('pointerdown'));
    r.value = 0; r.dispatchEvent(new Event('input')); await sleep(150);
    const at0 = sample(); const p0 = v.clipProgress();
    r.value = 500; r.dispatchEvent(new Event('input')); await sleep(150);
    const at50 = sample(); const p50 = v.clipProgress();
    const label = document.getElementById('libTime').textContent;
    // paused: the pose must NOT drift while we hold the slider
    await sleep(400);
    const held = sample();
    r.dispatchEvent(new Event('pointerup'));
    let moved = 0, drift = 0;
    for (let i = 0; i < at0.length; i++) {
      moved = Math.max(moved, at0[i].distanceTo(at50[i]));
      drift = Math.max(drift, at50[i].distanceTo(held[i]));
    }
    return { p0: +p0.toFixed(3), p50: +p50.toFixed(3), label,
             moved: +moved.toFixed(4), drift: +drift.toFixed(5) };
  });
  check('the scrubber lands where it is dragged',
    scrub.skipped || Math.abs(scrub.p50 - 0.5) < 0.02, JSON.stringify(scrub));
  check('scrubbing actually changes the pose',
    scrub.skipped || scrub.moved > 0.02, `${scrub.moved} of movement`);
  check('the pose holds still while the scrubber is held',
    scrub.skipped || scrub.drift < 0.001, `drifted ${scrub.drift} while paused`);
  check('the scrubber reports its position',
    scrub.skipped || /%/.test(scrub.label || ''), scrub.label);

  // Pause must resume from where it stopped, not restart the rep.
  const pause = await p.evaluate(async () => {
    const v = window.__libv, sleep = ms => new Promise(r => setTimeout(r, ms));
    v.setPaused(false);
    v.scrubTo(0.4); await sleep(60);
    window.libPlayPause();                 // -> paused
    const a = v.clipProgress();
    await sleep(400);
    const b = v.clipProgress();
    window.libPlayPause();                 // -> playing
    await sleep(200);
    const c = v.clipProgress();
    return { a: +a.toFixed(3), b: +b.toFixed(3), c: +c.toFixed(3) };
  });
  check('pause freezes the animation', Math.abs(pause.b - pause.a) < 0.01,
    JSON.stringify(pause));
  check('resuming continues from where it was paused, not from zero',
    pause.c > pause.b - 0.01, JSON.stringify(pause));

  await b.close();
  console.log(`\n${PASS.length} passed, ${FAIL.length} failed`);
  process.exit(FAIL.length ? 1 : 0);
})();
