#!/usr/bin/env python3
"""
Generate custom Moon Walker (Hero), Totoro (Gloria), and Chibi Totoro (Dog)
pixel art sprites for the retro Game Boy Beat-Em-Up arcade brawler.
"""

from PIL import Image, ImageDraw
import json
import os

SPRITES_PNG = "public/brawler/assets/sprites/sprites.png"
SPRITES_JSON = "public/brawler/assets/sprites/sprites.json"

# Authentic GameBoy palette matching sprites.png
OUTLINE = (31, 31, 31, 255)       # Darkest contour
DARK    = (77, 83, 60, 255)       # Dark olive green
MID     = (139, 149, 109, 255)    # Medium green
LIGHT   = (196, 207, 161, 255)    # Cream / highlight
CLEAR   = (0, 0, 0, 0)

def create_frame(w=48, h=48):
    return Image.new("RGBA", (w, h), CLEAR)

def draw_rect(img, x1, y1, x2, y2, color):
    d = ImageDraw.Draw(img)
    d.rectangle([x1, y1, x2, y2], fill=color)

def draw_pix(img, x, y, color):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), color)

# --- MOON WALKER (HERO) SPRITES ---
# Satsuki / Moon Walker character design:
# 48x48 frame, standing ground y=47, height ~36px.
# Athletic build, bob haircut with straight bangs, collared shirt + suspenders, shorts, socks, shoes.

