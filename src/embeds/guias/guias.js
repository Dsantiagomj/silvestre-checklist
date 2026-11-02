// ============================================================================
// LAS GUÍAS DE LOS DOFUS — una carta coleccionable por guía de Torrente Arcano, en el orden
// de su página (src/embeds/guias/manifest.js). Arriba el título de la página (su h1) y la
// entradilla de Torre; debajo la barra de filtros (Todos, Primordiales, Eventos), el buscador
// y el interruptor de tema, pegada bajo la cabecera fija de la página. Las cartas son las del
// hub: con el ratón se inclinan y el brillo las sigue. Las que aún no tienen guía no enlazan.
// El tema (oscuro o claro) se guarda en guias:theme. DOM a mano y sin React, como el hub.
// ============================================================================
import { GUIAS } from "./manifest.js";
import { el, text } from "../../lib/dom.js";
import { tilt } from "../../lib/tilt.js";
import { createThemeSwitch, syncThemeSwitch, toggleThemeSwitch } from "../../lib/themeSwitch.js";

const THEME_KEY = "guias:theme";
// Los huevos del interruptor, los mismos que el sitio y la cosecha
const EGGS = { light: "items/23011.png", dark: "items/23007.png" };
const EGG_NAMES = { light: "Dofus Marfil", dark: "Dofus Ébano" };
const asTheme = t => (t === "light" ? "light" : "dark");

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "primordial", label: "Primordiales" },
  { key: "event", label: "Eventos" },
];
const TAGS = { primordial: "Primordial", event: "Evento" };
const EMPTY = "No se ha encontrado ningún Dofus.";

// Las imágenes salen de GitHub Pages: en el embebido la base es la dirección del sitio
const img = rel => `${import.meta.env.BASE_URL}img/${rel}`;
const pic = (rel, cls) => el("img", cls, { src: img(rel), alt: "", draggable: "false" });

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key, value) {
  // Sin localStorage (modo privado estricto) el tema cambia igual, solo que no se guarda
  try { localStorage.setItem(key, value); } catch { /* nada */ }
}

/** Sin tildes ni mayúsculas: «Ébano» y «ebano» son lo mismo. */
export const fold = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Si la guía `g` pasa el filtro `filter` y la búsqueda `query` (por su nombre y sus otros nombres). */
export function matches(g, filter, query) {
  if (filter !== "all" && g.tag !== filter) return false;
  return fold(`${g.name} ${g.alias || ""}`).includes(fold(query.trim()));
}

/** Una carta: el enlace a su guía o, sin guía todavía, un div quieto (la bloqueada del hub). */
function card(g) {
  const lvId = `guias-lv-${g.id}`;
  const root = g.url
    ? el("a", "card", { href: g.url, "aria-label": `${g.name} · Ver guía` })
    : el("div", "card wip", { role: "link", "aria-disabled": "true", "aria-label": `${g.name} · Próximamente` });
  root.setAttribute("aria-describedby", lvId);
  root.style.setProperty("--c", g.color);
  root.append(el("div", "art"), el("div", "shade"), pic(g.icon, "egg"), el("div", "foil"));
  const tag = g.url ? TAGS[g.tag] : "Próximamente";
  if (tag) root.append(text("span", "kick", tag));
  const meta = el("div", "meta");
  meta.append(text("div", "name", g.name), Object.assign(text("p", "lv", `Nivel ${g.level}`), { id: lvId }));
  root.append(meta);
  if (g.url) tilt(root);
  return root;
}

/** Un botón de la botonera de filtros, con su cuenta. */
function filterButton(f, guides) {
  const n = f.key === "all" ? guides.length : guides.filter(g => g.tag === f.key).length;
  const b = el("button", null, { type: "button", "aria-pressed": String(f.key === "all") });
  b.append(document.createTextNode(f.label), text("small", null, String(n)));
  return b;
}

