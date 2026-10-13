import { useEffect, useRef, useState } from "react";
import { STEPS } from "../data/steps.js";
import { ITEMS, assetsFor, imgUrl, mergeItems } from "../lib/assets.js";
import { setShopPendingOnly, setShopTab, toggleOwned, useAppState } from "../state/store.js";

// ============================================================================
// OBJETOS NECESARIOS · lista agregada de todo lo que piden los pasos
// ============================================================================
const SHOP_TABS = [
  ["todo", "Todo"], ["recursos", "Recursos"], ["consumibles", "Consumibles"],
  ["equipables", "Equipables"], ["otros", "Otros"],
];
const CAT_ORDER = { recursos: 0, consumibles: 1, equipables: 2, otros: 3 };

function shopRows(s) {
  const rows = [];
  for (const st of STEPS) {
    if (s.shopPendingOnly && s.done[st.n]) continue;
    rows.push(...(assetsFor(st.n)?.items || []));
  }
  return mergeItems(rows)
    .map(([id, q]) => ({ id, q, ...ITEMS[id] }))
    .sort((a, b) => (CAT_ORDER[a.cat] - CAT_ORDER[b.cat]) || a.name.localeCompare(b.name, "es"));
}

export default function Shop() {
  const s = useAppState();
  const all = shopRows(s);
  const counts = { todo: all.length };
  all.forEach(r => { counts[r.cat] = (counts[r.cat] || 0) + 1; });
  const list = all.filter(r => s.shopTab === "todo" || r.cat === s.shopTab);
  const owned = list.filter(r => s.owned[r.id]).length;
  const scope = s.shopPendingOnly ? "los pasos pendientes" : "los 100 pasos";

  const [copyLabel, setCopyLabel] = useState(null);
  const copyTimer = useRef();
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  async function copyList() {
    const lines = list.filter(r => !s.owned[r.id]).map(r => `${r.q}x ${r.name}`);
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
          ? `${list.length} objetos · ${owned} conseguidos · toca uno para marcarlo. Sale de los logros y misiones de ${scope}.`
          : ""}
      </p>
      {/* key: se remonta (y repite la animación de entrada) solo cuando la versión
          vanilla repintaba la lista entera; marcar un objeto no la repite. */}
      <div className="shop-grid" id="shopGrid" key={s.shopEpoch}>
        {list.length ? list.map((r, i) => (
          <button key={r.id} className={"shop-item" + (s.owned[r.id] ? " owned" : "")} data-id={r.id}
            style={{ "--i": Math.min(i, 40) }} aria-pressed={String(!!s.owned[r.id])}
            onClick={() => toggleOwned(String(r.id))}>
            {r.img && <img src={imgUrl(r.img)} alt="" loading="lazy" />}
            <span className="meta">
              <span className="name">{r.name}</span>
              <span className="type">{`${r.type} · nv. ${r.lvl}`}</span>
            </span>
            <span className="q">{`×${r.q}`}</span>
          </button>
        )) : <p className="shop-empty">Nada pendiente en esta categoría.</p>}
      </div>
    </section>
  );
}
