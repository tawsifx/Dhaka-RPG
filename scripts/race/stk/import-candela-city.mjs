// scripts/race/stk/import-candela-city.mjs
// Parallel importer for SuperTuxKart Candela City assets
import fs from 'fs';
import path from 'path';
import { downloadFile } from '../../lib/parallel-download.mjs';
import { readSPM } from './spm-reader.mjs';
import { convertSpmToGlb } from './convert-mesh.mjs';

const CACHE_DIR = path.resolve('.cache/stk-assets');
const CANDELA_CACHE = path.join(CACHE_DIR, 'tracks/candela_city');
const TEXTURES_CACHE = path.join(CACHE_DIR, 'textures');
const OUT_MODELS = path.resolve('public/assets/race/stk/models');
const OUT_TEXTURES = path.resolve('public/assets/race/stk/textures');

const SVN_BASE = 'https://svn.code.sf.net/p/supertuxkart/code/stk-assets';
const CANDELA_SVN = `${SVN_BASE}/tracks/candela_city`;
const TEXTURES_SVN = `${SVN_BASE}/textures`;

fs.mkdirSync(CANDELA_CACHE, { recursive: true });
fs.mkdirSync(TEXTURES_CACHE, { recursive: true });
fs.mkdirSync(OUT_MODELS, { recursive: true });
fs.mkdirSync(OUT_TEXTURES, { recursive: true });

// Core Candela City models and assets
const CANDELA_CORE_FILES = [
  'candela_city_track.spm',
  'start_sign.spm',
  'start_sign_pattern.spm',
  'clockWork_a.spm',
  'clockWork_b.spm',
  'elevator_a1.spm',
  'elevator_a2.spm',
  'toy_train.spm',
  'car_traffic.spm',
  'gondola.spm',
  'caracalla_waterfall.spm',
  'materials.xml',
  'scene.xml',
  'track.xml',
  'sky.png',
  'licenses.txt'
];

async function main() {
  console.log('🏙️ Starting SuperTuxKart Candela City Parallel Import...');

  // 1. Download Candela City models and manifests in parallel
  console.log('\n📥 [1/4] Fetching Candela City core models via Parallel Downloader...');
  for (let i = 0; i < CANDELA_CORE_FILES.length; i += 4) {
    const chunk = CANDELA_CORE_FILES.slice(i, i + 4);
    await Promise.all(
      chunk.map(async (file) => {
        const url = `${CANDELA_SVN}/${file}`;
        const dest = path.join(CANDELA_CACHE, file);
        try {
          await downloadFile(url, dest, { concurrency: 1, retries: 2, timeout: 25000 });
          const size = fs.statSync(dest).size;
          console.log(`  ✅ ${file} (${(size / 1024).toFixed(1)} kB)`);
        } catch (err) {
          console.warn(`  ⚠️ Failed to fetch ${file}: ${err.message}`);
        }
      })
    );
  }

  // 2. Discover all textures referenced in candela_city_track.spm and other models
  console.log('\n🔍 [2/4] Scanning Candela City SPM meshes for required textures...');
  const texturesNeeded = new Set();
  const spmFiles = fs.readdirSync(CANDELA_CACHE).filter((f) => f.endsWith('.spm'));

  for (const spmFile of spmFiles) {
    try {
      const buf = fs.readFileSync(path.join(CANDELA_CACHE, spmFile));
      const spm = readSPM(buf, { transformCoordinates: false });
      if (spm.materials) {
        for (const m of spm.materials) {
          if (m.tex1) texturesNeeded.add(m.tex1);
          if (m.tex2) texturesNeeded.add(m.tex2);
        }
      }
    } catch (err) {
      console.warn(`  ⚠️ Could not read materials from ${spmFile}: ${err.message}`);
    }
  }

  console.log(`  Discovered ${texturesNeeded.size} textures used across Candela City meshes.`);

  // 3. Download required textures from either tracks/candela_city or textures/
  console.log('\n🎨 [3/4] Fetching Candela City textures in parallel...');
  const texList = Array.from(texturesNeeded);
  for (let i = 0; i < texList.length; i += 4) {
    const chunk = texList.slice(i, i + 4);
    await Promise.all(
      chunk.map(async (tex) => {
        const destCandela = path.join(CANDELA_CACHE, tex);
        const destGlobal = path.join(TEXTURES_CACHE, tex);

        if (fs.existsSync(destCandela) || fs.existsSync(destGlobal)) {
          return;
        }

        // Try downloading from tracks/candela_city first, then textures/
        try {
          await downloadFile(`${CANDELA_SVN}/${tex}`, destCandela, { concurrency: 1, retries: 1, timeout: 15000 });
        } catch {
          try {
            await downloadFile(`${TEXTURES_SVN}/${tex}`, destGlobal, { concurrency: 1, retries: 1, timeout: 15000 });
          } catch {
            // Some STK textures might be procedural or optional
          }
        }
      })
    );
  }

  // Copy downloaded textures to public/assets/race/stk/textures/
  for (const dir of [CANDELA_CACHE, TEXTURES_CACHE]) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f.endsWith('.png') || f.endsWith('.jpg')) {
        const srcPath = path.join(dir, f);
        const dstPath = path.join(OUT_TEXTURES, f);
        if (!fs.existsSync(dstPath)) {
          fs.copyFileSync(srcPath, dstPath);
        }
      }
    }
  }

  // 4. Batch convert Candela City models into standard GLB
  console.log('\n⚙️ [4/4] Converting Candela City SPM meshes into GLB models...');
  const conversionTargets = [
    { in: 'candela_city_track.spm', out: 'candela_city_track.glb' },
    { in: 'start_sign.spm', out: 'stk_start_sign.glb' },
    { in: 'clockWork_a.spm', out: 'stk_clockwork.glb' },
    { in: 'elevator_a1.spm', out: 'stk_elevator.glb' },
    { in: 'toy_train.spm', out: 'stk_toy_train.glb' },
    { in: 'caracalla_waterfall.spm', out: 'stk_waterfall.glb' },
    { in: 'gondola.spm', out: 'stk_gondola.glb' }
  ];

  for (const target of conversionTargets) {
    const spmPath = path.join(CANDELA_CACHE, target.in);
    const outGlb = path.join(OUT_MODELS, target.out);
    if (!fs.existsSync(spmPath)) {
      console.warn(`  ⚠️ Missing ${target.in}, skipping...`);
      continue;
    }

    try {
      const glbBuf = await convertSpmToGlb(spmPath, {
        textureSearchDir: CANDELA_CACHE
      });
      fs.writeFileSync(outGlb, glbBuf);
      console.log(`  ✅ Converted ${target.out} (${(glbBuf.length / 1024).toFixed(1)} kB)`);
    } catch (err) {
      console.warn(`  ⚠️ Conversion of ${target.in} failed: ${err.message}`);
    }
  }

  console.log('\n✨ Candela City Import Complete!');
}

main().catch((err) => {
  console.error('Candela City Import Failed:', err);
  process.exit(1);
});
