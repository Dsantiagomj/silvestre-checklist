// ============================================================================
// LAS CARTAS DE LA HOME — el arte de la carta de cada herramienta del sitio (TOOLS, en
// src/site/shell/shell.js, da el nombre, el orden y el enlace). Las de los Dofus son las del
// hub de Torrente Arcano (src/embeds/hub/manifest.js), copiadas: el sitio no carga embebidos.
// Las rutas de imagen son relativas a public/img/. npcFit (opcional) encuadra el PNJ: h alto,
// r derecha, t arriba, en % de la carta. Una carta sin PNJ puede llevar `crown` (varios
// huevos) en vez de `egg`, `kicker` (la píldora de arriba) y `name` (si no, el de TOOLS).
// ============================================================================
export const HOME = {
  // La imagen detrás del título, fundida hacia abajo
  bg: "zones/krosmoz.jpg",
  cards: {
    silvestre: {
      color: "#b7dc69",
      egg: "hub/dofus-silvestre.webp",
      bg: "zones/reino-de-amakna.jpg",
      npc: "hub/silvosse.png",
      lead: "Silvosse te espera al final de 100 pasos por todo el Mundo de los Doce.",
    },
    hielos: {
      color: "#9fd8f0",
      egg: "hub/dofus-hielos.webp",
      bg: "zones/isla-de-frigost.jpg",
      npc: "hub/conde-kontatras.png",
      // Su imagen es cuadrada y la figura estrecha: más grande y más a la derecha, que asome
      npcFit: { h: "70%", r: "-30%", t: "4%" },
      lead: "Descubre los misterios de la isla de Frigost en 70 pasos y enfréntate al temible Conde Kontatrás.",
    },
    nebuloso: {
      color: "#c3b1f5",
      egg: "hub/dofus-nebuloso.png",
      bg: "zones/xelorium.jpg",
      // Khelebragón, a quien libera la última misión, la del pájaro del tiempo (renderer de Ankama)
      npc: "hub/khelebragon.png",
      npcFit: { h: "72%", r: "-30%", t: "4%" },
      lead: "Recorre Anutropía, Sramvil y Xelorium en 26 pasos, con el Dofus de los Vigilantes por el camino.",
    },
    todos: {
      // Su carta lleva el nombre entero, como en el hub; el menú, «Todos los Dofus» (TOOLS)
      name: "Rush de todos los Dofus",
      color: "#e3c565",
      kicker: "200 pasos",
      bg: "zones/misiones-de-mundo.jpg",
      // Sin PNJ ni un solo huevo: la corona, el Vulbis del paso 200 en grande con los cinco
      // Dofus primordiales alrededor (el Ébano, debajo). x, y y h en % del ancho de la carta;
      // glow, el halo de cada huevo
      crown: [
        { img: "hub/dofus-esmeralda.png", glow: "#2ecd68", x: 14, y: 24, h: 22 },
        { img: "hub/dofus-purpura.png", glow: "#ba374b", x: 28, y: 10.5, h: 22 },
        { img: "hub/dofus-turquesa.png", glow: "#1fd5d5", x: 72, y: 10.5, h: 22 },
        { img: "hub/dofus-marfil.png", glow: "#ebdcb4", x: 86, y: 24, h: 22 },
        { img: "hub/dofus-ebano.png", glow: "#7d6996", x: 50, y: 51, h: 18 },
        { img: "hub/dofus-vulbis.png", glow: "#eb4623", x: 50, y: 4.5, h: 40 },
      ],
      lead: "Del Dofawa al Vulbis: 26 Dofus en una sola ruta por todo el Mundo de los Doce.",
    },
    cosecha: {
      color: "#f0a336",
      egg: "hub/dofus-ocre.png",
      bg: "zones/pueblo-de-la-canopea.jpg",
      // Otomai, el sabio de su isla: su asistente recibe las almas
      npc: "hub/otomai.png",
      npcFit: { h: "74%", r: "-40%", t: "6%" },
      lead: "Las 337 almas de la misión del Dofus Ocre, etapa por etapa.",
    },
    global: {
      color: "#d8b25a",
      // El Dofus plateado centelleante, el último de la ruta (DofusDB, icono 23027)
      egg: "hub/dofus-plateado.png",
      bg: "zones/krosmoz.jpg",
      // Meriana, la que reparte las misiones de los Dofus (renderer de Ankama)
      npc: "hub/meriana.png",
      npcFit: { h: "72%", r: "-30%", t: "4%" },
      lead: "Todo el PvE del Mundo de los Doce, del nivel 1 al 200, en el orden en que el juego lo plantea.",
    },
  },
};
