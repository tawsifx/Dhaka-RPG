// scripts/race/stk/fetch-stk.mjs - Automated acquisition of candidate SuperTuxKart assets
import fs from 'fs';
import path from 'path';
import { downloadFile } from '../../lib/parallel-download.mjs';

const CACHE_DIR = path.resolve('.cache/stk-assets');
const SVN_BASE = 'https://svn.code.sf.net/p/supertuxkart/code/stk-assets';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/supertuxkart/stk-code/master/data';

// Manifest of target files to fetch from STK SVN & GitHub
export const STK_FETCH_MANIFEST = [
  // 1. Root licenses
  { source: `${SVN_BASE}/licenses.txt`, dest: 'licenses.txt' },

  // 2. Library Props
  { source: `${SVN_BASE}/library/hd_chineseRedLantern_a/hd_chineseRedLantern_a_main.spm`, dest: 'library/hd_chineseRedLantern_a/hd_chineseRedLantern_a_main.spm' },
  { source: `${SVN_BASE}/library/hd_chineseRedLantern_a/hd_chineseRedLantern_a_Albedo.png`, dest: 'library/hd_chineseRedLantern_a/hd_chineseRedLantern_a_Albedo.png' },
  { source: `${SVN_BASE}/library/hd_chineseRedLantern_a/licenses.txt`, dest: 'library/hd_chineseRedLantern_a/licenses.txt' },
  { source: `${SVN_BASE}/library/hd_chineseRedLantern_a/node.xml`, dest: 'library/hd_chineseRedLantern_a/node.xml' },

  { source: `${SVN_BASE}/library/hd_modernStreetLamp_a/hd_modernStreetLamp_a_main.spm`, dest: 'library/hd_modernStreetLamp_a/hd_modernStreetLamp_a_main.spm' },
  { source: `${SVN_BASE}/library/hd_modernStreetLamp_a/hd_modernStreetLamp_a_Albedo.png`, dest: 'library/hd_modernStreetLamp_a/hd_modernStreetLamp_a_Albedo.png' },
  { source: `${SVN_BASE}/library/hd_modernStreetLamp_a/licenses.txt`, dest: 'library/hd_modernStreetLamp_a/licenses.txt' },
  { source: `${SVN_BASE}/library/hd_modernStreetLamp_a/node.xml`, dest: 'library/hd_modernStreetLamp_a/node.xml' },

  { source: `${SVN_BASE}/library/stklib_bench_a/stklib_bench_a_main.spm`, dest: 'library/stklib_bench_a/stklib_bench_a_main.spm' },
  { source: `${SVN_BASE}/library/stklib_bench_a/node.xml`, dest: 'library/stklib_bench_a/node.xml' },

  { source: `${SVN_BASE}/library/stklib_autumnTree_a/stklib_autumnTree_a_main.spm`, dest: 'library/stklib_autumnTree_a/stklib_autumnTree_a_main.spm' },
  { source: `${SVN_BASE}/library/stklib_autumnTree_a/node.xml`, dest: 'library/stklib_autumnTree_a/node.xml' },

  { source: `${SVN_BASE}/library/stklib_autumnSmallBush_a/stklib_autumnSmallBush_a_main.spm`, dest: 'library/stklib_autumnSmallBush_a/stklib_autumnSmallBush_a_main.spm' },
  { source: `${SVN_BASE}/library/stklib_asianWoodPost_a/stklib_asianWoodPost_a_main.spm`, dest: 'library/stklib_asianWoodPost_a/stklib_asianWoodPost_a_main.spm' },
  { source: `${SVN_BASE}/library/stklib_fitchBarrel_a/stklib_fitchBarrel_a_main.spm`, dest: 'library/stklib_fitchBarrel_a/stklib_fitchBarrel_a_main.spm' },

  // 3. Track Textures & Skybox (Candela City, Zen Garden, Hacienda, Ravenbridge)
  { source: `${SVN_BASE}/tracks/candela_city/sky.png`, dest: 'tracks/candela_city/sky.png' },
  { source: `${SVN_BASE}/tracks/candela_city/sky-top.png`, dest: 'tracks/candela_city/sky-top.png' },
  { source: `${SVN_BASE}/tracks/candela_city/sky-side.png`, dest: 'tracks/candela_city/sky-side.png' },
  { source: `${SVN_BASE}/tracks/candela_city/sky-ibl.png`, dest: 'tracks/candela_city/sky-ibl.png' },
  { source: `${SVN_BASE}/tracks/candela_city/start_sign.spm`, dest: 'tracks/candela_city/start_sign.spm' },
  { source: `${SVN_BASE}/tracks/candela_city/licenses.txt`, dest: 'tracks/candela_city/licenses.txt' },

  { source: `${SVN_BASE}/tracks/zengarden/blackRoad.jpg`, dest: 'tracks/zengarden/blackRoad.jpg' },
  { source: `${SVN_BASE}/tracks/zengarden/grassroad.jpg`, dest: 'tracks/zengarden/grassroad.jpg' },
  { source: `${SVN_BASE}/tracks/zengarden/JapanwoodBridge.jpg`, dest: 'tracks/zengarden/JapanwoodBridge.jpg' },
  { source: `${SVN_BASE}/tracks/zengarden/flower2.png`, dest: 'tracks/zengarden/flower2.png' },
  { source: `${SVN_BASE}/tracks/zengarden/bridge_LOD50.spm`, dest: 'tracks/zengarden/bridge_LOD50.spm' },
  { source: `${SVN_BASE}/tracks/zengarden/License.txt`, dest: 'tracks/zengarden/License.txt' },

  { source: `${SVN_BASE}/tracks/hacienda/boost_arrows.spm`, dest: 'tracks/hacienda/boost_arrows.spm' },
  { source: `${SVN_BASE}/tracks/hacienda/hacienda_ground.jpg`, dest: 'tracks/hacienda/hacienda_ground.jpg' },
  { source: `${SVN_BASE}/tracks/hacienda/hacienda_roof.jpg`, dest: 'tracks/hacienda/hacienda_roof.jpg' },
  { source: `${SVN_BASE}/tracks/hacienda/crate.png`, dest: 'tracks/hacienda/crate.png' },
  { source: `${SVN_BASE}/tracks/hacienda/License.txt`, dest: 'tracks/hacienda/License.txt' },

  { source: `${SVN_BASE}/tracks/ravenbridge_mansion/zipper_mansion.png`, dest: 'tracks/ravenbridge_mansion/zipper_mansion.png' },
  { source: `${SVN_BASE}/tracks/ravenbridge_mansion/swamp_water.png`, dest: 'tracks/ravenbridge_mansion/swamp_water.png' },
  { source: `${SVN_BASE}/tracks/ravenbridge_mansion/wall.spm`, dest: 'tracks/ravenbridge_mansion/wall.spm' },
  { source: `${SVN_BASE}/tracks/ravenbridge_mansion/licenses.txt`, dest: 'tracks/ravenbridge_mansion/licenses.txt' },

  // 4. Particle Sprites
  { source: `${SVN_BASE}/textures/gfx_sparkBlue_a.png`, dest: 'textures/gfx_sparkBlue_a.png' },
  { source: `${SVN_BASE}/textures/gfx_sparkFire_a.png`, dest: 'textures/gfx_sparkFire_a.png' },
  { source: `${SVN_BASE}/textures/smoke.png`, dest: 'textures/smoke.png' },
  { source: `${GITHUB_RAW_BASE}/gfx/gfx_sparkBlue_a.xml`, dest: 'gfx/gfx_sparkBlue_a.xml' },
  { source: `${GITHUB_RAW_BASE}/gfx/gfx_sparkFire_a.xml`, dest: 'gfx/gfx_sparkFire_a.xml' },
  { source: `${GITHUB_RAW_BASE}/gfx/smoke.xml`, dest: 'gfx/smoke.xml' },
  { source: `${GITHUB_RAW_BASE}/gfx/droplet.xml`, dest: 'gfx/droplet.xml' },

  // 5. Kart Parts (Wheels & Materials)
  { source: `${SVN_BASE}/karts/tux/wheel-front-left.spm`, dest: 'karts/tux/wheel-front-left.spm' },
  { source: `${SVN_BASE}/karts/tux/wheel-rear-left.spm`, dest: 'karts/tux/wheel-rear-left.spm' },
  { source: `${SVN_BASE}/karts/tux/wheel.png`, dest: 'karts/tux/wheel.png' },
  { source: `${SVN_BASE}/karts/tux/kart.xml`, dest: 'karts/tux/kart.xml' },
  { source: `${SVN_BASE}/karts/tux/licenses.txt`, dest: 'karts/tux/licenses.txt' },

  // 6. Music
  { source: `${SVN_BASE}/music/garden.ogg`, dest: 'music/garden.ogg' },
  { source: `${SVN_BASE}/music/garden.music`, dest: 'music/garden.music' },
  { source: `${SVN_BASE}/music/licenses.txt`, dest: 'music/licenses.txt' }
];

