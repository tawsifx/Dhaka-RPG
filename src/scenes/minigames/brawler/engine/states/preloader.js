// preloader.js
// Loads all required assets - gfx & sfx

import Audio from '../audio';
import Globals from '../globals';
import Renderer from './renderer';

const PreloaderConsts = {
  SPLASH_FADE: 1200, // ms
};

class Preloader extends Renderer {

  constructor(game) {
    super(game);
  }

  preload() {
    this._loadingBar = this.game.add.sprite(this.game.world.centerX / 2,
      this.game.world.centerY, 'loadingBar');
    this._loadingBar.centerX = this.world.centerX;
    this._loadingBar.scale.setTo(0.5);
    this.game.load.setPreloadSprite(this._loadingBar);

    // load audios
    Audio.loadSfx(this.game);
    Audio.loadMusic(this.game, 'fanfare');

    // load bitmap font
    this.game.load.bitmapFont(Globals.bitmapFont,
      'assets/fonts/standard-0753/standard-0753.png',
      'assets/fonts/standard-0753/standard-0753.xml');

    // load JSON files
    this.game.load.json('dialog1', 'assets/dialogs/dialog1.json');

    // load images
    this.game.load.image('arrow', 'assets/images/arrow.png');

    // load levels
    this.game.load.image('gd-tiles', 'assets/levels/gd-tileset.png');

    this.game.load.tilemap('intro',
      'assets/levels/intro.json', null,
      Phaser.Tilemap.TILED_JSON);
    this.game.load.tilemap('act1',
      'assets/levels/act1.json', null,
      Phaser.Tilemap.TILED_JSON);
    this.game.load.tilemap('act2',
      'assets/levels/act2.json', null,
      Phaser.Tilemap.TILED_JSON);
    this.game.load.tilemap('act5',
      'assets/levels/act5.json', null,
      Phaser.Tilemap.TILED_JSON);

    // load sprites atlas
    this.load.atlas('atlas_sprites',
      'assets/sprites/sprites.png',
      'assets/sprites/sprites.json',
      Phaser.Loader.TEXTURE_ATLAS_JSON_HASH);
  }

  create() {
    // remove loading bar from screen
    this._loadingBar.kill();

    // debug - start directly a game state
    if (Globals.debug && Globals.state) {
      this.state.start(Globals.state);
      return;
    }

    // set background to the game average color
    this.game.stage.backgroundColor = Globals.palette.menuBackground.hex;

    // create splash screen
    const splashText = this.game.add.bitmapText(this.game.world.centerX,
      this.game.world.centerY, Globals.bitmapFont, 'DHAKA CYBER ARCADE', 14);
    splashText.anchor.setTo(0.5);
    splashText.alpha = 0;

    const tween = this.game.add.tween(splashText).to({ alpha: 1 },
      PreloaderConsts.SPLASH_FADE, Phaser.Easing.Linear.None, true, 0, 0, true);

    tween.onComplete.add(() => {
      const presentsText = this.game.add.bitmapText(this.game.world.centerX,
        this.game.world.centerY, Globals.bitmapFont, 'MOON WALKER & TOTORO', 12);
      presentsText.anchor.setTo(0.5);
      presentsText.alpha = 0;

      const tween2 = this.game.add.tween(presentsText).to({ alpha: 1 },
        PreloaderConsts.SPLASH_FADE, Phaser.Easing.Linear.None, true, 0, 0, true);
      tween2.onComplete.add(() => {
        this.state.start('mainmenu');
      });
    }, this);
  }

}

export { Preloader };