/** Monta las guías en `container` (la raíz .guias de la shadow root). */
export function renderGuias(container, manifest = GUIAS) {
  const { guides } = manifest;
  const state = { filter: "all", query: "" };
  let theme = asTheme(read(THEME_KEY));
  container.dataset.theme = theme;

  // --- La cabecera: el Krosmoz fundido detrás, el título de la página y la entradilla ---
  const hero = el("header", "hero");
  hero.append(pic(manifest.art, "hbg"), text("div", "ey", manifest.eyebrow),
    Object.assign(text("h1", "title", manifest.title), { id: "guias-title" }), text("p", "lead", manifest.intro));

  // --- La barra: los filtros, el buscador y el interruptor de tema ---
  const seg = el("div", "seg", { role: "group", "aria-label": "Tipo de Dofus" });
  const buttons = FILTERS.map(f => {
    const b = filterButton(f, guides);
    b.addEventListener("click", () => {
      state.filter = f.key;
      buttons.forEach((x, i) => x.setAttribute("aria-pressed", String(FILTERS[i].key === f.key)));
      apply();
    });
    return b;
  });
  seg.append(...buttons);

  const srch = el("div", "srch");
  const input = el("input", null, {
    type: "text", placeholder: "Buscar Dofus…", "aria-label": "Buscar Dofus",
    autocomplete: "off", spellcheck: "false", enterkeyhint: "search",
  });
  const clear = text("button", "x", "×");
  clear.type = "button";
  clear.setAttribute("aria-label", "Borrar la búsqueda");
  srch.append(input, clear);
  input.addEventListener("input", () => { state.query = input.value; apply(); });
  clear.addEventListener("click", () => { input.value = ""; state.query = ""; apply(); input.focus(); });

  const sw = createThemeSwitch({
    icons: { light: img(EGGS.light), dark: img(EGGS.dark) },
    names: EGG_NAMES,
    theme,
    onToggle: btn => toggleThemeSwitch(btn, theme === "dark" ? "light" : "dark", EGG_NAMES, t => {
      setTheme(t);
      write(THEME_KEY, t);
    }),
  });
  /** Cambia el tema: los colores (guias.css) y el interruptor. */
  function setTheme(t) {
    theme = asTheme(t);
    container.dataset.theme = theme;
    syncThemeSwitch(sw, theme, EGG_NAMES);
  }

  const bar = el("div", "bar");
  const tools = el("div", "tools");
  tools.append(seg, srch, sw);
  bar.append(tools);

  // --- Las cartas, el vacío y el recuento para los lectores de pantalla ---
  const grid = el("div", "grid");
  const nodes = guides.map(g => { const n = card(g); grid.append(n); return [g, n]; });
  const empty = el("div", "empty", { hidden: "" });
  empty.append(pic("hub/dofus-soon.png", "sil"), text("b", null, "Ningún Dofus"), text("p", null, EMPTY));
  const status = el("p", "sr", { role: "status" });

  function apply() {
    let shown = 0;
    for (const [g, n] of nodes) {
      const ok = matches(g, state.filter, state.query);
      n.hidden = !ok;
      shown += ok;
    }
    srch.classList.toggle("has", input.value !== "");
    empty.hidden = shown > 0;
    status.textContent = shown ? `${shown} guías` : EMPTY;
  }

  const section = el("section", "page", { "aria-labelledby": "guias-title" });
  section.append(hero, bar, status, grid, empty);
  container.append(section);
  apply();

  // Pegada bajo la cabecera de la página, la barra se vuelve opaca (y la sombra la separa)
  let frame = 0;
  const stick = () => {
    frame = 0;
    const top = parseFloat(getComputedStyle(container).getPropertyValue("--top")) || 0;
    bar.classList.toggle("stuck", window.scrollY > 0 && bar.getBoundingClientRect().top <= top + .5);
  };
  const later = () => { if (!frame) frame = requestAnimationFrame(stick); };
  window.addEventListener("scroll", later, { passive: true });
  window.addEventListener("resize", later, { passive: true });
  stick();

  // Otra pestaña que cambia el tema: este lo sigue
  window.addEventListener("storage", e => { if (e.key === THEME_KEY) setTheme(e.newValue); });
}
