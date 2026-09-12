/**
 * Animation + exercise-library data tests (no browser).
 * Browser-side deformation is covered in tests/test_browser.js.
 */
const fs=require('fs'), path=require('path');
const { EXERCISES } = require('../data/exercises');
const { EXERCISE_MUSCLES } = require('../data/exercise_muscles');
const { MUSCLES } = require('../data/anatomy');

const PASS=[],FAIL=[];
const check=(n,c,d='')=>{if(c){PASS.push(n);console.log(`  ok   ${n}`);}else{FAIL.push(n);console.log(`  FAIL ${n}${d?`  -> ${d}`:''}`);}};

const ROOT=path.join(__dirname,'..');
const ids=new Set(MUSCLES.map(m=>m.id));
const exIds=new Set(EXERCISES.map(e=>e.id));

console.log('\n--- exercise/muscle involvement ---');
check('every exercise declares primary+secondary muscles',
  EXERCISES.every(e=>EXERCISE_MUSCLES[e.id]), EXERCISES.filter(e=>!EXERCISE_MUSCLES[e.id]).map(e=>e.id).join(', '));
check('no involvement entry is orphaned',
  Object.keys(EXERCISE_MUSCLES).every(k=>exIds.has(k)));
check('every referenced muscle exists', (()=>{
  const bad=[];for(const[k,v]of Object.entries(EXERCISE_MUSCLES))
    for(const m of [...v.primary,...v.secondary]) if(!ids.has(m)) bad.push(`${k}->${m}`);
  return bad.length===0;})());
check('every exercise has at least one primary muscle',
  Object.values(EXERCISE_MUSCLES).every(v=>v.primary.length>0));
check('no muscle is both primary and secondary in one exercise',
  Object.values(EXERCISE_MUSCLES).every(v=>!v.primary.some(m=>v.secondary.includes(m))));

// The whole point of the separate file: display involvement must not silently
// become the clinical prescription target.
check('involvement data is separate from prescription targets', (()=>{
  const diff=EXERCISES.filter(e=>{
    const v=EXERCISE_MUSCLES[e.id];
    return JSON.stringify([...v.primary].sort())!==JSON.stringify([...e.targets].sort());
  });
  return diff.length>0;})(), 'they are identical, so the split adds nothing');

console.log('\n--- clips ---');
const clipFile=path.join(ROOT,'tools','clips.json');
check('clips.json exists', fs.existsSync(clipFile));
const doc=JSON.parse(fs.readFileSync(clipFile,'utf8'));
const clips=doc.clips;
const clipNames=Object.keys(clips).filter(k=>!k.startsWith('_'));
const clipSet=new Set(clipNames);

check('every referenced clip is defined', (()=>{
  const bad=Object.entries(EXERCISE_MUSCLES).filter(([,v])=>v.clip&&!clipSet.has(v.clip)).map(([k,v])=>`${k}->${v.clip}`);
  return bad.length===0;})());
check('every clip has keyframe tracks or finger spec',
  [...clipNames].every(n=>(clips[n].tracks&&clips[n].tracks.length)||clips[n].fingers));
check('every clip declares a human-readable label',
  [...clipNames].every(n=>typeof clips[n].label==='string'&&clips[n].label.length));
check('clip keyframes return to the start (loopable)', (()=>{
  const bad=[];
  for(const n of clipNames) for(const t of (clips[n].tracks||[])){
    const k=t.keys; if(k.length<2) continue;
    if(Math.abs(k[0][1]-k[k.length-1][1])>0.01) bad.push(`${n}/${t.bone}`);
  }
  return bad.length===0;})());
check('exercises with no clip are deliberate, not accidental', (()=>{
  const none=Object.entries(EXERCISE_MUSCLES).filter(([,v])=>!v.clip).map(([k])=>k);
  // Only soft-tissue releases and static resting positions may lack a clip.
  // v4 left 13 exercises unanimated including dead bug and bird dog, which are
  // plainly movements; those now have clips. Anything else missing one is a gap.
  return none.every(id=>/_release$|_relaxation$/.test(id));})(),
  Object.entries(EXERCISE_MUSCLES).filter(([,v])=>!v.clip).map(([k])=>k).join(', '));

check('every clip declares a setup posture', (()=>{
  const bad=[...clipNames].filter(n=>!clips[n].posture);
  return bad.length===0;})(), [...clipNames].filter(n=>!clips[n].posture).join(', '));

