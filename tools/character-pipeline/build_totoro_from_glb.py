"""
High-Fidelity Totoro Model Builder from Reference GLB.
Takes the authentic Totoro 3D model, preserves rich organic geometry,
poses arms to grip steering wheel and feet forward into footwell,
calibrates seated height to 145.26 cm with origin at pelvis contact point,
and exports clean Collada DAE and .blend files.
"""

import bpy
import bmesh
import math
import os
import sys
from mathutils import Vector, Euler, Matrix

pipeline_dir = os.path.dirname(os.path.abspath(__file__))
if pipeline_dir not in sys.path:
    sys.path.insert(0, pipeline_dir)

from collada_writer import export_collada_dae

def assign_uv_rect(mesh, u_min, v_min, u_max, v_max):
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
            u = u_min + ((co.x - min_x) / dx) * (u_max - u_min)
            v = v_min + ((co.z - min_z) / dz) * (v_max - v_min)
            loop[uv_layer].uv = Vector((u, v))

    bm.to_mesh(mesh)
    bm.free()

def decimate_obj(obj, target_faces):
    curr_faces = len(obj.data.polygons)
    if curr_faces <= target_faces or curr_faces == 0:
        return
    ratio = max(0.001, min(1.0, target_faces / curr_faces))
    mod = obj.modifiers.new(name="Decimate", type='DECIMATE')
    mod.ratio = ratio
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier="Decimate")

