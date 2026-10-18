// src/config/constants.ts - Central game constants, coordinates, dimensions & keys

/** Curzon Hall render scale: 1 = 190x116px, 2 = 380x232px, 2.25 = 428x261px */
export const CURZON_K = 2.25;
export const CURZON_X = 208;   // snapped map X (col 6 * 32 + 16)
export const CURZON_Y = 1328;  // snapped map Y (row 41 * 32 + 16)

/** LocalStorage and save persistence key */
export const SAVE_KEY = 'totoro_moonwalker_rpg_save_v2';

/** World Map Dimensions: Standardized 80 x 60 tiles (2560 x 1920 px) */
export const DHAKA_MAP_WIDTH = 2560;
export const DHAKA_MAP_HEIGHT = 1920;

export const EXPEDITION_MAP_WIDTH = 2560;
export const EXPEDITION_MAP_HEIGHT = 1920;

/** Interiors & Farmstead: Standardized 40 x 30 tiles (1280 x 960 px) */
export const CURZON_INTERIOR_WIDTH = 1280;
export const CURZON_INTERIOR_HEIGHT = 960;

export const FARMHOUSE_WIDTH = 1280;
export const FARMHOUSE_HEIGHT = 960;

/** Tile sizes */
export const TILE_SIZE = 32;
export const CHUNK_SIZE = 16;
