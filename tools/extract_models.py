#!/usr/bin/env python3
"""
Extract Mobilis muscle meshes from the Z-Anatomy Blender file and export glTF.

Run:
    pip install bpy
    python3 tools/extract_models.py --blend /path/to/Z-Anatomy/Startup.blend \
        --out public/models --budget 4000

What it does, and why each step exists:

1. Opens the Z-Anatomy .blend (~300 MB, 4,569 named meshes).
2. For each Mobilis muscle id, finds its component meshes via tools/muscle_map.json
   and joins them into ONE object per side.
3. Renames that object to the exact Mobilis muscle id ("gluteus_medius__l").
   The double-underscore side separator is deliberate: the glTF exporter strips
   "." from object names, so a "gluteus_medius.l" mesh arrives in the browser as
   "gluteus_mediusl" and the id can no longer be recovered. Underscores survive.
   This is the critical step: it makes the 3D asset speak the engine's language,
   so clicking a mesh yields a muscle id directly and no lookup table is needed
   at runtime.
4. Decimates to a triangle budget. Anatomical meshes are far denser than the web
   needs and anatomy is smooth, so the visual cost is small and the load-time
   win is large.
5. Exports one .glb per body region, so the app streams only what is on screen.

Design note: this script is the ONLY coupling between the 3D asset and the app.
The reasoning engine never learns that Z-Anatomy exists. To switch to different
models later, rewrite muscle_map.json and rerun — no application code changes.
"""

import argparse
import json
import os
import sys

try:
    import bpy
except ImportError:
    sys.exit("bpy not available. Install with: pip install bpy")

# Which muscles ship in which region file. Keeps each download small.
REGIONS = {
    "hip":      ["iliopsoas", "gluteus_maximus", "gluteus_medius", "tfl", "adductor_group", "piriformis"],
    "thigh":    ["hamstrings", "rectus_femoris", "quadriceps"],
    "trunk":    ["erector_spinae", "multifidus", "transversus_abdominis", "quadratus_lumborum", "rectus_abdominis"],
    "shoulder": ["pectoralis_major", "pectoralis_minor", "rhomboids", "lower_trapezius",
                 "serratus_anterior", "rotator_cuff", "latissimus_dorsi", "deltoid"],
    "neck":     ["upper_trapezius", "levator_scapulae", "deep_neck_flexors", "suboccipitals",
                 "sternocleidomastoid", "scalenes", "splenius"],
    "lowerleg": ["gastrocnemius", "soleus", "tibialis_anterior", "tibialis_posterior", "peroneals"],
    "arm":      ["biceps_brachii", "triceps_brachii", "brachialis", "brachioradialis"],
    "forearm":  ["wrist_extensors", "wrist_flexors", "finger_flexors", "finger_extensors",
                 "pronators", "supinator"],
    "hand":     ["hand_intrinsics"],
    "jaw":      ["masseter", "temporalis", "pterygoids", "digastric"],
}

# Skeletal context. Rendered as inert pale bone so the arms, hands and head read
# as a body rather than muscles floating in space. These are NOT clickable and
# NOT assessable -- they carry no clinical meaning, so they are exported into a
# separate file the viewer treats differently. Keeping them out of REGIONS is
# what stops them ever being mistaken for an assessable structure.
CONTEXT_REGIONS = {
    "skull":      "skull",
    "arm_bones":  "arm_bones",
    "hand_bones": "hand_bones",
}


def log(*a):
    print("[extract]", *a, flush=True)


def ensure_linked(obj):
    """Z-Anatomy hides most meshes and nests them in collections that may not be
    in the active view layer. Operators only act on visible, linked, selectable
    objects, so link into the scene collection and unhide before touching it."""
    scene_col = bpy.context.scene.collection
    if obj.name not in scene_col.objects:
        try:
            scene_col.objects.link(obj)
        except RuntimeError:
            pass
    obj.hide_set(False)
    obj.hide_viewport = False
    obj.hide_select = False


def clear_selection():
    for o in bpy.context.view_layer.objects:
        try:
            o.select_set(False)
        except RuntimeError:
            pass
    bpy.context.view_layer.objects.active = None


def find_parts(base_names, side):
    """Collect the mesh objects composing one muscle on one side.

    Z-Anatomy suffixes: .l/.r are the left/right muscle bellies. .ol/.or and
    .el/.er mark origin/insertion footprints -- deliberately excluded, they are
    attachment decals rather than the muscle itself.
    """
    found = []
    for base in base_names:
        for suffix in (f".{side}", f" muscle.{side}"):
            name = base + suffix if not base.endswith("muscle") else base + f".{side}"
            obj = bpy.data.objects.get(name)
            if obj and obj.type == "MESH":
                found.append(obj)
                break
        else:
            # Fallback: case-insensitive prefix match on the exact side suffix.
            want = f".{side}"
            for o in bpy.data.objects:
                if o.type != "MESH":
                    continue
                if o.name.lower().startswith(base.lower()) and o.name.endswith(want):
                    # Skip origin/insertion decals and bursae/fascia.
                    lower = o.name.lower()
                    if any(k in lower for k in ("bursa", "fascia", "tendon sheath", "sheath")):
                        continue
                    found.append(o)
                    break
    return found


