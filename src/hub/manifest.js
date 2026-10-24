// ============================================================================
// LOS CHECKLISTS DEL HUB — una carta por Dofus, en este orden. Para sumar un Dofus basta
// otra entrada aquí con sus imágenes en public/img/.
// Las rutas de imagen son relativas a public/img/ (el embebido las pide a GitHub Pages).
// npcFit (opcional) encuadra el PNJ: h alto, r derecha, t arriba, en % de la carta.
// ============================================================================
export const HUB = {
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
