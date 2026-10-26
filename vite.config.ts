import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: './',
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    target: 'es2022',
    chunkSizeWarningLimit: 1250,
    rolldownOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        race: path.resolve(__dirname, 'race.html')
      },
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'three',
              test: /node_modules[\\/](three|three-mesh-bvh)/
            },
            {
              name: 'race-engine',
              test: /src[\\/]scenes[\\/]minigames[\\/]race/
            },
            {
              name: 'phaser',
              test: /node_modules[\\/]phaser/
            },
            {
              name: 'graphics-characters',
              test: /src[\\/]graphics[\\/]CharacterSpriteGenerator/
            },
            {
              name: 'graphics-creatures',
              test: /src[\\/]graphics[\\/]CreatureSpriteGenerator/
            },
            {
              name: 'graphics-world',
              test: /src[\\/]graphics[\\/](GroundTileGenerator|LandmarkGenerator|TextureGenerator|ExternalAssetAdapter)/
            },
            {
              name: 'game-db',
              test: /src[\\/]config[\\/]/
            },
            {
              name: 'game-systems',
              test: /src[\\/](systems|audio|ui|state|debug)[\\/]/
            },
            {
              name: 'scene-dhaka',
              test: /src[\\/]scenes[\\/]/
            }
          ]
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
