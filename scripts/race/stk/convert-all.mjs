/**
 * convert-all.mjs
 * Converts all candidate STK assets from .cache/stk-assets into
 * public/assets/race/stk/models/ and public/assets/race/stk/textures/ and public/assets/race/audio/
 */

import fs from 'fs';
import path from 'path';
import { convertSpmToGlb } from './convert-mesh.mjs';

const CACHE_DIR = path.resolve('.cache/stk-assets');
const OUT_MODELS = path.resolve('public/assets/race/stk/models');
const OUT_TEXTURES = path.resolve('public/assets/race/stk/textures');
const OUT_AUDIO = path.resolve('public/assets/race/audio');

fs.mkdirSync(OUT_MODELS, { recursive: true });
fs.mkdirSync(OUT_TEXTURES, { recursive: true });
fs.mkdirSync(OUT_AUDIO, { recursive: true });

async function main() {
  console.log('🔄 Converting and copying STK assets...');

  // 1. Models
  const modelsToConvert = [
    {
      in: 'library/hd_modernStreetLamp_a/hd_modernStreetLamp_a_main.spm',
      out: 'lamp.glb',
      dir: 'library/hd_modernStreetLamp_a',
      color: 0x444444
    },
    {
      in: 'library/hd_chineseRedLantern_a/hd_chineseRedLantern_a_main.spm',
      out: 'lantern.glb',
      dir: 'library/hd_chineseRedLantern_a',
      tint: 0xd32f2f
    },
    {
      in: 'library/stklib_bench_a/stklib_bench_a_main.spm',
      out: 'bench.glb',
      dir: 'library/stklib_bench_a',
      color: 0x8b5a2b
    },
    {
      in: 'library/stklib_autumnTree_a/stklib_autumnTree_a_main.spm',
      out: 'krishnachura_tree.glb',
      dir: 'library/stklib_autumnTree_a',
      tint: 0xcc2900 // Fiery flame red-orange for Krishnachura
    },
    {
      in: 'library/stklib_autumnSmallBush_a/stklib_autumnSmallBush_a_main.spm',
      out: 'bush.glb',
      dir: 'library/stklib_autumnSmallBush_a',
      tint: 0x2e7d32 // Green shrubbery
    },
    {
      in: 'library/stklib_asianWoodPost_a/stklib_asianWoodPost_a_main.spm',
      out: 'post.glb',
      dir: 'library/stklib_asianWoodPost_a',
      color: 0x5d4037
    },
    {
      in: 'library/stklib_fitchBarrel_a/stklib_fitchBarrel_a_main.spm',
      out: 'barrel.glb',
      dir: 'library/stklib_fitchBarrel_a',
      color: 0xffa000
    },
    {
      in: 'karts/tux/wheel-front-left.spm',
      out: 'wheel.glb',
      dir: 'karts/tux',
      color: 0x222222
    }
  ];

  for (const m of modelsToConvert) {
    const spmPath = path.join(CACHE_DIR, m.in);
    const outPath = path.join(OUT_MODELS, m.out);
    const texDir = path.join(CACHE_DIR, m.dir);

    if (fs.existsSync(spmPath)) {
      const glbBuf = await convertSpmToGlb(spmPath, {
        textureSearchDir: texDir,
        recolorTint: m.tint,
        defaultColor: m.color
      });
      fs.writeFileSync(outPath, glbBuf);
      console.log(`  ✅ Converted ${m.out} (${(glbBuf.length / 1024).toFixed(1)} kB)`);
    } else {
      console.warn(`  ⚠️ Missing input: ${spmPath}`);
    }
  }

  // 2. Textures
  const texturesToCopy = [
    { in: 'tracks/candela_city/sky.png', out: 'sky.png' },
    { in: 'tracks/zengarden/blackRoad.jpg', out: 'road.jpg' },
    { in: 'tracks/hacienda/hacienda_ground.jpg', out: 'sidewalk.jpg' },
    { in: 'textures/gfx_sparkBlue_a.png', out: 'spark_blue.png' },
    { in: 'textures/gfx_sparkFire_a.png', out: 'spark_orange.png' },
    { in: 'textures/smoke.png', out: 'smoke.png' }
  ];

  for (const t of texturesToCopy) {
    const src = path.join(CACHE_DIR, t.in);
    const dst = path.join(OUT_TEXTURES, t.out);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      console.log(`  ✅ Copied texture ${t.out}`);
    }
  }

  // 3. Audio
  const musicSrc = path.join(CACHE_DIR, 'music/garden.ogg');
  const musicDst = path.join(OUT_AUDIO, 'garden.ogg');
  if (fs.existsSync(musicSrc)) {
    fs.copyFileSync(musicSrc, musicDst);
    console.log(`  ✅ Copied music garden.ogg (${(fs.statSync(musicDst).size / 1024 / 1024).toFixed(2)} MB)`);
  }

  console.log('🎉 All assets converted successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
