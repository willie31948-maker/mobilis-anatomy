#!/usr/bin/env python3
"""
Build the animated, skinned anatomy model.

    pip install bpy
    python3 tools/build_animated.py \
        --anatomy /path/to/Z-Anatomy/Startup.blend \
        --biomech /path/to/Z-Biomechanics/Startup.blend \
        --out public/models --budget 2500

What this does that extract_models.py does not:

1. Opens the **Z-Biomechanics** file, which carries a 237-bone anatomical rig
   (Femur, Tibia, Scapula, Ulna, individual vertebrae and phalanges).
2. Appends the muscle meshes from **Z-Anatomy** into it. The two files are
   built on the same underlying anatomy, so the meshes land in register with
   the skeleton.
3. Binds every muscle to the rig with automatic weights, so the muscles
   actually deform when a joint moves.
4. Authors the exercise clips from tools/clips.json as keyframed joint angles.
   The bundled mocap is walking/jogging/jumping -- useless for corrective
   exercise -- so the clips are written as explicit, physiologically-bounded
   joint rotations instead. Honest and about a thousand times smaller.
5. Exports ONE animated GLB containing the skinned muscles + all clips.

Why one file rather than per-region files: a skinned mesh must ship with its
armature, and duplicating a 237-bone skeleton into 11 files would cost far more
than it saves. The static per-region files stay as they are for the fast,
non-animated view.
"""

import argparse
import json
import math
import os
import sys

try:
    import bpy
    from mathutils import Euler
except ImportError:
    sys.exit("bpy not available. Install with: pip install bpy")


def log(*a):
    print("[anim]", *a, flush=True)


def clear_selection():
    for o in bpy.context.view_layer.objects:
        try:
            o.select_set(False)
        except RuntimeError:
            pass
    bpy.context.view_layer.objects.active = None


def ensure_linked(obj):
    sc = bpy.context.scene.collection
    if obj.name not in sc.objects:
        try:
            sc.objects.link(obj)
        except RuntimeError:
            pass
    obj.hide_set(False)
    obj.hide_viewport = False
    obj.hide_select = False


def clean_mesh(obj):
    """Weld doubles and drop loose geometry before skinning.

    The Z-Anatomy meshes carry duplicate vertices and stray loose edges from
    the original BodyParts3D conversion. The glTF exporter flags them "not
    valid", and more importantly automatic weights assigns unrelated bones to
    the duplicated vertices sitting on top of each other -- which is what makes
    a muscle tear apart mid-animation instead of deforming smoothly.
    """
    clear_selection()
    ensure_linked(obj)
    if obj.data.users > 1:
        obj.data = obj.data.copy()
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.0002)
    bpy.ops.mesh.delete_loose()
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')


def decimate(obj, budget):
    mesh = obj.data
    tris = sum(max(0, len(p.vertices) - 2) for p in mesh.polygons)
    if tris <= budget:
        return tris, tris
    if obj.data.users > 1:
        obj.data = obj.data.copy()
    clear_selection()
    ensure_linked(obj)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new(name="dec", type="DECIMATE")
    mod.ratio = max(0.02, budget / float(tris))
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return tris, sum(max(0, len(p.vertices) - 2) for p in obj.data.polygons)


def append_muscles(src_blend, wanted_names):
    """Append named meshes from the Z-Anatomy file into the current scene."""
    with bpy.data.libraries.load(src_blend, link=False) as (df, dt):
        available = set(df.objects)
        dt.objects = [n for n in wanted_names if n in available]
    got = [o for o in dt.objects if o is not None]
    sc = bpy.context.scene.collection
    for o in got:
        try:
            sc.objects.link(o)
        except RuntimeError:
            pass
    return got


def strip_constraints(arm):
    """Remove pose-bone constraints before authoring clips.

    The Z-Biomechanics rig is built for INTERACTIVE posing: LIMIT_ROTATION,
    COPY_ROTATION and DAMPED_TRACK constraints keep a human dragging handles
    inside physiological range. They also silently override keyframed rotation,
    which is why keyframing Tibia/Ulna/C-spine produced clips where the bone
    "moved" in the file but the evaluated pose never changed.

    BUT: removing ALL of them breaks the spine. The vertebrae L5..C1 are
    separate ROOT bones -- they are not children of Spine -- and the only
    thing that makes them follow the torso is an ARMATURE constraint on each
    one. Strip that and rotating Spine moves the head while every vertebra
    stays behind: measured, L3/T8/C4 displacement went to exactly 0.0. The
    thoracic and cervical clips "played" against a spine that could not move.
    Same for the ribs (COPY_ROTATION + STRETCH_TO) and the forearm/clavicle
    (DAMPED_TRACK / LOCKED_TRACK), which is how the radius follows the ulna.

    So strip only LIMIT_ROTATION -- the interactive range clamp, which is the
    one that actually overrides keyframes -- and keep the propagation
    constraints that make the rig a connected body. We enforce physiological
    range ourselves in clips.json.
    """
    removed = 0
    for pb in arm.pose.bones:
        for c in list(pb.constraints):
            if c.type != 'LIMIT_ROTATION':
                continue
            pb.constraints.remove(c)
            removed += 1
    # Drivers can re-drive constraint properties and bone transforms too.
    if arm.animation_data:
        for d in list(arm.animation_data.drivers):
            try:
                arm.animation_data.drivers.remove(d)
            except Exception:
                pass
    return removed


SIDE_BONES = {
    "{upleg}": ("LeftUpLeg", "RightUpLeg"),
    "{leg}": ("LeftLeg", "RightLeg"),
    "{arm}": ("LeftArm", "RightArm"),
    "{forearm}": ("LeftForeArm", "RightForeArm"),
    "{hand}": ("LeftHand", "RightHand"),
    "{foot}": ("LeftFoot", "RightFoot"),
    "{scapula}": ("Scapula.l", "Scapula.r"),
    "{tibia}": ("Tibia.l", "Tibia.r"),
    "{radius}": ("Radius.l", "Radius.r"),
    "{ulna}": ("Ulna.l", "Ulna.r"),
    "{carpal}": ("Proximal carpal bones-Flexion.l", "Proximal carpal bones-Flexion.r"),
}