check('postures are all defined', (()=>{
  const defined=new Set(Object.keys(JSON.parse(fs.readFileSync(clipFile,'utf8')).postures||{}));
  return [...clipNames].every(n=>defined.has(clips[n].posture));})());

// The v4 failure in one assertion: a demonstration needs real range of motion.
// A Romanian deadlift authored at 15 degrees of hip flexion is not an RDL, and
// the old tests could not tell the difference.
check('clips reach real physiological range, not a token twitch', (()=>{
  const weak=[];
  for(const n of clipNames){
    const peak=Math.max(0,...(clips[n].tracks||[]).map(t=>Math.max(...t.keys.map(([,v])=>Math.abs(v)))));
    // small_range must be declared per clip: breathing really is a few degrees
    // of rib expansion. Declaring it is a deliberate act; a forgotten clip is
    // caught. v4 would have failed this on nearly every clip.
    if(peak<12 && !clips[n].fingers && !clips[n].small_range) weak.push(`${n}:${peak}`);
  }
  return weak.length===0;})(), 'clips whose largest joint angle is under 12 degrees');

check('lying-down exercises are not authored standing', (()=>{
  const LYING={bridge:1,hip_thrust:1,leg_raise:1,dead_bug:1,serratus_punch:1,
               breathing:1,spine_extension:1,prone_y_raise:1,hip_abduction:1,
               side_plank:1,clamshell:1,copenhagen:1,sleeper_stretch:1};
  const bad=Object.keys(LYING).filter(n=>clips[n]&&clips[n].posture==='standing');
  return bad.length===0;})());

console.log('\n--- animated model build ---');
const manFile=path.join(ROOT,'public','models','animated_manifest.json');
const hasMan=fs.existsSync(manFile);
check('animated_manifest.json exists (build has run)', hasMan);
if(hasMan){
  const man=JSON.parse(fs.readFileSync(manFile,'utf8'));
  check('animated.glb exists on disk', fs.existsSync(path.join(ROOT,'public','models',man.file)));
  check('nothing missing from the animated build', man.missing.length===0, man.missing.join(', '));
  check('every engine muscle is in the animated model',
    MUSCLES.every(m=>man.muscles.includes(m.id)),
    MUSCLES.filter(m=>!man.muscles.includes(m.id)).map(m=>m.id).join(', '));
  check('all meshes are bound to the rig', man.bound===man.meshes.length, `${man.bound}/${man.meshes.length}`);
  check('no mesh needed a rigid single-bone fallback',
    (man.rigid_fallback||[]).length===0, (man.rigid_fallback||[]).join(', '));
  check('every muscle has an explicit origin and insertion bone',
    MUSCLES.every(m=>man.attachments&&man.attachments[m.id]&&man.attachments[m.id].origin&&man.attachments[m.id].insertion),
    MUSCLES.filter(m=>!(man.attachments||{})[m.id]).map(m=>m.id).join(', '));
  check('constraint results were baked into real keyframes',
    man.clips.every(c=>c.baked_channels>0),
    man.clips.filter(c=>!c.baked_channels).map(c=>c.name).join(', '));
  // Baked channel counts are high by nature: one spine rotation legitimately
  // propagates through 24 vertebrae and 21 rib bones via constraints. The bug
  // worth guarding is CROSS-CONTAMINATION -- an unmuted NLA strip from an
  // earlier clip is part of the animation state the bake evaluates, so every
  // clip came out layered on its predecessors. The tell was channel counts
  // rising monotonically with build order instead of with clip complexity.
  check('clips do not inherit each other during baking', (()=>{
    const n=man.clips.map(c=>c.baked_channels);
    let rising=0;
    for(let i=1;i<n.length;i++) if(n[i]>=n[i-1]) rising++;
    return rising < n.length*0.8;})(),
    `${man.clips.length} clips, counts: ${man.clips.slice(0,4).map(c=>c.baked_channels).join(',')}...`);
  check('a simple clip is cheaper than a complex one',
    (man.clips.find(c=>c.name==='jaw_open')||{}).baked_channels <
    (man.clips.find(c=>c.name==='squat')||{}).baked_channels);
  check('every clip in clips.json was built',
    [...clipNames].every(n=>man.clips.some(c=>c.name===n)));
  check('no clip references a bone missing from the rig',
    man.clips.every(c=>!c.missing_bones||c.missing_bones.length===0));
  check('every built clip applied at least one track',
    man.clips.every(c=>c.tracks_applied>0));
  check('animated payload stays reasonable', man.bytes/1048576<14, `${(man.bytes/1048576).toFixed(1)} MB`);
  check('rigid fallbacks never land on an unrelated bone', (()=>{
    const bad=(man.rigid_fallback||[]).filter(f=>{
      const [name,bone]=f.split('->');
      const mid=name.replace(/__(l|r)$/,'');
      // a leg muscle must not be welded to the skull, etc.
      if(/gluteus|quadriceps|hamstring|iliopsoas|gastroc|soleus|tibialis|peroneal|adductor/.test(mid))
        return /Head|Mandible|C\d|Neck/.test(bone);
      return false;
    });
    return bad.length===0;})(), (man.rigid_fallback||[]).join(', '));
}


