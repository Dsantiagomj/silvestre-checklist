// ============================================================================
// EL INICIO — pinta la portada y las secciones del manifiesto (src/embeds/inicio/manifest.js): tres
// cartas grandes, tres medianas y la franja de lo que viene. Las cartas se inclinan hacia
// el ratón como las del hub (src/lib/tilt.js). DOM a mano y sin React, como el hub.
// ============================================================================
import { INICIO } from "./manifest.js";
import { el, text } from "../../lib/dom.js";
import { tilt } from "../../lib/tilt.js";

// Las imágenes salen de GitHub Pages: en el embebido la base es la dirección del sitio
const img = rel => `${import.meta.env.BASE_URL}img/${rel}`;
const pic = (src, cls) => el("img", cls, { src: img(src), alt: "", draggable: "false" });

// Las cartas del inicio son más grandes que las del hub: se inclinan menos
const TILT = { max: 5, depth: 900 };

/** La cabecera: el Krosmoz fundido detrás, el título y el filete dorado con el huevo. */
function hero(h) {
  const root = el("header", "hero");
  const rule = el("div", "rule");
  rule.append(el("span"), pic(h.emblem), el("span"));
  root.append(pic(h.bg, "hbg"), text("div", "ey", h.eyebrow), text("h1", null, h.title), text("p", null, h.lead), rule);
  return root;
}

/** El icono de una carta grande: una casilla enmarcada, el aro de los primordiales o los huevos. */
function icon(i) {
  if (i.kind === "ring") {
    const ring = el("span", "ring");
    // Repartidos en círculo, el primero arriba
    ring.append(...i.srcs.map((src, k) => {
      const a = (-90 + k * 360 / i.srcs.length) * Math.PI / 180;
      const node = pic(src);
      node.style.left = `${(50 + 29 * Math.cos(a)).toFixed(1)}%`;
      node.style.top = `${(50 + 29 * Math.sin(a)).toFixed(1)}%`;
      return node;
    }));
    return ring;
  }
  if (i.kind === "eggs") {
    const eggs = el("div", "eggs");
    eggs.append(...i.srcs.map(src => pic(src)), pic(i.soon, "sil"));
    return eggs;
  }
  const tile = el("span", "tile");
  tile.append(pic(i.src));
  return tile;
}

/** El arte de una carta mediana: el abanico de clases, los dos de cada alineamiento o el equipo. */
function deco(d) {
  const root = el("div", "deco");
  if (d.kind === "duo") {
    const duo = el("div", "duo");
    duo.append(pic(d.bonta, "bon"), pic(d.brakmar, "bra"));
    root.append(duo);
  } else if (d.kind === "team") {
    const team = el("div", "team");
    team.append(...d.srcs.map(src => {
      const tile = el("span", "tile sm");
      tile.append(pic(src));
      return tile;
    }));
    root.append(team);
  } else {
    const fan = el("div", "fan");
    fan.append(...d.srcs.map(src => pic(src)));
    root.append(fan);
  }
  return root;
}

/** Una carta que lleva a su sección: el fondo, lo que pinta `art` y el nombre con su lema. */
function card(d, kind, art) {
  const leadId = `inicio-lead-${d.id}`;
  const root = el("a", `card ${kind}`, { href: d.url, "aria-label": d.name, "aria-describedby": leadId, "data-id": d.id });
  root.style.setProperty("--c", d.color);
  for (const [k, v] of Object.entries(d.npcFit || {})) root.style.setProperty(`--npc-${k}`, v);
  const meta = el("div", "meta");
  meta.append(text("div", "name", d.name), Object.assign(text("p", "lead", d.lead), { id: leadId }));
  root.append(pic(d.bg, "art"), el("div", "shade"), ...art, el("div", "inner"), el("div", "foil"), meta);
  tilt(root, TILT);
  return root;
}

const big = d => card(d, "wide", [pic(d.npc, "npc"), icon(d.icon)]);
const mid = d => card(d, "mid", [deco(d.deco)]);

/** Lo que viene: sin enlace, en gris. */
function chip(d) {
  const root = el("div", "chip", { "data-id": d.id });
  root.style.setProperty("--c", d.color);
  const por = el("span", "por");
  por.append(pic(d.icon));
  root.append(pic(d.bg, "bg"), por, text("b", null, d.name));
  return root;
}

function grid(cls, cards) {
  const root = el("div", cls);
  root.append(...cards);
  return root;
}

/** Monta el inicio en `container`, en el orden del manifiesto. */
export function renderInicio(container, manifest = INICIO) {
  const soon = el("section", "soonB", { "aria-labelledby": "inicio-soon" });
  soon.append(Object.assign(text("h2", "soonT", manifest.soonTitle), { id: "inicio-soon" }), ...manifest.soon.map(chip));
  container.append(
    hero(manifest.hero),
    grid("featB", manifest.featured.map(big)),
    grid("restB", manifest.sections.map(mid)),
    soon,
  );
}
