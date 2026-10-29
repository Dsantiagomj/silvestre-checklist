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

export const EASE = "cubic-bezier(.2, .8, .2, 1)";

/**
 * Lleva la altura de un bloque de `from` (px) a la suya. Hacia "auto" (con
 * interpolate-size, en global.css) y no hacia la altura medida: si el contenido se
 * reajusta a mitad de camino, el destino lo sigue. "clip" y no "hidden": hidden haría
 * del bloque un contenedor de scroll y rompería lo sticky.
 */
export function morphHeight(el, from, duration = 320) {
  return el.animate(
    [{ height: `${from}px`, overflow: "clip" }, { height: "auto", overflow: "clip" }],
    { duration, easing: EASE },
  );
}

/**
 * Anima la altura de un bloque cuando cambia `key` (ocultar/mostrar, otra vista…):
 * mide la altura de antes y la de después y pasa de una a otra, así lo de debajo se
 * desplaza en vez de saltar. Sin efecto con movimiento reducido.
 */
export function useHeightMorph(ref, key, { duration = 320, skip } = {}) {
  const last = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const to = el.getBoundingClientRect().height;
    const from = last.current;
    last.current = to;
    // skip(): otra animación se encarga de este cambio (el zoom entre vistas)
    if (from == null || Math.abs(from - to) < 2 || prefersReducedMotion() || skip?.()) return;
    const anim = morphHeight(el, from, duration);
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
