// src/config/databaseIndex.ts - In-Memory O(1) Indexed Game Database & Browser IndexedDB Persistence Engine
import { ITEMS_DB, WEAPON_FX, WeaponFxConfig } from './items.db';
import { CROPS_DB } from './crops.db';
import { CRAFT_RECIPES, CraftRecipeDef } from './recipes.db';
import { WORLDS_DB } from './worlds.db';
import { NPC_SCHEDULES_DB } from './npcSchedules.db';
import { ATTACKS_DB, AttackDef } from './attacks.db';
import { ASSET_SPECS_MANIFEST } from './assetSpecs.manifest';
import { ItemDef } from '../types/rpg.types';
import { CropDef, Season } from '../types/stardew.types';
import { MapId, NpcScheduleDef } from '../types/npc.types';

export interface CatalogRecord {
  uid: string;
  table: 'items' | 'crops' | 'recipes' | 'worlds' | 'npcs' | 'attacks' | 'assets';
  id: string;
  category: string;
  mapId: string;
  data: any;
}

export interface SaveSlotRecord {
  id: string;
  version: number;
  timestamp: string;
  timestampMs: number;
  worldId: string;
  level: number;
  state: any;
  volumes: { musicVol: number; sfxVol: number };
}

const IDB_NAME = 'dhaka_rpg_indexed_db';
const IDB_VERSION = 1;

class GameDatabaseEngine {
  // Primary O(1) Hash Indexes
  public readonly itemsById = new Map<string, ItemDef>();
  public readonly weaponFxById = new Map<string, WeaponFxConfig>();
  public readonly cropsById = new Map<string, CropDef>();
  public readonly recipesById = new Map<string, CraftRecipeDef>();
  public readonly worldsById = new Map<string, any>();
  public readonly npcsById = new Map<string, NpcScheduleDef>();
  public readonly attacksById = new Map<string, AttackDef>();

  // Secondary Inverted Indexes for O(1) Filtered Queries
  public readonly itemsByCategory = new Map<string, ItemDef[]>();
  public readonly cropsBySeedId = new Map<string, CropDef>();
  public readonly cropsByHarvestId = new Map<string, CropDef>();
  public readonly cropsBySeason = new Map<Season, CropDef[]>();
  public readonly recipesByResult = new Map<string, CraftRecipeDef>();
  public readonly recipesByMaterial = new Map<string, CraftRecipeDef[]>();
  public readonly npcsByHomeMap = new Map<MapId, NpcScheduleDef[]>();
  public readonly npcsByScheduledMap = new Map<MapId, NpcScheduleDef[]>();
  public readonly npcsByTier = new Map<string, NpcScheduleDef[]>();
  public readonly attacksBySource = new Map<string, AttackDef[]>();

  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private isIndexed = false;

  constructor() {
    this.buildInMemoryIndexes();
  }

  /**
   * Builds all primary and secondary in-memory indexes over the static .db.ts definitions.
   */
  public buildInMemoryIndexes(): void {
    if (this.isIndexed) return;

    // 1. Index Items & Weapon FX
    for (const [id, item] of Object.entries(ITEMS_DB)) {
      this.itemsById.set(id, item);
      const cat = item.cat || 'misc';
      const list = this.itemsByCategory.get(cat) || [];
      list.push(item);
      this.itemsByCategory.set(cat, list);
    }
    for (const [id, fx] of Object.entries(WEAPON_FX)) {
      this.weaponFxById.set(id, fx);
    }

    // 2. Index Crops (by ID, Seed ID, Harvest ID, and Season)
    for (const [id, crop] of Object.entries(CROPS_DB)) {
      this.cropsById.set(id, crop);
      this.cropsBySeedId.set(crop.seedItemId, crop);
      this.cropsByHarvestId.set(crop.harvestItemId, crop);
      for (const season of crop.seasons) {
        const list = this.cropsBySeason.get(season) || [];
        list.push(crop);
        this.cropsBySeason.set(season, list);
      }
    }

    // 3. Index Crafting Recipes (by ID, Result Item, and Required Material)
    for (const recipe of CRAFT_RECIPES) {
      this.recipesById.set(recipe.id, recipe);
      this.recipesByResult.set(recipe.result, recipe);
      for (const matId of Object.keys(recipe.reqs)) {
        const list = this.recipesByMaterial.get(matId) || [];
        list.push(recipe);
        this.recipesByMaterial.set(matId, list);
      }
    }

    // 4. Index Worlds
    for (const [id, world] of Object.entries(WORLDS_DB)) {
      this.worldsById.set(id, world);
    }

    // 5. Index NPC Schedules (by ID, Home Map, All Scheduled Maps, and Tier)
    for (const [id, npc] of Object.entries(NPC_SCHEDULES_DB)) {
      this.npcsById.set(id, npc);

      const homeMap = npc.home.map;
      const homeList = this.npcsByHomeMap.get(homeMap) || [];
      homeList.push(npc);
      this.npcsByHomeMap.set(homeMap, homeList);

      const tierList = this.npcsByTier.get(npc.tier) || [];
      tierList.push(npc);
      this.npcsByTier.set(npc.tier, tierList);

      const visitedMaps = new Set<MapId>([npc.home.map, npc.sleep.map]);
      npc.variants.forEach(v => v.stops.forEach(s => visitedMaps.add(s.map)));
      npc.fallback.forEach(s => visitedMaps.add(s.map));
      visitedMaps.forEach(m => {
        const mapList = this.npcsByScheduledMap.get(m) || [];
        mapList.push(npc);
        this.npcsByScheduledMap.set(m, mapList);
      });
    }

    // 6. Index Combat Attacks by ID & Source ('player' | 'totoro' | 'enemy' | 'boss')
    for (const [id, atk] of Object.entries(ATTACKS_DB)) {
      this.attacksById.set(id, atk);
      const src = atk.source || 'enemy';
      const list = this.attacksBySource.get(src) || [];
      list.push(atk);
      this.attacksBySource.set(src, list);
    }

    this.isIndexed = true;
  }

