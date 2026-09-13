"""Measure how humans actually move, and turn that into clip tracks.

WHY THIS EXISTS
---------------
v4-v6 authored every clip by hand: I picked a few joint angles from memory and
keyframed a symmetric triangle (0 -> peak at the midpoint -> 0). That is not
how a human moves, and it is why the result read as a mannequin being posed
rather than a person exercising. Three specific errors were structural, not
bad luck:

  1. WRONG AMPLITUDES. Hand-picked numbers were consistently short. My squat
     used 60 deg of hip flexion; measured humans use 81. My RDL used 60; real
     is 72 with the knee almost straight (measured 6 deg, I had 14).

  2. SYMMETRIC TIMING. Every clip rose and fell at a constant rate with the
     peak exactly halfway. Measured across 13 clips the mean normalised
     driver curve peaks at 0.44 of the cycle and holds near peak for ~15% of
     it before returning. The eccentric (lowering) phase is genuinely slower
     than the concentric, and there is a brief pause at end range. Those two
     details are most of what "looks human" is made of.

  3. SIMULTANEOUS PEAKS. I keyed every joint to peak on the same frame. Real
     movement is sequenced: in a measured squat the knee peaks at 0.50 of the
     cycle, the hip at 0.47, and the trunk at 0.69 -- the torso keeps folding
     after the legs have stopped. Keying them together is the single most
     robotic-looking thing a hand-authored clip does.

So: don't guess. Measure.

PIPELINE
--------
    CC-licensed exercise video (Wikimedia Commons)
      -> MediaPipe Pose Landmarker (heavy) -> 3D world landmarks per frame
      -> joint angles + segment pitches
      -> rep segmentation on the driver joint
      -> per-rep resample to a common length, average the reps
      -> retarget onto the rig's bones as clip tracks

RETARGETING, AND WHY SEGMENT PITCH
----------------------------------
The obvious approach -- copy the measured "hip angle" onto the rig's hip bone
-- is wrong. A joint angle is between two segments; a bone's local rotation is
relative to its PARENT's current orientation. For the rig, Hips is never
rotated by a clip (rotating it tears the body apart -- it is the root and
carries spine, arms and head), so for a bone whose parent chain is unrotated
the world pitch of its segment IS the local rotation it needs. Where a parent
does rotate (shank under thigh, forearm under upper arm), we subtract the
parent's pitch. That is what `retarget()` does, and it is why we compute
segment pitches in world space rather than only joint angles.

Angles are all sagittal. Frontal-plane work (abduction, side bend) is not
recoverable from single-camera video with the accuracy we would need, so
those clips stay authored and are marked `source: "authored"` -- honestly,
rather than pretending they were measured.

LICENSING
---------
Every source video is CC BY, CC BY-SA or public domain from Wikimedia Commons.
`corpus.json` records title, author and licence per clip and the build writes
them into ATTRIBUTION.md. We ship the derived joint angles (facts about
movement, not a copyrightable expression) and never the video.
"""

import json
import os

import numpy as np

# MediaPipe BlazePose landmark indices we use.
L = {
    "nose": 0,
    "l_sh": 11, "r_sh": 12, "l_el": 13, "r_el": 14, "l_wr": 15, "r_wr": 16,
    "l_hip": 23, "r_hip": 24, "l_kn": 25, "r_kn": 26, "l_an": 27, "r_an": 28,
    "l_heel": 29, "r_heel": 30, "l_toe": 31, "r_toe": 32,
}

# Segments we measure the world pitch of, as (proximal, distal) landmarks.
SEGMENTS = {
    "thigh_l": ("l_hip", "l_kn"), "thigh_r": ("r_hip", "r_kn"),
    "shank_l": ("l_kn", "l_an"), "shank_r": ("r_kn", "r_an"),
    "foot_l": ("l_heel", "l_toe"), "foot_r": ("r_heel", "r_toe"),
    "uarm_l": ("l_sh", "l_el"), "uarm_r": ("r_sh", "r_el"),
    "farm_l": ("l_el", "l_wr"), "farm_r": ("r_el", "r_wr"),
}

