# MarioKart64JS 3D Character Modeling Specification
> **Canonical Blueprint for Generating Drop-In 3D Racers (Satsuki & Totoro)**

---

## 1. Overview & Architectural Blueprint

In MarioKart64JS, 3D karts and racers (enabled via the `3` key or `?3d=3d` parameter) are rendered using a **modular two-part assembly**:

```
                         ┌─────────────────────────────┐
                         │   Full 3D Kart Assembly     │
                         │    (kart3d.js: buildWiiKart)│
                         └──────────────┬──────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
     ┌───────────────────────┐                     ┌───────────────────────┐
     │   Kart Chassis & Tires│                     │     Seated Driver     │
     │  public/wii/kart/<cls>│                     │  public/wii/<char>/   │
     │  (body.dae + tires)   │                     │      (model.dae)      │
     └───────────────────────┘                     └───────────────────────┘
```

1. **The Kart Chassis & Wheels** (`public/wii/kart/<class>/`):
   - Shared geometry for each weight category (`small`, `medium`, `large`).
   - Renders the frame, steering column, front steering knuckles, spinning tires, engine nozzles, and twin exhaust pipes.
   - Uses a swappable 256×128 diffuse texture livery per character (`body_<suffix>.png`).
2. **The Seated Driver Figure** (`public/wii/<char>/model.dae`):
   - A single static mesh frozen in a **seated driving pose**.
   - Anchored at the hip/pelvis origin `(0, 0, 0)` and placed into the cockpit using a fine-tuned seat offset `seat: [y, z]`.
   - Does not require complex bone armatures or dynamic skeletal skinning inside the race loop; the driver's chassis handles all velocity, pitch, roll, and steering tilt.

---

## 2. Reference Case Studies: Mario vs. Donkey Kong

