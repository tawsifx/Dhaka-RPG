# Asset Shopping List & 3D Art Acquisition Backlog
## 3D Rickshaw Racing Mini-Game — "Tring-Tring Grand Prix"

**Project:** Totoro & Moon Walker: Chronicles of the Six Realms  
**Document:** `docs/rickshaw-race/ASSET_SHOPPING_LIST.md`  
**Milestones Audited:** M2 & M3  
**Status:** Active Backlog  

---

### 1. High-Priority 3D Art Requirements

| Asset ID | Item Name | Target Category | Specifications & Technical Constraints | Target Locations / Platforms | Status & Current Fallback |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `kart_rickshaw_dhaka` | Traditional Dhaka Cycle Rickshaw 3D Kart | 3D Vehicle GLB | • **Format:** Binary `.glb` (glTF 2.0)<br>• **Polycount:** $\le 8,000$ triangles<br>• **File Size:** $\le 1.0\text{ MB}$<br>• **Origin / Pivot:** Ground center $(0,0,0)$ between rear wheels<br>• **Node Hierarchy:** Separately addressable named nodes for `wheel_front`, `wheel_rear_left`, `wheel_rear_right`, `handlebar_fork`, and `hood_canopy`<br>• **Style:** Authentic Bengali cycle rickshaw with decorative tin-plate rear art, hood canopy, and bell | Sketchfab (CC-BY/CC0), Poly Pizza, ArtStation | **Deferred to M4/Polish.** Active fallback: Procedural Three.js hierarchy in `PlaceholderKart.ts` (Emerald green `#15803d`, gold canopy `#f59e0b`, crimson seat `#b91c1c`, functional wheel/fork pivots). |
| `prop_curzon_facade` | Curzon Hall Indo-Saracenic Façade Elements | 3D Environment Landmark | • **Format:** Low-poly `.glb`<br>• **Polycount:** $\le 12,000$ triangles<br>• **Textures:** $1024\times 1024$ terracotta red-brick atlas with horse-shoe arches and domed kiosks | In-house assembly script using 2D overworld façade textures | Sourced via spline-aligned textured façade blocks in M3 track builder. |
| `prop_tsc_rotunda` | TSC Dhaka Tea Stall & Fountain Rotunda | 3D Environment Landmark | • **Format:** Low-poly `.glb`<br>• **Polycount:** $\le 6,000$ triangles<br>• **Features:** Central fountain circular curb, umbrella tables, clay tea pots | In-house assembly | Sourced via procedural rotunda geometry and Kenney City props. |
| `sky_golden_hour` | Dhaka Golden Hour Panoramic Skybox | Environment Texture | • **Format:** Equirectangular HDR / JPG or low-cost cubemap ($\le 1\text{ MB}$)<br>• **Color:** Warm sunset glow ($3200\text{K}$), gentle smog/fog horizon | Poly Haven, OpenGameArt | Sourced in M3 track pipeline. |
| `prop_lantern_drone` | Floating Paper Lantern Rescue Drone | 3D Prop / Entity | • **Format:** Low-poly `.glb`<br>• **Polycount:** $\le 1,200$ triangles<br>• **Features:** Glowing bamboo/paper lantern frame with trailing string/hook | In-house / Kenney | Labeled lantern placeholder in M3. |

---

### 2. Sourcing Criteria & Constraints
1. **Zero Runtime Bloat:** All 3D models must be compressed via Draco or Meshopt where appropriate, keeping total initial track downloads under 8 MB.
2. **Strict Node Mapping:** Any vehicle model must provide independent wheel nodes so rotation around the X-axis (rolling) and Y-axis (steering) occurs without transforming the chassis body.
3. **Purity Invariant:** Models must load without custom shaders; PBR `MeshStandardMaterial` or unlit vertex color materials only.
