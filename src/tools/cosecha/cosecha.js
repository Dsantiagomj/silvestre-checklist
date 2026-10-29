// ============================================================================
// «LA ETERNA COSECHA» — las 337 almas que pide la misión del Dofus Ocre, como cromos que se
// marcan. A la izquierda el carril con las 18 etapas de la misión (o las 19 regiones); a la
// derecha las almas del grupo elegido. Las cuentas salen de src/tools/cosecha/souls.js. DOM a mano
// y sin React, como el hub y el inicio.
// Lo marcado va en cosecha:done, la misma clave que la página anterior (public/cosecha/), y
// la vista (agrupar, tipo, ocultar hechos y el grupo elegido) en cosecha:ui.
// ============================================================================
import SOULS from "../../../public/cosecha/cosecha.json";
import { el, text } from "../../lib/dom.js";
import { groupsOf, matches, parseDone, parseUi } from "./souls.js";

const DONE_KEY = "cosecha:done";
const UI_KEY = "cosecha:ui";

// Las imágenes salen de GitHub Pages: en el embebido la base es la dirección del sitio
const img = rel => `${import.meta.env.BASE_URL}img/${rel}`;
const pic = (src, cls, lazy) => el("img", cls, { src: img(src), alt: "", draggable: "false", ...(lazy ? { loading: "lazy" } : {}) });

const COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>';

const still = matchMedia("(prefers-reduced-motion: reduce)");
const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
const where = s => (s.d || s.z) + (s.t === "boss" ? ` · nv. ${s.lv}` : "");
const almas = n => `${n} ${n === 1 ? "alma" : "almas"}`;

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key, value) {
  // Sin localStorage (modo privado estricto) se marca igual, solo que no se guarda
  try { localStorage.setItem(key, value); } catch { /* nada */ }
}

/** Un botón de una botonera: pulsado o no (aria-pressed). */
function segButton(label, data) {
  const b = text("button", null, label);
  b.type = "button";
  for (const [k, v] of Object.entries(data)) b.dataset[k] = v;
  return b;
}

