// src/scenes/world/MinimapRenderer.ts - Real-Time Minimap Canvas Rendering Engine
import { DateState } from '../../state/DateState';
import { WORLDS_DB } from '../../config/worlds.db';
import { CURZON_X, CURZON_Y, ARCADE_X, ARCADE_Y } from '../../config/constants';

export class MinimapRenderer {
  /**
   * Renders the complete real-time radar minimap on the provided canvas context.
   */
  static render(scene: any): void {
    if (!scene.minimapCanvas || !scene.minimapCtx || !scene.player) return;
    const cvs: HTMLCanvasElement = scene.minimapCanvas;
    const ctx: CanvasRenderingContext2D = scene.minimapCtx;
    const world = DateState.currentWorld || 'dhaka';
    const wCfg = WORLDS_DB[world] || WORLDS_DB.dhaka;

    const mapW = scene.currentMapW || 2400;
    const mapH = scene.currentMapH || 1800;
    const sx = cvs.width / mapW;
    const sy = cvs.height / mapH;

    // 1. Natural Base Terrain / Meadow
    ctx.fillStyle = wCfg.minimapColor || '#335e29';
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // Subtle terrain texture lines / vignetted borders
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, cvs.width - 1, cvs.height - 1);

    if (world === 'dhaka') {
      // 2. Real Water Bodies: Organic Dhanmondi Lake, Upper Ramna Lotus Pond & Canal, and Curzon Botanical Pond
      // Shallow turquoise margins
      ctx.fillStyle = '#0e7490';
      ctx.fillRect(1568 * sx, 1056 * sy, 832 * sx, 744 * sy); // Main Basin
      ctx.fillRect(1728 * sx, 928 * sy, 672 * sx, 128 * sy);  // Northern Cove
      ctx.fillRect(1440 * sx, 1504 * sy, 128 * sx, 296 * sy); // Southern Inlet
      ctx.fillRect(1856 * sx, 384 * sy, 224 * sx, 144 * sy);  // Upper Ramna Pond
      ctx.fillRect(1920 * sx, 528 * sy, 80 * sx, 400 * sy);   // Serpentine Canal
      ctx.fillRect(1088 * sx, 1248 * sy, 256 * sx, 160 * sy); // Curzon Botanical Pond

      // Deep indigo cores
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(1600 * sx, 1088 * sy, 800 * sx, 712 * sy);
      ctx.fillRect(1760 * sx, 960 * sy, 640 * sx, 128 * sy);
      ctx.fillRect(1880 * sx, 404 * sy, 176 * sx, 104 * sy);
      ctx.fillRect(1112 * sx, 1272 * sy, 208 * sx, 112 * sy);

      // Surface reflection shimmer
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(1640 * sx, 1120 * sy, 720 * sx, 2.5 * sy);
      ctx.fillRect(1640 * sx, 1220 * sy, 680 * sx, 2.5 * sy);
      ctx.fillRect(1620 * sx, 1420 * sy, 740 * sx, 2.5 * sy);
      ctx.fillRect(1130 * sx, 1316 * sy, 160 * sx, 2 * sy);

      // 3. Multi-Type Road & Promenade Network
      // (A) Pastoral Loam & Cobble Country Lane (South to Farmhouse)
      ctx.fillStyle = '#a47e53';
      ctx.fillRect(692 * sx, 1380 * sy, 96 * sx, 340 * sy);
      ctx.fillRect(528 * sx, 1420 * sy, 212 * sx, 72 * sy);

      // (B) Sandstone Flagstone Boulevards (Main E-W & Eastern Lakeside Avenue)
      ctx.fillStyle = '#d4b996';
      ctx.fillRect(80 * sx, 768 * sy, 2112 * sx, 96 * sy);
      ctx.fillRect(1472 * sx, 224 * sy, 96 * sx, 1216 * sy);

      // (C) Mughal Red-Brick Herringbone Avenues (Lal-Eet Heritage Campus Roads)
      ctx.fillStyle = '#b45342';
      ctx.fillRect(432 * sx, 224 * sy, 96 * sx, 1232 * sy); // West N-S Road (TSC -> Curzon)
      ctx.fillRect(1012 * sx, 256 * sy, 96 * sx, 560 * sy); // Central N-S Spine (Nilkhet -> Fountain)
      ctx.fillRect(480 * sx, 278 * sy, 1040 * sx, 84 * sy); // North Campus Avenue
      ctx.fillRect(1568 * sx, 240 * sy, 260 * sx, 96 * sy); // Fuller Road Food Bazaar

      // (D) Ramna Garden Stepping Stones & Pebble Trails
      ctx.fillStyle = '#a8a29e';
      ctx.fillRect(1108 * sx, 492 * sy, 364 * sx, 56 * sy); // Ramna Park Trail
      ctx.fillRect(788 * sx, 1300 * sy, 300 * sx, 56 * sy); // Botanical Pond West Trail
      ctx.fillRect(1344 * sx, 1300 * sy, 128 * sx, 56 * sy); // Botanical Pond East Trail
      ctx.fillRect(1568 * sx, 964 * sy, 160 * sx, 56 * sy);  // Lakeside Cove Walk

      // (E) Chini-Tikri Circular Plaza Medallions at Hubs
      ctx.fillStyle = '#e5dccb';
      const hubs = [
        [1060, 816, 4.5], [480, 816, 4], [1520, 816, 4],
        [480, 320, 3.8], [1060, 320, 3.8], [1520, 320, 3.8],
        [380, 1440, 4.5], [740, 1456, 3.5]
      ];
      hubs.forEach(([hx, hy, hr]) => {
        ctx.beginPath();
        ctx.arc(hx * sx, hy * sy, hr, 0, Math.PI * 2);
        ctx.fill();
      });

      // (F) Arched Stone & Teakwood Canal Bridge + Dhanmondi Lake Pier
      ctx.fillStyle = '#b45309';
      ctx.fillRect(1552 * sx, 1292 * sy, 384 * sx, 72 * sy); // Lake Pier
      ctx.fillStyle = '#d97706';
      ctx.fillRect(1888 * sx, 764 * sy, 144 * sx, 104 * sy); // Canal Footbridge

      // Road shoulder strokes
      ctx.strokeStyle = 'rgba(120, 80, 50, 0.4)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(80 * sx, 768 * sy, 2112 * sx, 96 * sy);
      ctx.strokeRect(432 * sx, 224 * sy, 96 * sx, 1232 * sy);

      // 4. Distinct Landmark Buildings & Plinths
      // Curzon Hall Grand Complex (South-West)
      ctx.fillStyle = '#831843'; // Iconic Mughal brick-red
      ctx.fillRect((CURZON_X - 160) * sx, (CURZON_Y - 140) * sy, 320 * sx, 150 * sy);
      ctx.fillStyle = '#fef08a'; // Golden dome peaks
      ctx.beginPath();
      ctx.arc(CURZON_X * sx, (CURZON_Y - 140) * sy, 3, 0, Math.PI * 2);
      ctx.arc((CURZON_X - 110) * sx, (CURZON_Y - 125) * sy, 2.2, 0, Math.PI * 2);
      ctx.arc((CURZON_X + 110) * sx, (CURZON_Y - 125) * sy, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // TSC Complex & Adda
      ctx.fillStyle = '#065f46';
      ctx.fillRect(220 * sx, 220 * sy, 120 * sx, 90 * sy);

      // Aparajeyo Bangla Monument Plinth
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(630 * sx, 230 * sy, 60 * sx, 60 * sy);

      // Charukola Fine Arts
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(160 * sx, 690 * sy, 120 * sx, 90 * sy);

      // Nilkhet Book Market
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(990 * sx, 210 * sy, 140 * sx, 80 * sy);

      // Fuller Road Food Bazaar Stalls (Mama's Fuchka & Pabna Mishti Doi)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(1540 * sx, 220 * sy, 60 * sx, 35 * sy);
      ctx.fillRect(1720 * sx, 220 * sy, 60 * sx, 35 * sy);

      // Phulwali Flower Cart & Ramna Park Garden Bench
      ctx.fillStyle = '#ec4899'; // Flower Cart (festive pink)
      ctx.fillRect(1164 * sx, 434 * sy, 40 * sx, 30 * sy);
      ctx.fillStyle = '#ca8a04'; // Ramna Bench (warm teak)
      ctx.fillRect(1500 * sx, 438 * sy, 36 * sx, 18 * sy);

      // Dhaka Cyber Arcade Complex (Fuller Road Boulevard)
      ctx.fillStyle = '#1e113a'; // Midnight cyber purple plinth
      ctx.fillRect((ARCADE_X - 90) * sx, (ARCADE_Y - 70) * sy, 180 * sx, 76 * sy);
      ctx.strokeStyle = '#00ffff'; // Neon cyan border
      ctx.lineWidth = 1;
      ctx.strokeRect((ARCADE_X - 90) * sx, (ARCADE_Y - 70) * sy, 180 * sx, 76 * sy);
      ctx.fillStyle = '#ff007f'; // Neon magenta joystick beacon
      ctx.beginPath();
      ctx.arc(ARCADE_X * sx, (ARCADE_Y - 40) * sy, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Mintu Road Fountain Plaza Ring
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(1060 * sx, 820 * sy, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.fill();

      // Green Meadows Farmhouse Gateway Arch & Boundary Fences
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(500 * sx, 1485 * sy, 480 * sx, 4 * sy);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(644 * sx, 1475 * sy, 192 * sx, 16 * sy);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(660 * sx, 1480 * sy, 4 * sx, 4 * sy);
      ctx.fillRect(816 * sx, 1480 * sy, 4 * sx, 4 * sy);

    } else if (world === 'farmhouse') {
      // Farmhouse Layout: Central Yard, Pastures, Duck Pond, Barn & Silo
      ctx.fillStyle = '#a47e53'; // Loam & Cobble North-South Spine
      ctx.fillRect(558 * sx, 230 * sy, 84 * sx, 590 * sy);
      ctx.fillStyle = '#d4b996'; // Sandstone East-West Lane
      ctx.fillRect(190 * sx, 446 * sy, 820 * sx, 68 * sy);
      ctx.fillStyle = '#b45342'; // Brick Barn Forecourt
      ctx.fillRect(490 * sx, 210 * sy, 220 * sx, 56 * sy);
      ctx.fillStyle = '#a8a29e'; // Stepping Stone Trail to Duck Pond
      ctx.fillRect(916 * sx, 514 * sy, 48 * sx, 66 * sy);

      // Duck Pond (South-East) with Shallow Margin & Timber Jetty
      ctx.fillStyle = '#0e7490';
      ctx.fillRect(800 * sx, 570 * sy, 280 * sx, 190 * sy);
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(824 * sx, 594 * sy, 232 * sx, 142 * sy);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(840 * sx, 620 * sy, 190 * sx, 4 * sy);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(780 * sx, 641 * sy, 68 * sx, 38 * sy);

      // Red Barn Complex (North Center)
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(507 * sx, 142 * sy, 186 * sx, 68 * sy);
      // Silo
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(460 * sx, 183 * sy, 6, 0, Math.PI * 2);
      ctx.fill();

      // Animal Paddocks Outline (Fences)
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.strokeRect(176 * sx, 220 * sy, 280 * sx, 140 * sy); // Cow pasture
      ctx.strokeRect(736 * sx, 220 * sy, 280 * sx, 140 * sy); // Goat pasture
      ctx.strokeRect(173 * sx, 514 * sy, 190 * sx, 110 * sy); // Chicken coop

      // Southern Farmstead Boundary Fences & Grand Timber Gateway Arch
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(160 * sx, 846 * sy, 880 * sx, 4 * sy);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(504 * sx, 840 * sy, 192 * sx, 14 * sy);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(520 * sx, 843 * sy, 3 * sx, 3 * sy);
      ctx.fillRect(676 * sx, 843 * sy, 3 * sx, 3 * sy);

    } else if (world === 'curzon_interior') {
      // Parquet Interior & Velvet Carpet Runners
      ctx.fillStyle = '#451a03';
      ctx.fillRect(564 * sx, 260 * sy, 72 * sx, 540 * sy);
      ctx.fillRect(90 * sx, 472 * sy, 1020 * sx, 56 * sy);
      // Dais Platform
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(460 * sx, 190 * sy, 280 * sx, 70 * sy);
    } else if (world === 'arcade_interior') {
      // Obsidian Floor & Neon Laser Carpet Runners
      ctx.fillStyle = '#1e113a';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      // Main Carpet Cross Promenades
      ctx.fillStyle = '#0d0d26';
      ctx.fillRect(592 * sx, 260 * sy, 96 * sx, 540 * sy);
      ctx.fillRect(144 * sx, 432 * sy, 992 * sx, 64 * sy);
      // Neon Cabinet Plinths
      ctx.fillStyle = '#00ffff'; // Deluxe cab
      ctx.fillRect(576 * sx, 240 * sy, 128 * sx, 48 * sy);
      ctx.fillStyle = '#ff007f'; // Retro cabs west
      ctx.fillRect(250 * sx, 312 * sy, 60 * sx, 40 * sy);
      ctx.fillRect(370 * sx, 312 * sy, 60 * sx, 40 * sy);
      ctx.fillStyle = '#ffea00'; // Rhythm & Racing east
      ctx.fillRect(842 * sx, 312 * sy, 76 * sx, 44 * sy);
      ctx.fillRect(986 * sx, 312 * sy, 108 * sx, 48 * sy);
      // Cocktail table center
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(595 * sx, 538 * sy, 90 * sx, 44 * sy);
    } else {
      // Expedition Realms (Worlds 2 to 6)
      ctx.fillStyle = '#d4b996';
      ctx.fillRect(240 * sx, 845 * sy, 1920 * sx, 110 * sy);
      ctx.fillStyle = '#b45342';
      ctx.fillRect(1095 * sx, 260 * sy, 110 * sx, 1150 * sy);
      // Realm Multi-Basin Lake
      ctx.fillStyle = '#0e7490';
      ctx.fillRect(100 * sx, 1428 * sy, 2200 * sx, 352 * sy);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(100 * sx, 1460 * sy, 2200 * sx, 320 * sy);
      ctx.fillRect(220 * sx, 1380 * sy, 360 * sx, 96 * sy);
      ctx.fillRect(1720 * sx, 1380 * sy, 360 * sx, 96 * sy);
    }

    // 5. Draw Interactables (Golden star / diamond icons)
    scene.interactables.forEach((it: any) => {
      const ix = it.x * sx;
      const iy = it.y * sy;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(ix, iy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // 6. Draw Enemies & Boss Arena
    scene.enemies.forEach((en: any) => {
      const ex = en.x * sx;
      const ey = en.y * sy;
      if (en.isBoss) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ex, ey, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#f87171';
        ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
      }
    });

    // 7. Draw Totoro (Violet companion marker)
    if (scene.totoro) {
      const tx = scene.totoro.x * sx;
      const ty = scene.totoro.y * sy;
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(tx, ty, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f3e8ff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 8. Draw Player (Radar ping beacon with glowing core)
    const px = scene.player.x * sx;
    const py = scene.player.y * sy;

    // Soft radar aura
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();

    // Sharp Player Point
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
