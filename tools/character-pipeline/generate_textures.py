"""
Generate improved texture atlases for Satsuki and Totoro, as well as customized kart liveries.
Uses PIL to produce 1024x1024 atlases with baked eyes and crisp details.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_totoro_atlas(output_path):
    size = 1024
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Palette - Studio Ghibli Vibrant Totoro Colors
    FUR_MAIN = (93, 134, 153, 255)       # Rich, saturated Ghibli slate blue-grey
    FUR_DARK = (60, 92, 108, 255)        # Deep forest slate shadow
    FUR_LIGHT = (120, 165, 185, 255)     # Sky highlight sheen
    CREAM_BELLY = (255, 252, 238, 255)   # Luminous warm sunny cream
    CHEVRON_GREY = (42, 76, 92, 255)     # Crisp dark teal-slate chevrons
    EYE_WHITE = (255, 255, 255, 255)
    EYE_BLACK = (18, 18, 22, 255)
    NOSE_BLACK = (30, 32, 38, 255)
    CLAW_DARK = (38, 42, 48, 255)
    PINK_INNER_EAR = (235, 168, 182, 255)# Warm anime rose pink

    # 1. Base Slate Blue-Grey Fur (Top-Left 512x512)
    draw.rectangle([0, 0, 512, 512], fill=FUR_MAIN)
    for y in range(512):
        t = y / 512.0
        shade = int(18 * math.sin(t * math.pi))
        highlight = int(14 * math.cos(t * math.pi * 0.5))
        c = (
            max(0, min(255, FUR_MAIN[0] - shade + highlight)),
            max(0, min(255, FUR_MAIN[1] - shade + highlight)),
            max(0, min(255, FUR_MAIN[2] - shade + highlight)),
            255
        )
        draw.line([(0, y), (511, y)], fill=c)

    # Soft fur texture stipples
    for x in range(20, 490, 24):
        for y in range(20, 380, 24):
            draw.line([(x, y), (x + 6, y + 8)], fill=FUR_LIGHT, width=1)

    # Inner Ear zone: [0, 400, 150, 512]
    draw.rectangle([0, 400, 150, 512], fill=PINK_INNER_EAR)
    # Ear depth shading
    for y in range(410, 505, 8):
        draw.line([(10, y), (140, y)], fill=(220, 150, 165, 255), width=2)

    # Leaf Hat zone: [350, 400, 512, 512] - Vibrant Emerald Green
    LEAF_GREEN = (38, 195, 95, 255)
    LEAF_DARK = (24, 130, 65, 255)
    LEAF_VEIN = (85, 240, 135, 255)
    draw.rectangle([350, 400, 512, 512], fill=LEAF_GREEN)
    # Leaf veins
    for y in range(410, 510, 10):
        draw.line([(355, y), (505, y)], fill=LEAF_VEIN, width=2)
    draw.line([(430, 400), (430, 512)], fill=LEAF_DARK, width=5)

    # 2. Cream Belly (Top-Right 512x512: [512, 0, 1024, 512])
    draw.rectangle([512, 0, 1024, 512], fill=CREAM_BELLY)
    for i in range(16):
        draw.rectangle([512 + i, i, 1024 - i, 512 - i], outline=(245 - i, 238 - i, 215 - i, 255))
    
    # Chevrons
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
    draw.rectangle([0, 512, 512, 1024], fill=FUR_MAIN)
    for cx in [170, 342]:
        draw.ellipse([cx - 48, 680 - 48, cx + 48, 680 + 48], fill=EYE_WHITE, outline=FUR_DARK, width=3)
        draw.ellipse([cx - 16, 680 - 16, cx + 16, 680 + 16], fill=EYE_BLACK)
        draw.ellipse([cx - 6, 680 - 10, cx + 2, 680 - 2], fill=(255, 255, 255, 255))

    draw.polygon([(242, 722), (270, 722), (256, 742)], fill=NOSE_BLACK)

    whisker_color = (35, 48, 56, 240)
    for side, base_x in [(-1, 100), (1, 412)]:
        for dy, angle in [(-18, -10), (0, 0), (18, 10)]:
            x1 = base_x
            y1 = 740 + dy
            x2 = base_x + side * 85
            y2 = y1 + angle
            draw.line([(x1, y1), (x2, y2)], fill=whisker_color, width=4)

    draw.arc([190, 750, 322, 820], start=20, end=160, fill=(40, 55, 65, 255), width=4)

    # 4. Details Zone (Bottom-Right: [512, 512, 1024, 1024])
    draw.rectangle([512, 512, 1024, 1024], fill=FUR_DARK)
    draw.rectangle([512, 512, 768, 768], fill=CLAW_DARK)
    for x in range(520, 760, 40):
        draw.polygon([(x, 520), (x + 20, 520), (x + 10, 560)], fill=(18, 18, 22, 255))

    draw.rectangle([768, 512, 1024, 768], fill=(45, 68, 80, 255))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, format='PNG')
    print(f"Created Totoro atlas: {output_path} ({size}x{size})")


def create_satsuki_atlas(output_path):
    size = 1024
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Palette - Satsuki Kusakabe (Accurate Ghibli Reference)
    SKIN_LIGHT = (255, 230, 212, 255)
    SKIN_WARM = (250, 215, 195, 255)
    SKIN_SHADOW = (235, 195, 175, 255)
    SHIRT_YELLOW = (252, 222, 56, 255)
    SHIRT_SHADOW = (228, 195, 38, 255)
    COLLAR_WHITE = (252, 252, 254, 255)
    SKIRT_ORANGE = (238, 92, 28, 255)
    SKIRT_DARK = (196, 68, 16, 255)
    STRAP_ORANGE = (226, 82, 22, 255)
    HAIR_DARK = (16, 14, 16, 255)
    HAIR_MID = (32, 28, 34, 255)
    HAIR_HIGHLIGHT = (55, 48, 58, 255)
    EYE_BROWN = (46, 28, 22, 255)
    EYE_PUPIL = (18, 12, 12, 255)
    EYE_WHITE = (254, 254, 255, 255)
    SHOE_DARK = (42, 36, 40, 255)
    SOCK_WHITE = (245, 245, 250, 255)

    # 1. Skin & Full Head Wrap with Authentic Ghibli Cel Face (Top-Left: [0, 0, 512, 512])
    draw.rectangle([0, 0, 512, 512], fill=SKIN_LIGHT)
    
    # Check if authentic generated Ghibli portrait exists
    portrait_path = '/Users/tawsifx/.gemini/antigravity/brain/6c97bfac-da08-49e4-b7eb-834f1aca8c76/satsuki_portrait_1793023891591.jpg'
    if os.path.exists(portrait_path):
        portrait = Image.open(portrait_path).convert('RGBA')
        # Center crop and fit to 512x512
        pw, ph = portrait.size
        # The face is centered in the upper-mid area of the portrait
        crop_box = (int(pw * 0.15), int(ph * 0.10), int(pw * 0.85), int(ph * 0.80))
        face_cropped = portrait.crop(crop_box).resize((512, 512), Image.Resampling.LANCZOS)
        # Ensure hair in portrait is deep jet black
        pw_c, ph_c = face_cropped.size
        pix = face_cropped.load()
        for py in range(ph_c):
            for px in range(pw_c):
                pr, pg, pb, pa = pix[px, py]
                # Dark hair detection (dark tone, low green/blue, not skin tone)
                if pr < 85 and pg < 75 and pb < 75 and (pr > pg * 0.9):
                    pix[px, py] = (int(pr * 0.4), int(pg * 0.4), int(pb * 0.4), pa)

        img.paste(face_cropped, (0, 0))
        print("Pasted authentic Ghibli Satsuki portrait into texture atlas [0, 0, 512, 512]")
    else:
        # Fallback procedural face
        for y in range(512):
            t = y / 512.0
            sh = int(12 * math.sin(t * math.pi))
            c = (SKIN_LIGHT[0] - sh, SKIN_LIGHT[1] - sh, SKIN_LIGHT[2] - sh, 255)
            draw.line([(0, y), (511, y)], fill=c)

    # Central Face Zone: [120, 100, 392, 420]
    # Satsuki's Expressive Anime Eyes (centered on face for cylindrical projection)
    def draw_ghibli_eye(cx, cy):
        # White sclera (rounded anime eye shape)
        draw.ellipse([cx - 36, cy - 42, cx + 36, cy + 42], fill=EYE_WHITE, outline=(50, 35, 30, 255), width=2)
        # Bold upper lash line (tapered)
        draw.arc([cx - 40, cy - 48, cx + 40, cy + 12], start=185, end=355, fill=HAIR_DARK, width=6)
        draw.arc([cx - 38, cy - 50, cx + 38, cy + 10], start=195, end=345, fill=HAIR_DARK, width=4)
        # Iris
        draw.ellipse([cx - 24, cy - 36, cx + 24, cy + 36], fill=EYE_BROWN)
        # Pupil
        draw.ellipse([cx - 15, cy - 24, cx + 15, cy + 24], fill=EYE_PUPIL)
        # Catchlights (specular reflections)
        draw.ellipse([cx - 16, cy - 26, cx - 4, cy - 12], fill=(255, 255, 255, 255))
        draw.ellipse([cx + 6, cy + 4, cx + 14, cy + 14], fill=(255, 255, 255, 220))
        # Eyebrows (spirited Ghibli arc)
        draw.arc([cx - 32, cy - 70, cx + 32, cy - 32], start=205, end=335, fill=HAIR_DARK, width=5)

    # Eyes at (190, 220) and (322, 220)
    draw_ghibli_eye(190, 220)
    draw_ghibli_eye(322, 220)

    # Cute nose dot
    draw.polygon([(253, 270), (259, 270), (256, 276)], fill=SKIN_SHADOW)
    draw.ellipse([253, 269, 259, 274], fill=SKIN_SHADOW)

    # Friendly energetic smile
    draw.arc([218, 282, 294, 332], start=25, end=155, fill=(185, 52, 52, 255), width=5)
    # Upper lip line hint
    draw.arc([226, 280, 286, 305], start=40, end=140, fill=(160, 45, 45, 200), width=2)

    # Rosy cheeks (soft blush)
    for r in range(30, 0, -2):
        alpha = int(90 * (1 - r / 30))
        draw.ellipse([140 - r, 265 - int(r*0.6), 140 + r, 265 + int(r*0.6)], fill=(255, 175, 175, alpha))
        draw.ellipse([372 - r, 265 - int(r*0.6), 372 + r, 265 + int(r*0.6)], fill=(255, 175, 175, alpha))

    # 2. Yellow Shirt with Collar & Suspenders (Top-Right: [512, 0, 1024, 512])
    draw.rectangle([512, 0, 1024, 512], fill=SHIRT_YELLOW)
    # Subtle vertical shirt folds
    for y in range(0, 512, 24):
        draw.line([(512, y), (1024, y)], fill=SHIRT_SHADOW, width=1)
    
    # White collar band at neck line
    draw.rectangle([512, 0, 1024, 75], fill=COLLAR_WHITE)
    draw.line([(512, 75), (1024, 75)], fill=(210, 210, 215, 255), width=3)
    # V-neck collar lapels
    draw.polygon([(768, 75), (730, 150), (806, 150)], fill=COLLAR_WHITE)
    draw.line([(768, 75), (730, 150)], fill=(195, 195, 200, 255), width=2)
    draw.line([(768, 75), (806, 150)], fill=(195, 195, 200, 255), width=2)

    # Orange Suspender Straps (Satsuki's iconic dress straps over shirt)
    draw.rectangle([640, 75, 690, 512], fill=STRAP_ORANGE)
    draw.rectangle([846, 75, 896, 512], fill=STRAP_ORANGE)
    # Strap stitch lines
    for sx in [644, 686, 850, 892]:
        for y in range(80, 510, 8):
            draw.line([(sx, y), (sx, y + 4)], fill=(255, 140, 80, 255), width=1)

    # 3. Orange Pleated Skirt (Bottom-Left: [0, 512, 512, 1024])
    draw.rectangle([0, 512, 512, 1024], fill=SKIRT_ORANGE)
    # Pleat folds
    pleat_width = 32
    for x in range(0, 512, pleat_width * 2):
        draw.rectangle([x, 512, x + pleat_width, 1024], fill=SKIRT_DARK)
        # Highlight edge
        draw.line([(x, 512), (x, 1024)], fill=(255, 120, 60, 255), width=2)
        draw.line([(x + pleat_width, 512), (x + pleat_width, 1024)], fill=(160, 50, 10, 255), width=2)
    # Skirt waistband
    draw.rectangle([0, 512, 512, 545], fill=STRAP_ORANGE)
    draw.line([(0, 545), (512, 545)], fill=(170, 50, 10, 255), width=3)

    # 4. Hair, Socks & Shoes (Bottom-Right: [512, 512, 1024, 1024])
    # Ghibli Dark Bob Hair zone: [512, 512, 1024, 800]
    draw.rectangle([512, 512, 1024, 800], fill=HAIR_DARK)
    # Hair strands & soft glossy sheen
    for y in range(520, 800, 14):
        draw.line([(512, y), (1024, y)], fill=HAIR_MID, width=2)
    # Specular hair ring (angel ring highlight)
    for x in range(512, 1024):
        hy = int(610 + 15 * math.sin((x - 512) / 512 * math.pi * 2))
        draw.line([(x, hy), (x, hy + 8)], fill=HAIR_HIGHLIGHT, width=1)

    # White Crew Socks zone: [512, 800, 768, 1024]
    draw.rectangle([512, 800, 768, 1024], fill=SOCK_WHITE)
    # Ribbed sock lines
    for y in range(800, 860, 6):
        draw.line([(512, y), (768, y)], fill=(225, 225, 230, 255), width=1)
    draw.line([(512, 860), (768, 860)], fill=(195, 195, 202, 255), width=3)

    # Dark Mary Jane Shoes zone: [768, 800, 1024, 1024]
    draw.rectangle([768, 800, 1024, 1024], fill=SHOE_DARK)
    # Shoe sole line & strap highlight
    draw.rectangle([768, 980, 1024, 1024], fill=(25, 22, 26, 255))
    draw.rectangle([800, 840, 992, 880], fill=(70, 62, 72, 255))
    draw.ellipse([880, 850, 912, 870], fill=(210, 210, 215, 255)) # buckle button

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, format='PNG')
    print(f"Created Satsuki atlas: {output_path} ({size}x{size})")


def create_kart_liveries():
    med_src = 'public/wii/kart/medium/body_mr.png'
    med_dst = 'public/wii/kart/medium/body_satsuki.png'
    if os.path.exists(med_src):
        src_img = Image.open(med_src).convert('RGBA')
        w, h = src_img.size
        pixels = src_img.load()
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                if r > 120 and r > g * 1.3 and r > b * 1.3:
                    if y < h * 0.45:
                        pixels[x, y] = (int(min(255, r * 1.1)), int(min(255, r * 0.85)), int(b * 0.4), a)
                    else:
                        pixels[x, y] = (int(min(255, r * 1.05)), int(min(255, r * 0.52)), int(b * 0.3), a)
        src_img.save(med_dst, format='PNG')
        print(f"Created Satsuki kart livery: {med_dst}")

    large_src = 'public/wii/kart/large/body_dk.png'
    large_dst = 'public/wii/kart/large/body_totoro.png'
    if os.path.exists(large_src):
        src_img = Image.open(large_src).convert('RGBA')
        w, h = src_img.size
        pixels = src_img.load()
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                # DK Brown body panels -> Vibrant Ghibli Forest Teal / Emerald
                if r > 35 and g < r * 0.85 and b < g * 0.7:
                    val = min(1.4, max(0.4, r / 90.0))
                    tr = int(min(255, 20 + val * 25))
                    tg = int(min(255, 120 + val * 75))
                    tb = int(min(255, 105 + val * 70))
                    pixels[x, y] = (tr, tg, tb, a)
                # DK Red accents -> Sunny Warm Butter Gold
                elif r > 180 and g < 60 and b < 60:
                    pixels[x, y] = (255, 215, 45, a)
        src_img.save(large_dst, format='PNG')
        print(f"Created vibrant Totoro kart livery: {large_dst}")


if __name__ == '__main__':
    create_totoro_atlas('public/wii/totoro/totoro_all.png')
    create_satsuki_atlas('public/wii/satsuki/satsuki_all.png')
    create_kart_liveries()
