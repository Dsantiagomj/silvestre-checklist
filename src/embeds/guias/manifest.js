// ============================================================================
// LAS GUÍAS DE LOS DOFUS — las 30 de torrentearcano.com/guias-dofus, en el orden de Torre.
// Escritas a mano: para sumar una guía basta otra entrada aquí con su icono en public/img/.
// - url: la guía en Torrente Arcano; null mientras no exista (sale «Próximamente», sin enlace).
// - tag: "primordial" o "event", las etiquetas de Torre (los filtros); null, ninguna.
// - level: el nivel del Dofus en DofusDB (objetos de tipo 23).
// - color: el --accent de cada carta de Torre (Dofzzbz no tenía; el suyo sale de su icono).
// - icon: el icono del objeto, relativo a public/img/. Ojo: el id del icono no es el del
//   objeto (el Dofawa es el objeto 7113 con el icono 23009).
// - alias: otros nombres que Torre puso en su buscador (data-name).
// ============================================================================
const T = "https://www.torrentearcano.com/";

export const GUIAS = {
  title: "Guías de Dofus",
  eyebrow: "Misiones y logros de cada Dofus",
  // La entradilla de la página de Torre, tal cual
  intro: "Descubre aquí todas las diferentes guías de los Dofus: primordiales, de evento y muchos más. " +
    "Podrás conocer qué misiones y logros son necesarios para obtener el Dofus que quieras, y la manera más eficiente para no repetir contenido.",
  // La zona detrás de la cabecera: el Krosmoz, el mundo entero, como la home y el inicio
  art: "zones/krosmoz.jpg",
  guides: [
    { id: "dofawa", name: "Dofawa", url: `${T}dofawa`, tag: null, level: 6, color: "#ff9118", icon: "items/23009.png" },
    { id: "plateado", name: "Dofus Plateado", url: `${T}dofus-plateado`, tag: null, level: 20, color: "#dce1c9", icon: "items/23025.png" },
    { id: "jyfus", name: "Jyfus", url: `${T}jyfus`, tag: "event", level: 20, color: "#8fc44a", icon: "items/23038.png" },
    { id: "cacao", name: "Dofus Cacao", url: `${T}dofus-cacao`, tag: "event", level: 50, color: "#ebb838", icon: "items/23029.png" },
    { id: "zanahowia", name: "Dofus Zanahowia", url: `${T}dofus-zanahowia`, tag: null, level: 60, color: "#ff9118", icon: "items/23006.png", alias: "zanahoria" },
    { id: "dosaurio", name: "Dosaurio", url: `${T}dosaurio`, tag: "event", level: 80, color: "#52abff", icon: "items/23017.png" },
    { id: "dokoko", name: "Dokoko", url: `${T}dokoko`, tag: null, level: 80, color: "#aa6237", icon: "items/23022.png" },
    { id: "kalipto", name: "Dofus Kalipto", url: null, tag: null, level: 100, color: "#97d03a", icon: "items/23010.png", alias: "kaliptus" },
    { id: "vigilante", name: "Dofus Vigilante", url: `${T}dofus-vigilante`, tag: null, level: 100, color: "#1fdcd1", icon: "items/23020.png" },
    { id: "dolmanax", name: "Dolmanax", url: `${T}dolmanax`, tag: null, level: 100, color: "#eb69af", icon: "items/23018.png" },
    { id: "esmeralda", name: "Dofus Esmeralda", url: `${T}dofus-esmeralda`, tag: "primordial", level: 100, color: "#2ecd68", icon: "items/23002.png" },
    { id: "purpura", name: "Dofus Púrpura", url: `${T}dofus-purpura`, tag: "primordial", level: 110, color: "#ba374b", icon: "items/23001.png" },
    { id: "dotruz", name: "Dotruz", url: `${T}dotruz`, tag: null, level: 110, color: "#f578b4", icon: "items/23019.png" },
    { id: "domakuro", name: "Domakuro", url: `${T}domakuro`, tag: null, level: 120, color: "#6e737d", icon: "items/23032.png" },
    { id: "dorigami", name: "Dorigami", url: `${T}dorigami`, tag: null, level: 150, color: "#eef0f6", icon: "items/23033.png" },
    { id: "ocre", name: "Dofus Ocre", url: `${T}dofus-ocre`, tag: "primordial", level: 160, color: "#d18b23", icon: "items/23012.png" },
    { id: "turquesa", name: "Dofus Turquesa", url: `${T}dofus-turquesa`, tag: "primordial", level: 160, color: "#1fd5d5", icon: "items/23003.png" },
    { id: "dofzzbz", name: "Dofzzbz", url: `${T}dofzzbz`, tag: null, level: 170, color: "#e8703a", icon: "items/23039.png" },
    { id: "vulbis", name: "Dofus Vulbis", url: `${T}dofus-vulbis`, tag: null, level: 180, color: "#eb4623", icon: "items/23004.png" },
    { id: "hielos", name: "Dofus de los Hielos", url: `${T}dofus-de-los-hielos`, tag: null, level: 180, color: "#47c4ff", icon: "items/23005.png" },
    { id: "nebuloso", name: "Dofus Nebuloso", url: `${T}dofus-nebuloso`, tag: null, level: 180, color: "#875cd2", icon: "items/23016.png" },
    { id: "abisal", name: "Dofus Abisal", url: `${T}dofus-abisal`, tag: null, level: 180, color: "#2a5aaa", icon: "items/23023.png" },
    { id: "marfil", name: "Dofus Marfil", url: `${T}dofus-marfil`, tag: "primordial", level: 180, color: "#ebdcb4", icon: "items/23011.png" },
    { id: "forjalava", name: "Dofus Forjalava", url: `${T}dofus-forjalava`, tag: null, level: 180, color: "#ee5a1f", icon: "items/23024.png" },
    { id: "ebano", name: "Dofus Ébano", url: `${T}dofus-ebano`, tag: "primordial", level: 180, color: "#7d6996", icon: "items/23007.png" },
    { id: "centelleante", name: "Dofus Centelleante", url: `${T}dofus-centelleante`, tag: null, level: 180, color: "#dee9f6", icon: "items/23027.png" },
    { id: "moteado", name: "Dofus Moteado", url: `${T}dofus-moteado`, tag: null, level: 180, color: "#ebeef2", icon: "items/23008.png" },
    { id: "pinata", name: "Piñata de Pino", url: `${T}piata-de-pino`, tag: null, level: 180, color: "#51b268", icon: "items/23035.png" },
    { id: "pesadilla", name: "Dofus Pesadilla", url: `${T}dofus-pesadilla`, tag: null, level: 180, color: "#69379b", icon: "items/23034.png" },
    { id: "silvestre", name: "Dofus Silvestre", url: `${T}dofus-silvestre`, tag: null, level: 180, color: "#b0d62d", icon: "items/23036.png" },
  ],
};
