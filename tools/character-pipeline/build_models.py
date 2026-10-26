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
def build_satsuki():
    reset_blender()
    print("Building Refined Satsuki Kusakabe...")

    parts = []

    # 1. Torso / Yellow Shirt (reclined ~12 degrees, slim anime posture)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=13.0, depth=26.0, location=(0, -2, 42))
    shirt = bpy.context.active_object
    shirt.name = "satsuki_shirt"
    shirt.rotation_euler = (math.radians(-12), 0, 0)
    shirt.scale = (1.0, 0.82, 1.0)
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    assign_cylindrical_uvs(shirt.data, (0.52, 0.52, 0.98, 0.98))
    parts.append(shirt)

    # 2. Orange Flared A-Line Skirt (sitting on seat and thighs)
    bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=20.0, radius2=12.5, depth=18.0, location=(0, 3, 20))
    skirt = bpy.context.active_object
    skirt.name = "satsuki_skirt"
    skirt.rotation_euler = (math.radians(20), 0, 0)
    skirt.scale = (1.1, 1.25, 0.9)
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    assign_cylindrical_uvs(skirt.data, (0.02, 0.02, 0.48, 0.48))
    parts.append(skirt)

    # 3. Head & Face
    # Neck
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=4.5, depth=8.0, location=(0, -6, 56))
    neck = bpy.context.active_object
    neck.name = "satsuki_neck"
    assign_box_uvs(neck.data, (0.02, 0.52, 0.48, 0.98))
    parts.append(neck)

    # Anime Head Base (cute proportions)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=12, radius=12.5, location=(0, -4, 69))
    head = bpy.context.active_object
    head.name = "satsuki_head"
    head.scale = (0.95, 1.05, 1.1)
    bpy.ops.object.transform_apply(scale=True)
    assign_cylindrical_uvs(head.data, (0.02, 0.52, 0.48, 0.98))
    parts.append(head)

    # Face Plate (eyes, blush, smile)
    bpy.ops.mesh.primitive_plane_add(size=15.0, location=(0, 7.5, 69))
    face_plate = bpy.context.active_object
    face_plate.name = "satsuki_face"
    face_plate.rotation_euler = (math.radians(85), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    assign_box_uvs(face_plate.data, (0.08, 0.65, 0.42, 0.95))
    parts.append(face_plate)

    # 4. Windblown Dark Hair (Bob cut + swept locks)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=10, radius=13.8, location=(0, -5, 71))
    hair_top = bpy.context.active_object
    hair_top.name = "satsuki_hair_top"
    hair_top.scale = (1.02, 1.08, 1.05)
    bpy.ops.object.transform_apply(scale=True)
    assign_box_uvs(hair_top.data, (0.52, 0.15, 0.98, 0.45))
    parts.append(hair_top)

    # Windblown side tufts / pigtail locks swept back
    for side, sx in [(-1, -11.5), (1, 11.5)]:
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=5.0, radius2=0.5, depth=16.0, location=(sx, -13, 67))
        lock = bpy.context.active_object
        lock.name = f"satsuki_hair_lock_{side}"
        lock.rotation_euler = (math.radians(-38), math.radians(side * -32), math.radians(side * 20))
        bpy.ops.object.transform_apply(rotation=True)
        assign_box_uvs(lock.data, (0.52, 0.15, 0.98, 0.45))
        parts.append(lock)

    # 5. Arms & Hands gripping the 24 cm steering wheel
    # Steering wheel rim: Y ~ 34 cm, Z ~ 52 cm, X ~ +/- 9 cm
    for side, sx in [(-1, -16.0), (1, 16.0)]:
        # Yellow short sleeve
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=5.5, depth=8.0, location=(sx, -1, 52))
        sleeve = bpy.context.active_object
        sleeve.name = f"satsuki_sleeve_{side}"
        sleeve.rotation_euler = (math.radians(35), math.radians(side * -18), 0)
        bpy.ops.object.transform_apply(rotation=True)
        assign_cylindrical_uvs(sleeve.data, (0.52, 0.52, 0.98, 0.98))
        parts.append(sleeve)

        # Upper arm
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=3.4, depth=16.0, location=(sx + side * 1.5, 7, 48))
        arm = bpy.context.active_object
        arm.name = f"satsuki_arm_{side}"
        arm.rotation_euler = (math.radians(48), math.radians(side * -18), 0)
        bpy.ops.object.transform_apply(rotation=True)
        assign_cylindrical_uvs(arm.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(arm)

        # Forearm extending to wheel rim
        hx = side * 8.5
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=3.0, depth=17.0, location=(hx + side * 4.0, 22, 51))
        forearm = bpy.context.active_object
        forearm.name = f"satsuki_forearm_{side}"
        forearm.rotation_euler = (math.radians(72), math.radians(side * 22), 0)
        bpy.ops.object.transform_apply(rotation=True)
        assign_cylindrical_uvs(forearm.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(forearm)

        # Hand on wheel rim
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=3.4, location=(hx, 34, 52))
        hand = bpy.context.active_object
        hand.name = f"satsuki_hand_{side}"
        assign_box_uvs(hand.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(hand)

    # 6. Legs & Feet (bent 85-90 degrees at hips & knees, compact reach)
    for side, sx in [(-1, -8.5), (1, 8.5)]:
        # Thigh extending forward from pelvis
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=5.2, depth=20.0, location=(sx, 15, 16))
        thigh = bpy.context.active_object
        thigh.name = f"satsuki_thigh_{side}"
        thigh.rotation_euler = (math.radians(72), math.radians(side * 6), 0)
        bpy.ops.object.transform_apply(rotation=True)
        assign_cylindrical_uvs(thigh.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(thigh)

        # Shin / Calf (reaching down and forward to pedals)
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=3.8, depth=17.0, location=(sx, 28, 9))
        shin = bpy.context.active_object
        shin.name = f"satsuki_shin_{side}"
        shin.rotation_euler = (math.radians(30), 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
        assign_cylindrical_uvs(shin.data, (0.52, 0.02, 0.75, 0.22))
        parts.append(shin)

        # Shoes on pedals
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, radius=4.8, location=(sx, 37, 4))
        shoe = bpy.context.active_object
        shoe.name = f"satsuki_shoe_{side}"
        shoe.scale = (0.85, 1.5, 0.7)
        bpy.ops.object.transform_apply(scale=True)
        assign_box_uvs(shoe.data, (0.75, 0.02, 0.98, 0.22))
        parts.append(shoe)

    # Join
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    satsuki = bpy.context.active_object
    satsuki.name = "satsuki"

    # 1. Apply all transforms first so location is strictly (0, 0, 0)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # 2. Find the seat contact point (skirt/buttocks: X in [-15, 15], Y in [-25, 5])
    pelvis_verts = [v.co.z for v in satsuki.data.vertices if abs(v.co.x) < 15 and -25 < v.co.y < 5]
    pelvis_z = min(pelvis_verts) if pelvis_verts else min(v.co.z for v in satsuki.data.vertices)

    # 3. Shift all vertices so pelvis contact point is precisely at Z = 0.0
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