| Specification | Mario (`medium`) | Donkey Kong (`large`) | Target: Satsuki (`small` or `medium`) | Target: Totoro (`large`) |
| :--- | :--- | :--- | :--- | :--- |
| **Weight Class** | `medium` | `large` | `small` (or `medium`) | `large` |
| **Kart Chassis Folder** | `kart/medium/` | `kart/large/` | `kart/small/` (or `medium/`) | `kart/large/` |
| **Kart Livery Texture** | `body_mr.png` (Red #E52521) | `body_dk.png` (Yellow/Brown) | `body_satsuki.png` (Bright Orange/Yellow) | `body_totoro.png` (Forest Grey/Teal) |
| **Driver Folder** | `public/wii/mario/` | `public/wii/donkeykong/` | `public/wii/satsuki/` | `public/wii/totoro/` |
| **Model Filename** | `model.dae` | `model.dae` | `model.dae` | `model.dae` |
| **Triangle Count** | ~675 triangles | ~1,173 triangles | Target: 800–1,500 triangles | Target: 1,200–2,200 triangles |
| **Primary Texture** | `mario_all.png` (512×512) | `donkey_all.png` (512×512) | `satsuki_all.png` (512×512 or 1024) | `totoro_all.png` (512×512 or 1024) |
| **Eye Texture** | `mario_eye.0.png` (`_eye_tx`) | `donkey_eye.0.png` (`_eye_tx`) | On main atlas or `satsuki_eye.png` | On main atlas or `totoro_eye.png` |
| **Cockpit Seat Offset** | `[0.06, -0.12]` | `[0.13, -0.02]` | `[0.06, -0.08]` | `[0.14, 0.04]` |

---

## 3. Coordinate System & Scale Conventions

To ensure zero clipping and proper physics alignment in Three.js, all driver meshes **must** adhere strictly to the following conventions:

* **Units:** Centimeters in Collada XML:
  ```xml
  <unit meter="0.01" name="centimeter" />
  <up_axis>Y_UP</up_axis>
  ```
  *Three.js `ColladaLoader` reads this tag and automatically scales the model by `0.01` to meters. The runtime then multiplies by `SCALE = 1.9`.*
* **Orientation:**
  - **Forward:** `+Z` (Facing positive Z). *Note: `kart3d.js` automatically rotates the Wii group by 180° (`Math.PI`) to match Three.js world negative Z.*
  - **Up:** `+Y` (Positive Y is up).
  - **Right:** `+X` (Character's right side is along positive X; left is negative X).
* **Pivot / Origin `(0, 0, 0)`:**
  - Placed at the **lowest central point of the pelvis / buttocks** (the point where the character touches the seat cushion).
  - Do **not** place the origin between the feet on the ground—in a kart, the character is seated.

---

## 4. Seated Pose & Anatomical Geometry

When prompting 3D GenAI agents or sculpting in Blender, the character must be in an authentic **seated kart driver pose**:

```
        (Head tilted forward ~5°)
               [O]
              / | \
 (Hands forward)  |  (Reclined spine ~10-15°)
       [O===O]    |
         \       /
          \_____/  <--- ORIGIN (0, 0, 0) at seat cushion
          /     \
         /       \ (Knees bent ~80-90°)
       _L         L_ (Feet extended into footwell)
```

1. **Torso & Spine:** Tilted slightly backward by 10° to 15° to rest against the reclined kart backrest.
2. **Arms & Hands:** Reaching forward horizontally at mid-chest height. The palms should cup inward as if gripping a 24cm diameter steering wheel.
3. **Legs & Feet:**
   - Hips flexed at ~80–90°.
   - Knees bent with legs pointed straight forward along `+Z`.
   - Feet rested flat or angled down into the pedal bay.
4. **Special Considerations for Totoro:**
   - Because Totoro has a massive spherical belly, his arms must wrap naturally around his front towards the wheel.
   - Totoro's short legs should poke forward along the sides of the steering column.
   - Set weight class to `large` to give him the wide, spacious Large Standard Kart chassis.
5. **Special Considerations for Satsuki:**
   - Energetic posture, upright head with windblown hair.
   - Slim limbs; hands comfortably centered.
   - Fits best in `small` or `medium` class.

---

## 5. Textures & Material Specification

### A. Material Setup
The driver model can use 1 or 2 standard materials:
1. **Body Material (`<char>_all_tx`):**
   - Single baked diffuse/albedo texture atlas (PNG, no transparency required for body).
   - Maps the face, clothing, fur, ears, shoes, and details.
2. **Optional Eye Material (`<char>_eye_tx`):**
   - In original Wii models, a single eye texture was mirrored horizontally (`wrapS = MirroredRepeatWrapping`, `repeat.x = 2`).
   - *For AI-generated models:* It is simpler to bake the eyes **directly into the main character diffuse atlas** (`<char>_all.png`) to avoid multi-material draw calls.

### B. Collada XML Format Rules
When exporting or converting to Collada (`.dae`):
1. Collapse nested `<init_from>` image tags:
   ```xml
   <!-- Correct for Three.js ColladaLoader -->
   <image id="satsuki_all-image" name="satsuki_all">
       <init_from>satsuki_all.png</init_from>
   </image>
   ```
2. Ensure `<material id="...">` includes `name="..."`:
   ```xml
   <material id="satsuki_all_tx" name="satsuki_all_tx">
       <instance_effect url="#satsuki_all_tx-fx" />
   </material>
   ```

---

## 6. Prompts for 3D AI Generation Tools

Use these exact prompt templates with 3D AI tools (e.g. **Meshy.ai**, **Tripo3D**, **Rodin**, **CSM**, or **Sloyd**):

### Prompt 1: Satsuki (Studio Ghibli)
> **Text Prompt:**
> "Low poly 3D game model of Satsuki Kusakabe from My Neighbor Totoro, dressed in her signature orange skirt, yellow shirt, and dark shoes, seated in a go-kart driving pose. Torso reclined slightly at 10 degrees, both arms reaching forward holding a steering wheel, knees bent with feet forward. Low poly retro arcade game style, clean topology under 2,000 triangles, vibrant hand-painted anime diffuse texture, symmetrical face, T-pose/sitting hybrid, clean UV map."
>
> **Target Specs:**
> - Format: OBJ, GLB, or DAE
> - Polygon Count: 1,500 – 2,500 triangles
> - Texture: 1024×1024 Diffuse PNG

### Prompt 2: Totoro (Studio Ghibli)
> **Text Prompt:**
> "Low poly 3D game model of big Totoro (My Neighbor Totoro), round grey furry body with cream-colored belly and grey arrow chevrons, pointed ears, whiskers, wide cheerful grin, frozen in a seated go-kart racing pose. Arms reaching forward in front of his round belly to grip a steering wheel, short feet pointing forward. Low poly arcade racer character style, clean manifold mesh under 2,500 triangles, hand-painted texture, no bones or rig, clean UV wrap."
>
> **Target Specs:**
> - Format: OBJ, GLB, or DAE
> - Polygon Count: 1,800 – 2,500 triangles
> - Texture: 1024×1024 Diffuse PNG

---

## 7. Automated Blender Post-Processing Script

After downloading the raw GLB/OBJ from your 3D GenAI tool, run this automated Blender Python script to center the seat origin, orient to `+Z`, scale to centimeters, and export the clean `model.dae`:

```python
# process_kart_driver.py
# Usage: blender --background --python process_kart_driver.py -- input_model.glb output_dir/ character_name
import bpy
import sys
from math import radians

argv = sys.argv[sys.argv.index("--") + 1:]
input_file, out_dir, char_name = argv[0], argv[1], argv[2]

# 1. Clear default scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Import generated mesh
if input_file.endswith('.glb') or input_file.endswith('.gltf'):
    bpy.ops.import_scene.gltf(filepath=input_file)
elif input_file.endswith('.obj'):
    bpy.ops.wm.obj_import(filepath=input_file)

# 3. Select active mesh
mesh_objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in mesh_objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = mesh_objs[0]

# 4. Join into single mesh if split
if len(mesh_objs) > 1:
    bpy.ops.object.join()
obj = bpy.context.active_object

# 5. Position origin at lowest center point of pelvis / hips
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
# Set origin to lowest Z center
min_z = min([v.co.z for v in obj.data.vertices])
obj.location.z -= min_z
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# 6. Scale to Wii Centimeters (Mario is ~120 cm tall seated, Totoro ~150 cm seated)
# If exported in meters, scale by 100
current_height = obj.dimensions.z
target_height = 120.0 if "satsuki" in char_name else 145.0
scale_factor = target_height / current_height if current_height > 0 else 1.0
obj.scale = (scale_factor, scale_factor, scale_factor)
bpy.ops.object.transform_apply(scale=True)

# 7. Triangulate mesh for web runtime
modifier = obj.modifiers.new(name="Triangulate", type='TRIANGULATE')
bpy.ops.object.modifier_apply(modifier="Triangulate")

# 8. Export Collada (.dae)
out_dae = f"{out_dir}/model.dae"
bpy.ops.wm.collada_export(
    filepath=out_dae,
    check_existing=False,
    apply_modifiers=True,
    include_uv_textures=True,
    include_material_textures=True,
    use_texture_copies=True,
    triangulate=True
)
print(f"✅ Successfully exported driver {char_name} to {out_dae}")
```

---

## 8. Integration in `src/scenes/minigames/race/kart3d.js`

Once the model files are placed into `public/wii/<char>/`:
```
public/wii/
├── satsuki/
│   ├── model.dae
│   └── satsuki_all.png
└── totoro/
    ├── model.dae
    └── totoro_all.png
```

Register their archetypes in `CHARS` inside [`src/scenes/minigames/race/kart3d.js`](file:///Users/tawsifx/Desktop/dhaka-date-rpg/src/scenes/minigames/race/kart3d.js#L30):

```javascript
const CHARS = {
  // Existing drivers...
  mario: { cls: 'medium', body: 'body_mr.png', seat: [0.06, -0.12] },
  
  // Custom Ghibli additions:
  satsuki: { 
    cls: 'medium',                 // Fits medium kart chassis
    body: 'body_satsuki.png',      // Custom yellow/orange livery in public/wii/kart/medium/
    eyeRepeat: 1, 
    seat: [0.06, -0.10]            // [Y vertical lift, Z fore/aft shift]
  },
  totoro: { 
    cls: 'large',                  // Fits large heavy kart chassis
    body: 'body_totoro.png',       // Custom green/forest livery in public/wii/kart/large/
    eyeRepeat: 1, 
    seat: [0.14, 0.04]             // Pushed slightly forward & up over the rear axle
  }
};
```

---

## 9. QA Checklist

Before committing new characters:
- [ ] **Check Seat Depth:** The bottom of the pelvis rests on the cushion; no gap below buttocks and no clipping through the seat bottom.
- [ ] **Check Wheel Reach:** Hands are positioned over or near the steering wheel rim.
- [ ] **Check Forward Heading:** Character faces forward along the direction of travel (not backward or sideways).
- [ ] **File Size Budget:** Total driver directory under **2.5 MB** for instant web downloads.
- [ ] **Shadow Map Test:** Verify the dynamic shadow cast by the driver cleanly projects onto the track pavement.