// ---------------------------------------------------------------------------
// v7: clips must be MEASURED from human movement, not hand-authored.
//
// Every earlier version passed its own tests while looking wrong, because the
// tests asserted "something moved" rather than "this resembles a human". These
// assert the specific properties hand-authored clips structurally lacked.
// ---------------------------------------------------------------------------
console.log('\n--- measured movement ---');
const srcOf=n=>clips[n].source;
const measured=clipNames.filter(n=>srcOf(n)==='measured');
const shaped=clipNames.filter(n=>srcOf(n)==='shaped');

check('every clip declares where its motion came from',
  clipNames.every(n=>['measured','shaped','static'].includes(srcOf(n))),
  clipNames.filter(n=>!srcOf(n)).join(', '));
check('the compound lower-body and pulling movements are measured, not guessed',
  ['squat','hinge','leg_raise','row','spine_flexion'].every(n=>srcOf(n)==='measured'),
  ['squat','hinge','leg_raise','row','spine_flexion'].filter(n=>srcOf(n)!=='measured').join(', '));
check('measured clips record their source video and rep count',
  measured.every(n=>clips[n].measured_from&&clips[n].measured_from.video&&clips[n].measured_from.reps_averaged>0));

// A symmetric triangle peaks at exactly the midpoint. Real movement does not.
// This is the single assertion that would have failed every clip in v4-v6.
// Peak position as the CENTROID of the near-peak plateau, not argmax. Real
// movement dwells at end range for ~15% of the cycle, so argmax lands
// arbitrarily anywhere inside a flat top -- the measured hinge reported 0.60
// or 0.45 depending on which of several equal keys came first. The centroid
// is the property we actually mean.
const peakFraction=(t)=>{
  const k=t.keys, n=k[k.length-1][0];
  // Measured FROM REST, not from zero. Tracks carry a setup posture (the
  // nordic curl's knees rest at 95 deg, the bridge's at 85), so an absolute
  // magnitude picks the setup value as the "peak" and reports the wrong
  // instant -- which made two correct clips look unsequenced.
  const rest=k[0][1];
  const peak=Math.max(...k.map(x=>Math.abs(x[1]-rest)));
  if(peak<1e-9) return 0.5;
  const near=k.filter(x=>Math.abs(x[1]-rest)>=0.9*peak);
  return near.reduce((a,x)=>a+x[0],0)/near.length/n;
};
check('no clip uses a symmetric peak-at-the-midpoint triangle', (()=>{
  const tri=[];
  for(const n of clipNames){
    for(const t of clips[n].tracks||[]){
      // `held` marks a constant-value track: a setup posture kept for the
      // clip's duration, which has no movement to shape and is not a
      // hand-authored triangle.
      if(t.held) continue;
      if(t.keys.length===3 && Math.abs(peakFraction(t)-0.5)<0.02) tri.push(`${n}/${t.bone}`);
    }
  }
  return tri.length===0;})(), 'three-key triangle clips remain');

// Applied to the PRIMARY mover only. Secondary joints legitimately peak late
// -- in the recorded squat the arms peak at 0.84 while the knee peaks at 0.50,
// because the lifter's arms settle after the legs have reversed. Asserting it
// on every track would force out exactly the sequencing we want.
check('the primary mover peaks before the midpoint, as measured humans do', (()=>{
  const late=[];
  for(const n of clipNames){
    const ts=clips[n].tracks||[]; if(!ts.length) continue;
    const amp=t=>{const v=t.keys.map(k=>k[1]);return Math.max(...v)-Math.min(...v);};
    const moving=ts.filter(t=>!t.held); if(!moving.length) continue;
    const driver=moving.reduce((a,b)=>amp(b)>amp(a)?b:a);
    const f=peakFraction(driver);
    if(f>0.60) late.push(`${n}/${driver.bone}@${f.toFixed(2)}`);
  }
  return late.length===0;})());

