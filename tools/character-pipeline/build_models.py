"""
Refined Procedural 3D Modeling Pipeline for Satsuki Kusakabe and Totoro.
Executed via Blender 5.2 Python API (bpy, bmesh, mathutils).
Builds static seated meshes with origin at the bottom-center of the pelvis.
Exports pristine Collada .dae and saves .blend files.
"""

import bpy
import bmesh
import math
import os
import sys
from mathutils import Vector, Matrix, Euler

pipeline_dir = os.path.dirname(os.path.abspath(__file__))
if pipeline_dir not in sys.path:
    sys.path.insert(0, pipeline_dir)

from collada_writer import export_collada_dae

def reset_blender():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if not bpy.data.scenes:
        bpy.data.scenes.new("Scene")

def extract_mesh_for_collada(obj, swap_yz=True):
    """
    Extracts triangulated mesh data in centimeters.
    If swap_yz is True:
      Blender coordinate system: +X right, +Y forward, +Z up
      Collada Y_UP system: +X right, +Y up (Blender Z), +Z forward (Blender Y)
    """
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(obj.data)
    bm.free()

    mesh = obj.data
    mesh.calc_loop_triangles()

    uv_layer = mesh.uv_layers.active.data if mesh.uv_layers.active else None

    positions = []
    normals = []
    uvs = []

    for v in mesh.vertices:
        co = v.co
        if swap_yz:
            positions.append((float(co.x), float(co.z), float(co.y)))
        else:
            positions.append((float(co.x), float(co.y), float(co.z)))

    loop_normals = []
    loop_uvs = []
    tri_indices = []

    for tri in mesh.loop_triangles:
        tri_pts = []
        for loop_idx in tri.loops:
            loop = mesh.loops[loop_idx]
            vert_idx = loop.vertex_index
            norm = loop.normal
            if swap_yz:
                n_tuple = (float(norm.x), float(norm.z), float(norm.y))
            else:
                n_tuple = (float(norm.x), float(norm.y), float(norm.z))
            loop_normals.append(n_tuple)
            n_idx = len(loop_normals) - 1

            if uv_layer:
                uv_val = uv_layer[loop_idx].uv
                uv_tuple = (float(uv_val.x), float(uv_val.y))
            else:
                uv_tuple = (0.0, 0.0)
            loop_uvs.append(uv_tuple)
            uv_idx = len(loop_uvs) - 1

            tri_pts.append((vert_idx, n_idx, uv_idx))
        tri_indices.append(tri_pts)

    return {
        'positions': positions,
        'normals': loop_normals,
        'uvs': loop_uvs,
        'triangles': tri_indices
    }


def assign_box_uvs(mesh, uv_box):
    u_min, v_min, u_max, v_max = uv_box
    du = u_max - u_min
    dv = v_max - v_min

    bm = bmesh.new()
    bm.from_mesh(mesh)
    uv_layer = bm.loops.layers.uv.verify()

    verts = [v.co for v in bm.verts]
    if not verts:
        bm.free()
        return
    min_x = min(v.x for v in verts)
    max_x = max(v.x for v in verts)
    min_z = min(v.z for v in verts)
    max_z = max(v.z for v in verts)
    dx = max(0.001, max_x - min_x)
    dz = max(0.001, max_z - min_z)

    for face in bm.faces:
        for loop in face.loops:
            co = loop.vert.co
            u = u_min + ((co.x - min_x) / dx) * du
            v = v_min + ((co.z - min_z) / dz) * dv
            loop[uv_layer].uv = Vector((u, v))

    bm.to_mesh(mesh)
    bm.free()


def assign_cylindrical_uvs(mesh, uv_box):
    u_min, v_min, u_max, v_max = uv_box
    du = u_max - u_min
    dv = v_max - v_min

    bm = bmesh.new()
    bm.from_mesh(mesh)
    uv_layer = bm.loops.layers.uv.verify()

    verts = [v.co for v in bm.verts]
    min_z = min(v.z for v in verts)
    max_z = max(v.z for v in verts)
    dz = max(0.001, max_z - min_z)

    for face in bm.faces:
        for loop in face.loops:
            co = loop.vert.co
            angle = math.atan2(co.y, co.x)
            u = u_min + ((angle + math.pi) / (2 * math.pi)) * du
            v = v_min + ((co.z - min_z) / dz) * dv
            loop[uv_layer].uv = Vector((u, v))

    bm.to_mesh(mesh)
    bm.free()


