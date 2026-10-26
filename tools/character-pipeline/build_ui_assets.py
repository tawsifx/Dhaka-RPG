import os
from PIL import Image, ImageDraw, ImageFont

def create_name_plate(text, output_path):
    # Dimensions 64x12
    W, H = 64, 12
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 1. Beveled plate background matching MK64
    # Fill middle
    draw.rectangle([1, 1, W - 2, H - 2], fill=(123, 123, 123, 255))
    # Top highlight
    draw.line([(0, 0), (W - 1, 0)], fill=(255, 255, 255, 255))
    # Left highlight
    draw.line([(0, 0), (0, H - 1)], fill=(214, 214, 214, 255))
    # Right shadow
    draw.line([(W - 1, 0), (W - 1, H - 1)], fill=(107, 107, 107, 255))
    # Bottom shadow
    draw.line([(0, H - 1), (W - 1, H - 1)], fill=(66, 66, 66, 255))
    
    # Inner subtle gradients
    for y in range(2, H - 2):
        if y in (2, H - 3):
            c = 110
        elif y in (3, 4, 5, 6, 7):
            c = 95
        else:
            c = 115
        draw.line([(1, y), (W - 2, y)], fill=(c, c, c, 255))

    # 2. Text rendering with pixel style font
    # Use standard default or bold font if available, or crisp bitmap text
    font = None
    for font_path in [
        "/System/Library/Fonts/Supplemental/Impact.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc"
    ]:
        if os.path.exists(font_path):
            try:
                font = ImageFont.truetype(font_path, 9)
                break
            except Exception:
                pass
    if font is None:
        font = ImageFont.load_default()
        
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (W - tw) // 2
    ty = (H - th) // 2 - 1

    # Drop shadow
    draw.text((tx + 1, ty + 1), text, fill=(20, 20, 20, 255), font=font)
    # Main white / bright yellow-white text
    draw.text((tx, ty), text, fill=(255, 255, 240, 255), font=font)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
    print(f"Created name plate {output_path} ({W}x{H})")

def build_face_strip(input_head_path, output_strip_path):
    head = Image.open(input_head_path).convert('RGBA')
    # Resize head to 64x64
    head_64 = head.resize((64, 64), Image.Resampling.LANCZOS)
    
    # 17 frames of 64x64 stacked vertically -> 64 x 1088
    strip = Image.new('RGBA', (64, 1088), (0, 0, 0, 0))
    for i in range(17):
        # Slight variation for celebratory/selected frames (frames 1..3, 15)
        if i in (1, 2, 3, 15):
            # 1.05x slight pop
            zoomed = head.resize((68, 68), Image.Resampling.LANCZOS).crop((2, 2, 66, 66))
            strip.paste(zoomed, (0, i * 64), zoomed)
        else:
            strip.paste(head_64, (0, i * 64), head_64)
            
    os.makedirs(os.path.dirname(output_strip_path), exist_ok=True)
    strip.save(output_strip_path)
    print(f"Created face strip {output_strip_path} ({strip.size})")

if __name__ == '__main__':
    create_name_plate("SATSUKI", "public/mk64/charselect/name_satsuki.png")
    create_name_plate("TOTORO", "public/mk64/charselect/name_totoro.png")
    build_face_strip("/tmp/satsuki_head_temp.png", "public/mk64/faces/satsuki.png")
    build_face_strip("/tmp/totoro_head_temp.png", "public/mk64/faces/totoro.png")
