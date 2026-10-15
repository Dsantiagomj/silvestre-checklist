import { CATEGORIES, PREREQ_STEP, STEPS_WITH_ITEMS, aggregate, normText, rowMatches, rowName, rowsOf } from "../../lib/resources.js";
import { useLiveIds } from "../../lib/leaving.js";
import {
  PAGE_SIZES, rowHave, rowUsed, setShopPage, setShopPageSize, setShopPendingOnly, setShopQuery, setShopSort,
  setShopTab, setShopView, soonSteps,
  toggleRowOwned, useAppState,
} from "../../state/store.js";
import Slot from "./Slot.jsx";
import SearchField from "../SearchField.jsx";

const SORTS = [["soon", "Pronto primero"], ["qty", "Cantidad"], ["az", "A–Z"]];
const CATS = [["todo", "Todo"], ...CATEGORIES];
const byName = (a, b) => rowName(a).localeCompare(rowName(b), "es");

/**
 * Lo que muestra la pestaña de objetos, sin pintar nada: franjas, filas visibles
 * (categoría y búsqueda) y recuentos. Lo usan el panel y "Marcar todo"/"Limpiar".
 */
export function itemsView(s) {
  const q = normText(s.shopQuery.trim());
  // Las cantidades descuentan lo ya cogido para cada paso (por ejemplo, desde el diario)
  const had = (k, n) => rowHave(s, { k }, [n]);
  // Lo gastado (paso hecho o su prerrequisito completo) sale de lo pendiente; con el
  // filtro apagado se ve aparte, en «Ya utilizados», con la cantidad que se usó
  const used = (k, n) => rowUsed(s, k, n);
  const usedBand = s.shopPendingOnly ? [] : [{ id: "used", rows: aggregate(STEPS_WITH_ITEMS, null, (k, n) => !used(k, n)) }];
  let bands;
  if (s.shopSort === "soon") {
    const chips = soonSteps(s);
    const soon = chips.filter(n => STEPS_WITH_ITEMS.includes(n));
    bands = [
      // Por paso, en el orden de la guía: prerrequisitos, 1, 2, 3… (sort es estable:
      // dentro de un paso se queda el orden por categoría)
      { id: "soon", chips, rows: aggregate(soon, had, used).sort((a, b) => Math.min(...a.steps) - Math.min(...b.steps)) },
      { id: "later", rows: aggregate(STEPS_WITH_ITEMS.filter(n => !soon.includes(n)), had, used) },
      ...usedBand,
    ];
  } else {
    const rows = aggregate(STEPS_WITH_ITEMS, had, used);
    rows.sort(s.shopSort === "az" ? byName : (a, b) => (b.a[0][1] - a.a[0][1]) || byName(a, b));
    bands = [{ id: "all", rows }, ...usedBand];
  }
  // Recuentos por objeto distinto: Pepita en "Pronto" y en "Más adelante" cuenta una vez
  const all = new Map();
  for (const b of bands) for (const r of b.rows) all.set(r.k, r);
  const counts = { todo: 0 };
  let matches = 0;
  for (const r of all.values()) {
    const hit = rowMatches(r, q);
    if (hit) matches++;
    if (!q || hit) { counts.todo++; counts[r.c] = (counts[r.c] || 0) + 1; }
  }
  const inCat = r => s.shopTab === "todo" || r.c === s.shopTab;
  for (const b of bands) b.rows = b.rows.filter(inCat);
  // Al buscar, lo que coincide sube al principio de su franja: sin tener que bajar a
  // buscarlo entre lo atenuado (en la lista ya se filtra)
  if (q) for (const b of bands) b.rows = [...b.rows.filter(r => rowMatches(r, q)), ...b.rows.filter(r => !rowMatches(r, q))];
  // «Marcar todo»/«Limpiar» actúan sobre lo pendiente: lo gastado ya no se coge
  const visible = bands.filter(b => b.id !== "used").flatMap(b => b.rows).filter(r => rowMatches(r, q));
  return { q, bands, counts, total: all.size, matches, visible };
}

/**
 * Los pasos de «Pronto». Cada uno se marca cuando todo lo que pide está reunido; uno
 * que no pide nada se atenúa (marcarlo diría que está hecho).
 */
