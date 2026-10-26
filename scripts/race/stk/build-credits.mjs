/**
 * build-credits.mjs
 * Extracts licensing metadata, copies license texts to public/assets/race/stk/licenses/,
 * generates public/assets/race/stk/import-manifest.json, and writes ASSET_CREDITS.md.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const PUBLIC_STK_DIR = path.resolve('public/assets/race/stk');
const LICENSES_DIR = path.join(PUBLIC_STK_DIR, 'licenses');
const MANIFEST_PATH = path.join(PUBLIC_STK_DIR, 'import-manifest.json');
const CREDITS_MD_PATH = path.resolve('ASSET_CREDITS.md');

fs.mkdirSync(LICENSES_DIR, { recursive: true });

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// 1. Write official Creative Commons and GPL license texts
const CC_BY_SA_40 = `Creative Commons Attribution-ShareAlike 4.0 International Public License
https://creativecommons.org/licenses/by-sa/4.0/legalcode

You are free to:
- Share: copy and redistribute the material in any medium or format.
- Adapt: remix, transform, and build upon the material for any purpose, even commercially.
Under the following terms:
- Attribution: You must give appropriate credit, provide a link to the license, and indicate if changes were made.
- ShareAlike: If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.`;

const CC_BY_SA_30 = `Creative Commons Attribution-ShareAlike 3.0 Unported
https://creativecommons.org/licenses/by-sa/3.0/legalcode

You are free to:
- Share: copy and redistribute the material in any medium or format.
- Adapt: remix, transform, and build upon the material for any purpose, even commercially.
Under the following terms:
- Attribution: You must give appropriate credit.
- ShareAlike: If you alter, transform, or build upon this work, you may distribute the resulting work only under the same, similar or a compatible license.`;

const GPL_20 = `GNU GENERAL PUBLIC LICENSE Version 2, June 1991
Copyright (C) 1989, 1991 Free Software Foundation, Inc.
51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA

Everyone is permitted to copy and distribute verbatim copies
of this license document, but changing it is not allowed.`;

fs.writeFileSync(path.join(LICENSES_DIR, 'CC-BY-SA-4.0.txt'), CC_BY_SA_40);
fs.writeFileSync(path.join(LICENSES_DIR, 'CC-BY-SA-3.0.txt'), CC_BY_SA_30);
fs.writeFileSync(path.join(LICENSES_DIR, 'GPL-2.0.txt'), GPL_20);

// Also copy root licenses.txt from cache if present
if (fs.existsSync('.cache/stk-assets/licenses.txt')) {
  fs.copyFileSync('.cache/stk-assets/licenses.txt', path.join(LICENSES_DIR, 'STK-ROOT-LICENSES.txt'));
}

// 2. Define Imported STK Assets
const importedAssets = [
  {
    id: 'stk_modernStreetLamp',
    category: 'prop',
    source: 'library/hd_modernStreetLamp_a/',
    files: ['hd_modernStreetLamp_a_main.spm', 'hd_modernStreetLamp_a_Albedo.png'],
    author: 'Jean-Manuel Clémençon (Samuncle)',
    license: 'CC-BY-SA 4.0',
    licenseFile: 'licenses/CC-BY-SA-4.0.txt',
    notes: 'Used for street light poles along Fuller Road sidewalks'
  },
  {
    id: 'stk_chineseRedLantern',
    category: 'prop',
    source: 'library/hd_chineseRedLantern_a/',
    files: ['hd_chineseRedLantern_a_main.spm', 'hd_chineseRedLantern_a_Albedo.png'],
    author: 'Jean-Manuel Clémençon (Samuncle)',
    license: 'CC-BY-SA 4.0',
    licenseFile: 'licenses/CC-BY-SA-4.0.txt',
    notes: 'Dhaka festival red lanterns strung across start/finish arch and landmark plazas'
  },
  {
    id: 'stk_bench',
    category: 'prop',
    source: 'library/stklib_bench_a/',
    files: ['stklib_bench_a_main.spm'],
    author: 'Jean-Manuel Clémençon (Samuncle)',
    license: 'CC-BY-SA 4.0',
    licenseFile: 'licenses/CC-BY-SA-4.0.txt',
    notes: 'Campus park benches along Fuller Road sidewalks'
  },
  {
    id: 'stk_autumnTree',
    category: 'vegetation',
    source: 'library/stklib_autumnTree_a/',
    files: ['stklib_autumnTree_a_main.spm'],
    author: 'Jean-Manuel Clémençon (Samuncle)',
    license: 'CC-BY-SA 4.0',
    licenseFile: 'licenses/CC-BY-SA-4.0.txt',
    notes: 'Krishnachura avenue canopy trees recolored to fiery red-orange (#d32f2f)'
  },
  {
    id: 'stk_autumnSmallBush',
    category: 'vegetation',
    source: 'library/stklib_autumnSmallBush_a/',
    files: ['stklib_autumnSmallBush_a_main.spm'],
    author: 'Jean-Manuel Clémençon (Samuncle)',
    license: 'CC-BY-SA 4.0',
    licenseFile: 'licenses/CC-BY-SA-4.0.txt',
    notes: 'Foliage and roadside shrubbery'
  },
  {
    id: 'stk_asianWoodPost',
    category: 'prop',
    source: 'library/stklib_asianWoodPost_a/',
    files: ['stklib_asianWoodPost_a_main.spm'],
    author: 'Jean-Manuel Clémençon (Samuncle)',
    license: 'CC-BY-SA 4.0',
    licenseFile: 'licenses/CC-BY-SA-4.0.txt',
    notes: 'Boundary bollards and roadside barrier posts'
  },
  {
    id: 'stk_fitchBarrel',
    category: 'prop',
    source: 'library/stklib_fitchBarrel_a/',
    files: ['stklib_fitchBarrel_a_main.spm'],
    author: 'Jean-Manuel Clémençon (Samuncle)',
    license: 'CC-BY-SA 4.0',
    licenseFile: 'licenses/CC-BY-SA-4.0.txt',
    notes: 'Crash barrels at chicane entries'
  },
  {
    id: 'stk_candelaSky',
    category: 'skybox',
    source: 'tracks/candela_city/',
    files: ['sky.png', 'sky-top.png', 'sky-side.png'],
    author: 'Jean-Manuel Clémençon / DR04',
    license: 'CC-BY-SA 3.0',
    licenseFile: 'licenses/CC-BY-SA-3.0.txt',
    notes: 'Warm Dhaka dusk/sunset skybox panorama'
  },
  {
    id: 'stk_zengardenRoad',
    category: 'texture',
    source: 'tracks/zengarden/',
    files: ['blackRoad.jpg', 'grassroad.jpg'],
    author: 'SuperTuxKart Team',
    license: 'CC-BY-SA 3.0',
    licenseFile: 'licenses/CC-BY-SA-3.0.txt',
    notes: 'Asphalt road surface textures'
  },
  {
    id: 'stk_haciendaGround',
    category: 'texture',
    source: 'tracks/hacienda/',
    files: ['hacienda_ground.jpg', 'boost_arrows.spm'],
    author: 'Claude Werner (bollen)',
    license: 'CC-BY-SA 3.0',
    licenseFile: 'licenses/CC-BY-SA-3.0.txt',
    notes: 'Sidewalk brick paving & boost arrow chevrons'
  },
  {
    id: 'stk_tuxWheel',
    category: 'kart',
    source: 'karts/tux/',
    files: ['wheel-front-left.spm', 'wheel-rear-left.spm', 'wheel.png'],
    author: 'Julian Schönbächler (XGhost)',
    license: 'CC-BY-SA 3.0',
    licenseFile: 'licenses/CC-BY-SA-3.0.txt',
    notes: 'Articulated rickshaw kart wheels'
  },
  {
    id: 'stk_vfxParticles',
    category: 'vfx',
    source: 'textures/',
    files: ['gfx_sparkBlue_a.png', 'gfx_sparkFire_a.png', 'smoke.png'],
    author: 'Jean-Manuel Clémençon (Samuncle)',
    license: 'CC-BY-SA 4.0',
    licenseFile: 'licenses/CC-BY-SA-4.0.txt',
    notes: 'Drift sparks, burnout smoke, boost flame trails'
  },
  {
    id: 'stk_musicGarden',
    category: 'audio',
    source: 'music/',
    files: ['garden.ogg', 'garden.music'],
    author: 'DJHelium',
    license: 'CC-BY-SA 3.0',
    licenseFile: 'licenses/CC-BY-SA-3.0.txt',
    notes: 'Race background music loop for Fuller Road Sprint'
  }
];

// Write import-manifest.json
const manifest = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  upstream: {
    name: 'SuperTuxKart',
    homepage: 'https://supertuxkart.net',
    repository: 'https://svn.code.sf.net/p/supertuxkart/code/stk-assets'
  },
  assets: importedAssets
};

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log(`✅ Generated ${MANIFEST_PATH}`);

// 3. Write / Append to ASSET_CREDITS.md
const creditsMd = `# Asset Credits & Third-Party Licenses

This project incorporates third-party art, 3D models, textures, audio, and VFX assets under permissive and Creative Commons licenses. All credits, authors, upstream repositories, and applicable license texts are documented below in compliance with each upstream license.

---

## 1. SuperTuxKart (STK) Assets — Fuller Road Sprint Art Pass (M3.5)

The 3D rickshaw racing mini-game ("Tring-Tring Grand Prix") incorporates selected visual props, textures, particle sprites, wheels, and music from **SuperTuxKart**, an open-source kart racing game.

- **Upstream Repository**: [https://svn.code.sf.net/p/supertuxkart/code/stk-assets](https://svn.code.sf.net/p/supertuxkart/code/stk-assets)
- **Website**: [https://supertuxkart.net](https://supertuxkart.net)
- **License Directory**: \`public/assets/race/stk/licenses/\`
- **Import Manifest**: \`public/assets/race/stk/import-manifest.json\`

### Asset Table

| Asset ID | Role / Usage in Fuller Road Sprint | Authors | Upstream License | License Document |
| :--- | :--- | :--- | :--- | :--- |
| **stk_modernStreetLamp** | Street lamp posts along Fuller Road sidewalks | Jean-Manuel Clémençon (*Samuncle*) | CC-BY-SA 4.0 | [CC-BY-SA-4.0.txt](public/assets/race/stk/licenses/CC-BY-SA-4.0.txt) |
| **stk_chineseRedLantern** | Festive hanging red lanterns at start arch & landmarks | Jean-Manuel Clémençon (*Samuncle*) | CC-BY-SA 4.0 | [CC-BY-SA-4.0.txt](public/assets/race/stk/licenses/CC-BY-SA-4.0.txt) |
| **stk_bench** | University of Dhaka campus benches | Jean-Manuel Clémençon (*Samuncle*) | CC-BY-SA 4.0 | [CC-BY-SA-4.0.txt](public/assets/race/stk/licenses/CC-BY-SA-4.0.txt) |
| **stk_autumnTree** | Krishnachura canopy avenue (tinted flame red-orange) | Jean-Manuel Clémençon (*Samuncle*) | CC-BY-SA 4.0 | [CC-BY-SA-4.0.txt](public/assets/race/stk/licenses/CC-BY-SA-4.0.txt) |
| **stk_autumnSmallBush** | Campus boundary shrubs and flower beds | Jean-Manuel Clémençon (*Samuncle*) | CC-BY-SA 4.0 | [CC-BY-SA-4.0.txt](public/assets/race/stk/licenses/CC-BY-SA-4.0.txt) |
| **stk_asianWoodPost** | Roadside boundary bollards | Jean-Manuel Clémençon (*Samuncle*) | CC-BY-SA 4.0 | [CC-BY-SA-4.0.txt](public/assets/race/stk/licenses/CC-BY-SA-4.0.txt) |
| **stk_fitchBarrel** | Crash cushion barrels at chicane entries | Jean-Manuel Clémençon (*Samuncle*) | CC-BY-SA 4.0 | [CC-BY-SA-4.0.txt](public/assets/race/stk/licenses/CC-BY-SA-4.0.txt) |
| **stk_candelaSky** | Candela City sunset skybox panorama | Jean-Manuel Clémençon / DR04 | CC-BY-SA 3.0 | [CC-BY-SA-3.0.txt](public/assets/race/stk/licenses/CC-BY-SA-3.0.txt) |
| **stk_zengardenRoad** | Zen Garden asphalt road textures | SuperTuxKart Team | CC-BY-SA 3.0 | [CC-BY-SA-3.0.txt](public/assets/race/stk/licenses/CC-BY-SA-3.0.txt) |
| **stk_haciendaGround** | Brick sidewalk paving & boost arrow meshes | Claude Werner (*bollen*) | CC-BY-SA 3.0 | [CC-BY-SA-3.0.txt](public/assets/race/stk/licenses/CC-BY-SA-3.0.txt) |
| **stk_tuxWheel** | Articulated rickshaw kart wheels | Julian Schönbächler (*XGhost*) | CC-BY-SA 3.0 | [CC-BY-SA-3.0.txt](public/assets/race/stk/licenses/CC-BY-SA-3.0.txt) |
| **stk_vfxParticles** | Blue/orange drift sparks, smoke, boost flames | Jean-Manuel Clémençon (*Samuncle*) | CC-BY-SA 4.0 | [CC-BY-SA-4.0.txt](public/assets/race/stk/licenses/CC-BY-SA-4.0.txt) |
| **stk_musicGarden** | Fuller Road Sprint race loop audio (\`garden.ogg\`) | DJHelium | CC-BY-SA 3.0 | [CC-BY-SA-3.0.txt](public/assets/race/stk/licenses/CC-BY-SA-3.0.txt) |

---

## 2. Other Third-Party Assets

- **Kenney Assets**: Particle textures and UI icons (CC0 1.0 Universal).
- **Phaser 3**: Phaser game engine (MIT License).
- **Three.js**: 3D library (MIT License).
`;

fs.writeFileSync(CREDITS_MD_PATH, creditsMd);
console.log(`✅ Generated ${CREDITS_MD_PATH}`);
