const express = require('express');
const path = require('path');
const { MUSCLES, JOINTS, LIGAMENTS } = require('../data/anatomy');
const { EXERCISES } = require('../data/exercises');
const { EXERCISE_MUSCLES } = require('../data/exercise_muscles');
const { assess, RED_FLAGS, SCREENS, SYMPTOM_REGIONS } = require('./assess');
const { buildProgram, buildSchedule } = require('./program');

const app = express();
app.use(express.json({ limit: '1mb' }));


// In-memory programme store. A real deployment needs a database and, because
// this is health data, encryption at rest plus POPIA-compliant consent —
// see LEGAL.md. Deliberately not pretending an in-memory object is production.
const programs = new Map();
let nextId = 1;

app.get('/api/anatomy', (req, res) => {
  res.json({ muscles: MUSCLES, joints: JOINTS, ligaments: LIGAMENTS });
});

app.get('/api/anatomy/muscle/:id', (req, res) => {
  const m = MUSCLES.find((x) => x.id === req.params.id);
  if (!m) return res.status(404).json({ error: 'unknown muscle' });
  res.json({
    ...m,
    exercises: EXERCISES.filter((e) => e.targets.includes(m.id)).map((e) => ({
      id: e.id, name: e.name, mode: e.mode, dose: e.dose,
    })),
    // Every exercise that WORKS this muscle, split by how hard.
    worksAsPrimary: EXERCISES.filter((e) => (EXERCISE_MUSCLES[e.id] || {}).primary?.includes(m.id))
      .map((e) => ({ id: e.id, name: e.name, mode: e.mode, dose: e.dose, clip: EXERCISE_MUSCLES[e.id].clip })),
    worksAsSecondary: EXERCISES.filter((e) => (EXERCISE_MUSCLES[e.id] || {}).secondary?.includes(m.id))
      .map((e) => ({ id: e.id, name: e.name, mode: e.mode, dose: e.dose, clip: EXERCISE_MUSCLES[e.id].clip })),
    antagonistDetail: (m.antagonists || []).map((a) => MUSCLES.find((x) => x.id === a)).filter(Boolean).map((x) => ({ id: x.id, name: x.name })),
  });
});

app.get('/api/screens', (req, res) => {
  res.json({ redFlags: RED_FLAGS, screens: SCREENS, regions: Object.keys(SYMPTOM_REGIONS) });
});

// Clip metadata is read from the same file the model build consumes, so the
// starting position the UI shows can never drift from the one the animation
// actually performs.
const CLIPS = (() => {
  try {
    return JSON.parse(require('fs').readFileSync(
      require('path').join(__dirname, '..', 'tools', 'clips.json'), 'utf8'));
  } catch { return { clips: {}, postures: {} }; }
})();

const POSTURE_LABEL = {
  standing: 'Standing', supine: 'Lying on your back', prone: 'Lying face down',
  side_lying: 'Lying on your side', quadruped: 'On hands and knees',
  seated: 'Seated', half_kneeling: 'Half-kneeling',
};

function withMuscles(e) {
  const m = EXERCISE_MUSCLES[e.id] || { primary: e.targets, secondary: [], clip: null };
  const c = m.clip ? CLIPS.clips[m.clip] : null;
  return { ...e, primary: m.primary, secondary: m.secondary, clip: m.clip,
           muscleNote: m.note || null,
           clipLabel: c ? c.label : null,
           posture: c ? c.posture : null,
           postureLabel: c ? (POSTURE_LABEL[c.posture] || c.posture) : null };
}

app.get('/api/exercises', (req, res) => {
  const { muscle, mode, stage, involves } = req.query;
  let list = EXERCISES.map(withMuscles);
  if (muscle) list = list.filter((e) => e.targets.includes(muscle));
  // `involves` is the anatomical question -- which exercises WORK this muscle,
  // primary or secondary -- as opposed to which are prescribed FOR it.
  if (involves) list = list.filter((e) => e.primary.includes(involves) || e.secondary.includes(involves));
  if (mode) list = list.filter((e) => e.mode === mode);
  if (stage) list = list.filter((e) => e.stage.includes(stage));
  list.sort((a, b) => {
    if (!involves) return 0;
    return (b.primary.includes(involves) ? 1 : 0) - (a.primary.includes(involves) ? 1 : 0);
  });
  res.json({ count: list.length, exercises: list });
});

app.get('/api/exercise/:id', (req, res) => {
  const e = EXERCISES.find((x) => x.id === req.params.id);
  if (!e) return res.status(404).json({ error: 'unknown exercise' });
  res.json(withMuscles(e));
});

app.post('/api/assess', (req, res) => {
  try {
    res.json(assess(req.body || {}));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/program', (req, res) => {
  try {
    const { assessment: input, options } = req.body || {};
    const a = assess(input || {});
    const program = buildProgram(a, options || {});
    if (program.ok) program.exercises = program.exercises.map(withMuscles);
    if (!program.ok) return res.json({ assessment: a, program });
    const schedule = buildSchedule(program, (options || {}).daysPerWeek || 4);
    const id = String(nextId++);
    programs.set(id, { id, createdAt: new Date().toISOString(), assessment: a, program, schedule, name: (options || {}).name || `Programme ${id}` });
    res.json({ id, assessment: a, program, schedule });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/programs', (req, res) => {
  res.json({ programs: Array.from(programs.values()).map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt, exercises: p.program.exercises.length })) });
});

app.get('/api/programs/:id', (req, res) => {
  const p = programs.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json(p);
});

app.delete('/api/programs/:id', (req, res) => {
  res.json({ deleted: programs.delete(req.params.id) });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = '0.0.0.0';

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = require('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, '..', 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => console.log(`Mobilis running on http://${HOST}:${PORT}`));
}

if (require.main === module) {
  startServer();
}
module.exports = app;
