// ============================================================================
// EL HUB — pinta una carta por Dofus del manifiesto (src/hub/manifest.js) y la inclina
// hacia el ratón. DOM a mano y sin React: es un widget pequeño y así el embebido pesa poco.
// ============================================================================
import { HUB, SOON } from "./manifest.js";

// Las imágenes salen de GitHub Pages: en el embebido la base es la dirección del sitio
const img = rel => `${import.meta.env.BASE_URL}img/${rel}`;

// Lo que se inclina la carta hacia cada lado, en grados
const TILT = 9;
const still = matchMedia("(prefers-reduced-motion: reduce)");

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

/** Con el ratón por encima, la carta se inclina hacia él y el brillo lo sigue. */
function tilt(card) {
  card.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse" || still.matches) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    card.style.transform = `perspective(800px) rotateY(${((x - .5) * 2 * TILT).toFixed(2)}deg) rotateX(${((.5 - y) * 2 * TILT).toFixed(2)}deg)`;
    card.style.setProperty("--fx", `${(x * 100).toFixed(1)}%`);
    card.style.setProperty("--fy", `${(y * 100).toFixed(1)}%`);
  });
  card.addEventListener("pointerleave", () => { card.style.transform = ""; });
}

/** Una carta: la zona de fondo, el PNJ asomando, el huevo y el texto abajo. La bloqueada no enlaza. */
function card(d) {
  const leadId = `hub-lead-${d.id}`;
  const root = d.locked
    ? el("div", "card lock", { role: "link", "aria-disabled": "true", "aria-label": d.name })
    : el("a", "card", { href: d.url, "aria-label": `${d.name} · Ver checklist` });
  root.setAttribute("data-id", d.id);
  root.setAttribute("aria-describedby", leadId);
  root.style.setProperty("--c", d.color);

  const art = el("div", "art");
  art.style.backgroundImage = `url("${img(d.bg)}")`;
  root.append(art);
  if (d.npc) {
    const npc = el("img", "npc", { src: img(d.npc), alt: "", draggable: "false" });
    for (const [k, v] of Object.entries(d.npcFit || {})) npc.style.setProperty(`--npc-${k}`, v);
    root.append(npc);
  }
  root.append(el("div", "shade"), el("img", "egg", { src: img(d.egg), alt: "", draggable: "false" }), el("div", "foil"));
  if (d.kicker) root.append(text("div", "kick", d.kicker));
  const meta = el("div", "meta");
  meta.append(text("div", "name", d.title || d.name), Object.assign(text("p", "lead", d.lead), { id: leadId }));
  root.append(meta);
  if (!d.locked) tilt(root);
  return root;
}

/** Monta el hub en `container`: el título y debajo las cartas en el orden del manifiesto, la de Próximamente al final. */
export function renderHub(container, manifest = HUB) {
  const list = [...manifest.dofus, ...(manifest.showSoon ? [SOON] : [])];
  const cards = el("section", "cards", { "aria-labelledby": "hub-title" });
  const row = el("div", "row");
  row.style.setProperty("--n", list.length); // con muchas, el ancho se reparte entre todas
  row.append(...list.map(card));
  cards.append(Object.assign(text("h2", "title", manifest.title), { id: "hub-title" }), row);
  container.append(cards);
}
