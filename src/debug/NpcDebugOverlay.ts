// src/debug/NpcDebugOverlay.ts - F3 diagnostic HUD and __npc console debugging API
import Phaser from 'phaser';
import { NPC_SCHEDULES_DB } from '../config/npcSchedules.db';
import { DateState } from '../state/DateState';
import { OffscreenSimulator } from '../systems/npc/OffscreenSimulator';
import { parseTimeToMinutes, resolveCurrentStop, resolveScheduleVariant } from '../systems/npc/ScheduleResolver';
import { TimeCalendarSystem } from '../systems/TimeCalendarSystem';
import { ScheduleContext } from '../types/npc.types';

export class NpcDebugOverlay {
  private scene: Phaser.Scene;
  private timeCalendar: TimeCalendarSystem;
  private visible = false;
  private container: Phaser.GameObjects.Container | null = null;
  private bgRect: Phaser.GameObjects.Rectangle | null = null;
  private textObj: Phaser.GameObjects.Text | null = null;
  private pathGraphics: Phaser.GameObjects.Graphics | null = null;
  private activeEntities: Map<string, any> = new Map();

  constructor(scene: Phaser.Scene, timeCalendar: TimeCalendarSystem) {
    this.scene = scene;
    this.timeCalendar = timeCalendar;

    this.setupHotkeys();
    this.setupConsoleAPI();
  }

  registerActiveEntity(npcId: string, entity: any): void {
    this.activeEntities.set(npcId, entity);
  }

  unregisterAll(): void {
    this.activeEntities.clear();
  }

  private setupHotkeys(): void {
    if (!this.scene.input || !this.scene.input.keyboard) return;

    this.scene.input.keyboard.on('keydown-F3', () => {
      this.toggle();
    });
  }

  toggle(): void {
    this.visible = !this.visible;
    if (this.visible) {
      this.show();
    } else {
      this.hide();
    }
  }

  private show(): void {
    const cam = this.scene.cameras.main;
    const w = 480;
    const h = 320;

    if (!this.container) {
      this.container = this.scene.add.container(12, 12).setScrollFactor(0).setDepth(9999);
      this.bgRect = this.scene.add.rectangle(0, 0, w, h, 0x0f172a, 0.88).setOrigin(0, 0).setStrokeStyle(1.5, 0x38bdf8, 0.9);
      this.textObj = this.scene.add.text(12, 10, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#f8fafc',
        lineSpacing: 3
      });

      this.pathGraphics = this.scene.add.graphics().setDepth(9998);

      this.container.add([this.bgRect, this.textObj]);
    }

