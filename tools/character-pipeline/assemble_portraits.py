import os
from PIL import Image

def process_portrait_to_strip(src_path, dst_path, is_totoro=False):
    img = Image.open(src_path).convert('RGBA')
    w, h = img.size
    
    # Remove pure white background by keying out white (or near white > 245)
    pixels = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # White background threshold
            if r > 240 and g > 240 and b > 240:
                # Soft alpha falloff near boundaries
                diff = min(r - 240, g - 240, b - 240)
                if diff > 8:
                    pixels[x, y] = (0, 0, 0, 0)
                else:
                    alpha = int(255 * (1.0 - diff / 8.0))
                    pixels[x, y] = (r, g, b, alpha)
                    
    # Find bounding box of character
    bbox = img.getbbox()
    cropped = img.crop(bbox)
    cw, ch = cropped.size
    
    # Make square by adding padding if needed
    dim = max(cw, ch)
    square = Image.new('RGBA', (dim, dim), (0, 0, 0, 0))
    paste_x = (dim - cw) // 2
    paste_y = (dim - ch) // 2
    square.paste(cropped, (paste_x, paste_y), cropped)
    
    # Resize to 64x64
    base_64 = square.resize((64, 64), Image.Resampling.LANCZOS)
    
    # Celebrate / zoom variation (slight 1.06x zoom)
    zoom_dim = int(64 * 1.06)
    zoomed = square.resize((zoom_dim, zoom_dim), Image.Resampling.LANCZOS)
    crop_x = (zoom_dim - 64) // 2
    crop_y = (zoom_dim - 64) // 2
    zoom_64 = zoomed.crop((crop_x, crop_y, crop_x + 64, crop_y + 64))
    
    # Build 17-frame strip (64 x 1088)
    strip = Image.new('RGBA', (64, 1088), (0, 0, 0, 0))
    for i in range(17):
        # MK64 animation frames:
        # 0: base
        # 1..3, 15: celebrate / hover / selected
        if i in (1, 2, 3, 15):
            strip.paste(zoom_64, (0, i * 64), zoom_64)
        else:
            strip.paste(base_64, (0, i * 64), base_64)
            
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    strip.save(dst_path)
    print(f"Generated face strip {dst_path} (64x1088)")

if __name__ == '__main__':
    satsuki_src = '/Users/tawsifx/.gemini/antigravity/brain/6c97bfac-da08-49e4-b7eb-834f1aca8c76/satsuki_portrait_1793028283358.jpg'
    totoro_src = '/Users/tawsifx/.gemini/antigravity/brain/6c97bfac-da08-49e4-b7eb-834f1aca8c76/totoro_portrait_1793028328566.jpg'
    
    process_portrait_to_strip(satsuki_src, 'public/mk64/faces/satsuki.png', is_totoro=False)
    process_portrait_to_strip(totoro_src, 'public/mk64/faces/totoro.png', is_totoro=True)
