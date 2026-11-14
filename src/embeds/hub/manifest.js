// ============================================================================
// LOS CHECKLISTS DEL HUB — una carta por Dofus, en este orden. Para sumar un Dofus basta
// otra entrada aquí con sus imágenes en public/img/.
// Las rutas de imagen son relativas a public/img/ (el embebido las pide a GitHub Pages).
// npcFit (opcional) encuadra el PNJ: h alto, r derecha, t arriba, en % de la carta.
// Una carta sin PNJ puede llevar `crown` (varios huevos, cada uno en su sitio) en vez de
// `egg`, y `kicker`, la píldora de arriba.
// ============================================================================
export const HUB = {
  // El título de la sección, sobre las cartas
  title: "Checklists de Dofus",
  dofus: [
    {
      id: "silvestre",
      name: "Dofus Silvestre",
      color: "#b7dc69",
      url: "https://www.torrentearcano.com/checklist-silvestre",
      egg: "hub/dofus-silvestre.webp",
      bg: "zones/reino-de-amakna.jpg",
      npc: "hub/silvosse.png",
      lead: "Silvosse te espera al final de 100 pasos por todo el Mundo de los Doce.",
    },
    {
      id: "hielos",
      name: "Dofus de los Hielos",
      color: "#9fd8f0",
      url: "https://www.torrentearcano.com/checklist-dofus-de-los-hielos",
      egg: "hub/dofus-hielos.webp",
      bg: "zones/isla-de-frigost.jpg",
      npc: "hub/conde-kontatras.png",
      // Su imagen es cuadrada y la figura estrecha: más grande y más a la derecha, que asome
      npcFit: { h: "70%", r: "-30%", t: "4%" },
      lead: "Descubre los misterios de la isla de Frigost en 70 pasos y enfréntate al temible Conde Kontatrás.",
    },
    {
      id: "nebuloso",
      name: "Dofus Nebuloso",
      color: "#c3b1f5",
      url: "https://www.torrentearcano.com/checklist-nebuloso",
      egg: "hub/dofus-nebuloso.png",
      bg: "zones/xelorium.jpg",
      // Khelebragón, a quien libera «En busca del pájaro del tiempo», la misión del último paso
      npc: "hub/khelebragon.png",
      // Imagen cuadrada y figura estrecha: más grande y a la derecha, como la del Hielos
      npcFit: { h: "72%", r: "-30%", t: "4%" },
      lead: "Recorre Anutropía, Sramvil y Xelorium en 26 pasos, con el Dofus de los Vigilantes por el camino.",
    },
    {
      id: "todos",
      name: "Rush de todos los Dofus",
      // La guía no da un Dofus, da 25: la píldora dice cuánto camino es
      kicker: "200 pasos",
      color: "#e3c565",
      // La página que tendrá en Torrente Arcano (SOURCE_URL en .build/dofus/todos.py)
      url: "https://www.torrentearcano.com/checklist-todos-dofus",
      bg: "zones/misiones-de-mundo.jpg",
      // Sin PNJ ni un solo huevo: la corona, el Vulbis del paso 200 en grande con los cinco
      // Dofus primordiales alrededor (el Ébano, debajo). x, y y h en % del ancho de la carta;
      // glow, el halo de cada huevo. Los huevos, copias de los de items/ en hub/ como los de
      // las otras cartas. La misma corona va en la home del sitio (src/site/home/manifest.js)
      crown: [
        { img: "hub/dofus-esmeralda.png", glow: "#2ecd68", x: 14, y: 24, h: 22 },
        { img: "hub/dofus-purpura.png", glow: "#ba374b", x: 28, y: 10.5, h: 22 },
        { img: "hub/dofus-turquesa.png", glow: "#1fd5d5", x: 72, y: 10.5, h: 22 },
        { img: "hub/dofus-marfil.png", glow: "#ebdcb4", x: 86, y: 24, h: 22 },
        { img: "hub/dofus-ebano.png", glow: "#7d6996", x: 50, y: 51, h: 18 },
        { img: "hub/dofus-vulbis.png", glow: "#eb4623", x: 50, y: 4.5, h: 40 },
      ],
      lead: "Del Dofawa al Vulbis: 25 Dofus en una sola ruta por todo el Mundo de los Doce.",
    },
    {
      id: "ocre",
      name: "Dofus Ocre",
      color: "#f0a336",
      url: "https://www.torrentearcano.com/lista-ocre",
      egg: "hub/dofus-ocre.png",
      // El mapa 20973059 de DofusDB, recortado como en .build/fetch_zone_maps.py
      bg: "zones/pueblo-de-la-canopea.jpg",
      // Otomai, el sabio de su isla: su asistente recibe las almas de «La eterna cosecha»
      npc: "hub/otomai.png",
      // Imagen cuadrada y figura estrecha: más grande y a la derecha, que el huevo no la tape
      npcFit: { h: "74%", r: "-40%", t: "6%" },
      lead: "Las 337 almas de «La eterna cosecha», etapa por etapa, hasta el Dofus Ocre.",
    },
  ],
  // La última carta, bloqueada: el siguiente checklist que prepara Torre
  showSoon: true,
};

/** La carta de «Próximamente»: sin enlace ni PNJ, en gris y con el huevo en silueta. */
export const SOON = {
  id: "soon",
  name: "Próximamente",
  kicker: "En camino",
  title: "???",
  color: "#e3c565",
  egg: "hub/dofus-soon.png",
  bg: "zones/krosmoz.jpg",
  lead: "Torre está preparando el siguiente checklist.",
  locked: true,
};
