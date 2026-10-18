
declare global {
  interface Window {
    __activeScene?: any;
    [key: string]: any;
  }
}
// src/ui/UIController.ts - Full DOM HUD, hotbar, typewriter dialogue, scrapbook, & tabbed RPG modals
// Migrated 100% intact from game.js
import { DateState } from '../state/DateState';
import { RPGStats } from '../state/RPGStats';
import { SoundEngine } from '../audio/SoundEngine';
import { ITEMS_DB, WEAPON_FX } from '../config/items.db';
import { CRAFT_RECIPES } from '../config/recipes.db';
import { WORLDS_DB } from '../config/worlds.db';

export const UIController: any = (() => {
  const $: any = (id: string): any => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  let activeNodes = [];
  let nodeIdx = 0;
  let typingTimer = null;
  let fullLine = '';
  let isTyping = false;
  let onFinishCallback = null;
  let speakerPitch = 480;
  let speakerWave = 'sine';
  let currentTab = 'quests';

  if (typeof document !== 'undefined') {
    const bgmBtn = $('btn-bgm');
    if (bgmBtn) bgmBtn.textContent = '🎵 BGM: ON';
  }

  function refreshHotbarUI() {
    const bar = $('inventory-bar');
    if (!bar) return;
    bar.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const btn = document.createElement('button');
      const itemId = DateState.inventory[i];
      const item = itemId ? ITEMS_DB[itemId] : null;
      btn.className = 'hotbar-slot' + (item ? ' filled' : '');
      (btn as any).dataset.slot = String(i);
      btn.type = 'button';
      btn.title = item ? `${item.name}: ${item.desc}` : `Slot ${(i + 1) % 10}`;
      btn.innerHTML = `<span class="slot-key">${(i + 1) % 10}</span><span class="slot-emoji">${item ? item.emoji : ''}</span>`;
      btn.addEventListener('click', () => {
        if (!item) return;
        useOrInspectItem(itemId);
      });
      bar.appendChild(btn);
    }
  }
  refreshHotbarUI();

  function useOrInspectItem(itemId) {
    const item = ITEMS_DB[itemId];
    if (!item) return;
    if (item.cat === 'consumable') {
      DateState.hp = Math.min(DateState.maxHp, DateState.hp + (item.healHp || 35));
      DateState.sp = Math.min(DateState.maxSp, DateState.sp + (item.healSp || 20));
      SoundEngine.teaClink();
      updateRPGStats();
      showToast(item.emoji, `Enjoyed ${item.name}!`, `Restored +${item.healHp} HP & +${item.healSp} SP`);
      return;
    }
    if (item.cat === 'weapon' || item.cat === 'armor' || item.cat === 'accessory') {
      DateState.equipped[item.cat] = itemId;
      SoundEngine.select();
      updateRPGStats();
      showToast(item.emoji, `Equipped ${item.name}!`, `ATK: ${RPGStats.getAtk()} | DEF: ${RPGStats.getDef()}`);
      return;
    }
    startDialogue([
      { speaker: item.name, portrait: item.emoji, text: item.desc },
      { speaker: 'Totoro', portrait: '🐾', text: 'Every keepsake and realm relic in our bag connects our Dhaka memories to the Six Realms!' }
    ]);
  }

  function updateRPGStats() {
    if ($('hud-level')) $('hud-level').textContent = `LV. ${DateState.level} Moon Walker`;
    if ($('hud-hp-fill')) $('hud-hp-fill').style.width = `${Math.max(0, (DateState.hp / DateState.maxHp) * 100)}%`;
    if ($('hud-hp-text')) $('hud-hp-text').textContent = `HP ${Math.ceil(DateState.hp)}/${DateState.maxHp}`;
    if ($('hud-sp-fill')) $('hud-sp-fill').style.width = `${Math.max(0, (DateState.sp / DateState.maxSp) * 100)}%`;
    if ($('hud-sp-text')) $('hud-sp-text').textContent = `SP ${Math.ceil(DateState.sp)}/${DateState.maxSp}`;
    if ($('hud-xp-fill')) $('hud-xp-fill').style.width = `${Math.min(100, (DateState.xp / DateState.xpToNext) * 100)}%`;
    if ($('hud-xp-text')) $('hud-xp-text').textContent = `XP ${DateState.xp}/${DateState.xpToNext}`;
  }

  function updateHearts(count) {
    DateState.hearts = Math.min(5, count);
    if (typeof document === 'undefined') return;
    const slots = [...document.querySelectorAll('.h-slot')];
    slots.forEach((s, idx) => {
      s.textContent = idx < DateState.hearts ? '♥' : '♡';
    });
  }

  function getCompletedCount() {
    return [
      DateState.totoroJoined, DateState.teaDone, DateState.charukolaDone,
      DateState.bookDone, DateState.bulliesDefeated, DateState.ahonaQuestStage === 4,
      DateState.gajraDone, DateState.fuchkaDone, DateState.doiDone,
      DateState.rickshawTourDone, DateState.stargazingDone, DateState.confessionDone
    ].filter(Boolean).length;
  }

  function updateClock() {
    const doneCount = getCompletedCount();
   const stages = [
      { time: '3:15 PM', phase: 'Curzon Afternoon', weather: '🌤️' },
      { time: '4:00 PM', phase: 'TSC Tea Breeze', weather: '⛅' },
      { time: '4:35 PM', phase: 'Charukola Sunlight', weather: '🎨' },
      { time: '5:10 PM', phase: 'Nilkhet Storm Clouds', weather: '☁️' },
      { time: '5:35 PM', phase: 'Kalbaishakhi Monsoon', weather: '⛈️' }, // Triggers rain
      { time: '6:10 PM', phase: 'Post-Rain Golden Hour', weather: '🌅' },
      { time: '6:40 PM', phase: 'Ramna Park Twilight', weather: '🌸' },
      { time: '7:10 PM', phase: 'Beli Flower Dusk', weather: '🌼' },
      { time: '7:45 PM', phase: 'Evening Fuchka Lights', weather: '🏮' },
      { time: '8:15 PM', phase: 'Rickshaw Tour Night', weather: '🛺' },
      { time: '8:45 PM', phase: 'Starlight Telescope', weather: '🔭' },
      { time: '9:20 PM', phase: 'Astral Convergence', weather: '✨' }
    ];
    const s = stages[Math.min(doneCount, stages.length - 1)];
    if ($('hud-time')) $('hud-time').textContent = s.time;
    if ($('hud-phase')) $('hud-phase').textContent = s.phase;
    if ($('hud-weather')) $('hud-weather').textContent = s.weather;
  }

  function updateQuestText() {
    let q = '';
    if (DateState.currentWorld !== 'dhaka') {
      const w = WORLDS_DB[DateState.currentWorld];
      const bossDead = DateState.defeatedBosses.includes(w.bossSpec.id);
      q = bossDead
        ? `✨ ${w.name} Cleared! Step into the Eastern Astral Portal to travel to the next realm.`
        : `⚔️ [${w.name}] Gather realm crystals, craft gear (I), and defeat ${w.bossSpec.name} in the East Arena!`;
    } else if (!DateState.totoroJoined) {
      q = '1. Find Totoro waiting under the Krishnachura tree at Curzon Hall (South-West).';
    } else if (!DateState.teaDone) {
      q = '2. Walk North-West to the TSC Tea Stall for Malai Cha & acoustic music.';
    } else if (!DateState.charukolaDone) {
      q = '3. Visit Charukola Fine Arts (West) to paint terracotta mugs together.';
    } else if (!DateState.bookDone) {
      q = '4. Browse Nilkhet Book Lane (North) to exchange secret poetry books.';
    } else if (!DateState.bulliesDefeated) {
      q = '5. Walk along Fuller Road Walkway (Center-West) where Ahona & Apshora are standing.';
    } else if (DateState.ahonaQuestStage === 1) {
      q = '6. [Sub-Story] Check on crying Ahona & Apshora at the Ramna Park Bench (Center-East).';
    } else if (DateState.ahonaQuestStage === 2) {
      q = "7. [Sub-Story] Find Ahona's boyfriend Rakin near Nilkhet / TSC (North-Center) and help him apologize.";
    } else if (DateState.ahonaQuestStage === 3) {
      q = '8. [Sub-Story] Return to Ahona at the Ramna Park Bench to witness their reunion!';
    } else if (DateState.enanQuestStage === 1) {
      q = '💬 [Double Date] Witness Enan and Salat’s conversation at Mintu Road Fountain Plaza (Center).';
    } else if (DateState.enanQuestStage === 2) {
      q = '😢 [Double Date] Comfort crying Salat near Mintu Road Fountain Plaza (Center).';
    } else if (DateState.enanQuestStage === 3) {
      q = '🐾 [Double Date] Talk to Totoro (Partner button or stand near him) about Enan’s workaholic excuses.';
    } else if (DateState.enanQuestStage === 4) {
      q = '❗ [Double Date] Approach busy Enan with Totoro at Mintu Road to remind his soul what truly matters!';
    } else if (DateState.apshoraQuestStage === 1) {
      q = '👗 [Apshora’s Ambition] Introduce ambitious Apshora to your bestie Anamika near Charukola / campus (x:640 y:780)!';
    } else if (DateState.apshoraQuestStage === 2) {
      q = '✨ [Heritage Atelier] Visit Apshora & Anamika at Charukola Fine Arts (West) to review their debut collection!';
    } else if (DateState.apshoraQuestStage === 3) {
      q = '🎉 [Grand Debut] Attend Apshora & Anamika’s breakthrough fashion runway exhibition at Curzon Hall (South-West)!';
    } else if (!DateState.farmhouseExplored) {
      q = '🏡 [Farmhouse] Explore Green Meadows Farmhouse (Take rural road South-Center x:740 y:1540 or Map M) to interact with the animals!';
    } else if (!DateState.gajraDone) {
      q = '10. Stop by the Phulwali Flower Cart (Ramna Lawn) for a Beli flower wrist gajra.';
    } else if (!DateState.fuchkaDone) {
      q = "11. Head North-East to Mama's Fuchka Cart for the spicy Naga chili challenge.";
    } else if (!DateState.doiDone) {
      q = '12. Cool down with Bogurar Mishti Doi at the Old Dhaka Sweet Cart (East).';
    } else if (!DateState.rickshawTourDone) {
      q = '13. Board the Painted Rickshaw (East Avenue) for a grand scenic tour of Dhaka!';
    } else if (!DateState.stargazingDone) {
      q = '14. Look through the Brass Telescope on Dhanmondi Lake Pier (South-East) to spot constellations!';
    } else if (!DateState.confessionDone) {
      q = '15. Board the Lantern Rowboat at the tip of Dhanmondi Lake Pier for your confession finale!';
    } else if (!DateState.defeatedBosses.includes('boss_astral')) {
      q = '16. 🌀 Enter the shimmering Realm Fracture Portal (East Fuller Road, x:2180 y:820) or open Map (M) to journey across Worlds 2–6!';
    } else {
      q = '🌟 Grand Campaign Complete! All 6 Realms, Dhaka Keepsakes & Farmhouse mastered. Explore freely!';
    }
    if ($('hud-quest')) $('hud-quest').textContent = q;
  }

  function showToast(icon, title, sub = 'Added to your bag') {
    if (!$('item-toast')) return;
    $('toast-icon').textContent = icon;
    $('toast-title').textContent = title;
    if ($('toast-sub')) $('toast-sub').textContent = sub;
    $('item-toast').hidden = false;
    setTimeout(() => { $('item-toast').hidden = true; }, 3000);
  }

  function giveItem(itemId, memoryLabel) {
    const item = ITEMS_DB[itemId];
    if (!item) return;
    const isNew = !DateState.itemCounts[itemId];
    RPGStats.addItem(itemId, 1);
    if (memoryLabel && isNew) {
      DateState.memories.push({ emoji: item.emoji, title: item.name, note: memoryLabel });
    }
    if (itemId === 'flower' && isNew) {
      DateState.maxHp += 5;
      DateState.hp = DateState.maxHp;
    }
    SoundEngine.itemFanfare();
    refreshHotbarUI();
    updateRPGStats();
    showToast(item.emoji, `Obtained ${item.name}!`, item.desc);
  }

  function renderNode() {
    const node = activeNodes[nodeIdx];
    if (!node) {
      closeDialogue();
      return;
    }
    $('dlg-portrait').textContent = node.portrait || '🐾';
    $('dlg-speaker').textContent = node.speaker || 'Totoro';

    if (node.speaker === 'Moon Walker') { speakerPitch = 640; speakerWave = 'sine'; }
    else if (node.speaker.includes('Totoro')) { speakerPitch = 390; speakerWave = 'triangle'; }
    else if (node.speaker.includes('Ahona') || node.speaker.includes('Apshora')) { speakerPitch = 550; speakerWave = 'sawtooth'; }
    else if (node.speaker.includes('Rakin')) { speakerPitch = 430; speakerWave = 'triangle'; }
    else { speakerPitch = 490; speakerWave = 'sine'; }

    fullLine = node.text;
    $('dlg-text').textContent = '';
    $('dlg-choices').hidden = true;
    $('dlg-choices').innerHTML = '';
    $('dlg-next-hint').hidden = false;
    isTyping = true;

    let charIdx = 0;
    clearInterval(typingTimer);
    typingTimer = setInterval(() => {
      charIdx++;
      $('dlg-text').textContent = fullLine.slice(0, charIdx);
      if (charIdx % 3 === 0) SoundEngine.blip(speakerPitch, speakerWave);
      if (charIdx >= fullLine.length) {
        finishTypingNode(node);
      }
    }, 16);
  }

  function finishTypingNode(node) {
    clearInterval(typingTimer);
    isTyping = false;
    $('dlg-text').textContent = fullLine;

    if (node.choices && node.choices.length) {
      $('dlg-next-hint').hidden = true;
      const box = $('dlg-choices');
      box.hidden = false;
      box.innerHTML = '';
      node.choices.forEach(ch => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'choice-option-btn';
        btn.textContent = '▸ ' + ch.label;
        btn.addEventListener('click', e => {
          e.stopPropagation();
          SoundEngine.select();
          if (ch.onPick) ch.onPick();
          if (ch.nextNodes && ch.nextNodes.length) {
            activeNodes.splice(nodeIdx + 1, 0, ...ch.nextNodes);
          }
          nodeIdx++;
          renderNode();
        });
        box.appendChild(btn);
      });
    }
  }

  function advanceDialogue() {
    if ($('dialogue-overlay').hidden) return;
    const node = activeNodes[nodeIdx];
    if (isTyping) {
      finishTypingNode(node);
      return;
    }
    if (node && node.choices && node.choices.length) return;
    SoundEngine.select();
    nodeIdx++;
    if (nodeIdx < activeNodes.length) {
      renderNode();
    } else {
      closeDialogue();
    }
  }

  function startDialogue(nodes: any, onDone: any = null) {
    activeNodes = nodes.slice();
    nodeIdx = 0;
    onFinishCallback = onDone || null;
    $('dialogue-overlay').hidden = false;
    renderNode();
  }

  function closeDialogue() {
    clearInterval(typingTimer);
    isTyping = false;
    $('dialogue-overlay').hidden = true;
    if (onFinishCallback) {
      const cb = onFinishCallback;
      onFinishCallback = null;
      cb();
    }
  }

  function showScrapbook() {
    const grid = $('scrapbook-moments');
    grid.innerHTML = DateState.memories.length
      ? DateState.memories.map(m =>
          `<div class="scrapbook-entry"><span>${m.emoji}</span><div><b>${m.title}</b><small>${m.note}</small></div></div>`
        ).join('')
      : `<p>Explore Dhaka Valley and the Six Realms with Totoro to fill your chronicle scrapbook!</p>`;
    $('scrapbook-modal').hidden = false;
  }

  /* Tabbed RPG Menu (Quests, Bag/Gear, Crafting, World Map, System/Save) */
  function openRPGMenu(tab = 'quests') {
    currentTab = tab;
    SoundEngine.select();
    const modal = $('rpg-menu-modal');
    if (!modal) return;
    modal.hidden = false;
    document.querySelectorAll('.rpg-tab-btn').forEach(b => {
      b.classList.toggle('active', (b as any).dataset.tab === currentTab);
    });
    renderRPGTabBody();
  }

  function closeRPGMenu() {
    const modal = $('rpg-menu-modal');
    if (modal) modal.hidden = true;
  }

  function renderRPGTabBody() {
    const body = $('rpg-tab-body');
    if (!body) return;

    if (currentTab === 'quests') {
      const mainList = [
        { done: DateState.totoroJoined, title: 'Ch 1: Crimson Blossoms at Curzon Hall', desc: 'Meet Totoro under the Krishnachura tree and receive the blossom.' },
        { done: DateState.teaDone, title: 'Ch 2: Ten-Taka TSC Malai Cha & Adda', desc: 'Share earthen clay-cup tea, Singaras, and acoustic songs at TSC.' },
        { done: DateState.charukolaDone, title: 'Ch 3: Charukola Terracotta Hearts', desc: 'Paint matching clay mugs at the Faculty of Fine Arts.' },
        { done: DateState.bookDone, title: 'Ch 4: Nilkhet Secret Poetry Exchange', desc: 'Pick a poetry anthology with a secret note in Nilkhet Lane.' },
        { done: DateState.bulliesDefeated, title: 'Ch 5: Fuller Road Stand with Totoro', desc: 'Stand tall with Totoro when Ahona & Apshora confront you at the fountain.' },
        { done: DateState.ahonaQuestStage === 4, title: 'Ch 6: Healing Hearts at Ramna Park', desc: 'Reunite Ahona and Rakin with heartfelt understanding.' },
        { done: DateState.apshoraQuestStage >= 3, title: 'Ch 7: Apshora’s Heritage Haute Couture', desc: 'Introduce Apshora to Anamika and debut their runway collection.' },
        { done: DateState.enanQuestStage >= 5, title: 'Ch 8: Double Date with Enan & Salat', desc: 'Sway workaholic Enan with Totoro and share a 4-hearts double date!' },
        { done: DateState.farmhouseExplored, title: 'Ch 9: Green Meadows Pastoral Farmhouse', desc: 'Visit Chacha Rafiq’s farm, milk Shuravi the cow, and pet the animals!' },
        { done: DateState.gajraDone && DateState.fuchkaDone && DateState.doiDone, title: 'Ch 10: Garland, Naga Fuchka & Mishti Doi', desc: 'Wear the Beli wrist gajra, brave fiery fuchka, and enjoy chilled sweet curd.' },
        { done: DateState.rickshawTourDone && DateState.stargazingDone && DateState.confessionDone, title: 'Ch 11: Rickshaw Tour & Dhanmondi Lake Finale', desc: 'Tour Dhaka on a painted rickshaw, connect the stars, and row into the moonlit waters.' },
        { done: DateState.defeatedBosses.includes('boss_forest'), title: 'Ch 12: Whispering Emerald Forest', desc: 'Enter the Emerald Portal, gather Spirit Dew, and defeat the Sylvan Briar Stag.' },
        { done: DateState.defeatedBosses.includes('boss_sunken'), title: 'Ch 13: The Sunken Coral Kingdom', desc: 'Explore the coral ruins and defeat the Abyssal Coral Leviathan.' },
        { done: DateState.defeatedBosses.includes('boss_ember'), title: 'Ch 14: Emberfall Volcanic Highlands', desc: 'Cross the fiery caldera and defeat Ignis the Magma Drake.' },
        { done: DateState.defeatedBosses.includes('boss_frost'), title: 'Ch 15: Kingdom of Eternal Frost', desc: 'Uncover Totoro’s ancient guardian origin and defeat Cryon the Frost Warden.' },
        { done: DateState.defeatedBosses.includes('boss_astral'), title: 'Ch 16: The Astral Realm Convergence', desc: 'Confront the Chrono-Fracture Archon and seal the Six Realms forever.' }
      ];

      const sideList = [
        { done: DateState.cowMilked, title: 'Farmstead: Shuravi’s Organic Milk', desc: 'Gently milk Shuravi the dairy cow at Green Meadows Farmhouse.' },
        { done: DateState.eggCollected, title: 'Farmstead: Tuntuni’s Golden Egg', desc: 'Gather a warm free-range egg from Tuntuni the speckled hen.' },
        { done: DateState.goatPetted, title: 'Farmstead: Kalu the Bengal Black Goat', desc: 'Pet Kalu the playful goat and scratch his soft chin.' },
        { done: DateState.duckFed, title: 'Farmstead: Pondside Duckling Treat', desc: 'Feed puffed rice to Piku and the splashing ducklings.' },
        { done: DateState.sideQuests.sq_cat_fish, title: 'Side Quest: Campus Mascot Mimi', desc: 'Pet Mimi the ginger cat roaming near TSC.' },
        { done: DateState.sideQuests.sq_poet_rhyme, title: 'Side Quest: Nilkhet Couplet', desc: 'Chat with Baki Bhai the wandering Nilkhet poet.' },
        { done: DateState.sideQuests.sq_photo_pose, title: 'Side Quest: Golden Hour Candid', desc: 'Have Sami the Street Photographer snap your portrait.' },
        { done: (DateState.itemCounts.spirit_dew || 0) >= 2, title: 'Side Quest: Emerald Dew Gatherer', desc: 'Collect at least 2 Emerald Spirit Dew in World 2.' },
        { done: (DateState.itemCounts.coral_shard || 0) >= 2, title: 'Side Quest: Tidepool Relic Hunter', desc: 'Collect at least 2 Luminous Coral Shards in World 3.' },
        { done: (DateState.itemCounts.ember_ore || 0) >= 2, title: 'Side Quest: Highland Prospector', desc: 'Collect at least 2 Volcanic Ember Ores in World 4.' },
        { done: (DateState.itemCounts.frost_crystal || 0) >= 2, title: 'Side Quest: Starlight Glaciologist', desc: 'Collect at least 2 Permafrost Star Crystals in World 5.' }
      ];

      body.innerHTML = `
        <h3 style="margin:0 0 8px;">🌟 Main Campaign Progression (${mainList.filter(q => q.done).length}/${mainList.length})</h3>
        <div class="scrapbook-grid">
          ${mainList.map(q => `
            <div class="scrapbook-entry" style="border-color:${q.done ? '#2d8a56' : '#bfa07a'};background:${q.done ? '#e5f7ed' : '#f5e6ce'}">
              <span>${q.done ? '✅' : '⏳'}</span>
              <div><b>${q.title}</b><small>${q.desc}</small></div>
            </div>
          `).join('')}
        </div>
        <h3 style="margin:14px 0 8px;">🧭 Side Quests & Discoveries (${sideList.filter(q => q.done).length}/${sideList.length})</h3>
        <div class="scrapbook-grid">
          ${sideList.map(q => `
            <div class="scrapbook-entry">
              <span>${q.done ? '🌟' : '📌'}</span>
              <div><b>${q.title}</b><small>${q.desc}</small></div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (currentTab === 'inventory') {
      const eqW = ITEMS_DB[DateState.equipped.weapon];
      const eqA = ITEMS_DB[DateState.equipped.armor];
      const eqAc = ITEMS_DB[DateState.equipped.accessory];
      const ownedIds = Object.keys(DateState.itemCounts).filter(k => DateState.itemCounts[k] > 0);

      body.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;background:#f3e3c9;padding:12px;border-radius:10px;border:2px solid #8c6d4f;margin-bottom:14px;">
          <div><b>Moon Walker (LV. ${DateState.level})</b> | HP: ${Math.ceil(DateState.hp)}/${DateState.maxHp} | SP: ${Math.ceil(DateState.sp)}/${DateState.maxSp}</div>
          <div><b>ATK:</b> ${RPGStats.getAtk()} | <b>DEF:</b> ${RPGStats.getDef()}</div>
          <div style="width:100%;font-size:0.88rem;">
            <b>Weapon:</b> ${eqW ? eqW.emoji + ' ' + eqW.name : 'None'} &nbsp;•&nbsp;
            <b>Armor:</b> ${eqA ? eqA.emoji + ' ' + eqA.name : 'None'} &nbsp;•&nbsp;
            <b>Accessory:</b> ${eqAc ? eqAc.emoji + ' ' + eqAc.name : 'None'}
          </div>
        </div>
        <div class="scrapbook-grid">
          ${ownedIds.map(id => {
            const it = ITEMS_DB[id];
            if (!it) return '';
            const count = DateState.itemCounts[id];
            const isEquipped = DateState.equipped.weapon === id || DateState.equipped.armor === id || DateState.equipped.accessory === id;
            const actionLabel = it.cat === 'consumable' ? 'Use / Sip' : (['weapon', 'armor', 'accessory'].includes(it.cat) ? (isEquipped ? 'Equipped ✓' : 'Equip') : 'Inspect');
            return `
              <div class="scrapbook-entry" style="justify-content:space-between;">
                <div style="display:flex;gap:8px;align-items:center;">
                  <span>${it.emoji}</span>
                  <div>
                    <b>${it.name} ${count > 1 ? `(x${count})` : ''}</b>
                    <small>${it.desc}</small>
                  </div>
                </div>
                <button class="hud-btn bag-act-btn" data-id="${id}" type="button">${actionLabel}</button>
              </div>
            `;
          }).join('')}
        </div>
      `;
      body.querySelectorAll('.bag-act-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          useOrInspectItem((btn as any).dataset.id);
          renderRPGTabBody();
        });
      });
    } else if (currentTab === 'crafting') {
      body.innerHTML = `
        <p style="margin-top:0;">Combine realm materials gathered from Worlds 2–6 to forge upgraded weapons, cloaks, and restorative TSC Malai Cha.</p>
        <div class="scrapbook-grid">
          ${CRAFT_RECIPES.map(r => {
            const res = ITEMS_DB[r.result];
            const canCraft = Object.entries(r.reqs).every(([k, reqQty]) => (DateState.itemCounts[k] || 0) >= reqQty);
            return `
              <div class="scrapbook-entry" style="justify-content:space-between;">
                <div style="display:flex;gap:10px;align-items:center;">
                  <span>${res.emoji}</span>
                  <div>
                    <b>${r.name}</b>
                    <small>Requires: ${r.costDesc}</small>
                  </div>
                </div>
                <button class="hud-btn craft-btn" data-rid="${r.id}" ${canCraft ? '' : 'disabled'} style="opacity:${canCraft ? 1 : 0.45}" type="button">⚒️ Craft</button>
              </div>
            `;
          }).join('')}
        </div>
      `;
      body.querySelectorAll('.craft-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const rec = CRAFT_RECIPES.find(r => r.id === (btn as any).dataset.rid);
          if (!rec) return;
          for (const [k, q] of Object.entries(rec.reqs)) {
            DateState.itemCounts[k] -= q;
          }
          giveItem(rec.result, `Crafted ${ITEMS_DB[rec.result].name} in the Realm Forge.`);
          renderRPGTabBody();
        });
      });
    } else if (currentTab === 'map') {
      body.innerHTML = `
        <p style="margin-top:0;">Fast-travel between any unlocked realm. (Tip: You can also unlock all 6 realms immediately if you want to tour every world right away!)</p>
        <div class="scrapbook-grid">
          ${Object.values(WORLDS_DB).map(w => {
            const unlocked = DateState.unlockedWorlds.includes(w.id);
            const active = DateState.currentWorld === w.id;
            return `
              <div class="scrapbook-entry" style="justify-content:space-between;border-color:${active ? '#d45779' : '#bfa07a'}">
                <div>
                  <b>${w.name} ${active ? '📍 (Current)' : ''}</b>
                  <small>${w.subtitle}</small>
                </div>
                <button class="hud-btn warp-world-btn" data-wid="${w.id}" type="button">${unlocked ? '🌀 Travel' : '🔓 Unlock & Travel'}</button>
              </div>
            `;
          }).join('')}
        </div>
      `;
      body.querySelectorAll('.warp-world-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const wid = (btn as any).dataset.wid;
          if (!DateState.unlockedWorlds.includes(wid)) DateState.unlockedWorlds.push(wid);
          closeRPGMenu();
          if (window.__activeScene) {
            window.__activeScene.transitionToWorld(wid);
          }
        });
      });
    } else if (currentTab === 'system') {
      const vols = SoundEngine.getVolumes();
      const currTrack = SoundEngine.getCurrentTrack();
      const allTracks = SoundEngine.getAllTracks();
      const autoTheme = SoundEngine.isAutoThemeEnabled();

      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="scrapbook-entry" style="justify-content:space-between;">
            <div><b>💾 Save / Load Progress</b><small>Persist your level, keepsakes, quests, and current world in browser storage.</small></div>
            <div style="display:flex;gap:8px;">
              <button id="sys-btn-save" class="primary-rpg-btn" type="button">Save Now</button>
              <button id="sys-btn-load" class="secondary-rpg-btn" type="button">Load Save</button>
            </div>
          </div>

          <!-- Ghibli & Realm Jukebox -->
          <div class="scrapbook-entry" style="flex-direction:column;gap:8px;background:rgba(20,14,10,0.5);">
            <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
              <div><b>📻 Ghibli &amp; Realm Jukebox</b><small>Select BGM tracks or let the game adapt to your location.</small></div>
              <label style="font-size:11px;display:flex;align-items:center;gap:6px;cursor:pointer;color:#fce38a;">
                <input id="sys-auto-bgm" type="checkbox" ${autoTheme ? 'checked' : ''} style="cursor:pointer;" />
                <span>Auto Realm Music</span>
              </label>
            </div>

            <div style="display:flex;align-items:center;gap:10px;background:rgba(0,0,0,0.3);padding:8px 12px;border-radius:8px;border:1px solid rgba(255,209,102,0.25);width:100%;box-sizing:border-box;">
              <span style="font-size:18px;">🎵</span>
              <div style="flex:1;min-width:0;">
                <div id="jukebox-current-title" style="font-size:12px;font-weight:700;color:#ffd166;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${currTrack.title}</div>
                <div style="font-size:10px;color:#d8cbb8;"><span id="jukebox-current-badge">${currTrack.badge}</span> • ${currTrack.artist}</div>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%;box-sizing:border-box;margin-top:2px;">
              ${Object.values(allTracks).map(t => `
                <button class="hud-btn sys-track-btn ${t.id === currTrack.id ? 'active' : ''}" data-tid="${t.id}" style="font-size:11px;text-align:left;padding:6px 8px;display:flex;flex-direction:column;gap:2px;" type="button">
                  <span style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.title.split('—')[0].trim()}</span>
                  <span style="font-size:9px;opacity:0.85;">${t.badge}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="scrapbook-entry" style="justify-content:space-between;">
            <div><b>🎵 Music Volume</b></div>
            <input id="sys-music-vol" type="range" min="0" max="1" step="0.05" value="${vols.musicVol}" />
          </div>
          <div class="scrapbook-entry" style="justify-content:space-between;">
            <div><b>🔊 Sound Effects Volume</b></div>
            <input id="sys-sfx-vol" type="range" min="0" max="1" step="0.05" value="${vols.sfxVol}" />
          </div>
          <div class="scrapbook-entry" style="justify-content:space-between;">
            <div><b>📖 Chronicle Scrapbook</b><small>View all recorded keepsake memories.</small></div>
            <button id="sys-btn-scrapbook" class="hud-btn" type="button">Open Scrapbook</button>
          </div>
        </div>
      `;

      body.querySelectorAll('.sys-track-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          SoundEngine.select();
          const tid = (btn as any).dataset.tid;
          SoundEngine.playTrack(tid, true);
          const autoCheckbox = body.querySelector('#sys-auto-bgm');
          if (autoCheckbox) (autoCheckbox as any).checked = false;
        });
      });

      body.querySelector('#sys-auto-bgm')?.addEventListener('change', (e) => {
        SoundEngine.select();
        SoundEngine.setAutoTheme((e.target as any).checked);
      });
      body.querySelector('#sys-btn-save').addEventListener('click', () => {
        RPGStats.saveGame(window.__activeScene);
      });
      body.querySelector('#sys-btn-load').addEventListener('click', () => {
        if (RPGStats.loadGame()) {
          closeRPGMenu();
          refreshHotbarUI();
          updateRPGStats();
          updateHearts(DateState.hearts);
          if (window.__activeScene) window.__activeScene.transitionToWorld(DateState.currentWorld, DateState.playerPos);
        }
      });
      body.querySelector('#sys-music-vol').addEventListener('input', e => {
        SoundEngine.setVolumes( parseFloat((e.target as any).value), SoundEngine.getVolumes().sfxVol );
      });
      body.querySelector('#sys-sfx-vol').addEventListener('input', e => {
        SoundEngine.setVolumes( SoundEngine.getVolumes().musicVol, parseFloat((e.target as any).value) );
      });
      body.querySelector('#sys-btn-scrapbook').addEventListener('click', () => {
        closeRPGMenu();
        showScrapbook();
      });
    }
  }

  // Wire DOM Buttons
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const initDom = () => {
      $('dialogue-overlay')?.addEventListener('click', () => advanceDialogue());
      $('btn-keep-exploring')?.addEventListener('click', () => {
        SoundEngine.select();
        const m = $('scrapbook-modal');
        if (m) m.hidden = true;
      });
      $('btn-open-quests')?.addEventListener('click', () => openRPGMenu('quests'));
      $('btn-open-bag')?.addEventListener('click', () => openRPGMenu('inventory'));
      $('btn-open-map')?.addEventListener('click', () => openRPGMenu('map'));
      $('btn-save-game')?.addEventListener('click', () => RPGStats.saveGame(window.__activeScene));
      $('btn-close-rpg-menu')?.addEventListener('click', () => closeRPGMenu());

      document.querySelectorAll('.rpg-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => openRPGMenu((btn as any).dataset.tab));
      });

      // Hamburger Dropdown Drawer Toggle
      const menuBtn = $('btn-menu-toggle');
      const dropdown = $('hud-dropdown-menu');

      if (menuBtn && dropdown) {
        menuBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          SoundEngine.select();
          const isHidden = dropdown.hidden;
          dropdown.hidden = !isHidden;
          menuBtn.classList.toggle('open', !isHidden);
        });

        // Auto-close dropdown when any drawer item is tapped
        dropdown.querySelectorAll('button').forEach(b => {
          b.addEventListener('click', () => {
            dropdown.hidden = true;
            menuBtn.classList.remove('open');
          });
        });

        // Close when tapping anywhere else on screen
        window.addEventListener('click', (e) => {
          if (!dropdown.hidden && !dropdown.contains(e.target as Node) && e.target !== menuBtn) {
            dropdown.hidden = true;
            menuBtn.classList.remove('open');
          }
        });
      }

      // Title Screen Wiring & Menu BGM Manager
      const titleOverlay = $('title-screen-overlay');
      const menuBgm = $('menu-bgm');
      const audioStatusText = $('menu-audio-text');

      function startMenuMusic() {
        if (!menuBgm) return;
        if (!(menuBgm as any).src || !(menuBgm as any).src.endsWith('.mp3')) {
          (menuBgm as any).src = 'assets/audio/spirited_away_piano.mp3';
        }
        try { (menuBgm as any).volume = 0.75; } catch(e){}
        (menuBgm as any).loop = true;

        (menuBgm as any).play().then(() => {
          if (audioStatusText) audioStatusText.textContent = "MUSIC: SPIRITED AWAY — ONE SUMMER'S DAY (PIANO) ♫";
        }).catch((err) => {
          console.warn("Autoplay blocked or pending click:", err);
        });
      }

      function fadeOutMenuMusic(callback) {
        if (!menuBgm || (menuBgm as any).paused) {
          if (callback) callback();
          return;
        }
        if (window.__activeScene && window.__activeScene.tweens) {
          window.__activeScene.tweens.add({
            targets: menuBgm,
            volume: 0,
            duration: 350,
            ease: 'Linear',
            onComplete: () => {
              (menuBgm as any).pause();
              (menuBgm as any).currentTime = 0;
              if (callback) callback();
            }
          });
          return;
        }
        let vol = (menuBgm as any).volume;
        const fade = setInterval(() => {
          vol = Math.max(0, vol - 0.1);
          (menuBgm as any).volume = vol;
          if (vol <= 0.05) {
            clearInterval(fade);
            (menuBgm as any).pause();
            (menuBgm as any).currentTime = 0;
            if (callback) callback();
          }
        }, 35);
      }

      function enterMainGame() {
        fadeOutMenuMusic(() => {
          if (titleOverlay) titleOverlay.hidden = true;
          // Start in-game procedural music only AFTER the player leaves the menu
          SoundEngine.playBGM();
        });
      }

      if (titleOverlay) {
        // Start menu MP3 on first user tap/click
        titleOverlay.addEventListener('pointerdown', () => {
          SoundEngine.unlock();
          startMenuMusic();
        }, { once: true });

        if (RPGStats.hasSave()) {
          const contBtn = $('btn-title-continue');
          if (contBtn) contBtn.hidden = false;
        }

        // Classic RPG cursor sound effects on hover/focus
        document.querySelectorAll('.rpg-cmd-btn').forEach(btn => {
          btn.addEventListener('mouseenter', () => SoundEngine.blip(620, 'triangle'));
          btn.addEventListener('focus', () => SoundEngine.blip(620, 'triangle'));
        });

        $('btn-title-new')?.addEventListener('click', (e) => {
          e.stopPropagation();
          SoundEngine.unlock();
          SoundEngine.select();
          enterMainGame();
        });

        $('btn-title-continue')?.addEventListener('click', (e) => {
          e.stopPropagation();
          SoundEngine.unlock();
          SoundEngine.select();
          if (RPGStats.loadGame()) {
            refreshHotbarUI();
            updateRPGStats();
            updateHearts(DateState.hearts);
            updateClock();
            updateQuestText();
            if (window.__activeScene) {
              window.__activeScene.transitionToWorld(DateState.currentWorld, DateState.playerPos);
            }
          }
          enterMainGame();
        });

        $('btn-title-scrapbook')?.addEventListener('click', (e) => {
          e.stopPropagation();
          SoundEngine.select();
          const box = $('title-controls-box');
          if (box) box.hidden = !box.hidden;
        });
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDom);
    } else {
      initDom();
    }
  }

  return {
    isOpen: () => {
      const overlay = $('dialogue-overlay');
      const scrapbook = $('scrapbook-modal');
      const rpgMenu = $('rpg-menu-modal');
      const title = $('title-screen-overlay');
      return Boolean(
        (overlay && !overlay.hidden) ||
        (scrapbook && !scrapbook.hidden) ||
        (rpgMenu && !rpgMenu.hidden) ||
        (title && !title.hidden)
      );
    },
    startDialogue,
    advanceDialogue,
    giveItem,
    showToast,
    refreshHotbarUI,
    updateRPGStats,
    updateHearts,
    updateClock,
    updateQuestText,
    getCompletedCount,
    showScrapbook,
    openRPGMenu,
    setZone: name => { if ($('hud-zone')) $('hud-zone').textContent = name; },
    setBossHUD: (visible, name = '', hp = 1, maxHp = 1) => {
      const el = $('boss-hud');
      if (!el) return;
      el.hidden = !visible;
      if (visible) {
        $('boss-name').textContent = name;
        $('boss-hp-fill').style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
      }
    }
  };
})();

export const UI = UIController;

if (typeof window !== 'undefined') {
  (window as any).UI = UIController;
  (window as any).UIController = UIController;
}