def draw_moonwalker_base(img, ox=0, oy=0, head_offset=0, arm_pose='guard', leg_pose='stand', leg_frame=0):
    """
    Renders Moon Walker with modular limbs and expressions.
    """
    # Head & Hair
    hx = 20 + ox
    hy = 10 + oy + head_offset
    
    # Hair Back & Top (Bob cut)
    draw_rect(img, hx-4, hy-2, hx+6, hy+8, OUTLINE)
    draw_rect(img, hx-3, hy-1, hx+5, hy+1, DARK)
    draw_rect(img, hx-1, hy-1, hx+3, hy, MID) # hair sheen
    
    # Face skin
    draw_rect(img, hx-2, hy+2, hx+5, hy+6, LIGHT)
    
    # Bangs
    draw_rect(img, hx-3, hy+1, hx+4, hy+2, OUTLINE)
    draw_pix(img, hx-1, hy+3, OUTLINE) # bang point
    draw_pix(img, hx+2, hy+3, OUTLINE) # bang point
    
    # Eye & Brow (determined brawler look)
    draw_pix(img, hx+2, hy+3, OUTLINE) # eye
    draw_pix(img, hx+3, hy+3, LIGHT)   # eye white
    draw_pix(img, hx+4, hy+4, OUTLINE) # eye right
    draw_pix(img, hx+1, hy+5, DARK)    # mouth grit
    
    # Side bob hair strands
    draw_rect(img, hx-4, hy+2, hx-3, hy+8, OUTLINE)
    draw_rect(img, hx-3, hy+3, hx-3, hy+7, DARK)
    draw_pix(img, hx+6, hy+4, OUTLINE)
    draw_pix(img, hx+6, hy+5, OUTLINE)

    # Neck
    draw_rect(img, hx, hy+7, hx+2, hy+8, LIGHT)
    draw_pix(img, hx-1, hy+7, OUTLINE)
    draw_pix(img, hx+3, hy+7, OUTLINE)

    # Torso (Yellow-cream shirt with dark suspenders)
    tx = 18 + ox
    ty = 19 + oy
    # Shirt base
    draw_rect(img, tx, ty, tx+8, ty+7, LIGHT)
    # Shirt outline
    for y in range(ty, ty+8):
        draw_pix(img, tx-1, y, OUTLINE)
        draw_pix(img, tx+9, y, OUTLINE)
    # Suspenders
    draw_rect(img, tx+1, ty+1, tx+2, ty+7, DARK)
    draw_rect(img, tx+6, ty+1, tx+7, ty+7, DARK)
    # Collar
    draw_pix(img, tx+3, ty, OUTLINE)
    draw_pix(img, tx+4, ty+1, OUTLINE)
    draw_pix(img, tx+5, ty, OUTLINE)

    # Belt / Waistband
    draw_rect(img, tx-1, ty+8, tx+9, ty+9, OUTLINE)
    draw_rect(img, tx+3, ty+8, tx+5, ty+9, LIGHT) # buckle

    # Shorts / Skirt (Midtone green)
    draw_rect(img, tx-1, ty+10, tx+9, ty+14, MID)
    draw_rect(img, tx-2, ty+10, tx-2, ty+14, OUTLINE)
    draw_rect(img, tx+10, ty+10, tx+10, ty+14, OUTLINE)
    draw_rect(img, tx-1, ty+14, tx+9, ty+14, OUTLINE)
    draw_pix(img, tx+4, ty+12, OUTLINE) # split
    draw_pix(img, tx+4, ty+13, OUTLINE)

    # Legs & Feet
    if leg_pose == 'stand':
        # Left Leg
        draw_rect(img, tx, ty+15, tx+3, ty+20, LIGHT) # skin/sock
        draw_rect(img, tx-1, ty+15, tx-1, ty+20, OUTLINE)
        draw_rect(img, tx+4, ty+15, tx+4, ty+20, OUTLINE)
        draw_rect(img, tx-2, ty+21, tx+3, ty+24, DARK) # Shoe
        draw_rect(img, tx-3, ty+23, tx-2, ty+24, OUTLINE)
        draw_rect(img, tx-2, ty+24, tx+4, ty+24, OUTLINE)

        # Right Leg
        draw_rect(img, tx+6, ty+15, tx+9, ty+20, LIGHT)
        draw_rect(img, tx+5, ty+15, tx+5, ty+20, OUTLINE)
        draw_rect(img, tx+10, ty+15, tx+10, ty+20, OUTLINE)
        draw_rect(img, tx+6, ty+21, tx+11, ty+24, DARK) # Shoe
        draw_rect(img, tx+5, ty+24, tx+12, ty+24, OUTLINE)
        draw_rect(img, tx+11, ty+22, tx+12, ty+24, OUTLINE)

    elif leg_pose == 'walk':
        if leg_frame == 0:
            # Left leg forward
            draw_rect(img, tx-3, ty+15, tx, ty+19, LIGHT)
            draw_rect(img, tx-5, ty+20, tx, ty+24, DARK)
            draw_rect(img, tx-6, ty+24, tx+1, ty+24, OUTLINE)
            # Right leg back
            draw_rect(img, tx+7, ty+15, tx+10, ty+19, LIGHT)
            draw_rect(img, tx+8, ty+20, tx+12, ty+24, DARK)
            draw_rect(img, tx+7, ty+24, tx+13, ty+24, OUTLINE)
        elif leg_frame == 1:
            # Passing stance
            draw_rect(img, tx+1, ty+15, tx+4, ty+21, LIGHT)
            draw_rect(img, tx, ty+22, tx+4, ty+24, DARK)
            draw_rect(img, tx-1, ty+24, tx+5, ty+24, OUTLINE)
            draw_rect(img, tx+5, ty+15, tx+8, ty+20, LIGHT)
            draw_rect(img, tx+5, ty+21, tx+9, ty+24, DARK)
            draw_rect(img, tx+4, ty+24, tx+10, ty+24, OUTLINE)
        else:
            # Right leg forward
            draw_rect(img, tx+8, ty+15, tx+11, ty+19, LIGHT)
            draw_rect(img, tx+9, ty+20, tx+14, ty+24, DARK)
            draw_rect(img, tx+8, ty+24, tx+15, ty+24, OUTLINE)
            draw_rect(img, tx-2, ty+15, tx+1, ty+19, LIGHT)
            draw_rect(img, tx-3, ty+20, tx+1, ty+24, DARK)
            draw_rect(img, tx-4, ty+24, tx+2, ty+24, OUTLINE)

    elif leg_pose == 'jump':
        # Tucked knees for jump
        draw_rect(img, tx-2, ty+14, tx+2, ty+18, LIGHT)
        draw_rect(img, tx-1, ty+18, tx+3, ty+21, DARK)
        draw_rect(img, tx+6, ty+13, tx+10, ty+17, LIGHT)
        draw_rect(img, tx+7, ty+17, tx+11, ty+20, DARK)

    elif leg_pose == 'divekick':
        # Flying angled dive kick!
        draw_rect(img, tx-4, ty+12, tx+1, ty+16, DARK) # tucked left leg
        # Extended right leg piercing downwards right
        draw_rect(img, tx+8, ty+13, tx+16, ty+19, LIGHT)
        draw_rect(img, tx+16, ty+18, tx+22, ty+23, DARK)
        draw_rect(img, tx+17, ty+23, tx+24, ty+25, OUTLINE) # foot impact!

    # Arms
    if arm_pose == 'guard':
        # Left arm in front guard
        draw_rect(img, tx+6, ty+1, tx+9, ty+4, MID)
        draw_rect(img, tx+8, ty+2, tx+12, ty+5, LIGHT) # forearm
        draw_rect(img, tx+11, ty+1, tx+14, ty+4, OUTLINE) # clenched glove/fist
        # Right arm back guard
        draw_rect(img, tx-3, ty+2, tx, ty+5, MID)
        draw_rect(img, tx-2, ty+4, tx+1, ty+7, LIGHT)
        draw_rect(img, tx-3, ty+6, tx, ty+8, OUTLINE)

    elif arm_pose == 'punch1': # Quick Jab
        draw_rect(img, tx+6, ty+1, tx+15, ty+4, LIGHT)
        draw_rect(img, tx+15, ty, tx+19, ty+5, OUTLINE) # extended fist
        draw_rect(img, tx+16, ty+1, tx+18, ty+4, DARK)

    elif arm_pose == 'punch2': # Heavy Cross
        draw_rect(img, tx+5, ty+1, tx+17, ty+5, LIGHT)
        draw_rect(img, tx+17, ty, tx+22, ty+6, OUTLINE)
        draw_rect(img, tx+18, ty+1, tx+21, ty+5, DARK) # powerful fist impact
        # Back arm pulled back
        draw_rect(img, tx-4, ty+2, tx-1, ty+6, MID)

    elif arm_pose == 'punch3': # Spinning Backfist / Uppercut
        draw_rect(img, tx+4, ty-3, tx+8, ty+3, LIGHT)
        draw_rect(img, tx+5, ty-6, tx+10, ty-1, OUTLINE) # raised uppercut fist!
        draw_rect(img, tx+6, ty-5, tx+9, ty-2, DARK)

    elif arm_pose == 'hit': # Recoil / pain
        draw_rect(img, tx-4, ty-1, tx, ty+3, LIGHT)
        draw_rect(img, tx-5, ty-2, tx-1, ty+1, OUTLINE)
        draw_rect(img, tx+7, ty-2, tx+11, ty+2, LIGHT)
        draw_rect(img, tx+8, ty-3, tx+12, ty, OUTLINE)

