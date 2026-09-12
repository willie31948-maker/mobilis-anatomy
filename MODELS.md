# Anatomy models: how to get them, what they cost

> **STATUS: DONE.** The Z-Anatomy route described below has been executed. All
> 49 muscles the engine reasons about are now real 3D meshes in
> `public/models/` (~5 MB total), extracted by `tools/extract_models.py`,
> covering the full body: legs, trunk, shoulders, arms, forearms, hands, neck
> and jaw, plus an optional skeleton layer.
> Toggle "3D anatomy" in the app. The rest of this document explains why that
> route was chosen and how to re-run or replace it.

Your question was "how can we create our own models?" — the honest answer is
that you almost certainly should not create them from scratch, and here is the
arithmetic behind that.

## The four routes, with real numbers

### 1. Z-Anatomy — free, open licence. Start here.

The strongest option and the one I would build on.

- **What it is:** a complete open 3D human anatomy atlas — muscles, bones,
  ligaments, nerves, vessels — as individually named, separable meshes.
- **Provenance:** derived from **BodyParts3D**, produced by the Database Center
  for Life Science in Japan, and rebuilt in Blender with proper Terminologia
  Anatomica naming.
- **Licence:** Creative Commons **CC BY-SA 4.0**.
- **Cost:** R0.

**The catch, and it is a real one.** CC BY-SA is a *share-alike* licence. If you
distribute modified versions of the meshes, the modified meshes must carry the
same licence. This does **not** force you to open-source your app — your code,
assessment engine, exercise library and UI stay entirely yours. It affects the
3D model files themselves. In practice: you can ship a commercial app using
these models, you must credit the source, and you cannot claim exclusive
ownership of the anatomy meshes. For a subscription app whose value is the
*reasoning and coaching*, not the polygons, that trade is strongly in your
favour.

Get it: `github.com/Z-Anatomy/Models-of-human-anatomy` and `z-anatomy.com`.

### 2. BioDigital Human — commercial API, rent don't own

- Polished, medically reviewed, embeddable via API.
- Licensed per seat/team; enterprise pricing is quote-based and typically runs
  into thousands of USD per year. Their consumer app is ~$20/year, which is
  **not** a redistribution licence — do not confuse the two.
- **You never own it.** If they change terms or pricing, your app's core visual
  changes with them. That is a real business risk for a solo product.

### 3. Stock marketplaces (TurboSquid, CGTrader, Sketchfab)

- Anatomy models run roughly **$50-600** each.
- **The trap:** most are single fused meshes built to look good in a render, not
  to be clicked muscle-by-muscle. Your app needs every muscle as a *separately
  named, separately selectable object*. Buying a beautiful fused model and then
  paying an artist to cut it apart usually costs more than starting from
  Z-Anatomy.
- Always verify the licence permits use in a commercial app, and specifically
  that it allows redistribution inside software.

### 4. Commission original models — only if you must own them outright

- A medical illustrator or 3D anatomy artist: roughly **$80-200/hour**, or
  **$300-1,500 per muscle group** done properly with correct topology and naming.
- A full body at the fidelity you described: realistically **R400,000 - R1.5m**
  and 6-12 months.
- Worth it only when exclusive ownership is itself the business asset. For your
  app it is not — nobody subscribes because your deltoid mesh is proprietary.

## My recommendation

**Start on Z-Anatomy, and design so the model layer is replaceable.**

That last clause is why the prototype is built the way it is. The 2D schematic
body map in `public/index.html` is a *deliberately isolated layer*: every
clickable region is just an SVG path tagged with a muscle id
(`data-mid="gluteus_medius"`). The assessment engine, the exercise library and
the programme builder never touch geometry — they only ever speak in muscle ids.

So the upgrade path is genuinely a swap, not a rewrite:

```
2D schematic (today)  ->  Z-Anatomy glTF in three.js  ->  commissioned models
        \                          |                              /
         \_________________________|_____________________________/
                                   |
                     same muscle ids, same engine, unchanged
```

