// ============================================================================
// EL HUB — pinta las franjas del manifiesto (src/hub/manifest.js) y lleva cuál está
// abierta. DOM a mano y sin React: es un widget pequeño y así el embebido pesa poco.
// ============================================================================
import { HUB, SOON } from "./manifest.js";

// Las imágenes salen de GitHub Pages: en el embebido la base es la dirección del sitio
const img = rel => `${import.meta.env.BASE_URL}img/${rel}`;

function el(tag, cls, attrs = {}) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function text(tag, cls, value) {
  const node = el(tag, cls);
  node.textContent = value;
  return node;
}

/** Una franja: fondo, PNJ, huevo, nombre en vertical y el texto de cuando está abierta. */
function pane(d) {
  const root = el("div", `pane${d.locked ? " lock" : ""}`, { "data-id": d.id });
  root.style.setProperty("--c", d.color);
  const metaId = `hub-meta-${d.id}`;

  const bg = el("div", "bg");
  bg.style.backgroundImage = `url("${img(d.bg)}")`;
  root.append(bg);
  if (d.npc) root.append(el("img", "guard", { src: img(d.npc), alt: "", draggable: "false" }), el("div", "tint"));
  root.append(el("div", "shade"), el("div", "foil"));
  const eggwrap = el("div", "eggwrap");
  eggwrap.append(el("img", "egg", { src: img(d.egg), alt: "", draggable: "false" }));
  const vert = text("div", "vert", d.short);
  vert.setAttribute("aria-hidden", "true"); // el nombre ya lo lleva el botón
  root.append(eggwrap, vert);

  const toggle = el("button", "pane-toggle", { type: "button", "aria-expanded": "false", "aria-controls": metaId, "aria-label": d.name });
  const meta = el("div", "meta", { id: metaId });
  meta.append(text("div", "kick", d.kicker || "Checklist"), text("h3", "name", d.title || d.name), text("p", "lead", d.lead));
  if (!d.locked && d.url) meta.append(Object.assign(text("a", "cta", "Ver checklist ›"), { href: d.url }));
  root.append(toggle, meta);
  return { root, toggle };
}

/** Monta el hub en `container`. Devuelve la función que abre una franja por su índice. */
export function renderHub(container, manifest = HUB) {
  const list = [...manifest.dofus, ...(manifest.showSoon ? [SOON] : [])];
  const banners = el("div", "banners");
  const panes = list.map(pane);
  banners.append(...panes.map(p => p.root));
  container.append(banners);

  let current = -1;
  const open = i => {
    if (i === current) return;
    current = i;
    panes.forEach((p, k) => {
      p.root.classList.toggle("open", k === i);
      p.toggle.setAttribute("aria-expanded", String(k === i));
    });
  };

  const KEYS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  panes.forEach(({ root, toggle }, i) => {
    // Ratón por encima, tocarla o llegar con el teclado: la franja se abre
    root.addEventListener("mouseenter", () => open(i));
    toggle.addEventListener("click", () => open(i));
    toggle.addEventListener("focus", () => open(i));
    toggle.addEventListener("keydown", e => {
      const n = panes.length;
      const to = e.key in KEYS ? (i + KEYS[e.key] + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
      if (to < 0) return;
      e.preventDefault();
      panes[to].toggle.focus();
      open(to);
    });
  });

  open(0);
  return open;
}
