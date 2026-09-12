/**
 * Tests. The safety ones matter more than the feature ones: a bug in the
 * red-flag path or the stretch-a-weak-muscle rule causes real-world harm,
 * whereas a bug in scoring merely produces a mediocre programme.
 */

const { assess, screenRedFlags, RED_FLAGS, SCREENS } = require('../src/assess');
const { buildProgram, buildSchedule } = require('../src/program');
const { MUSCLES, JOINTS, LIGAMENTS } = require('../data/anatomy');
const { EXERCISES } = require('../data/exercises');

const PASS = [], FAIL = [];
function check(name, cond, detail = '') {
  if (cond) { PASS.push(name); console.log(`  ok   ${name}`); }
  else { FAIL.push(name); console.log(`  FAIL ${name}${detail ? `  -> ${detail}` : ''}`); }
}

console.log('\n--- data integrity ---');

check('anatomy has a usable number of muscles', MUSCLES.length >= 25, `${MUSCLES.length}`);
check('every muscle has a unique id', new Set(MUSCLES.map(m => m.id)).size === MUSCLES.length);
check('every muscle declares a tendency', MUSCLES.every(m => ['tonic', 'phasic'].includes(m.tendency)));
check('every muscle has actions', MUSCLES.every(m => Array.isArray(m.actions) && m.actions.length));
check('every muscle has origin and insertion', MUSCLES.every(m => m.origin && m.insertion));

const ids = new Set(MUSCLES.map(m => m.id));
const badAnt = MUSCLES.flatMap(m => (m.antagonists || []).filter(a => !ids.has(a) && a !== 'contralateral QL').map(a => `${m.id}->${a}`));
check('antagonist references resolve to real muscles', badAnt.length === 0, badAnt.join(', '));

const badTargets = EXERCISES.flatMap(e => e.targets.filter(t => !ids.has(t)).map(t => `${e.id}->${t}`));
check('every exercise targets real muscles', badTargets.length === 0, badTargets.join(', '));
check('every exercise declares a mode', EXERCISES.every(e => ['lengthen','strengthen','activate','mobilise','release'].includes(e.mode)));
check('every exercise declares stages', EXERCISES.every(e => Array.isArray(e.stage) && e.stage.length));
check('every exercise has coaching cues', EXERCISES.every(e => Array.isArray(e.cues) && e.cues.length));
check('every exercise has a dose', EXERCISES.every(e => typeof e.dose === 'string' && e.dose.length));
check('joints declare stabilisers and normal ROM', JOINTS.every(j => j.stabilisers && j.normalRom));
check('ligaments declare what they restrain', LIGAMENTS.every(l => l.restrains));

const screenTargets = SCREENS.flatMap(s => s.implies.map(i => i.muscle)).filter(m => !ids.has(m));
check('every screen implication maps to a real muscle', screenTargets.length === 0, screenTargets.join(', '));

console.log('\n--- red flags: must refuse ---');

for (const f of RED_FLAGS) {
  const r = assess({ findings: ['anterior_pelvic_tilt'], redFlagAnswers: { [f.id]: true } });
  check(`red flag '${f.id}' stops the assessment`, r.safe === false && r.hypotheses.length === 0);
}

const emergency = assess({ redFlagAnswers: { bladder_bowel: true } });
check('cauda equina is escalated as an emergency', emergency.redFlags.emergency === true);
check('emergency instruction says do not exercise', /do not exercise/i.test(emergency.redFlags.action));

const dvt = assess({ redFlagAnswers: { calf_swelling: true } });
check('suspected DVT explicitly warns against massage', /massage/i.test(dvt.redFlags.action) || /massage/i.test(dvt.redFlags.triggered[0].why));

const prog = buildProgram(assess({ findings: ['anterior_pelvic_tilt'], redFlagAnswers: { trauma: true } }));
check('no programme is generated when a red flag fired', prog.ok === false && prog.reason === 'red_flags');

const clear = screenRedFlags({});
check('no red flags means clear', clear.clear === true);

console.log('\n--- assessment reasoning ---');

const apt = assess({ findings: ['anterior_pelvic_tilt'] });
check('anterior pelvic tilt is assessed safely', apt.safe === true);
check('it implicates iliopsoas as short', apt.hypotheses.some(h => h.muscleId === 'iliopsoas' && h.state === 'short'));
check('it implicates gluteus maximus as weak', apt.hypotheses.some(h => h.muscleId === 'gluteus_maximus' && h.state === 'weak'));
check('it finds the psoas/glute imbalance pair', apt.imbalancePairs.some(p => (p.shortId === 'iliopsoas' && p.weakId === 'gluteus_maximus')));
check('every hypothesis carries its reasoning', apt.hypotheses.every(h => h.reasons.length > 0 && h.reasons.every(r => r.because && r.source)));
check('every hypothesis carries a confidence', apt.hypotheses.every(h => typeof h.confidence === 'number'));

check('confidence never reaches certainty', (() => {
  const many = assess({ findings: SCREENS.map(s => s.id) });
  return many.hypotheses.every(h => h.confidence < 100);
})());

check('more evidence raises confidence', (() => {
  const one = assess({ findings: ['single_leg_pelvic_drop'] });
  const two = assess({ findings: ['single_leg_pelvic_drop', 'overhead_squat_knees_in'] });
  const a = one.hypotheses.find(h => h.muscleId === 'gluteus_medius');
  const b = two.hypotheses.find(h => h.muscleId === 'gluteus_medius');
  return b.confidence > a.confidence;
})());