    this.container.setVisible(true);
    if (this.pathGraphics) this.pathGraphics.setVisible(true);
  }

  private hide(): void {
    if (this.container) this.container.setVisible(false);
    if (this.pathGraphics) {
      this.pathGraphics.clear();
      this.pathGraphics.setVisible(false);
    }
  }

  update(): void {
    if (!this.visible || !this.textObj) return;

    const date = this.timeCalendar.getDate();
    const { timeString, phaseString } = this.timeCalendar.getFormattedTime();
    const dayOfWeek = this.timeCalendar.getDayOfWeek().toUpperCase();
    const currentWorld = DateState.currentWorld || 'dhaka';

    let content = `[F3 DEBUG] LIVING-WORLD NPC ENGINE\n`;
    content += `Time: ${timeString} (${dayOfWeek}, Day ${date.day}, ${date.season.toUpperCase()})\n`;
    content += `Phase: ${phaseString} | Weather: ${date.weather.toUpperCase()} | Map: ${currentWorld}\n`;
    content += `Active NPCs on map: ${this.activeEntities.size} / 38\n`;
    content += `--------------------------------------------------------\n`;

    let count = 0;
    this.activeEntities.forEach((ent, id) => {
      if (count >= 10) return; // Limit display lines to prevent overflow
      const mover = ent.mover;
      const def = NPC_SCHEDULES_DB[id];
      const name = def ? def.displayName : id;
      const state = mover ? mover.state : 'unknown';
      const facing = mover ? mover.facing : '?';
      const tile = mover ? `(${mover.currentTile.col},${mover.currentTile.row})` : '(? , ?)';

      content += `${name}: [${state}] Tile: ${tile} Dir: ${facing}\n`;
      count++;
    });

    if (this.activeEntities.size > 10) {
      content += `... and ${this.activeEntities.size - 10} more active entities.\n`;
    }

    this.textObj.setText(content);

    // Render path polylines if graphics is active
    if (this.pathGraphics) {
      this.pathGraphics.clear();
      this.activeEntities.forEach(ent => {
        const mover = ent.mover;
        if (mover && mover.hasActivePath()) {
          const path = mover.getPath();
          if (path.length > 1) {
            this.pathGraphics?.lineStyle(2, 0x38bdf8, 0.7);
            this.pathGraphics?.beginPath();
            for (let i = 0; i < path.length; i++) {
              const px = path[i].col * 32 + 16;
              const py = path[i].row * 32 + 16;
              if (i === 0) {
                this.pathGraphics?.moveTo(px, py);
              } else {
                this.pathGraphics?.lineTo(px, py);
              }
            }
            this.pathGraphics?.strokePath();
          }
        }
      });
    }
  }

  private setupConsoleAPI(): void {
    if (typeof window === 'undefined') return;

    const simulator = new OffscreenSimulator();

    (window as any).__npc = {
      list: () => {
        console.table(
          Object.keys(NPC_SCHEDULES_DB).map(id => {
            const def = NPC_SCHEDULES_DB[id];
            return {
              id,
              name: def.displayName,
              tier: def.tier,
              homeMap: def.home.map,
              variants: def.variants.length
            };
          })
        );
      },

      where: (id: string, timeStr?: string) => {
        const def = NPC_SCHEDULES_DB[id];
        if (!def) {
          console.warn(`NPC "${id}" not found.`);
          return null;
        }

        const date = this.timeCalendar.getDate();
        const totalMinutes = timeStr ? parseTimeToMinutes(timeStr) : this.timeCalendar.getTotalMinutes();

        const ctx: ScheduleContext = {
          hour: Math.floor(totalMinutes / 60),
          minute: totalMinutes % 60,
          totalMinutes,
          season: date.season,
          day: date.day,
          dayOfWeek: this.timeCalendar.getDayOfWeek(),
          weather: date.weather,
          isRaining: date.weather === 'rainy' || date.weather === 'monsoon' || date.weather === 'storm',
          affection: DateState.hearts || 0,
          questFlags: DateState
        };

        const placement = simulator.simulatePlacement(def, ctx);
        console.log(`[__npc.where] ${def.displayName} at ${timeStr || 'NOW'}:`, placement);
        return placement;
      },

      explain: (id: string) => {
        const def = NPC_SCHEDULES_DB[id];
        if (!def) return `NPC "${id}" not found.`;

        const date = this.timeCalendar.getDate();
        const ctx: ScheduleContext = {
          hour: date.hour,
          minute: date.minute,
          totalMinutes: this.timeCalendar.getTotalMinutes(),
          season: date.season,
          day: date.day,
          dayOfWeek: this.timeCalendar.getDayOfWeek(),
          weather: date.weather,
          isRaining: date.weather === 'rainy' || date.weather === 'monsoon' || date.weather === 'storm',
          affection: DateState.hearts || 0,
          questFlags: DateState
        };

        const variant = resolveScheduleVariant(def, ctx);
        const stopRes = resolveCurrentStop(variant, ctx.totalMinutes);

        console.log(`--- [__npc.explain: ${def.displayName}] ---`);
        console.log(`Active Variant: "${variant.id}" (Priority: ${variant.priority})`);
        console.log(`Current Stop:`, stopRes.currentStop);
        console.log(`Next Stop:`, stopRes.nextStop);
        console.log(`Is En Route:`, stopRes.isEnRoute);
        return { variant, stopRes };
      },

      forceOverride: (id: string, col: number, row: number, map: any = 'dhaka') => {
        DateState.npcOverrides[id] = {
          id: 'console_force',
          npcId: id,
          map,
          tile: { col, row },
          facing: 'down'
        };
        console.log(`Forced override for ${id} to (${col}, ${row}) on ${map}`);
      },

      clearOverrides: () => {
        DateState.npcOverrides = {};
        console.log('All NPC overrides cleared.');
      },

      jump: (hour: number, minute = 0) => {
        this.timeCalendar.jumpToTime(hour, minute);
        console.log(`Clock jumped to ${hour}:${minute < 10 ? '0' : ''}${minute}`);
      },

      setTimeScale: (scale: number) => {
        this.timeCalendar.setTimeScale(scale);
        console.log(`Time scale set to ${scale}x`);
      },

      rain: (enable = true) => {
        const scene: any = this.scene;
        if (enable) {
          if (scene.weather && typeof scene.weather.triggerMonsoonEvent === 'function') {
            scene.weather.triggerMonsoonEvent(scene);
          }
          this.timeCalendar.setWeather('monsoon');
        } else {
          if (scene.weather && typeof scene.weather.stopMonsoonEvent === 'function') {
            scene.weather.stopMonsoonEvent(scene);
          }
          this.timeCalendar.setWeather('sunny');
        }
      },

      toggleOverlay: () => {
        this.toggle();
      }
    };
  }
}