def generate_hero_sprites():
    sprites = {}

    # 4 idle frames (breathing)
    for i in range(1, 5):
        img = create_frame(48, 48)
        head_off = 0 if i in (1, 3) else 1
        draw_moonwalker_base(img, ox=3, oy=8, head_offset=head_off, arm_pose='guard', leg_pose='stand')
        sprites[f"hero_stand_0{i}"] = img

    # 3 walk frames
    for i in range(1, 4):
        img = create_frame(48, 48)
        draw_moonwalker_base(img, ox=3, oy=8, head_offset=(i % 2), arm_pose='guard', leg_pose='walk', leg_frame=i-1)
        sprites[f"hero_walk_0{i}"] = img

    # 3 punch frames
    for i in range(1, 4):
        img = create_frame(48, 48)
        arm_p = f"punch{i}"
        draw_moonwalker_base(img, ox=1, oy=8, head_offset=0, arm_pose=arm_p, leg_pose='stand')
        sprites[f"hero_punch_0{i}"] = img

    # 3 kick frames (Low kick, Mid kick, High kick)
    # Kick 1: Windup & Low kick
    k1 = create_frame(48, 48)
    draw_moonwalker_base(k1, ox=1, oy=8, head_offset=0, arm_pose='guard', leg_pose='stand')
    draw_rect(k1, 28, 38, 38, 43, LIGHT) # low sweeping kick
    draw_rect(k1, 38, 37, 43, 44, DARK) # foot
    draw_rect(k1, 28, 37, 44, 38, OUTLINE)
    draw_rect(k1, 28, 43, 44, 44, OUTLINE)
    sprites["hero_kick_01"] = k1

    # Kick 2: Powerful Mid roundhouse kick
    k2 = create_frame(48, 48)
    draw_moonwalker_base(k2, ox=0, oy=7, head_offset=-1, arm_pose='guard', leg_pose='jump')
    draw_rect(k2, 26, 26, 38, 32, LIGHT) # horizontal kick leg
    draw_rect(k2, 38, 24, 44, 33, DARK)  # boot
    draw_rect(k2, 26, 25, 45, 26, OUTLINE)
    draw_rect(k2, 26, 32, 45, 33, OUTLINE)
    sprites["hero_kick_02"] = k2

    # Kick 3: High Roundhouse / Axe kick
    k3 = create_frame(48, 48)
    draw_moonwalker_base(k3, ox=-1, oy=6, head_offset=-1, arm_pose='guard', leg_pose='jump')
    draw_rect(k3, 24, 14, 34, 24, LIGHT) # high diagonal leg
    draw_rect(k3, 33, 10, 42, 18, DARK)  # high kick boot
    draw_rect(k3, 24, 13, 43, 14, OUTLINE)
    draw_rect(k3, 42, 10, 43, 19, OUTLINE)
    sprites["hero_kick_03"] = k3

    # Jump frames 1-3
    j1 = create_frame(48, 48) # Crouched windup
    draw_moonwalker_base(j1, ox=3, oy=11, head_offset=1, arm_pose='guard', leg_pose='stand')
    sprites["hero_jump_01"] = j1

    j2 = create_frame(48, 48) # Airborne leap
    draw_moonwalker_base(j2, ox=3, oy=4, head_offset=0, arm_pose='guard', leg_pose='jump')
    sprites["hero_jump_02"] = j2

    j3 = create_frame(48, 48) # Peak of jump
    draw_moonwalker_base(j3, ox=3, oy=1, head_offset=-1, arm_pose='guard', leg_pose='jump')
    sprites["hero_jump_03"] = j3

    # Divekick
    dk = create_frame(48, 48)
    draw_moonwalker_base(dk, ox=-1, oy=6, head_offset=0, arm_pose='guard', leg_pose='divekick')
    sprites["hero_divekick_01"] = dk

    # Hit / Recoil
    hit = create_frame(48, 48)
    draw_moonwalker_base(hit, ox=-1, oy=9, head_offset=0, arm_pose='hit', leg_pose='stand')
    # Draw recoil lines
    draw_pix(hit, 12, 16, LIGHT)
    draw_pix(hit, 10, 18, MID)
    sprites["hero_hit_01"] = hit

    return sprites


