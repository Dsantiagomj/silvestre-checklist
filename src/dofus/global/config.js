// ============================================================================
// LA GUÍA GLOBAL — todo lo que la app dice o guarda propio de la guía de progresión PvE
// (DOFUS=global). No sigue una guía de Torrente Arcano: los pasos se generan desde DofusDB
// (.build/global). Sin imports: vite.config.js también lo lee.
// ============================================================================

import JOURNAL from "./journal.js";

export default {
  id: "global",
  // No hay un Dofus al final: el nombre es el de la guía
  name: "Guía global",
  short: "Global",

  html: {
    title: "Guía global · Checklist",
    description: "Checklist de progresión PvE de Dofus — todo el contenido permanente del juego, del nivel 1 al 200, en el orden en que el juego lo plantea.",
    iconNote: "Sin icono propio todavía: usa los favicons del sitio",
  },

  texts: {
    title: "Guía global de progresión",
    titleLead: "Guía global de",
    heroEyebrow: "Todo el PvE, a su nivel",
    heroSub: "Recorre el Mundo de los Doce del nivel 1 al 200 sin repetir una mazmorra: misiones, mazmorras, farmeos y logros, en el orden en que el juego los plantea.",
    stepsTitle: "Los pasos de la guía global",
    footerLead: "Orden generado desde los datos de",
    author: "DofusDB",
    // Sin guía externa que enlazar: los nombres de las misiones no son enlaces
    guideSource: null,
    assetNote: "Datos e imágenes vía DofusDB",
    overlayTitle: "Guía global · Overlay",
  },

  // localStorage: sin checklist clásico que importar
  storagePrefix: "global:",
  classicKeys: { v4: null, v3: null },
  guideVersion: 1,

  backup: { app: "global-checklist", file: "global-progreso" },
  overlayWindow: "global-overlay",

  themeNames: { light: "Tema claro", dark: "Tema oscuro" },

  // El embebido, si algún día se publica fuera del sitio
  embed: { hostId: "global-root", topVar: "--global-top", fonts: "global-fonts", logName: "Checklist Global" },

  build: {
    outDir: "global",
    embed: { entry: "embed/global.js", chunks: "embed/global-chunks", assets: "embed/global-assets" },
  },

  // Sin huevo al final: no hay un Dofus que termine la guía
  egg: { pre: null, final: null },
  feminine: null,
  prereqNote: null,

  // Sin nota de las pausas: la guía no usa «hasta tener que pasar X»
  nota: null,

  journal: {
    extraNotes: {},
    questNotes: {},
    optionalDoneBy: {},
    // Generado: paso -> [misión, comienzo del objetivo que va justo después de la parada]
    stopAt: JOURNAL.stopAt,
  },
};
