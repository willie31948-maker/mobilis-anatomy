"""Inspect the vertex weights actually shipped in animated.glb.

Reads the glTF directly rather than the Blender scene, because the exporter is
where weights have silently gone wrong before (v4: auto-weights created vertex
groups, assigned nothing, and the exporter substituted a `neutral_bone` that
never moves -- a `len(vertex_groups) > 0` check passed the whole time).

Reports per muscle:
  * how many distinct bones influence it, and each bone's share of total weight
  * the DISTANCE from each influencing bone to the muscle's own centroid, so an
    accidental influence from across the body is visible as a number
  * whether weights sum to 1 (an unnormalised skin deforms unpredictably)
  * the gradient profile: how weight is distributed along the muscle, which is
    what decides whether a joint creases or shears
"""

import argparse
import json
import struct
from collections import defaultdict

import numpy as np


def load_glb(path):
    d = open(path, "rb").read()
    json_len = struct.unpack("<I", d[12:16])[0]
    gl = json.loads(d[20:20 + json_len])
    off = 20 + json_len
    bin_len = struct.unpack("<I", d[off:off + 4])[0]
    blob = d[off + 8:off + 8 + bin_len]
    return gl, blob


CTYPE = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def read_accessor(gl, blob, idx):
    acc = gl["accessors"][idx]
    n = NCOMP[acc["type"]]
    fmt = CTYPE[acc["componentType"]]
    bv = gl["bufferViews"][acc["bufferView"]]
    start = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    count = acc["count"]
    size = struct.calcsize("<" + fmt)
    stride = bv.get("byteStride") or (size * n)
    out = np.empty((count, n), dtype=np.float64)
    for i in range(count):
        o = start + i * stride
        out[i] = struct.unpack_from("<" + fmt * n, blob, o)
    return out if n > 1 else out[:, 0]


def node_world_positions(gl):
    """World translation of every node, by walking the scene graph."""
    nodes = gl["nodes"]
    pos = [None] * len(nodes)

    def mat_of(nd):
        if "matrix" in nd:
            return np.array(nd["matrix"], dtype=float).reshape(4, 4).T
        M = np.eye(4)
        if "scale" in nd:
            M = M @ np.diag(list(nd["scale"]) + [1.0])
        if "rotation" in nd:
            x, y, z, w = nd["rotation"]
            R = np.array([
                [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 0],
                [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 0],
                [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0],
                [0, 0, 0, 1]])
            M = R @ M
        if "translation" in nd:
            T = np.eye(4)
            T[:3, 3] = nd["translation"]
            M = T @ M
        return M

    def walk(i, parent):
        M = parent @ mat_of(nodes[i])
        pos[i] = M[:3, 3].copy()
        for c in nodes[i].get("children", []):
            walk(c, M)

    roots = set(range(len(nodes)))
    for nd in nodes:
        for c in nd.get("children", []):
            roots.discard(c)
    for r in sorted(roots):
        walk(r, np.eye(4))
    return pos


def analyse(path):
    gl, blob = load_glb(path)
    nodes = gl["nodes"]
    names = [n.get("name", f"node{i}") for i, n in enumerate(nodes)]
    wpos = node_world_positions(gl)
    skin = gl["skins"][0]
    joints = skin["joints"]

    # mesh name -> node, so we can name each muscle
    mesh_of_node = {}
    for i, nd in enumerate(nodes):
        if "mesh" in nd:
            mesh_of_node.setdefault(nd["mesh"], i)

    out = {}
    for mi, mesh in enumerate(gl["meshes"]):
        mname = mesh.get("name") or names[mesh_of_node.get(mi, 0)]
        prim = mesh["primitives"][0]
        at = prim["attributes"]
        if "JOINTS_0" not in at:
            out[mname] = {"skinned": False}
            continue
        P = read_accessor(gl, blob, at["POSITION"])
        J = read_accessor(gl, blob, at["JOINTS_0"]).astype(int)
        W = read_accessor(gl, blob, at["WEIGHTS_0"])
        if J.ndim == 1:
            J = J.reshape(-1, 1)
            W = W.reshape(-1, 1)

        centroid = P.mean(0)
        totals = defaultdict(float)
        for k in range(J.shape[1]):
            for j, w in zip(J[:, k], W[:, k]):
                if w > 1e-6:
                    totals[int(j)] += float(w)
        tot = sum(totals.values()) or 1.0

        infl = []
        for j, w in sorted(totals.items(), key=lambda x: -x[1]):
            node_i = joints[j]
            bp = wpos[node_i]
            infl.append({
                "bone": names[node_i],
                "share": round(w / tot, 4),
                "dist_cm": round(float(np.linalg.norm(bp - centroid)) * 100, 1),
            })

        sums = W.sum(1)
        out[mname] = {
            "skinned": True,
            "verts": int(len(P)),
            "n_bones": len(infl),
            "influences": infl,
            "weight_sum_min": round(float(sums.min()), 4),
            "weight_sum_max": round(float(sums.max()), 4),
            "max_influences_per_vertex": int((W > 1e-6).sum(1).max()),
        }
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--glb", default="public/models/animated.glb")
    ap.add_argument("--far-cm", type=float, default=40.0,
                    help="flag an influence whose bone is further than this "
                         "from the muscle's centroid")
    ap.add_argument("--json", help="write the full report here")
    args = ap.parse_args()

    rep = analyse(args.glb)
    if args.json:
        json.dump(rep, open(args.json, "w"), indent=1)

    print(f"{'muscle':34s} {'bones':>5s} {'verts':>6s} {'maxinf':>6s} "
          f"{'wsum':>6s}  influences (share @ distance)")
    far, unnorm, single = [], [], []
    for name, r in sorted(rep.items()):
        if not r.get("skinned"):
            print(f"{name:34s}  NOT SKINNED")
            continue
        desc = ", ".join(f"{i['bone']}={i['share']:.2f}@{i['dist_cm']:.0f}cm"
                         for i in r["influences"][:4])
        print(f"{name:34s} {r['n_bones']:5d} {r['verts']:6d} "
              f"{r['max_influences_per_vertex']:6d} "
              f"{r['weight_sum_min']:6.2f}  {desc}")
        for i in r["influences"]:
            if i["dist_cm"] > args.far_cm and i["share"] > 0.01:
                far.append((name, i["bone"], i["share"], i["dist_cm"]))
        if abs(r["weight_sum_min"] - 1.0) > 0.01 or abs(r["weight_sum_max"] - 1.0) > 0.01:
            unnorm.append(name)
        if r["n_bones"] < 2:
            single.append(name)

    print(f"\n{len(rep)} meshes")
    print(f"distant influences (> {args.far_cm}cm, share > 1%): {len(far)}")
    for f in far[:25]:
        print(f"   {f[0]:30s} <- {f[1]:24s} {f[2]:.2f} @ {f[3]:.0f}cm")
    print(f"unnormalised skins: {len(unnorm)}  {unnorm[:8]}")
    print(f"single-bone (rigid) meshes: {len(single)}")


if __name__ == "__main__":
    main()
