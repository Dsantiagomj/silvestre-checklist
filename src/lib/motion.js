import { useLayoutEffect, useRef } from "react";

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

const EASE = "cubic-bezier(.2, .8, .2, 1)";

/**
 * Anima la altura de un bloque cuando cambia `key` (ocultar/mostrar, otra vista…):
 * mide la altura de antes y la de después y pasa de una a otra, así lo de debajo se
 * desplaza en vez de saltar. Sin efecto con movimiento reducido.
 */
export function useHeightMorph(ref, key, duration = 320) {
  const last = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const to = el.getBoundingClientRect().height;
    const from = last.current;
    last.current = to;
    if (from == null || Math.abs(from - to) < 2 || prefersReducedMotion()) return;
    // Hacia "auto" (con interpolate-size, en global.css) y no hacia la altura medida:
    // si el contenido se reajusta a mitad de camino, el destino lo sigue
    const anim = el.animate(
      [{ height: `${from}px`, overflow: "hidden" }, { height: "auto", overflow: "hidden" }],
      { duration, easing: EASE },
    );
    // Al terminar, la altura real es la de partida del siguiente cambio
    anim.finished.then(() => { last.current = el.getBoundingClientRect().height; }, () => {});
  }, [key]);
  // La altura cambia también sin cambiar de estado (filtros, imágenes): se sigue de cerca
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (!el.getAnimations().length) last.current = el.getBoundingClientRect().height;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
}