// Joints that all peak on the same frame is what reads as a mannequin.
// Exempt: clips whose bones form ONE rigid group with nothing to sequence
// against -- the four ribs of a breathing clip do move together, and a heel
// raise is a single ankle pair. Naming them is the honest form of the
// exemption; a blanket threshold would have hidden the real cases.
const SINGLE_JOINT_GROUP=new Set(['heel_raise','breathing','jaw_open',
  'wrist_flexion','wrist_extension','finger_extension','thumb_opposition','grip']);
// Closed-chain exemption, by PROPERTY rather than by name: when a clip's
// bones are a Hips rotation plus its femur counter-rotation, they MUST move
// on the same frame -- that pairing is what keeps the feet on the floor while
// the pelvis rotates. Lagging them apart would lift the body off the ground,
// which is the bug v5 shipped. Same for a leg raise, where thigh and shank
// travel as one rigid segment because the knee stays extended.
const closedChain=(n)=>{
  const bones=(clips[n].tracks||[]).map(t=>t.bone);
  const set=new Set(bones);
  const pelvisPair=set.has('Hips')&&(set.has('LeftUpLeg')||set.has('RightUpLeg'));
  const rigidLeg=bones.every(b=>/UpLeg|Tibia/.test(b));
  return bones.length<=4&&(pelvisPair||rigidLeg);
};
check('multi-joint clips sequence their joints rather than peaking together', (()=>{
  const sync=[];
  for(const n of clipNames){
    if(SINGLE_JOINT_GROUP.has(n)||closedChain(n)) continue;
    const ts=(clips[n].tracks||[]).filter(t=>t.keys.length>2&&!t.held);
    if(ts.length<3) continue;
    const fs=ts.map(peakFraction);
    if(Math.max(...fs)-Math.min(...fs)<0.02) sync.push(n);
  }
  return sync.length===0;})(), 'clips whose joints all peak on one frame');

check('measured clips reach real physiological amplitude', (()=>{
  // measured floors, in degrees, from the recorded videos
  // hinge is asserted on Hips, NOT LowerBack. An earlier version of this test
  // required 25 deg of LowerBack flexion in a Romanian deadlift, which is a
  // ROUNDED-BACK deadlift -- the test was demanding the injury the exercise
  // exists to prevent. A hip hinge folds at the pelvis with a neutral spine,
  // so the assertion belongs on Hips, and the spine must stay quiet.
  // squat's femur floor is 55, not 70, and that is a CORRECTION not a
  // relaxation. Total hip flexion is the pelvis plus the femur: v9 moved 30
  // degrees of it into the pelvic hinge (the centre-of-mass compensation a
  // human makes), leaving 66 on the femur. 66 + 30 = 96, against the 97
  // measured on the lifter. Asserting 70 on the femur alone would now demand
  // 100 degrees of TOTAL hip flexion in a clip that correctly has 96 -- the
  // test would be enforcing the absence of the torso lean. Total is asserted
  // separately below.
  const floor={squat:{LeftUpLeg:55,'Tibia.l':70}, hinge:{Hips:55},
               leg_raise:{LeftUpLeg:80}, row:{LeftArm:35}};
  const bad=[];
  for(const [clip,bones] of Object.entries(floor)){
    for(const [bone,deg] of Object.entries(bones)){
      const t=(clips[clip].tracks||[]).find(x=>x.bone===bone);
      if(!t){bad.push(`${clip}/${bone} missing`);continue;}
      const v=t.keys.map(k=>k[1]), amp=Math.max(...v)-Math.min(...v);
      if(amp<deg) bad.push(`${clip}/${bone} ${amp.toFixed(0)}<${deg}`);
    }
  }
  return bad.length===0;})());