def resolve_bone(template, side):
    """Expand {upleg}/{scapula}/{s} placeholders for one side ('l' or 'r')."""
    i = 0 if side == "l" else 1
    out = template
    for k, v in SIDE_BONES.items():
        out = out.replace(k, v[i])
    return out.replace("{s}", side)


#: Retained only as a record of a MEASURED dead end. Thresholding weights
#: below this to zero took the worst local stretch from 2.07x to 4.12x,
#: because it makes the weight field discontinuous at the threshold -- see
#: bind_muscles. Distant influences are removed by fixing the bone chain
#: instead, which keeps the field smooth.
WEIGHT_EPS = None  # deliberately unused

#: How far the end anchors are pulled back from each bone's far end towards
#: the joint, as a fraction of bone length. 0.0 = pure span (smoothest
#: gradient, but the moving bone loses authority), 1.0 = anchor on the joint
#: (measured 24x stretch -- see _chain_anchors). Tuned by measuring both
#: stretch and per-clip muscle travel, not picked.
ANCHOR_BIAS = 0.35


def _chain_anchors(bw, chain, mode="span", bias=None):
    """Anchor point per bone in the chain.

    MEASURED, and the measurement reversed my first answer. I read the shipped
    weights, saw that the gastrocnemius's femur influence sat 50cm from the
    muscle's centroid, and concluded the anchors should move onto the joints
    the muscle spans. Rebinding that way took the worst local stretch from
    2.25x to **24x** -- ten times worse.

    The reason is geometric. Anchoring two chained bones at their SHARED joint
    puts both anchors in almost the same place, so the gradient axis collapses
    to a few centimetres. The chain parameter then swings from 0 to 1 across a
    sliver of the muscle: neighbouring vertices land on opposite ends of the
    blend and shear apart. The 50cm number was never a defect -- it is just
    the distance from a long bone's origin to a muscle's centroid, which is
    large by construction and says nothing about weighting quality.

    So the anchors must SPAN: each end bone contributes the end FURTHEST from
    its neighbour, giving the longest, most stable gradient axis, with via
    bones at their midpoints. This is what the two-bone skin was doing
    implicitly with midpoints, and why it worked.
    """
    centres = [(bw[b][0] + bw[b][1]) / 2.0 for b in chain]
    if len(chain) == 1:
        return [centres[0]]
    anchors = []
    for i, b in enumerate(chain):
        head, tail = bw[b]
        if 0 < i < len(chain) - 1:
            anchors.append(centres[i])          # via bone: its own centre
            continue
        ref = centres[i + 1] if i == 0 else centres[i - 1]
        if mode == "span":
            far = head if (head - ref).length >= (tail - ref).length else tail
            near = tail if far is head else head
            # Pull the far anchor back towards the joint by ANCHOR_BIAS. Pure
            # "furthest end" gives the longest, smoothest gradient axis, but
            # it also pushes the muscle's own share of its moving bone down:
            # gluteus medius went to 94% pelvis / 6% femur and stopped
            # following the leg (0.7cm of travel, failing its own test), and
            # the biceps dropped to 7% radius. A partial pull-back keeps the
            # axis long enough to stay smooth while restoring the moving
            # bone's authority over the muscle that attaches to it.
            anchors.append(far + (near - far) * (ANCHOR_BIAS if bias is None else bias))
        else:
            anchors.append(head if (head - ref).length <= (tail - ref).length else tail)
    return anchors


#: Sheet muscles bound along a SPINE SPLINE rather than as a two-bone strap.
#:
#: MEASURED, and it only works for sheets lying ON the spine. Erector spinae
#: improved 1.60x -> 1.47x. The anterior abdominal wall got dramatically
#: WORSE: transversus abdominis 2.13x -> 5.91x, rectus abdominis 1.98x ->
#: 4.98x, even though the weights themselves look impeccable either way (4
#: influences, normalised, smooth kernel).
#:
#: The reason is LEVER ARM. The erectors sit a couple of centimetres from the
#: vertebral axis, so a vertebra's rotation moves their vertices a couple of
#: centimetres. The abdominal wall sits 15-20cm ANTERIOR of it. Handing
#: adjacent vertices to different vertebrae multiplies the small rotational
#: difference between those vertebrae by that arm, and the sheet shears. More
#: anchors makes a DISTANT sheet worse, which is the opposite of the
#: intuition. The anterior wall keeps its wide two-bone gradient, pelvis to
#: ribcage, which is what it physically does: it spans between the two rigid
#: bodies it attaches to and is carried by them.
SPINE_SHEETS = {
    "erector_spinae": ["Hips", "L5", "L4", "L3", "L2", "L1", "T12", "T10",
                       "T8", "T6", "T4", "T2", "T1"],
    "quadratus_lumborum": ["L5", "L4", "L3", "L2", "L1", "T12"],
}

#: glTF stores at most 4 joint influences per vertex. Keep the kernel under
#: that so the exporter never silently truncates and renormalises -- that kind
#: of invisible corruption has bitten this project repeatedly.
MAX_SHEET_INFLUENCES = 4


