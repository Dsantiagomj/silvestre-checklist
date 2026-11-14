// ============================================================================
// LA HOME DE «DOFUS TOOLS» — la cabecera del sitio, el título y una carta coleccionable por
// herramienta, que se inclina hacia el ratón como las del hub. Cada carta entera es el
// enlace a su página. DOM a mano, sin React.
// ============================================================================
import "./home.css";
import { HOME } from "./manifest.js";
import { TOOLS, mountShell, siteUrl } from "../shell/shell.js";
import { el, text } from "../../lib/dom.js";
import { tilt } from "../../lib/tilt.js";

const img = rel => `${import.meta.env.BASE_URL}img/${rel}`;

/** La corona del rush: varios huevos, cada uno en su sitio (x, y, h en % del ancho) y con su halo. */
function crown(eggs) {
  const box = el("div", "crown");
  for (const e of eggs) {
    const egg = el("img", "", { src: img(e.img), alt: "", draggable: "false" });
    for (const [k, v] of Object.entries({ x: e.x, y: e.y, h: e.h })) egg.style.setProperty(`--${k}`, v);
    egg.style.setProperty("--g", e.glow);
    box.append(egg);
  }
  return box;
}

/** Una carta: la zona de fondo, el PNJ asomando, el huevo (o la corona) y abajo el nombre y una línea. */
function card(tool) {
  const d = HOME.cards[tool.id];
  const name = d.name || tool.name;
  const leadId = `home-lead-${tool.id}`;
  const root = el("a", "card", { href: siteUrl(tool.path), "data-id": tool.id, "aria-label": name, "aria-describedby": leadId });
  root.style.setProperty("--c", d.color);
  root.append(el("img", "art", { src: img(d.bg), alt: "", draggable: "false" }));
  if (d.npc) {
    // El PNJ va dentro de un marco: la imagen se funde y el marco le pone el contorno y el halo
    // después, así el halo sigue a la figura y no queda cortado en un rectángulo
    const npc = el("div", "npc");
    npc.append(el("img", "", { src: img(d.npc), alt: "", draggable: "false" }));
    for (const [k, v] of Object.entries(d.npcFit || {})) npc.style.setProperty(`--npc-${k}`, v);
    root.append(npc);
  }
  const meta = el("div", "meta");
  meta.append(text("div", "name", name), Object.assign(text("p", "lead", d.lead), { id: leadId }));
  root.append(
    el("div", "shade"),
    d.crown ? crown(d.crown) : el("img", "egg", { src: img(d.egg), alt: "", draggable: "false" }),
    el("div", "foil"),
  );
  if (d.kicker) root.append(text("div", "kick", d.kicker));
  root.append(meta);
  tilt(root);
  return root;
}

function render() {
  mountShell("home");
  const home = document.querySelector(".home");
  const hero = home.querySelector(".hero");
  hero.prepend(el("img", "hbg", { src: img(HOME.bg), alt: "", draggable: "false" }));
  const cards = el("section", "cards", { "aria-label": "Herramientas" });
  cards.append(...TOOLS.map(card));
  home.append(cards);
}

// Los enlaces de cuando el Silvestre vivía en la raíz (…/?… o …/#…) van a su página nueva
// con lo mismo detrás; sin nada detrás, la home
if (location.search || location.hash) location.replace(siteUrl("silvestre/") + location.search + location.hash);
else render();
