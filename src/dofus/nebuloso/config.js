// ============================================================================
// EL DOFUS DE ESTE CHECKLIST — todo lo que la app dice o guarda propio del Dofus Nebuloso
// (DOFUS=nebuloso). Los datos generados por .build/ con --dofus nebuloso están junto a este
// archivo. Sin imports: vite.config.js también lo lee.
// ============================================================================

export default {
  id: "nebuloso",
  // El nombre del Dofus, entero y la parte que se resalta en el título del hero
  name: "Dofus Nebuloso",
  short: "Nebuloso",

  // index.html: el título de la pestaña, la descripción y el comentario sobre el favicon
  html: {
    title: "Dofus Nebuloso · Checklist",
    description: "Checklist del Dofus Nebuloso — guía de Torrente Arcano con sistema de progreso ponderado por esfuerzo.",
    iconNote: "El huevo del Dofus Nebuloso (DofusDB, objeto 8698, icono 23016), el mismo de la marca",
    // Sus favicons (vite.config.js), en vez de los del Silvestre de public/: el mismo huevo,
    // y el de Apple sobre fondo oscuro con un halo violeta
    icons: {
      "favicon-32.png": "icons/favicon-32.png",
      "favicon.png": "icons/favicon.png",
      "apple-touch-icon.png": "icons/apple-touch-icon.png",
    },
  },

  texts: {
    // El título de la página: «Checklist del» + el nombre corto resaltado
    title: "Checklist del Dofus Nebuloso",
    titleLead: "Checklist del Dofus",
    // El hero con la guía terminada
    heroEyebrow: "Guía de Torrente Arcano",
    // El del hub de los checklists (src/embeds/hub/manifest.js)
    heroSub: "Recorre Anutropía, Sramvil y Xelorium en 26 pasos, con el Dofus de los Vigilantes por el camino.",
    // El título (para lectores de pantalla) de la ventana de pasos
    stepsTitle: "Los 26 pasos",
    // El pie: quién escribió la guía
    footerLead: "Guía original de los 26 pasos por",
    author: "Torrente Arcano",
    // De quién es la guía que enlazan las misiones y los logros (null: sin guía que enlazar)
    guideSource: "Torrente Arcano",
    // Bajo el detalle del paso
    assetNote: "Texto y resaltados de Torrente Arcano · imágenes vía DofusDB",
    // El título de la ventana del overlay (popup)
    overlayTitle: "Nebuloso · Overlay",
  },

  // localStorage: las claves de la app empiezan por aquí. El checklist clásico de Torrente
  // Arcano (solo se lee): «dofus_nebuloso_clean_v1»; no tiene una versión anterior de la guía
  storagePrefix: "nebuloso:",
  classicKeys: { v4: "dofus_nebuloso_clean_v1", v3: null },
  // Versión de la guía con la que se numeran los pasos guardados
  guideVersion: 1,

  // Sin misiones de alineamiento: ningún selector de bando
  sides: null,

  // Sin claves de objeto que hayan cambiado
  ownedMoves: {},

  // La copia de seguridad: el id que la marca como de este checklist y el nombre del archivo
  backup: { app: "nebuloso-checklist", file: "nebuloso-progreso" },

  // El nombre de la ventana popup del overlay
  overlayWindow: "nebuloso-overlay",

  // Lo que es cada icono del interruptor de tema (THEME_ICONS, .build/dofus/nebuloso.py): el
  // Dofus de los Vigilantes, que la guía da por el camino, y el propio Nebuloso
  themeNames: { light: "Dofus de los Vigilantes", dark: "Dofus Nebuloso" },

  // El embebido (src/embeds/checklist/embed.jsx, npm run build:embed:nebuloso): el <div> de la
  // página de Torrente Arcano que lo aloja (checklist-nebuloso), la variable CSS con lo que tapa
  // su cabecera fija, el data-* de la hoja de fuentes y el nombre en los errores
  embed: { hostId: "nebuloso-root", topVar: "--nebuloso-top", fonts: "nebuloso-fonts", logName: "Checklist Nebuloso" },

  // Dónde se construye (vite.config.js), relativo a dist/: el sitio en dist/nebuloso/, para no
  // pisar los demás, y el embebido junto a los otros
  build: {
    outDir: "nebuloso",
    embed: { entry: "embed/nebuloso.js", chunks: "embed/nebuloso-chunks", assets: "embed/nebuloso-assets" },
  },

  // El hero (Hero.jsx): motas de nebulosa del color del acento en los dos temas (fx), en vez
  // de las luciérnagas y hojas del Silvestre
  hero: { fx: "nebula" },

  // La paleta (src/tools/checklist/lib/palette.js), de los colores del huevo: gris violáceo
  // oscuro con acento lavanda (#c3b1f5, el halo del Nebuloso; también su color en el hub).
  // Mismas variables que global.css, por tema; -light solo cuenta en el tema claro. Lo hecho
  // también va en lavanda; el rojo de las paradas y el ámbar siguen igual.
  // Contraste (WCAG): texto de los botones sobre el acento 9,3:1 en oscuro y 7,6:1 en claro;
  // el acento como texto, 10,2:1 sobre el fondo oscuro y 8,7:1 (#4f3a9c) sobre blanco; el
  // texto apagado, 4,8:1 sobre el fondo oscuro y 5,0:1 sobre blanco
  palette: {
    dark: {
      "--bg": "#0d0b13", "--bg-2": "#13101b", "--panel": "#191523", "--panel-2": "#201b2c", "--inset": "#0f0d16",
      "--txt": "#efeaf7", "--txt-soft": "#b0a6c2", "--txt-mute": "#827a96",
      "--line": "#262033", "--line-2": "#342c45", "--line-warm": "#4a3f60",
      "--terracotta": "#14111b", "--terracotta-2": "#0e0c14",
      "--amber": "#c3b1f5", "--amber-2": "#9d86e0", "--gold": "#ddd2fb", "--gold-2": "#a994ea",
      "--success": "#c3b1f5", "--success-2": "#9d86e0",
      "--accent-rgb": "195,177,245", "--accent-flash-rgb": "238,232,255",
      "--accent-hi": "#ddd2fb", "--accent-hl-light": "#8f74e0", "--on-accent": "#1a1230",
      "--done": "#b3a0f0", "--done-line": "#8f7ad0", "--done-light": "#6a4fc4",
      "--done-ink-light": "#4b3496", "--resume-ink-light": "#4b3496",
      "--on-walked": "#1a1230",
      "--node-done-line": "#ebe4ff", "--node-done-hi": "#d8ccfb", "--node-done-lo": "#7d64c8", "--on-node-done": "#1a1230",
      "--node-dofus-hi": "#4a3a78", "--node-dofus-lo": "#261c45", "--on-node-dofus": "#efe9ff",
      "--cta-hi": "#c3b1f5", "--cta-lo": "#7d64c8", "--cta-line": "#ddd2fb", "--on-cta": "#1a1230",
      "--bg-rgb": "13,11,19", "--bg-light-rgb": "247,245,250", "--bg-tint-rgb": "40,28,64",
      "--shadow-light-rgb": "50,36,80", "--veil-shade-light-rgb": "60,46,90",
      "--walked": "#b9a6f7", "--walked-glow": "rgba(185,166,247,.32)",
    },
    light: {
      "--bg": "#f1eff6", "--bg-2": "#f7f5fa", "--panel": "#ffffff", "--panel-2": "#f2eff7", "--inset": "#e6e1ef",
      "--txt": "#15121c", "--txt-soft": "#4a4358", "--txt-mute": "#736b84",
      "--line": "#dcd6e6", "--line-2": "#c8c0d6", "--line-warm": "#9a8fb0",
      "--terracotta": "#15121c", "--terracotta-2": "#0e0c14",
      "--amber": "#b19cf0", "--amber-2": "#9580e2", "--gold": "#d0c3f7", "--gold-2": "#9580e2",
      "--accent-ink": "#4f3a9c", "--gold-ink": "#4f3a9c",
      "--success": "#b19cf0", "--success-2": "#9580e2",
      "--walked": "#6a50c8", "--walked-glow": "rgba(106,80,200,.3)",
    },
  },

  // El huevo del hero y de la barra: apagado hasta el paso 26, «El sueño de otro mundo», que
  // da el Dofus Nebuloso. El Dofus de los Vigilantes (paso 4) va en el camino, no se
  // convierte en él (pre)
  egg: { pre: null, final: 26 },
  feminine: null,

  // Sin recomendación aparte sobre los prerrequisitos ni orden de alineamiento que elegir
  prereqNote: null,
  orderNote: null,

  // La nota aclaratoria («Hasta tener que pasar X»), con un ejemplo real: el 8 se detiene
  // ante el Rey Nidas («hasta tener que pasar la mazmorra del Rey Nidas»); el 9 llega hasta
  // él con su misión, pasa la mazmorra y «completa las etapas 8 y 9»
  nota: {
    paused: [8],
    closer: 9,
    pauseAt: { 8: 0.5 },
    checkAt: { 9: 3.6, 8: 4.3 },
    // El pie de foto del ejemplo; {boss} es el jefe del paso que cierra (Rey Nidas)
    caption: "El paso 8 se detiene ante el {boss}. En el 9 se pasa su mazmorra y se terminan los dos.",
  },

  journal: {
    /**
     * Notas escritas a mano, para lo que la guía no dice. El 8 y el 22 nombran solo la
     * misión 4 de su logro, que pide terminadas las anteriores (STEP_EXTRA en
     * .build/dofus/nebuloso.py).
     */
    extraNotes: {
      8: "Para llegar a la misión 4 hay que hacer antes las misiones 1 a 3 del logro «El rey y yo»: cada una"
        + " empieza al terminar la anterior. El paso 10 completa el logro.",
      22: "Para llegar a la misión 4 hay que hacer antes las misiones 1 a 3 del logro «El pozo del loco»: cada"
        + " una empieza al terminar la anterior.",
    },
    questNotes: {},
    optionalDoneBy: {},
    // Paradas que el texto no permite situar. Paso -> [misión, comienzo del objetivo que va
    // justo después de la parada], de los objetivos de DofusDB. Las tres de «avanzar
    // pasivamente» paran al tomar la misión: lo único que piden es entregar lo que se
    // dropea por el camino
    stopAt: {
      // "Avanza hasta que te pida entregar muestras de sangre"
      7: [["Muestreo", "Entrégale a Doctor Boing Boing"]],
      // "Avanza hasta que te pida entregar Jugo tóxico de necrótico"
      14: [["Ponzoña que ponzoña", "Entrégale a Gladis"]],
      // "Avanza hasta que te pida entregar krosmorbes"
      20: [["Los ladrones de colores", "Entrégale a Cabo Ral Jart: 4 x Krosmorbe naranja"]],
    },
  },
};
