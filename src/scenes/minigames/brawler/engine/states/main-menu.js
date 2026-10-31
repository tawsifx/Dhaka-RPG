// main-menu.js
// Game main menu options screen.

import Audio from '../audio';
import Globals from '../globals';
import Controls from '../controls';

import Renderer from './renderer';

const MainMenuConsts = {
  options: [
    'PLAY',
    'CONTROLS',
    'AUDIO',
    'CREDITS',
  ],
};

class MainMenu extends Renderer {

  create() {
    super.create();

    const screenCenter = this.game.world.centerX;

    this.playIntro(screenCenter);

    // create a text for each option
    this.selectedOption = 0;
    this.optionTexts = [];
    let ypos = this.game.world.height / MainMenuConsts.options.length + 24;
    for (const [i, option] of MainMenuConsts.options.entries()) {
      const text = this.game.add.bitmapText(screenCenter, ypos + 22 * i, Globals.bitmapFont, option, 12);
      text.anchor.setTo(0.5);
      this.optionTexts.push(text);
    }

    // stop all sfx in menu
    this.audio = new Audio(this.game);
    this.audio.stop();

    this.controls = new Controls(this.game, true);
  }

  playIntro(screenCenter) {
    const SPEED = 1600;

    const menuTitleLeft = this.game.add.bitmapText(screenCenter, 28, 
      Globals.bitmapFont, 'Moon', 26);
    menuTitleLeft.anchor.setTo(0.5);
    menuTitleLeft.right = 0;
    this.game.add.tween(menuTitleLeft).to({ x: screenCenter - 48 }, SPEED, 
      Phaser.Easing.Bounce.Out, true);

    const menuTitleRight = this.game.add.bitmapText(screenCenter, 28, 
      Globals.bitmapFont, 'Walker', 26);
    menuTitleRight.anchor.setTo(0.5);
    menuTitleRight.left = this.game.width;
    this.game.add.tween(menuTitleRight).to({ x: screenCenter + 44 }, SPEED, 
      Phaser.Easing.Bounce.Out, true);
  }

  update() {
    super.update();

    for (const [i, option] of this.optionTexts.entries()) {
      if (i == this.selectedOption)
        option.tint = 0x000000;
      else
        option.tint = 0xffffff;
    }

    this.handleInput();
  }

  handleInput() {
    if (this.controls.up) {
      this.selectedOption--;
      this.audio.play(this.audio.sfx.hero.punch, 2);
    }
    else if (this.controls.down) {
      this.selectedOption++;
      this.audio.play(this.audio.sfx.hero.punch, 1);
    }
    else if (this.controls.punch || this.controls.jump || this.controls.kick) {
      this.chooseOption();
    }

    if (this.selectedOption < 0)
      this.selectedOption = 0;
    if (this.selectedOption >= MainMenuConsts.options.length)
      this.selectedOption = MainMenuConsts.options.length - 1;
  }

  chooseOption() {
    if (this.selectedOption == 0) {
      this.audio.play(this.audio.sfx.go);
      this.state.start('loading', true, false, 'intro');
    }
    else if (this.selectedOption == 1) {
      this.state.start('options');
    }
    else if (this.selectedOption == 2) {
      this.state.start('options-audio');
    }
    else if (this.selectedOption == 3) {
      this.state.start('credits');
    }
  }

}

export { MainMenu };
