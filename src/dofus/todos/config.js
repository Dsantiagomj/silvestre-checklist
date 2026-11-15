// ============================================================================
// EL DOFUS DE ESTE CHECKLIST — todo lo que la app dice o guarda propio del Rush de todos los
// Dofus (DOFUS=todos), la guía de Sandglass para Torrente Arcano: 200 pasos y 26 Dofus por el
// camino, hasta el Dofus Vulbis del paso 200. Los datos generados por .build/ con --dofus todos
// están junto a este archivo. Sin imports: vite.config.js también lo lee.
// ============================================================================

export default {
  id: "todos",
  // El nombre del checklist, entero y la parte que se resalta en el título del hero. No es
  // el de un Dofus: la guía los da todos
  name: "Rush de todos los Dofus",
  short: "todos los Dofus",

  // index.html: el título de la pestaña, la descripción y el comentario sobre el favicon
  html: {
    title: "Rush de todos los Dofus · Checklist",
    description: "Checklist del Rush de todos los Dofus — guía de Sandglass para Torrente Arcano: 26 Dofus en 200 pasos, con sistema de progreso ponderado por esfuerzo.",
    iconNote: "El huevo del Dofus Vulbis (DofusDB, objeto 6980, icono 23004), el último del camino y el mismo de la marca",
    // Sus favicons (vite.config.js), en vez de los del Silvestre de public/: el mismo huevo,
    // y el de Apple sobre fondo oscuro con un halo dorado
    icons: {
      "favicon-32.png": "icons/favicon-32.png",
      "favicon.png": "icons/favicon.png",
      "apple-touch-icon.png": "icons/apple-touch-icon.png",
    },
  },

  texts: {
    // El título de la página: «Rush de» + «todos los Dofus» resaltado
    title: "Rush de todos los Dofus",
    titleLead: "Rush de",
    // El hero con la guía terminada
    heroEyebrow: "Guía de Sandglass",
    heroSub: "Del Dofawa al Vulbis: 26 Dofus en 200 pasos por todo el Mundo de los Doce.",
    // El título (para lectores de pantalla) de la ventana de pasos
    stepsTitle: "Los 200 pasos",
    // El pie: quién escribió la guía
    footerLead: "Guía original de los 200 pasos por",
    author: "Sandglass",
    // De quién es la guía que enlazan las misiones y los logros (null: sin guía que enlazar)
    guideSource: "Torrente Arcano",
    // Bajo el detalle del paso: el texto y sus colores son los del PDF de Sandglass
    assetNote: "Texto y resaltados de Sandglass · imágenes vía DofusDB",
    // El título de la ventana del overlay (popup)
    overlayTitle: "Todos los Dofus · Overlay",
  },

  // localStorage: las claves de la app empiezan por aquí. No hay checklist clásico en Torrente
  // Arcano (la guía es un PDF): nada que leer
  storagePrefix: "todos:",
  classicKeys: { v4: null, v3: null },
  // Versión de la guía con la que se numeran los pasos guardados
  guideVersion: 1,

  // Sin selector de bando: la guía sigue Bonta
  sides: null,

  // Sin claves de objeto que hayan cambiado
  ownedMoves: {},

  // La copia de seguridad: el id que la marca como de este checklist y el nombre del archivo
  backup: { app: "todos-checklist", file: "todos-progreso" },

  // El nombre de la ventana popup del overlay
  overlayWindow: "todos-overlay",

  // Lo que es cada icono del interruptor de tema (THEME_ICONS, .build/dofus/todos.py): los dos
  // del camino, en los pasos 168 y 178
  themeNames: { light: "Dofus Marfil", dark: "Dofus Ébano" },

  // El embebido (src/embeds/checklist/embed.jsx, npm run build:embed:todos): el <div> de la
  // página de Torrente Arcano que lo aloja, la variable CSS con lo que tapa su cabecera fija,
  // el data-* de la hoja de fuentes y el nombre en los errores
  embed: { hostId: "todos-root", topVar: "--todos-top", fonts: "todos-fonts", logName: "Checklist Todos los Dofus" },

  // Dónde se construye (vite.config.js), relativo a dist/: el sitio en dist/todos/, para no
  // pisar los demás, y el embebido junto a los otros
  build: {
    outDir: "todos",
    embed: { entry: "embed/todos.js", chunks: "embed/todos-chunks", assets: "embed/todos-assets" },
  },

  // El hero (Hero.jsx): motas del color del acento que suben, las del Nebuloso, en dorado
  hero: { fx: "nebula" },

  // La paleta (src/tools/checklist/lib/palette.js), «Oro»: la del Nebuloso girada al tono 45
  // con la misma saturación, que deja un gris tostado oscuro con acento dorado claro
  // (#f5e4b1). En el hub, la carta va en el oro de siempre (#e3c565). Mismas variables que
  // global.css, por tema; -light solo cuenta en el tema claro.
  // Contraste (WCAG): texto de los botones sobre el acento 11,5:1 en oscuro y 10,6:1 en claro;
  // el acento como texto, 16,7:1 sobre el fondo oscuro; el texto apagado, 5,9:1 sobre el fondo
  // oscuro. En claro, la tinta dorada (#7a672d) y el texto apagado (#6c6758) van más oscuros que
  // en la maqueta para pasar 4,5:1 sobre el fondo, los paneles y los huecos (4,7:1 o más)
  palette: {
    dark: {
      "--bg": "#13110b", "--bg-2": "#1b1810", "--panel": "#232015", "--panel-2": "#2c281b", "--inset": "#16140d",
      "--txt": "#f7f4ea", "--txt-soft": "#c2bba6", "--txt-mute": "#968f7a",
      "--line": "#332e20", "--line-2": "#453f2c", "--line-warm": "#60583f",
      "--terracotta": "#1b1811", "--terracotta-2": "#14120c",
      "--amber": "#f5e4b1", "--amber-2": "#e0ca86", "--gold": "#fbf1d2", "--gold-2": "#ead494",
      "--success": "#f5e4b1", "--success-2": "#e0ca86",
      "--accent-rgb": "245,228,177", "--accent-flash-rgb": "255,249,232",
      "--accent-hi": "#fbf1d2", "--accent-hl-light": "#e0c574", "--on-accent": "#302912",
      "--done": "#f0dca0", "--done-line": "#d0bb7a", "--done-light": "#c4a74f",
      "--done-ink-light": "#967e34", "--resume-ink-light": "#967e34",
      "--on-walked": "#302912",
      "--node-done-line": "#fff8e4", "--node-done-hi": "#fbefcc", "--node-done-lo": "#c8af64", "--on-node-done": "#302912",
      "--node-dofus-hi": "#78693a", "--node-dofus-lo": "#453b1c", "--on-node-dofus": "#fffae9",
      "--cta-hi": "#f5e4b1", "--cta-lo": "#c8af64", "--cta-line": "#fbf1d2", "--on-cta": "#302912",
      "--bg-rgb": "19,17,11", "--bg-light-rgb": "250,249,245", "--bg-tint-rgb": "64,55,28",
      "--shadow-light-rgb": "80,69,36", "--veil-shade-light-rgb": "90,79,46",
      "--walked": "#f7e3a6", "--walked-glow": "rgba(247,227,166,.32)",
    },
    light: {
      "--bg": "#f6f4ef", "--bg-2": "#faf9f5", "--panel": "#ffffff", "--panel-2": "#f7f5ef", "--inset": "#efece1",
      "--txt": "#1c1a12", "--txt-soft": "#585343", "--txt-mute": "#6c6758",
      "--line": "#e6e2d6", "--line-2": "#d6d1c0", "--line-warm": "#b0a88f",
      "--terracotta": "#1c1a12", "--terracotta-2": "#14120c",
      "--amber": "#f0db9c", "--amber-2": "#e2ca80", "--gold": "#f7eac3", "--gold-2": "#e2ca80",
      "--accent-ink": "#7a672d", "--gold-ink": "#7a672d",
      "--success": "#f0db9c", "--success-2": "#e2ca80",
      "--walked": "#c8aa50", "--walked-glow": "rgba(200,170,80,.3)",
    },
  },

  // El huevo de la barra: apagado hasta el paso 200, «Sueños de dragón» completo, que da el
  // Dofus Vulbis. Los otros 25 van en el camino (DOFUS_ROAD), y el Vulbis también: la guía
  // no lleva a un solo Dofus. Ninguno se convierte en él (pre). El del hero es el siguiente
  // del camino (road): se enciende al conseguirlo y deja paso al siguiente, hasta el Vulbis
  egg: { pre: null, final: 200, road: true },
  // Los Dofus del camino cuyo nombre es femenino: «¡Piñata de pino obtenida!» (paso 194)
  feminine: /^Piñata/,

  // La recomendación del PDF sobre los prerrequisitos (PREREQS_OCRE en steps.js): el Dofus
  // Ocre hace falta desde el paso 127 (OCRE_STEP), el de «El fin de la eternidad»
  prereqNote: {
    title: "Ten el Dofus Ocre antes del paso 127",
    quest: "La eterna cosecha",
    achievement: "El fin de la eternidad",
  },
  // La guía sigue Espíritu de la salvación (TEXT_FIXES de 125, 126 y 128). Sus objetos son los
  // del Silvestre en esos pasos (FROM_SILVESTRE en .build/dofus/todos.py, sus 78 y 80), que
  // solo listan los de esa orden: el aviso del Silvestre, con los pasos de aquí. No dice que
  // el 126 enlace las misiones de las otras órdenes: aquí no las enlaza. img, el PNJ del
  // estandarte del 126
  orderNote: {
    title: "La guía sigue la orden Espíritu de la salvación",
    text: "Por eso solo se listan los recursos de esa orden, en los pasos 126 y 128.",
    img: "npcs/npc-6312.png",
  },

  // La nota aclaratoria («Hasta tener que pasar X»), con el ejemplo del Silvestre en sus pasos
  // de aquí (SAME_AS en .build/dofus/todos.py: sus 43, 44 y 45): el 69 y el 70 se detienen ante
  // Kodámade; el 71 pasa la mazmorra y "se terminan las misiones de los incisos 69, 70 y 71"
  nota: {
    paused: [69, 70],
    closer: 71,
    pauseAt: { 69: 0.5, 70: 1.2 },
    checkAt: { 71: 3.6, 70: 4.3, 69: 5.0 },
    // El pie de foto del ejemplo; {boss} es el jefe del paso que cierra (Kodámade)
    caption: "Los pasos 69 y 70 se detienen ante {boss}. En el 71 se pasa la mazmorra y se terminan los tres.",
  },

  journal: {
    /**
     * Notas escritas a mano, para lo que la guía no dice: las del Silvestre en los pasos que
     * repite (SAME_AS), con sus números de aquí. En el 113 (su 64), por qué se llega hasta la
     * cerveza fuerte. En el 151 (su 87), por qué termina la misión del 121 (CLOSES).
     */
    extraNotes: {
      113: "Para empezar la misión 2, «Dos alientos, una inspiración» (paso 115), hay que llegar hasta"
        + " entregarle la cerveza fuerte a Pandawelo. «De la mano» se termina en el paso 116, con el logro completo.",
      151: "Sus dos misiones piden tener tomada «Toma de conciencia», que se hace en el paso 159, y esta pide"
        + " terminada «Las cuatro voluntades», que el paso 121 deja a medias: se termina aquí. Las dos misiones"
        + " se hacen de una en una.",
    },
    /**
     * Notas escritas a mano dentro de una misión del paso: paso -> { id de la misión: texto }.
     * En el 62 (el 38 del Silvestre), «La sombra del reino»: su nota dice que se puede hacer en
     * cualquier punto hasta antes del inciso 131.
     */
    questNotes: {
      62: { 1665: "Se puede hacer en cualquier momento antes del paso 131." },
    },
    /**
     * Misión opcional -> paso que la termina sin cerrar el suyo. Nota del 168: «Con los cuatro
     * sacrificios dropeados, se termina la misión opcional del inciso 18»: «Arma letal».
     */
    optionalDoneBy: { 1939: 168 },
    // Paradas que el texto no permite situar: las del Silvestre (su journal.stopAt) en los pasos
    // que repite (SAME_AS), donde la parada es la misma. Paso -> [misión, comienzo del objetivo
    // que va justo después de la parada]; { later, text } es una misión madre que espera a una
    // hija de otro paso (closingPlan en store.js). El comentario dice de qué paso del Silvestre
    // viene cada una. Fuera quedan su 15 (aquí el 166 para antes, al volver con Capitán Meno) y
    // su 90 (aquí el 157 no toma «El peso de su mirada»: la lleva el 158)
    stopAt: {
      // 7: "te pedirá dropear 1 x sacrificio de 4 zonas diferentes"
      18: [["Arma letal", "Sacrifica a armadutinados para la muñeca de necrónix"]],
      // 10: "El hueso de hierro se consigue venciendo al Maxilubo en su mazmorra"
      23: [["Encender la mecha", "Consigue un hueso de hierro"]],
      // 25: "tienes que pasar toda la mazmorra del Morsagüino Real"
      46: [["Los cazadores", "Registra la caverna en busca de Gerard"]],
      // 26: la leleche cae de las mamagüinas del bosque de los pinos perdidos
      47: [["El recadero", "Encuentra y lleva a Mac Friguer 4 unidades de leleche de mamagüina"]],
      // 27: los pelos de kaniglú para las herramientas y las mamagüinas, luchando en la zona
      48: [["Star ski y Dutch", "Entrégale a Ross Iñol: 1 x Cepillo para encerar"],
        ["La marcha de la emperatriz", "Entrégale a Ken Tucky: 1 x Mamagüina"]],
      // 28: "Hasta tener que dropear grasas de güino": aquí no se resuelve en el paso (lo cierra
      // el 51), así que solo la parada de la grasa
      50: [["Pesca en aguas congeladas", "Entrégale a Damar: 50 x Grasa de güino"]],
      // 36: "tendrás que realizar la mazmorra hasta el final"
      59: [["Venganza por procuración", "Arráncale la abrakllota ancestral al Abráknido Ancestral"]],
      // 32: "te pide vencer tanto al Dragocerdo como al Roble Blando"
      61: [["Dragones y chapuzonas", "Vence a 1 x Roble Blando en un solo combate"]],
      // 38: "vencer a 7 x Monstruos de cada tipo de la zona de la Cuna de Alma". La bendición de
      // Viti la da «La bendición de Viti», del paso 64 (la termina el 74)
      62: [["La bruja mala del Este", "Vence 7 x Harpirata"],
        ["La bruja mala del Este", "Obtén la bendición de Viti",
          { later: true, text: "Hasta obtener la bendición de Viti: la da «La bendición de Viti», en el paso 64" }]],
      // 39: Funoroshi va el último de los tres combates (OBJECTIVE_ORDER)
      64: [["La bendición de Viti", "Vence a 1 x Funoroshi"]],
      // 43: las esporas y el mildiu caen de los monstruos de Plantala
      69: [["El sauce del paseante", "Entrégale a Surivitna: 5 x Esporas soporíferas"],
        ["Inmunda putrefacción", "Entrégale a Fhang: 20 x Mildiu de Pandala"]],
      // 47: "tienes que entrar a la mazmorra y llegar a la sala 4"
      73: [["Una nueva lección que enseñar", "Descubre el mapa: Trastero del Taller de Tanukui San"]],
      // 50: Sfinter Cell va el último de los cuatro combates (OBJECTIVE_ORDER)
      76: [["La bendición de Thomahon", "Vence a 1 x Sfinter Cell"]],
      // 51: "lo primero que tienes que hacer es pasar la mazmorra Sfinter Cell para dropear una Bandana"
      77: [["Objetivo: Bandana", "Encuentra la bandana de Tugtora"]],
      // 54: "Hasta tener que pasar Kumijo": el combate es demostrarle tu fuerza a la kitsu
      84: [["Cuando se caldean las ánimas", "Capta la atención de la kitsu de nueve colas"]],
      // 58: Kanígrula y Cil van tras Perfósil
      92: [["La bendición de Foluk", "Vence a 1 x Kanígrula"]],
      // 59: "tienes que pasar la mazmorra de Kanígrula y vencer a la jefa"
      94: [["La triquiñuela del cuerno", "Consigue grasa mamaria de kanig"]],
      // 61: "Hasta tener que pasar Cil": el combate de la mazmorra, no el mapa de su entrada
      98: [["Un frío que hiela las piedras", "Vence a 1 x Cil"]],
      // 63: "farmear Tejaiss hasta dropear 10 de esos corazones"
      101: [["Misión solución", "Entrégale a Marta Angaha: 10 x Corazón de tejaiss"]],
      // 64: la misión 2 (paso 115) pide «De la mano» pasada la entrega de la cerveza fuerte
      113: [["De la mano", "Habla con la diosa Pandawa a través de Pandawelo"]],
      // 65: "tienes que dropear 3 x Gota de tinta indeleble" (monstruos del Reino de Papel)
      114: [["Tinta espectacular", "Enséñale a Cigrulla teatral: 3 x Gota de tinta indeleble"]],
      // 68: los trozos del pergamino caen de los monstruos de tinta y de papel
      117: [["La última muralla", "Encuentra los 3 trozos del pergamino olvidado"]],
      // 72: los kianzhi caen de los monstruos de Wuking y Wukang
      120: [["Una última voluntad", "Entrégale a Namuna: 1 x Kianzhi de la lanza del wukin"]],
      // 73: "tienes que terminar el logro La guerra interminable" (y los otros tres)
      121: [["Las cuatro voluntades", "Impide que Guerra tome el Krosmoz a sangre y fuego"]],
      // 77: "Debes pasar primero Kimbo… Ahora deberás pasar Roble Blando… Por último… Ugah"
      125: [["Santísimo poder", "Vence a 1 x Roble Blando en un solo combate"]],
      // 80: «Alma máster» vence a Ugah y la orden 4 pide la estatuilla del Templo del Gran Ugah
      128: [["Alma máster", "Vence a 1 x Ugah"], ["Aprendizaje: Maestro de los Pergaminos", "Encuentra la estatuilla de Sumens"]],
      // 85: "Hasta tener que pasar Ilyzaelle": su combate, no el mapa de su mirador
      149: [["Inclemencias", "Vence a 1 x Ilyzaelle"]],
      // 86: "matar 10 x Monstruos de cada tipo de la zona de Ilyzaelle"
      150: [["La guardia muere, pero no se rinde", "Vence 10 x Ectórrido"]],
      // 87: "tienes que vencer a Ilyzaelle en su mazmorra ya que es la única que suelta ese drop"
      151: [["El juicio de la Muerte", "Entrégale a Maestro Cuerbok: 1 x Fuego devorador"]],
      // 90: "debes recuperar 1 x Sueño de armonía… intensidad Sueño 3 o más". Aquí la misión va
      // en su propio paso
      158: [["El peso de su mirada", "Arroja un sueño de armonía al pozo demoníaco"]],
      // 91: "debes hacer sueños infinitos hasta dropear 1 x Sueño relajante"
      159: [["Toma de conciencia", "Duerme la desconfianza del guardián"]],
      // 92: «Un legado atormentado» no fabrica la runa de armonía sin el tótem del equilibrio,
      // que da «Los tótems de Maimane» al terminarla (en el 168): la termina el 169
      161: [["Un legado atormentado", "Fabrica 1 Runa de armonía", { later: true }],
        ["Los tótems de Maimane", "Entrégale a Maimane: 1 x Tótem de alegría"]],
    },
  },
};