/** Monta el checklist en `container`; `host` es el anfitrión de la página (su --cosecha-top). */
export function renderCosecha(container, host) {
  const done = parseDone(read(DONE_KEY));
  const ui = parseUi(read(UI_KEY));
  let q = "";

  const save = () => {
    write(DONE_KEY, JSON.stringify([...done]));
    write(UI_KEY, JSON.stringify(ui));
  };

  // --- La cabecera: Cania fundida detrás, el huevo enmarcado, el título y tres barras ---
  const hd = el("header", "hd");
  const egg = el("div", "egg");
  egg.append(pic("inicio/dofus-ocre.png"));
  const titles = el("div", "tt");
  titles.append(
    text("div", "ey", "Dofus Ocre"),
    text("h2", null, "La eterna cosecha"),
    text("p", "sub", `Las ${SOULS.length} almas que pide la misión. Toca un alma para marcarla; el icono de la esquina copia su nombre.`),
  );
  const bars = el("div", "bars");
  const barOf = {};
  for (const [cls, label, t] of [["t", "Total", null], ["j", "Jefes", "boss"], ["a", "Archis", "archi"]]) {
    const bar = el("div", `bar ${cls}`);
    const track = el("span");
    const fill = el("i");
    const count = el("em");
    track.append(fill);
    bar.append(text("b", null, label), track, count);
    bars.append(bar);
    barOf[cls] = { fill, count, souls: SOULS.filter(s => !t || s.t === t) };
  }
  hd.append(pic("zones/cania.jpg", "hbg"), egg, titles, bars);

  // --- Las herramientas ---
  const tools = el("div", "tools");
  const bySeg = el("div", "seg big", { role: "group", "aria-label": "Agrupar" });
  bySeg.append(segButton("Por etapa", { by: "etapa" }), segButton("Por región", { by: "region" }));
  const typeSeg = el("div", "seg", { role: "group", "aria-label": "Tipo" });
  typeSeg.append(segButton("Todo", { type: "all" }), segButton("Jefes", { type: "boss" }), segButton("Archis", { type: "archi" }));
  // type=text: el de búsqueda trae su propia × y quedarían dos
  const srch = el("div", "srch");
  const input = el("input", null, {
    type: "text", placeholder: "Buscar monstruo, mazmorra o zona…", autocomplete: "off",
    spellcheck: "false", "aria-label": "Buscar", "aria-keyshortcuts": "/",
  });
  const clear = text("button", "x", "×");
  clear.type = "button";
  clear.setAttribute("aria-label", "Borrar búsqueda");
  srch.append(input, clear);
  const chk = el("label", "chk");
  const hide = el("input", null, { type: "checkbox" });
  chk.append(hide, document.createTextNode("Ocultar hechos"));
  const reset = text("button", "reset", "Reiniciar");
  reset.type = "button";
  tools.append(bySeg, typeSeg, srch, chk, reset);

  // --- El cuerpo: el carril y las almas ---
  const body = el("div", "body");
  const rail = el("nav", "rail", { "aria-label": "Grupos" });
  const railT = el("div", "railT");
  const stops = el("div", "stops");
  rail.append(railT, stops);
  const main = el("div", "main");
  body.append(rail, main);
  const toast = el("div", "toast", { role: "status" });

  container.append(hd, tools, body, toast);

  const isEtapa = () => ui.by === "etapa";
  const groupTitle = g => (isEtapa() ? `Etapa ${g.key} · ${g.label}` : g.label);

  function syncTools() {
    for (const b of bySeg.children) b.setAttribute("aria-pressed", b.dataset.by === ui.by);
    for (const b of typeSeg.children) b.setAttribute("aria-pressed", b.dataset.type === ui.type);
    hide.checked = ui.hide;
    srch.classList.toggle("has", !!q);
  }

  function renderBars() {
    for (const { fill, count, souls } of Object.values(barOf)) {
      const d = souls.filter(s => done.has(s.id)).length;
      fill.style.width = `${pct(d, souls.length)}%`;
      count.textContent = `${d}/${souls.length}`;
    }
  }

  /** Un cromo: el botón que marca y, encima y aparte, el de copiar el nombre. */
  function cromo(s) {
    const on = done.has(s.id);
    const slot = el("div", "slot");
    const b = el("button", `cromo ${s.t}${on ? " done" : ""}`, { type: "button", "aria-pressed": on, "data-id": s.id });
    const ring = el("span", "pic");
    ring.append(pic(s.img, null, true));
    const stamp = text("span", "stamp", "✓");
    stamp.setAttribute("aria-hidden", "true");
    b.append(stamp, ring, text("b", null, s.n), text("small", null, where(s)));
    const cpy = el("button", "cpy", { type: "button", "aria-label": `Copiar ${s.n}`, title: "Copiar nombre", "data-copy": s.id });
    cpy.innerHTML = COPY;
    slot.append(b, cpy);
    return slot;
  }

  function grid(list) {
    const g = el("div", "grid");
    g.append(...list.map(cromo));
    return g;
  }

  /** Dentro de una etapa, en el orden de la misión; dentro de una región, por subzona. */
  function soulsBody(list) {
    if (isEtapa()) return [grid(list)];
    const zones = new Map();
    for (const s of list) (zones.get(s.z) || zones.set(s.z, []).get(s.z)).push(s);
    return [...zones].sort((a, b) => a[0].localeCompare(b[0], "es")).flatMap(([name, ss]) => {
      const h = el("h4", "zone");
      h.append(text("span", null, name), text("small", null, `${ss.filter(s => done.has(s.id)).length}/${ss.length}`));
      return [h, grid(ss)];
    });
  }

  function renderRail(groups, sel, searching) {
    railT.textContent = isEtapa() ? "Etapas" : "Regiones";
    stops.replaceChildren(...groups.map(g => {
      const d = g.souls.filter(s => done.has(s.id)).length;
      const n = g.souls.length;
      const hits = searching ? g.souls.filter(s => !(ui.hide && done.has(s.id)) && matches(s, q)).length : 0;
      const b = el("button", `stop${isEtapa() ? "" : " r"}${d === n ? " full" : ""}${searching && !hits ? " none" : ""}`, { type: "button", "data-key": g.key });
      if (!searching && g.key === sel) b.setAttribute("aria-current", "true");
      b.setAttribute("aria-label", `${groupTitle(g)}: ${searching ? `${hits} ${hits === 1 ? "resultado" : "resultados"}` : `${d} de ${n}`}`);
      const lab = el("span", "lab");
      lab.append(text("span", null, g.label), searching ? text("small", "hit", `${hits}`) : text("small", null, `${d}/${n}`));
      const mini = el("span", "mini");
      const fill = el("i");
      fill.style.width = `${pct(d, n)}%`;
      mini.append(fill);
      // Las etapas llevan su número; las regiones no tienen orden, solo nombre
      if (isEtapa()) b.append(text("span", "num", `${g.key}`));
      b.append(lab, mini);
      return b;
    }));
  }

  function renderSearch(groups) {
    const out = [];
    for (const g of groups) {
      const hits = g.souls.filter(s => !(ui.hide && done.has(s.id)) && matches(s, q));
      if (!hits.length) continue;
      const h = el("h3", "res", { "data-group": g.key });
      h.append(text("b", null, groupTitle(g)), text("small", null, almas(hits.length)));
      out.push(h, ...soulsBody(hits));
    }
    if (!out.length) {
      const empty = el("div", "empty none");
      empty.append(text("b", null, "Sin resultados"), document.createTextNode(`Nada coincide con «${q.trim()}».`));
      out.push(empty);
    }
    main.replaceChildren(...out);
  }

  function renderGroup(groups, g) {
    const d = g.souls.filter(s => done.has(s.id)).length;
    const n = g.souls.length;
    const show = g.souls.filter(s => !(ui.hide && done.has(s.id)));
    const head = el("div", "stH");
    if (isEtapa()) head.append(text("span", "bigN", `${g.key}`));
    const tt = el("div");
    tt.append(text("h3", null, groupTitle(g)), text("small", null, `${d} de ${almas(n)}`));
    const ring = el("span", "ring", { "aria-hidden": "true" });
    ring.style.setProperty("--p", pct(d, n));
    ring.append(text("em", null, `${pct(d, n)}%`));
    head.append(tt, ring);
    const out = [head];
    if (!show.length) {
      const empty = el("div", "empty");
      empty.append(text("b", null, isEtapa() ? "Etapa completa" : "Región completa"),
        document.createTextNode("Todas sus almas están marcadas. Quita «Ocultar hechos» para verlas."));
      out.push(empty);
    } else out.push(...soulsBody(show));
    const i = groups.indexOf(g);
    const nav = el("div", "nav2");
    for (const [other, label, arrow] of [[groups[i - 1], "Anterior", "prev"], [groups[i + 1], "Siguiente", "next"]]) {
      const b = el("button", arrow, { type: "button" });
      b.textContent = arrow === "prev" ? `← ${other ? groupTitle(other) : label}` : `${other ? groupTitle(other) : label} →`;
      if (other) b.dataset.go = other.key;
      else b.disabled = true;
      nav.append(b);
    }
    out.push(nav);
    main.replaceChildren(...out);
  }

  /** Pinta las barras, el carril y las almas; el foco vuelve al cromo que lo tenía. */
  function render() {
    const focused = container.getRootNode().activeElement;
    const focusId = focused?.closest?.(".cromo")?.dataset.id;
    renderBars();
    syncTools();
    const groups = groupsOf(SOULS, ui.by, ui.type);
    // Si el grupo elegido ya no está (otro tipo), el primero que queda
    if (!groups.some(g => g.key === ui.sel[ui.by])) ui.sel[ui.by] = groups[0]?.key ?? null;
    const sel = ui.sel[ui.by];
    const searching = !!q.trim();
    renderRail(groups, sel, searching);
    if (searching) renderSearch(groups);
    else renderGroup(groups, groups.find(g => g.key === sel));
    if (focusId) main.querySelector(`.cromo[data-id="${focusId}"]`)?.focus({ preventScroll: true });
  }

  // --- Desplazarse sin quedar bajo la cabecera fija de la página (ni bajo el carril en móvil) ---
  function topOffset() {
    const page = parseFloat(getComputedStyle(host).getPropertyValue("--cosecha-top")) || 0;
    // En estrecho (≤700px, como el CSS) el carril es una fila pegada arriba y también tapa
    const sticky = container.clientWidth <= 700 ? rail.offsetHeight : 0;
    return page + sticky + 12;
  }
  function scrollToEl(node, onlyIfAbove) {
    const y = node.getBoundingClientRect().top - topOffset();
    if (onlyIfAbove && y >= 0) return;
    window.scrollTo({ top: window.scrollY + y, behavior: still.matches ? "auto" : "smooth" });
  }

  let toastTimer = 0;
  async function copy(name) {
    try {
      await navigator.clipboard.writeText(name);
    } catch {
      // Sin permiso del portapapeles (http, iframe): el truco de siempre
      const ta = Object.assign(document.createElement("textarea"), { value: name });
      document.body.append(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast.textContent = `Copiado: ${name}`;
    toast.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("on"), 1400);
  }

  const keyOf = v => (isEtapa() ? Number(v) : v);

  container.addEventListener("click", e => {
    const t = e.target;
    const cp = t.closest(".cpy");
    if (cp) {
      copy(SOULS.find(s => s.id === Number(cp.dataset.copy)).n);
      return;
    }
    const c = t.closest(".cromo");
    if (c) {
      const id = Number(c.dataset.id);
      if (done.has(id)) done.delete(id);
      else done.add(id);
      save();
      render();
      return;
    }
    const st = t.closest(".stop");
    if (st) {
      // Buscando, el carril lleva a los resultados de ese grupo
      if (q.trim()) {
        const res = main.querySelector(`.res[data-group="${CSS.escape(st.dataset.key)}"]`);
        if (res) scrollToEl(res);
        return;
      }
      ui.sel[ui.by] = keyOf(st.dataset.key);
      save();
      render();
      scrollToEl(main, true);
      return;
    }
    const go = t.closest("[data-go]");
    if (go) {
      ui.sel[ui.by] = keyOf(go.dataset.go);
      save();
      render();
      scrollToEl(main);
      return;
    }
    const by = t.closest("[data-by]");
    if (by) {
      ui.by = by.dataset.by;
      save();
      render();
      return;
    }
    const ty = t.closest("[data-type]");
    if (ty) {
      ui.type = ty.dataset.type;
      save();
      render();
      return;
    }
    if (t.closest(".x")) {
      q = input.value = "";
      render();
      input.focus();
      return;
    }
    if (t.closest(".reset") && confirm("¿Desmarcar todas las almas?")) {
      done.clear();
      save();
      render();
    }
  });

  input.addEventListener("input", () => {
    q = input.value;
    render();
  });
  hide.addEventListener("change", () => {
    ui.hide = hide.checked;
    save();
    render();
  });

  // «/» lleva a la búsqueda, como en la página anterior; no si ya se escribe en otro campo
  window.addEventListener("keydown", e => {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.composedPath()[0];
    if (target === input || target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    e.preventDefault();
    input.focus();
  });

  // Otra pestaña con la misma lista: se mantiene al día
  window.addEventListener("storage", e => {
    if (e.key !== DONE_KEY) return;
    done.clear();
    for (const id of parseDone(e.newValue)) done.add(id);
    render();
  });

  render();
}
