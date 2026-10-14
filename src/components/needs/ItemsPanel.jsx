import { CATEGORIES, PREREQ_STEP, STEPS_WITH_ITEMS, aggregate, normText, rowMatches, rowName } from "../../lib/resources.js";
import {
  pendingItemSteps, rowHave, setShopPendingOnly, setShopQuery, setShopSort, setShopTab, setShopView, soonSteps,
  toggleRowOwned, useAppState,
} from "../../state/store.js";
import Slot from "./Slot.jsx";

const SORTS = [["soon", "Pronto primero"], ["qty", "Cantidad"], ["az", "A–Z"]];
const CATS = [["todo", "Todo"], ...CATEGORIES];
const byName = (a, b) => rowName(a).localeCompare(rowName(b), "es");

/**
 * Lo que muestra la pestaña de objetos, sin pintar nada: franjas, filas visibles
 * (categoría y búsqueda) y recuentos. Lo usan el panel y "Marcar todo"/"Limpiar".
 */
export function itemsView(s) {
  const q = normText(s.shopQuery.trim());
  const scope = s.shopPendingOnly ? pendingItemSteps(s) : STEPS_WITH_ITEMS;
  let bands;
  if (s.shopSort === "soon") {
    const chips = soonSteps(s);
    const soon = chips.filter(n => STEPS_WITH_ITEMS.includes(n));
    bands = [
      { id: "soon", chips, rows: aggregate(soon) },
      { id: "later", rows: aggregate(scope.filter(n => !soon.includes(n))) },
    ];
  } else {
    const rows = aggregate(scope);
    rows.sort(s.shopSort === "az" ? byName : (a, b) => (b.a[0][1] - a.a[0][1]) || byName(a, b));
    bands = [{ id: "all", rows }];
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
  const visible = bands.flatMap(b => b.rows).filter(r => rowMatches(r, q));
  return { q, bands, counts, total: all.size, matches, visible };
}

function SoonChips({ chips }) {
  return (
    <span className="band-steps">
      {chips.map(n => <i key={n}>{n === PREREQ_STEP ? "Pre" : n}</i>)}
    </span>
  );
}

const VIEWS = [
  ["grid", "Cuadrícula", <svg key="g" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>],
  ["list", "Lista", <svg key="l" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" /></svg>],
];

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
  const s = useAppState();
  const { q, bands, counts, total, matches } = itemsView(s);
  const soon = bands.find(b => b.id === "soon");
  const later = bands.find(b => b.id === "later");
  // Lo que queda de cada objeto después de los próximos pasos
  const laterQty = later && new Map(later.rows.map(r => [r.k, r.a[0][1]]));
  const empty = bands.every(b => !b.rows.length);

  return (
    <div className="needs-panel items-panel" id="items" role="tabpanel" aria-labelledby="tabItems">
      <div className="needs-toolbar">
        <div className="needs-find">
          <svg className="needs-find-ic" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6" /><path d="M10.4 10.4 14 14" /></svg>
          <input ref={searchRef} type="search" id="needsSearch" value={s.shopQuery} autoComplete="off"
            placeholder="Buscar objeto" aria-label="Buscar objeto"
            onChange={e => setShopQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Escape") setShopQuery(""); }} />
          <span className="needs-find-end">
            {q ? (
              <>
                <span id="needsMatches"><b>{matches}</b> de {total}</span>
                <button type="button" className="needs-find-x" id="needsSearchClear" aria-label="Borrar búsqueda"
                  onClick={() => { setShopQuery(""); searchRef.current?.focus(); }}>×</button>
              </>
            ) : <kbd title="Atajo para buscar">/</kbd>}
          </span>
        </div>
        <div className="needs-sort" role="group" aria-label="Ordenar">
          {SORTS.map(([k, label]) => (
            <button key={k} type="button" data-sort={k} aria-pressed={String(s.shopSort === k)}
              onClick={() => setShopSort(k)}>{label}</button>
          ))}
        </div>
        <div className="needs-view" role="group" aria-label="Vista">
          {VIEWS.map(([k, label, icon]) => (
            <button key={k} type="button" data-view={k} aria-pressed={String(s.shopView === k)}
              onClick={() => setShopView(k)}>{icon}{label}</button>
          ))}
        </div>
        <label className="toggle">
          <input type="checkbox" id="shopPendingToggle" checked={s.shopPendingOnly}
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
          {empty && <p className="needs-empty">Nada pendiente en esta categoría.</p>}

          {soon && soon.rows.length > 0 && (
            <section className="band soon" id="bandSoon" aria-labelledby="bandSoonTitle">
              <div className="band-h">
                <span className="band-pill">Pronto</span>
                <b id="bandSoonTitle">Tus próximos pasos</b>
                <em>· {soon.rows.length} objetos</em>
                <SoonChips chips={soon.chips} />
              </div>
              <Slots rows={soon.rows} band="soon" s={s} q={q} later={laterQty} />
            </section>
          )}

          {later && later.rows.length > 0 && (
            <section className="band later" id="bandLater" aria-label="Más adelante">
              <p className="later-h">Más adelante · {later.rows.length} objetos</p>
              <Slots rows={later.rows} band="later" s={s} q={q} />
            </section>
          )}

          {bands[0].id === "all" && bands[0].rows.length > 0 && (
            <Slots rows={bands[0].rows} band="all" s={s} q={q} />
          )}
        </div>
      </div>
    </div>
  );
}