RESAMPLE_N = 33  # samples per rep; 48-frame clips interpolate cleanly from this


# --------------------------------------------------------------------------
# extraction (requires mediapipe + opencv; import lazily so the rest of the
# module can be used from tests without those heavyweight deps)
# --------------------------------------------------------------------------

def extract_video(path, model_path):
    """Run pose estimation over a video, returning world landmarks per frame."""
    import cv2
    import mediapipe as mp
    from mediapipe.tasks import python as mpy
    from mediapipe.tasks.python import vision

    opts = vision.PoseLandmarkerOptions(
        base_options=mpy.BaseOptions(model_asset_path=model_path),
        running_mode=vision.RunningMode.VIDEO,
        min_pose_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    landmarker = vision.PoseLandmarker.create_from_options(opts)
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frames = []
    i = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        res = landmarker.detect_for_video(img, int(i * 1000 / fps))
        if res.pose_world_landmarks:
            w = res.pose_world_landmarks[0]
            frames.append([[p.x, p.y, p.z] for p in w])
        else:
            frames.append(None)
        i += 1
    cap.release()
    return {"fps": fps, "n": i, "frames": frames}


# --------------------------------------------------------------------------
# signal helpers
# --------------------------------------------------------------------------

def smooth(x, w=7):
    x = np.asarray(x, float)
    idx = np.arange(len(x))
    ok = ~np.isnan(x)
    if ok.sum() < 3:
        return x
    x = np.interp(idx, idx[ok], x[ok])
    k = np.ones(w) / w
    return np.convolve(np.pad(x, (w // 2, w // 2), mode="edge"), k, "valid")[:len(x)]


def _angle(a, b, c):
    v1, v2 = a - b, c - b
    cs = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-9)
    return np.degrees(np.arccos(np.clip(cs, -1, 1)))


def load_frames(posefile):
    """Load extracted landmarks, flipping to a y-up right-handed frame."""
    d = json.load(open(posefile))
    out = []
    for f in d["frames"]:
        if not f:
            out.append(None)
            continue
        w = np.array(f["w"] if isinstance(f, dict) else f, float)
        w[:, 1] *= -1
        out.append(w)
    return d["fps"], out


def joint_angles(frames):
    """Clinical joint angles (deg) per frame: 0 = anatomical neutral."""
    keys = ["knee", "hip", "trunk", "elbow", "shoulder", "ankle"]
    r = {k: [] for k in keys}
    for w in frames:
        if w is None:
            for k in keys:
                r[k].append(np.nan)
            continue
        g = lambda n: w[L[n]]
        mh = (g("l_hip") + g("r_hip")) / 2
        ms = (g("l_sh") + g("r_sh")) / 2
        r["knee"].append(180 - _angle(g("l_hip"), g("l_kn"), g("l_an")))
        r["hip"].append(180 - _angle(ms, mh, g("l_kn")))
        t = ms - mh
        r["trunk"].append(np.degrees(np.arctan2(np.hypot(t[0], t[2]), t[1])))
        r["elbow"].append(180 - _angle(g("l_sh"), g("l_el"), g("l_wr")))
        r["shoulder"].append(_angle(mh, g("l_sh"), g("l_el")))
        r["ankle"].append(90 - _angle(g("l_kn"), g("l_an"), g("l_toe")))
    return {k: smooth(v) for k, v in r.items()}


def segment_pitches(frames):
    """World sagittal pitch per segment, in degrees, +ve = distal end forward.

    Unwrapped, because arctan2 jumps 360 when a segment passes vertical -- a
    leg raise crosses that boundary and an un-unwrapped signal reports a
    360-degree 'range of motion' that then retargets into a spinning limb.
    """
    out = {k: [] for k in SEGMENTS}
    out["trunk"] = []
    out["head"] = []
    for w in frames:
        if w is None:
            for k in out:
                out[k].append(np.nan)
            continue
        g = lambda n: w[L[n]]
        for k, (a, b) in SEGMENTS.items():
            v = g(b) - g(a)
            out[k].append(np.degrees(np.arctan2(v[2], -v[1])))
        mh = (g("l_hip") + g("r_hip")) / 2
        ms = (g("l_sh") + g("r_sh")) / 2
        t = ms - mh
        out["trunk"].append(np.degrees(np.arctan2(t[2], t[1])))
        h = g("nose") - ms
        out["head"].append(np.degrees(np.arctan2(h[2], h[1])))
    res = {}
    for k, v in out.items():
        a = np.asarray(v, float)
        ok = ~np.isnan(a)
        if ok.sum() > 2:
            idx = np.arange(len(a))
            a = smooth(np.interp(idx, idx[ok], a[ok]), 5)
            a = np.degrees(np.unwrap(np.radians(a), discont=np.radians(300)))
        res[k] = a
    return res


# --------------------------------------------------------------------------
# rep segmentation
# --------------------------------------------------------------------------

def find_reps(sig, fps, min_period=0.6, min_range=8.0):
    """Split a quasi-periodic signal into reps, between successive minima.

    Averaging several reps is what removes tracking jitter -- a single rep
    carries visible noise, four reps averaged do not.
    """
    s = smooth(np.asarray(sig, float), 9)
    rng = np.nanmax(s) - np.nanmin(s)
    if rng < min_range:
        return []
    lo = np.nanmin(s) + 0.25 * rng
    mind = int(min_period * fps)
    mins, i = [], 0
    while i < len(s):
        if s[i] < lo:
            j = i
            while j < len(s) and s[j] < lo:
                j += 1
            mins.append(i + int(np.argmin(s[i:j])))
            i = j
        else:
            i += 1
    return [(a, b) for a, b in zip(mins, mins[1:])
            if b - a >= mind and (np.nanmax(s[a:b]) - min(s[a], s[b])) > 0.5 * rng]


def resample(sig, a, b, n=RESAMPLE_N):
    seg = np.asarray(sig[a:b], float)
    idx = np.arange(len(seg))
    ok = ~np.isnan(seg)
    if ok.sum() < 3:
        return None
    seg = np.interp(idx, idx[ok], seg[ok])
    return np.interp(np.linspace(0, len(seg) - 1, n), np.arange(len(seg)), seg)


def profile(posefile, n=RESAMPLE_N):
    """Full motion profile for one video: averaged rep curves for every
    joint angle and every segment pitch, plus rep timing."""
    fps, frames = load_frames(posefile)
    ja = joint_angles(frames)
    sp = segment_pitches(frames)
    rng = {k: float(np.nanmax(v) - np.nanmin(v)) for k, v in ja.items()}
    driver = max(rng, key=rng.get)
    reps = find_reps(ja[driver], fps)
    single = not reps
    if single:
        reps = [(0, len(frames) - 1)]

    def avg(series):
        out = {}
        for k, v in series.items():
            cs = [resample(v, a, b, n) for a, b in reps]
            cs = [c for c in cs if c is not None]
            if not cs:
                continue
            M = np.vstack(cs)
            m = M.mean(0)
            out[k] = {
                "curve": [round(float(x), 2) for x in m],
                "rom": round(float(m.max() - m.min()), 1),
                "peak_at": round(float(np.argmax(m) / (len(m) - 1)), 3),
                "rep_sd": round(float(M.std(0).mean()), 2),
            }
        return out

    return {
        "source": os.path.basename(posefile)[:-5],
        "fps": fps,
        "driver": driver,
        "n_reps": len(reps),
        "single_rep_fallback": single,
        "rep_seconds": round(float(np.mean([(b - a) / fps for a, b in reps])), 2),
        "joints": avg(ja),
        "segments": avg(sp),
    }


# --------------------------------------------------------------------------
# retargeting
# --------------------------------------------------------------------------

#: rig bone <- segment pitch, with the parent segment whose pitch must be
#: subtracted to convert a world pitch into a local bone rotation.
#: `sign` maps the measurement's sign convention onto the bone's axis.
BONE_FROM_SEGMENT = {
    "LeftUpLeg":   {"seg": "thigh_l", "parent": None,      "axis": "x", "sign": +1},
    "RightUpLeg":  {"seg": "thigh_r", "parent": None,      "axis": "x", "sign": +1},
    "Tibia.l":     {"seg": "shank_l", "parent": "thigh_l", "axis": "x", "sign": +1},
    "Tibia.r":     {"seg": "shank_r", "parent": "thigh_r", "axis": "x", "sign": +1},
    # Foot deliberately omitted. heel/toe are 2 landmarks ~15cm apart, the
    # noisiest pair BlazePose produces, and their pitch is dominated by
    # tracking jitter: a measured leg raise reported 298 deg of ankle motion,
    # which retargets into a foot spinning like a propeller. Ankle angle is
    # taken from the clinical joint angle instead, capped, in build_clips.
    "LeftArm":     {"seg": "uarm_l",  "parent": None,      "axis": "x", "sign": +1},
    "RightArm":    {"seg": "uarm_r",  "parent": None,      "axis": "x", "sign": +1},
    "LeftForeArm": {"seg": "farm_l",  "parent": "uarm_l",  "axis": "x", "sign": +1},
}

#: Trunk flexion is distributed down the spine rather than hinging at one
#: joint -- a real forward fold is roughly 45% lumbar, 35% lower thoracic,
#: 20% upper thoracic. Putting it all on one bone is what made the earlier
#: clips look like a hinged doll.
SPINE_SHARE = [("LowerBack", 0.45), ("Spine", 0.35), ("Spine1", 0.20)]
NECK_SHARE = [("Neck-Start", 0.5), ("Neck1", 0.3), ("Head", 0.2)]


#: Maximum plausible neck contribution, degrees. The `head` segment is
#: nose-to-shoulder-midpoint: a ~20cm vector between one of the least stable
#: landmarks and an average of two others. In the measured squat it reports 52
#: deg of neck motion, which is not something a squatting human does -- it is
#: the nose landmark wandering. Capped rather than dropped, because a real
#: chin tuck or neck extension clip does need it.
NECK_CAP = 15.0


def retarget(prof, frames=48, keep=("thigh_l", "thigh_r", "shank_l", "shank_r",
                                    "uarm_l", "uarm_r", "farm_l",
                                    "trunk", "head"),
             min_amplitude=4.0, side_mirror=True, drop_segments=(),
             relevance=0.30, com_hinge=True):
    """Convert a motion profile into clips.json-style tracks.

    Curves are made RELATIVE to the start of the rep, matching clips.json's
    `_relative` contract: a clip's tracks sit on top of its posture offset, so
    writing absolute angles double-counts the posture.
    """
    seg = prof["segments"]
    n = frames

    def curve(name):
        if name not in seg:
            return None
        c = np.asarray(seg[name]["curve"], float)
        return c - c[0]

    if side_mirror:
        # Single-camera depth is far noisier on the limb further from the
        # lens: the measured squat gave 87 deg of left hip flexion and 132 of
        # right, for a movement that is symmetric by definition. Mirroring the
        # near side onto the far one removes that artefact. Genuinely
        # asymmetric exercises (lunge, single-leg) pass side_mirror=False.
        for near, far in (("thigh_l", "thigh_r"), ("shank_l", "shank_r"),
                          ("uarm_l", "uarm_r")):
            if near in seg:
                seg[far] = seg[near]

    # Drop segments the exercise does not actually drive. In the recorded
    # squat the lifter holds a barbell, so the forearm's apparent 99 deg of
    # swing is the wrist landmark sliding along the bar plus depth error --
    # and because it was the largest amplitude in the clip, it became the
    # clip's "primary mover". A squat whose main event is a forearm is
    # exactly the plausible-but-wrong output that keeps shipping.
    if drop_segments:
        for name in drop_segments:
            seg.pop(name, None)

    tracks = []

    def emit(bone, values, axis="x", sign=1):
        v = sign * np.asarray(values, float)
        if float(v.max() - v.min()) < min_amplitude:
            return
        xs = np.linspace(0, n, len(v))
        keys = [[int(round(x)), round(float(y), 1)] for x, y in zip(xs, v)]
        # force a clean loop: first and last key return to the posture
        keys[0][1] = 0.0
        keys[-1][1] = 0.0
        tracks.append({"bone": bone, "axis": axis, "keys": keys})

    for bone, spec in BONE_FROM_SEGMENT.items():
        if spec["seg"] not in keep:
            continue
        c = curve(spec["seg"])
        if c is None:
            continue
        if spec["parent"]:
            p = curve(spec["parent"])
            if p is not None:
                c = c - p
        # Enforce anatomical limits across all active joints.
        # Prevent backward hyperextension on knees and elbows.
        if "Tibia" in bone:
            if np.mean(c) < 0:
                c = np.minimum(c, 0.0)
            elif np.mean(c) > 0:
                c = np.maximum(c, 0.0)
        elif "ForeArm" in bone or "Ulna" in bone or "Radius" in bone:
            if np.mean(c) < 0:
                c = np.minimum(c, 0.0)
            elif np.mean(c) > 0:
                c = np.maximum(c, 0.0)
        emit(bone, c, spec["axis"], spec["sign"])

    # -------------------------------------------------------------------
    # TRUNK: decompose the fold into HIP rotation vs SPINE flexion.
    #
    # This is a real biomechanics bug, not a tuning issue. The measured trunk
    # pitch in a Romanian deadlift is 71 deg -- and the measured HIP JOINT
    # angle is also 71 deg, meaning the whole fold happens at the hip with the
    # femur staying vertical. Dumping trunk pitch onto LowerBack/Spine, as the
    # first version of this retargeter did, renders it as 71 deg of SPINAL
    # FLEXION: a rounded-back deadlift.
    #
    # That is not a cosmetic error. A hip hinge with a neutral spine is the
    # single most important thing this exercise teaches, and the app prescribes
    # it to people with back pain. Demonstrating a rounded spine would be
    # teaching the injury. It also explains why the hinge "moved its target
    # muscle only 4cm": the hamstrings run pelvis->tibia, so they only lengthen
    # when the PELVIS rotates. Flexing the spine instead leaves them slack --
    # the clip was failing its own hamstring test because it was the wrong
    # movement, and the honest fix was never a lower threshold.
    #
    # So: pelvis rotation takes min(hip joint angle, trunk pitch), and only
    # the REMAINDER becomes spine flexion. A crunch (trunk 40, hip 89) is
    # mostly spine; a hinge is all hip; a row is 17 hip + 5 spine.
    t = curve("trunk")
    if t is not None:
        hip = None
        if "hip" in prof.get("joints", {}):
            h = np.asarray(prof["joints"]["hip"]["curve"], float)
            hip = h - h[0]
        if hip is not None:
            # element-wise: the pelvis can only supply as much fold as the hip
            # joint actually produced at that instant
            pelvis = np.sign(t) * np.minimum(np.abs(t), np.abs(hip))
            spine = t - pelvis
        else:
            pelvis, spine = np.zeros_like(t), t

        # CENTRE-OF-MASS COMPENSATION.
        #
        # In a closed-chain knee-flexion pattern the measured trunk lean is
        # systematically under-read (near-frontal camera, single-view depth):
        # 11 deg against 97 deg of knee flexion. A human cannot squat with a
        # vertical torso -- the centre of mass would sit behind the heels. So
        # where the clip is knee-driven and the measured lean is implausibly
        # small for the depth achieved, substitute a hinge proportional to
        # knee flexion, keeping the measured phase lag.
        if com_hinge and "knee" in prof.get("joints", {}):
            kc = np.asarray(prof["joints"]["knee"]["curve"], float)
            kc = kc - kc[0]
            knee_amp = float(np.abs(kc).max())
            lean_amp = float(np.abs(pelvis).max())
            # Gate on CLOSED CHAIN, not just on knee flexion. A supine leg
            # raise flexes the "knee" 68 deg with the foot free in the air --
            # there is no ground reaction to balance against and no reason for
            # the pelvis to rotate, but the first version of this check fired
            # anyway and gave the leg raise a 28-degree pelvic tilt it should
            # not have. Closed chain means the foot is loaded, which for these
            # clips means the posture is standing.
            closed = prof.get("closed_chain", False)
            if (closed and knee_amp > 40.0
                    and lean_amp < knee_amp * TRUNK_PER_KNEE * 0.7):
                tj = prof["joints"].get("trunk", {}).get("curve")
                pelvis = com_pelvic_hinge(kc, tj)
                spine = np.zeros_like(pelvis)
        # Hips rotation folds the whole upper body; the femurs must be
        # counter-rotated by the SAME SIGN to stay vertical so the feet stay
        # planted. Hips is the rig root, so this pair is emitted together --
        # v5 tried Hips alone and tore the model apart.
        #
        # The sign here was wrong and it is worth being precise about, because
        # the animation still looked superficially like a hinge. Hips was
        # emitted at -1 and the femur compensation at +1, which ADDS to the
        # pelvic rotation instead of cancelling it. Measured directly on the
        # rig: from a rest foot height of z=-0.005, a -71 pelvis alone puts the
        # foot at z=0.565; -71 with the femurs at +73 puts it at z=1.473 (the
        # legs swing up and the body pikes in mid-air); -71 with the femurs at
        # -73 puts it at z=0.069, i.e. back on the floor. The grounding pass
        # was then dutifully shoving the whole body 1.24m downwards to chase a
        # contact point that had been lifted 1.27m, which is what made the
        # bodies read as pitching over.
        if float(np.abs(pelvis).max()) >= min_amplitude:
            emit("Hips", pelvis, "x", -1)
            for bone in ("LeftUpLeg", "RightUpLeg"):
                existing = next((x for x in tracks if x["bone"] == bone), None)
                comp = [[int(round(x)), round(float(-y), 1)]
                        for x, y in zip(np.linspace(0, n, len(pelvis)), pelvis)]
                if existing:
                    # add the counter-rotation onto the measured femur track,
                    # then re-pin the endpoints -- summing two curves that each
                    # start and end at zero does not, after rounding, and a
                    # 1.3-degree step at the loop point reads as a twitch.
                    for k, (f, v) in enumerate(existing["keys"]):
                        existing["keys"][k] = [f, round(v + comp[k][1], 1)]
                    existing["keys"][0][1] = 0.0
                    existing["keys"][-1][1] = 0.0
                else:
                    emit(bone, pelvis, "x", -1)
        for bone, share in SPINE_SHARE:
            emit(bone, spine * share, "x", -1)
        # The neck bones are children of the spine, so the head's WORLD pitch
        # already contains the trunk's. Emitting it raw made a deadlift crane
        # its neck 49 deg while merely folding forward -- the head was being
        # rotated twice. Subtract the parent.
        h = curve("head")
        if h is not None:
            hh = h - t
            span = float(np.abs(hh).max())
            if span > NECK_CAP:
                hh = hh * (NECK_CAP / span)
            for bone, share in NECK_SHARE:
                emit(bone, hh * share, "x", -1)

    # RELEVANCE FILTER -- ABSOLUTE, not relative to the primary mover.
    #
    # v7 dropped any track under `relevance` x the clip's biggest amplitude.
    # That is wrong in principle and it cost a real behaviour: the measured
    # squat contains 11.4 deg of pelvic hinge peaking at 0.69 of the cycle
    # (after the knees -- the trunk trailing the legs is exactly the
    # centre-of-mass compensation a human makes), but the squat's primary
    # mover is a 97 deg femur, so the ratio threshold sat at 29 deg and threw
    # the hinge away as noise. The torso then stayed bolt upright while the
    # hips dropped, which is the single most non-human thing in the library.
    #
    # A trunk contribution SHOULD be an order of magnitude smaller than a knee
    # in a squat. Small is not the same as spurious. So: gate on an absolute
    # floor, and let the per-exercise `drop_segments` list handle limbs that
    # are genuinely not participating (a barbell in the hands). The floor is
    # deliberately low; body sway lands under it, a real hinge does not.
    if tracks:
        tracks = [t for t in tracks
                  if (max(k[1] for k in t["keys"]) - min(k[1] for k in t["keys"]))
                  >= min_amplitude]

    return tracks


#: Sagittal trunk lean a human uses at a given knee-flexion angle, degrees,
#: for a closed-chain squat pattern. Sampled from published squat kinematics:
#: roughly 0.35 deg of forward trunk lean per degree of knee flexion, easing
#: off past parallel as the shins incline instead.
#:
#: Why not just use the measured number? The squat video is shot near-frontally
#: and single-camera depth systematically UNDER-reads sagittal lean -- it gives
#: 11.4 deg where the same lifter's knee flexes 97. The measured TIMING is
#: reliable (the trunk peaks at 0.69 of the cycle, well after the knee at 0.50)
#: so the shape comes from the data and only the magnitude comes from here.
TRUNK_PER_KNEE = 0.35
TRUNK_LEAN_MAX = 42.0

#: Fraction of the cycle by which trunk lean trails knee flexion. Measured:
#: knee peaks at 0.50, trunk at 0.69.
TRUNK_LAG = 0.19


def com_pelvic_hinge(knee_curve, trunk_curve=None, gain=TRUNK_PER_KNEE,
                     cap=TRUNK_LEAN_MAX):
    """Pelvic anterior rotation that keeps the torso balanced over the midfoot.

    A human squatting does not hold the torso vertical while the hips drop --
    that puts the centre of mass behind the heels and you fall over. The
    pelvis rotates forward roughly in proportion to knee flexion, so the
    ribcage stays over the middle of the foot.

    Magnitude is proportional to knee flexion; PHASE is taken from the
    measured trunk curve when one is available, because real trunk lean lags
    the knee (measured: knee peaks at 0.50 of the cycle, trunk at 0.69) and
    that lag is a large part of what makes the movement read as human. Using
    the knee curve's own phase would put them back in lockstep.
    """
    knee = np.abs(np.asarray(knee_curve, float))
    knee = knee - knee.min()
    target = np.minimum(knee * gain, cap)
    # Phase: lag the knee by the measured offset rather than reusing the
    # measured trunk SHAPE. Pass the JOINT-angle trunk curve here, not the
    # segment-pitch one: the segment curve is the same 11-degree signal and
    # its argmax lands on a noise bump, reporting a NEGATIVE lag (the trunk
    # peaking before the knee, which is backwards). The joint curve gives
    # 0.182, matching the constant below. Rescaling an 11-degree signal up to 30 amplifies
    # its noise by the same factor -- tried it, and the result was a torso
    # that jittered through four separate bobs per rep. The reliable part of
    # the measurement is the OFFSET between the two peaks (knee 0.50, trunk
    # 0.69 => 0.19 of the cycle), so shift the clean knee-driven curve by it.
    # PHASE, and the sign of the correction matters more than its size.
    #
    # Trunk lean does trail knee flexion in a real squat (measured: knee peaks
    # at 0.47 of the cycle, trunk at 0.69). But shifting the whole curve by
    # that lag moves the PEAK LEAN into the ascent: at maximum squat depth the
    # model then leaned only 5.5 of its 29.5 degrees, so the deepest frame --
    # the one a user looks at -- still had a near-vertical torso. The lean was
    # arriving on the way back up, which is worse than no lean at all because
    # it reads as a stumble.
    #
    # A human leans MOST at the bottom. The measured lag is real but it
    # describes the descent being led by the knees, not the lean peaking
    # later: eccentric lean builds slightly behind knee flexion and then holds
    # through the turnaround. So skew the curve rather than translating it --
    # the rise is delayed, the peak stays on the peak.
    lag = TRUNK_LAG
    if trunk_curve is not None:
        tc = np.asarray(trunk_curve, float)
        kc2 = np.abs(np.asarray(knee_curve, float))
        if len(tc) == len(kc2) and float(np.ptp(tc)) > 1e-6:
            lag = float(np.argmax(tc) - np.argmax(kc2)) / len(tc)
            lag = max(0.0, min(0.30, lag))
    n = len(target)
    peak = int(np.argmax(target))
    if peak > 0 and lag > 0:
        # gamma > 1 on the rising limb delays the build-up without moving the
        # peak; the falling limb is left alone so the return is not rushed.
        g = 1.0 + 2.0 * lag
        rise = np.asarray(target[:peak + 1], float)
        x = np.linspace(0.0, 1.0, len(rise))
        top = float(rise.max())
        if top > 1e-9:
            target = np.concatenate([top * (x ** g), target[peak + 1:]])
    return target


def timing_shape():
    """The measured mean normalised movement curve (33 samples, 0..1).

    Derived from 13 multi-rep clips. RMS distance from the symmetric triangle
    every hand-authored clip used is 0.072 -- small in absolute terms, and
    almost all of it is in the two features that read as human: the peak
    arrives before the midpoint, and the movement dwells at end range.
    """
    return [0.017, 0.085, 0.210, 0.289, 0.320, 0.389, 0.406, 0.472, 0.508,
            0.549, 0.588, 0.625, 0.706, 0.773, 0.849, 0.844, 0.838, 0.825,
            0.811, 0.809, 0.782, 0.748, 0.705, 0.652, 0.586, 0.555, 0.435,
            0.387, 0.338, 0.276, 0.200, 0.139, 0.009]


def shape_track(peak_degrees, frames=48, n=RESAMPLE_N):
    """Apply the measured human timing curve to a single-joint authored clip.

    For frontal-plane and small-joint exercises that single-camera video
    cannot measure, we cannot copy real angles -- but we can still stop using
    a symmetric triangle. This gives an authored clip measured *timing* even
    where its amplitude stays clinical.
    """
    shape = np.asarray(timing_shape())
    # The measured curve starts at 0.017 and ends at 0.009 rather than exactly
    # zero -- averaging real reps never lands on a clean boundary. Left as-is
    # the clip does not loop (a 1.7%-of-range jump every cycle reads as a
    # twitch), so pin the endpoints.
    shape = shape - shape.min()
    # Normalise to a true 0..1. The averaged curve peaks at 0.849, not 1.0 --
    # averaging several reps rounds off the peak, because no two reps hit end
    # range on exactly the same normalised frame. Left unnormalised, every
    # shaped clip silently lost 15% of its amplitude, which is how a bridge
    # authored at 30 deg of hip extension arrived at 25 and fell short of its
    # own muscle-travel test. Same class as v4's blanket 45% cap, just
    # smaller and hidden inside the maths.
    shape = shape / shape.max()
    shape[0] = 0.0
    shape[-1] = 0.0
    xs = np.linspace(0, frames, len(shape))
    return [[int(round(x)), round(float(peak_degrees * y), 1)]
            for x, y in zip(xs, shape)]
