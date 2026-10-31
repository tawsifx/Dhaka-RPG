// Dhaka Cyber Arcade: Beat-'Em-Up Clash (Moon Walker & Totoro)
// Standalone Arcade Engine Bundle

import {
  Bootstrap,
  Preloader,
  MainMenu,
  OptionsAudio,
  Options,
  Credits,
  Loading,
  Intro,
  Act1,
  Act2,
  Act5,
  GameOver
} from './states';

function initBrawlerGame() {
  const Phaser = window.Phaser;
  if (!Phaser) {
    console.error('Phaser CE not loaded!');
    return;
  }

  // 240x160 native retro resolution (3:2 GameBoy Advance / GameBoy Micro aspect ratio)
  const container = document.getElementById('brawler-screen') || document.body;
  const game = new Phaser.Game(240, 160, Phaser.AUTO, container);

  game.state.add('bootstrap', new Bootstrap(game));
  game.state.add('preload', Preloader);
  game.state.add('mainmenu', MainMenu);
  game.state.add('options', Options);
  game.state.add('options-audio', OptionsAudio);
  game.state.add('credits', Credits);
  game.state.add('loading', Loading);
  game.state.add('intro', Intro);
  game.state.add('act1', Act1);
  game.state.add('act2', Act2);
  game.state.add('act5', Act5);
  game.state.add('gameover', GameOver);

  game.state.start('bootstrap');
  window.__brawlerGame = game;
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initBrawlerGame();
} else {
  window.addEventListener('DOMContentLoaded', initBrawlerGame);
}