def bind_spine_sheet(arm, obj, bones, bw):
    """Weight a sheet by a smooth falloff along the spine's own arc.

    Order the named vertebrae along the spine, measure each vertex's position
    on that polyline, then distribute weight with a cosine kernel over the
    nearest few vertebrae. A vertex at L3's height is driven mostly by L3 with
    tapering contributions from L2 and L4, so bending the lumbar spine carries
    the sheet with it instead of stretching it between two distant ends.
    """
    import math as _m

    pts = [(bw[b][0] + bw[b][1]) / 2.0 for b in bones]
    cum = [0.0]
    for i in range(len(pts) - 1):
        cum.append(cum[-1] + max((pts[i + 1] - pts[i]).length, 1e-9))
    total = cum[-1]
    u = [c / total for c in cum]

    for g in list(obj.vertex_groups):
        obj.vertex_groups.remove(g)
    groups = [obj.vertex_groups.new(name=b) for b in bones]

    # Wide enough that no vertex is ever driven by a single vertebra -- that
    # would reintroduce creasing at each vertebral boundary.
    sigma = max(2.0 / max(len(bones) - 1, 1), 0.12)

    for v in obj.data.vertices:
        p = obj.matrix_world @ v.co
        best_d, best_u = None, 0.0
        for i in range(len(pts) - 1):
            d_vec = pts[i + 1] - pts[i]
            L2 = d_vec.length_squared
            t = max(0.0, min(1.0, (p - pts[i]).dot(d_vec) / L2)) if L2 > 1e-12 else 0.0
            q = pts[i] + d_vec * t
            dist = (p - q).length
            if best_d is None or dist < best_d:
                best_d = dist
                best_u = u[i] + t * (u[i + 1] - u[i])

        ws = []
        for i, ui in enumerate(u):
            x = abs(best_u - ui) / sigma
            ws.append((0.5 * (1.0 + _m.cos(_m.pi * x)) if x < 1.0 else 0.0, i))
        ws.sort(reverse=True)
        ws = [w for w in ws[:MAX_SHEET_INFLUENCES] if w[0] > 1e-9]
        if not ws:
            # Never leave a vertex unweighted: the exporter assigns it to its
            # neutral bone, which sits at the origin, and the mesh explodes.
            j = min(range(len(u)), key=lambda i: abs(best_u - u[i]))
            ws = [(1.0, j)]
        tot = sum(w for w, _ in ws)
        for w, i in ws:
            groups[i].add([v.index], w / tot, 'REPLACE')


def bind_muscles(arm, built, attachments):
    """Skin each muscle as a smooth gradient along its anatomical bone chain.

    Replaces Blender's automatic weights, which are anatomically blind: they
    blend each vertex across whichever bones happen to be nearest, so the
    hamstrings ended up part-welded to the pelvis and part to the femur
    mid-belly. At a real 80-degree hip flexion that mesh stretched **28x** and
    tore open. Distance-based pruning measured strictly WORSE (26x -> 28x),
    because pruning drops the FAR attachment -- exactly the one a muscle
    spanning a joint needs to stay connected.

    HOW IT WORKS. A muscle is a strap running origin -> (via...) -> insertion.
    Project every vertex onto that polyline, then give it weight from only the
    TWO bones bracketing its own position along the chain, smoothstepped.

    That last detail is the whole design. Blending one vertex across MANY
    bones is what tore muscles in v4; this is the opposite -- a chain of
    LOCAL two-bone blends. A vertex never sees a bone it does not sit between,
    so a muscle can cross two joints (triceps: scapula -> humerus -> ulna)
    without any vertex being pulled by two bones at opposite ends of the body.

    v8 fixes two real defects found by reading the weights out of the shipped
    glTF (tools/inspect_weights.py):
      * anchors were bone MIDPOINTS, not joints -- see _chain_anchors
      * a two-joint muscle had no influence on the bone it lies along: the
        triceps was Scapula 0.47 / Ulna 0.53 with zero humerus and sheared
        2.25x, and the deltoid had no CLAVICLE influence at all even though
        its anterior head attaches there and the clavicle is animated
        separately.
    """
    bw = {b.name: (arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local)
          for b in arm.data.bones}
    report = []
    for name, obj in built.items():
        mid, side = name.rsplit("__", 1)
        spec = attachments.get(mid)
        if spec is None:
            log(f"  WARNING no attachment spec for {mid}")
            continue

        chain_t = [spec["origin"]] + list(spec.get("via", [])) + [spec["insertion"]]
        chain, seen = [], set()
        for t in chain_t:
            b = resolve_bone(t, side)
            if b in bw and b not in seen:
                chain.append(b)
                seen.add(b)
            elif b not in bw:
                log(f"  WARNING unresolved bone for {name}: {b}")

        for g in list(obj.vertex_groups):
            obj.vertex_groups.remove(g)

        def finish(tag):
            for m in list(obj.modifiers):
                if m.type == 'ARMATURE':
                    obj.modifiers.remove(m)
            m = obj.modifiers.new(name="Armature", type='ARMATURE')
            m.object = arm
            obj.parent = arm
            obj.parent_type = 'OBJECT'
            obj.matrix_parent_inverse = arm.matrix_world.inverted()
            report.append(f"{name}:{tag}")

        if mid in SPINE_SHEETS:
            bones = [b for b in SPINE_SHEETS[mid] if b in bw]
            if len(bones) >= 3:
                bind_spine_sheet(arm, obj, bones, bw)
                finish(f"spine sheet over {len(bones)} vertebrae")
                continue
            log(f"  WARNING sheet bones missing for {mid}")

        if spec.get("rigid") or len(chain) < 2:
            # Rigid: whole mesh on one bone. See attachments.json :: _rigid.
            b = chain[0] if chain else resolve_bone(spec["origin"], side)
            vg = obj.vertex_groups.new(name=b)
            vg.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
            finish(f"{b} (rigid)")
            continue

        anchors = _chain_anchors(bw, chain, bias=spec.get("bias"))

        # cumulative arc length along the anchor polyline, normalised 0..1
        # Drop degenerate segments. Two chained bones can share a joint exactly
        # (the clavicle's lateral end IS the scapula's medial anchor), giving a
        # zero-length segment and a divide-by-zero. Collapse them instead.
        segs, chain2, anchors2 = [], [chain[0]], [anchors[0]]
        for i in range(len(anchors) - 1):
            v = anchors[i + 1] - anchors[i]
            if v.length < 1e-6:
                continue
            segs.append(v)
            chain2.append(chain[i + 1])
            anchors2.append(anchors[i + 1])
        if not segs:
            vg = obj.vertex_groups.new(name=chain[0])
            vg.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
            finish(f"{chain[0]} (degenerate chain)")
            continue
        chain, anchors = chain2, anchors2
        seg_len = [max(v.length, 1e-9) for v in segs]
        total = sum(seg_len)
        cum = [0.0]
        for L in seg_len:
            cum.append(cum[-1] + L / total)

        groups = [obj.vertex_groups.new(name=b) for b in chain]

        for v in obj.data.vertices:
            p = obj.matrix_world @ v.co
            # nearest point on the polyline -> chain parameter in 0..1
            best_d, best_s = None, 0.0
            for i, d_vec in enumerate(segs):
                t = (p - anchors[i]).dot(d_vec) / d_vec.length_squared
                t = max(0.0, min(1.0, t))
                q = anchors[i] + d_vec * t
                dist = (p - q).length
                if best_d is None or dist < best_d:
                    best_d = dist
                    best_s = cum[i] + t * (cum[i + 1] - cum[i])
            # locate the bracketing pair and blend ONLY those two
            k = 0
            while k + 2 < len(cum) and best_s > cum[k + 1]:
                k += 1
            span = max(cum[k + 1] - cum[k], 1e-9)
            u = max(0.0, min(1.0, (best_s - cum[k]) / span))
            w = u * u * (3.0 - 2.0 * u)     # smoothstep: no crease at the belly
            # NOTE: do NOT threshold small weights to zero here.
            # Tried it (WEIGHT_EPS below) to "remove accidental weight from
            # distant bones" and it took the worst stretch from 2.07x to
            # 4.12x. Snapping a near-zero weight to zero creates a
            # DISCONTINUITY: two adjacent vertices either side of the
            # threshold jump to different bones, and the edge between them
            # tears. Weight smoothness matters more than weight tidiness.
            # Distant influences are instead eliminated at the source, by
            # giving the muscle the intermediate bone it actually lies along
            # (see attachments.json :: _via), which dropped the gastrocnemius
            # femur share from 0.47 to 0.11 continuously.
            groups[k].add([v.index], 1.0 - w, 'REPLACE')
            groups[k + 1].add([v.index], w, 'REPLACE')

        finish("->".join(chain))
    return report


