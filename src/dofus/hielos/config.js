// ============================================================================
// EL DOFUS DE ESTE CHECKLIST — todo lo que la app dice o guarda propio del Dofus de los
// Hielos (DOFUS=hielos). Los datos generados por .build/ con --dofus hielos están junto a
// este archivo. Sin imports: vite.config.js también lo lee.
// ============================================================================

const LEFT = "La guía no la retoma: para el Dofus de los Hielos basta con tenerla tomada.";

export default {
  id: "hielos",
  // El nombre del Dofus, entero y la parte que se resalta en el título del hero
  name: "Dofus de los Hielos",
  short: "Hielos",

  // index.html: el título de la pestaña, la descripción y el comentario sobre el favicon
  html: {
    title: "Dofus de los Hielos · Checklist",
    description: "Checklist del Dofus de los Hielos — guía de Torrente Arcano con sistema de progreso ponderado por esfuerzo.",
    iconNote: "El huevo del Dofus de los Hielos (DofusDB, objeto 7043, icono 23005), el mismo de la marca",
    // Sus favicons (vite.config.js), en vez de los del Silvestre de public/: el mismo huevo,
    // y el de Apple sobre fondo oscuro con un halo helado
    icons: {
      "favicon-32.png": "icons/favicon-32.png",
      "favicon.png": "icons/favicon.png",
      "apple-touch-icon.png": "icons/apple-touch-icon.png",
    },
  },

  texts: {
    // El título de la página: «Checklist del Dofus» + el nombre corto resaltado
    title: "Checklist del Dofus de los Hielos",
    titleLead: "Checklist del Dofus de los",
    // El hero con la guía terminada
    heroEyebrow: "Guía de Torrente Arcano",
    // El del hub de los checklists (src/embeds/hub/manifest.js)
    heroSub: "Descubre los misterios de la isla de Frigost en 70 pasos y enfréntate al temible Conde Kontatrás.",
    // El título (para lectores de pantalla) de la ventana de pasos
    stepsTitle: "Los 70 pasos",
    // El pie: quién escribió la guía
    footerLead: "Guía original de los 70 pasos por",
    author: "Torrente Arcano",
    // De quién es la guía que enlazan las misiones y los logros (null: sin guía que enlazar)
    guideSource: "Torrente Arcano",
    // Bajo el detalle del paso
    assetNote: "Texto y resaltados de Torrente Arcano · imágenes vía DofusDB",
    // El título de la ventana del overlay (popup)
    overlayTitle: "Hielos · Overlay",
  },

  // localStorage: las claves de la app empiezan por aquí. El checklist clásico de Torrente
  // Arcano (solo se lee): «dofus_hielos_clean_v2»; no tiene una versión anterior de la guía
  storagePrefix: "hielos:",
  classicKeys: { v4: "dofus_hielos_clean_v2", v3: null },
  // Versión de la guía con la que se numeran los pasos guardados
  guideVersion: 1,

  // Sin misiones de alineamiento: ningún selector de bando
  sides: null,

  // La copia de seguridad: el id que la marca como de este checklist y el nombre del archivo
  backup: { app: "hielos-checklist", file: "hielos-progreso" },

  // El nombre de la ventana popup del overlay
  overlayWindow: "hielos-overlay",

  // Lo que es cada icono del interruptor de tema (THEME_ICONS, .build/dofus/hielos.py): la
  // guía no da otro Dofus que los represente, así que dos cosas de Frigost
  themeNames: { light: "Copo de nieve", dark: "Kama de hielo" },

  // El embebido (src/embeds/checklist/embed.jsx, npm run build:embed:hielos): el <div> de la página de
  // Torrente Arcano que lo aloja (checklist-dofus-de-los-hielos), la variable CSS con lo que
  // tapa su cabecera fija, el data-* de la hoja de fuentes y el nombre en los errores
  embed: { hostId: "hielos-root", topVar: "--hielos-top", fonts: "hielos-fonts", logName: "Checklist Hielos" },

  // Dónde se construye (vite.config.js), relativo a dist/: el sitio en dist/hielos/, para no
  // pisar el del Silvestre, y el embebido junto a los demás
  build: {
    outDir: "hielos",
    embed: { entry: "embed/hielos.js", chunks: "embed/hielos-chunks", assets: "embed/hielos-assets" },
  },

  // El hero (Hero.jsx): copos de nieve en vez de luciérnagas y hojas (fx). El Silvestre no
  // lleva hero: el suyo es el de siempre
  hero: { fx: "snow" },

  // La paleta (src/tools/checklist/lib/palette.js): la del Silvestre es carbón verdoso con acento lima; la del
  // Hielos, gris azulado frío con acento azul hielo (#9fd8f0, el color del Hielos en el hub).
  // Mismas variables que global.css, por tema; -light solo cuenta en el tema claro. Lo
  // hecho también va en azul hielo; el rojo de las paradas y el ámbar siguen igual.
  // Contraste (WCAG): texto de los botones sobre el acento 11,0:1 en oscuro y 9,0:1 en
  // claro; el acento como texto, 12,5:1 sobre el fondo oscuro y 7,3:1 (#1b5c7d) sobre blanco
  palette: {
    dark: {
      "--bg": "#0b0e12", "--bg-2": "#10141a", "--panel": "#151b22", "--panel-2": "#1b232c", "--inset": "#0d1116",
      "--txt": "#e9f0f5", "--txt-soft": "#9fb0bd", "--txt-mute": "#66788a",
      "--line": "#1f2a33", "--line-2": "#2b3a46", "--line-warm": "#3a4f5e",
      "--terracotta": "#10151a", "--terracotta-2": "#0b0f13",
      "--amber": "#9fd8f0", "--amber-2": "#6fb8da", "--gold": "#c8ecfa", "--gold-2": "#86c6e3",
      "--success": "#9fd8f0", "--success-2": "#6fb8da",
      "--accent-rgb": "159,216,240", "--accent-flash-rgb": "225,246,255",
      "--accent-hi": "#c8ecfa", "--accent-hl-light": "#6cc0e4", "--on-accent": "#0a1e2a",
      "--done": "#7cc8ea", "--done-line": "#5fa6c6", "--done-light": "#2f7fa6",
      "--done-ink-light": "#1d5f80", "--resume-ink-light": "#1d5f80",
      "--on-walked": "#0a1e2a",
      "--node-done-line": "#d4f1fd", "--node-done-hi": "#bfe9fb", "--node-done-lo": "#4f9bc4", "--on-node-done": "#0a1e2a",
      "--node-dofus-hi": "#2f5f78", "--node-dofus-lo": "#173547", "--on-node-dofus": "#e3f5fd",
      "--cta-hi": "#9fd8f0", "--cta-lo": "#4f9bc4", "--cta-line": "#c8ecfa", "--on-cta": "#0a1e2a",
      "--bg-rgb": "11,14,18", "--bg-light-rgb": "245,248,250", "--bg-tint-rgb": "20,40,60",
      "--shadow-light-rgb": "30,50,70", "--veil-shade-light-rgb": "40,60,80",
      "--walked": "#8fd6f5", "--walked-glow": "rgba(143,214,245,.32)",
    },
    light: {
      "--bg": "#edf2f6", "--bg-2": "#f5f8fa", "--panel": "#ffffff", "--panel-2": "#eef3f7", "--inset": "#e1e9ef",
      "--txt": "#10171d", "--txt-soft": "#41525f", "--txt-mute": "#6a7b88",
      "--line": "#d2dde5", "--line-2": "#bccbd6", "--line-warm": "#8ea3b3",
      "--terracotta": "#10171d", "--terracotta-2": "#0b1015",
      "--amber": "#7ec6e6", "--amber-2": "#5fb0d6", "--gold": "#a9dcf1", "--gold-2": "#5fb0d6",
      "--accent-ink": "#1b5c7d", "--gold-ink": "#1b5c7d",
      "--success": "#7ec6e6", "--success-2": "#5fb0d6",
      "--walked": "#2f86b5", "--walked-glow": "rgba(47,134,181,.3)",
    },
  },

  // El huevo del hero y de la barra: apagado hasta el paso 69, donde Jiva da el Dofus. No
  // hay ningún Dofus antes que se convierta en él (pre)
  egg: { pre: null, final: 69 },
  feminine: null,

  // Sin recomendación aparte sobre los prerrequisitos
  prereqNote: null,

  // La nota aclaratoria («Hasta tener que pasar X»), con un ejemplo real: el 8 se detiene
  // ante el Morsagüino Real y el 12 lo deja «hasta que te pida pasar la mazmorra del
  // Morsagüino Real»; el 13 pasa la mazmorra y «se terminan las etapas 12 y 13» (y la del 8)
  nota: {
    paused: [8, 12],
    closer: 13,
    pauseAt: { 8: 0.5, 12: 1.2 },
    checkAt: { 13: 3.6, 12: 4.3, 8: 5.0 },
    // El pie de foto del ejemplo; {boss} es el jefe del paso que cierra (Morsagüino Real)
    caption: "Los pasos 8 y 12 se detienen ante el {boss}. En el 13 se pasa la mazmorra y se terminan los tres.",
  },

  journal: {
    /**
     * Notas escritas a mano, para lo que la guía no dice. El 9 y el 25 no tienen parada: sus
     * misiones las termina otro paso y aquí se dice hasta dónde llegar. El 13, el 62, el 66 y
     * el 68 terminan una misión que su texto no nombra (CLOSES en .build/dofus/hielos.py). El
     * 58 toma «Al maestro, cuchillada», que la guía no nombra (STEP_EXTRA).
     */
    extraNotes: {
      9: "Sus misiones las termina el paso 12, con las leleches de mamagüina y las grasas: aquí se llega"
        + " hasta tener que llevarle a Mac Friguer 4 unidades de leleche de mamagüina («El recadero»).",
      13: "También termina «Los cazadores» (paso 8), que para ante el Morsagüino Real.",
      25: "Se llega hasta recorrer el Hipogeo del Obsidiantre en busca de los restos de Javi Vito: la misión"
        + " la termina el paso 26, al pasar la mazmorra del Obsidiantre.",
      58: "«Al maestro, cuchillada» no la nombra la guía, pero la piden «Un conde con mucho cuento» (paso 68)"
        + " y «El dofus de los hielos» (paso 69): hay que tomarla con André Davul, en los Jardines Invernales,"
        + " antes de vencer a Nileza. Sigue con Sylargh (paso 60) y Klim (paso 61) y se termina con Mizz Frizz"
        + " en el paso 62.",
      62: "También termina «La vida de castillo» (paso 50): su último objetivo es deshacer los planes de Mizz Frizz.",
      66: "También termina «Los últimos supervivientes» (paso 53), que acaba con «Crisis de Ex - Emma».",
      68: "También termina «Una friolera de revelaciones» (pasos 63 y 64), que para ante el Conde Kontatrás.",
    },
    /**
     * Notas dentro de una misión del paso: paso -> { id de la misión: texto }. Las de solo
     * tomarla que la guía no retoma: «Luces y sombras» y «Los caminantes blancos» (nada de
     * la ruta las pide terminadas; la segunda, en curso: Qa=1331).
     */
    questNotes: {
      14: { 1286: LEFT },
      67: { 1331: LEFT },
    },
    optionalDoneBy: {},
    // Paradas que el texto no permite situar. Paso -> [misión, comienzo del objetivo que va
    // justo después de la parada], de los objetivos de DofusDB y la guía de cada misión en
    // Torrente Arcano. Las de «Agricultura o alquimia» paran al empezar su fila: el paso
    // solo la toma y lo que pide se entrega más adelante
    stopAt: {
      3: [["Recolección en los campos de hielo", "Entrégale a"]],
      7: [["Recolección en el Bosque de los Pinos Perdidos", "Entrégale a"]],
      10: [["Recolección en el lago helado", "Entrégale a"]],
      19: [["Recolección en La Cuna de Alma", "Entrégale a"]],
      22: [["Recolección en Las Lágrimas de Uronigrido", "Entrégale a"]],
      24: [["Recolección en el Hipogeo del Obsidiantre", "Entrégale a"]],
      27: [["Recolección en la grieta Bú", "Entrégale a"]],
      31: [["Recolección en el Bosque Petrificado", "Entrégale a"]],
      38: [["Recolección en Los Colmillos de Cristal", "Entrégale a"]],
      42: [["Recolección en el monte Tórrido", "Entrégale a"]],
      // "Avanza hasta tener que pasar Morsagüino Real": la caverna de Gerard es su mazmorra
      8: [["Los cazadores", "Registra la caverna en busca de Gerard"]],
      // "hasta tener que dropear Mamagüinas"
      11: [["La marcha de la emperatriz", "Entrégale a Ken Tucky: 1 x Mamagüina"]],
      // El rojo es dónde se retoma ("hasta tener que farmear grasa de güino"); el verde deja
      // la parada nueva ante el Morsagüino Real
      12: [["Pesca en aguas congeladas", "Entrégale a Damar: 50 x Grasa de güino"]],
      // "hasta tener que descubrir la entrada de la Caverna del Destino"
      18: [["¡Maldición!", "Descubre el mapa: Entrada de la Caverna del Destino"]],
      // "hasta que te diga «Descubre cuál es la secta activa de El Pueblo Sepultado»"
      33: [["Misión solución", "Descubre cuál es la secta activa de El Pueblo Sepultado"]],
      // "hasta hablar con Pochi Rococotte en el Hipogeo del Obsidiantre"
      34: [["Almacén de avituallamiento", "Obtén la ayuda de los profetas del SLIP"]],
      // "hasta que Marta Angaha te pida 10 Corazón de tejaiss"
      36: [["Misión solución", "Entrégale a Marta Angaha: 10 x Corazón de tejaiss"]],
      // "hasta que te diga «Busca el cadáver de Francís en los Colmillos de Cristal»"
      39: [["Un amigo que te quiere... porque algo quiere", "Busca el cadáver de Francís en los Colmillos de Cristal"]],
      // "hasta tener que dropear las válvulas, cueros y cascos"
      49: [["Frío... caliente... ¡que te quemas!", "Entrégale a Marvin Liminsqui: 3 x Válvula hermética de güinórdido"]],
      // "hasta «Demuestra que eres un soldado de patrulla concienzudo»"
      50: [["La vida de castillo", "Demuestra que eres un soldado de patrulla concienzudo"]],
      // "hasta tener que luchar contra 5 monstruos de cada tipo y de cada zona"
      52: [["La guerra fría", "Vence 5 x Cuereñor"]],
      // "hasta tener que hablar con Darwin, Karla, Mina y Valero"
      53: [["Los últimos supervivientes", "Ve a ver a Darwin Chester"]],
      // El rojo es dónde se retoma: "hasta tener que farmear 5 monstruos para dropear cenizas"
      54: [["Vacuna vital", "Entrégale a Eric Azaraille: 5 x Residuo de alquimilusionista"]],
      // "hasta tener que ver a Nileza"
      55: [["Frío... caliente... ¡que te quemas!", "Ve a ver a Nileza"]],
      // "hasta tener que registrar el Transportador de Sylargh en busca de una pista"
      56: [["Los planes de Sylargh", "Registra el Transportador de Sylargh en busca de una pista"]],
      // El rojo es dónde se retoma. «Al maestro, cuchillada» para tras Nileza: Sylargh, Klim y
      // Mizz Frizz se pasan en los pasos 60, 61 y 62, que la termina
      58: [["Más allá de la muralla", "Busca pistas sobre el paso del Juan Nieve en el Laboratorio de Nileza"],
        ["Al maestro, cuchillada", "Vence a 1 x Sylargh",
          { later: true, text: "Hasta vencer a Nileza: Sylargh, Klim y Mizz Frizz se pasan en los pasos 60, 61 y 62" }]],
      // "hasta que te diga que registres la Torre de la Clepsidra en busca de Emma Haskulada"
      59: [["Crisis de Ex - Emma", "Registra la torre de la clepsidra en busca de Emma Haskulada"]],
      // "hasta que te pida encontrar el antiguo emplazamiento de explotación de tarudio"
      63: [["Una friolera de revelaciones", "Encuentra el antiguo emplazamiento de explotación de tarudio"]],
      // "hasta tener que vencer al Conde Kontatrás"
      64: [["Una friolera de revelaciones", "Vence a 1 x Conde Kontatrás"]],
      // El rojo es dónde se retoma: la Piedra de Otro Tiempo la suelta Esmígol
      65: [["La máquina de desmontar el tiempo", "Entrégale a Henual: 1 x Piedra de Otro Tiempo"]],
      // "hasta tener que capturar al Conde Kontatrás"
      67: [["Se busca: conde Kontatrás", "Vence a 1 x Conde Kontatrás"]],
    },
  },
};
