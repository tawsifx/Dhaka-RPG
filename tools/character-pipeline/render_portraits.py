import bpy
import math
import os

def setup_render(output_path, res_x=64, res_y=64):
    scene = bpy.context.scene
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.filepath = output_path

def render_satsuki():
    blend_path = os.path.abspath('tools/character-pipeline/satsuki.blend')
    bpy.ops.wm.open_mainfile(filepath=blend_path)
    
    mat = bpy.data.materials.new(name="mat_satsuki")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    tex_node = mat.node_tree.nodes.new("ShaderNodeTexImage")
    tex_path = os.path.abspath("public/wii/satsuki/satsuki_all.png")
    tex_node.image = bpy.data.images.load(tex_path)
    mat.node_tree.links.new(bsdf.inputs["Base Color"], tex_node.outputs["Color"])
    
    obj = bpy.data.objects.get("satsuki")
    if obj:
        obj.data.materials.clear()
        obj.data.materials.append(mat)
        
    scene = bpy.context.scene
    setup_render('/tmp/satsuki_head_temp.png', 128, 128)
    
    for o in list(scene.objects):
        if o.type == 'LIGHT':
            bpy.data.objects.remove(o, do_unlink=True)
            
    sun = bpy.data.lights.new(name="FrontLight", type='SUN')
    sun.energy = 4.0
    s_obj = bpy.data.objects.new(name="FrontLight", object_data=sun)
    scene.collection.objects.link(s_obj)
    s_obj.rotation_euler = (math.radians(75), 0, math.radians(175))
    
    fill = bpy.data.lights.new(name="Fill", type='SUN')
    fill.energy = 2.5
    f_obj = bpy.data.objects.new(name="Fill", object_data=fill)
    scene.collection.objects.link(f_obj)
    f_obj.rotation_euler = (math.radians(60), math.radians(20), math.radians(-160))
    
    cam_data = bpy.data.cameras.new(name="PortraitCam")
    cam_data.lens = 75
    cam_obj = bpy.data.objects.new(name="PortraitCam", object_data=cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj
    
    cam_x, cam_y, cam_z = 3.0, 80.0, 96.0
    target_x, target_y, target_z = 0.0, 0.0, 96.0
    cam_obj.location = (cam_x, cam_y, cam_z)
    
    dx = target_x - cam_x
    dy = target_y - cam_y
    dz = target_z - cam_z
    yaw = math.atan2(dx, dy)
    pitch = math.atan2(dz, math.hypot(dx, dy))
    cam_obj.rotation_euler = (math.radians(90) - pitch, 0, -yaw)
    
    bpy.ops.render.render(write_still=True)
    print("Satsuki portrait rendered to /tmp/satsuki_head_temp.png")

def render_totoro():
    blend_path = os.path.abspath('tools/character-pipeline/totoro.blend')
    bpy.ops.wm.open_mainfile(filepath=blend_path)
    
    setup_render('/tmp/totoro_head_temp.png', 128, 128)
    scene = bpy.context.scene
    
    for o in list(scene.objects):
        if o.type == 'LIGHT':
            bpy.data.objects.remove(o, do_unlink=True)
            
    sun = bpy.data.lights.new(name="FrontLight", type='SUN')
    sun.energy = 4.0
    s_obj = bpy.data.objects.new(name="FrontLight", object_data=sun)
    scene.collection.objects.link(s_obj)
    s_obj.rotation_euler = (math.radians(75), 0, math.radians(175))
    
    fill = bpy.data.lights.new(name="Fill", type='SUN')
    fill.energy = 2.0
    f_obj = bpy.data.objects.new(name="Fill", object_data=fill)
    scene.collection.objects.link(f_obj)
    f_obj.rotation_euler = (math.radians(60), math.radians(-20), math.radians(140))
    
    cam_data = bpy.data.cameras.new(name="PortraitCam")
    cam_data.lens = 55
    cam_obj = bpy.data.objects.new(name="PortraitCam", object_data=cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj
    
    # Totoro's head & ears from front (+Y)
    cam_x, cam_y, cam_z = 10.0, 135.0, 115.0
    target_x, target_y, target_z = 0.0, 0.0, 108.0
    cam_obj.location = (cam_x, cam_y, cam_z)
    dx = target_x - cam_x
    dy = target_y - cam_y
    dz = target_z - cam_z
    yaw = math.atan2(dx, dy)
    pitch = math.atan2(dz, math.hypot(dx, dy))
    cam_obj.rotation_euler = (math.radians(90) - pitch, 0, -yaw)
    
    bpy.ops.render.render(write_still=True)
    print("Totoro portrait rendered to /tmp/totoro_head_temp.png")

if __name__ == '__main__':
    render_satsuki()
    render_totoro()
