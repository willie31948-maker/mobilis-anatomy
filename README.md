# Mobilis

Movement assessment and corrective exercise programming. Working prototype.

**Read `LEGAL.md`** — it explains why this app interprets and coaches rather
than diagnoses, and what that requires of the code and the copy.
**Read `MODELS.md`** for the anatomy-model options with real costs.

## Run

    npm install
    node src/server.js          # http://localhost:8402
    node tests/test_all.js        # 58 checks — engine + safety rules
    node tests/test_models.js     # 30 checks — 3D asset stays in sync with the engine
    node tests/test_animation.js  # 29 checks — clips, involvement data, animated build
    node tests/test_browser.js    # 38 checks — real browser + WebGL (needs playwright)

Regenerate the 3D meshes from source (optional, they are committed):

    pip install bpy
    # static per-region meshes
    python3 tools/extract_models.py --blend /path/to/Z-Anatomy/Startup.blend \
        --out public/models --budget 4000
    # skinned + animated model
    python3 tools/build_animated.py \
        --anatomy /path/to/Z-Anatomy/Startup.blend \
        --biomech /path/to/Z-Biomechanics/Startup.blend \
        --out public/models --budget 2500

## What it does

1. **Safety screen** — eight red flags (cauda equina, DVT, fracture,
   progressive weakness, malignancy, infection, systemic illness, vertebral
   fracture risk). Any positive stops the assessment and refers out. No
   programme is generated. Tested.
2. **Movement screen** — 22 observable findings across the whole body: overhead
   squat, single-leg stance, Thomas test position, posture, scapular winging,
   painful arc, prone hip extension firing order, plus elbow pain on gripping,
   forearm rotation limits, hand numbness, jaw clenching, headache patterns,
   breathing pattern and neck rotation asymmetry.
3. **Interpretation** — 22 movement/symptom screens; weighted evidence produces *ranked hypotheses*: which
   muscles appear short/overactive, which appear long/underactive, each with a
   confidence figure and the specific findings that produced it.
4. **Imbalance pairs** — identifies antagonist pairs where one side is short
   and the other weak. This is the clinically useful output: a pair explains a
   *pattern*, a single tight muscle explains only a symptom.
5. **Programme builder** — selects exercises by muscle, required mode, stage
   and available equipment; orders the session correctly; fits a time budget;
   generates a weekly schedule and an 8-week progression.
6. **3D anatomy** — all 49 muscles as real, individually clickable meshes
   (Z-Anatomy, CC BY-SA 4.0), colour-coded live from your assessment: orange =
   short/overactive, blue = long/underactive, everything else dimmed. Full body
   including arms, forearms, hands, neck and jaw, plus an optional skeleton
   layer (skull, arm and hand bones) for orientation. ~5 MB total. A 2D
   schematic remains as an instant-loading, no-WebGL fallback.
7. **Exercise library with animated demonstration** — pick a muscle, see every
   exercise that works it (split into *directly* and *as an assistant*), and
   watch the model perform it. **Primary muscles render red, secondary amber**,
   everything else dims. 26 authored clips; exercises that are static holds,
   releases or breathing drills carry no clip and say so rather than showing a
   misleading movement.
8. **Anatomy browser** — 49 muscles, 7 joints, 5 ligaments with origin,
   insertion, actions, referral patterns and clinical notes, cross-linked to
   antagonists and to every exercise that targets them.

## Two different questions about muscles, kept apart

`exercises.js` `targets` answers a **clinical** question: which muscle is this
exercise *prescribed for*, in which mode. The programme builder's safety rule
depends on it.

`exercise_muscles.js` answers an **anatomical** one: which muscles actually
*do work* during the movement, split primary/secondary, for the animation.

They are genuinely different. The doorway pec stretch is prescribed for the
pectorals, but the rhomboids and lower trapezius are working to hold you there.
Merging the two files would let a display concern quietly change what gets
prescribed — so they stay separate, and a test asserts they are not identical.

## The rule the whole design protects

**A muscle assessed as long/weak is never prescribed stretching.**

This is the most common and most counterproductive self-treatment error. Aching
rhomboids in rounded-shoulder posture ache because they are *already
overstretched*; stretching them further entrenches the pattern. The programme
builder throws an exception rather than emit that pairing, and a test asserts
it.

This is why every exercise declares a `mode` (lengthen / strengthen / activate /
mobilise / release) rather than a flat list of muscles it "works". A flat list
would silently permit the error.

## Architecture

| File | Purpose |
|---|---|
| `data/anatomy.js` | Muscles, joints, ligaments. Each muscle declares tonic/phasic tendency, actions, antagonists, referral pattern. |
| `data/exercises.js` | Exercise library. Every entry declares mode, targets, stage, equipment, dose, cues, contraindications. |
| `src/assess.js` | Red-flag triage and weighted reasoning to ranked hypotheses. |
| `src/program.js` | Programme construction, session ordering, progression, schedule. |
| `src/server.js` | JSON API. |
| `public/index.html` | UI: assessment flow, programme view, 2D/3D toggle. |
| `public/viewer3d.js` | three.js viewer. Meshes named `<muscle_id>__l/__r`; clicks resolve to muscle ids. |
| `public/models/*.glb` | Extracted anatomy, one file per region + manifest. |
| `tools/muscle_map.json` | **The only coupling between 3D assets and the engine.** |
| `tools/extract_models.py` | Headless Blender pipeline: join, rename, decimate, export. |
| `tools/build_animated.py` | Skins the muscles to the 237-bone rig and bakes the exercise clips. |
| `tools/clips.json` | Exercise animations as joint angles. Editable without touching code. |
| `data/exercise_muscles.js` | Primary/secondary involvement + clip per exercise. |

**The model layer is deliberately isolated, and that design was just proven.**
Both renderers honour one contract: a muscle id in, a colour out. The 2D map
tags SVG paths `data-mid="<muscle_id>"`; the 3D layer names meshes
`<muscle_id>__l/__r`. Adding real 3D anatomy required **zero changes** to
`assess.js`, `program.js`, `server.js` or the data files. See `MODELS.md`.

## Session ordering is not arbitrary

Release → mobilise → activate → strengthen → lengthen.

Release and mobilise change available range; activation recruits the muscle
inside that new range; strengthening loads it; lengthening goes last because
static stretching before strength work blunts force output.

## What this prototype is not

- **Not clinically validated.** The reasoning encodes standard clinical
  patterns, but the weights are reasoning heuristics, not validated diagnostic
  coefficients. The UI says so and the output repeats it.
- **Not reviewed by a clinician.** Highest-value next step: have a
  physiotherapist or biokineticist review `data/exercises.js` and the `SCREENS`
  rules in `src/assess.js`.
- **Not production storage.** Programmes live in memory. Health data under
  POPIA needs encryption at rest, real consent, and real deletion — see
  `LEGAL.md`.
- **Models are anatomically real but visually plain.** No textures, no
  subsurface scattering, no fascia. Good enough to identify and click a muscle;
  not a rendering showcase.

## Next steps, in the order I would do them

1. Clinician review of the exercise library and reasoning rules.
2. User accounts + encrypted persistence (POPIA).
3. Progress tracking: re-screen over time and show whether the numbers moved.
4. Exercise demonstration video or animation per exercise.
5. ~~Z-Anatomy 3D integration.~~ **Done.**
6. Attorney review of terms, disclaimer and consent before commercial launch.
