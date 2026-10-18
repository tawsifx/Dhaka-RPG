// src/graphics/TextureGenerator.ts - Master orchestrator for generateStardewTextures()
import { GroundTileGenerator } from './GroundTileGenerator';
import { CharacterSpriteGenerator } from './CharacterSpriteGenerator';
import { LandmarkGenerator } from './LandmarkGenerator';
import { CreatureSpriteGenerator } from './CreatureSpriteGenerator';

export type MakeTexFn = (
  key: string,
  w: number,
  h: number,
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
) => void;

export class TextureGenerator {
  /**
   * Helper factory to create the canvas texture generator function bound to a Phaser.Scene
   */
  static createMakeTex(scene: any): MakeTexFn {
    return (key: string, w: number, h: number, drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
      if (scene.textures.exists(key)) return;
      const canvas = scene.textures.createCanvas(key, Math.round(w), Math.round(h));
      if (!canvas) return;
      const ctx = canvas.getContext();
      ctx.imageSmoothingEnabled = false;
      drawFn(ctx, w, h);
      canvas.refresh();
    };
  }

  /**
   * Master generation call: executes all procedural canvas renderers into the Phaser TextureManager
   */
  static generateAll(scene: any): void {
    const makeTex = this.createMakeTex(scene);

    console.log('🎨 [TextureGenerator] Generating ground & terrain tilesets...');
    GroundTileGenerator.generate(makeTex);

    console.log('🎨 [TextureGenerator] Generating characters & NPC sprites...');
    CharacterSpriteGenerator.generate(scene, makeTex);

    console.log('🎨 [TextureGenerator] Generating landmarks & props...');
    LandmarkGenerator.generate(makeTex);

    console.log('🎨 [TextureGenerator] Generating creatures, portals & guardian bosses...');
    CreatureSpriteGenerator.generate(makeTex);

    console.log('✨ [TextureGenerator] All procedural textures successfully generated!');
  }
}