# --- TOTORO (GLORIA) SPRITES ---
# Totoro is 48x48.
# Features:
# Round body, pointy ears, big eyes, whiskered cheeks, cream belly with chevrons.
# In angry state: giant wide open mouth showing teeth and tongue (iconic roar!).

def draw_totoro_body(img, ox=0, oy=0, mouth='calm', ear_twitch=0, belly_lift=False):
    bx = 24 + ox
    by = 28 + oy
    
    # Body Oval (Mid tone fur)
    # Main silhouette
    draw_rect(img, bx-14, by-10, bx+14, by+15, MID)
    draw_rect(img, bx-12, by-14, bx+12, by-10, MID) # upper body / head
    draw_rect(img, bx-15, by-5, bx+15, by+14, MID)

    # Outline around Totoro
    for dy in range(-14, 16):
        w_half = 13 if dy < -8 else 16
        draw_pix(img, bx - w_half, by + dy, OUTLINE)
        draw_pix(img, bx + w_half, by + dy, OUTLINE)
    draw_rect(img, bx-13, by-15, bx+13, by-15, OUTLINE) # top outline
    draw_rect(img, bx-14, by+16, bx+14, by+16, OUTLINE) # bottom outline

    # Ears (pointy tips)
    # Left Ear
    e_tilt = ear_twitch
    draw_rect(img, bx-9+e_tilt, by-22, bx-6+e_tilt, by-15, MID)
    draw_rect(img, bx-8+e_tilt, by-24, bx-7+e_tilt, by-22, MID) # tip
    draw_rect(img, bx-10+e_tilt, by-22, bx-10+e_tilt, by-15, OUTLINE)
    draw_rect(img, bx-5+e_tilt, by-22, bx-5+e_tilt, by-15, OUTLINE)
    draw_pix(img, bx-8+e_tilt, by-25, OUTLINE)
    draw_pix(img, bx-7+e_tilt, by-25, OUTLINE)

    # Right Ear
    draw_rect(img, bx+6-e_tilt, by-22, bx+9-e_tilt, by-15, MID)
    draw_rect(img, bx+7-e_tilt, by-24, bx+8-e_tilt, by-22, MID)
    draw_rect(img, bx+5-e_tilt, by-22, bx+5-e_tilt, by-15, OUTLINE)
    draw_rect(img, bx+10-e_tilt, by-22, bx+10-e_tilt, by-15, OUTLINE)
    draw_pix(img, bx+7-e_tilt, by-25, OUTLINE)
    draw_pix(img, bx+8-e_tilt, by-25, OUTLINE)

    # Big Eyes
    # Left Eye
    draw_rect(img, bx-7, by-11, bx-3, by-7, LIGHT)
    draw_rect(img, bx-8, by-10, bx-2, by-8, LIGHT)
    draw_pix(img, bx-5, by-9, OUTLINE) # pupil
    # Right Eye
    draw_rect(img, bx+3, by-11, bx+7, by-7, LIGHT)
    draw_rect(img, bx+2, by-10, bx+8, by-8, LIGHT)
    draw_pix(img, bx+5, by-9, OUTLINE) # pupil

    # Tiny Nose
    draw_pix(img, bx-1, by-7, OUTLINE)
    draw_pix(img, bx, by-7, OUTLINE)
    draw_pix(img, bx+1, by-7, OUTLINE)

    # Whiskers (3 on each cheek)
    for wy in [-9, -7, -5]:
        draw_rect(img, bx-18, by+wy, bx-12, by+wy, OUTLINE)
        draw_rect(img, bx+12, by+wy, bx+18, by+wy, OUTLINE)

    # Mouth
    if mouth == 'calm':
        # Gentle calm mouth
        draw_rect(img, bx-3, by-4, bx+3, by-4, OUTLINE)
    elif mouth == 'angry_small':
        # Roar opening
        draw_rect(img, bx-6, by-5, bx+6, by-1, OUTLINE)
        draw_rect(img, bx-5, by-4, bx+5, by-2, LIGHT) # teeth
        draw_rect(img, bx-4, by-3, bx+4, by-2, DARK)  # throat
    elif mouth == 'angry_huge':
        # Enormous legendary roar!
        draw_rect(img, bx-9, by-6, bx+9, by+2, OUTLINE)
        draw_rect(img, bx-8, by-5, bx+8, by+1, DARK)   # inside mouth
        # Top teeth row
        draw_rect(img, bx-7, by-5, bx+7, by-4, LIGHT)
        for tx in range(bx-7, bx+8, 2):
            draw_pix(img, tx, by-5, OUTLINE)
        # Bottom teeth row
        draw_rect(img, bx-7, by, bx+7, by+1, LIGHT)
        for tx in range(bx-7, bx+8, 2):
            draw_pix(img, tx, by+1, OUTLINE)

    # Cream Tummy
    tummy_y = by - 1 if not belly_lift else by - 4
    draw_rect(img, bx-9, tummy_y, bx+9, tummy_y+13, LIGHT)
    draw_rect(img, bx-10, tummy_y+2, bx+10, tummy_y+11, LIGHT)
    
    # Iconic Chevron Markings on Tummy: ^ ^ ^
    # Row 1 (3 chevrons)
    for cx in [bx-6, bx, bx+6]:
        draw_pix(img, cx, tummy_y+3, DARK)
        draw_pix(img, cx-1, tummy_y+4, DARK)
        draw_pix(img, cx+1, tummy_y+4, DARK)
    # Row 2 (2 chevrons)
    for cx in [bx-3, bx+3]:
        draw_pix(img, cx, tummy_y+7, DARK)
        draw_pix(img, cx-1, tummy_y+8, DARK)
        draw_pix(img, cx+1, tummy_y+8, DARK)

    # Claws / Paws
    if not belly_lift:
        # Feet resting on ground
        draw_rect(img, bx-10, by+15, bx-4, by+17, DARK)
        draw_rect(img, bx-11, by+17, bx-3, by+17, OUTLINE)
        draw_rect(img, bx+4, by+15, bx+10, by+17, DARK)
        draw_rect(img, bx+3, by+17, bx+11, by+17, OUTLINE)
    else:
        # Floating / lifted feet dangling
        draw_rect(img, bx-9, by+16, bx-5, by+19, DARK)
        draw_rect(img, bx+5, by+16, bx+9, by+19, DARK)
        # Arms raised up!
        draw_rect(img, bx-16, by-4, bx-13, by+2, MID)
        draw_rect(img, bx+13, by-4, bx+16, by+2, MID)

