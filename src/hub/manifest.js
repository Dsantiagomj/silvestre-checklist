// ============================================================================
// LOS CHECKLISTS DEL HUB — una franja por Dofus, en este orden; la primera empieza
// abierta. Para sumar un Dofus basta otra entrada aquí con sus imágenes en public/img/.
// Las rutas de imagen son relativas a public/img/ (el embebido las pide a GitHub Pages).
// ============================================================================
export const HUB = {
  dofus: [
    {
      id: "silvestre",
      name: "Dofus Silvestre",
      // Lo que se lee en vertical cuando la franja está cerrada
      short: "Silvestre",
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
      short: "de los Hielos",
      color: "#9fd8f0",
      url: "https://www.torrentearcano.com/checklist-dofus-de-los-hielos",
      egg: "hub/dofus-hielos.webp",
      bg: "zones/isla-de-frigost.jpg",
      npc: "hub/conde-kontatras.png",
      lead: "Descubre los misterios de la isla de Frigost en 70 pasos y enfréntate al temible Conde Kontatrás.",
    },
  ],
  // La última franja, bloqueada: el siguiente checklist que prepara Torre
  showSoon: true,
};

/** La franja de «Próximamente»: sin enlace ni PNJ, el huevo en silueta. */
export const SOON = {
  id: "soon",
  name: "Próximamente",
  short: "Próximamente",
  kicker: "En camino",
  title: "???",
  color: "#e3c565",
  egg: "hub/dofus-soon.png",
  bg: "zones/krosmoz.jpg",
  lead: "Torre está preparando el siguiente checklist.",
  locked: true,
};
