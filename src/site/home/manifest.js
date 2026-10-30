// ============================================================================
// LAS CARTAS DE LA HOME — el arte de la carta de cada herramienta del sitio (TOOLS, en
// src/site/shell/shell.js, da el nombre, el orden y el enlace). Las de los Dofus son las del
// hub de Torrente Arcano (src/embeds/hub/manifest.js), copiadas: el sitio no carga embebidos.
// Las rutas de imagen son relativas a public/img/. npcFit (opcional) encuadra el PNJ: h alto,
// r derecha, t arriba, en % de la carta.
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
