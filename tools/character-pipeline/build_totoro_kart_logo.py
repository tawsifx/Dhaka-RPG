"""
Process and export Totoro Kart title logo with transparent alpha channel
matching the iconic Mario Kart 64 design aesthetic.
"""

import os
from PIL import Image
import numpy as np

def build_totoro_kart_logo():
    src_path = '/Users/tawsifx/.gemini/antigravity/brain/6c97bfac-da08-49e4-b7eb-834f1aca8c76/totoro_kart_64_logo_black_bg_1793029833884.jpg'
    if not os.path.exists(src_path):
        print(f"Source image not found: {src_path}")
        return

    im = Image.open(src_path).convert('RGBA')
    arr = np.array(im)

    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    
    # 1. Background threshold for clean black removal
    is_bg = (r < 12) & (g < 12) & (b < 12)
    arr[is_bg, 3] = 0

    # 2. Smooth anti-aliased alpha edge transition
    is_near_bg = (r < 25) & (g < 25) & (b < 25) & ~is_bg
    avg_val = (r[is_near_bg].astype(float) + g[is_near_bg] + b[is_near_bg]) / 3.0
    arr[is_near_bg, 3] = np.clip((avg_val - 12) / 13.0 * 255, 0, 255).astype(np.uint8)

    res = Image.fromarray(arr)
    bbox = res.getbbox()
    cropped = res.crop(bbox)
    cw, ch = cropped.size

    # 3. Canvas fitting (256x128 standard MK64 native menu resolution)
    canvas = Image.new('RGBA', (256, 128), (0, 0, 0, 0))
    scale = min(248.0 / cw, 122.0 / ch)
    new_w, new_h = int(cw * scale), int(ch * scale)
    scaled = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

    ox = (256 - new_w) // 2
    oy = (128 - new_h) // 2
    canvas.paste(scaled, (ox, oy), scaled)

    # 4. Save to destination assets
    dest_dir = 'public/mk64/menu'
    os.makedirs(dest_dir, exist_ok=True)
    
    # Backup original if not already backed up
    orig = os.path.join(dest_dir, 'logo_mario_kart_64.png')
    backup = os.path.join(dest_dir, 'logo_mario_kart_64_original.png')
    if os.path.exists(orig) and not os.path.exists(backup):
        os.rename(orig, backup)
        print(f"Backed up original logo to: {backup}")

    # Save as both logo_totoro_kart.png and logo_mario_kart_64.png
    totoro_logo = os.path.join(dest_dir, 'logo_totoro_kart.png')
    canvas.save(totoro_logo, format='PNG')
    canvas.save(orig, format='PNG')
    print(f"Saved Totoro Kart logo to:\n  - {totoro_logo}\n  - {orig}")

    # Also generate high-resolution 1024x512 HD logo
    hd_canvas = Image.new('RGBA', (1024, 512), (0, 0, 0, 0))
    hd_scale = min(992.0 / cw, 488.0 / ch)
    hd_w, hd_h = int(cw * hd_scale), int(ch * hd_scale)
    hd_scaled = cropped.resize((hd_w, hd_h), Image.Resampling.LANCZOS)
    hd_ox = (1024 - hd_w) // 2
    hd_oy = (512 - hd_h) // 2
    hd_canvas.paste(hd_scaled, (hd_ox, hd_oy), hd_scaled)

    hd_dir = 'public/mk64-hd/menu'
    os.makedirs(hd_dir, exist_ok=True)
    hd_orig = os.path.join(hd_dir, 'logo_mario_kart_64.png')
    hd_totoro = os.path.join(hd_dir, 'logo_totoro_kart.png')
    hd_canvas.save(hd_orig, format='PNG')
    hd_canvas.save(hd_totoro, format='PNG')
    print(f"Saved HD Totoro Kart logo to:\n  - {hd_totoro}\n  - {hd_orig}")

if __name__ == '__main__':
    build_totoro_kart_logo()