  // Fast O(1) Query Helpers
  public getItem(id: string): ItemDef | undefined {
    return this.itemsById.get(id);
  }

  public getItemsByCategory(category: string): ItemDef[] {
    return this.itemsByCategory.get(category) || [];
  }

  public getCrop(id: string): CropDef | undefined {
    return this.cropsById.get(id);
  }

  public getCropBySeed(seedItemId: string): CropDef | undefined {
    return this.cropsBySeedId.get(seedItemId);
  }

  public getCropsForSeason(season: Season): CropDef[] {
    return this.cropsBySeason.get(season) || [];
  }

  public getRecipesUsingMaterial(materialId: string): CraftRecipeDef[] {
    return this.recipesByMaterial.get(materialId) || [];
  }

  public getWorld(worldId: string): any {
    return this.worldsById.get(worldId);
  }

  public getNpc(npcId: string): NpcScheduleDef | undefined {
    return this.npcsById.get(npcId);
  }

  public getNpcsForMap(mapId: MapId): NpcScheduleDef[] {
    return this.npcsByScheduledMap.get(mapId) || [];
  }

  /**
   * Opens and initializes the browser IndexedDB database with object stores and secondary indexes:
   * - `saves` (indexed by `timestampMs`, `worldId`, `level`)
   * - `catalog` (indexed by `table`, `category`, `mapId`)
   * - `kv_state` (key-value store)
   */
  public openIndexedDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !('indexedDB' in window) || !window.indexedDB) {
      return Promise.resolve(null);
    }
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase | null>(resolve => {
      try {
        const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);

        req.onupgradeneeded = () => {
          const db = req.result;

          if (!db.objectStoreNames.contains('saves')) {
            const saveStore = db.createObjectStore('saves', { keyPath: 'id' });
            saveStore.createIndex('by_timestamp', 'timestampMs', { unique: false });
            saveStore.createIndex('by_world', 'worldId', { unique: false });
            saveStore.createIndex('by_level', 'level', { unique: false });
          }

          if (!db.objectStoreNames.contains('catalog')) {
            const catStore = db.createObjectStore('catalog', { keyPath: 'uid' });
            catStore.createIndex('by_table', 'table', { unique: false });
            catStore.createIndex('by_category', 'category', { unique: false });
            catStore.createIndex('by_map', 'mapId', { unique: false });
          }

          if (!db.objectStoreNames.contains('kv_state')) {
            db.createObjectStore('kv_state', { keyPath: 'key' });
          }
        };

        req.onsuccess = () => {
          resolve(req.result);
        };

        req.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Synchronizes all static game database tables into the browser's IndexedDB `catalog` store.
   */
  public async initIndexedDB(): Promise<boolean> {
    const db = await this.openIndexedDB();
    if (!db) return false;

    return new Promise<boolean>(resolve => {
      try {
        const tx = db.transaction(['catalog', 'kv_state'], 'readwrite');
        const store = tx.objectStore('catalog');
        const kv = tx.objectStore('kv_state');

        const records: CatalogRecord[] = [];

        this.itemsById.forEach((item, id) => {
          records.push({ uid: `items:${id}`, table: 'items', id, category: item.cat || 'misc', mapId: 'all', data: item });
        });
        this.cropsById.forEach((crop, id) => {
          records.push({ uid: `crops:${id}`, table: 'crops', id, category: crop.seasons.join(','), mapId: 'farmhouse', data: crop });
        });
        this.recipesById.forEach((rec, id) => {
          records.push({ uid: `recipes:${id}`, table: 'recipes', id, category: 'crafting', mapId: 'all', data: rec });
        });
        this.worldsById.forEach((w, id) => {
          const { npcSpec, ...serializableWorld } = w;
          records.push({
            uid: `worlds:${id}`,
            table: 'worlds',
            id,
            category: w.theme || 'realm',
            mapId: id,
            data: serializableWorld
          });
        });
        this.npcsById.forEach((npc, id) => {
          records.push({ uid: `npcs:${id}`, table: 'npcs', id, category: `tier_${npc.tier}`, mapId: npc.home.map, data: npc });
        });
        this.attacksById.forEach((atk, id) => {
          records.push({ uid: `attacks:${id}`, table: 'attacks', id, category: atk.source, mapId: 'combat', data: atk });
        });
        Object.entries(ASSET_SPECS_MANIFEST).forEach(([id, spec]) => {
          records.push({ uid: `assets:${id}`, table: 'assets', id, category: spec.category, mapId: 'all', data: spec });
        });

        for (const rec of records) {
          store.put(rec);
        }

        kv.put({
          key: 'catalog_meta',
          indexedAt: Date.now(),
          totalRecords: records.length,
          counts: {
            items: this.itemsById.size,
            crops: this.cropsById.size,
            recipes: this.recipesById.size,
            worlds: this.worldsById.size,
            npcs: this.npcsById.size,
            attacks: this.attacksById.size,
            assets: Object.keys(ASSET_SPECS_MANIFEST).length
          }
        });

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Queries records from the IndexedDB `catalog` store using a secondary index (`by_table`, `by_category`, `by_map`).
   */
  public async queryCatalogByIndex(
    indexName: 'by_table' | 'by_category' | 'by_map',
    key: string
  ): Promise<CatalogRecord[]> {
    const db = await this.openIndexedDB();
    if (!db) return [];

    return new Promise<CatalogRecord[]>(resolve => {
      try {
        const tx = db.transaction('catalog', 'readonly');
        const store = tx.objectStore('catalog');
        const idx = store.index(indexName);
        const req = idx.getAll(key);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  /**
   * Persists a save slot record into the IndexedDB `saves` store.
   */
  public async putSaveRecord(record: SaveSlotRecord): Promise<boolean> {
    const db = await this.openIndexedDB();
    if (!db) return false;

    return new Promise<boolean>(resolve => {
      try {
        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        store.put(record);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Reads a save slot record by ID from the IndexedDB `saves` store.
   */
  public async getSaveRecord(slotId = 'primary'): Promise<SaveSlotRecord | null> {
    const db = await this.openIndexedDB();
    if (!db) return null;

    return new Promise<SaveSlotRecord | null>(resolve => {
      try {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const req = store.get(slotId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Lists all save records ordered by timestamp using the `by_timestamp` index.
   */
  public async listSavesByTimestamp(): Promise<SaveSlotRecord[]> {
    const db = await this.openIndexedDB();
    if (!db) return [];

    return new Promise<SaveSlotRecord[]>(resolve => {
      try {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const idx = store.index('by_timestamp');
        const req = idx.getAll();
        req.onsuccess = () => {
          const list = (req.result || []) as SaveSlotRecord[];
          list.sort((a, b) => b.timestampMs - a.timestampMs);
          resolve(list);
        };
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  /**
   * Deletes a save slot from the IndexedDB `saves` store.
   */
  public async deleteSaveRecord(slotId = 'primary'): Promise<boolean> {
    const db = await this.openIndexedDB();
    if (!db) return false;

    return new Promise<boolean>(resolve => {
      try {
        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        store.delete(slotId);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }
}

export const GameDB = new GameDatabaseEngine();

if (typeof window !== 'undefined') {
  (window as any).GameDB = GameDB;
}