// The rig is pelvis-rooted, so a foot landmark pair drives nothing reliable.
// The corollary of the hinge fix, asserted separately so a regression cannot
// hide behind the amplitude check passing.
// The squat's hip flexion is SHARED between the pelvis and the femur. Assert
// the total, so neither half can quietly go missing: v7 lost the pelvic hinge
// to a relevance filter and the torso stood bolt upright while the hips
// dropped, which is the most non-human thing the library has done.
check('the squat splits hip flexion between pelvis and femur', (()=>{
  const amp=b=>{const t=(clips.squat.tracks||[]).find(x=>x.bone===b);
    if(!t) return 0; const v=t.keys.map(k=>k[1]); return Math.max(...v)-Math.min(...v);};
  const femur=amp('LeftUpLeg'), pelvis=amp('Hips');
  return pelvis>=18 && femur>=50 && (pelvis+femur)>=85;})(),
  'pelvis+femur hip flexion is short, or the pelvic hinge is missing');

// Centre-of-mass compensation: the deepest frame must have the most lean.
// Shifting the lean curve by the measured lag put peak lean in the ASCENT --
// at maximum squat depth the torso was still near-vertical (5.5 of 29.5
// degrees), which reads as a stumble rather than a squat.
check('the squat leans most at its deepest point', (()=>{
  const get=b=>(clips.squat.tracks||[]).find(x=>x.bone===b);
  const fem=get('LeftUpLeg'), hip=get('Hips');
  if(!fem||!hip) return false;
  let di=0,dv=-1e9;
  fem.keys.forEach((k,i)=>{if(k[1]>dv){dv=k[1];di=i;}});
  const lean=Math.abs(hip.keys[di][1]);
  const peak=Math.max(...hip.keys.map(k=>Math.abs(k[1])));
  return peak>1 && lean >= 0.8*peak;})(),
  'peak trunk lean does not coincide with peak squat depth');

check('the hip hinge folds at the pelvis, not by rounding the spine', (()=>{
  const spine=(clips.hinge.tracks||[]).filter(t=>/LowerBack|^Spine/.test(t.bone));
  const worst=Math.max(0,...spine.map(t=>{const v=t.keys.map(k=>k[1]);return Math.max(...v)-Math.min(...v);}));
  return worst<12;})(), 'spinal flexion in the hinge exceeds a neutral-spine tolerance');

check('no clip animates the foot from tracked heel/toe landmarks', (()=>{
  const bad=[];
  for(const n of measured) for(const t of clips[n].tracks||[])
    if(/Foot|ToeBase/.test(t.bone)){
      const v=t.keys.map(k=>k[1]);
      if(Math.max(...v)-Math.min(...v)>60) bad.push(`${n}/${t.bone}`);
    }
  return bad.length===0;})(), 'implausible ankle range from noisy landmarks');

check('shaped clips keep their clinical amplitude', (()=>{
  // shaping changes TIMING only; peak magnitude must survive it
  const bad=[];
  for(const n of shaped) for(const t of clips[n].tracks||[]){
    const v=t.keys.map(k=>Math.abs(k[1]));
    if(Math.max(...v)<1) bad.push(`${n}/${t.bone}`);
  }
  return bad.length===0;})());

check('provenance is documented in the clip file', !!doc._provenance);