def generate_totoro_sprites():
    sprites = {}

    # Stand 1-3
    for i in range(1, 4):
        img = create_frame(48, 48)
        draw_totoro_body(img, ox=0, oy=1, mouth='calm', ear_twitch=(i % 2))
        sprites[f"gloria_stand_0{i}"] = img

    # Angry 1-4 (Spirited Roar Progression)
    # Frame 1: Gasp / inhale
    a1 = create_frame(48, 48)
    draw_totoro_body(a1, ox=0, oy=1, mouth='angry_small', ear_twitch=0)
    sprites["gloria_angry_01"] = a1

    # Frame 2: Mouth opening wide
    a2 = create_frame(48, 48)
    draw_totoro_body(a2, ox=0, oy=0, mouth='angry_huge', ear_twitch=1)
    sprites["gloria_angry_02"] = a2

    # Frame 3: Peak Roar with shockwaves
    a3 = create_frame(48, 48)
    draw_totoro_body(a3, ox=0, oy=0, mouth='angry_huge', ear_twitch=2)
    # Roar visual wind streaks
    draw_rect(a3, 3, 22, 6, 23, LIGHT)
    draw_rect(a3, 42, 22, 45, 23, LIGHT)
    draw_rect(a3, 1, 28, 5, 29, LIGHT)
    draw_rect(a3, 43, 28, 47, 29, LIGHT)
    sprites["gloria_angry_03"] = a3

    # Frame 4: Powerful sustained roar
    a4 = create_frame(48, 48)
    draw_totoro_body(a4, ox=0, oy=1, mouth='angry_huge', ear_twitch=1)
    sprites["gloria_angry_04"] = a4

    # Lifted 1-2
    l1 = create_frame(48, 48)
    draw_totoro_body(l1, ox=0, oy=-2, mouth='angry_small', ear_twitch=1, belly_lift=True)
    sprites["gloria_lifted_01"] = l1

    l2 = create_frame(48, 48)
    draw_totoro_body(l2, ox=0, oy=-3, mouth='angry_huge', ear_twitch=0, belly_lift=True)
    sprites["gloria_lifted_02"] = l2

    return sprites


