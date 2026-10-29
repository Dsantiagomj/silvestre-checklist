// ============================================================================
// EL INTERRUPTOR DE TEMA DE HUEVOS — un botón role="switch" con dos huevos: el del tema
// activo grande a la izquierda, el otro pequeño y apagado. Al cambiar intercambian sitio en
// arco y el que llega aparece con un rebote y chispas; con movimiento reducido el tema
// cambia sin más. El CSS está en themeSwitch.css: cada superficie lo importa (en una shadow
// root, dentro de su hoja). Lo usan la cabecera del sitio, el embebido de la cosecha y el
// checklist (components/ThemeSwitch.jsx, con React).
// ============================================================================

/** Las chispas que salen del huevo que llega: su desplazamiento final en px. */
export const SPARKS = [
  [0, -14], [12, -8], [13, 7], [0, 14], [-12, 8], [-13, -7],
];

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Reinicia una animación CSS quitando y volviendo a poner su clase. */
function restartClass(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/**
 * Posición de los huevos y textos accesibles para `theme`. `names`: lo que es cada huevo
 * ({ light: "Dofus Marfil", dark: "Dofus Ébano" }). El interruptor puede ir por delante del tema.
 */
export function syncThemeSwitch(btn, theme, names) {
  btn.classList.toggle("is-dark", theme === "dark");
  btn.setAttribute("aria-checked", String(theme === "dark"));
  const label = theme === "dark" ? `Modo oscuro · ${names.dark}` : `Modo claro · ${names.light}`;
  btn.setAttribute("aria-label", label);
  btn.title = `${label}. Pulsa para cambiar`;
}

const busy = new WeakSet();

/**
 * Lleva el interruptor a `next` y llama a `commit(next, animated)`. Con movimiento reducido,
 * enseguida y sin animar. Si no, los huevos intercambian sitio y el tema llega a los 140 ms,
 * cuando el que llega ya está saliendo; un clic a mitad de la animación no hace nada.
 */
export function toggleThemeSwitch(btn, next, names, commit) {
  if (busy.has(btn)) return;
  if (reducedMotion()) return commit(next, false);
  busy.add(btn);
  setTimeout(() => busy.delete(btn), 1200);
  syncThemeSwitch(btn, next, names);
  const [leaving, arriving] = next === "dark"
    ? [btn.querySelector(".ts-light"), btn.querySelector(".ts-dark")]
    : [btn.querySelector(".ts-dark"), btn.querySelector(".ts-light")];
  arriving.classList.remove("arc-up");
  leaving.classList.remove("hatch");
  restartClass(leaving, "arc-up");
  restartClass(arriving, "hatch");
  restartClass(btn, "pop");
  setTimeout(() => commit(next, true), 140);
}

/**
 * El interruptor en DOM a mano. `icons`: las URL de los huevos ({ light, dark }); `names`,
 * lo que es cada uno; `theme`, el de ahora; `onToggle(btn)`, el clic.
 */
export function createThemeSwitch({ icons, names, theme, onToggle }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "theme-switch";
  btn.setAttribute("role", "switch");
  const track = document.createElement("span");
  track.className = "ts-track";
  track.setAttribute("aria-hidden", "true");
  btn.append(track);
  for (const kind of ["light", "dark"]) {
    const egg = document.createElement("img");
    egg.className = `ts-egg ts-${kind}`;
    Object.assign(egg, { src: icons[kind], alt: "", draggable: false });
    egg.setAttribute("aria-hidden", "true");
    btn.append(egg);
  }
  for (const [dx, dy] of SPARKS) {
    const spark = document.createElement("span");
    spark.className = "ts-spark";
    spark.setAttribute("aria-hidden", "true");
    spark.style.setProperty("--dx", `${dx}px`);
    spark.style.setProperty("--dy", `${dy}px`);
    btn.append(spark);
  }
  syncThemeSwitch(btn, theme, names);
  btn.addEventListener("click", () => onToggle(btn));
  return btn;
}

/**
 * Cambia el tema de una página entera con una View Transition: la noche entra (o se retira)
 * en diagonal desde la esquina del interruptor (themeSwitch.css). `commit` debe dejar el DOM
 * con el tema nuevo dentro del callback. Sin View Transitions, el tema cambia sin más. Solo
 * en una página propia: embebida, la transición cubriría la página de otro.
 */
export function pageThemeTransition(next, commit) {
  if (!document.startViewTransition) return commit();
  const root = document.documentElement;
  const cls = next === "dark" ? "vt-to-dark" : "vt-to-light";
  root.classList.add(cls);
  const vt = document.startViewTransition(commit);
  vt.finished.finally(() => root.classList.remove(cls));
}
