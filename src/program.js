/**
 * Programme builder.
 *
 * Turns assessment hypotheses into a structured, progressive plan.
 *
 * The central rule, enforced here rather than left to the author's judgement:
 *   a muscle assessed as LONG/WEAK is never prescribed stretching.
 * That is the most common and most counterproductive self-treatment error --
 * aching rhomboids in rounded-shoulder posture ache because they are already
 * overstretched, and stretching them further entrenches the pattern. There is
 * a test asserting the builder cannot emit it.
 */

const { EXERCISES } = require('../data/exercises');
const { MUSCLES } = require('../data/anatomy');

const muscleById = Object.fromEntries(MUSCLES.map((m) => [m.id, m]));

const MODE_FOR_STATE = {
  short: ['lengthen', 'release', 'mobilise'],
  weak: ['activate', 'strengthen'],
};

const STAGE_ORDER = ['acute', 'subacute', 'chronic'];

/**
 * Build a programme from assessment output.
 *
 * @param {object} assessment  output of assess()
 * @param {object} opts        { stage, daysPerWeek, minutesPerSession, equipment, maxHypotheses }
 */
function buildProgram(assessment, opts = {}) {
  if (!assessment || assessment.safe === false) {
    return {
      ok: false,
      reason: 'red_flags',
      message:
        'No programme generated. The assessment raised findings that need a clinician first. ' +
        'Exercise is not the right next step here.',
      redFlags: assessment ? assessment.redFlags : null,
    };
  }

  const {
    stage = 'subacute',
    daysPerWeek = 4,
    minutesPerSession = 25,
    equipment = ['none', 'wall', 'resistance band', 'strap or towel', 'ball', 'foam roller', 'bench', 'doorway', 'towel', 'bench or chair', 'step optional', 'light weight optional', 'none or light weight', 'optional dumbbell', 'heavy band anchor', 'partner or anchor', 'two balls or towel', 'wall, barbell or band', 'bench, barbell or band'],
    maxHypotheses = 6,
  } = opts;

  const top = (assessment.hypotheses || []).slice(0, maxHypotheses);
  if (!top.length) {
    return { ok: false, reason: 'no_findings', message: 'Not enough information yet. Complete the movement screen to generate a programme.' };
  }

  const selected = [];
  const usedIds = new Set();
  const rejected = [];

  for (const h of top) {
    const wantedModes = MODE_FOR_STATE[h.state] || [];
    const candidates = EXERCISES.filter((ex) => {
      if (!ex.targets.includes(h.muscleId)) return false;
      if (!wantedModes.includes(ex.mode)) return false;
      if (!ex.stage.includes(stage)) return false;
      if (!equipment.includes(ex.equipment)) return false;
      return true;
    });

    // SAFETY ASSERTION, kept live rather than in a comment: a weak muscle must
    // never receive a lengthening prescription.
    for (const c of candidates) {
      if (h.state === 'weak' && ['lengthen', 'release'].includes(c.mode)) {
        throw new Error(`safety violation: ${c.id} (${c.mode}) selected for weak muscle ${h.muscleId}`);
      }
    }

    if (!candidates.length) {
      rejected.push({ muscle: h.muscle, state: h.state, why: 'No exercise in the library matches this muscle, state, stage and available equipment.' });
      continue;
    }

    // Prefer activate before strengthen for weak muscles: you cannot strengthen
    // a muscle the nervous system is not recruiting.
    const order = h.state === 'weak' ? ['activate', 'strengthen'] : ['release', 'mobilise', 'lengthen'];
    candidates.sort((a, b) => order.indexOf(a.mode) - order.indexOf(b.mode));

    const pick = candidates.slice(0, 2);
    for (const ex of pick) {
      if (usedIds.has(ex.id)) {
        // Already included for another muscle -- record the extra rationale.
        const existing = selected.find((s) => s.id === ex.id);
        if (existing && !existing.addressesMuscles.includes(h.muscle)) {
          existing.addressesMuscles.push(h.muscle);
        }
        continue;
      }
      usedIds.add(ex.id);
      selected.push({
        ...ex,
        addressesMuscles: [h.muscle],
        rationale: `${h.muscle} assessed as ${h.stateLabel} (confidence ${h.confidence}%). This exercise ${modeVerb(ex.mode)}.`,
        priority: h.score,
      });
    }
  }

  selected.sort((a, b) => b.priority - a.priority);

  // Order within a session matters: release and mobilise first (they change
  // available range), then activate (recruit the muscle inside that new range),
  // then strengthen (load it), then lengthen (does not blunt strength output
  // when it comes last).
  const SESSION_ORDER = ['release', 'mobilise', 'activate', 'strengthen', 'lengthen'];
  const session = [...selected].sort(
    (a, b) => SESSION_ORDER.indexOf(a.mode) - SESSION_ORDER.indexOf(b.mode) || b.priority - a.priority
  );

  const estMinutes = session.reduce((sum, ex) => sum + estimateMinutes(ex), 0);
  const trimmed = [];
  let running = 0;
  for (const ex of session) {
    const m = estimateMinutes(ex);
    if (running + m > minutesPerSession && trimmed.length >= 4) break;
    trimmed.push(ex);
    running += m;
  }

  return {
    ok: true,
    stage,
    daysPerWeek,
    estimatedMinutes: Math.round(running),
    fullEstimateMinutes: Math.round(estMinutes),
    exercises: trimmed,
    droppedForTime: session.length - trimmed.length,
    unaddressed: rejected,
    imbalanceFocus: (assessment.imbalancePairs || []).slice(0, 3),
    progression: buildProgression(stage),
    guidance: [
      'Mild muscular discomfort during and after is expected. Sharp, shooting or joint-line pain is not — stop that exercise.',
      'Soreness that settles within 24 hours is fine. Soreness still building at 48 hours means you did too much; halve the volume.',
      'Consistency beats intensity. Four short sessions a week outperform one long one.',
      'Re-screen every 2-3 weeks and rebuild the programme — the plan should change as you do.',
      'If nothing has improved in 4-6 weeks of consistent work, stop guessing and see a physiotherapist.',
    ],
    disclaimer:
      'Generated from a self-reported movement screen. This is general exercise guidance, not treatment ' +
      'for a diagnosed condition, and it does not replace assessment by a qualified clinician.',
  };
}

