// ---------------------------------------------------------------------------
// Cambio entre mapa y diario con el zoom como pantalla de carga: la vista que se va
// hace su zoom y espera; la que llega se prepara invisible y avisa cuando lo que va a
// quedar a la vista está listo. Entonces se cruzan.
// ---------------------------------------------------------------------------
import { loadQuests } from "./quests.js";

// Nunca se espera más: una imagen lenta no puede dejar la vista bloqueada. Corto: la vista
// que se va ya terminó su zoom y se queda quieta mientras tanto
export const READY_TIMEOUT = 600;
// Las misiones del diario sí se esperan más: sin ellas aparecería a medio cargar
export const QUESTS_TIMEOUT = 1500;

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

/** Todas las url() de un background-image con varias capas. */
const urlsOf = bg => [...bg.matchAll(/url\(["']?(.+?)["']?\)/g)].map(m => m[1]);
/**
 * Solo se espera lo que sirve la propia página. Lo de fuera (el mapa del juego de
 * DofusDB, sobre el paisaje del paso) puede tardar casi un segundo: esperarlo dejaba el
 * zoom parado; llega encima del paisaje, que ya hace de fondo mientras tanto.
 */
// Embebida, lo propio llega de GitHub Pages (la base del build), no de la página
const OWN_ORIGIN = new URL(import.meta.env.BASE_URL, location.href).origin;
const local = url => new URL(url, location.href).origin === OWN_ORIGIN;

/**
 * Espera a que la vista que llega esté lista para verse: su maquetación hecha (la lista
 * ya colocada en el paso), las imágenes que van a quedar a la vista (también los
 * paisajes, que son fondos) y, en el diario, las misiones. Las imágenes de fuera, no.
 */
export async function whenReady(root, view) {
  await frame();
  await frame();
  const visible = [...root.querySelectorAll("img, [style*='background-image']")].filter(inView);
  const imgs = visible.filter(el => el.tagName === "IMG" && local(el.src));
  // Con la vista aún invisible el navegador no pide las loading="lazy" (las figuras de los
  // jefes en el mapa): esperarlas dejaba el cambio parado hasta el límite. Las que van a
  // quedar a la vista se piden ya
  for (const img of imgs) if (img.loading === "lazy") img.loading = "eager";
  const images = imgs.map(decoded);
  const backgrounds = [...new Set(visible.flatMap(el => urlsOf(el.style.backgroundImage)).filter(local))].map(preload);
  const quests = view === "diary" ? loadQuests() : null;
  const upTo = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
  await Promise.all([upTo(Promise.all([...images, ...backgrounds]), READY_TIMEOUT), upTo(quests, QUESTS_TIMEOUT)]);
  // Lo que cambió al llegar las misiones ya está pintado
  await frame();
}
