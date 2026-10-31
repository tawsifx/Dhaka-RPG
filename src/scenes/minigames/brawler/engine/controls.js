// controls.js - handles all user input and virtual arcade buttons
import Globals from './globals';

const stickThreshold = 0.1;

class Controls {

  constructor(game, justPressed = false) {
    this.game = game;
    this.justPressed = justPressed;

    try {
      this.pad1 = game.input.gamepad.pad1;
    } catch (e) {
      this.pad1 = null;
    }

    // add all possible keyboard inputs
    this.keys = {
      ups: [
        game.input.keyboard.addKey(Phaser.Keyboard.UP),
        game.input.keyboard.addKey(Phaser.Keyboard.W)
      ],
      downs: [
        game.input.keyboard.addKey(Phaser.Keyboard.DOWN),
        game.input.keyboard.addKey(Phaser.Keyboard.S)
      ],
      lefts: [
        game.input.keyboard.addKey(Phaser.Keyboard.A),
        game.input.keyboard.addKey(Phaser.Keyboard.LEFT)
      ],
      rights: [
        game.input.keyboard.addKey(Phaser.Keyboard.D),
        game.input.keyboard.addKey(Phaser.Keyboard.RIGHT)
      ],
      punches: [
        game.input.keyboard.addKey(Phaser.Keyboard.J),
        game.input.keyboard.addKey(Phaser.Keyboard.Z),
        game.input.keyboard.addKey(Phaser.Keyboard.H),
        game.input.keyboard.addKey(Phaser.Keyboard.ENTER)
      ],
      kicks: [
        game.input.keyboard.addKey(Phaser.Keyboard.K),
        game.input.keyboard.addKey(Phaser.Keyboard.X),
        game.input.keyboard.addKey(Phaser.Keyboard.P)
      ],
      jumps: [
        game.input.keyboard.addKey(Phaser.Keyboard.SPACE),
        game.input.keyboard.addKey(Phaser.Keyboard.C),
        game.input.keyboard.addKey(Phaser.Keyboard.L)
      ]
    };

    if (Globals.debug) {
      this.keys = {
        ...this.keys,
        killAll: game.input.keyboard.addKey(Phaser.Keyboard.ONE),
        warpAtEnd: game.input.keyboard.addKey(Phaser.Keyboard.TWO),
        hurtHero: game.input.keyboard.addKey(Phaser.Keyboard.N),
        healHero: game.input.keyboard.addKey(Phaser.Keyboard.M),
      };
    }
  }

  _keyPressed(keys) {
    for (const k of keys) {
      if (!k) continue;
      if (this.justPressed) {
        if (k.justPressed()) return true;
      } else {
        if (k.isDown) return true;
      }
    }
    return false;
  }

  _virtualPressed(btn) {
    if (typeof window !== 'undefined' && window.__BRAWLER_VIRTUAL_PAD) {
      const v = window.__BRAWLER_VIRTUAL_PAD;
      if (this.justPressed) {
        if (v[btn + 'JustPressed']) {
          v[btn + 'JustPressed'] = false;
          return true;
        }
      } else {
        return !!v[btn];
      }
    }
    return false;
  }

  _padPressed(button) {
    if (!this.pad1) return false;
    if (this.justPressed) {
      return this.pad1.justPressed(button, 25);
    }
    return this.pad1.isDown(button);
  }

  _stickMoved(isAxisOverTreshold) {
    if (this.justPressed) return false;
    return isAxisOverTreshold;
  }

  get up() {
    return (
      this._keyPressed(this.keys.ups) ||
      this._virtualPressed('up') ||
      this._padPressed(Phaser.Gamepad.XBOX360_DPAD_UP) ||
      this._stickMoved(this.pad1 && this.pad1.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_Y) < -stickThreshold)
    );
  }

  get down() {
    return (
      this._keyPressed(this.keys.downs) ||
      this._virtualPressed('down') ||
      this._padPressed(Phaser.Gamepad.XBOX360_DPAD_DOWN) ||
      this._stickMoved(this.pad1 && this.pad1.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_Y) > stickThreshold)
    );
  }

  get left() {
    return (
      this._keyPressed(this.keys.lefts) ||
      this._virtualPressed('left') ||
      this._padPressed(Phaser.Gamepad.XBOX360_DPAD_LEFT) ||
      this._stickMoved(this.pad1 && this.pad1.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_X) < -stickThreshold)
    );
  }

  get right() {
    return (
      this._keyPressed(this.keys.rights) ||
      this._virtualPressed('right') ||
      this._padPressed(Phaser.Gamepad.XBOX360_DPAD_RIGHT) ||
      this._stickMoved(this.pad1 && this.pad1.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_X) > stickThreshold)
    );
  }

  get punch() {
    return (
      this._keyPressed(this.keys.punches) ||
      this._virtualPressed('punch') ||
      this._padPressed(Phaser.Gamepad.XBOX360_X)
    );
  }

  get kick() {
    return (
      this._keyPressed(this.keys.kicks) ||
      this._virtualPressed('kick') ||
      this._padPressed(Phaser.Gamepad.XBOX360_B)
    );
  }

  get jump() {
    return (
      this._keyPressed(this.keys.jumps) ||
      this._virtualPressed('jump') ||
      this._padPressed(Phaser.Gamepad.XBOX360_A)
    );
  }

  get killAll() {
    return this.keys.killAll && this.keys.killAll.justPressed();
  }

  get warpAtEnd() {
    return this.keys.warpAtEnd && this.keys.warpAtEnd.justPressed();
  }

  get hurtHero() {
    return this.keys.hurtHero && this.keys.hurtHero.justPressed();
  }

  get healHero() {
    return this.keys.healHero && this.keys.healHero.justPressed();
  }
}

export default Controls;
