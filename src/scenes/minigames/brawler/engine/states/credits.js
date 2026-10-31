// credits.js - Show game credits
import Renderer from './renderer';
import Globals from '../globals';
import Controls from '../controls';

class Credits extends Renderer {

  create() {
    super.create();

    const creditsTitle = this.addText(
      'CREDITS',
      this.game.world.centerX, 16, 18
    );
    creditsTitle.anchor.setTo(0.5);

    const columnsTop = 36;
    const col1 = 10;
    const col2 = this.game.world.width / 2 + 5;

    this.addText('Dhaka Valley Edition:', col1, columnsTop);
    this.addText('Tawsif & Ghibli Team', col1 + 5, columnsTop + 14);

    this.addText('Moon Walker & Totoro:', col1, columnsTop + 32);
    this.addText('Custom Pixel Sprites', col1 + 5, columnsTop + 46);

    this.addText('Original Engine:', col2, columnsTop);
    this.addText('Team Kickpunch (MIT)', col2 + 5, columnsTop + 14);

    this.addText('Original Authors:', col2, columnsTop + 32);
    this.addText('P. Petrov / A. Vishnyakov\nC. Braga / P. Antonov', col2 + 5, columnsTop + 46);

    const leaveText = this.game.add.bitmapText(this.game.world.centerX, 148, 
      Globals.bitmapFont, '(Press Punch to return)', 8);
    leaveText.anchor.setTo(0.5);
    leaveText.alpha = 0;

    this.game.add.tween(leaveText).to({ alpha: 1 }, 800, Phaser.Easing.Linear.None, true, 0, -1, true);

    this.controls = new Controls(this.game, true);
  }

  addText(text = 'text', x = 0, y = 0, fontSize = 8, font = Globals.bitmapFont) {
    return this.game.add.bitmapText(x, y, font, text, fontSize);
  }

  update() {
    super.update();

    if (this.controls.punch || this.controls.kick || this.controls.jump) {
      this.state.start('mainmenu');
    }
  }

}

export { Credits };