# --- CHIBI TOTORO (DIDO / DOG) SPRITES ---
# 46x27 frames.
# Chibi Totoro is tiny, pure spirit white/cream (LIGHT), with pointy ears, wide dark bead eyes, and carrying an acorn!

def draw_chibi_totoro(img, ox=0, oy=0, pose='stand', run_frame=0):
    cx = 20 + ox
    cy = 13 + oy

    # Small pear body (Cream/Light color)
    draw_rect(img, cx-6, cy-5, cx+6, cy+8, LIGHT)
    draw_rect(img, cx-8, cy-2, cx+8, cy+7, LIGHT)

    # Outline
    draw_rect(img, cx-5, cy-6, cx+5, cy-6, OUTLINE) # top head
    draw_rect(img, cx-7, cy+9, cx+7, cy+9, OUTLINE) # bottom
    for dy in range(-5, 9):
        w = 9 if dy >= 0 else 7
        draw_pix(img, cx-w, cy+dy, OUTLINE)
        draw_pix(img, cx+w, cy+dy, OUTLINE)

    # Ears (cute pointy ears)
    draw_rect(img, cx-4, cy-12, cx-3, cy-6, LIGHT)
    draw_pix(img, cx-4, cy-13, OUTLINE)
    draw_pix(img, cx-5, cy-12, OUTLINE)
    draw_pix(img, cx-2, cy-12, OUTLINE)

    draw_rect(img, cx+3, cy-12, cx+4, cy-6, LIGHT)
    draw_pix(img, cx+4, cy-13, OUTLINE)
    draw_pix(img, cx+2, cy-12, OUTLINE)
    draw_pix(img, cx+5, cy-12, OUTLINE)

    # Big Bead Eyes
    draw_pix(img, cx-3, cy-3, OUTLINE)
    draw_pix(img, cx-2, cy-3, OUTLINE)
    draw_pix(img, cx+2, cy-3, OUTLINE)
    draw_pix(img, cx+3, cy-3, OUTLINE)

    # Tiny spirit tail
    draw_rect(img, cx-9, cy+4, cx-8, cy+6, LIGHT)
    draw_rect(img, cx-10, cy+5, cx-9, cy+6, OUTLINE)

    # Legs & Acorn
    if pose == 'stand':
        # Tiny feet
        draw_rect(img, cx-5, cy+9, cx-2, cy+11, DARK)
        draw_rect(img, cx+2, cy+9, cx+5, cy+11, DARK)
        # Acorn held in hands
        draw_rect(img, cx-1, cy+2, cx+2, cy+5, DARK)
        draw_pix(img, cx, cy+1, OUTLINE) # stem
    elif pose == 'sniff':
        # Leaning down
        draw_rect(img, cx-4, cy+8, cx-1, cy+10, DARK)
        draw_rect(img, cx+1, cy+8, cx+4, cy+10, DARK)
        # Leaf on ground
        draw_pix(img, cx+7, cy+9, DARK)
        draw_pix(img, cx+8, cy+8, MID)
    elif pose == 'run':
        if run_frame == 0:
            draw_rect(img, cx-7, cy+8, cx-3, cy+11, DARK)
            draw_rect(img, cx+2, cy+7, cx+6, cy+10, DARK)
        elif run_frame == 1:
            draw_rect(img, cx-3, cy+8, cx, cy+11, DARK)
            draw_rect(img, cx+1, cy+8, cx+4, cy+11, DARK)
        else:
            draw_rect(img, cx-5, cy+7, cx-1, cy+10, DARK)
            draw_rect(img, cx+4, cy+8, cx+8, cy+11, DARK)
        # Little bag/acorn swinging
        draw_rect(img, cx-1, cy+2, cx+2, cy+5, DARK)
    elif pose == 'spin':
        # Cute hopping spin
        draw_rect(img, cx-3, cy+7, cx+3, cy+10, DARK)
        draw_rect(img, cx-6, cy+2, cx+6, cy+5, MID) # spin dust