function SoonChips({ chips, s }) {
  return (
    <span className="band-steps">
      {chips.map(n => {
        const name = n === PREREQ_STEP ? "Prerrequisitos" : `Paso ${n}`;
        // Lo opcional (un prerrequisito o una misión que no hace falta) no la retiene
        const rows = rowsOf(n).filter(r => !r.x && !/opcional/i.test(r.g || ""));
        const done = rows.length > 0 && rows.every(r => rowHave(s, r, [n]));
        const title = !rows.length ? `${name}: sin objetos que reunir` : done ? `${name}: todo reunido` : name;
        return (
          <i key={n} className={!rows.length ? "empty" : done ? "done" : undefined} title={title}>
            {n === PREREQ_STEP ? "Pre" : n}
          </i>
        );
      })}
    </span>
  );
}

const VIEWS = [
  ["grid", "Cuadrícula", <svg key="g" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>],
  ["list", "Lista", <svg key="l" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" /></svg>],
];

/** Trozo de filas de la página actual; "all" las devuelve todas. */
function paginate(rows, page, size) {
  if (size === "all") return { rows, page: 0, pages: 1, from: rows.length ? 1 : 0, to: rows.length };
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(page, pages - 1);
  return { rows: rows.slice(p * size, (p + 1) * size), page: p, pages, from: rows.length ? p * size + 1 : 0,
    to: Math.min(rows.length, (p + 1) * size) };
}

/** 1 … 4 5 6 … 12: siempre la primera, la última y las vecinas de la actual. */
function pageNumbers(page, pages) {
  const keep = new Set([0, pages - 1, page - 1, page, page + 1].filter(n => n >= 0 && n < pages));
  const out = [];
  [...keep].sort((a, b) => a - b).forEach((n, i, arr) => {
    if (i && n - arr[i - 1] > 1) out.push("gap" + n);
    out.push(n);
  });
  return out;
}

function Pager({ id, total, view, size }) {
  const go = page => {
    setShopPage(page);
    // Si la cabecera de la lista quedó arriba, se vuelve a ella
    const top = document.getElementById(id);
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <nav className="pager" aria-label="Páginas de la lista">
      <span className="pager-range">{view.from}–{view.to} de {total}</span>
      {view.pages > 1 && (
        <div className="pager-pages">
          <button type="button" data-page="prev" aria-label="Página anterior" disabled={view.page === 0}
            onClick={() => go(view.page - 1)}>‹</button>
          {pageNumbers(view.page, view.pages).map(n => typeof n === "string"
            ? <span key={n} className="pager-gap">…</span>
            : <button key={n} type="button" data-page={n} aria-current={n === view.page ? "page" : undefined}
                onClick={() => go(n)}>{n + 1}</button>)}
          <button type="button" data-page="next" aria-label="Página siguiente" disabled={view.page >= view.pages - 1}
            onClick={() => go(view.page + 1)}>›</button>
        </div>
      )}
      <div className="pager-size">
        <span>Por página</span>
        <div className="seg" role="group" aria-label="Objetos por página">
          {PAGE_SIZES.map(n => (
            <button key={n} type="button" data-size={n} aria-pressed={String(size === n)}
              onClick={() => setShopPageSize(n)}>{n === "all" ? "Todo" : n}</button>
          ))}
        </div>
      </div>
    </nav>
  );
}

function Slots({ rows, band, s, q, later }) {
  const list = s.shopView === "list";
  return (
    <div className={"slots" + (list ? " list" : "")}>
      {rows.map(r => {
        const hit = q && rowMatches(r, q);
        return (
          <Slot key={r.k} row={r} band={band} have={rowHave(s, r)} dim={!!q && !hit} match={!!hit}
            later={later?.get(r.k) || 0} list={list} onToggle={toggleRowOwned} />
        );
      })}
    </div>
  );
}

/** OBJETOS NECESARIOS · inventario con buscador, categorías y la franja "Pronto". */
export default function ItemsPanel({ searchRef }) {
  const live = useLiveIds();
  const s = useAppState();
  const { q, bands, counts, total, matches } = itemsView(s);
  const soon = bands.find(b => b.id === "soon");
  const later = bands.find(b => b.id === "later");
  // Lo que queda de cada objeto después de los próximos pasos
  const laterQty = later && new Map(later.rows.map(r => [r.k, r.a[0][1]]));
  // En la lista, la búsqueda filtra (atenuar filas repartidas en páginas no sirve) y se pagina
  const list = s.shopView === "list";
  const shown = b => (b ? (list && q ? b.rows.filter(r => rowMatches(r, q)) : b.rows) : []);
  const soonRows = shown(soon);
  const laterRows = shown(later);
  const all = bands.find(b => b.id === "all");
  const allRows = shown(all);
  const page = rows => (list ? paginate(rows, s.shopPage, s.shopPageSize) : { rows });
  const laterView = page(laterRows);
  const allView = page(allRows);
  const usedRows = shown(bands.find(b => b.id === "used"));
  const empty = !soonRows.length && !laterRows.length && !allRows.length && !usedRows.length;

  return (
    <div className="needs-panel items-panel" id={live("items")} role="tabpanel" aria-labelledby={live("tabItems")}>
      <div className="needs-toolbar">
        <SearchField className="needs-find" id={live("needsSearch")} matchesId={live("needsMatches")} clearId={live("needsSearchClear")} inputRef={searchRef} value={s.shopQuery} onChange={setShopQuery}
          placeholder="Buscar objeto" label="Buscar objeto" matches={matches} total={total}
          hint={<kbd title="Atajo para buscar">/</kbd>} />
        <div className="needs-sort seg" role="group" aria-label="Ordenar">
          {SORTS.map(([k, label]) => (
            <button key={k} type="button" data-sort={k} aria-pressed={String(s.shopSort === k)}
              onClick={() => setShopSort(k)}>{label}</button>
          ))}
        </div>
        <div className="needs-view seg" role="group" aria-label="Vista">
          {VIEWS.map(([k, label, icon]) => (
            <button key={k} type="button" data-view={k} aria-pressed={String(s.shopView === k)}
              onClick={() => setShopView(k)}>{icon}{label}</button>
          ))}
        </div>
        <label className="toggle">
          <input type="checkbox" id={live("shopPendingToggle")} checked={s.shopPendingOnly}
            onChange={e => setShopPendingOnly(e.target.checked)} />
          <span className="sw"></span>
          Solo pasos pendientes
        </label>
      </div>

      <div className="items-body">
        <div className="needs-cats" role="group" aria-label="Categorías">
          {CATS.map(([k, label]) => (
            <button key={k} type="button" className={"needs-cat" + (q && counts[k] ? " hit" : "")} data-cat={k}
              aria-pressed={String(s.shopTab === k)} onClick={() => setShopTab(k)}>
              {label}<span className="n">{counts[k] || 0}</span>
            </button>
          ))}
        </div>

        <div className="needs-main" key={s.shopEpoch}>
          {empty && (
            <p className="needs-empty">{list && q ? `Nada coincide con «${s.shopQuery.trim()}».` : "Nada pendiente en esta categoría."}</p>
          )}

          {soonRows.length > 0 && (
            <section className="band soon" id={live("bandSoon")} aria-labelledby={live("bandSoonTitle")}>
              <div className="band-h">
                <span className="band-pill">Pronto</span>
                <b id={live("bandSoonTitle")}>Tus próximos pasos</b>
                <em>· {soonRows.length} objetos</em>
                <SoonChips chips={soon.chips} s={s} />
              </div>
              <Slots rows={soonRows} band="soon" s={s} q={q} later={laterQty} />
            </section>
          )}

          {laterRows.length > 0 && (
            <section className="band later" id={live("bandLater")} aria-label="Más adelante">
              <p className="later-h">Más adelante · {laterRows.length} objetos</p>
              <Slots rows={laterView.rows} band="later" s={s} q={q} />
              {list && <Pager id="bandLater" total={laterRows.length} view={laterView} size={s.shopPageSize} />}
            </section>
          )}

          {allRows.length > 0 && (
            <section className="band all" id={live("bandAll")} aria-label="Objetos">
              <Slots rows={allView.rows} band="all" s={s} q={q} />
              {list && <Pager id="bandAll" total={allRows.length} view={allView} size={s.shopPageSize} />}
            </section>
          )}

          {usedRows.length > 0 && (
            <section className="band used" id={live("bandUsed")} aria-label="Ya utilizados">
              <p className="later-h">Ya utilizados · {usedRows.length} objetos</p>
              <Slots rows={usedRows} band="used" s={s} q={q} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