def _action_fcurves(action):
    """Blender 4.4+ moved fcurves into action.layers[].strips[].channelbags[]."""
    if getattr(action, "fcurves", None) and len(action.fcurves):
        return action.fcurves
    try:
        for layer in action.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    if len(cb.fcurves):
                        return cb.fcurves
    except Exception:
        pass
    return action.fcurves


def _snapshot_constraints(arm):
    """Capture every pose-bone constraint so it can be put back afterwards.

    The rig's spine is held together BY constraints: the vertebrae L5..C1 are
    separate ROOT bones that follow Spine/Spine1/LowerBack through ARMATURE
    constraints. They must be present to author a pose and ABSENT whenever we
    read or bake one, because reading an already-resolved pose with them live
    applies their effect a second time. influence=0 does not work -- an
    ARMATURE constraint's bone targets carry their own weights and keep
    propagating regardless. They have to actually be gone.
    """
    out = []
    for pb in arm.pose.bones:
        for c in pb.constraints:
            props = {}
            for k in c.bl_rna.properties.keys():
                if k in ("rna_type", "type", "is_valid", "error_location",
                         "error_rotation", "is_override_data", "active"):
                    continue
                try:
                    props[k] = getattr(c, k)
                except Exception:
                    pass
            tgts = [{"target": t.target, "subtarget": t.subtarget,
                     "weight": t.weight} for t in getattr(c, "targets", [])]
            out.append((pb.name, c.type, props, tgts))
    return out


def _strip_constraints(arm):
    n = 0
    for pb in arm.pose.bones:
        for c in list(pb.constraints):
            pb.constraints.remove(c)
            n += 1
    return n


def _restore_constraints(arm, saved):
    for bone_name, ctype, props, tgts in saved:
        pb = arm.pose.bones.get(bone_name)
        if pb is None:
            continue
        c = pb.constraints.new(ctype)
        for k, v in props.items():
            try:
                setattr(c, k, v)
            except Exception:
                pass
        for t in tgts:
            try:
                nt = c.targets.new()
                nt.target = t["target"]
                nt.subtarget = t["subtarget"]
                nt.weight = t["weight"]
            except Exception:
                pass


