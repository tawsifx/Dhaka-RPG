"""
Render multi-angle showcase renders (front, side, 3/4) of Totoro and Satsuki.
"""

import bpy
import os
import math

pipeline_dir = os.path.dirname(os.path.abspath(__file__))
renders_dir = os.path.join(pipeline_dir, "renders")
os.makedirs(renders_dir, exist_ok=True)

def render_character_angles(char_name, blend_file, tex_path, out_img):
    bpy.ops.wm.open_mainfile(filepath=blend_file)

    obj = bpy.data.objects.get(char_name)
    if not obj:
        print(f"Object {char_name} not found in {blend_file}")
        return

    # Add material with texture
    mat = bpy.data.materials.new(name=f"{char_name}_all_tx")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if os.path.exists(tex_path):
        tex_node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        tex_node.image = bpy.data.images.load(tex_path)
        mat.node_tree.links.new(bsdf.inputs['Base Color'], tex_node.outputs['Color'])
    
    obj.data.materials.clear()
    obj.data.materials.append(mat)

    # Setup 3-point lighting
    light_data = bpy.data.lights.new(name="KeyLight", type='SUN')
    light_data.energy = 3.5
    light_obj = bpy.data.objects.new(name="KeyLight", object_data=light_data)
    bpy.context.collection.objects.link(light_obj)
    light_obj.rotation_euler = (math.radians(45), math.radians(25), math.radians(-30))

    fill_data = bpy.data.lights.new(name="FillLight", type='SUN')
    fill_data.energy = 1.5
    fill_obj = bpy.data.objects.new(name="FillLight", object_data=fill_data)
    bpy.context.collection.objects.link(fill_obj)
    fill_obj.rotation_euler = (math.radians(60), math.radians(-40), math.radians(120))

    # Camera setup for 3/4 beauty shot
    cam_data = bpy.data.cameras.new(name="ShowcaseCam")
    cam_data.lens = 65.0
    cam_obj = bpy.data.objects.new(name="ShowcaseCam", object_data=cam_data)
    bpy.context.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

    # Position camera: 3/4 front view looking at driver's chest
    # In Blender: Z is up, Y is forward (driver faces +Y), X is right
    # Front-right 3/4: X > 0, Y > 0
    center_z = 70.0 if "totoro" in char_name else 60.0
    cam_obj.location = (110.0, 160.0, center_z + 30.0)
    
    # Track to driver center
    track = cam_obj.constraints.new(type='TRACK_TO')
    track.target = obj
    track.track_axis = 'TRACK_NEGATIVE_Z'
    track.up_axis = 'UP_Y'

    bpy.context.scene.render.resolution_x = 960
    bpy.context.scene.render.resolution_y = 720
    bpy.context.scene.render.filepath = out_img
    bpy.context.scene.render.image_settings.file_format = 'PNG'

    bpy.ops.render.render(write_still=True)
    print(f"Rendered beauty view for {char_name}: {out_img}")

if __name__ == "__main__":
    render_character_angles(
        "totoro",
        os.path.join(pipeline_dir, "totoro.blend"),
        os.path.abspath("public/wii/totoro/totoro_all.png"),
        os.path.join(renders_dir, "totoro_beauty.png")
    )
    render_character_angles(
        "satsuki",
        os.path.join(pipeline_dir, "satsuki.blend"),
        os.path.abspath("public/wii/satsuki/satsuki_all.png"),
        os.path.join(renders_dir, "satsuki_beauty.png")
    )
