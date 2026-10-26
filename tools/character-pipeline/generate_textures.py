"""
Generate texture atlases for Satsuki and Totoro, as well as customized kart liveries.
Uses PIL to produce 1024x1024 atlases with baked eyes and crisp details.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_totoro_atlas(output_path):
    size = 1024
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Palette
    GREY_MAIN = (125, 132, 138, 255)
    GREY_DARK = (92, 98, 104, 255)
    GREY_SHADOW = (75, 80, 85, 255)
    CREAM_BELLY = (242, 238, 222, 255)
    CHEVRON_GREY = (110, 116, 122, 255)
    EYE_WHITE = (250, 250, 250, 255)
    EYE_BLACK = (20, 20, 22, 255)
    NOSE_BLACK = (35, 35, 38, 255)
    CLAW_DARK = (45, 45, 48, 255)
    PINK_INNER_EAR = (175, 155, 155, 255)

    # 1. Base Grey Fur (Top-Left 512x512: Main body, head, ears, arms, legs)
    draw.rectangle([0, 0, 512, 512], fill=GREY_MAIN)
    # Add subtle soft shading/gradient
    for y in range(512):
        shade = int(12 * math.sin(y / 512 * math.pi))
        c = (GREY_MAIN[0] - shade, GREY_MAIN[1] - shade, GREY_MAIN[2] - shade, 255)
        draw.line([(0, y), (511, y)], fill=c)

    # Inner Ear zone: [0, 400, 150, 512]
    draw.rectangle([0, 400, 150, 512], fill=PINK_INNER_EAR)

    # 2. Cream Belly (Top-Right 512x512: [512, 0, 1024, 512])
    draw.rectangle([512, 0, 1024, 512], fill=CREAM_BELLY)
    # Draw soft rim shading
    for i in range(16):
        draw.rectangle([512 + i, i, 1024 - i, 512 - i], outline=(230 - i, 225 - i, 210 - i, 255))
    
    # Draw Chevrons (characteristic Totoro belly markings: ^ ^ ^)
    # Top row (3 chevrons)
    def draw_chevron(cx, cy, scale=1.0):
        w = int(36 * scale)
        h = int(24 * scale)
        th = int(7 * scale)
        pts_outer = [(cx - w, cy + h), (cx, cy), (cx + w, cy + h)]
        pts_inner = [(cx + w, cy + h - th), (cx, cy - th), (cx - w, cy + h - th)]
        draw.polygon(pts_outer + pts_inner, fill=CHEVRON_GREY)

    # Row 1: 3 chevrons
    draw_chevron(640, 120, 1.2)
    draw_chevron(768, 110, 1.3)
    draw_chevron(896, 120, 1.2)

    # Row 2: 4 chevrons
    draw_chevron(590, 220, 1.1)
    draw_chevron(710, 210, 1.2)
    draw_chevron(826, 210, 1.2)
    draw_chevron(946, 220, 1.1)

    # 3. Face Zone (Bottom-Left: [0, 512, 512, 1024])
    # Face base fur
    draw.rectangle([0, 512, 512, 1024], fill=GREY_MAIN)

    # Totoro Eyes: wide white circles with small dark pupils
    # Left eye center (170, 680), Right eye center (342, 680)
    for cx in [170, 342]:
        draw.ellipse([cx - 48, 680 - 48, cx + 48, 680 + 48], fill=EYE_WHITE, outline=GREY_DARK, width=3)
        draw.ellipse([cx - 16, 680 - 16, cx + 16, 680 + 16], fill=EYE_BLACK)
        # Specular glint
        draw.ellipse([cx - 6, 680 - 10, cx + 2, 680 - 2], fill=(255, 255, 255, 255))

    # Totoro Nose: inverted rounded triangle at (256, 730)
    draw.polygon([(242, 722), (270, 722), (256, 742)], fill=NOSE_BLACK)

    # Whiskers: 3 on each cheek
    whisker_color = (40, 42, 45, 230)
    for side, base_x in [(-1, 100), (1, 412)]:
        for dy, angle in [(-18, -10), (0, 0), (18, 10)]:
            x1 = base_x
            y1 = 740 + dy
            x2 = base_x + side * 85
            y2 = y1 + angle
            draw.line([(x1, y1), (x2, y2)], fill=whisker_color, width=4)

    # Gentle grin mouth
    draw.arc([190, 750, 322, 820], start=20, end=160, fill=(50, 52, 55, 255), width=4)

    # 4. Details Zone (Bottom-Right: [512, 512, 1024, 1024]: claws, pads, shadows)
    draw.rectangle([512, 512, 1024, 1024], fill=GREY_DARK)
    # Claws patch
    draw.rectangle([512, 512, 768, 768], fill=CLAW_DARK)
    for x in range(520, 760, 40):
        draw.polygon([(x, 520), (x + 20, 520), (x + 10, 560)], fill=(20, 20, 22, 255))

    # Dark shadow/foot soles
    draw.rectangle([768, 512, 1024, 768], fill=(60, 64, 68, 255))

    # Save
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, format='PNG')
    print(f"Created Totoro atlas: {output_path} ({size}x{size})")


def create_satsuki_atlas(output_path):
    size = 1024
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Palette - Satsuki Kusakabe
    SKIN_LIGHT = (255, 228, 208, 255)
    SKIN_SHADOW = (235, 202, 180, 255)
    SHIRT_YELLOW = (248, 218, 48, 255)
    SHIRT_SHADOW = (222, 188, 30, 255)
    COLLAR_WHITE = (248, 248, 250, 255)
    SKIRT_ORANGE = (235, 95, 32, 255)
    SKIRT_DARK = (195, 68, 18, 255)
    HAIR_DARK = (38, 32, 34, 255)
    HAIR_HIGHLIGHT = (65, 55, 58, 255)
    EYE_BROWN = (42, 28, 24, 255)
    EYE_WHITE = (252, 252, 254, 255)
    SHOE_DARK = (40, 36, 42, 255)
    SOCK_WHITE = (240, 240, 244, 255)

    # 1. Skin & Face (Top-Left: [0, 0, 512, 512])
    draw.rectangle([0, 0, 512, 512], fill=SKIN_LIGHT)
    # Face details (eyes, blush, mouth) in [100, 100, 412, 412]
    # Satsuki Anime Eyes
    def draw_anime_eye(cx, cy):
        # White sclera
        draw.ellipse([cx - 40, cy - 50, cx + 40, cy + 50], fill=EYE_WHITE, outline=HAIR_DARK, width=3)
        # Upper thick eyelid / lash line
        draw.arc([cx - 44, cy - 58, cx + 44, cy + 10], start=190, end=350, fill=HAIR_DARK, width=6)
        # Iris (dark brown / black)
        draw.ellipse([cx - 28, cy - 42, cx + 28, cy + 42], fill=EYE_BROWN)
        draw.ellipse([cx - 18, cy - 30, cx + 18, cy + 30], fill=(15, 12, 12, 255))
        # Highlights
        draw.ellipse([cx - 18, cy - 32, cx - 4, cy - 14], fill=(255, 255, 255, 255))
        draw.ellipse([cx + 6, cy + 4, cx + 14, cy + 14], fill=(255, 255, 255, 220))
        # Eyebrow
        draw.arc([cx - 36, cy - 78, cx + 36, cy - 35], start=200, end=340, fill=HAIR_DARK, width=5)

    draw_anime_eye(170, 220)
    draw_anime_eye(342, 220)

    # Cute nose dot & friendly smile
    draw.polygon([(253, 275), (259, 275), (256, 281)], fill=SKIN_SHADOW)
    draw.arc([220, 285, 292, 335], start=25, end=155, fill=(180, 55, 55, 255), width=5)

    # Cheerful cheek blush
    draw.ellipse([110, 270, 175, 305], fill=(255, 185, 185, 140))
    draw.ellipse([337, 270, 402, 305], fill=(255, 185, 185, 140))

    # 2. Yellow Shirt & White Collar (Top-Right: [512, 0, 1024, 512])
    draw.rectangle([512, 0, 1024, 512], fill=SHIRT_YELLOW)
    # Shirt vertical seams & subtle shading
    for y in range(0, 512, 32):
        draw.line([(512, y), (1024, y)], fill=SHIRT_SHADOW, width=2)
    # White collar band at top
    draw.rectangle([512, 0, 1024, 80], fill=COLLAR_WHITE)
    draw.line([(512, 80), (1024, 80)], fill=(200, 200, 205, 255), width=3)
    # Collar V-shape split
    draw.polygon([(768, 80), (740, 140), (796, 140)], fill=COLLAR_WHITE)

    # 3. Orange Skirt (Bottom-Left: [0, 512, 512, 1024])
    draw.rectangle([0, 512, 512, 1024], fill=SKIRT_ORANGE)
    # Pleats: alternating darker/lighter vertical bands
    pleat_w = 32
    for x in range(0, 512, pleat_w * 2):
        draw.rectangle([x, 512, x + pleat_w, 1024], fill=SKIRT_DARK)

    # 4. Hair, Shoes & Socks (Bottom-Right: [512, 512, 1024, 1024])
    # Hair zone: [512, 512, 1024, 800]
    draw.rectangle([512, 512, 1024, 800], fill=HAIR_DARK)
    for y in range(520, 800, 18):
        draw.line([(512, y), (1024, y)], fill=HAIR_HIGHLIGHT, width=2)

    # Socks zone: [512, 800, 768, 1024]
    draw.rectangle([512, 800, 768, 1024], fill=SOCK_WHITE)
    draw.line([(512, 840), (768, 840)], fill=(190, 190, 195, 255), width=3)

    # Shoes zone: [768, 800, 1024, 1024]
    draw.rectangle([768, 800, 1024, 1024], fill=SHOE_DARK)
    draw.rectangle([800, 840, 992, 880], fill=(65, 60, 68, 255)) # buckle / strap highlight

    # Save
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, format='PNG')
    print(f"Created Satsuki atlas: {output_path} ({size}x{size})")


def create_kart_liveries():
    # 1. Medium Kart: body_satsuki.png in public/wii/kart/medium/
    # Based on body_mr.png, recolored to Satsuki yellow/orange
    med_src = 'public/wii/kart/medium/body_mr.png'
    med_dst = 'public/wii/kart/medium/body_satsuki.png'
    if os.path.exists(med_src):
        src_img = Image.open(med_src).convert('RGBA')
        w, h = src_img.size
        pixels = src_img.load()
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                # Mario red parts (high red, lower green & blue)
                if r > 120 and r > g * 1.3 and r > b * 1.3:
                    # Turn Mario red into Satsuki cheerful sunny yellow / warm orange
                    if y < h * 0.45:
                        # Upper hood: sunny golden yellow
                        pixels[x, y] = (int(min(255, r * 1.1)), int(min(255, r * 0.85)), int(b * 0.4), a)
                    else:
                        # Lower / nose: warm bright orange
                        pixels[x, y] = (int(min(255, r * 1.05)), int(min(255, r * 0.52)), int(b * 0.3), a)
        src_img.save(med_dst, format='PNG')
        print(f"Created Satsuki kart livery: {med_dst}")

    # 2. Large Kart: body_totoro.png in public/wii/kart/large/
    # Based on body_dk.png, recolored to Totoro forest grey / moss teal
    large_src = 'public/wii/kart/large/body_dk.png'
    large_dst = 'public/wii/kart/large/body_totoro.png'
    if os.path.exists(large_src):
        src_img = Image.open(large_src).convert('RGBA')
        w, h = src_img.size
        pixels = src_img.load()
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                # DK yellow/brown panels
                lum = int(0.299 * r + 0.587 * g + 0.114 * b)
                # Remap into forest moss teal / slate grey
                tr = int(lum * 0.55 + 25)
                tg = int(lum * 0.72 + 35)
                tb = int(lum * 0.75 + 40)
                pixels[x, y] = (tr, tg, tb, a)
        src_img.save(large_dst, format='PNG')
        print(f"Created Totoro kart livery: {large_dst}")


if __name__ == '__main__':
    create_totoro_atlas('public/wii/totoro/totoro_all.png')
    create_satsuki_atlas('public/wii/satsuki/satsuki_all.png')
    create_kart_liveries()
