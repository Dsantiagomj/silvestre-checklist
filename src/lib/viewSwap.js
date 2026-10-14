// ---------------------------------------------------------------------------
// Cambio entre mapa y diario con el zoom como pantalla de carga: la vista que se va
// hace su zoom y espera; la que llega se prepara invisible y avisa cuando lo que va a
// quedar a la vista está listo. Entonces se cruzan.
// ---------------------------------------------------------------------------
import { loadQuests } from "./quests.js";

// Nunca se espera más: una imagen lenta no puede dejar la vista bloqueada
export const READY_TIMEOUT = 1500;

/** Aviso de "lista" por cambio de vista: la nueva lo da, la vieja lo espera. */
export function makeChannel() {
  const waits = new Map();
  const get = id => {
    if (!waits.has(id)) {
      let resolve;
      const promise = new Promise(r => { resolve = r; });
      waits.set(id, { promise, resolve });
    }
    return waits.get(id);
  };
  return {
    when: id => get(id).promise,
    ready: id => get(id).resolve(),
  };
}

const frame = () => new Promise(r => requestAnimationFrame(r));
/**
 * Visible de verdad: dentro de la ventana y de cada contenedor con scroll que lo recorta
 * (la lista del diario). Lo que queda fuera no lo carga el navegador (loading="lazy"),
 * así que esperarlo dejaría la vista bloqueada hasta el límite.
 */
const inView = el => {
  const r = el.getBoundingClientRect();
  if (!r.width || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return false;
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (getComputedStyle(p).overflowY === "visible") continue;
    const c = p.getBoundingClientRect();
    if (r.bottom <= c.top || r.top >= c.bottom) return false;
  }
  return true;
};
const decoded = img =>
  (img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; }))
    .then(() => img.decode?.())
    .catch(() => {});
const preload = url => {
  const img = new Image();
  img.src = url;
  return decoded(img);
};

/**
 * Espera a que la vista que llega esté lista para verse: su maquetación hecha (la lista
 * ya colocada en el paso), las imágenes que van a quedar a la vista (también los
 * paisajes, que son fondos) y, en el diario, las misiones.
 */
export async function whenReady(root, view) {
  await frame();
  await frame();
  const visible = [...root.querySelectorAll("img, [style*='background-image']")].filter(inView);
  const images = visible.filter(el => el.tagName === "IMG").map(decoded);
  const backgrounds = [...new Set(visible
    .map(el => el.style.backgroundImage.match(/url\(["']?(.+?)["']?\)/)?.[1])
    .filter(Boolean))].map(preload);
  const quests = view === "diary" ? loadQuests() : null;
  await Promise.race([
    Promise.all([...images, ...backgrounds, quests]),
    new Promise(r => setTimeout(r, READY_TIMEOUT)),
  ]);
  // Lo que cambió al llegar las misiones ya está pintado
  await frame();
}