function modeVerb(mode) {
  return {
    lengthen: 'restores length to it',
    strengthen: 'loads it to build strength',
    activate: 'restores its recruitment before loading',
    mobilise: 'improves the joint range it works through',
    release: 'reduces its resting tone',
  }[mode] || 'targets it';
}

function estimateMinutes(ex) {
  const d = ex.dose || '';
  const sets = parseInt((d.match(/(\d+)\s*x/) || [])[1] || '3', 10);
  const isHold = /s\b|hold/.test(d);
  const perSet = isHold ? 0.9 : 1.1;
  const bilateral = /each side/.test(d) ? 2 : 1;
  return sets * perSet * bilateral * 0.6;
}

function buildProgression(stage) {
  const idx = STAGE_ORDER.indexOf(stage);
  const steps = [
    { weeks: '1-2', focus: 'Restore range and re-establish recruitment. Low load, high quality, daily if comfortable.' },
    { weeks: '3-4', focus: 'Add load to the weak side. Keep the mobility work but reduce its volume.' },
    { weeks: '5-8', focus: 'Strength through full range, then movement-specific loading. Mobility work only where range is still limited.' },
    { weeks: '9+', focus: 'Maintenance: two sessions a week holds the gains. Re-screen monthly.' },
  ];
  return { currentStage: stage, nextStage: STAGE_ORDER[Math.min(idx + 1, 2)], steps };
}

/** Weekly schedule: distributes the session across the chosen days. */
function buildSchedule(program, daysPerWeek = program.daysPerWeek || 4) {
  if (!program.ok) return null;
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const spacing = Math.max(1, Math.floor(7 / daysPerWeek));
  const chosen = [];
  for (let i = 0, d = 0; i < daysPerWeek && d < 7; i++, d += spacing) chosen.push(DAYS[d]);

  const mobility = program.exercises.filter((e) => ['lengthen', 'release', 'mobilise'].includes(e.mode));
  const strength = program.exercises.filter((e) => ['activate', 'strengthen'].includes(e.mode));

  return chosen.map((day, i) => ({
    day,
    // Alternate emphasis, but always include the mobility work that unlocks range.
    emphasis: i % 2 === 0 ? 'strength emphasis' : 'mobility emphasis',
    exercises: i % 2 === 0 ? [...mobility.slice(0, 2), ...strength] : [...mobility, ...strength.slice(0, 2)],
  }));
}

module.exports = { buildProgram, buildSchedule, MODE_FOR_STATE };