def join_and_rename(parts, new_name):
    clear_selection()
    for p in parts:
        ensure_linked(p)
        # Left/right meshes are linked duplicates sharing one mesh datablock.
        # Modifiers cannot be applied to multi-user data, so give each object
        # its own copy before we join or decimate it.
        if p.data.users > 1:
            p.data = p.data.copy()
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    if len(parts) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = new_name
    obj.data.name = new_name
    return obj


def decimate(obj, budget):
    """Reduce to a triangle budget. Returns (before, after)."""
    mesh = obj.data
    tris = sum(max(0, len(p.vertices) - 2) for p in mesh.polygons)
    if tris <= budget:
        return tris, tris
    ratio = max(0.02, budget / float(tris))
    clear_selection()
    ensure_linked(obj)
    if obj.data.users > 1:
        obj.data = obj.data.copy()
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new(name="dec", type="DECIMATE")
    mod.ratio = ratio
    bpy.ops.object.modifier_apply(modifier=mod.name)
    after = sum(max(0, len(p.vertices) - 2) for p in obj.data.polygons)
    return tris, after


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--blend", required=True)
    ap.add_argument("--map", default=os.path.join(os.path.dirname(__file__), "muscle_map.json"))
    ap.add_argument("--out", default="public/models")
    ap.add_argument("--budget", type=int, default=4000, help="triangles per muscle per side")
    args = ap.parse_args()

    _cfg = json.load(open(args.map))
    mapping = _cfg["map"]
    context = {k: v for k, v in _cfg.get("context", {}).items() if not k.startswith("_")}
    os.makedirs(args.out, exist_ok=True)

    log(f"opening {args.blend}")
    bpy.ops.wm.open_mainfile(filepath=args.blend)
    log(f"{len([o for o in bpy.data.objects if o.type=='MESH'])} meshes in file")

    built = {}
    missing = []
    for mid, bases in mapping.items():
        for side in ("l", "r"):
            parts = find_parts(bases, side)
            if not parts:
                missing.append(f"{mid}__{side}")
                continue
            name = f"{mid}__{side}"
            obj = join_and_rename(parts, name)
            before, after = decimate(obj, args.budget)
            built[name] = {"muscle": mid, "side": side, "tris_before": before, "tris_after": after}
            log(f"  {name:34} {len(parts)} part(s)  {before:>7} -> {after:>6} tris")

    if missing:
        log(f"WARNING: {len(missing)} not found: {', '.join(missing)}")

    # Skeletal context meshes. Same join/decimate treatment, but named with a
    # "bone__" prefix so the viewer can never confuse one with a muscle id.
    ctx_built = {}
    for group, bases in context.items():
        for side in ("l", "r", None):
            parts = []
            for base in bases:
                if side:
                    o = bpy.data.objects.get(f"{base}.{side}")
                else:
                    o = bpy.data.objects.get(base)
                if o and o.type == "MESH":
                    parts.append(o)
            if not parts:
                continue
            name = f"bone__{group}__{side or 'c'}"
            obj = join_and_rename(parts, name)
            before, after = decimate(obj, args.budget)
            ctx_built[name] = {"group": group, "tris_before": before, "tris_after": after}
            log(f"  {name:34} {len(parts)} part(s)  {before:>7} -> {after:>6} tris")

    # Export per region.
    manifest = {"source": "Z-Anatomy, CC BY-SA 4.0", "regions": {}, "muscles": built,
                "missing": missing, "context": ctx_built}
    for region, ids in REGIONS.items():
        names = [f"{m}__{s}" for m in ids for s in ("l", "r") if f"{m}__{s}" in built]
        if not names:
            continue
        clear_selection()
        for n in names:
            o = bpy.data.objects[n]
            ensure_linked(o)
            o.select_set(True)
        path = os.path.join(args.out, f"{region}.glb")
        bpy.ops.export_scene.gltf(
            filepath=path,
            use_selection=True,
            export_format="GLB",
            export_apply=True,
            export_materials="NONE",
            export_normals=True,
        )
        size = os.path.getsize(path)
        manifest["regions"][region] = {"file": f"{region}.glb", "bytes": size, "meshes": names}
        log(f"exported {region}.glb  {size/1048576:.1f} MB  ({len(names)} meshes)")

    if ctx_built:
        clear_selection()
        for n in ctx_built:
            o = bpy.data.objects[n]
            ensure_linked(o)
            o.select_set(True)
        path = os.path.join(args.out, "context.glb")
        bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format="GLB",
                                  export_apply=True, export_materials="NONE", export_normals=True)
        manifest["regions"]["context"] = {"file": "context.glb",
                                          "bytes": os.path.getsize(path),
                                          "meshes": list(ctx_built)}
        log(f"exported context.glb  {os.path.getsize(path)/1048576:.1f} MB  ({len(ctx_built)} meshes)")

    with open(os.path.join(args.out, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    log(f"done. {len(built)} meshes, {len(missing)} missing.")


if __name__ == "__main__":
    main()