# ==============================================================================
# TOTORO MODEL (DK Replacement, Large Class)
# ==============================================================================
def build_totoro():
    reset_blender()
    print("Building Refined Totoro...")

    parts = []

    # 1. Main Pear Body (Wider, chubbier, filling the DK large kart)
    # Radius 54 cm, depth 90 cm
    bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=14, radius=54.0, location=(0, -2, 45))
    torso = bpy.context.active_object
    torso.name = "totoro_torso"

    bm = bmesh.new()
    bm.from_mesh(torso.data)
    for v in bm.verts:
        # Recline torso back ~12 degrees
        rad = math.radians(-12)
        cy = v.co.y * math.cos(rad) - v.co.z * math.sin(rad)
        cz = v.co.y * math.sin(rad) + v.co.z * math.cos(rad)
        v.co.y, v.co.z = cy, cz

        # Pear silhouette shaping
        z_rel = (v.co.z - 0) / 95.0
        if z_rel < 0.45:
            # Plump belly and hips
            w_factor = 1.0 + 0.35 * math.sin(z_rel / 0.45 * math.pi)
            v.co.x *= w_factor
            v.co.y *= (w_factor + 0.12)
        else:
            # Rounded shoulders and head dome
            t_factor = 1.0 - 0.28 * min(1.0, (z_rel - 0.45) / 0.55)
            v.co.x *= t_factor
            v.co.y *= t_factor
    bm.to_mesh(torso.data)
    bm.free()
    assign_cylindrical_uvs(torso.data, (0.02, 0.52, 0.48, 0.98))
    parts.append(torso)

    # 1b. Cream Belly Patch (Authentic large round belly with chevrons)
    # Placed smoothly against front of belly
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=42.0, depth=5.0, location=(0, 36, 42))
    belly = bpy.context.active_object
    belly.name = "totoro_belly"
    belly.rotation_euler = (math.radians(78), 0, 0)
    belly.scale = (1.05, 0.35, 1.25)
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    assign_box_uvs(belly.data, (0.52, 0.52, 0.98, 0.98))
    parts.append(belly)

    # 2. Rounded Head Dome
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=38.0, location=(0, -10, 98))
    head = bpy.context.active_object
    head.name = "totoro_head"
    head.scale = (1.05, 0.96, 0.92)
    bpy.ops.object.transform_apply(scale=True)
    assign_cylindrical_uvs(head.data, (0.02, 0.52, 0.48, 0.98))
    parts.append(head)

    # 2b. Face Features Plate (Eyes, Nose, Whiskers)
    bpy.ops.mesh.primitive_plane_add(size=52.0, location=(0, 24, 98))
    face_plate = bpy.context.active_object
    face_plate.name = "totoro_face"
    face_plate.rotation_euler = (math.radians(80), 0, 0)
    face_plate.scale = (1.0, 0.65, 1.0)
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    assign_box_uvs(face_plate.data, (0.02, 0.02, 0.48, 0.48))
    parts.append(face_plate)

    # 3. Pointed Leaf-Shaped Ears (2 ears reaching calibration height ~145.26 cm)
    for side, sx in [(-1, -22.0), (1, 22.0)]:
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=10.5, radius2=0.5, depth=32.0, location=(sx, -12, 131.0))
        ear = bpy.context.active_object
        ear.name = f"totoro_ear_{side}"
        ear.rotation_euler = (math.radians(-6), math.radians(side * 15), 0)
        ear.scale = (1.0, 0.72, 1.0)
        bpy.ops.object.transform_apply(rotation=True, scale=True)
        assign_box_uvs(ear.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(ear)

    # 4. Chunky Curved Arms wrapping around belly to wheel rim
    # Wheel rim diameter is 24 cm, centered around Y ~ 42 cm, Z ~ 58 cm, X ~ +/- 12 cm
    for side, sx in [(-1, -44.0), (1, 44.0)]:
        # Upper Arm / Shoulder
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=12.5, depth=34.0, location=(sx, 8, 70))
        arm = bpy.context.active_object
        arm.name = f"totoro_arm_{side}"
        arm.rotation_euler = (math.radians(48), math.radians(side * -26), 0)
        bpy.ops.object.transform_apply(rotation=True)
        assign_cylindrical_uvs(arm.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(arm)

        # Forearm wrapping forward
        paw_x = side * 13.5
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=9.5, depth=26.0, location=(paw_x + side * 10, 30, 58))
        forearm = bpy.context.active_object
        forearm.name = f"totoro_forearm_{side}"
        forearm.rotation_euler = (math.radians(76), math.radians(side * 32), 0)
        bpy.ops.object.transform_apply(rotation=True)
        assign_cylindrical_uvs(forearm.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(forearm)

        # Paw / Claws gripping wheel rim
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=8.5, location=(paw_x, 42, 57))
        paw = bpy.context.active_object
        paw.name = f"totoro_paw_{side}"
        paw.scale = (0.9, 1.35, 0.8)
        bpy.ops.object.transform_apply(scale=True)
        assign_box_uvs(paw.data, (0.52, 0.52, 0.75, 0.75))
        parts.append(paw)

    # 5. Stout Lower Legs & Feet pointing forward
    for side, sx in [(-1, -26.0), (1, 26.0)]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=13.0, depth=28.0, location=(sx, 22, 14))
        thigh = bpy.context.active_object
        thigh.name = f"totoro_thigh_{side}"
        thigh.rotation_euler = (math.radians(65), math.radians(side * 10), 0)
        bpy.ops.object.transform_apply(rotation=True)
        assign_cylindrical_uvs(thigh.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(thigh)

        # Foot with claws
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=11.0, location=(sx, 44, 9))
        foot = bpy.context.active_object
        foot.name = f"totoro_foot_{side}"
        foot.scale = (0.95, 1.65, 0.7)
        bpy.ops.object.transform_apply(scale=True)
        assign_box_uvs(foot.data, (0.52, 0.52, 0.75, 0.75))
        parts.append(foot)

    # 6. Tail (Behind seat)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=8, radius=14.0, location=(0, -30, 10))
    tail = bpy.context.active_object
    tail.name = "totoro_tail"
    tail.scale = (1.0, 1.25, 0.9)
    bpy.ops.object.transform_apply(scale=True)
    assign_cylindrical_uvs(tail.data, (0.02, 0.52, 0.48, 0.98))
    parts.append(tail)

    # Join
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    totoro = bpy.context.active_object
    totoro.name = "totoro"

    # 1. Apply all transforms first so location is strictly (0, 0, 0)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # 2. Find the seat contact point (pelvis bottom: X in [-25, 25], Y in [-35, 10])
    pelvis_verts = [v.co.z for v in totoro.data.vertices if abs(v.co.x) < 25 and -35 < v.co.y < 10]
    pelvis_z = min(pelvis_verts) if pelvis_verts else min(v.co.z for v in totoro.data.vertices)

    # 3. Shift all vertices so pelvis contact point is precisely at Z = 0.0
    for v in totoro.data.vertices:
        v.co.z -= pelvis_z

    # 4. Set origin to (0, 0, 0)
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

    # 5. Calibration scaling to DK height 145.26 cm (measured from pelvis Z=0 to tip of ears)
    current_height = max(v.co.z for v in totoro.data.vertices)
    scale_factor = 145.259 / current_height
    totoro.scale = (scale_factor, scale_factor, scale_factor)
    bpy.ops.object.transform_apply(scale=True)

    final_height = max(v.co.z for v in totoro.data.vertices)
    min_x = min(v.co.x for v in totoro.data.vertices)
    max_x = max(v.co.x for v in totoro.data.vertices)
    min_y = min(v.co.y for v in totoro.data.vertices)
    max_y = max(v.co.y for v in totoro.data.vertices)

    print(f"Totoro calibrated dimensions (cm):")
    print(f"  Width (X): {max_x - min_x:.2f} cm (range [{min_x:.2f}, {max_x:.2f}])")
    print(f"  Height (Z): {final_height:.2f} cm (target: 145.26 cm)")
    print(f"  Depth (Y): {max_y - min_y:.2f} cm (range [{min_y:.2f}, {max_y:.2f}])")

    # Save .blend
    blend_path = os.path.join(pipeline_dir, "totoro.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)

    # Export Collada
    collada_data = extract_mesh_for_collada(totoro, swap_yz=True)
    out_dae = "public/wii/totoro/model.dae"
    export_collada_dae(collada_data, out_dae, "totoro_all.png", "totoro_all_tx")
    print(f"Exported {out_dae} ({len(collada_data['triangles'])} triangles)")

    return totoro


# ==============================================================================
# SATSUKI KUSAKABE MODEL (Mario Replacement, Medium Class)
# ==============================================================================
# ==========================================================================
    # SATSUKI KUSAKABE MODEL (Refined Cohesive Topology)
    # ==========================================================================
def build_satsuki():
    reset_blender()
    print("Building Refined Satsuki Kusakabe (Ghibli Reference)...")

    parts = []

    # 1. Torso & Yellow Shirt (Reclined ~12 degrees, slim anime posture)
    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=12.0, depth=24.0, location=(0, -2, 40))
    shirt = bpy.context.active_object
    shirt.name = "satsuki_shirt"
    shirt.rotation_euler = (math.radians(-12), 0, 0)
    shirt.scale = (0.95, 0.8, 1.0)
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    # Map to Yellow Shirt zone with collar & suspenders: U [0.52, 0.98], V [0.52, 0.98]
    assign_cylindrical_uvs(shirt.data, (0.52, 0.52, 0.98, 0.98))
    parts.append(shirt)

    # 1b. Collar Band (Low-poly torus)
    bpy.ops.mesh.primitive_torus_add(major_segments=12, minor_segments=6, major_radius=6.2, minor_radius=1.6, location=(0, -5, 52))
    collar = bpy.context.active_object
    collar.name = "satsuki_collar"
    collar.rotation_euler = (math.radians(-12), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    assign_box_uvs(collar.data, (0.52, 0.90, 0.98, 0.98))
    parts.append(collar)

    # 2. Orange Flared Skirt (Closed solid, draped over seat & thighs)
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=19.5, radius2=12.0, depth=18.0, location=(0, 2, 18))
    skirt = bpy.context.active_object
    skirt.name = "satsuki_skirt"
    skirt.rotation_euler = (math.radians(18), 0, 0)
    skirt.scale = (1.08, 1.25, 0.9)
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    assign_cylindrical_uvs(skirt.data, (0.02, 0.02, 0.48, 0.48))
    parts.append(skirt)

    # 3. Head & Face (Single Cohesive Low-Poly Anime Head)
    # Neck
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=4.2, depth=9.0, location=(0, -5, 54))
    neck = bpy.context.active_object
    neck.name = "satsuki_neck"
    assign_box_uvs(neck.data, (0.02, 0.52, 0.48, 0.98))
    parts.append(neck)

    # Anime Head Base (Oval skull tapering to cute rounded jaw & chin)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=10, radius=12.0, location=(0, -3, 67))
    head = bpy.context.active_object
    head.name = "satsuki_head"
    # Shape head: slightly wider at cheekbones, tapered jaw
    bm = bmesh.new()
    bm.from_mesh(head.data)
    for v in bm.verts:
        # Tilt head slightly forward ~5 deg
        rad = math.radians(5)
        cy = v.co.y * math.cos(rad) - v.co.z * math.sin(rad)
        cz = v.co.y * math.sin(rad) + v.co.z * math.cos(rad)
        v.co.y, v.co.z = cy, cz

        # Shape chin
        if v.co.z < 65:
            t = (65 - v.co.z) / 10.0
            v.co.x *= (1.0 - 0.3 * t)
            v.co.y *= (1.0 - 0.2 * t)
    bm.to_mesh(head.data)
    bm.free()

    # UV Map Head:
    # Front faces (facing +Y): map directly to face region [0.08, 0.58, 0.42, 0.92] (where eyes, nose, smile are!)
    # Back & side faces: map to skin zone [0.02, 0.52, 0.48, 0.98]
    bm = bmesh.new()
    bm.from_mesh(head.data)
    uv_layer = bm.loops.layers.uv.verify()
    for face in bm.faces:
        norm = face.normal
        # If face points generally forward (Y > 0.2):
        if norm.y > 0.2:
            # Face feature mapping: centered around X=0, Z=66..70
            for loop in face.loops:
                co = loop.vert.co
                # Normalized X from -8 to +8 -> U in [0.12, 0.38]
                u = 0.25 + (co.x / 16.0) * 0.24
                # Normalized Z from 60 to 74 -> V in [0.65, 0.92]
                v = 0.65 + ((co.z - 60.0) / 14.0) * 0.27
                loop[uv_layer].uv = Vector((max(0.10, min(0.40, u)), max(0.60, min(0.95, v))))
        else:
            # Side / back of head: plain skin
            for loop in face.loops:
                loop[uv_layer].uv = Vector((0.05, 0.55))
    bm.to_mesh(head.data)
    bm.free()
    parts.append(head)

    # 4. Ghibli Bob Hair with Bangs (Fitted solid helmet & bangs)
    # Hair Top/Back Cap
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=10, radius=13.2, location=(0, -4, 69))
    hair_cap = bpy.context.active_object
    hair_cap.name = "satsuki_hair_cap"
    hair_cap.scale = (1.04, 1.08, 1.02)
    bpy.ops.object.transform_apply(scale=True)
    # Cut off bottom-front so face shows through cleanly
    bm = bmesh.new()
    bm.from_mesh(hair_cap.data)
    verts_to_remove = [v for v in bm.verts if v.co.y > -2 and v.co.z < 69]
    bmesh.ops.delete(bm, geom=verts_to_remove, context='VERTS')
    bm.to_mesh(hair_cap.data)
    bm.free()
    assign_cylindrical_uvs(hair_cap.data, (0.52, 0.52, 0.98, 0.80))
    parts.append(hair_cap)

    # Front Bangs (Choppy stylized locks framing the forehead above the eyes)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=12.8, depth=5.0, location=(0, -2, 73))
    bangs = bpy.context.active_object
    bangs.name = "satsuki_bangs"
    bangs.rotation_euler = (math.radians(35), 0, 0)
    bangs.scale = (1.02, 0.45, 1.0)
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    assign_box_uvs(bangs.data, (0.52, 0.52, 0.98, 0.80))
    parts.append(bangs)

    # Side Locks (Hair framing cheeks and ears)
    for side, sx in [(-1, -11.5), (1, 11.5)]:
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=4.5, radius2=1.0, depth=14.0, location=(sx, -3, 64))
        lock = bpy.context.active_object
        lock.name = f"satsuki_sidelock_{side}"
        lock.rotation_euler = (math.radians(-10), math.radians(side * -15), math.radians(side * 8))
        bpy.ops.object.transform_apply(rotation=True)
        assign_box_uvs(lock.data, (0.52, 0.52, 0.98, 0.80))
        parts.append(lock)

    # 5. Arms & Hands gripping the 24 cm steering wheel
    # Steering wheel rim: Y ~ 34 cm, Z ~ 50 cm, X ~ +/- 9 cm
    for side, sx in [(-1, -15.0), (1, 15.0)]:
        # Yellow short sleeve
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=5.2, depth=8.0, location=(sx, -1, 48))
        sleeve = bpy.context.active_object
        sleeve.name = f"satsuki_sleeve_{side}"
        sleeve.rotation_euler = (math.radians(35), math.radians(side * -18), 0)
        bpy.ops.object.transform_apply(rotation=True)
        assign_cylindrical_uvs(sleeve.data, (0.52, 0.52, 0.98, 0.98))
        parts.append(sleeve)

        # Upper arm (skin tone)
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=3.2, depth=15.0, location=(sx + side * 1.5, 7, 44))
        arm = bpy.context.active_object
        arm.name = f"satsuki_arm_{side}"
        arm.rotation_euler = (math.radians(48), math.radians(side * -18), 0)
        bpy.ops.object.transform_apply(rotation=True)
        assign_cylindrical_uvs(arm.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(arm)

        # Forearm reaching forward to wheel
        hx = side * 8.5
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=2.8, depth=16.0, location=(hx + side * 3.5, 21, 48))
        forearm = bpy.context.active_object
        forearm.name = f"satsuki_forearm_{side}"
        forearm.rotation_euler = (math.radians(72), math.radians(side * 22), 0)
        bpy.ops.object.transform_apply(rotation=True)
        assign_cylindrical_uvs(forearm.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(forearm)

        # Stylized Low-Poly Hand gripping wheel rim
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=3.2, location=(hx, 33, 49))
        hand = bpy.context.active_object
        hand.name = f"satsuki_hand_{side}"
        hand.scale = (0.85, 1.25, 0.85)
        bpy.ops.object.transform_apply(scale=True)
        assign_box_uvs(hand.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(hand)

    # 6. Legs & Feet (bent ~85 deg at hips/knees into footwell)
    for side, sx in [(-1, -8.0), (1, 8.0)]:
        # Thigh extending forward from under skirt
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=4.8, depth=19.0, location=(sx, 14, 15))
        thigh = bpy.context.active_object
        thigh.name = f"satsuki_thigh_{side}"
        thigh.rotation_euler = (math.radians(72), math.radians(side * 5), 0)
        bpy.ops.object.transform_apply(rotation=True)
        assign_cylindrical_uvs(thigh.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(thigh)

        # Shin / Calf with White Socks
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=3.6, depth=16.0, location=(sx, 27, 8))
        shin = bpy.context.active_object
        shin.name = f"satsuki_shin_{side}"
        shin.rotation_euler = (math.radians(28), 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
        # White socks at bottom: U [0.52, 0.75], V [0.80, 0.98]
        assign_cylindrical_uvs(shin.data, (0.52, 0.80, 0.75, 0.98))
        parts.append(shin)

        # Dark Canvas Shoes / Loafers on pedals
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=4.4, location=(sx, 35, 3))
        shoe = bpy.context.active_object
        shoe.name = f"satsuki_shoe_{side}"
        shoe.scale = (0.85, 1.5, 0.65)
        bpy.ops.object.transform_apply(scale=True)
        # Shoes texture: U [0.75, 0.98], V [0.80, 0.98]
        assign_box_uvs(shoe.data, (0.75, 0.80, 0.98, 0.98))
        parts.append(shoe)

    # Join
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    satsuki = bpy.context.active_object
    satsuki.name = "satsuki"

    # 1. Apply all transforms
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # 2. Find the seat contact point (skirt base: X in [-15, 15], Y in [-25, 5])
    pelvis_verts = [v.co.z for v in satsuki.data.vertices if abs(v.co.x) < 15 and -25 < v.co.y < 5]
    pelvis_z = min(pelvis_verts) if pelvis_verts else min(v.co.z for v in satsuki.data.vertices)

    # 3. Shift so pelvis contact point is precisely at Z = 0.0
    for v in satsuki.data.vertices:
        v.co.z -= pelvis_z

    # 4. Set origin to (0, 0, 0)
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

    # 5. Calibration scaling to Mario height 119.41 cm (measured from pelvis Z=0 to hair top)
    current_height = max(v.co.z for v in satsuki.data.vertices)
    scale_factor = 119.408 / current_height
    satsuki.scale = (scale_factor, scale_factor, scale_factor)
    bpy.ops.object.transform_apply(scale=True)

    final_height = max(v.co.z for v in satsuki.data.vertices)
    min_x = min(v.co.x for v in satsuki.data.vertices)
    max_x = max(v.co.x for v in satsuki.data.vertices)
    min_y = min(v.co.y for v in satsuki.data.vertices)
    max_y = max(v.co.y for v in satsuki.data.vertices)

    print(f"Satsuki calibrated dimensions (cm):")
    print(f"  Width (X): {max_x - min_x:.2f} cm (range [{min_x:.2f}, {max_x:.2f}])")
    print(f"  Height (Z): {final_height:.2f} cm (target: 119.41 cm)")
    print(f"  Depth (Y): {max_y - min_y:.2f} cm (range [{min_y:.2f}, {max_y:.2f}])")

    # Save .blend
    blend_path = os.path.join(pipeline_dir, "satsuki.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)

    # Export Collada
    collada_data = extract_mesh_for_collada(satsuki, swap_yz=True)
    out_dae = "public/wii/satsuki/model.dae"
    export_collada_dae(collada_data, out_dae, "satsuki_all.png", "satsuki_all_tx")
    print(f"Exported {out_dae} ({len(collada_data['triangles'])} triangles)")

    return satsuki


if __name__ == "__main__":
    build_totoro()
    build_satsuki()
