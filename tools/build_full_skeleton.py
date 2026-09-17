#!/usr/bin/env python3
"""
Builds the complete human skeletal system for the 3D anatomical viewer.
Extracts skeletal geometries from public/squat_sync.glb, transforms them to the
standard anatomical body coordinate space, joins them into clean anatomical groups
(skull, spine, ribcage, sternum, pelvis, arm bones, hand bones, leg bones, foot bones),
and packages them into a production-grade binary glTF (public/models/context.glb).
Also updates tools/muscle_map.json and public/models/manifest.json.
"""

import json
import os
import struct
import math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQUAT_SYNC_PATH = os.path.join(ROOT, 'public', 'squat_sync.glb')
CONTEXT_PATH = os.path.join(ROOT, 'public', 'models', 'context.glb')
MANIFEST_PATH = os.path.join(ROOT, 'public', 'models', 'manifest.json')
MAP_PATH = os.path.join(ROOT, 'tools', 'muscle_map.json')

# Offset from squat_sync root translation to static model space
OFFSET = [-0.003806300926953554, 1.0941269397735596, 0.014020601287484169]

def quat_rotate(q, v):
    qx, qy, qz, qw = q
    vx, vy, vz = v
    cx = qy * vz - qz * vy
    cy = qz * vx - qx * vz
    cz = qx * vy - qy * vx
    ccx = qy * cz - qz * cy
    ccy = qz * cx - qx * cz
    ccz = qx * cy - qy * cx
    return [
        vx + 2.0 * (qw * cx + ccx),
        vy + 2.0 * (qw * cy + ccy),
        vz + 2.0 * (qw * cz + ccz)
    ]

def normalize(v):
    l = math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2])
    if l == 0:
        return [0.0, 1.0, 0.0]
    return [v[0]/l, v[1]/l, v[2]/l]

def parse_glb(filepath):
    with open(filepath, 'rb') as f:
        f.read(12)
        chunk_len = int.from_bytes(f.read(4), 'little')
        f.read(4) # JSON
        gltf = json.loads(f.read(chunk_len).decode('utf-8'))
        bin_len = int.from_bytes(f.read(4), 'little')
        f.read(4) # BIN
        bin_data = f.read(bin_len)
    return gltf, bin_data

def extract_primitive_data(gltf, bin_data, prim):
    # POSITION
    pos_acc = gltf['accessors'][prim['attributes']['POSITION']]
    pos_bv = gltf['bufferViews'][pos_acc['bufferView']]
    pos_off = pos_bv.get('byteOffset', 0) + pos_acc.get('byteOffset', 0)
    pos_stride = pos_bv.get('byteStride', 12)
    positions = []
    for i in range(pos_acc['count']):
        off = pos_off + i * pos_stride
        positions.append(list(struct.unpack('<3f', bin_data[off:off+12])))

    # NORMAL
    normals = []
    if 'NORMAL' in prim['attributes']:
        norm_acc = gltf['accessors'][prim['attributes']['NORMAL']]
        norm_bv = gltf['bufferViews'][norm_acc['bufferView']]
        norm_off = norm_bv.get('byteOffset', 0) + norm_acc.get('byteOffset', 0)
        norm_stride = norm_bv.get('byteStride', 12)
        for i in range(norm_acc['count']):
            off = norm_off + i * norm_stride
            normals.append(list(struct.unpack('<3f', bin_data[off:off+12])))

    # INDICES
    indices = []
    if 'indices' in prim:
        idx_acc = gltf['accessors'][prim['indices']]
        idx_bv = gltf['bufferViews'][idx_acc['bufferView']]
        idx_off = idx_bv.get('byteOffset', 0) + idx_acc.get('byteOffset', 0)
        comp_type = idx_acc['componentType']
        if comp_type == 5123: # UNSIGNED_SHORT
            fmt, size = '<H', 2
        elif comp_type == 5125: # UNSIGNED_INT
            fmt, size = '<I', 4
        elif comp_type == 5121: # UNSIGNED_BYTE
            fmt, size = '<B', 1
        else:
            raise ValueError(f"Unsupported index componentType: {comp_type}")
        stride = idx_bv.get('byteStride', size)
        for i in range(idx_acc['count']):
            off = idx_off + i * stride
            indices.append(struct.unpack(fmt, bin_data[off:off+size])[0])
    return positions, normals, indices