## The technical pipeline, when you do it

1. **Get the source.** Clone the Z-Anatomy Blender repository.
2. **Decimate.** Anatomical meshes are dense — often 100k+ triangles per muscle.
   For web use, reduce to 3-8k triangles per muscle with Blender's Decimate
   modifier. Anatomy is smooth and forgiving; the visual loss is small and the
   load-time win is enormous.
3. **Name to match your ids.** Rename each mesh object to the exact id used in
   `data/anatomy.js` (`gluteus_medius`, `iliopsoas`, …). This is the single most
   important step — it is what makes the swap mechanical instead of manual.
4. **Export glTF/GLB**, one file per region (hip, shoulder, spine…) rather than
   one giant file, so the app streams only what the user is looking at.
5. **Render with three.js.** Load the GLB, and on click read `mesh.name` — which
   is now your muscle id — and call the *same* `showDetail(id)` function the
   prototype already uses.
6. **Colour by state.** Set each mesh's material colour from the assessment
   result, exactly as the prototype's `paint()` does with CSS classes.

Realistic effort for a competent 3D/web developer: **2-4 weeks** for a good
first version covering the ~30 muscles the engine reasons about. Note that this
is the *presentation* layer only — it makes the app look impressive, but it adds
no clinical capability that the current build lacks.

## Budget order-of-magnitude

| Route | Up-front | Ongoing | Own it? |
|---|---|---|---|
| Z-Anatomy + your own integration | R0 + ~2-4 weeks dev | R0 | Meshes stay CC BY-SA |
| Stock models | R1k-12k + cutting/renaming | R0 | Usually yes, check licence |
| BioDigital API | Quote (often $1000s/yr) | Annual | No |
| Commissioned original | R400k-1.5m | Maintenance | Yes |

## One caution about scope

"Full anatomy models" is the part of this project that *looks* like the hard
part and isn't. The hard part — and the part that decides whether the app is any
good — is the reasoning: which findings imply which muscle states, and which
exercises are correct and safe for those states. That is what this prototype
actually implements, and it is the part no asset library will sell you.

A beautiful 3D model attached to weak reasoning is a worse product than a plain
schematic attached to good reasoning. Build the reasoning first, then make it
beautiful.


---

# What was actually built

Executed the Z-Anatomy route end to end.

## Numbers

| | |
|---|---|
| Source file | Z-Anatomy `Startup.blend`, 294 MB, **4,569 named meshes** |
| Extracted | **98 meshes** — all 49 engine muscles (left and right) + 7 skeletal context |
| Missing | **0** |
| Triangle budget | 4,000 per muscle per side |
| Reduction | e.g. transversus abdominis 34,328 → 4,000 tris |
| Total web payload | **~5 MB** across 11 region files |
| Licence | CC BY-SA 4.0, attributed in-app and in `manifest.json` |

## The pipeline

`tools/extract_models.py` (run with `pip install bpy`, no GUI needed):

1. Opens the Z-Anatomy .blend headlessly.
2. Reads `tools/muscle_map.json` — the one file that maps a Mobilis muscle id
   to its Z-Anatomy component meshes.
3. Joins components into one object per muscle per side. `quadriceps` is three
   vastus meshes; `rotator_cuff` is four; `erector_spinae` is longissimus +
   iliocostalis (lumborum and thoracis) + spinalis.
4. Renames to `<muscle_id>__l` / `__r`.
5. Decimates to the triangle budget.
6. Exports one `.glb` per region + a `manifest.json`.

Re-run it any time. To swap in different models later, rewrite
`muscle_map.json` and re-run — **no application code changes**.

## Three real bugs this surfaced

Worth recording, because each produced a page that looked fine while being broken:

1. **Multi-user mesh data.** Z-Anatomy shares one mesh datablock between left
   and right. Blender refuses to apply a modifier to multi-user data, so
   decimation failed. Fix: copy the datablock per object before modifying.
