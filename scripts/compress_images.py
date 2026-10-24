#!/usr/bin/env python3
"""
Lossless PNG Optimizer for Dhaka Date RPG.
Applies:
- Exact palette indexing (1-bit, 2-bit, 4-bit, 8-bit PLTE + minimal tRNS) when <= 256 unique RGBA colors
- Truecolor RGB conversion when all pixels are 100% opaque (alpha == 255)
- Transparent pixel RGB zeroing (alpha == 0 -> RGB 0,0,0) for higher deflate redundancy
- Exhaustive PNG scanline filter search (None, Sub, Up, Average, Paeth, and per-row Adaptive)
- Exhaustive zlib strategy search (DEFAULT, FILTERED, RLE, HUFFMAN_ONLY) at level 9 / memLevel 9
- Non-essential metadata chunk stripping (tEXt, iTXt, zTXt, pHYs, iCCP, sRGB, gAMA)
- Pixel-by-pixel RGBA verification to guarantee 100% zero visual quality loss.
"""

import glob
import hashlib
import io
import os
import struct
import zlib
import numpy as np
from PIL import Image


def make_chunk(chunk_type: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)


def compute_all_filtered_scans(raw_rows: np.ndarray, bpp: int, include_sub_filters: bool = True) -> list[bytes]:
    H, W = raw_rows.shape
    row = raw_rows.astype(np.int16)

    # Filter 0: None
    c0 = row.astype(np.uint8)
    f0 = np.hstack([np.zeros((H, 1), dtype=np.uint8), c0]).tobytes()
    if not include_sub_filters:
        up = np.zeros_like(row)
        up[1:, :] = row[:-1, :]
        c2 = ((row - up) & 0xFF).astype(np.uint8)
        f2 = np.hstack([np.full((H, 1), 2, dtype=np.uint8), c2]).tobytes()
        return [f0, f2]

    left = np.zeros_like(row)
    left[:, bpp:] = row[:, :-bpp]

    up = np.zeros_like(row)
    up[1:, :] = row[:-1, :]

    up_left = np.zeros_like(row)
    up_left[1:, bpp:] = row[:-1, :-bpp]

    c1 = ((row - left) & 0xFF).astype(np.uint8)
    c2 = ((row - up) & 0xFF).astype(np.uint8)
    c3 = ((row - ((left + up) >> 1)) & 0xFF).astype(np.uint8)

    p = left + up - up_left
    pa = np.abs(p - left)
    pb = np.abs(p - up)
    pc = np.abs(p - up_left)
    pr = np.where((pa <= pb) & (pa <= pc), left, np.where(pb <= pc, up, up_left))
    c4 = ((row - pr) & 0xFF).astype(np.uint8)

    f1 = np.hstack([np.full((H, 1), 1, dtype=np.uint8), c1]).tobytes()
    f2 = np.hstack([np.full((H, 1), 2, dtype=np.uint8), c2]).tobytes()
    f3 = np.hstack([np.full((H, 1), 3, dtype=np.uint8), c3]).tobytes()
    f4 = np.hstack([np.full((H, 1), 4, dtype=np.uint8), c4]).tobytes()

    # Adaptive per-row minimum sum of absolute signed differences
    stacked = np.stack([c0, c1, c2, c3, c4], axis=0)  # (5, H, W)
    signed_dist = np.minimum(stacked, 256 - stacked.astype(np.int16))
    scores = np.sum(signed_dist, axis=2)  # (5, H)
    best_f = np.argmin(scores, axis=0).astype(np.uint8)  # (H,)
    best_rows = stacked[best_f, np.arange(H)]  # (H, W)
    f5 = np.hstack([best_f[:, None], best_rows]).tobytes()

    return [f0, f1, f2, f3, f4, f5]


def best_zlib_compress(raw_data: bytes) -> bytes:
    best = None
    for strat in (zlib.Z_DEFAULT_STRATEGY, zlib.Z_FILTERED, zlib.Z_RLE, zlib.Z_HUFFMAN_ONLY):
        comp = zlib.compressobj(level=9, method=zlib.DEFLATED, wbits=15, memLevel=9, strategy=strat)
        cdata = comp.compress(raw_data) + comp.flush()
        if best is None or len(cdata) < len(best):
            best = cdata
    return best