// ---------------------------------------------------------------------------
// v8: vertex weights around the active joints.
//
// Read from a report generated off the SHIPPED glTF (tools/inspect_weights.py),
// not from the Blender scene -- in v4 the exporter silently dropped skinning
// while an in-Blender "is it bound?" check passed the whole time.
// ---------------------------------------------------------------------------
console.log('\n--- vertex weights ---');
const wbPath=path.join(ROOT,'tools','weights_baseline.json');
if(!fs.existsSync(wbPath)){
  check('weight baseline exists (run tools/inspect_weights.py)', false);
}else{
  const wb=JSON.parse(fs.readFileSync(wbPath,'utf8'));
  const skinned=Object.entries(wb).filter(([,v])=>v.skinned);

  check('every muscle mesh is skinned', Object.values(wb).every(v=>v.skinned),
    Object.entries(wb).filter(([,v])=>!v.skinned).map(([k])=>k).join(', '));

  check('all weights are normalised', skinned.every(([,v])=>
    Math.abs(v.weight_sum_min-1)<0.01 && Math.abs(v.weight_sum_max-1)<0.01),
    skinned.filter(([,v])=>Math.abs(v.weight_sum_min-1)>=0.01).map(([k])=>k).join(', '));

  // The design: a chain of LOCAL two-bone blends. A vertex influenced by 3+
  // bones is blending across bones it does not sit between, which is the v4
  // auto-weight failure (28x stretch) coming back.
  // Two for straps, four for spine sheets. A strap is a chain of LOCAL
  // two-bone blends and must stay that way -- blending a strap vertex across
  // more bones is the v4 auto-weight failure (28x stretch). A sheet lying on
  // the spine is the deliberate exception: it needs a smooth falloff over
  // several vertebrae, capped at 4 because that is glTF's per-vertex limit
  // and exceeding it makes the exporter silently truncate.
  const SHEET=new Set(['erector_spinae','quadratus_lumborum']);
  const isSheet=n=>SHEET.has(n.replace(/__(l|r)$/,''));
  check('no strap vertex blends across more than two bones', skinned.every(([k,v])=>
    isSheet(k) ? v.max_influences_per_vertex<=4 : v.max_influences_per_vertex<=2),
    skinned.filter(([k,v])=>v.max_influences_per_vertex>(isSheet(k)?4:2)).map(([k])=>k).join(', '));

  // The joints Willie asked about specifically. Each of these muscles crosses
  // more than one bone and must be influenced by all of them.
  const CHAIN={
    deltoid:['Clavicle-Z','Scapula','Arm'],
    triceps_brachii:['Scapula','Arm','Ulna'],
    biceps_brachii:['Scapula','Arm','Radius'],
    // hamstrings is Hips->Tibia with NO femur via bone, deliberately: the
    // femur anchor took 67% of the weight and left the pelvic origin 5%,
    // which broke hamstring travel in the hip hinge once v9 moved the fold
    // into the pelvis. A via bone helps only when both ends keep authority.
    hamstrings:['Hips','Tibia'],
    gastrocnemius:['UpLeg','Tibia'],
    wrist_flexors:['Arm','Ulna','carpal'],
  };
  check('multi-joint muscles are influenced by every bone they cross', (()=>{
    const bad=[];
    for(const [mid,want] of Object.entries(CHAIN)){
      for(const side of ['l','r']){
        const r=wb[`${mid}__${side}`]; if(!r) { bad.push(`${mid}__${side} missing`); continue; }
        const bones=r.influences.map(i=>i.bone).join('|');
        for(const w of want) if(!bones.includes(w)) bad.push(`${mid}__${side} lacks ${w}`);
      }
    }
    return bad.length===0;})());

  // Accidental weight from a distant bone. Measured by SHARE, not distance:
  // a long bone's origin is legitimately ~50cm from a muscle's centroid, and
  // treating that as the bug is what sent me down a wrong path that made the
  // worst stretch ten times worse.
  check('no muscle takes major weight from a bone it does not span', (()=>{
    const bad=[];
    for(const [name,v] of skinned)
      for(const i of v.influences)
        if(i.dist_cm>55 && i.share>0.20) bad.push(`${name}<-${i.bone} ${i.share}@${i.dist_cm}cm`);
    return bad.length===0;})());

  check('the deliberately rigid muscles are still rigid', (()=>{
    const RIGID=['rotator_cuff','hand_intrinsics','suboccipitals','piriformis'];
    return RIGID.every(m=>['l','r'].every(s=>{
      const r=wb[`${m}__${s}`]; return r && r.n_bones===1;}));})());
}

console.log('\n--- viewer API ---');
const v=fs.readFileSync(path.join(ROOT,'public','viewer3d.js'),'utf8');
check('viewer can load the animated model', v.includes('loadAnimated'));
check('viewer can play and stop clips', v.includes('playClip'));
check('viewer supports primary/secondary role colouring', v.includes('setRoles')&&v.includes('primary')&&v.includes('secondary'));
check('viewer advances the animation mixer each frame', v.includes('this.mixer.update'));
const html=fs.readFileSync(path.join(ROOT,'public','index.html'),'utf8');
check('exercise library tab exists', html.includes('tab-library')&&html.includes('Exercise library'));
check('library has playback controls', html.includes('libPlayPause')&&html.includes('libSpeed'));
check('library legend explains the colours', html.includes('primary muscle')&&html.includes('secondary'));