2. **Hidden/unlinked objects.** Most meshes aren't in the active view layer, and
   Blender operators silently skip objects that aren't linked and visible. Fix:
   an `ensure_linked()` step before every operation.
3. **glTF strips dots from names.** Meshes named `gluteus_medius.l` arrived in
   the browser as `gluteus_mediusl`, so the viewer could no longer recover the
   muscle id — every mesh loaded and rendered, and *nothing* ever highlighted.
   Fix: the `__l` separator. There is now a test asserting no exported name
   contains a dot, plus a browser test asserting the colours actually land.

A fourth, in the front end: three.js v180 splits its build across
`three.module.js` **and** `three.core.js`. Shipping only the first gives a 404
that kills the whole module graph — a blank panel with no obvious cause.

## Why the 2D map is still there

It's the fallback and the fast path: instant load, works without WebGL, fine on
a weak phone. Both renderers honour the same contract (a muscle id in, a colour
out), so neither is privileged. Users toggle between them.

---

# Extension: arms, hands, head (2026-09-10)

The first pass covered only the 30 muscles the engine reasoned about, which
left the model with no arms, hands or head. Extended to a full body.

## Added

| | |
|---|---|
| Muscles | 30 → **49** |
| Meshes | 60 → **98** (91 muscle + 7 skeletal context) |
| Movement screens | 13 → **22** |
| Exercises | 40 → **61** |
| Payload | 3.2 MB → **5.7 MB** |

New muscle groups: deltoid, biceps, triceps, brachialis, brachioradialis,
wrist flexors and extensors, finger flexors and extensors, hand intrinsics
(thenar, hypothenar, interossei, lumbricals), pronators, supinator,
sternocleidomastoid, scalenes, splenius, masseter, temporalis, pterygoids,
digastric/suprahyoid.

## Why the new muscles are not just meshes

Every one carries the same clinical data as the originals — tonic/phasic
tendency, origin, insertion, actions, antagonists, referral pattern — and is
reachable by new movement screens, so it can actually be assessed:

- lateral / medial elbow pain on gripping (tennis and golfer's elbow loading)
- forearm ache and grip fatigue from desk work
- limited forearm rotation
- shoulder hitching on arm raise
- hand numbness at night
- jaw clenching and grinding
- temple / behind-the-eye / ear headache patterns
- chest-dominant breathing
- asymmetric neck rotation

Adding a mesh without a screen would produce a muscle the app can display but
never reason about — visually impressive and clinically useless.

## The skeleton layer

Skull, arm bones and hand bones ship in a separate `context.glb` and are
rendered pale and **non-interactive**. They exist so the hands and head read as
a body rather than muscle floating in space.

They are deliberately given **no muscle id**. A clickable bone would resolve to
a lookup that does not exist, or worse, to a coincidentally-named muscle — so
the viewer refuses them at the source and a test asserts it. Toggleable in the
UI for anyone who wants muscle only.

## Two more bugs found

1. **`hamstrings` was silently incomplete.** Its mapping named
   `Biceps femoris muscle`, which does not exist in Z-Anatomy — the mesh is
   split into `Long head of biceps femoris` and `Short head of biceps femoris`.
   The extractor's fallback matcher found the other two hamstrings and
   exported a plausible-looking mesh, so this shipped in v2 missing an entire
   muscle. Now explicit, and the "nothing missing" check is exact rather than
   fuzzy.
2. **Bones rendered in front of muscle.** Exported with `depthWrite: false` and
   `renderOrder: -1`, the skull and hand bones painted over the muscles in
   front of them — an x-ray effect rather than an anatomy model. Bone is
   opaque; fixed by giving it a normal opaque material and real depth.

Same naming lesson as before: Z-Anatomy splits muscles into anatomical heads
far more often than expected (pronator teres, flexor carpi ulnaris, flexor
digitorum superficialis, adductor pollicis, deltoid, masseter all have separate
head meshes). Always verify a mapping resolves rather than trusting a
fallback match.

---

# Extension: animated exercise demonstration (2026-09-10)

The model now performs exercises, with primary and secondary muscles coloured
differently.

## What made it possible

Z-Anatomy ships a **second** file, `Z-Biomechanics.7z`, containing a **237-bone
anatomical rig** (Femur, Tibia, Scapula, Ulna, individual vertebrae and finger
phalanges) plus mocap. Critically it contains **bones only — no muscle meshes**.

So the build appends the muscles from Z-Anatomy into the rig file and skins
them. `tools/build_animated.py` does this headlessly:

1. Open the biomechanics rig.
2. Append the 98 muscle meshes from Z-Anatomy (both files share the same
   underlying anatomy, so they land in register).
3. Clean each mesh: weld doubles, drop loose geometry, fix normals.
4. Bind with automatic weights, then **prune distant bone influences**.
5. Author 26 clips from `tools/clips.json` as joint-angle keyframes.
6. Export one animated GLB — 6.0 MB, 98 skinned meshes, 26 clips.

## Why the clips are authored, not mocap

The bundled mocap is walking, jogging, jumping and pushing boxes. None of that
is a corrective exercise. So the clips are written as explicit joint rotations
in `tools/clips.json` — anatomically honest, editable without touching code,
and a few keyframes instead of hundreds of baked frames.

## Six real bugs, every one silently plausible

1. **711 animation channels per clip.** The exporter's
   `export_optimize_animation_keep_anim_armature` defaults to *True*, baking
   all 237 bones × 3 transforms into every clip even though each clip moves a
   handful. 8.4 MB → 6.0 MB when switched off.
2. **15 muscles exported unskinned.** Automatic weights *creates* vertex groups
   and then fails to assign any weight. Checking `len(vertex_groups) > 0`
   therefore passed while the export silently dropped the skin. The check has
   to count actual non-zero weights.
3. **`neutral_bone`.** Those same meshes had empty groups matching no deform
   bone, so the exporter substituted its own placeholder bone that never moves.
   Fix: delete empty groups before rigid-binding.
4. **Constraints silently overrode every keyframe.** The rig is built for
   interactive posing: `LIMIT_ROTATION`, `COPY_ROTATION` and `DAMPED_TRACK`
   keep a human dragging handles inside physiological range — and also
   override keyframed rotation. Clips "played" while the pose never changed.
   305 constraints and drivers are now stripped before authoring.
5. **Muscles tearing apart.** Automatic weights blended vertices across bones
   at opposite ends of the torso (latissimus stretched between pelvis and
   scapula). Fixed by pruning influences from bones far from each muscle.
6. **Muscles flying off.** The first fix for (5) — welding each muscle to one
   bone — cured tearing but made any muscle *spanning* a joint detach at the
   far end, so the deltoid launched off the shoulder. The two failure modes
   pull in opposite directions; distance-based pruning satisfies both.

## Honest limits

- Muscles move **with** their bones; they do not bulge, shorten or thicken.
  Real muscle deformation is a simulation problem, not a rendering setting.
  The clips show *which muscles a movement uses*, which is the actual job.
- Joint angles run at roughly **20% of full physiological range**. These are
  separate closed surfaces rather than one continuous skin, and a full-depth
  squat visibly breaks them. A clean partial movement reads correctly; a
  full-range one that shatters does not.
- 13 of 57 exercises have **no clip** — static holds, soft-tissue releases and
  breathing drills. The UI says so explicitly rather than animating something
  misleading.

## v7: measured human movement

The animations are no longer hand-authored. `tools/mocap.py` runs MediaPipe
Pose Landmarker over CC-licensed exercise video, extracts 3D joint angles and
segment pitches, segments the signal into reps, averages them, and retargets
the result onto the rig. `tools/build_clips.py` rebuilds `clips.json` from
that. Each clip records `source: measured | shaped | static`.

Why hand-authoring failed, concretely:

- **Amplitudes were short.** Authored squat: 60 deg hip flexion. Measured: 81.
- **Timing was a symmetric triangle** — peak at exactly the midpoint, constant
  rate both ways. Measured movement peaks at ~0.44 of the cycle and dwells at
  end range for ~15% of it.
- **Every joint peaked on the same frame.** Measured squat: knee 0.50,
  hip 0.47, trunk 0.69, elbow 0.84. A body whose every joint reverses
  simultaneously is the definition of mechanical.

Retargeting uses **segment pitch in world space**, not joint angle. A joint
angle is between two segments; a bone's rotation is relative to its parent. Since
`Hips` is never rotated by a clip, a segment's world pitch is the local
rotation its bone needs — and where a parent does rotate, the parent's pitch is
subtracted.

The trunk is decomposed into **pelvis rotation vs spine flexion** using the
measured hip joint angle. This matters clinically: a Romanian deadlift measures
71 deg of trunk pitch and 71 deg of hip flexion, so the entire fold is at the
hip with a neutral spine. Dumping trunk pitch onto the spine renders a
rounded-back deadlift — teaching the injury the exercise prevents.

### Corpus limits, stated plainly

Only 7 of 48 clips are measured. Wikimedia Commons has perhaps 20 usable
exercise videos, mostly barbell lifts, and single-camera pose estimation cannot
resolve frontal-plane movement (abduction, side bend), rotation, or small
joints. The remaining 41 are `shaped`: clinical amplitude, measured timing.

Getting more measured clips means recording video specifically for it — a
physiotherapist or biokineticist demonstrating the library, filmed from two
angles. That is the highest-value next step for the animation, and it doubles
as the clinical review this project has needed since v1.

## v8: weighting around the active joints

`tools/inspect_weights.py` reads the weights out of the **shipped glTF** (not
the Blender scene — in v4 the exporter silently dropped skinning while an
in-Blender check passed) and reports, per muscle: which bones influence it,
each bone's share, the distance from that bone to the muscle's centroid,
whether weights normalise, and the max influences per vertex.

Two real defects it found:

1. **Two-joint muscles had no influence on the bone they lie along.** The
   triceps runs scapula → humerus → ulna and was weighted `Scapula 0.47 /
   Ulna 0.53` with *nothing on the humerus*. The deltoid had **no clavicle
   influence at all**, despite its anterior head attaching there and the
   clavicle being separately animated. Fixed with `via` in
   `attachments.json`: a muscle declares the bones it crosses, and the skin is
   a partition of unity along that chain.
2. **Weights were a chain of local two-bone blends** — and must stay that way.
   Each vertex is influenced only by the two bones bracketing its own position
   along the chain (verified: max 2 influences per vertex, all normalised).
   Blending one vertex across *many* bones is the v4 auto-weight failure that
   produced 28x stretch.

### Two measured dead ends, recorded because they were plausible

**Anchoring the gradient on the joints made it ten times worse.** The report
showed the gastrocnemius taking 47% of its weight from a bone whose origin sits
50cm from the muscle's centroid, so I moved the anchors onto the joints each
muscle spans. Worst local stretch went **2.25x → 24x**. Two chained bones
anchored at their shared joint put both anchors in nearly the same place, so
the gradient axis collapses to a few centimetres and neighbouring vertices land
on opposite ends of the blend. The 50cm figure was never a defect — it is just
the distance from a long bone's origin to a muscle's centroid. Anchors must
*span*; `ANCHOR_BIAS` pulls them back 35% toward the joint, which is the
measured optimum for stretch **and** per-muscle travel.

**Thresholding small weights to zero made it worse too.** Dropping influences
below 2% and renormalising — the obvious reading of "remove accidental weight
from distant bones" — took the worst stretch **2.07x → 4.12x**. Snapping a
near-zero weight to zero makes the weight field discontinuous: two adjacent
vertices either side of the threshold jump to different bones and the edge
between them tears. Smoothness matters more than tidiness. Distant influences
are removed at the source instead, by giving the muscle its intermediate bone —
which dropped the gastrocnemius femur share from 0.47 to 0.17 *continuously*.

### Result

| clip | v7 | v8 |
|---|---|---|
| nerve glide | 3.13x | 1.65x |
| doorway pec stretch | 2.30x | 1.64x |
| side bend | 2.25x | 1.90x |
| shoulder abduction | 2.24x | 1.83x |
| wall slide | 2.18x | 1.82x |
| elbow flexion | 1.89x | 1.50x |

Worst local stretch anywhere in the library: **2.25x → 2.07x**, and it is now
the abdominal wall (a flat sheet) rather than the shoulder or elbow. Every
clip improved; none regressed.

`via` is for **straps only**. Adding intermediate bones to the flat sheets made
them worse (transversus 2.16x → 2.69x): a strap's belly genuinely lies along an
intermediate bone, but a sheet wrapping the trunk lies along no single
vertebra, so a mid-span anchor splits it across two that rotate differently.

## v9: pelvic hinge, core sheets, and a doubled rotation

Three things, and the third turned out to cause the second.

### 1. The pelvic hinge existed and I had filtered it out

The measured squat contains 11.4° of pelvic rotation peaking at 0.69 of the
cycle — after the knees, which is exactly the centre-of-mass compensation a
human makes. v7's "relevance" filter dropped any track under 30% of the clip's
primary mover; the squat's primary mover is a 97° femur, so the threshold sat
at 29° and the real hinge was discarded as noise. **A trunk contribution should
be an order of magnitude smaller than a knee in a squat — small is not
spurious.** The filter is now an absolute floor, with non-participating limbs
handled per exercise instead.

Magnitude comes from `TRUNK_PER_KNEE` (0.35°/° of knee flexion) rather than the
measured 11°, because the source video is shot near-frontally and single-camera
depth systematically under-reads sagittal lean. The squat now leans 30.9° at
depth with the feet planted, and total hip flexion is pelvis 30° + femur 66° =
96°, against 97° measured on the lifter.

**Phase is skewed, not translated.** Shifting the lean curve by the measured
0.19 lag moved peak lean into the *ascent*: at maximum depth the torso had only
5.5° of its 29.5°, which reads as a stumble. A human leans most at the bottom.

The hinge correctly does **not** fire on supine clips (a leg raise flexes the
knee just as far with nothing under the foot, so there is no ground reaction to
balance) or on spine-flexion drills, where substituting a pelvic hinge would
replace the exercise with a different one.

### 2. Spine sheets: spline binding works on the spine, not off it

Erector spinae 1.60x → 1.47x with a cosine-kernel falloff across 13 vertebrae.
The same treatment made the anterior abdominal wall *dramatically* worse —
transversus 2.13x → 5.91x — because of **lever arm**: the erectors sit ~2cm
from the vertebral axis, the abdominal wall 15–20cm anterior, so handing
adjacent vertices to different vertebrae multiplies the small inter-vertebral
rotation by that arm. More anchors makes a distant sheet worse. Spline for
spinal sheets, wide two-bone gradient for the anterior wall.

### 3. The torso was rotating twice

Chasing the abdominal shear through the weights was chasing a symptom. Measuring
the *bones* showed the hinge rotating its ribcage **141°** where the clip asks
71. The sheet spans pelvis to ribcage; its two ends were being driven through
rotations differing by a factor of two. No weight painting fixes that.

Cause: `visual_keying` bakes each bone's evaluated world pose into its local
channels, and the constraints then apply again on top. The vertebrae L5–C1 are
separate root bones following `Spine` via ARMATURE constraints, and `Spine` is
itself a child of `Hips`.

The fix has three parts, because the constraints are simultaneously required
and harmful:

- bake with `clear_constraints=True`, then **restore** them — all 48 clips are
  baked off one rig, and skipping the restore left clips 2–48 with no spine
  propagation, so every vertebra channel came out constant-at-rest, the size
  filter dropped it, and the hinge exported with 7 channels and a motionless
  torso;
- strip them again **before export**, since the baked actions already carry the
  resolved pose and glTF has no concept of a constraint;
- strip them **during the grounding measurement** too, so the pose being
  measured is the pose being exported. `influence = 0` does not work: an
  ARMATURE constraint's bone targets carry their own weights and keep
  propagating.

A separate sign error compounded it: the femur counter-rotation that keeps the
feet planted was emitted with the opposite sign to the pelvic rotation, so it
*added* instead of cancelling. Measured directly on the rig from a rest foot
height of z = −0.005: pelvis −71 alone → z = 0.565; with femurs at +73 →
z = 1.473 (the legs swing up and the body pikes in mid-air); with femurs at
−73 → z = 0.069. The grounding pass was then driving the body 1.24m downwards
to chase a contact point that had been lifted 1.27m.

### Result

| muscle | v8 | v9 |
|---|---|---|
| transversus abdominis | 2.13x | **1.24x** |
| rectus abdominis | 1.98x | **1.26x** |
| erector spinae | 1.60x | 1.40x |
| quadratus lumborum | 1.30x | 1.22x |

| clip | v8 | v9 |
|---|---|---|
| hip hinge | 2.07x | **1.53x** |
| spine flexion | 1.91x | 1.78x |
| squat | 1.62x | 1.53x |

The abdominal wall was never a weighting problem.

## v10: 3D canvas interaction

Focus framing, direct mesh selection and a playback scrubber.

**Focus framing** measures the *posed* mesh (`applyBoneTransform`), not
`setFromObject` — a SkinnedMesh's `geometry.boundingBox` is its rest pose, so
framing the deltoid mid-press would have aimed at where the deltoid is with the
arms down. It frames **one side**: every muscle id maps to a left and a right
mesh, and a box spanning both has its centre in the midline — between the two
deltoids, inside the ribcage, on neither muscle. A context floor
(`bodyDim * 0.28`) keeps enough body in shot that the muscle reads as anatomy;
filling the frame with the muscle alone made a psoas and a serratus
indistinguishable.

**Reset** frames the union of four instants through the clip, like `playClip`,
not the current pose: the animation keeps running during the 620ms lerp, so the
body the camera was fitted to is not the body that arrives. Measured as a 9%
overshoot that varied with whichever frame the button was pressed on.

**Emissive accent** pre-multiplies the colour rather than setting
`emissiveIntensity` — these are `MeshPhongMaterial`s and **Phong ignores
`emissiveIntensity`**. The material inspector reported 0.55 and the screen
showed nothing.

**Scrubbing** writes `action.time` and calls `mixer.update(0)`.
`mixer.setTime` rewinds the whole mixer from zero and re-evaluates, which is
fine for a test harness sampling a few instants and visibly laggy when dragged.
Pause now pauses the *action* instead of calling `playClip(null)`, which used
to tear the action down so resuming restarted the rep from frame 0 and
re-framed the camera.

### The bug worth knowing about: clamp the frame delta

`requestAnimationFrame` stops while the tab is hidden but `THREE.Clock` keeps
running, so the first frame back reports a delta of however long that was.
That single frame completed an entire camera lerp instantly and advanced the
mixer by a whole rep — the model appeared to teleport on tab switch. The test
caught it as "lerp was 1 done after 50ms". `dt` is now clamped to 100ms.

Tests 221 → 255, including real-WebGL assertions that the camera actually
moves closer, that the move is *interpolated* (sampled mid-flight, not just at
the end), that the target lands on the muscle rather than the body centre, that
a synthetic click resolves to exactly one lit muscle, that dragging the
scrubber changes the *pose* by a measurable distance, and that the pose holds
still while the slider is held.
