"""
High-Fidelity Satsuki Kusakabe 3D Model Builder.
Builds an expressive, high-detail Studio Ghibli character mesh with jet black hair,
front-projected Ghibli face portrait, 3D suspenders, flared pleated skirt,
and hands gripping the 24 cm steering wheel rim.
Calibrated to 119.41 cm seated height with origin at pelvis contact point.
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
from build_models import extract_mesh_for_collada, assign_box_uvs, assign_cylindrical_uvs

def build_satsuki_high_fidelity():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if not bpy.data.scenes:
        bpy.data.scenes.new("Scene")

    print("Building High-Fidelity Satsuki Kusakabe (Jet Black Hair, No Budget Limit)...")
    parts = []

    # 1. Torso & Yellow Blouse (Smooth 20-sided cylinder, reclined ~12 degrees)
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=12.2, depth=24.0, location=(0, -2, 40))
    shirt = bpy.context.active_object
    shirt.name = "satsuki_shirt"
    shirt.rotation_euler = (math.radians(-12), 0, 0)
    shirt.scale = (0.95, 0.82, 1.0)
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    assign_cylindrical_uvs(shirt.data, (0.52, 0.52, 0.98, 0.98))
    parts.append(shirt)

    # 1b. Collar Band & Lapels
    bpy.ops.mesh.primitive_torus_add(major_segments=20, minor_segments=10, major_radius=6.2, minor_radius=1.8, location=(0, -5, 52))
    collar = bpy.context.active_object
    collar.name = "satsuki_collar"
    collar.rotation_euler = (math.radians(-12), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    assign_box_uvs(collar.data, (0.52, 0.90, 0.98, 0.98))
    parts.append(collar)

    # 1c. 3D Modeled Orange Suspender Straps
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side * 7.2, -2.5, 40))
        strap = bpy.context.active_object
        strap.name = f"satsuki_strap_{side}"
        strap.scale = (2.2, 11.0, 24.5)
        strap.rotation_euler = (math.radians(-12), 0, math.radians(side * 4))
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        assign_box_uvs(strap.data, (0.02, 0.02, 0.48, 0.48))
        parts.append(strap)

    # 2. High-Waisted Orange Flared Pleated Skirt (24 pleat segments, natural flare over seat & thighs)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=20.5, radius2=12.5, depth=18.0, location=(0, 2, 18))
    skirt = bpy.context.active_object
    skirt.name = "satsuki_skirt"
    skirt.rotation_euler = (math.radians(18), 0, 0)
    skirt.scale = (1.08, 1.28, 0.92)
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    assign_cylindrical_uvs(skirt.data, (0.02, 0.02, 0.48, 0.48))
    parts.append(skirt)

    # 3. Head & Face (Smooth High-Poly Anime Head with Ghibli Face Texture)
    # Neck (smooth 16 vertices)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=4.2, depth=9.0, location=(0, -5, 54))
    neck = bpy.context.active_object
    neck.name = "satsuki_neck"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    assign_box_uvs(neck.data, (0.02, 0.52, 0.48, 0.98))
    parts.append(neck)

    # Anime Head Base (22 segments, 18 rings, smooth jaw & cheeks)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=22, ring_count=18, radius=11.6, location=(0, -3, 67))
    head = bpy.context.active_object
    head.name = "satsuki_head"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Sculpt anime cheeks, jawline, and chin
    bm = bmesh.new()
    bm.from_mesh(head.data)
    for v in bm.verts:
        # Tilt head slightly forward ~5 deg
        rad = math.radians(5)
        cy = (v.co.y + 3) * math.cos(rad) - (v.co.z - 67) * math.sin(rad) - 3
        cz = (v.co.y + 3) * math.sin(rad) + (v.co.z - 67) * math.cos(rad) + 67
        v.co.y, v.co.z = cy, cz

        # Shape tapered chin & round cheeks
        if v.co.z < 65:
            t = (65 - v.co.z) / 10.0
            v.co.x *= (1.0 - 0.28 * t)
            v.co.y = (v.co.y + 3) * (1.0 - 0.22 * t) - 3
    bm.to_mesh(head.data)
    bm.free()

    # Front Projection UV Mapping for Face (Centered on Ghibli Cel Face)
    bm = bmesh.new()
    bm.from_mesh(head.data)
    uv_layer = bm.loops.layers.uv.verify()
    verts = [v.co for v in bm.verts]
    min_x = min(v.x for v in verts)
    max_x = max(v.x for v in verts)
    min_z = min(v.z for v in verts)
    max_z = max(v.z for v in verts)
    dx = max(0.001, max_x - min_x)
    dz = max(0.001, max_z - min_z)

    for face in bm.faces:
        # Front-facing half of the head
        if face.normal.y > -0.05:
            for loop in face.loops:
                co = loop.vert.co
                u = 0.05 + ((co.x - min_x) / dx) * 0.40
                v = 0.55 + ((co.z - min_z) / dz) * 0.40
                loop[uv_layer].uv = Vector((u, v))
        else:
            for loop in face.loops:
                loop[uv_layer].uv = Vector((0.05, 0.55))
    bm.to_mesh(head.data)
    bm.free()
    parts.append(head)

    # 4. Jet Black Ghibli Bob Hair with Layered Bangs & Side Locks
    # Hair Top/Back Cap (sits on top and rear of skull)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=16, radius=12.5, location=(0, -4.5, 69))
    hair_cap = bpy.context.active_object
    hair_cap.name = "satsuki_hair_cap"
    hair_cap.scale = (1.04, 1.05, 1.02)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # Remove front hemisphere so face is fully open
    bm = bmesh.new()
    bm.from_mesh(hair_cap.data)
    verts_to_remove = [v for v in bm.verts if v.co.y > -2.8 and v.co.z < 73]
    bmesh.ops.delete(bm, geom=verts_to_remove, context='VERTS')
    bm.to_mesh(hair_cap.data)
    bm.free()
    assign_cylindrical_uvs(hair_cap.data, (0.52, 0.24, 0.98, 0.48))
    parts.append(hair_cap)

    # Front Layered Bangs (5 stylized curved lock clumps across forehead above eyes)
    bang_positions = [
        (-6.0, 3.8, 73.5, -12),
        (-3.0, 5.2, 74.0, -6),
        (0.0, 5.8, 74.2, 0),
        (3.0, 5.2, 74.0, 6),
        (6.0, 3.8, 73.5, 12),
    ]
    for idx, (bx, by, bz, rot_y) in enumerate(bang_positions):
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=2.8, radius2=0.5, depth=6.5, location=(bx, by, bz))
        bang = bpy.context.active_object
        bang.name = f"satsuki_bang_{idx}"
        bang.rotation_euler = (math.radians(35), math.radians(rot_y), 0)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        assign_box_uvs(bang.data, (0.52, 0.24, 0.98, 0.48))
        parts.append(bang)

    # Side Locks (Hair framing cheeks and ears)
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=4.5, radius2=1.0, depth=15.0, location=(side * 11.2, -3.5, 63))
        lock = bpy.context.active_object
        lock.name = f"satsuki_sidelock_{side}"
        lock.rotation_euler = (math.radians(-10), math.radians(side * -14), math.radians(side * 8))
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        assign_box_uvs(lock.data, (0.52, 0.24, 0.98, 0.48))
        parts.append(lock)

    # 5. High-Detail Arms & Posed Hands gripping the 24 cm steering wheel
    # Steering wheel rim: Y ~ 34 cm, Z ~ 50 cm, X ~ +/- 9 cm
    for side in [-1, 1]:
        sx = side * 15.0
        # Yellow short sleeve with cuff
        bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=5.4, depth=8.5, location=(sx, -1, 48))
        sleeve = bpy.context.active_object
        sleeve.name = f"satsuki_sleeve_{side}"
        sleeve.rotation_euler = (math.radians(35), math.radians(side * -18), 0)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        assign_cylindrical_uvs(sleeve.data, (0.52, 0.52, 0.98, 0.98))
        parts.append(sleeve)

        # Upper arm
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=3.3, depth=15.0, location=(sx + side * 1.5, 7, 44))
        arm = bpy.context.active_object
        arm.name = f"satsuki_arm_{side}"
        arm.rotation_euler = (math.radians(48), math.radians(side * -18), 0)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        assign_cylindrical_uvs(arm.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(arm)

        # Forearm
        hx = side * 8.5
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=2.9, depth=16.0, location=(hx + side * 3.5, 21, 48))
        forearm = bpy.context.active_object
        forearm.name = f"satsuki_forearm_{side}"
        forearm.rotation_euler = (math.radians(72), math.radians(side * 22), 0)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        assign_cylindrical_uvs(forearm.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(forearm)

        # Hand with articulated thumb and gripping fingers around wheel rim
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=3.3, location=(hx, 33, 49))
        palm = bpy.context.active_object
        palm.name = f"satsuki_palm_{side}"
        palm.scale = (0.9, 1.3, 0.8)
        bpy.ops.object.transform_apply(scale=True)
        assign_box_uvs(palm.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(palm)

        # Thumb resting on wheel rim
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=1.0, depth=2.8, location=(hx - side * 1.2, 33.5, 51.5))
        thumb = bpy.context.active_object
        thumb.name = f"satsuki_thumb_{side}"
        thumb.rotation_euler = (math.radians(40), math.radians(side * 35), 0)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        assign_box_uvs(thumb.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(thumb)

    # 6. Smooth Legs, White Crew Socks & Canvas Loafers
    for side in [-1, 1]:
        sx = side * 8.0
        # Thigh
        bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=4.9, depth=19.0, location=(sx, 14, 15))
        thigh = bpy.context.active_object
        thigh.name = f"satsuki_thigh_{side}"
        thigh.rotation_euler = (math.radians(72), math.radians(side * 5), 0)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        assign_cylindrical_uvs(thigh.data, (0.02, 0.52, 0.48, 0.98))
        parts.append(thigh)

        # Shin / Calf with White Crew Socks
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=3.7, depth=16.0, location=(sx, 27, 8))
        shin = bpy.context.active_object
        shin.name = f"satsuki_shin_{side}"
        shin.rotation_euler = (math.radians(28), 0, 0)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        # White socks: U [0.52, 0.74], V [0.02, 0.20]
        assign_cylindrical_uvs(shin.data, (0.52, 0.02, 0.74, 0.20))
        parts.append(shin)

        # Sock Cuff (folded ring)
        bpy.ops.mesh.primitive_torus_add(major_segments=12, minor_segments=6, major_radius=3.9, minor_radius=0.7, location=(sx, 26, 11))
        cuff = bpy.context.active_object
        cuff.name = f"satsuki_cuff_{side}"
        cuff.rotation_euler = (math.radians(28), 0, 0)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        assign_box_uvs(cuff.data, (0.52, 0.02, 0.74, 0.20))
        parts.append(cuff)

        # Canvas Loafers with Sole Trim
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=4.5, location=(sx, 35, 3))
        shoe = bpy.context.active_object
        shoe.name = f"satsuki_shoe_{side}"
        shoe.scale = (0.85, 1.55, 0.65)
        bpy.ops.object.transform_apply(scale=True)
        assign_box_uvs(shoe.data, (0.76, 0.02, 0.98, 0.20))
        parts.append(shoe)

    # 7. Join all parts into single mesh
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    satsuki = bpy.context.active_object
    satsuki.name = "satsuki"

    # 8. Apply all transforms
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # 9. Set seat contact point strictly at Z = 0.0
    pelvis_verts = [v.co.z for v in satsuki.data.vertices if abs(v.co.x) < 15 and -25 < v.co.y < 5]
    pelvis_z = min(pelvis_verts) if pelvis_verts else min(v.co.z for v in satsuki.data.vertices)
    for v in satsuki.data.vertices:
        v.co.z -= pelvis_z

    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

    # 10. Calibration scaling: Mario seated height is 119.41 cm
    current_height = max(v.co.z for v in satsuki.data.vertices)
    scale_factor = 119.408 / current_height
    satsuki.scale = (scale_factor, scale_factor, scale_factor)
    bpy.ops.object.transform_apply(scale=True)

    final_height = max(v.co.z for v in satsuki.data.vertices)
    min_x = min(v.co.x for v in satsuki.data.vertices)
    max_x = max(v.co.x for v in satsuki.data.vertices)
    min_y = min(v.co.y for v in satsuki.data.vertices)
    max_y = max(v.co.y for v in satsuki.data.vertices)
    total_triangles = sum(len(p.vertices) - 2 for p in satsuki.data.polygons)

    print(f"=== High-Fidelity Satsuki Model ===")
    print(f"  Triangles: {total_triangles}")
    print(f"  Width (X): {max_x - min_x:.2f} cm (range [{min_x:.2f}, {max_x:.2f}])")
    print(f"  Height (Z): {final_height:.2f} cm (target: 119.41 cm)")
    print(f"  Depth (Y): {max_y - min_y:.2f} cm (range [{min_y:.2f}, {max_y:.2f}])")

    # Save .blend
    blend_path = os.path.join(pipeline_dir, "satsuki.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Saved {blend_path}")

    # Export Collada DAE
    collada_data = extract_mesh_for_collada(satsuki, swap_yz=True)
    out_dae = "public/wii/satsuki/model.dae"
    export_collada_dae(collada_data, out_dae, "satsuki_all.png", "satsuki_all_tx")
    print(f"Exported {out_dae} ({len(collada_data['triangles'])} triangles)")

    return satsuki

if __name__ == "__main__":
    build_satsuki_high_fidelity()