def extract_totoro_collada(obj):
    """
    In this model, Totoro faces -Y in Blender.
    In Collada Y_UP:
      Collada X = Blender X (right)
      Collada Y = Blender Z (up)
      Collada Z = -Blender Y (so facing -Y becomes facing +Z forward)
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
    loop_normals = []
    loop_uvs = []
    tri_indices = []

    for v in mesh.vertices:
        co = v.co
        positions.append((float(co.x), float(co.z), float(-co.y)))

    for tri in mesh.loop_triangles:
        tri_pts = []
        for loop_idx in tri.loops:
            loop = mesh.loops[loop_idx]
            vert_idx = loop.vertex_index
            norm = loop.normal
            n_tuple = (float(norm.x), float(norm.z), float(-norm.y))
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


def build_totoro_from_reference():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if not bpy.data.scenes:
        bpy.data.scenes.new("Scene")

    glb_path = os.path.join(pipeline_dir, "totoro_ref.glb")
    if not os.path.exists(glb_path):
        raise FileNotFoundError(f"Missing {glb_path}")

    print("Importing reference GLB for high-fidelity Totoro...")
    bpy.ops.import_scene.gltf(filepath=glb_path)

    # Clean up hierarchy: unparent everything with transform kept
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.select_all(action='DESELECT')

    # Remove the 550,000-poly curve whiskers and replace with clean low-poly wire whiskers
    whiskers = bpy.data.objects.get("Whiskers")
    if whiskers:
        bpy.data.objects.remove(whiskers, do_unlink=True)

    # Generous quality targets (smooth, round curves)
    target_budget = {
        "Body": 1200,
        "Belly": 800,
        "Marks belly": 200,
        "Marks belly.001": 350,
        "Ears": 400,
        "Eyes": 250,
        "Nose": 120,
        "Arms": 500,
        "Claws arms": 300,
        "Feet": 400,
        "Claws feet": 250,
        "Tail": 180,
        "Leaf hat": 250,
        "Stalk": 80,
    }

    for name, face_target in target_budget.items():
        obj = bpy.data.objects.get(name)
        if obj and obj.type == 'MESH':
            decimate_obj(obj, face_target)
            print(f"Decimated {name} -> {len(obj.data.polygons)} polygons")

    # Pose character into kart driving posture:
    body = bpy.data.objects.get("Body")
    belly = bpy.data.objects.get("Belly")
    arms = bpy.data.objects.get("Arms")
    claws_arms = bpy.data.objects.get("Claws arms")
    feet = bpy.data.objects.get("Feet")
    claws_feet = bpy.data.objects.get("Claws feet")

    # 1. Join arms and claws, pose forward to steering wheel
    # In this model, Totoro faces -Y! So forward is -Y!
    if arms and claws_arms:
        bpy.ops.object.select_all(action='DESELECT')
        arms.select_set(True)
        claws_arms.select_set(True)
        bpy.context.view_layer.objects.active = arms
        bpy.ops.object.join()
        # Rotate arms forward (-Y direction): rotate around X by -42 degrees
        arms.rotation_euler.x -= math.radians(42)
        arms.location.y -= 1.8
        arms.location.z -= 1.0
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # 2. Join feet and claws, pose forward into footwell (-Y direction)
    if feet and claws_feet:
        bpy.ops.object.select_all(action='DESELECT')
        feet.select_set(True)
        claws_feet.select_set(True)
        bpy.context.view_layer.objects.active = feet
        bpy.ops.object.join()
        # Rotate feet forward into pedals
        feet.rotation_euler.x += math.radians(65)
        feet.location.y -= 2.5
        feet.location.z += 1.6
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # 3. Create clean stylized whiskers (3 on each cheek)
    whisker_objs = []
    for side in [-1, 1]:
        for idx, (dy, dz, angle) in enumerate([(-0.3, 0.4, -8), (0.0, 0.0, 0), (0.3, -0.4, 8)]):
            bpy.ops.mesh.primitive_cylinder_add(
                vertices=8, radius=0.07, depth=3.6,
                location=(side * 5.2, -4.5 + dy, 15.5 + dz)
            )
            w_obj = bpy.context.active_object
            w_obj.name = f"whisker_{side}_{idx}"
            w_obj.rotation_euler = (math.radians(90 + angle), math.radians(side * -18), 0)
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            assign_uv_rect(w_obj.data, 0.52, 0.52, 0.75, 0.75)
            whisker_objs.append(w_obj)

    # 4. Assign UV mappings matching totoro_all.png atlas:
    for name in ["Body", "Ears", "Tail", "Arms"]:
        obj = bpy.data.objects.get(name)
        if obj:
            assign_uv_rect(obj.data, 0.02, 0.52, 0.48, 0.98)

    for name in ["Belly"]:
        obj = bpy.data.objects.get(name)
        if obj:
            assign_uv_rect(obj.data, 0.52, 0.52, 0.98, 0.98)

    for name in ["Marks belly", "Marks belly.001"]:
        obj = bpy.data.objects.get(name)
        if obj:
            assign_uv_rect(obj.data, 0.55, 0.15, 0.95, 0.35)

    for name in ["Eyes"]:
        obj = bpy.data.objects.get(name)
        if obj:
            assign_uv_rect(obj.data, 0.10, 0.10, 0.45, 0.45)

    for name in ["Nose", "Feet"]:
        obj = bpy.data.objects.get(name)
        if obj:
            assign_uv_rect(obj.data, 0.52, 0.52, 0.75, 0.75)

    for name in ["Leaf hat", "Stalk"]:
        obj = bpy.data.objects.get(name)
        if obj:
            assign_uv_rect(obj.data, 0.35, 0.40, 0.50, 0.50)

    # 5. Join all mesh parts into single cohesive Totoro mesh
    bpy.ops.object.select_all(action='DESELECT')
    all_meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    for o in all_meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    totoro = bpy.context.active_object
    totoro.name = "totoro"

    # 6. Apply all transforms
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # 7. Recline torso back ~12 degrees (since Totoro faces -Y, reclining back is rotating around X by -12 deg)
    bm = bmesh.new()
    bm.from_mesh(totoro.data)
    for v in bm.verts:
        rad = math.radians(-12)
        cy = v.co.y * math.cos(rad) - v.co.z * math.sin(rad)
        cz = v.co.y * math.sin(rad) + v.co.z * math.cos(rad)
        v.co.y, v.co.z = cy, cz
    bm.to_mesh(totoro.data)
    bm.free()

    # 8. Set seat contact point strictly at Z = 0.0
    all_verts = [v.co for v in totoro.data.vertices]
    # Pelvis contact: lowest point of body buttocks
    pelvis_verts = [v.z for v in all_verts if abs(v.x) < 5.0 and v.y > -2.0]
    pelvis_z = min(pelvis_verts) if pelvis_verts else min(v.z for v in all_verts)
    for v in totoro.data.vertices:
        v.co.z -= pelvis_z

    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

    # 9. Calibration scaling: Donkey Kong seated height is 145.26 cm
    current_height = max(v.co.z for v in totoro.data.vertices)
    scale_factor = 145.259 / current_height
    totoro.scale = (scale_factor, scale_factor, scale_factor)
    bpy.ops.object.transform_apply(scale=True)

    final_height = max(v.co.z for v in totoro.data.vertices)
    min_x = min(v.co.x for v in totoro.data.vertices)
    max_x = max(v.co.x for v in totoro.data.vertices)
    min_y = min(v.co.y for v in totoro.data.vertices)
    max_y = max(v.co.y for v in totoro.data.vertices)
    total_triangles = sum(len(p.vertices) - 2 for p in totoro.data.polygons)

    print(f"=== High-Fidelity Totoro Model ===")
    print(f"  Triangles: {total_triangles}")
    print(f"  Width (X): {max_x - min_x:.2f} cm (range [{min_x:.2f}, {max_x:.2f}])")
    print(f"  Height (Z): {final_height:.2f} cm (target: 145.26 cm)")
    print(f"  Depth (Y): {max_y - min_y:.2f} cm (range [{min_y:.2f}, {max_y:.2f}])")

    # Save .blend
    blend_path = os.path.join(pipeline_dir, "totoro.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Saved {blend_path}")

    # Export Collada DAE
    collada_data = extract_totoro_collada(totoro)
    out_dae = "public/wii/totoro/model.dae"
    export_collada_dae(collada_data, out_dae, "totoro_all.png", "totoro_all_tx")
    print(f"Exported {out_dae} ({len(collada_data['triangles'])} triangles)")

    return totoro

if __name__ == "__main__":
    build_totoro_from_reference()
