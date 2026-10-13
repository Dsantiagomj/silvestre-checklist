// ============================================================================
// ASSETS DEL JUEGO (DofusDB) — generados por .build/build_assets_js.py
// ============================================================================
import DATA from "../data/assets.json";

export const ASSETS = DATA.STEP_ASSETS || {};
export const ITEMS = DATA.ITEMS || {};
export const PREREQ_ICONS = DATA.PREREQ_ICONS || {};
/** Mapa de fondo del hero por tema: { dark, light }. */
export const HERO_BG = DATA.HERO_BG || null;
export const BRAND_ICON = DATA.BRAND_ICON || null;
export const THEME_ICONS = DATA.THEME_ICONS || null;
export const BACKUP_ICONS = DATA.BACKUP_ICONS || null;
export const HEADER_ICONS = DATA.HEADER_ICONS || null;
export const HERO_ICONS = DATA.HERO_ICONS || null;
export const EASTER_ICONS = DATA.EASTER_ICONS || null;

const IMG_BASE = import.meta.env.BASE_URL + (DATA.DOFUS_IMG || "");

export const assetsFor = n => ASSETS[String(n)] || null;

// Absoluta a propósito: la ventana del overlay no comparte la URL base de esta página.
export const imgUrl = path => new URL(IMG_BASE + path, location.href).href;

/** Suma cantidades por objeto, contando cada logro o misión fuente una sola vez. */
export function mergeItems(rows) {
  const seen = new Set();
  const total = new Map();
  for (const [id, q, src] of rows) {
    const key = src + ":" + id;
    if (seen.has(key)) continue;
    seen.add(key);
    total.set(id, (total.get(id) || 0) + q);
  }
  return [...total.entries()].filter(([id]) => ITEMS[id]);
}
