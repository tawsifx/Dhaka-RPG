// scripts/build-arcade-composites.mjs - Composes exterior arcade animation frames and specialized interior props
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SPRITES_DIR = path.resolve('public/assets/arcade/sprites');

async function buildComposites() {
  console.log('🎨 Composing exterior animated building and specialized interior props...');

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage();

  const buildingBaseB64 = fs.readFileSync(path.join(SPRITES_DIR, 'building_base.png')).toString('base64');
  const deluxeCabB64 = fs.readFileSync(path.join(SPRITES_DIR, 'prop_arcade_cab_deluxe.png')).toString('base64');
  const uprightCabB64 = fs.readFileSync(path.join(SPRITES_DIR, 'prop_arcade_cab_upright_a.png')).toString('base64');

  const html = `
<!DOCTYPE html>
<html>
<body style="margin: 0; background: transparent;">
  <canvas id="c"></canvas>
  <script>
    function makeCanvas(w, h) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      return c;
    }

    function loadImage(b64) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = "data:image/png;base64," + b64;
      });
    }

    // 1. Compose 4 frames of Dhaka Cyber Arcade Exterior
    window.createExteriorFrames = async function(baseB64) {
      const baseImg = await loadImage(baseB64);
      const frames = [];

      for (let frame = 0; frame < 4; frame++) {
        const c = makeCanvas(240, 180);
        const ctx = c.getContext("2d");

        // Base 3D Commercial Building
        ctx.drawImage(baseImg, 0, 0, 240, 180);

        // Ground Floor Entrance Recess & Warm Light Spill
        const grad = ctx.createRadialGradient(120, 160, 5, 120, 160, 45);
        grad.addColorStop(0, "rgba(0, 255, 240, 0.45)");
        grad.addColorStop(0.5, "rgba(255, 0, 128, 0.25)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(120, 165, 45, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Double Glass Entryway
        ctx.fillStyle = "#0c0a1a";
        ctx.fillRect(96, 130, 48, 36);
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(96, 130, 48, 36);

        // Glass Panes with Cyber Reflection
        ctx.fillStyle = "rgba(0, 240, 255, 0.25)";
        ctx.fillRect(98, 132, 21, 32);
        ctx.fillRect(123, 132, 21, 32);

        // Neon Canopy Sign Board
        ctx.fillStyle = "#120e29";
        ctx.fillRect(40, 88, 160, 36);
        ctx.strokeStyle = "#ff007f";
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 88, 160, 36);

        // Chaser Bulb Border (Animated 4 phases)
        const bulbColors = ["#00ffff", "#ff007f", "#ffea00", "#00ff88"];
        const numBulbs = 18;
        for (let i = 0; i < numBulbs; i++) {
          const bx = 44 + (i * (152 / (numBulbs - 1)));
          ctx.fillStyle = bulbColors[(i + frame) % 4];
          ctx.beginPath();
          ctx.arc(bx, 90, 2, 0, Math.PI * 2);
          ctx.arc(bx, 122, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Marquee Text Header: DHAKA CYBER ARCADE
        ctx.shadowColor = bulbColors[frame % 4];
        ctx.shadowBlur = 8;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🕹️ DHAKA CYBER ARCADE 🕹️", 120, 105);

        // Subtext: 24/7 RETRO GAMING & VR LOUNGE
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 4;
        ctx.fillStyle = "#00f0ff";
        ctx.font = "bold 6.5px monospace";
        ctx.fillText("★ 100% RETRO PARLOR & KART GP ★", 120, 118);
        ctx.shadowBlur = 0;

        // Rooftop Neon Spire / Antenna
        ctx.strokeStyle = "#ff007f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(120, 18); ctx.lineTo(120, 6);
        ctx.stroke();
        ctx.fillStyle = bulbColors[(frame + 2) % 4];
        ctx.beginPath();
        ctx.arc(120, 5, 3, 0, Math.PI * 2);
        ctx.fill();

        frames.push(c.toDataURL("image/png"));
      }
      return frames;
    };

    // 2. Twin Racing Cockpit Simulator Cabinet (112x80)
    window.createRacingCabinet = function() {
      const c = makeCanvas(112, 80);
      const ctx = c.getContext("2d");

      // Ground Shadow
      ctx.fillStyle = "rgba(5, 3, 12, 0.45)";
      ctx.beginPath(); ctx.ellipse(56, 76, 52, 5, 0, 0, Math.PI * 2); ctx.fill();

      // Twin Dashboard & Display Shell (Red Car 1 & Blue Car 2)
      ctx.fillStyle = "#0f172a"; ctx.fillRect(8, 6, 96, 44);
      ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 1.5; ctx.strokeRect(8, 6, 96, 44);

      // Backlit Marquee: "DHAKA DRIFT / CRAZY TAXI"
      ctx.fillStyle = "#f59e0b"; ctx.fillRect(16, 8, 80, 12);
      ctx.fillStyle = "#000000"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
      ctx.fillText("DHAKA DRIFT DX", 56, 17);

      // Twin CRT Screens
      ctx.fillStyle = "#1e3a8a"; ctx.fillRect(14, 22, 38, 22);
      ctx.fillStyle = "#00ffff"; ctx.font = "bold 6px monospace"; ctx.fillText("TAXI 1", 33, 35);

      ctx.fillStyle = "#7f1d1d"; ctx.fillRect(60, 22, 38, 22);
      ctx.fillStyle = "#fbbf24"; ctx.fillText("TAXI 2", 79, 35);

      // Force Feedback Steering Dashboards
      ctx.fillStyle = "#334155"; ctx.fillRect(10, 46, 44, 14); ctx.fillRect(58, 46, 44, 14);
      ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(32, 53, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(80, 53, 6, 0, Math.PI * 2); ctx.stroke();

      // Twin Racing Bucket Seats
      ctx.fillStyle = "#dc2626"; ctx.fillRect(14, 60, 36, 16);
      ctx.fillStyle = "#2563eb"; ctx.fillRect(62, 60, 36, 16);

      return c.toDataURL("image/png");
    };

    // 3. Glass-Top Cocktail Lounge Table (96x64)
    window.createCocktailTable = function() {
      const c = makeCanvas(96, 64);
      const ctx = c.getContext("2d");

      // Shadow
      ctx.fillStyle = "rgba(5, 3, 12, 0.40)";
      ctx.beginPath(); ctx.ellipse(48, 60, 44, 6, 0, 0, Math.PI * 2); ctx.fill();

      // Woodgrain Pedestal Body
      ctx.fillStyle = "#2c1810"; ctx.fillRect(16, 24, 64, 34);

      // Smoked Tempered Glass Tabletop
      ctx.fillStyle = "#1e293b"; ctx.fillRect(6, 10, 84, 22);
      ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 2; ctx.strokeRect(6, 10, 84, 22);

      // Recessed CRT Screen Visible Through Glass
      ctx.fillStyle = "#050505"; ctx.fillRect(26, 12, 44, 18);
      ctx.fillStyle = "#22c55e"; ctx.font = "bold 6px monospace"; ctx.textAlign = "center";
      ctx.fillText("PAC-MAZE '84", 48, 24);

      // P1 & P2 Side Control Wings
      ctx.fillStyle = "#3e2723"; ctx.fillRect(4, 16, 10, 14); ctx.fillRect(82, 16, 10, 14);
      ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(9, 23, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.arc(87, 23, 2, 0, Math.PI * 2); ctx.fill();

      return c.toDataURL("image/png");
    };

    // 4. Chrome Bar Stool (24x28)
    window.createStool = function() {
      const c = makeCanvas(24, 28);
      const ctx = c.getContext("2d");

      ctx.fillStyle = "rgba(5, 3, 12, 0.35)";
      ctx.beginPath(); ctx.ellipse(12, 26, 9, 2.5, 0, 0, Math.PI * 2); ctx.fill();

      // Chrome Pole & Base
      ctx.fillStyle = "#94a3b8"; ctx.fillRect(11, 10, 2, 14);
      ctx.fillStyle = "#cbd5e1"; ctx.fillRect(7, 24, 10, 2);

      // Padded Red Vinyl Cushion
      ctx.fillStyle = "#991b1b"; ctx.beginPath(); ctx.ellipse(12, 9, 10, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.ellipse(12, 7.5, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f87171"; ctx.beginPath(); ctx.ellipse(10, 6.5, 4, 1.5, 0, 0, Math.PI * 2); ctx.fill();

      return c.toDataURL("image/png");
    };

    // 5. Radiant Wall Neon Sign (96x32)
    window.createNeonSign = function() {
      const c = makeCanvas(96, 32);
      const ctx = c.getContext("2d");

      ctx.fillStyle = "#0b091a"; ctx.fillRect(2, 2, 92, 28);
      ctx.strokeStyle = "#ff007f"; ctx.lineWidth = 1.5; ctx.strokeRect(2, 2, 92, 28);

      ctx.shadowColor = "#00ffff"; ctx.shadowBlur = 6;
      ctx.fillStyle = "#00ffff"; ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
      ctx.fillText("CYBER LOUNGE", 48, 15);

      ctx.shadowColor = "#ffea00"; ctx.shadowBlur = 4;
      ctx.fillStyle = "#ffea00"; ctx.font = "bold 6px monospace";
      ctx.fillText("INSERT TOKEN • PLAY", 48, 25);
      ctx.shadowBlur = 0;

      return c.toDataURL("image/png");
    };

    // 6. Double Glass Exit Doors (76x84)
    window.createExitDoor = function() {
      const c = makeCanvas(76, 84);
      const ctx = c.getContext("2d");

      ctx.fillStyle = "#110d22"; ctx.fillRect(0, 0, 76, 84);
      ctx.strokeStyle = "#00ffff"; ctx.lineWidth = 2; ctx.strokeRect(4, 4, 68, 76);

      // EXIT Header Sign
      ctx.fillStyle = "#052e16"; ctx.fillRect(18, 8, 40, 14);
      ctx.shadowColor = "#22c55e"; ctx.shadowBlur = 6;
      ctx.fillStyle = "#22c55e"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
      ctx.fillText("EXIT ➔", 38, 18);
      ctx.shadowBlur = 0;

      // Double Glass Doors
      ctx.fillStyle = "#090814"; ctx.fillRect(10, 24, 56, 56);
      ctx.fillStyle = "rgba(0, 240, 255, 0.20)"; ctx.fillRect(12, 26, 25, 52); ctx.fillRect(39, 26, 25, 52);
      ctx.fillStyle = "#cbd5e1"; ctx.fillRect(14, 52, 21, 3); ctx.fillRect(41, 52, 21, 3);

      return c.toDataURL("image/png");
    };

    // 7. High-Tech Obsidian Floor Tile (32x32)
    window.createFloorTile = function() {
      const c = makeCanvas(32, 32);
      const ctx = c.getContext("2d");

      ctx.fillStyle = "#090812"; ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = "#120f24"; ctx.fillRect(1, 1, 30, 30);
      ctx.fillStyle = "#181432"; ctx.fillRect(2, 2, 28, 28);

      // Fine Cyber Circuit Inlay
      ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.strokeRect(3, 3, 26, 26);

      ctx.fillStyle = "#00ffff";
      ctx.fillRect(0, 0, 2, 2);
      ctx.fillRect(30, 0, 2, 2);
      ctx.fillRect(0, 30, 2, 2);
      ctx.fillRect(30, 30, 2, 2);

      return c.toDataURL("image/png");
    };

    // 8. Retro 90s Laser Arcade Carpet (32x32)
    window.createCarpetTile = function() {
      const c = makeCanvas(32, 32);
      const ctx = c.getContext("2d");

      ctx.fillStyle = "#0a0a24"; ctx.fillRect(0, 0, 32, 32);

      // Neon Zigzag Line
      ctx.strokeStyle = "#e01e8a"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 8); ctx.lineTo(16, 24); ctx.lineTo(32, 8);
      ctx.stroke();

      // Cyan Confetti Triangles
      ctx.fillStyle = "#00d4ff";
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(14, 8); ctx.lineTo(2, 8); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(24, 24); ctx.lineTo(30, 32); ctx.lineTo(18, 32); ctx.closePath(); ctx.fill();

      // Yellow Starburst Dots
      ctx.fillStyle = "#ffea00";
      ctx.fillRect(6, 18, 2, 2);
      ctx.fillRect(26, 6, 2, 2);
      ctx.fillRect(16, 14, 2, 2);

      // Electric Purple Margins
      ctx.fillStyle = "#8a2be2";
      ctx.fillRect(0, 0, 2, 32);
      ctx.fillRect(30, 0, 2, 32);

      return c.toDataURL("image/png");
    };

    // 9. Acoustic Slate & Neon Conduit Wall (32x64)
    window.createWallTile = function() {
      const c = makeCanvas(32, 64);
      const ctx = c.getContext("2d");

      // Slate Acoustic Top (44px)
      ctx.fillStyle = "#080612"; ctx.fillRect(0, 0, 32, 44);
      ctx.fillStyle = "#110d22"; ctx.fillRect(1, 1, 30, 42);

      for (let y = 6; y < 44; y += 6) {
        ctx.fillStyle = "#05030a"; ctx.fillRect(2, y, 28, 2);
      }

      // Neon Conduit Pipes
      ctx.fillStyle = "#ff007f"; ctx.fillRect(0, 16, 32, 2);
      ctx.fillStyle = "#ff99cc"; ctx.fillRect(0, 16.5, 32, 1);

      ctx.fillStyle = "#00f0ff"; ctx.fillRect(0, 30, 32, 2);
      ctx.fillStyle = "#cceeff"; ctx.fillRect(0, 30.5, 32, 1);

      // Brushed Titanium Plinth (20px)
      ctx.fillStyle = "#1e293b"; ctx.fillRect(0, 44, 32, 20);
      ctx.fillStyle = "#334155"; ctx.fillRect(0, 44, 32, 2);
      ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 62, 32, 2);

      return c.toDataURL("image/png");
    };
  </script>
</body>
</html>
  `;

  await page.setContent(html);

  // Generate exterior frames
  const exteriorFrames = await page.evaluate(async (baseB64) => {
    return await window.createExteriorFrames(baseB64);
  }, buildingBaseB64);

  exteriorFrames.forEach((frameB64, idx) => {
    const raw = frameB64.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(path.join(SPRITES_DIR, `prop_arcade_${idx}.png`), Buffer.from(raw, 'base64'));
    console.log(`✨ Rendered exterior frame prop_arcade_${idx}.png (240x180)`);
  });

  const saveAsset = async (filename, evalCode) => {
    const dataUrl = await page.evaluate(evalCode);
    const raw = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(path.join(SPRITES_DIR, filename), Buffer.from(raw, 'base64'));
    console.log(`✨ Generated ${filename}`);
  };

  await saveAsset('prop_arcade_cab_racing.png', () => window.createRacingCabinet());
  await saveAsset('prop_arcade_cab_cocktail.png', () => window.createCocktailTable());
  await saveAsset('prop_arcade_stool.png', () => window.createStool());
  await saveAsset('prop_arcade_neon_sign.png', () => window.createNeonSign());
  await saveAsset('prop_arcade_exit_door.png', () => window.createExitDoor());
  await saveAsset('tile_arcade_floor.png', () => window.createFloorTile());
  await saveAsset('tile_arcade_carpet.png', () => window.createCarpetTile());
  await saveAsset('tile_arcade_wall.png', () => window.createWallTile());

  await browser.close();
  console.log('✅ All exterior and interior composite assets completed!');
}

buildComposites().catch(console.error);
