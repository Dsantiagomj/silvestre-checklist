import { useEffect, useRef, useState } from "react";
import { imgUrl } from "../lib/assets.js";
import {
  ALL_ROWS, CATEGORIES, RES_ITEMS, STEPS_WITH_ITEMS, aggregate, rowName, rowQty,
} from "../lib/resources.js";
import { rowHave, setShopPendingOnly, setShopTab, stepCovered, toggleOwned, useAppState } from "../state/store.js";

// ============================================================================
// OBJETOS NECESARIOS · la lista de torrentearcano, sumada sobre los pasos
// ============================================================================
const SHOP_TABS = [["todo", "Todo"], ...CATEGORIES];

/** Lo que piden los pasos aún sin hacer (prerrequisitos incluidos), o la guía entera. */
function shopRows(s) {
  if (!s.shopPendingOnly) return ALL_ROWS;
  return aggregate(STEPS_WITH_ITEMS.filter(n => !stepCovered(s, n)));
}

/** Icono de un objeto; los que DofusDB no tiene llevan un hueco con interrogación. */
export function ItemArt({ id }) {
  const it = RES_ITEMS[id];
  return it.img
    ? <img src={imgUrl(it.img)} alt="" loading="lazy" />
    : <span className="item-unknown" aria-hidden="true">?</span>;
}

/** "Recurso · nv. 20" si es un objeto conocido; nada para alternativas o desconocidos. */
function rowType(row) {
  if (row.a.length > 1) return "Cualquiera de los dos";
  const it = RES_ITEMS[row.a[0][0]];
  return it.type ? `${it.type} · nv. ${it.lvl}` : "";
}

export default function Shop() {
  const s = useAppState();
  const all = shopRows(s);
  const counts = { todo: all.length };
  all.forEach(r => { counts[r.c] = (counts[r.c] || 0) + 1; });
  const list = all.filter(r => s.shopTab === "todo" || r.c === s.shopTab);
  const have = r => rowHave(s, r);
  const owned = list.filter(have).length;
  const scope = s.shopPendingOnly ? "los pasos pendientes" : "los 100 pasos";

  const [copyLabel, setCopyLabel] = useState(null);
  const copyTimer = useRef();
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  async function copyList() {
    const lines = list.filter(r => !have(r)).map(r => `${rowQty(r)} x ${rowName(r)}`);
    const text = lines.join("\n");
    let label = "Copiar lista";
    try {
      await navigator.clipboard.writeText(text);
      label = `Copiados ${lines.length}`;
    } catch {
      // Sin permiso de portapapeles (p. ej. file://): al menos que se pueda copiar a mano.
      window.prompt("Copia la lista:", text);
    }
    setCopyLabel(label);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyLabel(null), 1800);
  }

  return (
    <section className="shop" id="shop" aria-label="Objetos necesarios">
      <div className="shop-head">
        <h2 className="section-title"><span className="section-num">02</span>Objetos necesarios</h2>
        <div className="spacer"></div>
        <label className="toggle">
          <input type="checkbox" id="shopPendingToggle" checked={s.shopPendingOnly}
            onChange={e => setShopPendingOnly(e.target.checked)} />
          <span className="sw"></span>
          Solo pasos pendientes
        </label>
        <button className={"btn-ghost" + (copyLabel ? " ok" : "")} id="shopCopy" onClick={copyList}>
          {copyLabel || "Copiar lista"}
        </button>
      </div>
      <div className="shop-tabs" id="shopTabs" role="tablist">
        {SHOP_TABS.map(([k, label]) => (
          <button key={k} className="shop-tab" role="tab" data-tab={k} aria-selected={String(s.shopTab === k)}
            onClick={() => setShopTab(k)}>
            {label}<span className="n">{counts[k] || 0}</span>
          </button>
        ))}
      </div>
      <p className="shop-sub" id="shopSub">
        {list.length
          ? `${list.length} objetos · ${owned} conseguidos · toca uno para marcarlo. Es la lista de torrentearcano para ${scope}.`
          : ""}
      </p>
      {/* key: se remonta (y repite la animación de entrada) solo cuando la versión
          vanilla repintaba la lista entera; marcar un objeto no la repite. */}
      <div className="shop-grid" id="shopGrid" key={s.shopEpoch}>
        {list.length ? list.map((r, i) => (
          <button key={r.k} className={"shop-item" + (have(r) ? " owned" : "")} data-id={r.k}
            style={{ "--i": Math.min(i, 40) }} aria-pressed={String(have(r))}
            onClick={() => toggleOwned(r.k)}>
            <span className={"art" + (r.a.length > 1 ? " alt" : "")}>
              {r.a.map(([id]) => <ItemArt key={id} id={id} />)}
            </span>
            <span className="meta">
              <span className="name">{rowName(r)}</span>
              <span className="type">
                {/* Una línea: la etiqueta de grupo manda; si no, la nota o el tipo */}
                {r.g ? <span className="tag">{r.g}</span> : r.n ? <span className="note">{r.n}</span> : rowType(r)}
              </span>
            </span>
            <span className="q">{`×${rowQty(r)}`}</span>
          </button>
        )) : <p className="shop-empty">Nada pendiente en esta categoría.</p>}
      </div>
    </section>
  );
}
