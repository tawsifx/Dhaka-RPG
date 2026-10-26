import json
from PIL import Image

def build_2d_karts():
    # 1. Satsuki: recolor Mario (1344x1024)
    mario = Image.open('public/mk64/karts/mario.png').convert('RGBA')
    sat_data = []
    for r, g, b, a in mario.getdata():
        if a > 30:
            # Mario Red (Hat & Shirt) -> Yellow shirt / orange skirt
            if r > 100 and g < 75 and b < 75:
                # Top half (hat/head) is black hair, middle is yellow shirt
                # Since we don't have per-pixel Y easily in flat data, let's map red:
                # If bright red: make bright yellow/orange
                factor = r / 255.0
                sat_data.append((int(245 * factor), int(190 * factor), int(35 * factor), a))
            # Mario Blue Overalls -> Bright Orange
            elif b > 80 and r < 80:
                factor = b / 255.0
                sat_data.append((int(235 * factor), int(96 * factor), int(32 * factor), a))
            # Mario Brown mustache / hair -> Jet black
            elif r < 100 and g < 70 and b < 50:
                sat_data.append((int(r * 0.3), int(g * 0.3), int(b * 0.3), a))
            else:
                sat_data.append((r, g, b, a))
        else:
            sat_data.append((r, g, b, a))
            
    satsuki_img = Image.new('RGBA', mario.size)
    satsuki_img.putdata(sat_data)
    satsuki_img.save('public/mk64/karts/satsuki.png')
    print("Created public/mk64/karts/satsuki.png")

    # 2. Totoro: recolor Donkey Kong (1344x1024)
    dk = Image.open('public/mk64/karts/donkeykong.png').convert('RGBA')
    tot_data = []
    for r, g, b, a in dk.getdata():
        if a > 30:
            # DK Red Tie -> Leaf green
            if r > 120 and g < 50 and b < 50:
                tot_data.append((int(45 * (r/255)), int(160 * (r/255)), int(55 * (r/255)), a))
            # DK Chest / Muzzle (light tan) -> Cream white belly
            elif r > 130 and g > 100 and b > 70 and r - b < 70:
                tot_data.append((int(r * 1.05), int(g * 1.05), int(b * 1.15), a))
            # DK Brown Fur -> Forest Grey
            elif r > 40 and g < 80:
                # Desaturate to neutral / cool slate grey
                lum = int(0.299 * r + 0.587 * g + 0.114 * b)
                tot_data.append((int(lum * 1.0), int(lum * 1.05), int(lum * 1.1), a))
            else:
                tot_data.append((r, g, b, a))
        else:
            tot_data.append((r, g, b, a))
            
    totoro_img = Image.new('RGBA', dk.size)
    totoro_img.putdata(tot_data)
    totoro_img.save('public/mk64/karts/totoro.png')
    print("Created public/mk64/karts/totoro.png")

    # 3. Update manifest.json
    manifest_path = 'public/mk64/karts/manifest.json'
    with open(manifest_path, 'r') as f:
        manifest = json.load(f)
        
    if 'drivers' in manifest:
        if 'mario' in manifest['drivers'] and 'satsuki' not in manifest['drivers']:
            manifest['drivers']['satsuki'] = manifest['drivers']['mario']
            print("Added satsuki to drivers in manifest.json")
        if 'donkeykong' in manifest['drivers'] and 'totoro' not in manifest['drivers']:
            manifest['drivers']['totoro'] = manifest['drivers']['donkeykong']
            print("Added totoro to drivers in manifest.json")
            
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    print("Updated public/mk64/karts/manifest.json")

if __name__ == '__main__':
    build_2d_karts()
