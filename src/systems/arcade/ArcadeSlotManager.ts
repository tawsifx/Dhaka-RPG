// src/systems/arcade/ArcadeSlotManager.ts - Dhaka Cyber Arcade Game Slot Engine & Registration Architecture
import { UI } from '../../ui/UIController';
import { SoundEngine } from '../../audio/SoundEngine';

export type ArcadeSlotId =
  | 'slot_grand_championship'
  | 'slot_retro_pixel_a'
  | 'slot_fighting_clash'
  | 'slot_cocktail_table'
  | 'slot_rhythm_beat'
  | 'slot_racing_twin';

export interface ArcadeGameConfig {
  name: string;
  genre: string;
  desc: string;
  creditsRequired?: number;
  author?: string;
  version?: string;
  launch: (scene: any) => void;
  onExit?: () => void;
}

export interface ArcadeGameSlot {
  id: ArcadeSlotId;
  name: string;
  genre: string;
  desc: string;
  cabinetStyle: 'deluxe' | 'upright' | 'cocktail' | 'dance' | 'racing';
  x: number;
  y: number;
  width: number;
  height: number;
  spriteKey: string;
  isInstalled: boolean;
  creditsRequired: number;
  author?: string;
  version?: string;
  launch?: (scene: any) => void;
  onExit?: () => void;
}

class ArcadeSlotManagerService {
  private slots: Map<ArcadeSlotId, ArcadeGameSlot> = new Map();

  constructor() {
    this.initDefaultSlots();
  }

  private initDefaultSlots(): void {
    const defaultSlots: ArcadeGameSlot[] = [
      {
        id: 'slot_grand_championship',
        name: 'Slot #1: Grand Championship Cabinet',
        genre: 'Flagship Tournament Arcade',
        desc: 'Wide-screen dual CRT cab with stereo subwoofer and marquee lighting. Awaiting game software insertion.',
        cabinetStyle: 'deluxe',
        x: 640,
        y: 288,
        width: 128,
        height: 96,
        spriteKey: 'prop-arcade-cab-deluxe',
        isInstalled: false,
        creditsRequired: 2,
      },
      {
        id: 'slot_retro_pixel_a',
        name: 'Slot #2: Retro Pixel Arcade A',
        genre: '8-Bit / 16-Bit Classic Platformer',
        desc: 'Classic Japanese-style upright candy cab with Sanwa 8-way joystick and clicky buttons. Slot ready for cartridge.',
        cabinetStyle: 'upright',
        x: 320,
        y: 352,
        width: 64,
        height: 80,
        spriteKey: 'prop-arcade-cab-upright-a',
        isInstalled: false,
        creditsRequired: 1,
      },
      {
        id: 'slot_fighting_clash',
        name: 'Slot #3: Super Battle Strike DX',
        genre: '2-Player Competitive Versus Fighter',
        desc: 'Side-by-side 6-button fighter cabinet tuned for high-speed frame cancels. Microswitches freshly greased.',
        cabinetStyle: 'upright',
        x: 448,
        y: 352,
        width: 64,
        height: 80,
        spriteKey: 'prop-arcade-cab-upright-b',
        isInstalled: false,
        creditsRequired: 1,
      },
      {
        id: 'slot_cocktail_table',
        name: 'Slot #4: Tabletop Glass Cocktail Lounge',
        genre: 'Sit-Down Strategy / Maze Action',
        desc: 'Heavy tempered-glass cocktail table cabinet surrounded by padded red velvet stools. Surface drink-holder intact.',
        cabinetStyle: 'cocktail',
        x: 640,
        y: 576,
        width: 96,
        height: 64,
        spriteKey: 'prop-arcade-cab-cocktail',
        isInstalled: false,
        creditsRequired: 1,
      },
      {
        id: 'slot_rhythm_beat',
        name: 'Slot #5: Beat Mania & Dance Pad Zone',
        genre: 'Rhythm / Dance Stage Simulator',
        desc: 'Equipped with quad pressure-sensitive neon floor stages, flashing sub-woofers, and overhead strobe bar.',
        cabinetStyle: 'dance',
        x: 832,
        y: 352,
        width: 80,
        height: 80,
        spriteKey: 'prop-arcade-cab-dance',
        isInstalled: false,
        creditsRequired: 2,
      },
      {
        id: 'slot_racing_twin',
        name: 'Slot #6: Dhaka Cyber Speed Twin-Cockpit',
        genre: 'Force-Feedback Twin Racing Simulator',
        desc: 'Dual bucket-seat racing chassis with force feedback steering wheels, clutch pedals, and sequential stick shifters.',
        cabinetStyle: 'racing',
        x: 960,
        y: 352,
        width: 112,
        height: 80,
        spriteKey: 'prop-arcade-cab-racing',
        isInstalled: false,
        creditsRequired: 2,
      },
    ];

    for (const slot of defaultSlots) {
      this.slots.set(slot.id, slot);
    }
  }

  /**
   * Register or plug a new playable game into an arcade cabinet slot.
   * Can be invoked from any scene or game script without modifying core arcade architecture!
   */
  public registerGame(slotId: ArcadeSlotId, config: ArcadeGameConfig): void {
    const slot = this.slots.get(slotId);
    if (!slot) {
      console.warn(`[ArcadeSlotManager] Cannot register game: Slot ${slotId} not found.`);
      return;
    }
    slot.name = config.name;
    slot.genre = config.genre;
    slot.desc = config.desc;
    slot.creditsRequired = config.creditsRequired ?? slot.creditsRequired;
    slot.author = config.author ?? 'Community / Custom';
    slot.version = config.version ?? '1.0.0';
    slot.launch = config.launch;
    slot.onExit = config.onExit;
    slot.isInstalled = true;
    console.info(`[ArcadeSlotManager] Successfully registered "${config.name}" to slot [${slotId}]!`);
  }

  /**
   * Unmount / remove a game from a slot, returning it to empty standby mode.
   */
  public unregisterGame(slotId: ArcadeSlotId): void {
    const slot = this.slots.get(slotId);
    if (slot) {
      slot.isInstalled = false;
      delete slot.launch;
      delete slot.onExit;
    }
  }

  public getSlot(slotId: ArcadeSlotId): ArcadeGameSlot | undefined {
    return this.slots.get(slotId);
  }

  public getAllSlots(): ArcadeGameSlot[] {
    return Array.from(this.slots.values());
  }

  /**
   * Handle interaction when Moon Walker approaches and inspects an arcade cabinet.
   */
  public interactWithSlot(slotId: ArcadeSlotId, scene: any): void {
    const slot = this.slots.get(slotId);
    if (!slot) return;

    if (slot.isInstalled && typeof slot.launch === 'function') {
      SoundEngine.select();
      slot.launch(scene);
    } else {
      // Slot is empty / awaiting game insertion - run arcade diagnostic cutscene / prompt
      if ((window as any).ArcadeCutscenes && typeof (window as any).ArcadeCutscenes.playCabinetTestCutscene === 'function') {
        (window as any).ArcadeCutscenes.playCabinetTestCutscene(scene, slot);
      } else {
        UI.showToast('🕹️', slot.name, 'Architecture ready! Plug in game logic via ArcadeSlotManager.');
      }
    }
  }
}

export const ArcadeSlotManager = new ArcadeSlotManagerService();

if (typeof window !== 'undefined') {
  (window as any).ArcadeSlotManager = ArcadeSlotManager;
}
