import json
from PIL import Image

import json
from PIL import Image

def build_2d_karts():
    # 1. Satsuki: transform Mario into genuine Satsuki (1344x1024, 21x16 grid of 64x64 cells)
    mario = Image.open('public/mk64/karts/mario.png').convert('RGBA')
    width, height = mario.size
    mario_pixels = mario.load()
    sat_img = Image.new('RGBA', (width, height))
    sat_pixels = sat_img.load()

    for y in range(height):
        cy = y % 64
        for x in range(width):
            r, g, b, a = mario_pixels[x, y]
            if a <= 30:
                sat_pixels[x, y] = (r, g, b, a)
                continue

            # Head region (hair and face)
            if cy <= 27:
                # Mario Red Hat -> Satsuki Jet Black Hair
                if r > 90 and g < 75 and b < 75:
                    factor = r / 255.0
                    sat_pixels[x, y] = (int(25 * factor), int(25 * factor), int(32 * factor), a)
                # Mario Brown Mustache / Sideburns -> Fair Skin (eliminate mustache)
                elif r < 120 and g < 85 and b < 70 and cy >= 19:
                    sat_pixels[x, y] = (245, 198, 172, a)
                else:
                    sat_pixels[x, y] = (r, g, b, a)
            # Torso region (Satsuki's iconic yellow shirt)
            elif cy <= 43:
                # Mario Red Shirt -> Bright Sunny Yellow
                if r > 90 and g < 80 and b < 80:
                    factor = r / 255.0
                    sat_pixels[x, y] = (int(252 * factor), int(220 * factor), int(42 * factor), a)
                # Overalls straps -> Vibrant Orange
                elif b > 75 and r < 85:
                    factor = b / 255.0
                    sat_pixels[x, y] = (int(240 * factor), int(105 * factor), int(30 * factor), a)
                else:
                    sat_pixels[x, y] = (r, g, b, a)
            # Lower body / overalls (Satsuki's orange pinafore / skirt)
            else:
                if b > 75 and r < 85:
                    factor = b / 255.0
                    sat_pixels[x, y] = (int(238 * factor), int(100 * factor), int(28 * factor), a)
                elif r > 95 and g < 80 and b < 80:
                    factor = r / 255.0
                    sat_pixels[x, y] = (int(252 * factor), int(218 * factor), int(40 * factor), a)
                else:
                    sat_pixels[x, y] = (r, g, b, a)

    sat_img.save('public/mk64/karts/satsuki.png')
    print("Created public/mk64/karts/satsuki.png")

    # 2. Totoro: transform Donkey Kong into genuine Totoro (1344x1024)
    dk = Image.open('public/mk64/karts/donkeykong.png').convert('RGBA')
    dk_pixels = dk.load()
    tot_img = Image.new('RGBA', (width, height))
    tot_pixels = tot_img.load()

    for y in range(height):
        cy = y % 64
        for x in range(width):
            r, g, b, a = dk_pixels[x, y]
            if a <= 30:
                tot_pixels[x, y] = (r, g, b, a)
                continue

            # DK Red Tie -> Totoro Cream White Belly
            if r > 115 and g < 60 and b < 60:
                tot_pixels[x, y] = (248, 244, 234, a)
            # DK Chest / Muzzle (light tan)
            elif r > 120 and g > 90 and b > 65 and r - b < 75:
                if cy < 25:
                    # Head / muzzle area -> Slate Grey face
                    tot_pixels[x, y] = (110, 120, 130, a)
                else:
                    # Chest / belly -> Cream White Belly
                    tot_pixels[x, y] = (248, 244, 234, a)
            # DK Brown Fur -> Ghibli Slate Grey Fur
            elif r > 35 and g < 85:
                lum = int(0.299 * r + 0.587 * g + 0.114 * b)
                tot_pixels[x, y] = (int(lum * 0.95), int(lum * 1.05), int(lum * 1.15), a)
            else:
                tot_pixels[x, y] = (r, g, b, a)

    tot_img.save('public/mk64/karts/totoro.png')
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

if __name__ == '__main__':
    build_2d_karts()