def build_full_skeleton():
    print("Reading squat_sync.glb and existing context.glb...")
    sync_gltf, sync_bin = parse_glb(SQUAT_SYNC_PATH)
    ctx_gltf, ctx_bin = parse_glb(CONTEXT_PATH)

    # 1. Extract existing 7 context meshes (skull, arm bones, hand bones)
    mesh_groups = {}
    
    # We only want to preserve the ORIGINAL context meshes, discarding any 
    # previously generated spine/ribcage/etc so we can rebuild them cleanly.
    original_groups = ['bone__skull__c', 'bone__skull__l', 'bone__skull__r', 
                       'bone__arm_bones__l', 'bone__arm_bones__r', 
                       'bone__hand_bones__l', 'bone__hand_bones__r']
                       
    for node in ctx_gltf['nodes']:
        name = node['name']
        if name not in original_groups:
            continue
            
        m_idx = node['mesh']
        prim = ctx_gltf['meshes'][m_idx]['primitives'][0]
        positions, normals, indices = extract_primitive_data(ctx_gltf, ctx_bin, prim)
        t = node.get('translation', [0, 0, 0])
        r = node.get('rotation', [0, 0, 0, 1])
        s = node.get('scale', [1, 1, 1])

        transformed_pos = []
        transformed_norm = []
        for v in positions:
            p = [v[0] * s[0], v[1] * s[1], v[2] * s[2]]
            if r and r != [0, 0, 0, 1]:
                p = quat_rotate(r, p)
            transformed_pos.append([p[0] + t[0], p[1] + t[1], p[2] + t[2]])

        for n in normals:
            p = [n[0], n[1], n[2]]
            if r and r != [0, 0, 0, 1]:
                p = quat_rotate(r, p)
            transformed_norm.append(normalize(p))

        mesh_groups[name] = {
            'positions': transformed_pos,
            'normals': transformed_norm,
            'indices': indices
        }
        print(f"Preserved existing context: {name:24} ({len(transformed_pos)} verts, {len(indices)//3} tris)")

    # 2. Categorize and extract bones from squat_sync.glb
    def categorize_node(name):
        lower = name.lower()
        
        # Prevent "intervertebral" from triggering the "vertebra" match
        if 'disc' in lower or 'nucleus' in lower:
            return None, None
            
        side = 'l' if name.endswith('.l') else ('r' if name.endswith('.r') else 'c')
        if any(k in lower for k in ['vertebra', 'sacrum', 'coccyx']):
            return 'spine', 'c'
        if any(k in lower for k in ['rib', 'costal cartilage']):
            return 'ribcage', side
        if any(k in lower for k in ['sternum', 'xiphoid']):
            return 'sternum', 'c'
        if 'hip bone' in lower:
            return 'pelvis', side
        if any(k in lower for k in ['femur', 'patella', 'tibia', 'fibula']):
            return 'leg_bones', side
        if any(k in lower for k in ['calcaneus', 'cuboid', 'cuneiform', 'metatarsal', 'navicular', 'talus', 'sesamoid']) or ('phalanx' in lower and 'foot' in lower):
            return 'foot_bones', side
        return None, None

    new_groups = {
        'bone__spine__c': {'group': 'spine', 'positions': [], 'normals': [], 'indices': []},
        'bone__ribcage__l': {'group': 'ribcage', 'positions': [], 'normals': [], 'indices': []},
        'bone__ribcage__r': {'group': 'ribcage', 'positions': [], 'normals': [], 'indices': []},
        'bone__sternum__c': {'group': 'sternum', 'positions': [], 'normals': [], 'indices': []},
        'bone__pelvis__l': {'group': 'pelvis', 'positions': [], 'normals': [], 'indices': []},
        'bone__pelvis__r': {'group': 'pelvis', 'positions': [], 'normals': [], 'indices': []},
        'bone__leg_bones__l': {'group': 'leg_bones', 'positions': [], 'normals': [], 'indices': []},
        'bone__leg_bones__r': {'group': 'leg_bones', 'positions': [], 'normals': [], 'indices': []},
        'bone__foot_bones__l': {'group': 'foot_bones', 'positions': [], 'normals': [], 'indices': []},
        'bone__foot_bones__r': {'group': 'foot_bones', 'positions': [], 'normals': [], 'indices': []}
    }

    nodes = sync_gltf['nodes']
    for i in range(99, len(nodes)):
        node = nodes[i]
        node_name = node['name']
        group_name, side = categorize_node(node_name)
        if not group_name:
            continue

        target_mesh_name = f"bone__{group_name}__{side}"
        if target_mesh_name not in new_groups:
            continue

        m_idx = node.get('mesh')
        if m_idx is None:
            continue

        prim = sync_gltf['meshes'][m_idx]['primitives'][0]
        positions, normals, indices = extract_primitive_data(sync_gltf, sync_bin, prim)

        t = node.get('translation', [0, 0, 0])
        r = node.get('rotation', [0, 0, 0, 1])
        s = node.get('scale', [1, 1, 1])

        # If determinant < 0, swap triangle winding
        det = s[0] * s[1] * s[2]
        reverse_winding = (det < 0)

        # Transform positions
        transformed_pos = []
        for v in positions:
            p = [v[0] * s[0], v[1] * s[1], v[2] * s[2]]
            if r and r != [0, 0, 0, 1]:
                p = quat_rotate(r, p)
            transformed_pos.append([
                p[0] + t[0] + OFFSET[0],
                p[1] + t[1] + OFFSET[1],
                p[2] + t[2] + OFFSET[2]
            ])

        # Transform normals
        transformed_norm = []
        for n in normals:
            # Scale inverse for normal
            inv_s = [1.0/s[0] if s[0] != 0 else 1.0,
                     1.0/s[1] if s[1] != 0 else 1.0,
                     1.0/s[2] if s[2] != 0 else 1.0]
            p = [n[0] * inv_s[0], n[1] * inv_s[1], n[2] * inv_s[2]]
            if r and r != [0, 0, 0, 1]:
                p = quat_rotate(r, p)
            transformed_norm.append(normalize(p))

        # Append to group
        target = new_groups[target_mesh_name]
        vert_offset = len(target['positions'])
        target['positions'].extend(transformed_pos)
        target['normals'].extend(transformed_norm)

        for tri_idx in range(0, len(indices), 3):
            i0 = indices[tri_idx] + vert_offset
            i1 = indices[tri_idx + 1] + vert_offset
            i2 = indices[tri_idx + 2] + vert_offset
            if reverse_winding:
                target['indices'].extend([i1, i0, i2])
            else:
                target['indices'].extend([i0, i1, i2])

    for name, data in new_groups.items():
        print(f"Extracted new skeletal group: {name:24} ({len(data['positions'])} verts, {len(data['indices'])//3} tris)")
        mesh_groups[name] = {
            'positions': data['positions'],
            'normals': data['normals'],
            'indices': data['indices'],
            'group': data['group']
        }

    # 3. Assemble binary glTF (.glb)
    print("\nPacking all 17 skeletal groups into context.glb...")
    out_nodes = []
    out_meshes = []
    out_accessors = []
    out_buffer_views = []
    bin_chunks = []
    curr_offset = 0

    mesh_order = sorted(mesh_groups.keys())
    for mesh_idx, name in enumerate(mesh_order):
        m = mesh_groups[name]
        pos_list = m['positions']
        norm_list = m['normals']
        idx_list = m['indices']

        min_pos = [min(p[c] for p in pos_list) for c in range(3)]
        max_pos = [max(p[c] for p in pos_list) for c in range(3)]

        # Pack positions (VEC3, FLOAT)
        pos_bytes = bytearray()
        for p in pos_list:
            pos_bytes.extend(struct.pack('<3f', p[0], p[1], p[2]))
        # 4-byte align
        while len(pos_bytes) % 4 != 0:
            pos_bytes.append(0)

        pos_bv_idx = len(out_buffer_views)
        out_buffer_views.append({
            'buffer': 0,
            'byteOffset': curr_offset,
            'byteLength': len(pos_bytes),
            'target': 34962 # ARRAY_BUFFER
        })
        curr_offset += len(pos_bytes)
        bin_chunks.append(pos_bytes)

        pos_acc_idx = len(out_accessors)
        out_accessors.append({
            'bufferView': pos_bv_idx,
            'byteOffset': 0,
            'componentType': 5126, # FLOAT
            'count': len(pos_list),
            'type': 'VEC3',
            'min': min_pos,
            'max': max_pos
        })

        # Pack normals (VEC3, FLOAT)
        norm_bytes = bytearray()
        for n in norm_list:
            norm_bytes.extend(struct.pack('<3f', n[0], n[1], n[2]))
        while len(norm_bytes) % 4 != 0:
            norm_bytes.append(0)

        norm_bv_idx = len(out_buffer_views)
        out_buffer_views.append({
            'buffer': 0,
            'byteOffset': curr_offset,
            'byteLength': len(norm_bytes),
            'target': 34962 # ARRAY_BUFFER
        })
        curr_offset += len(norm_bytes)
        bin_chunks.append(norm_bytes)

        norm_acc_idx = len(out_accessors)
        out_accessors.append({
            'bufferView': norm_bv_idx,
            'byteOffset': 0,
            'componentType': 5126, # FLOAT
            'count': len(norm_list),
            'type': 'VEC3'
        })

        # Pack indices (SCALAR, UNSIGNED_INT or UNSIGNED_SHORT)
        idx_bytes = bytearray()
        max_idx = max(idx_list) if idx_list else 0
        use_uint32 = (max_idx > 65535) or (len(pos_list) > 65535)

        if use_uint32:
            comp_type = 5125 # UNSIGNED_INT
            for idx in idx_list:
                idx_bytes.extend(struct.pack('<I', idx))
        else:
            comp_type = 5123 # UNSIGNED_SHORT
            for idx in idx_list:
                idx_bytes.extend(struct.pack('<H', idx))

        while len(idx_bytes) % 4 != 0:
            idx_bytes.append(0)

        idx_bv_idx = len(out_buffer_views)
        out_buffer_views.append({
            'buffer': 0,
            'byteOffset': curr_offset,
            'byteLength': len(idx_bytes),
            'target': 34963 # ELEMENT_ARRAY_BUFFER
        })
        curr_offset += len(idx_bytes)
        bin_chunks.append(idx_bytes)

        idx_acc_idx = len(out_accessors)
        out_accessors.append({
            'bufferView': idx_bv_idx,
            'byteOffset': 0,
            'componentType': comp_type,
            'count': len(idx_list),
            'type': 'SCALAR'
        })

        # Mesh & node
        out_meshes.append({
            'name': name,
            'primitives': [{
                'attributes': {
                    'POSITION': pos_acc_idx,
                    'NORMAL': norm_acc_idx
                },
                'indices': idx_acc_idx
            }]
        })

        out_nodes.append({
            'name': name,
            'mesh': mesh_idx
        })

    bin_data = b"".join(bin_chunks)
    out_gltf = {
        'asset': {'generator': 'AnatomyFullSkeletonBuilder', 'version': '2.0'},
        'scene': 0,
        'scenes': [{'name': 'Scene', 'nodes': list(range(len(out_nodes)))}],
        'nodes': out_nodes,
        'meshes': out_meshes,
        'accessors': out_accessors,
        'bufferViews': out_buffer_views,
        'buffers': [{'byteLength': len(bin_data)}]
    }

    json_bytes = json.dumps(out_gltf, separators=(',', ':')).encode('utf-8')
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '

    glb_len = 12 + 8 + len(json_bytes) + 8 + len(bin_data)
    with open(CONTEXT_PATH, 'wb') as f:
        # Header
        f.write(struct.pack('<4sII', b'glTF', 2, glb_len))
        # Chunk 0: JSON
        f.write(struct.pack('<I4s', len(json_bytes), b'JSON'))
        f.write(json_bytes)
        # Chunk 1: BIN
        f.write(struct.pack('<I4s', len(bin_data), b'BIN\0'))
        f.write(bin_data)

    context_size = os.path.getsize(CONTEXT_PATH)
    print(f"Successfully generated full skeleton context.glb: {context_size / 1048576:.2f} MB ({len(out_nodes)} meshes)")

    # 4. Update tools/muscle_map.json context definition
    with open(MAP_PATH, 'r') as f:
        mmap = json.load(f)

    mmap['context'] = {
        "_comment": "Full skeletal anatomy rendered as inert pale geometry so the entire body reads with structural fidelity. Not clickable, not assessable — pure visual context.",
        "skull": [
            "Frontal bone", "Parietal bone", "Occipital bone", "Temporal bone",
            "Mandible", "Maxilla", "Nasal bone", "Zygomatic bone", "Hyoid bone"
        ],
        "spine": [
            "Vertebra C3", "Vertebra C4", "Vertebra C5", "Vertebra C6", "Vertebra C7",
            "Vertebra T1", "Vertebra T2", "Vertebra T3", "Vertebra T4", "Vertebra T5",
            "Vertebra T6", "Vertebra T7", "Vertebra T8", "Vertebra T9", "Vertebra T10",
            "Vertebra T11", "Vertebra T12", "Vertebra L1", "Vertebra L2", "Vertebra L3",
            "Vertebra L4", "Vertebra L5", "Sacrum", "Coccyx"
        ],
        "ribcage": [
            "First rib", "Second rib", "Third rib", "Fourth rib", "Fifth rib",
            "Sixth rib", "Seventh rib", "Eighth rib", "Ninth rib", "Tenth rib",
            "Eleventh rib", "Twelfth rib", "Costal cartilage of first rib",
            "Costal cartilage of second rib", "Costal cartilage of third rib",
            "Costal cartilage of fourth rib", "Costal cartilage of fifth rib",
            "Costal cartilage of sixth rib", "Costal cartilage of seventh rib",
            "Costal cartilage of eighth rib", "Costal cartilage of ninth rib",
            "Costal cartilage of tenth rib"
        ],
        "sternum": [
            "Manubrium of sternum", "Body of sternum", "Xiphoid process"
        ],
        "pelvis": [
            "Hip bone"
        ],
        "arm_bones": [
            "Humerus", "Radius", "Ulna", "Scapula", "Clavicle"
        ],
        "hand_bones": [
            "Scaphoid bone", "Lunate bone", "Triquetrum bone", "Pisiform bone",
            "Trapezium bone", "Trapezoid bone", "Capitate bone", "Hamate bone",
            "First metacarpal bone", "Second metacarpal bone", "Third metacarpal bone",
            "Fourth metacarpal bone", "Fifth metacarpal bone",
            "Proximal phalanx of first finger of hand", "Distal phalanx of first finger of hand",
            "Proximal phalanx of second finger of hand", "Middle phalanx of second finger of hand", "Distal phalanx of second finger of hand",
            "Proximal phalanx of third finger of hand", "Middle phalanx of third finger of hand", "Distal phalanx of third finger of hand",
            "Proximal phalanx of fourth finger of hand", "Middle phalanx of fourth finger of hand", "Distal phalanx of fourth finger of hand",
            "Proximal phalanx of fifth finger of hand", "Middle phalanx of fifth finger of hand", "Distal phalanx of fifth finger of hand"
        ],
        "leg_bones": [
            "Femur", "Patella", "Tibia", "Fibula"
        ],
        "foot_bones": [
            "Calcaneus", "Talus", "Navicular bone", "Cuboid bone",
            "Medial cuneiform bone", "Intermediate cuneiform bone", "Lateral cuneiform bone",
            "First metatarsal bone", "Second metatarsal bone", "Third metatarsal bone",
            "Fourth metatarsal bone", "Fifth metatarsal bone",
            "Proximal phalanx of first finger of foot", "Distal phalanx of first finger of foot",
            "Proximal phalanx of second finger of foot", "Middle phalanx of second finger of foot", "Distal phalanx of second finger of foot",
            "Proximal phalanx of third finger of foot", "Middle phalanx of third finger of foot", "Distal phalanx of third finger of foot",
            "Proximal phalanx of fourth finger of foot", "Middle phalanx of fourth finger of foot", "Distal phalanx of fourth finger of foot",
            "Proximal phalanx of fifth finger of foot", "Middle phalanx of fifth finger of foot", "Distal phalanx of fifth finger of foot",
            "Sesamoid bones of foot"
        ]
    }
    with open(MAP_PATH, 'w') as f:
        json.dump(mmap, f, indent=2)
    print("Updated tools/muscle_map.json")

    # 5. Update public/models/manifest.json
    with open(MANIFEST_PATH, 'r') as f:
        manifest = json.load(f)

    ctx_manifest = {}
    for name in mesh_order:
        data = mesh_groups[name]
        grp = data.get('group')
        if not grp:
            # derive group from name: bone__<group>__<side>
            parts = name.split('__')
            grp = parts[1] if len(parts) > 1 else 'skeleton'
        ctx_manifest[name] = {
            "group": grp,
            "tris_before": len(data['indices']) // 3,
            "tris_after": len(data['indices']) // 3
        }

    manifest['context'] = ctx_manifest
    manifest['regions']['context'] = {
        "file": "context.glb",
        "bytes": context_size,
        "meshes": mesh_order
    }
    with open(MANIFEST_PATH, 'w') as f:
        json.dump(manifest, f, indent=2)
    print("Updated public/models/manifest.json")

if __name__ == '__main__':
    build_full_skeleton()
