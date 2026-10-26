"""
Collada (DAE) exporter for Dhaka RPG / MK64 Wii drivers.
Produces pristine Collada files tailored for Three.js ColladaLoader:
- Unit: meter="0.01" name="centimeter"
- Axis: Y_UP (facing +Z, right is +X)
- Collapsed <init_from> tags (e.g. <init_from>texture.png</init_from>)
- Every <material> has a matching 'name' attribute
- Triangulated geometry with POSITIONS, NORMALS, and TEXCOORD
- Static mesh under instance_geometry
"""

import os
from xml.sax.saxutils import escape

def export_collada_dae(mesh_data, filepath, texture_filename, material_id, material_name=None):
    """
    mesh_data: dict containing:
      - 'positions': list of (x, y, z) floats in centimeters
      - 'normals': list of (nx, ny, nz) floats
      - 'uvs': list of (u, v) floats
      - 'triangles': list of 3-tuples of indices (pos_idx, norm_idx, uv_idx)
    """
    if material_name is None:
        material_name = material_id

    positions = mesh_data['positions']
    normals = mesh_data['normals']
    uvs = mesh_data['uvs']
    triangles = mesh_data['triangles']
    tri_count = len(triangles)

    pos_floats = " ".join(f"{p[0]:.4f} {p[1]:.4f} {p[2]:.4f}" for p in positions)
    norm_floats = " ".join(f"{n[0]:.4f} {n[1]:.4f} {n[2]:.4f}" for n in normals)
    uv_floats = " ".join(f"{uv[0]:.4f} {uv[1]:.4f}" for uv in uvs)

    # Triangle index buffer: p_idx n_idx uv_idx ...
    p_buffer = []
    for tri in triangles:
        for vert in tri:
            p_buffer.append(f"{vert[0]} {vert[1]} {vert[2]}")
    p_str = " ".join(p_buffer)

    geom_id = "driver_geometry"
    geom_name = "driver_mesh"
    effect_id = f"{material_id}-fx"
    image_id = f"{material_id}-image"

    dae_xml = f"""<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
  <asset>
    <contributor>
      <authoring_tool>Dhaka RPG Character Pipeline</authoring_tool>
    </contributor>
    <unit meter="0.01" name="centimeter"/>
    <up_axis>Y_UP</up_axis>
  </asset>
  <library_images>
    <image id="{image_id}" name="{image_id}">
      <init_from>{escape(texture_filename)}</init_from>
    </image>
  </library_images>
  <library_materials>
    <material id="{material_id}" name="{material_name}">
      <instance_effect url="#{effect_id}"/>
    </material>
  </library_materials>
  <library_effects>
    <effect id="{effect_id}" name="{material_name}">
      <profile_COMMON>
        <newparam sid="surface">
          <surface type="2D">
            <init_from>{image_id}</init_from>
          </surface>
        </newparam>
        <newparam sid="sampler">
          <sampler2D>
            <source>surface</source>
            <wrap_s>WRAP</wrap_s>
            <wrap_t>WRAP</wrap_t>
            <minfilter>LINEAR</minfilter>
            <magfilter>LINEAR</magfilter>
          </sampler2D>
        </newparam>
        <technique sid="common">
          <lambert>
            <diffuse>
              <texture texture="sampler" texcoord="TEXCOORD0"/>
            </diffuse>
          </lambert>
        </technique>
      </profile_COMMON>
    </effect>
  </library_effects>
  <library_geometries>
    <geometry id="{geom_id}" name="{geom_name}">
      <mesh>
        <source id="{geom_id}-positions">
          <float_array id="{geom_id}-positions-array" count="{len(positions) * 3}">{pos_floats}</float_array>
          <technique_common>
            <accessor source="#{geom_id}-positions-array" count="{len(positions)}" stride="3">
              <param name="X" type="float"/>
              <param name="Y" type="float"/>
              <param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>
        <source id="{geom_id}-normals">
          <float_array id="{geom_id}-normals-array" count="{len(normals) * 3}">{norm_floats}</float_array>
          <technique_common>
            <accessor source="#{geom_id}-normals-array" count="{len(normals)}" stride="3">
              <param name="X" type="float"/>
              <param name="Y" type="float"/>
              <param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>
        <source id="{geom_id}-map-0">
          <float_array id="{geom_id}-map-0-array" count="{len(uvs) * 2}">{uv_floats}</float_array>
          <technique_common>
            <accessor source="#{geom_id}-map-0-array" count="{len(uvs)}" stride="2">
              <param name="S" type="float"/>
              <param name="T" type="float"/>
            </accessor>
          </technique_common>
        </source>
        <vertices id="{geom_id}-vertices">
          <input semantic="POSITION" source="#{geom_id}-positions"/>
        </vertices>
        <triangles count="{tri_count}" material="{material_id}">
          <input semantic="VERTEX" source="#{geom_id}-vertices" offset="0"/>
          <input semantic="NORMAL" source="#{geom_id}-normals" offset="1"/>
          <input semantic="TEXCOORD" source="#{geom_id}-map-0" offset="2" set="0"/>
          <p>{p_str}</p>
        </triangles>
      </mesh>
    </geometry>
  </library_geometries>
  <library_visual_scenes>
    <visual_scene id="RootNode" name="RootNode">
      <node id="driver" name="driver" type="NODE">
        <instance_geometry url="#{geom_id}">
          <bind_material>
            <technique_common>
              <instance_material symbol="{material_id}" target="#{material_id}">
                <bind_vertex_input semantic="TEXCOORD0" input_semantic="TEXCOORD" input_set="0"/>
              </instance_material>
            </technique_common>
          </bind_material>
        </instance_geometry>
      </node>
    </visual_scene>
  </library_visual_scenes>
  <scene>
    <instance_visual_scene url="#RootNode"/>
  </scene>
</COLLADA>
"""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(dae_xml.strip() + "\n")
    print(f"Exported Collada file: {filepath} ({tri_count} triangles, {len(positions)} vertices)")
