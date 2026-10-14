// ============================================================================
// ASSETS DEL JUEGO (DofusDB) — generados por .build/build_assets_js.py
// ============================================================================
import DATA from "../data/assets.json";
import ZONES from "../data/zones.json";

export const ASSETS = DATA.STEP_ASSETS || {};
export const PREREQ_ICONS = DATA.PREREQ_ICONS || {};
/** Mapa de fondo del hero por tema: { dark, light }. */
export const HERO_BG = DATA.HERO_BG || null;
export const BRAND_ICON = DATA.BRAND_ICON || null;
export const THEME_ICONS = DATA.THEME_ICONS || null;
export const BACKUP_ICONS = DATA.BACKUP_ICONS || null;
export const HEADER_ICONS = DATA.HEADER_ICONS || null;
export const HERO_ICONS = DATA.HERO_ICONS || null;
/** Los Dofus que da la guía antes del Silvestre: { name, img, step, achievement }. */
export const DOFUS_ROAD = DATA.DOFUS_ROAD || [];

const IMG_BASE = import.meta.env.BASE_URL + (DATA.DOFUS_IMG || "");

/** Paisaje de cada zona (.build/fetch_zone_maps.py): { img, thumb } por nombre de zona. */
export const ZONE_IMG = ZONES;

export const assetsFor = n => ASSETS[String(n)] || null;

// Absoluta a propósito: la ventana del overlay no comparte la URL base de esta página.
export const imgUrl = path => new URL(IMG_BASE + path, location.href).href;