// ---------------------------------------------------------------------------
// v10: 3D canvas interaction. Static checks here; the behaviour that matters
// (does the camera actually move, does scrubbing actually change the pose) is
// asserted in tests/test_browser.js against a real WebGL context.
// ---------------------------------------------------------------------------
console.log('\n--- canvas interaction ---');
check('viewer can focus-frame a single muscle', v.includes('focusOn'));
check('viewer can return to the full-body framing', v.includes('resetCamera'));
check('camera moves are interpolated, not snapped', v.includes('lerpTo')&&v.includes('_tickLerp'));
// A lerp driven off setInterval drifts against the render loop and stutters
// exactly when frame rate is already low.
// Search from the definition to the render call, rather than a fixed window:
// a comment block in between pushed _tickLerp past a 400-char slice and
// failed a correct implementation.
check('the camera lerp is driven by the render loop', (()=>{
  const i=v.indexOf('_animate() {');
  if(i<0) return false;
  const end=v.indexOf('renderer.render', i);
  return end>i && v.slice(i, end).includes('_tickLerp');})());
// A frame delta must be clamped or a hidden tab returns with a multi-second
// delta that completes a whole lerp in one frame.
check('the frame delta is clamped against tab-switch gaps', (()=>{
  const i=v.indexOf('_clock.getDelta()');
  return i>0 && v.slice(Math.max(0,i-40), i+40).includes('Math.min');})());
check('focus framing measures the POSED mesh, not the rest pose', (()=>{
  const i=v.indexOf('focusOn(');
  return i>0 && v.slice(i, i+1600).includes('applyBoneTransform');})(),
  'a SkinnedMesh bounding box is its rest pose, so framing would aim at the wrong place');
check('the active muscle gets an emissive accent', v.includes('accent')&&v.includes('material.emissive'));
// Phong ignores emissiveIntensity; setting it reads correctly in the material
// and renders nothing.
check('emissive accent does not rely on emissiveIntensity under Phong', (()=>{
  const i=v.indexOf('material.emissive.setHex(COLORS.accent)');
  return i>0 && v.slice(i, i+120).includes('multiplyScalar');})());
check('viewer exposes clip time for scrubbing', v.includes('scrubTo')&&v.includes('clipProgress')&&v.includes('clipDuration'));
// mixer.setTime re-evaluates the clip from zero; per-drag that is visibly laggy.
check('scrubbing sets the action time rather than rewinding the mixer', (()=>{
  const i=v.indexOf('scrubTo(');
  const seg=v.slice(i, i+600);
  return i>0 && seg.includes('currentAction.time') && !seg.includes('mixer.setTime');})());
check('pausing does not tear down the action', (()=>{
  const i=v.indexOf('setPaused(');
  return i>0 && v.slice(i, i+300).includes('paused');})(),
  'pausing by stopping the action restarts the rep from frame 0 on resume');

check('viewport has a floating reset-camera control', html.includes('camreset')&&html.includes('resetCam('));
check('every 3D viewport gets its own reset control', (()=>{
  const n=(html.match(/class="camreset"/g)||[]).length;
  return n>=3;})(), 'assess, anatomy and library each need one');
check('library has a playback scrubber', html.includes('libScrub')&&html.includes('type="range"'));
check('scrubber reports position to the user', html.includes('libTime'));
check('playback bar offers 0.5x and 1x', html.includes('libSpeed(0.5')&&html.includes('libSpeed(1,'));
check('scrubbing restores the previous play state', html.includes('scrubWasPlaying'));
// Arrow keys fire input with no pointer press, so a pointer-only binding
// leaves a keyboard user permanently paused.
check('the scrubber is keyboard operable', (()=>{
  const i=html.indexOf('function libBindScrub');
  return i>0 && html.slice(i, i+1600).includes('keydown');})());
check('the scrubber is disabled for exercises with no clip', (()=>{
  const i=html.indexOf("id('libScrub')");
  return html.includes('r.disabled=!played');})());
check('clicking a muscle in the library does not navigate away', (()=>{
  const i=html.indexOf("v3dx'),{onSelect");
  if(i<0) return false;
  const body=html.slice(i, html.indexOf('}});', i));
  return !body.includes('libLoad()') && body.includes('libInspect');})(),
  'a click mid-demonstration used to reload the exercise list and lose the clip');

console.log(`\n${PASS.length} passed, ${FAIL.length} failed`);
if(PASS.length<35){console.log(`FAIL — only ${PASS.length} assertions ran; expected at least 35`);process.exit(1);}
process.exit(FAIL.length?1:0);
