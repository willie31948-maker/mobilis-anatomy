# Attribution

## 3D anatomy models

The anatomical meshes in `public/models/` are derived from **Z-Anatomy**,
which is itself derived from **BodyParts3D**.

- Z-Anatomy — https://www.z-anatomy.com/ ·
  https://github.com/Z-Anatomy/Models-of-human-anatomy
- BodyParts3D, © The Database Center for Life Science, licensed under
  CC BY-SA 2.1 JP / CC BY-SA 4.0.

Licensed under **Creative Commons Attribution-ShareAlike 4.0 International**
(CC BY-SA 4.0) — https://creativecommons.org/licenses/by-sa/4.0/

**Modifications made:** component meshes joined into functional muscle groups,
renamed to Mobilis muscle identifiers, decimated to a 4,000-triangle budget per
muscle per side, and exported to glTF/GLB. See `tools/extract_models.py`.

**Share-alike obligation:** because these meshes are modified derivatives, the
mesh files in `public/models/` must be distributed under CC BY-SA 4.0. This
applies to the model files only — it does not extend to the application source
code, the assessment engine, or the exercise library, which are separate works
that merely reference the models. This attribution must be visible to users of
any product that ships these meshes.

## Software

- three.js (MIT) — 3D rendering.
- Express (MIT) — HTTP server.

## Human movement data (v7)

The exercise animations are no longer authored by hand. Clips marked
`source: "measured"` in `tools/clips.json` are derived from pose estimation
over freely-licensed video of real people exercising, sourced from Wikimedia
Commons. We ship only the derived joint angles — never the video.

| Source video | Author | Licence | Used for |
|---|---|---|---|
| Squat – exercise demonstration video | FitnessScape | CC BY 3.0 | squat |
| Deadlift – exercise demonstration video | FitnessScape | CC BY 3.0 | hip hinge / RDL |
| Bent-over row – exercise demonstration video | FitnessScape | CC BY 3.0 | row |
| Shoulder press – exercise demonstration video | FitnessScape | CC BY 3.0 | shoulder flexion |
| Leg raises – exercise demonstration video | FitnessScape | CC BY 3.0 | leg raise, dead bug |
| Hanging crunches – exercise demonstration video | FitnessScape | CC BY 3.0 | spine flexion |
| Video of EZ Bar Curl and Straight Bar Curl | Cavemantraining | CC BY 3.0 | elbow flexion |

Pose estimation uses Google's MediaPipe Pose Landmarker (Apache 2.0). The
model file is downloaded at build time and is not redistributed here.

Clips marked `source: "shaped"` are not measured: single-camera video cannot
resolve frontal-plane movement, rotation, or small joints accurately enough.
Their amplitudes come from published range-of-motion norms, but their *timing*
uses the movement curve measured across the corpus above, so they are no
longer symmetric triangles.
