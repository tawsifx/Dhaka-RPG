// tests/opening_dialogue.test.ts
// Unit tests for OpeningDialogueSystem and OPENING_SCENARIOS_DB

import { describe, it, expect, beforeEach } from 'vitest';
import { OpeningDialogueEngine } from '../src/systems/OpeningDialogueSystem';
import { OPENING_SCENARIOS_DB } from '../src/config/openingDialogues.db';
import { DateState } from '../src/state/DateState';
import { UIController } from '../src/ui/UIController';

describe('OpeningDialogueSystem & Scenarios Database', () => {
  let engine: OpeningDialogueEngine;

  beforeEach(() => {
    engine = new OpeningDialogueEngine();
    DateState.totoroJoined = false;
    DateState.unlockedWorlds = ['dhaka'];
  });

  describe('Database Integrity', () => {
    it('contains at least 8 distinct opening scenarios', () => {
      const keys = Object.keys(OPENING_SCENARIOS_DB);
      expect(keys.length).toBeGreaterThanOrEqual(8);
      expect(keys).toContain('krishnachura_blossom');
      expect(keys).toContain('matir_bhaar_cha');
      expect(keys).toContain('rainy_leaf_umbrella');
      expect(keys).toContain('nilkhet_poetry_anthology');
      expect(keys).toContain('secret_rickshaw_map');
      expect(keys).toContain('charukola_terracotta_paint');
      expect(keys).toContain('stargazing_brass_telescope');
      expect(keys).toContain('chibi_totoro_acorn_scramble');
    });

    it('each scenario has complete metadata, badges, and choices', () => {
      for (const scenario of Object.values(OPENING_SCENARIOS_DB)) {
        expect(scenario.id).toBeTruthy();
        expect(scenario.title).toBeTruthy();
        expect(scenario.theme).toBeTruthy();
        expect(scenario.badgeText).toContain('Totoro');
        expect(scenario.promptText).toContain('SPACE');
        expect(scenario.rewardItemId).toBeTruthy();
        expect(scenario.dialogueNodes.length).toBeGreaterThanOrEqual(3);

        // Verify choices in dialogue nodes
        const choiceNode = scenario.dialogueNodes.find(n => n.choices && n.choices.length > 0);
        expect(choiceNode).toBeDefined();
        expect(choiceNode!.choices!.length).toBeGreaterThanOrEqual(2);
        for (const choice of choiceNode!.choices!) {
          expect(choice.label).toBeTruthy();
          expect(choice.nextNodes && choice.nextNodes.length > 0).toBe(true);
        }
      }
    });
  });

  describe('Dynamic Selection & Non-Repetition on Reload', () => {
    it('never selects the same opening scenario twice in consecutive reloads', () => {
      let previousId: string | null = null;
      for (let i = 0; i < 20; i++) {
        const scenario = engine.selectOpeningScenario();
        expect(scenario.id).not.toBe(previousId);
        previousId = scenario.id;
      }
    });

    it('supports developer override via forceScenario', () => {
      expect(engine.forceScenario('matir_bhaar_cha')).toBe(true);
      const selected = engine.selectOpeningScenario();
      expect(selected.id).toBe('matir_bhaar_cha');

      engine.clearForcedScenario();
      const next = engine.selectOpeningScenario();
      expect(next.id).not.toBe('matir_bhaar_cha');
    });

    it('prioritizes rainy scenario during monsoon rain storms', () => {
      let rainyPickCount = 0;
      const testEngine = new OpeningDialogueEngine();
      for (let i = 0; i < 15; i++) {
        const pick = testEngine.selectOpeningScenario({ isRaining: true });
        if (pick.id === 'rainy_leaf_umbrella') {
          rainyPickCount++;
        }
      }
      expect(rainyPickCount).toBeGreaterThan(0);
    });

    it('prioritizes morning tea scenario during morning hours', () => {
      let morningPickCount = 0;
      const testEngine = new OpeningDialogueEngine();
      for (let i = 0; i < 15; i++) {
        const pick = testEngine.selectOpeningScenario({ hour: 8, isRaining: false });
        if (pick.id === 'matir_bhaar_cha') {
          morningPickCount++;
        }
      }
      expect(morningPickCount).toBeGreaterThan(0);
    });
  });

  describe('Companion Dynamic Reload Dialogues', () => {
    it('returns valid companion dialogue nodes and cycles across calls', () => {
      const d1 = engine.selectCompanionDialogue();
      const d2 = engine.selectCompanionDialogue();
      expect(d1.length).toBeGreaterThan(0);
      expect(d2.length).toBeGreaterThan(0);
      expect(d1[0].speaker).toBe('Totoro');
    });

    it('selects rain-specific companion dialogue when raining', () => {
      const dialogue = engine.selectCompanionDialogue({ isRaining: true });
      expect(dialogue.length).toBeGreaterThan(0);
    });
  });

  describe('Totoro Meeting Execution', () => {
    it('updates DateState and unlocks forest world when meeting Totoro', () => {
      const scenario = OPENING_SCENARIOS_DB.krishnachura_blossom;
      let dateProgressCalled = false;
      let onDoneCalled = false;

      const mockScene = {
        totoro: { x: 345, y: 1360 },
        totoroBadge: {
          setText: (txt: string) => { mockScene.totoroBadgeText = txt; }
        },
        totoroBadgeText: '',
        player: { x: 345, y: 1380 },
        trail: [],
        tweens: {
          add: () => {}
        },
        advanceDateProgress: () => { dateProgressCalled = true; }
      };

      const originalStart = (engine as any).startDialogue;
      // Mock UI.startDialogue so it completes without requiring browser DOM
      const originalUIStart = (globalThis as any).startDialogue;
      const originalGiveItem = (globalThis as any).giveItem;

      // In Node environment, stub UIController.startDialogue directly
      const realStart = UIController.startDialogue;
      const realGive = UIController.giveItem;
      UIController.startDialogue = (_nodes: any, cb: any) => {
        if (cb) cb();
      };
      UIController.giveItem = () => {};

      try {
        engine.meetTotoro(mockScene, scenario, () => {
          onDoneCalled = true;
        });

        expect(DateState.totoroJoined).toBe(true);
        expect(DateState.unlockedWorlds).toContain('forest');
        expect(mockScene.totoroBadgeText).toBe('♥ Totoro');
        expect(dateProgressCalled).toBe(true);
        expect(onDoneCalled).toBe(true);
      } finally {
        UIController.startDialogue = realStart;
        UIController.giveItem = realGive;
      }
    });
  });
});