def generate_chibi_sprites():
    sprites = {}

    s1 = create_frame(46, 27)
    draw_chibi_totoro(s1, ox=2, oy=1, pose='stand')
    sprites["dog_stand_01"] = s1

    sn1 = create_frame(46, 27)
    draw_chibi_totoro(sn1, ox=2, oy=2, pose='sniff')
    sprites["dog_sniff_01"] = sn1

    for i in range(1, 4):
        img = create_frame(46, 27)
        draw_chibi_totoro(img, ox=2, oy=1, pose='run', run_frame=i-1)
        sprites[f"dog_run_0{i}"] = img

    sp1 = create_frame(46, 27)
    draw_chibi_totoro(sp1, ox=2, oy=0, pose='spin')
    sprites["dog_takeleak_01"] = sp1

    sp2 = create_frame(46, 27)
    draw_chibi_totoro(sp2, ox=2, oy=-1, pose='spin')
    sprites["dog_takeleak_02"] = sp2

    return sprites


def main():
    print("Loading sprites.json...")
    with open(SPRITES_JSON) as f:
        atlas = json.load(f)

    frame_map = {item["filename"]: item["frame"] for item in atlas["frames"]}

    print("Generating custom sprites...")
    hero_sprites = generate_hero_sprites()
    totoro_sprites = generate_totoro_sprites()
    chibi_sprites = generate_chibi_sprites()

    all_custom = {}
    all_custom.update(hero_sprites)
    all_custom.update(totoro_sprites)
    all_custom.update(chibi_sprites)

    print(f"Total custom sprites: {len(all_custom)}")

    img = Image.open(SPRITES_PNG).convert("RGBA")

    for name, sprite in all_custom.items():
        if name in frame_map:
            box = frame_map[name]
            x, y, w, h = box["x"], box["y"], box["w"], box["h"]
            # Clear old frame region first
            clear_rect = Image.new("RGBA", (w, h), CLEAR)
            img.paste(clear_rect, (x, y))
            # Paste our custom pixel art
            # Scale or center if dimensions differ
            if sprite.size != (w, h):
                resized = sprite.crop((0, 0, w, h))
                img.paste(resized, (x, y), resized)
            else:
                img.paste(sprite, (x, y), sprite)
            print(f"  Pasted {name} at ({x}, {y}, {w}, {h})")
        else:
            print(f"  Warning: {name} not found in atlas!")

    img.save(SPRITES_PNG)
    print("Successfully updated sprites.png with custom Moon Walker & Totoro sprites!")

if __name__ == "__main__":
    main()
