import { useMediaQuery } from "./useMediaQuery.js";

// ============================================================================
// PANTALLA ALTA O BAJA — la única regla que decide entre las dos versiones de la app.
// Alta: escritorio (más de 900 px de ancho) con 900 px de alto o más. Ahí va todo como
// antes de la versión compacta: el hero, la franja de los Dofus del camino sobre la
// fila de herramientas, la nota de las pausas en la página, los avisos del paso en
// bloques, el estandarte grande y «Necesitas» antes de las misiones.
// Baja (lo demás: portátiles de 1280×720 o 1279×804, móviles): sin hero, la barra en una
// fila, la nota en un diálogo, fichas, el distintivo y las misiones primero.
// El CSS no repite el corte: se guía por lo que monta cada versión (p. ej. .is-compact).
// ============================================================================
export const TALL_QUERY = "(min-width: 901px) and (min-height: 900px)";

/** ¿Pantalla alta? Cambia al redimensionar. */
export const useTallScreen = () => useMediaQuery(TALL_QUERY);