def build_clip(arm, name, spec, postures, built, fps=30):
    """Create an Action from a joint-angle spec and stash it in an NLA track.

    Every clip carries a SETUP POSTURE. v4 authored all 26 clips standing,
    which made a third of the library nonsense -- a glute bridge is performed
    lying on your back, so a "standing bridge" only swayed the legs. The
    posture is baked into every keyframe of the clip (not a separate pose), so
    each clip is self-contained and the exporter cannot drop it.
    """
    if arm.animation_data is None:
        arm.animation_data_create()

    action = bpy.data.actions.new(name=name)
    arm.animation_data.action = action
    try:
        # Blender 4.4+/5.x slotted actions
        slot = action.slots.new(id_type='OBJECT', name=name)
        arm.animation_data.action_slot = slot
    except Exception:
        pass

    # Reset all pose bones so clips never inherit each other's pose.
    for pb in arm.pose.bones:
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)

    tracks = list(spec.get("tracks", []))

    # Convenience: a finger-flex spec expands into every phalanx bone.
    fingers = spec.get("fingers")
    if fingers:
        side = fingers.get("side", "l")
        for stage in ("Proximal", "Middle", "Distal"):
            for n in ("1st", "2nd", "3rd", "4th", "5th"):
                bone = f"{stage} phalanx of hand-{n} finger.{side}"
                if bone in arm.pose.bones:
                    tracks.append({"bone": bone, "axis": "x", "keys": fingers["flex"]})

    axis_index = {"x": 0, "y": 1, "z": 2}
    pspec = postures.get(spec.get("posture", "standing"), {})
    posture = pspec.get("bones", {})

    # The posture's whole-body orientation is an OBJECT rotation, keyframed on
    # the armature itself. Doing it as a Hips-bone rotation (the obvious way)
    # tears the model apart: the arms descend from T1, a separate root bone that
    # follows the torso through an ARMATURE constraint, so a -90 pelvis moved
    # the head 100cm and the arm only 23cm. Rotating the object moves every bone
    # rigidly, which is what lying down actually is.
    # GROUND THE POSE.
    #
    # The rig's root is the pelvis, so every closed-chain pose rotates about the
    # hips and the FEET move instead: the hinge leant the torso a correct 47
    # degrees while lifting both feet 80cm off the floor, which reads as a
    # mid-air pike rather than a Romanian deadlift. Nothing in the joint angles
    # is wrong -- what is missing is that a standing exercise is performed
    # against the ground.
    #
    # Fix by measuring the lowest skinned vertex at each keyframe and offsetting
    # the posture root so it stays at the same height as in the rest pose. This
    # is an inverse-kinematics shortcut that is exact for the thing that
    # matters (the contact point stays put) and costs one extra channel.
    # Keyframe a PARENT EMPTY, never the armature object itself.
    #
    # Blender is Z-up and glTF is Y-up, and the exporter implements that
    # conversion by writing a -90 X rotation onto the exported root node.
    # Keyframing the armature's own rotation_euler overwrites it: the whole
    # body arrived in the browser lying on its side, with its long axis on X
    # (head at x=-0.73, feet at x=+0.80), so EVERY clip was mis-oriented and
    # the "is it lying down" test was measuring the wrong axis. A parent empty
    # keeps the conversion node free.
    root = bpy.data.objects.get("PostureRoot")
    rot = pspec.get("rot", [0, 0, 0])
    root.rotation_mode = 'XYZ'
    root.rotation_euler = Euler([math.radians(a) for a in rot], 'XYZ')
    if root.animation_data is None:
        root.animation_data_create()
    ract = bpy.data.actions.new(name=f"{name}__posture")
    root.animation_data.action = ract
    try:
        rslot = ract.slots.new(id_type='OBJECT', name=name)
        root.animation_data.action_slot = rslot
    except Exception:
        pass
    for i in range(3):
        root.keyframe_insert(data_path="rotation_euler", index=i, frame=0)
        root.keyframe_insert(data_path="rotation_euler", index=i,
                             frame=spec.get("frames", 40))
    rtrack = root.animation_data.nla_tracks.new()
    rtrack.name = name
    rtrack.strips.new(f"{name}__posture", 0, ract)
    root.animation_data.action = None

    # Collect every (bone, axis) -> {frame: degrees}, starting from the posture
    # so a posture axis the clip never animates is still held for the whole
    # clip. Writing them together also fixes a real v4 limitation: two tracks
    # on the SAME bone (doorway pec stretch abducts on z AND rotates on y) used
    # to clobber each other, because each track re-read rotation_euler.
    frames_n = spec.get("frames", 40)
    curves = {}
    for bone, axes in posture.items():
        for ax, deg in axes.items():
            curves[(bone, ax)] = {0: deg, frames_n: deg}

    for tr in tracks:
        bone, ax = tr["bone"], tr["axis"]
        base = posture.get(bone, {}).get(ax, 0.0)
        cur = curves.setdefault((bone, ax), {})
        for frame, degrees in tr["keys"]:
            cur[frame] = base + degrees

    used = 0
    missing = []
    seen_bones = set()
    for (bone, ax), keys in curves.items():
        pb = arm.pose.bones.get(bone)
        if pb is None:
            missing.append(bone)
            continue
        idx = axis_index[ax]
        for frame in sorted(keys):
            rot = list(pb.rotation_euler)
            rot[idx] = math.radians(keys[frame])
            pb.rotation_euler = Euler(rot, 'XYZ')
            pb.keyframe_insert(data_path="rotation_euler", index=idx, frame=frame)
        used += 1
        seen_bones.add(bone)

    # Ground the pose: keep the lowest point of the body at its rest height.
    # See "GROUND THE POSE" above for why. Only for postures with a real
    # ground contact -- a supine clip is already lying on the floor.
    # v7: supine is grounded too. A glute bridge's whole point is that the
    # shoulders and feet stay on the floor while the PELVIS RISES. Ungrounded,
    # a pelvis-rooted rig rotates the hips in place: the joint angles were
    # right, the movement was right, and the gluteus maximus still only
    # travelled 3.8cm because the pelvis never actually went anywhere. That is
    # the same root cause as the hinge lifting its feet, just inverted, and it
    # sat behind two versions of "the bridge doesn't lift" without being the
    # thing I fixed either time.
    if spec.get("posture", "standing") in ("standing", "half_kneeling", "quadruped", "seated", "supine", "prone"):
        dg = bpy.context.evaluated_depsgraph_get()

        # Ground on the CONTACT muscles, not on the lowest vertex anywhere.
        # "Lowest point of the body" is the hands in a hip hinge -- they hang
        # below the knees -- so grounding on it shoved the whole model 48cm
        # into the floor to keep the fingertips at ankle height. The parts
        # touching the floor are what must stay put.
        CONTACT = {
            "standing": ("tibialis_anterior", "soleus", "peroneals"),
            "half_kneeling": ("tibialis_anterior", "quadriceps", "soleus"),
            "quadruped": ("tibialis_anterior", "quadriceps", "wrist_flexors"),
            "seated": ("gluteus_maximus", "hamstrings"),
            # Supine/prone: the parts pinned to the floor are the upper back
            # and the feet. Grounding on those lets the pelvis lift away from
            # them, which is the movement.
            "supine": ("trapezius", "rhomboids", "soleus", "tibialis_anterior"),
            "prone": ("pectoralis_major", "quadriceps", "tibialis_anterior"),
        }
        contact = CONTACT[spec.get("posture", "standing")]

        def lowest():
            bpy.context.view_layer.update()
            d = bpy.context.evaluated_depsgraph_get()
            lo = None
            for nm, o in built.items():
                if nm.rsplit("__", 1)[0] not in contact:
                    continue
                ev = o.evaluated_get(d)
                me = ev.to_mesh()
                for v in me.vertices:
                    z = (o.matrix_world @ v.co).z
                    if lo is None or z < lo:
                        lo = z
                ev.to_mesh_clear()
            return lo

        # Mute the already-parked NLA strips while measuring. frame_set()
        # evaluates the FULL animation state, so with earlier clips' strips
        # live the "pose" being measured was this clip layered on all its
        # predecessors -- the hinge measured its contact point 55cm high and
        # the correction shoved the model half a metre into the floor. Same
        # root cause as the clip cross-contamination during baking.
        # Measure the pose the BROWSER will show, not the one Blender shows.
        #
        # Grounding evaluated the rig with its constraints live, but the
        # exported clip is the baked pose with constraints resolved. Those are
        # different bodies: live, the vertebrae get the pelvic rotation twice,
        # so a hip hinge read the torso at 141 degrees, measured the contact
        # muscles at 1.27m (the ribcage had swung past horizontal, carrying
        # the shins up), and drove the whole body 1.23m into the floor to
        # compensate. The pose being measured and the pose being exported have
        # to be the same pose.
        ground_saved = _snapshot_constraints(arm)
        _strip_constraints(arm)

        gmuted = [t for t in arm.animation_data.nla_tracks if not t.mute]
        for t in gmuted:
            t.mute = True
        rmuted = [t for t in root.animation_data.nla_tracks if not t.mute]
        for t in rmuted:
            t.mute = True

        root.animation_data.action = ract
        keyframes = sorted({f for cv in curves.values() for f in cv} | {0, frames_n})
        offsets = []
        base_z = None
        for f in keyframes:
            bpy.context.scene.frame_set(f)
            root.location = (0.0, 0.0, 0.0)
            z = lowest()
            if base_z is None:
                base_z = z
            root.location = (0.0, 0.0, base_z - z)
            offsets.append((f, round(z, 4), round(base_z - z, 4)))
            root.keyframe_insert(data_path="location", index=2, frame=f)
        log(f"    grounded {name}: {offsets}")
        root.location = (0.0, 0.0, 0.0)
        for t in gmuted:
            t.mute = False
        for t in rmuted:
            t.mute = False
        _restore_constraints(arm, ground_saved)
        root.animation_data.action = None

    # BAKE THE CONSTRAINT RESULT INTO REAL KEYFRAMES.
    #
    # This is the bug that survived the whole v4 build. We keep the rig's
    # propagation constraints on purpose (ARMATURE on each vertebra, DAMPED_TRACK
    # on the radius, LOCKED_TRACK on the clavicle) because they are the only
    # thing that makes the rig a connected body -- strip them and rotating
    # Spine moves the head while every vertebra stays behind.
    #
    # But a constraint is EVALUATED, not stored. glTF has no concept of one, and
    # the exporter only writes channels we keyframed -- so in Blender the spine
    # bent correctly and in the browser it did not move at all (measured: 0.0cm
    # for cat-cow, 0.1cm for a chin tuck). Same for the forearm and clavicle.
    #
    # Baking with visual_keying resolves every constraint into explicit keys on
    # the bones themselves, which is what actually reaches the browser.
    # Mute every NLA track already parked on the rig. The bake evaluates the
    # FULL animation state, and an unmuted strip from an earlier clip is part
    # of that state -- so clip N came out as clip N layered on top of clips
    # 1..N-1. The tell was the channel count climbing monotonically with build
    # order (squat 633 ... ankle_eversion 794) rather than reflecting each
    # clip's own complexity: every clip was inheriting its predecessors.
    muted = [t for t in arm.animation_data.nla_tracks if not t.mute]
    for t in muted:
        t.mute = True

    # Re-zero every pose bone immediately before baking.
    #
    # nla.bake(only_selected=False) records each bone's CURRENT evaluated
    # value. Bones this clip keyframes are driven from the action; bones it
    # does NOT keyframe keep whatever they were left holding -- and the
    # grounding pass above calls frame_set() repeatedly, which leaves the rig
    # posed from the last frame it evaluated. So a jaw-opening clip baked the
    # LEGS in a squat (Hips, LeftUpLeg and both tibias all carried constant
    # non-rest rotations), and because those channels were constant-but-not-at-
    # rest my channel filter deliberately kept them, reading them as a setup
    # posture. Zeroing here makes "not keyframed" mean "at rest".
    for pb in arm.pose.bones:
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)

    prev = bpy.context.view_layer.objects.active
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.select_all(action='SELECT')
    # clear_constraints=True is REQUIRED, not an optimisation.
    #
    # visual_keying bakes each bone's evaluated WORLD pose into its local
    # channels. Leaving the constraints live then applies them AGAIN on top of
    # the baked result, so any bone that follows another via an ARMATURE
    # constraint has its motion counted twice. The vertebrae L5..C1 are
    # exactly that -- separate root bones following Spine, which is itself a
    # child of Hips -- so a 71-degree pelvic hinge rotated the ribcage 141
    # degrees and the torso swung past horizontal.
    #
    # That is what was shearing the abdominal wall: the sheet spans pelvis to
    # ribcage and its two ends were driven through rotations differing by a
    # factor of two. No weight painting fixes a doubled rotation. Measured in
    # isolation: T10's offset from Hips at mid-hinge is 70.4 degrees from rest
    # with clear_constraints=True, and 173 degrees with it False.
    #
    # The constraints are restored immediately afterwards, because the NEXT
    # clip has to be authored against a connected rig. Skipping the restore
    # left clips 2..48 with no spine propagation at all: every vertebra
    # channel came out constant-at-rest, the size filter dropped it, and the
    # hinge exported with 7 channels and a motionless torso.
    saved_constraints = _snapshot_constraints(arm)
    bpy.ops.nla.bake(frame_start=0, frame_end=frames_n, step=2,
                     only_selected=False, visual_keying=True,
                     clear_constraints=True, clear_parents=False,
                     use_current_action=True, bake_types={'POSE'})
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.objects.active = prev
    _restore_constraints(arm, saved_constraints)
    for t in muted:
        t.mute = False
    action = arm.animation_data.action

    # The bake writes every one of the 237 bones on every frame, because it
    # cannot know which ones a constraint actually moved -- 6.1 MB became
    # 22.2 MB. Drop channels that are both CONSTANT and already at the bone's
    # rest value: those genuinely carry no information.
    #
    # "Constant" alone is not enough, and getting that wrong broke three clips.
    # A setup posture is deliberately a constant non-rest value -- a supine
    # clip holds Hips.x at -90 for its whole duration. Dropping it stood the
    # model back up, so the supine leg raise and sleeper stretch were performed
    # standing again: exactly the bug this version exists to fix, reintroduced
    # by a size optimisation. Compare against rest, not against variation.
    REST = {"location": 0.0, "rotation_euler": 0.0, "scale": 1.0,
            "rotation_quaternion": None}
    fcurves = _action_fcurves(action)
    dropped = 0

    # DROP ALL SCALE CHANNELS.
    #
    # The rig models breathing with STRETCH_TO constraints on the ribs, so
    # baking writes SCALE onto the rib bones -- Rib5 bakes at (0.39, 6.69,
    # 0.39). Any muscle weighted to a rib is therefore stretched almost
    # SEVENFOLD along one axis, which is what turned the serratus into a long
    # ribbon trailing off the side of the body. A muscle demonstration has no
    # use for bone scale at all, and every bone here is meant to be rigid.
    for fc in list(fcurves):
        if fc.data_path.endswith("scale"):
            fcurves.remove(fc)
            dropped += 1

    for fc in list(_action_fcurves(action)):
        vals = [k.co[1] for k in fc.keyframe_points]
        if not vals:
            fcurves.remove(fc); dropped += 1; continue
        if (max(vals) - min(vals)) >= 1e-5:
            continue                      # it moves: keep
        prop = fc.data_path.rsplit(".", 1)[-1]
        if prop == "rotation_quaternion":
            rest = 1.0 if fc.array_index == 0 else 0.0
        else:
            rest = REST.get(prop)
        if rest is None or abs(vals[0] - rest) >= 1e-5:
            continue                      # constant but NOT at rest: a posture
        fcurves.remove(fc)
        dropped += 1
    kept = len(_action_fcurves(action))

    # Park the action in an NLA strip so the next clip starts clean, and so the
    # glTF exporter picks up every clip rather than only the active one.
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    action.name = name
    track.strips.new(name, 0, action)
    arm.animation_data.action = None

    return {"name": name, "label": spec.get("label", name), "frames": frames_n,
            "posture": spec.get("posture", "standing"),
            "tracks_applied": used, "bones": sorted(seen_bones),
            "notes": spec.get("notes", ""), "missing_bones": sorted(set(missing)),
            "baked_channels": kept, "dropped_channels": dropped}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--anatomy", required=True, help="Z-Anatomy Startup.blend")
    ap.add_argument("--biomech", required=True, help="Z-Biomechanics Startup.blend")
    ap.add_argument("--map", default=os.path.join(os.path.dirname(__file__), "muscle_map.json"))
    ap.add_argument("--clips", default=os.path.join(os.path.dirname(__file__), "clips.json"))
    ap.add_argument("--attachments",
                    default=os.path.join(os.path.dirname(__file__), "attachments.json"))
    ap.add_argument("--out", default="public/models")
    ap.add_argument("--budget", type=int, default=2500,
                    help="triangles per muscle per side (lower than static: skinning costs)")
    args = ap.parse_args()

    mapping = json.load(open(args.map))["map"]
    cj = json.load(open(args.clips))
    clipspec = cj["clips"]
    postures = cj.get("postures", {})
    attachments = json.load(open(args.attachments))["attachments"]
    os.makedirs(args.out, exist_ok=True)

    log(f"opening biomechanics rig {args.biomech}")
    bpy.ops.wm.open_mainfile(filepath=args.biomech)
    arm = bpy.data.objects.get("Armature")
    if arm is None:
        sys.exit("no 'Armature' in the biomechanics file")
    log(f"rig has {len(arm.data.bones)} bones")

    removed = strip_constraints(arm)
    log(f"removed {removed} pose constraints/drivers that would override keyframes")

    # Posture pivot: the armature hangs off this empty so a clip can lay the
    # whole body down without touching the armature's own transform (which the
    # glTF exporter needs for its Z-up -> Y-up conversion).
    posture_root = bpy.data.objects.new("PostureRoot", None)
    bpy.context.scene.collection.objects.link(posture_root)
    arm.parent = posture_root
    arm.matrix_parent_inverse = posture_root.matrix_world.inverted()

    # Drop the mocap actions: they are walk/jog/jump and we author our own.
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    if arm.animation_data:
        arm.animation_data_clear()

    # Hide every existing mesh in the biomech file (skeleton, viscera). We only
    # want our muscles plus the bones we deliberately keep as context.
    keep_bones = []
    for o in list(bpy.data.objects):
        if o.type == 'MESH':
            o.hide_viewport = True
            o.hide_render = True

    # Append the muscles we need.
    wanted = []
    for mid, bases in mapping.items():
        for base in bases:
            for side in ("l", "r"):
                wanted.append(f"{base}.{side}")
            wanted.append(base)
    log(f"appending up to {len(wanted)} source meshes from Z-Anatomy")
    appended = append_muscles(args.anatomy, wanted)
    by_name = {o.name: o for o in appended}
    log(f"appended {len(appended)}")

    # Join per muscle per side and rename to the Mobilis id.
    built = {}
    missing = []
    for mid, bases in mapping.items():
        for side in ("l", "r"):
            parts = [by_name[f"{b}.{side}"] for b in bases if f"{b}.{side}" in by_name]
            if not parts:
                missing.append(f"{mid}__{side}")
                continue
            for p in parts:
                ensure_linked(p)
                if p.data.users > 1:
                    p.data = p.data.copy()
            clear_selection()
            for p in parts:
                p.select_set(True)
            bpy.context.view_layer.objects.active = parts[0]
            if len(parts) > 1:
                bpy.ops.object.join()
            obj = bpy.context.view_layer.objects.active
            name = f"{mid}__{side}"
            obj.name = name
            obj.data.name = name
            clean_mesh(obj)
            before, after = decimate(obj, args.budget)
            built[name] = obj
            log(f"  {name:34} {len(parts)} part(s)  {before:>6} -> {after:>5} tris")

    if missing:
        log(f"WARNING missing: {', '.join(missing)}")

    # Bind everything to the rig with automatic weights.
    log(f"binding {len(built)} meshes origin->insertion (deterministic two-bone)")
    report = bind_muscles(arm, built, attachments)
    log(f"bound {len(report)} meshes")

    def is_weighted(o):
        """A mesh can HAVE vertex groups yet have zero weighted vertices --
        auto-weights used to create the groups then assign nothing, and the
        glTF exporter dropped the skin silently. Count real weights."""
        if not o.vertex_groups:
            return False
        for v in o.data.vertices:
            for g in v.groups:
                if g.weight > 0.0001:
                    return True
        return False

    # No fallback path any more. Two-bone binding is deterministic: every
    # muscle has an explicit origin and insertion bone in attachments.json, and
    # every vertex gets a weight. If something is unweighted the map is wrong
    # and the build must fail loudly rather than ship a frozen muscle.
    fixed = []
    unb = [n for n, o in built.items() if not is_weighted(o)]
    if unb:
        sys.exit(f"unweighted meshes (attachments.json is wrong): {', '.join(unb)}")
    bound = len(built)
    log(f"bound {bound}/{len(built)} meshes, all with real weights")
    # Author the clips.
    log(f"authoring {len(clipspec)} clips")
    log(f"  postures available: {', '.join(sorted(postures))}")
    clip_info = []
    for name, spec in clipspec.items():
        info = build_clip(arm, name, spec, postures, built)
        clip_info.append(info)
        flag = "" if not info["missing_bones"] else f"  (missing: {', '.join(info['missing_bones'][:3])})"
        log(f"  {name:22} {info['tracks_applied']:2} tracks, {info['frames']:3}f, "
            f"{info['baked_channels']:3} channels (dropped {info['dropped_channels']}){flag}")

    # STRIP ALL POSE CONSTRAINTS BEFORE EXPORT.
    #
    # Every clip was baked with visual_keying and clear_constraints, so each
    # action already carries the fully resolved world pose of every bone,
    # vertebrae included. Constraints are restored after each bake only so the
    # next clip can be authored against a connected rig. Live at export time
    # they apply a second time on top of the baked result -- the doubled
    # rotation again. glTF has no concept of a constraint, so removing them
    # here loses nothing: the motion they produced is already keyed.
    log(f"stripped {_strip_constraints(arm)} pose constraints before export "
        f"(their effect is already baked into every action)")

    # Export: armature + skinned muscles + all NLA actions.
    clear_selection()
    ensure_linked(arm)
    arm.select_set(True)
    for o in built.values():
        ensure_linked(o)
        o.select_set(True)
    pr = bpy.data.objects.get("PostureRoot")
    if pr:
        ensure_linked(pr)
        pr.select_set(True)
    bpy.context.view_layer.objects.active = arm

    path = os.path.join(args.out, "animated.glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        use_selection=True,
        export_format="GLB",
        export_materials="NONE",
        export_normals=True,
        export_skins=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        # Without these the exporter samples EVERY bone on EVERY frame for
        # EVERY clip: 237 bones x 3 paths = 711 channels per clip, 26 clips.
        # We author a handful of joint angles, so only those should ship.
        export_bake_animation=False,
        export_force_sampling=False,
        export_optimize_animation_size=True,
        # Defaults to True, which KEEPS every armature bone channel even when
        # the bone never moves in that clip. That is what produced 711
        # channels per clip. Off = only channels we actually keyframed.
        export_optimize_animation_keep_anim_armature=False,
        export_anim_single_armature=True,
        export_apply=False,
    )
    size = os.path.getsize(path)
    log(f"exported animated.glb  {size/1048576:.1f} MB")

    manifest = {
        "source": "Z-Anatomy + Z-Biomechanics, CC BY-SA 4.0",
        "file": "animated.glb",
        "bytes": size,
        "muscles": sorted({n.rsplit('__', 1)[0] for n in built}),
        "meshes": sorted(built),
        "missing": missing,
        "bound": bound,
        "rigid_fallback": fixed,
        "attachments": {m: {"origin": a["origin"], "insertion": a["insertion"]}
                        for m, a in attachments.items()},
        "postures": sorted(postures),
        "clips": clip_info,
    }
    with open(os.path.join(args.out, "animated_manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    log(f"done. {len(built)} skinned meshes, {len(clip_info)} clips.")


if __name__ == "__main__":
    main()