def pack_subbyte_rows(indices: np.ndarray, bit_depth: int) -> np.ndarray:
    H, W = indices.shape
    if bit_depth == 8:
        return indices.astype(np.uint8)
    elif bit_depth == 4:
        if W % 2 != 0:
            indices = np.pad(indices, ((0, 0), (0, 1)), mode="constant")
        return ((indices[:, 0::2] << 4) | indices[:, 1::2]).astype(np.uint8)
    elif bit_depth == 2:
        pad = (4 - (W % 4)) % 4
        if pad:
            indices = np.pad(indices, ((0, 0), (0, pad)), mode="constant")
        return (
            (indices[:, 0::4] << 6)
            | (indices[:, 1::4] << 4)
            | (indices[:, 2::4] << 2)
            | indices[:, 3::4]
        ).astype(np.uint8)
    elif bit_depth == 1:
        pad = (8 - (W % 8)) % 8
        if pad:
            indices = np.pad(indices, ((0, 0), (0, pad)), mode="constant")
        res = np.zeros((H, indices.shape[1] // 8), dtype=np.uint8)
        for b in range(8):
            res |= indices[:, b::8].astype(np.uint8) << (7 - b)
        return res
    raise ValueError(f"Unsupported bit depth: {bit_depth}")


def build_png(
    width: int,
    height: int,
    bit_depth: int,
    color_type: int,
    idat_payload: bytes,
    plte: bytes = b"",
    trns: bytes = b"",
) -> bytes:
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, bit_depth, color_type, 0, 0, 0)
    chunks = [sig, make_chunk(b"IHDR", ihdr)]
    if plte:
        chunks.append(make_chunk(b"PLTE", plte))
    if trns:
        chunks.append(make_chunk(b"tRNS", trns))
    chunks.append(make_chunk(b"IDAT", idat_payload))
    chunks.append(make_chunk(b"IEND", b""))
    return b"".join(chunks)


def optimize_png_bytes(orig_bytes: bytes, label: str = "") -> bytes:
    im = Image.open(io.BytesIO(orig_bytes))
    rgba = np.array(im.convert("RGBA"), dtype=np.uint8)
    H, W, _ = rgba.shape

    rgba_clean = rgba.copy()
    rgba_clean[rgba_clean[:, :, 3] == 0] = [0, 0, 0, 0]

    candidates = [orig_bytes]
    has_alpha = bool(np.any(rgba_clean[:, :, 3] < 255))

    # Fast color count check using packed uint32
    packed_rgba = (
        (rgba_clean[:, :, 0].astype(np.uint32) << 24)
        | (rgba_clean[:, :, 1].astype(np.uint32) << 16)
        | (rgba_clean[:, :, 2].astype(np.uint32) << 8)
        | rgba_clean[:, :, 3].astype(np.uint32)
    ).ravel()

    uniq_u32, inv = np.unique(packed_rgba, return_inverse=True)
    num_colors = len(uniq_u32)

    if num_colors <= 256:
        uniq = np.column_stack(
            [
                (uniq_u32 >> 24) & 0xFF,
                (uniq_u32 >> 16) & 0xFF,
                (uniq_u32 >> 8) & 0xFF,
                uniq_u32 & 0xFF,
            ]
        ).astype(np.uint8)

        counts = np.bincount(inv)
        order = sorted(
            range(num_colors),
            key=lambda i: (
                0 if uniq[i, 3] < 255 else 1,
                -int(counts[i]),
                int(uniq[i, 0]),
                int(uniq[i, 1]),
                int(uniq[i, 2]),
            ),
        )
        remap = np.zeros(num_colors, dtype=np.uint8)
        for new_idx, old_idx in enumerate(order):
            remap[old_idx] = new_idx
        pal = uniq[order]
        idx_img = remap[inv].reshape(H, W)

        plte_bytes = pal[:, :3].astype(np.uint8).tobytes()
        non_opaque = np.where(pal[:, 3] < 255)[0]
        if len(non_opaque) > 0:
            last_trns = int(non_opaque[-1]) + 1
            trns_bytes = pal[:last_trns, 3].astype(np.uint8).tobytes()
        else:
            trns_bytes = b""

        if num_colors <= 2:
            bdepths = [1, 2, 4, 8]
        elif num_colors <= 4:
            bdepths = [2, 4, 8]
        elif num_colors <= 16:
            bdepths = [4, 8]
        else:
            bdepths = [8]

        for bd in bdepths:
            packed = pack_subbyte_rows(idx_img, bd)
            for scan in compute_all_filtered_scans(packed, 1, include_sub_filters=(bd == 8)):
                z = best_zlib_compress(scan)
                candidates.append(build_png(W, H, bd, 3, z, plte_bytes, trns_bytes))

    if not has_alpha:
        rgb_rows = rgba_clean[:, :, :3].reshape(H, W * 3)
        for scan in compute_all_filtered_scans(rgb_rows, 3, include_sub_filters=True):
            z = best_zlib_compress(scan)
            candidates.append(build_png(W, H, 8, 2, z))
    else:
        rgba_rows = rgba_clean.reshape(H, W * 4)
        for scan in compute_all_filtered_scans(rgba_rows, 4, include_sub_filters=True):
            z = best_zlib_compress(scan)
            candidates.append(build_png(W, H, 8, 6, z))

    best_png = min(candidates, key=len)

    # Pixel-exact verification
    ver_im = Image.open(io.BytesIO(best_png)).convert("RGBA")
    ver_rgba = np.array(ver_im, dtype=np.uint8)
    ver_rgba[ver_rgba[:, :, 3] == 0] = [0, 0, 0, 0]
    if not np.array_equal(rgba_clean, ver_rgba) or ver_im.size != im.size:
        raise RuntimeError(f"Lossless verification failed for {label}")

    return best_png


def main() -> None:
    patterns = [
        "public/assets/**/*.png",
        "assets/**/*.png",
        "docs/**/*.png",
    ]
    files = sorted({p for pat in patterns for p in glob.glob(pat, recursive=True)})
    cache: dict[str, bytes] = {}

    total_before = 0
    total_after = 0
    updated_count = 0

    for path in files:
        with open(path, "rb") as f:
            orig = f.read()
        b_sz = len(orig)
        total_before += b_sz

        digest = hashlib.sha256(orig).hexdigest()
        if digest in cache:
            opt = cache[digest]
        else:
            opt = optimize_png_bytes(orig, path)
            cache[digest] = opt

        a_sz = len(opt)
        total_after += a_sz
        if a_sz < b_sz:
            with open(path, "wb") as f:
                f.write(opt)
            updated_count += 1
        pct = (1.0 - a_sz / b_sz) * 100.0 if b_sz else 0.0
        print(f"{path}: {b_sz:,} -> {a_sz:,} B (-{pct:.1f}%)")

    saved = total_before - total_after
    total_pct = (1.0 - total_after / total_before) * 100.0 if total_before else 0.0
    print(
        f"\nOptimized {updated_count}/{len(files)} PNG files losslessly: "
        f"{total_before:,} B -> {total_after:,} B (Saved {saved:,} B / -{total_pct:.1f}%)"
    )


if __name__ == "__main__":
    main()