async function downloadItem(url, destPath) {
  const fullPath = path.join(CACHE_DIR, destPath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).size > 0) {
    console.log(`  [CACHED] ${destPath}`);
    return;
  }

  console.log(`  [DOWNLOADING] ${destPath}`);
  try {
    const res = await downloadFile(url, fullPath, {
      concurrency: 2,
      retries: 2,
      timeout: 20000
    });
    const size = fs.statSync(res.path).size;
    console.log(`  ✅ Done: ${destPath} (${(size / 1024).toFixed(1)} kB)`);
  } catch (err) {
    console.warn(`  ⚠️ Failed to download ${destPath}:`, err.message);
  }
}

export async function fetchStkAssets() {
  console.log(`======================================================`);
  console.log(`📥 SuperTuxKart Asset Fetcher`);
  console.log(`   Destination: ${CACHE_DIR}`);
  console.log(`======================================================`);

  // Parallel pool with concurrency = 4
  const CONCURRENCY = 4;
  for (let i = 0; i < STK_FETCH_MANIFEST.length; i += CONCURRENCY) {
    const chunk = STK_FETCH_MANIFEST.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map((item) => downloadItem(item.source, item.dest)));
  }

  console.log(`\n✅ STK Asset Fetch complete! Total items checked: ${STK_FETCH_MANIFEST.length}`);
}

if (process.argv[1]?.endsWith('fetch-stk.mjs')) {
  fetchStkAssets().catch((err) => {
    console.error('STK Fetch Failed:', err);
    process.exit(1);
  });
}
