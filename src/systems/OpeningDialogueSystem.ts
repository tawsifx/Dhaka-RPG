// src/systems/OpeningDialogueSystem.ts
// Dynamic Opening Dialogue & Interaction Engine for Totoro & Moon Walker
// Selects diverse, contextual opening scenarios on every reload so the meeting is never identical.

import {
  OPENING_SCENARIOS_DB,
  COMPANION_RELOAD_DIALOGUES,
  OpeningScenarioDef,
  OpeningDialogueNode
} from '../config/openingDialogues.db';
import { DateState } from '../state/DateState';
import { SoundEngine } from '../audio/SoundEngine';
import { UIController as UI } from '../ui/UIController';

export interface SelectionContext {
  isRaining?: boolean;
  timePhase?: string;
  hour?: number;
}

const STORAGE_KEY_LAST_ID = 'totoro_opening_last_id';
const STORAGE_KEY_COUNT = 'totoro_opening_reload_count';

export class OpeningDialogueEngine {
  private lastId: string | null = null;
  private forcedId: string | null = null;
  private reloadCount = 0;
  private companionIndex = 0;

  constructor() {
    this.restoreSessionState();
    this.registerDebugApi();
  }

  private restoreSessionState(): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        this.lastId = window.sessionStorage.getItem(STORAGE_KEY_LAST_ID) || null;
        const c = window.sessionStorage.getItem(STORAGE_KEY_COUNT);
        this.reloadCount = c ? parseInt(c, 10) : 0;
      }
    } catch {
      /* ignore storage access restrictions */
    }
  }

  private persistSessionState(): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        if (this.lastId) {
          window.sessionStorage.setItem(STORAGE_KEY_LAST_ID, this.lastId);
        }
        window.sessionStorage.setItem(STORAGE_KEY_COUNT, String(this.reloadCount));
      }
    } catch {
      /* ignore storage access restrictions */
    }
  }

  /**
   * Returns all registered opening scenario definitions.
   */
  public getAllScenarios(): OpeningScenarioDef[] {
    return Object.values(OPENING_SCENARIOS_DB);
  }

  /**
   * Returns all scenario IDs.
   */
  public listScenarioIds(): string[] {
    return Object.keys(OPENING_SCENARIOS_DB);
  }

  /**
   * Force next opening to a specific scenario (for developer testing or cutscene triggers).
   */
  public forceScenario(id: string): boolean {
    if (OPENING_SCENARIOS_DB[id]) {
      this.forcedId = id;
      return true;
    }
    return false;
  }

  /**
   * Clears any forced scenario override.
   */
  public clearForcedScenario(): void {
    this.forcedId = null;
  }

  /**
   * Dynamically selects an opening scenario based on environment, history, and reload count.
   * Guarantees that reloading the game NEVER repeats the immediately preceding scenario.
   */
  public selectOpeningScenario(context: SelectionContext = {}): OpeningScenarioDef {
    const all = this.getAllScenarios();
    if (!all.length) {
      throw new Error('No opening scenarios registered in OPENING_SCENARIOS_DB');
    }

    // 1. Check for manual developer/test override
    if (this.forcedId && OPENING_SCENARIOS_DB[this.forcedId]) {
      const chosen = OPENING_SCENARIOS_DB[this.forcedId];
      this.lastId = chosen.id;
      this.reloadCount++;
      this.persistSessionState();
      return chosen;
    }

    // 2. Filter out the last selected scenario to prevent consecutive repetition across reloads
    let pool = all.filter(s => s.id !== this.lastId);
    if (!pool.length) {
      pool = all;
    }

    // 3. Score candidates based on current environmental context
    const isRain = Boolean(context.isRaining);
    const hour = typeof context.hour === 'number' ? context.hour : 15; // default 3pm afternoon

    const scored = pool.map(scenario => {
      let score = 10;

      // Weather affinity
      if (scenario.weatherAffinity === 'rain') {
        score += isRain ? 40 : -20;
      } else if (scenario.weatherAffinity === 'clear') {
        score += isRain ? -15 : 15;
      }

      // Time of day affinity
      if (scenario.timeAffinity) {
        if (scenario.timeAffinity === 'morning' && hour < 12) score += 25;
        else if (scenario.timeAffinity === 'afternoon' && hour >= 12 && hour < 17) score += 20;
        else if (scenario.timeAffinity === 'sunset' && hour >= 17 && hour < 20) score += 30;
        else if (scenario.timeAffinity === 'night' && (hour >= 20 || hour < 6)) score += 25;
      }

      // Add Mulberry-style deterministic jitter based on reload count
      const jitter = ((this.reloadCount * 17 + scenario.id.charCodeAt(0)) % 13);
      score += jitter;

      return { scenario, score };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Pick top candidate or sample with top-tier candidates
    const topScore = scored[0].score;
    const topTier = scored.filter(s => s.score >= topScore - 5).map(s => s.scenario);
    const selected = topTier[Math.floor(Math.random() * topTier.length)] || scored[0].scenario;

    this.lastId = selected.id;
    this.reloadCount++;
    this.persistSessionState();
    return selected;
  }

  /**
   * Returns a dynamic companion dialogue for subsequent interactions after Totoro has joined.
   */
  public selectCompanionDialogue(context: SelectionContext = {}): OpeningDialogueNode[] {
    const isRain = Boolean(context.isRaining);
    const timeStr = context.timePhase || 'Afternoon';

    const candidates = COMPANION_RELOAD_DIALOGUES.filter(d => {
      if (d.condition) return d.condition(timeStr, isRain);
      return true;
    });

    const chosen = candidates[this.companionIndex % candidates.length] || candidates[0];
    this.companionIndex++;
    return chosen.nodes;
  }

  /**
   * Executes the full opening interaction between Totoro and Moon Walker:
   * - Launches UI dialogue
   * - Triggers Totoro celebration tween and heart fanfare
   * - Gives the scenario's unique keepsake item
   * - Updates DateState.totoroJoined and unlocks Forest Realm
   */
  public meetTotoro(
    scene: any,
    scenario: OpeningScenarioDef,
    onComplete?: () => void
  ): void {
    if (scene && scene.totoro) {
      scene.tweens.add({
        targets: scene.totoro,
        y: scene.totoro.y - 14,
        scaleY: 1.05,
        duration: 200,
        yoyo: true,
        repeat: 1
      });
    }

    SoundEngine.heartUp();

    UI.startDialogue(scenario.dialogueNodes, () => {
      DateState.totoroJoined = true;
      if (!DateState.unlockedWorlds.includes('forest')) {
        DateState.unlockedWorlds.push('forest');
      }

      if (scene && scene.totoroBadge) {
        scene.totoroBadge.setText('♥ Totoro');
      }
      if (scene && scene.player) {
        scene.trail = Array(16).fill({ x: scene.player.x, y: scene.player.y });
      }

      // Award the scenario's unique item
      UI.giveItem(scenario.rewardItemId, scenario.rewardDescription);

      SoundEngine.itemFanfare();

      if (scene && typeof scene.advanceDateProgress === 'function') {
        scene.advanceDateProgress();
      }

      if (onComplete) {
        onComplete();
      }
    });
  }

  /**
   * Registers global window.__openingDialogue API for testing, QA, and inspection.
   */
  private registerDebugApi(): void {
    if (typeof window === 'undefined') return;

    (window as any).__openingDialogue = {
      list: () => {
        const table = this.getAllScenarios().map(s => ({
          ID: s.id,
          Title: s.title,
          Theme: s.theme,
          Badge: s.badgeText,
          Weather: s.weatherAffinity || 'any',
          Time: s.timeAffinity || 'any',
          Reward: s.rewardItemId
        }));
        console.table(table);
        return table;
      },
      current: () => this.lastId,
      reloadCount: () => this.reloadCount,
      select: (id: string) => {
        const ok = this.forceScenario(id);
        console.log(ok ? `Opening scenario set to '${id}'` : `Scenario '${id}' not found!`);
        return ok;
      },
      next: (context: SelectionContext = {}) => {
        const next = this.selectOpeningScenario(context);
        console.log(`Next selected scenario: [${next.id}] - "${next.title}" (${next.theme})`);
        return next;
      },
      reset: () => {
        this.lastId = null;
        this.reloadCount = 0;
        this.forcedId = null;
        try {
          window.sessionStorage?.removeItem(STORAGE_KEY_LAST_ID);
          window.sessionStorage?.removeItem(STORAGE_KEY_COUNT);
        } catch {
          /* ignore */
        }
        console.log('Opening dialogue session history reset.');
      }
    };
  }
}

export const OpeningDialogueSystem = new OpeningDialogueEngine();
