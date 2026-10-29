// ============================================================================
// EL INICIO DE TORRENTE ARCANO — la portada y las secciones del sitio, en este orden. Para
// cambiar una sección o sumar otra basta tocar sus datos aquí, con sus imágenes en public/img/.
// Las rutas de imagen son relativas a public/img/ (el embebido las pide a GitHub Pages, nunca
// a DofusDB ni a Ankama). npcFit (opcional) encuadra el PNJ: h alto, r derecha, t arriba, en %
// de la carta.
// ============================================================================

// Los seis Dofus primordiales, en el orden en que rodean el aro empezando por arriba
const PRIMORDIALES = ["esmeralda", "purpura", "turquesa", "ocre", "ebano", "marfil"].map(d => `inicio/dofus-${d}.png`);
const clase = name => `inicio/clase-${name}.png`;

export const INICIO = {
  hero: {
    eyebrow: "Torrente Arcano",
    title: "Guías de Dofus",
    lead: "Todo lo que necesitas para avanzar en el Mundo de los Doce.",
    bg: "zones/krosmoz.jpg",
    // El huevo del filete dorado bajo el título
    emblem: "achievements/459.png",
  },
  // Las tres grandes: el PNJ asoma por la derecha y arriba a la izquierda, su icono enmarcado
  featured: [
    {
      id: "misiones",
      name: "Misiones",
      color: "#e3c565",
      url: "https://www.torrentearcano.com/metalogros",
      lead: "Misiones, logros, guías de Dofus y combates tácticos.",
      bg: "zones/misiones-de-mundo.jpg",
      npc: "npcs/ayfer-eales.png",
      icon: { kind: "tile", src: "achievements/203.png" },
    },
    {
      id: "guias-dofus",
      name: "Guías Dofus",
      color: "#b7dc69",
      url: "https://www.torrentearcano.com/guias-dofus",
      lead: "Cada Dofus del juego, con misiones y logros en orden.",
      bg: "zones/selocalipsis.jpg",
      npc: "npcs/npc-2205.png", // Meriana
      npcFit: { h: "66%", r: "-8%", t: "10%" },
      icon: { kind: "ring", srcs: PRIMORDIALES },
    },
    {
      id: "checklists",
      name: "Checklists",
      color: "#7fd6c2",
      url: "https://www.torrentearcano.com/checklists",
      lead: "La ruta de misiones y logros, con el progreso guardado.",
      bg: "zones/reino-de-amakna.jpg",
      npc: "npcs/silvosse.png",
      npcFit: { t: "16%", r: "-14%" },
      // Los huevos de los checklists del hub y, en silueta, el que viene
      icon: { kind: "eggs", srcs: ["hub/dofus-silvestre.webp", "hub/dofus-hielos.webp"], soon: "hub/dofus-soon.png" },
    },
  ],
  // Las tres medianas: el texto a la izquierda y arte del juego a la derecha
  sections: [
    {
      id: "clases",
      name: "Clases y sets",
      color: "#ef7d5e",
      url: "https://www.torrentearcano.com/clases-1",
      lead: "Cada clase explicada y los mejores sets por nivel, PvM y PvP.",
      bg: "zones/torres-de-la-hermandad-s.jpg",
      deco: { kind: "fan", srcs: ["feca", "yopuka", "ocra", "anutrof", "sacrogrito"].map(clase) },
    },
    {
      id: "alineamiento",
      name: "Alineamiento",
      color: "#9fb7f0",
      url: "https://www.torrentearcano.com/metalogro-alineamiento",
      lead: "Bonta y Brakmar en orden, con las misiones de rango.",
      bg: "zones/alineamiento-s.jpg",
      deco: { kind: "duo", bonta: "npcs/amayiro.png", brakmar: "npcs/oto-mustam.png" },
    },
    {
      id: "team-builder",
      name: "Team builder",
      color: "#f08fb7",
      url: "https://www.torrentearcano.com/team-builder",
      lead: "Equipos de 2 o 4 clases con buena sinergia.",
      bg: "zones/justicieros-s.jpg",
      deco: { kind: "team", srcs: ["yopuka", "aniripsa", "feca", "ocra"].map(clase) },
    },
  ],
  // Lo que prepara Torre: sin enlace y en gris hasta que exista
  soonTitle: "En camino",
  soon: [
    { id: "mazmorras", name: "Mazmorras", color: "#b48cf0", icon: "inicio/jalato-real.png", bg: "zones/sidimote-s.jpg" },
    { id: "oficios", name: "Oficios", color: "#e8a75a", icon: "jobs/10.png", bg: "zones/astrub-s.jpg" },
    { id: "companeros", name: "Compañeros", color: "#9fd8f0", icon: "inicio/lumino.png", bg: "zones/cania-s.jpg" },
    { id: "mascotas", name: "Mascotas", color: "#c9e07a", icon: "inicio/wauwau.png", bg: "zones/animatopia-s.jpg" },
  ],
};
