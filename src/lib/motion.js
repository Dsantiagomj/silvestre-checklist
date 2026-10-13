export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Reinicia una animación CSS quitando y volviendo a poner su clase. */
export function restartClass(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/**
 * Copia texto al portapapeles del documento del botón (puede ser el del overlay).
 * Devuelve false si no hay permiso, para que quien llama ofrezca copiar a mano.
 */
export async function copyText(doc, text) {
  try {
    await doc.defaultView.navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