check('a movement finding outranks a mere symptom location', (() => {
  const r = assess({ findings: ['single_leg_pelvic_drop'], symptomRegions: ['neck'] });
  return r.hypotheses[0].muscleId === 'gluteus_medius';
})());

check('output is explicitly labelled as not a diagnosis', /not a diagnosis/i.test(apt.disclaimer));

check('winging implicates serratus anterior most strongly', (() => {
  const r = assess({ findings: ['scapular_winging'] });
  return r.hypotheses[0].muscleId === 'serratus_anterior';
})());

check('forward head implicates deep neck flexors as weak', (() => {
  const r = assess({ findings: ['forward_head'] });
  return r.hypotheses.some(h => h.muscleId === 'deep_neck_flexors' && h.state === 'weak');
})());

check('empty input produces no hypotheses rather than noise', assess({}).hypotheses.length === 0);

console.log('\n--- programme safety: the rule that matters ---');

const rounded = assess({ findings: ['rounded_shoulders'] });
const rp = buildProgram(rounded, { stage: 'chronic' });
check('rounded shoulders produces a programme', rp.ok === true);

check('NO weak muscle is ever prescribed stretching', (() => {
  const weak = new Set(rounded.hypotheses.filter(h => h.state === 'weak').map(h => h.muscleId));
  const shortM = new Set(rounded.hypotheses.filter(h => h.state === 'short').map(h => h.muscleId));
  for (const ex of rp.exercises) {
    if (!['lengthen', 'release'].includes(ex.mode)) continue;
    for (const t of ex.targets) {
      // Violation only if the muscle was assessed weak and NOT also short.
      if (weak.has(t) && !shortM.has(t)) return false;
    }
  }
  return true;
})());

check('rhomboids (long+weak here) get strengthening, never stretching', (() => {
  const forRhom = rp.exercises.filter(e => e.targets.includes('rhomboids'));
  return forRhom.length > 0 && forRhom.every(e => ['strengthen', 'activate'].includes(e.mode));
})());

check('pec minor (short here) gets lengthening or release', (() => {
  const forPec = rp.exercises.filter(e => e.targets.includes('pectoralis_minor'));
  return forPec.some(e => ['lengthen', 'release'].includes(e.mode));
})());

// The builder throws rather than silently emitting an unsafe pairing.
check('the builder actively refuses an unsafe pairing', (() => {
  const fake = {
    safe: true,
    hypotheses: [{ muscle: 'Rhomboids', muscleId: 'rhomboids', state: 'weak', stateLabel: 'weak', score: 5, confidence: 70, reasons: [] }],
    imbalancePairs: [],
  };
  try {
    const p = buildProgram(fake, { stage: 'chronic' });
    return p.exercises.every(e => !['lengthen', 'release'].includes(e.mode));
  } catch (e) {
    return /safety violation/.test(e.message);
  }
})());

console.log('\n--- programme construction ---');

check('acute stage excludes heavy loading', (() => {
  const r = assess({ findings: ['anterior_pelvic_tilt'] });
  const p = buildProgram(r, { stage: 'acute' });
  return p.ok && p.exercises.every(e => e.stage.includes('acute'));
})());

check('nordic curls never appear in an acute programme', (() => {
  const r = assess({ findings: ['sit_and_reach_limited', 'prone_hip_extension_hamstring_first'] });
  const p = buildProgram(r, { stage: 'acute' });
  return p.ok && !p.exercises.some(e => e.id === 'nordic_curl_eccentric');
})());

check('equipment filter is respected', (() => {
  const r = assess({ findings: ['rounded_shoulders'] });
  const p = buildProgram(r, { stage: 'chronic', equipment: ['none'] });
  return p.ok === false || p.exercises.every(e => e.equipment === 'none');
})());

check('session is ordered release/mobilise before strengthen', (() => {
  const ORDER = ['release', 'mobilise', 'activate', 'strengthen', 'lengthen'];
  const p = buildProgram(assess({ findings: ['rounded_shoulders', 'forward_head'] }), { stage: 'chronic', minutesPerSession: 90 });
  const seq = p.exercises.map(e => ORDER.indexOf(e.mode));
  return seq.every((v, i) => i === 0 || seq[i - 1] <= v);
})());

check('every prescribed exercise explains why it is there', rp.exercises.every(e => e.rationale && e.rationale.length > 10));
check('programme carries a progression plan', rp.progression && rp.progression.steps.length >= 3);
check('programme states it is not treatment', /not treatment|does not replace/i.test(rp.disclaimer));
check('programme warns about sharp pain', rp.guidance.some(g => /sharp/i.test(g)));
check('programme says when to see a clinician', rp.guidance.some(g => /physiotherapist|clinician/i.test(g)));
check('time budget is respected', (() => {
  const p = buildProgram(assess({ findings: SCREENS.map(s => s.id) }), { stage: 'chronic', minutesPerSession: 20 });
  return p.estimatedMinutes <= 32;
})());

check('a schedule can be generated', (() => {
  const s = buildSchedule(rp, 4);
  return Array.isArray(s) && s.length === 4 && s.every(d => d.day && d.exercises.length);
})());

check('no programme from an empty assessment', buildProgram({ safe: true, hypotheses: [] }).ok === false);

check('contraindications are preserved through to the programme', (() => {
  const p = buildProgram(assess({ findings: ['sit_and_reach_limited'] }), { stage: 'chronic' });
  return p.exercises.every(e => Array.isArray(e.contraindications));
})());

console.log(`\n${PASS.length} passed, ${FAIL.length} failed`);
if (PASS.length < 45) { console.log(`FAIL — only ${PASS.length} assertions ran; expected at least 45`); process.exit(1); }
process.exit(FAIL.length ? 1 : 0);
