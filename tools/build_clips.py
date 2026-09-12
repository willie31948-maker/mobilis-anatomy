"""Rebuild tools/clips.json from MEASURED human movement.

Run:
    python3 tools/build_clips.py --pose tools/mocap_pose --out tools/clips.json

Each library exercise falls into one of three buckets, and every clip records
which, so the app can be honest about it:

  measured   The exercise (or a close kinematic match) exists in the CC video
             corpus. Joint angles, inter-joint sequencing and timing all come
             from a real human. 
  shaped     Single-camera video cannot measure it -- frontal-plane movement
             (abduction, side bend), rotation, or small joints (wrist, jaw,
             fingers) where the landmarks are too sparse. The amplitude is
             clinical, from range-of-motion norms, but the TIMING uses the
             measured human curve rather than a symmetric triangle.
  static     Not a movement: soft-tissue release, jaw resting position.

The difference between `shaped` and what v5/v6 shipped is not cosmetic. Every
old clip rose linearly to a peak at exactly the midpoint and fell back the
same way, with every joint peaking on the same frame. Measured movement peaks
at ~0.44 of the cycle, dwells near end range for ~15% of it, and sequences its
joints. Applying the measured shape fixes the two of those that do not need
per-exercise video.
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mocap  # noqa: E402

#: exercise id -> (pose file stem, notes on the kinematic match)
#: Where the corpus has no video of the exercise itself we borrow a movement
#: with the SAME joint kinematics and say so -- a hip hinge is a deadlift, a
#: supine leg raise is the same hip flexion pattern as a hanging leg raise.
MEASURED = {
    "squat": ("Squat_-_exercise_demonstration_video", "barbell back squat"),
    "hinge": ("Deadlift_-_exercise_demonstration_video", "conventional deadlift"),
    "leg_raise": ("Leg_raises_-_exercise_demonstration_video", "lying leg raise"),
    "dead_bug": ("Leg_raises_-_exercise_demonstration_video",
                 "same supine hip-flexion pattern, one limb at a time"),
    "row": ("Bent-over_row_-_exercise_demonstration_video", "bent-over row"),
    "shoulder_flexion": ("Shoulder_press_-_exercise_demonstration_video",
                         "overhead press: sagittal-plane shoulder elevation"),
    "elbow_flexion": ("Video_of_EZ_Bar_Curl_and_Straight_Bar_Curl", "barbell curl"),
    "spine_flexion": ("Hanging_crunches_-_exercise_demonstration_video",
                      "trunk flexion pattern"),
    # Deliberately NOT mapped, though the corpus tempts you:
    #   lunge     <- sprawl: superficially similar, but a sprawl drives the
    #                hips DOWN and BACK with both feet moving; retargeting it
    #                produced a symmetric double-knee-bend, i.e. a squat
    #                wearing a lunge's name. A wrong-but-plausible match is
    #                exactly the failure mode that shipped a hamstring
    #                missing a whole muscle in v3.
    #   heel_raise <- squat: the ankle signal comes from the heel/toe
    #                landmark pair, the noisiest BlazePose produces.
}

#: Segments to discard per exercise: limbs that are holding an implement
#: rather than performing the movement. Their landmarks track the bar, not the
#: body, and left in they can out-amplitude the actual exercise.
DROP = {
    "squat": ("uarm_l", "uarm_r", "farm_l"),      # hands fixed on the bar
    # A deadlift's arms are cables: they hang from the shoulder and travel with
    # the bar. Measured as segment pitch, that reads as 44 deg of shoulder
    # extension, which rendered as the arms flying out behind a folded torso.
    # The arms in a hinge do nothing; drop both.
    "hinge": ("uarm_l", "uarm_r", "farm_l"),
    "leg_raise": ("uarm_l", "uarm_r", "farm_l"),   # arms braced, not working
    "dead_bug": ("farm_l",),
    # Upper-body exercises: drop the legs entirely. A relevance threshold is
    # not enough here -- the recorded presser dips his knees 41 deg to start
    # the bar, which is 35% of the shoulder's range and survives any filter
    # loose enough to keep real secondary motion. An overhead press
    # demonstration must not teach a leg drive.
    "row": ("farm_l",),   # forearm follows the bar path, not the elbow
    # Also drop "trunk" here: with the v9 absolute relevance floor, the
    # presser's 8 degrees of body sway now survives as a pelvic track, and an
    # overhead press demonstration must not teach a hip drive. Dropping the
    # segment is the honest fix; raising the global floor to 8 degrees would
    # have thrown away the 11-degree squat hinge all over again.
    "shoulder_flexion": ("farm_l", "thigh_l", "thigh_r", "shank_l", "shank_r",
                         "trunk"),
    "elbow_flexion": ("thigh_l", "thigh_r", "shank_l", "shank_r"),
    "spine_flexion": ("uarm_l", "uarm_r", "farm_l"),
}

#: Exercises that are standing but must NOT get a CoM pelvic hinge. A spine
#: flexion drill IS spinal flexion -- substituting a pelvic hinge for it
#: replaces the exercise with a different one, and zeroed the spine track
#: that is the entire point of the clip.
NO_COM_HINGE = {"spine_flexion", "spine_extension", "side_bend",
                "hip_flexor_stretch", "couch_stretch", "lat_stretch",
                "doorway_pec_stretch", "shoulder_flexion", "shoulder_abduction",
                "row", "elbow_flexion", "elbow_extension"}

#: exercises whose left/right sides genuinely differ -- do not mirror.
ASYMMETRIC = {"lunge", "dead_bug", "bird_dog", "single_leg_stance",
              "hip_flexor_stretch", "couch_stretch", "clamshell",
              "hip_abduction", "copenhagen", "side_plank"}

#: exercises that are not movements
STATIC = {"jaw_relaxation", "trigger_point_release", "foam_roll_release",
          "suboccipital_release"}


#: Maximum acceptable between-rep disagreement, in degrees, on the driver
#: joint. Averaging reps only removes noise if they are actually the same
#: movement. The EZ-bar curl video is 173 seconds of a coach TALKING between
#: sets: my rep finder happily "found" 5 reps spanning demonstration, setup
#: and explanation, and averaging them produced a clip that flexed the elbow
#: AND swung both legs 55 degrees -- which then failed the "a standing curl
#: must not animate the legs" check. The averaged curve looked perfectly
#: smooth; only the variance shows it is meaningless.
MAX_REP_SD = 12.0


def measured_clip(old, stem, note, posefile_dir, frames=48):
    prof = mocap.profile(os.path.join(posefile_dir, stem + ".json"))
    sd = prof["joints"].get(prof["driver"], {}).get("rep_sd", 0.0)
    if prof["n_reps"] > 1 and sd > MAX_REP_SD:
        print(f"  reject {stem}: reps disagree by {sd:.1f} deg "
              f"(> {MAX_REP_SD}) -- not the same movement repeated")
        return None
    eid = old.get("_id")
    # Centre-of-mass compensation only applies to closed-chain patterns: the
    # foot must be loaded against the ground for a pelvic hinge to be what
    # balances the body. A standing posture is the proxy; a supine leg raise
    # flexes the knee just as far with nothing under the foot.
    prof["closed_chain"] = (old.get("posture", "standing") == "standing"
                            and eid not in NO_COM_HINGE)
    tracks = mocap.retarget(
        prof, frames=frames,
        side_mirror=eid not in ASYMMETRIC,
        drop_segments=DROP.get(eid, ()))
    if not tracks:
        return None
    clip = dict(old)
    clip["tracks"] = tracks
    clip["frames"] = frames
    clip["source"] = "measured"
    clip["measured_from"] = {
        "video": stem.replace("_", " "),
        "match": note,
        "reps_averaged": prof["n_reps"],
        "rep_seconds": prof["rep_seconds"],
        "driver_joint": prof["driver"],
    }
    clip["rom_measured"] = {
        j: prof["joints"][j]["rom"] for j in prof["joints"]}
    return clip


def shaped_clip(old, frames=48):
    """Keep the clinical amplitude, replace the triangle with human timing.

    The REST value matters. A glute bridge's setup has the knees already bent
    85 deg and the hips at -5 -- those are the clip's start AND end values, and
    the movement is the excursion between them. My first version rebuilt every
    track from zero to the peak, which threw the setup away: the knees started
    straight and the whole bridge collapsed to a 2.5cm pelvis nudge. That is
    the v4 "it just sways the legs" failure arriving by a third route, so the
    shape is applied to the EXCURSION and added back onto the rest value.
    """
    clip = dict(old)
    new_tracks = []
    for tr in old["tracks"]:
        keys = tr["keys"]
        rest = keys[0][1]
        # Excursion is signed and measured FROM rest. Taking the largest
        # absolute VALUE instead picked the tibia's 85 deg setup as its
        # "peak", so the knee shaped from 0 to 85 rather than 85 to 72 -- the
        # bridge's knees snapped straight and re-bent every cycle.
        excursion = max((k[1] - rest for k in keys), key=abs)
        if abs(excursion) < 1e-6:
            # A constant track is a SETUP POSTURE held for the clip's whole
            # duration (the clamshell's 90-deg knee bend, the pec stretch's
            # abducted shoulder). It has no timing to shape. Pass it through
            # unchanged -- and note it, so the "no triangles" test can tell a
            # held posture from a hand-authored movement.
            held = dict(tr)
            held["held"] = True
            new_tracks.append(held)
            continue
        shaped = mocap.shape_track(excursion, frames=frames)
        new_tracks.append({
            "bone": tr["bone"], "axis": tr["axis"],
            "keys": [[f, round(rest + v, 1)] for f, v in shaped],
        })
    clip["tracks"] = new_tracks
    clip["frames"] = frames
    clip["source"] = "shaped"
    return clip


def sequence(clip, order):
    """See SEQUENCE_LAG. Lags are relative to the clip's PRIMARY mover, so a
    neck clip does not lag its own head: applying the absolute table there
    delayed the mover itself and pushed its peak past the midpoint."""
    """Offset each bone's curve in time so joints don't all peak together.

    Measured movement sequences: in the recorded squat the hip peaks at 0.47
    of the cycle, the knee at 0.50 and the trunk at 0.69. `order` gives a
    fractional lag per bone-name prefix.
    """
    n = clip["frames"]

    def lag_of(bone):
        for prefix, frac in order.items():
            if bone.startswith(prefix):
                return frac
        return 0.0

    def amp(tr):
        v = [k[1] for k in tr["keys"]]
        return max(v) - min(v)

    if not clip["tracks"]:
        return clip
    # Normalise so the EARLIEST bone in the clip has zero lag, rather than
    # clamping at the primary mover. Clamping collapsed whole clips: in a
    # glute bridge the mover is the tibia (lag 0.03) and every other bone lags
    # less, so all lags became 0 and the clip peaked on one frame again -- the
    # exact defect the sequencing exists to remove.
    base = min(lag_of(t["bone"]) for t in clip["tracks"])

    for tr in clip["tracks"]:
        lag = lag_of(tr["bone"]) - base
        if not lag:
            continue
        shift = lag * n
        rest = tr["keys"][0][1]
        keys = [[min(n, max(0, int(round(f + shift)))), v] for f, v in tr["keys"]]
        # Anchor back to the track's REST value, not to zero. Hard-coding 0.0
        # here silently deleted every setup posture that a lag touched: the
        # nordic curl's knees rest at 95 deg, so zeroing the endpoints made the
        # legs snap straight at the start and end of every cycle. This is the
        # same class of mistake as v5's channel filter deleting the postures --
        # a generic "return to neutral" that forgets neutral is per-track.
        keys[0] = [0, rest]
        keys[-1] = [n, rest]
        tr["keys"] = keys
    return clip


#: Bones that trail the primary movers, as a fraction of the cycle.
#:
#: Measured, not invented. In the recorded squat the knee peaks at 0.50 of the
#: cycle, the hip at 0.47, the trunk at 0.69, the elbow at 0.84 and the ankle
#: at 0.88 -- a spread of 0.4 of the whole cycle. Hand-authored clips keyed
#: every joint to the same frame, and a body whose every joint reverses on one
#: frame is the definition of mechanical. Lags run proximal-to-distal, which
#: is the direction real movement sequences in.
SEQUENCE_LAG = {
    "Hips": 0.0,
    "LeftUpLeg": 0.0, "RightUpLeg": 0.0,
    "Tibia": 0.03,
    "LeftFoot": 0.06, "RightFoot": 0.06, "LeftToeBase": 0.06, "RightToeBase": 0.06,
    "LowerBack": 0.06, "Spine": 0.08,
    "Scapula": 0.02, "Clavicle": 0.04,
    "LeftArm": 0.0, "RightArm": 0.0,
    "LeftForeArm": 0.05, "LeftHand": 0.08,
    "Neck": 0.10, "Head": 0.12,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pose", default="tools/mocap_pose")
    ap.add_argument("--clips", default="tools/clips.json")
    ap.add_argument("--out", default="tools/clips.json")
    args = ap.parse_args()

    doc = json.load(open(args.clips))
    clips = doc["clips"]
    counts = {"measured": 0, "shaped": 0, "static": 0}

    for eid, old in list(clips.items()):
        old["_id"] = eid
        if eid in STATIC:
            old["source"] = "static"
            counts["static"] += 1
        elif eid in MEASURED:
            stem, note = MEASURED[eid]
            new = measured_clip(old, stem, note, args.pose)
            if new:
                clips[eid] = sequence(new, SEQUENCE_LAG)
                counts["measured"] += 1
            else:
                clips[eid] = sequence(shaped_clip(old), SEQUENCE_LAG)
                counts["shaped"] += 1
        else:
            clips[eid] = sequence(shaped_clip(old), SEQUENCE_LAG)
            counts["shaped"] += 1
        clips[eid].pop("_id", None)

    doc["_provenance"] = (
        "Clips are MEASURED from CC-licensed human exercise video via "
        "MediaPipe pose estimation (see tools/mocap.py), SHAPED (clinical "
        "amplitude + measured human timing curve) where single-camera video "
        "cannot resolve the movement, or STATIC. Each clip carries a "
        "`source` field. Video credits in ATTRIBUTION.md.")
    json.dump(doc, open(args.out, "w"), indent=1)
    print("clips:", counts)


if __name__ == "__main__":
    main()
