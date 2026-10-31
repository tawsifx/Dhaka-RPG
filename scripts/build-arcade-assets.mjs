// scripts/build-arcade-assets.mjs - Renders Kenney CC0 Mini Arcade & Building 3D models into external 2D sprites
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SPRITES_DIR = path.resolve('public/assets/arcade/sprites');
const MODELS_DIR = path.resolve('public/assets/arcade/models');

fs.mkdirSync(SPRITES_DIR, { recursive: true });

async function buildAllArcadeAssets() {
  console.log('🚀 Launching Chrome to render Kenney Mini Arcade models into external 2D sprites...');

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage();

  const colormapPath = path.join(MODELS_DIR, 'Textures/colormap.png');
  const colormapBase64 = fs.readFileSync(colormapPath).toString('base64');
  const colormapUri = 'data:image/png;base64,' + colormapBase64;

  const commColormapPath = path.join(MODELS_DIR, 'Textures/commercial-colormap.png');
  const commColormapBase64 = fs.existsSync(commColormapPath)
    ? fs.readFileSync(commColormapPath).toString('base64')
    : colormapBase64;
  const commColormapUri = 'data:image/png;base64,' + commColormapBase64;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
</head>
<body style="margin: 0; background: transparent;">
  <canvas id="c"></canvas>
  <script>
    window.renderModel = async function(base64Data, activeColormapUri, width, height, opts = {}) {
      const canvas = document.getElementById("c");
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(2);
      renderer.outputEncoding = THREE.sRGBEncoding;

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 100);
      camera.position.set(opts.camX || 0.35, opts.camY || 2.2, opts.camZ || 3.1);
      camera.lookAt(0, opts.lookY || 0.65, 0);

      // Cyberpunk Ambient & Key Lighting
      const hemi = new THREE.HemisphereLight(0xffffff, 0x16122c, opts.hemiIntensity || 1.35);
      scene.add(hemi);

      const dir = new THREE.DirectionalLight(0xffeedd, opts.dirIntensity || 2.1);
      dir.position.set(3.5, 8.5, 4.5);
      scene.add(dir);

      const rim = new THREE.DirectionalLight(opts.rimColor || 0x00f0ff, opts.rimIntensity || 1.4);
      rim.position.set(-4.5, 3.5, -3.0);
      scene.add(rim);

      const underGlow = new THREE.PointLight(opts.glowColor || 0xff007f, opts.glowIntensity || 0.8, 10);
      underGlow.position.set(0, 0.2, 0.5);
      scene.add(underGlow);

      const manager = new THREE.LoadingManager();
      manager.setURLModifier((url) => {
        if (url.includes("colormap.png")) return activeColormapUri;
        return url;
      });

      const loader = new THREE.GLTFLoader(manager);
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      return new Promise((resolve, reject) => {
        loader.parse(bytes.buffer, "", (gltf) => {
          const root = gltf.scene;

          if (opts.tintColor) {
            root.traverse(child => {
              if (child.isMesh && child.material) {
                child.material = child.material.clone();
                child.material.color.multiply(new THREE.Color(opts.tintColor));
              }
            });
          }

          if (opts.rotationY) {
            root.rotation.y = opts.rotationY;
          }

          const box = new THREE.Box3().setFromObject(root);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          root.position.x -= center.x;
          root.position.y -= box.min.y;
          root.position.z -= center.z;
          scene.add(root);

          const maxDim = Math.max(size.x, size.y, size.z);
          const halfSpan = maxDim * (opts.spanMult || 0.62);
          camera.left = -halfSpan * (width / height);
          camera.right = halfSpan * (width / height);
          camera.top = halfSpan;
          camera.bottom = -halfSpan;
          camera.updateProjectionMatrix();

          renderer.render(scene, camera);
          resolve(canvas.toDataURL("image/png"));
        }, reject);
      });
    };
  </script>
</body>
</html>
  `;

  await page.setContent(html);

  const renderTask = async (filename, glbFile, isCommercial, width, height, opts = {}) => {
    const glbPath = path.join(MODELS_DIR, glbFile);
    if (!fs.existsSync(glbPath)) {
      console.warn('Skipping missing model:', glbFile);
      return;
    }
    const glbBase64 = fs.readFileSync(glbPath).toString('base64');
    const uri = isCommercial ? commColormapUri : colormapUri;

    const dataUrl = await page.evaluate(async ({ glbBase64, uri, width, height, opts }) => {
      return await window.renderModel(glbBase64, uri, width, height, opts);
    }, { glbBase64, uri, width, height, opts });

    const b64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const outPath = path.join(SPRITES_DIR, filename);
    fs.writeFileSync(outPath, Buffer.from(b64Data, 'base64'));
    console.log(`✨ Rendered ${filename} (${width}x${height})`);
  };

  // 1. Arcade Cabinets
  await renderTask('prop_arcade_cab_upright_a.png', 'arcade-machine.glb', false, 80, 96, {
    camX: 0.25, camY: 2.1, camZ: 3.0, lookY: 0.7, spanMult: 0.60,
    rimColor: 0x00f0ff, glowColor: 0x00e5ff
  });

  await renderTask('prop_arcade_cab_upright_b.png', 'arcade-machine.glb', false, 80, 96, {
    camX: -0.25, camY: 2.1, camZ: 3.0, lookY: 0.7, spanMult: 0.60,
    tintColor: 0xff8888, rimColor: 0xff0055, glowColor: 0xff3300
  });

  await renderTask('prop_arcade_cab_deluxe.png', 'arcade-machine.glb', false, 128, 104, {
    camX: 0.0, camY: 2.0, camZ: 3.2, lookY: 0.75, spanMult: 0.58,
    tintColor: 0xffd700, rimColor: 0x00ffff, glowColor: 0xff00bb, dirIntensity: 2.4
  });

  // 2. Specialty Attractions
  await renderTask('prop_arcade_claw.png', 'claw-machine.glb', false, 80, 100, {
    camX: 0.2, camY: 2.0, camZ: 3.0, lookY: 0.7, spanMult: 0.62,
    rimColor: 0xff00bf, glowColor: 0xff007f
  });

  await renderTask('prop_arcade_cab_dance.png', 'dance-machine.glb', false, 96, 96, {
    camX: 0.15, camY: 2.3, camZ: 3.2, lookY: 0.8, spanMult: 0.65,
    rimColor: 0x00f0ff, glowColor: 0xff00aa
  });

  await renderTask('prop_arcade_pinball.png', 'pinball.glb', false, 80, 96, {
    camX: 0.35, camY: 2.5, camZ: 3.0, lookY: 0.6, spanMult: 0.64,
    rimColor: 0xffaa00, glowColor: 0x00ffff
  });

  await renderTask('prop_arcade_airhockey.png', 'air-hockey.glb', false, 104, 72, {
    camX: 0.3, camY: 3.2, camZ: 3.0, lookY: 0.4, spanMult: 0.65,
    rimColor: 0x00f0ff, glowColor: 0x3300ff
  });

  await renderTask('prop_arcade_basketball.png', 'basketball-game.glb', false, 88, 104, {
    camX: 0.25, camY: 2.4, camZ: 3.4, lookY: 0.9, spanMult: 0.64,
    rimColor: 0xff5500, glowColor: 0xffaa00
  });

  await renderTask('prop_arcade_vending.png', 'vending-machine.glb', false, 64, 88, {
    camX: 0.2, camY: 2.1, camZ: 3.0, lookY: 0.7, spanMult: 0.62,
    rimColor: 0x00ffff, glowColor: 0x00ff88
  });

  await renderTask('prop_arcade_token_dispenser.png', 'ticket-machine.glb', false, 48, 72, {
    camX: 0.2, camY: 2.0, camZ: 3.0, lookY: 0.6, spanMult: 0.62,
    tintColor: 0xe6b800, rimColor: 0xffea00, glowColor: 0xffbb00
  });

  await renderTask('prop_arcade_wheel.png', 'prize-wheel.glb', false, 64, 88, {
    camX: 0.15, camY: 2.2, camZ: 3.0, lookY: 0.7, spanMult: 0.62,
    rimColor: 0xff00ff, glowColor: 0xffff00
  });

  await renderTask('prop_arcade_cash_register.png', 'cash-register.glb', false, 48, 48, {
    camX: 0.3, camY: 2.5, camZ: 2.8, lookY: 0.4, spanMult: 0.60
  });

  // 3. Characters & Staff
  await renderTask('npc_shanto_0.png', 'character-employee.glb', false, 48, 64, {
    camX: 0.05, camY: 1.8, camZ: 2.8, lookY: 0.6, spanMult: 0.62,
    rimColor: 0x00f0ff
  });
  await renderTask('npc_shanto_1.png', 'character-employee.glb', false, 48, 64, {
    camX: 0.05, camY: 1.85, camZ: 2.8, lookY: 0.62, spanMult: 0.63,
    rimColor: 0x00f0ff
  });

  await renderTask('npc_gamer_0.png', 'character-gamer.glb', false, 48, 64, {
    camX: 0.1, camY: 1.8, camZ: 2.8, lookY: 0.6, spanMult: 0.62,
    rimColor: 0xff007f
  });
  await renderTask('npc_gamer_1.png', 'character-gamer.glb', false, 48, 64, {
    camX: 0.1, camY: 1.85, camZ: 2.8, lookY: 0.62, spanMult: 0.63,
    rimColor: 0xff007f
  });

  // 4. Exterior Building Architecture
  await renderTask('building_base.png', 'building-c.glb', true, 240, 180, {
    camX: 0.0, camY: 1.8, camZ: 4.4, lookY: 1.1, spanMult: 0.54,
    dirIntensity: 2.3, rimColor: 0x00f0ff, rimIntensity: 1.6
  });

  await browser.close();
  console.log('✅ All 3D model renders completed successfully!');
}

buildAllArcadeAssets().catch(console.error);
