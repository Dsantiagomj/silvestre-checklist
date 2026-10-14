import { useEffect, useRef } from "react";
import { ALL_PREREQS } from "../data/steps.js";
import { HERO_ICONS, imgUrl } from "../lib/assets.js";
import { ALL_ROWS } from "../lib/resources.js";
import {
  getState, ownedCount, prereqsDone, restoreMarks, rowHave, setAllPrereqs, setNeedsTab, setRowsOwned, showToast,
  useAppState,
} from "../state/store.js";
import ItemsPanel, { itemsView } from "./needs/ItemsPanel.jsx";
import PrereqsPanel from "./needs/PrereqsPanel.jsx";

function Tab({ id, tab, active, icon, name, done, total, hint }) {
  const complete = done === total;
  return (
    <button type="button" role="tab" id={id} aria-selected={String(active)} aria-controls={tab === "prereqs" ? "prereqs" : "items"}
      className={"needs-tab" + (complete ? " complete" : "")} onClick={() => setNeedsTab(tab)}>
      {icon && <img src={imgUrl(icon)} alt="" />}
      <span className="needs-tab-meta">
        <span className="needs-tab-name">{name}</span>
        <span className="needs-tab-count">
          <span id={tab === "prereqs" ? "prereqsCount" : "itemsCount"}><b>{done}</b>/{total}</span>
          <span className="needs-tab-hint">{hint}</span>
        </span>
      </span>
      <span className="needs-tab-bar" aria-hidden="true"><i style={{ width: `${(done / total) * 100}%` }}></i></span>
    </button>
  );
}

/**
 * LO QUE NECESITAS · prerrequisitos y objetos en una sección con dos pestañas.
 * "Marcar todo" y "Limpiar" actúan sobre lo que se ve y se pueden deshacer.
 */
export default function Needs() {
  const s = useAppState();
  const searchRef = useRef(null);
  const tab = s.needsTab;
  const items = tab === "items" ? itemsView(s) : null;
  const toMark = tab === "items" ? items.visible.filter(r => !rowHave(s, r)) : null;
  const toClear = tab === "items" ? items.visible.filter(r => rowHave(s, r)) : null;

  // "/" lleva al buscador de objetos desde cualquier parte de la página
  useEffect(() => {
    const onKey = e => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
      e.preventDefault();
      setNeedsTab("items");
      requestAnimationFrame(() => {
        searchRef.current?.focus();
        searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function act(on) {
    const before = getState();
    if (tab === "prereqs") {
      setAllPrereqs(on);
      showToast(on ? "Prerrequisitos marcados." : "Prerrequisitos limpiados.", "Deshacer",
        () => restoreMarks(before.owned, before.prereqs));
      return;
    }
    const rows = on ? toMark : toClear;
    setRowsOwned(rows, on);
    const n = rows.length;
    showToast(`${on ? "Marcados" : "Limpiados"} ${n} ${n === 1 ? "objeto" : "objetos"}.`, "Deshacer",
      () => restoreMarks(before.owned, before.prereqs));
  }

  const preDone = prereqsDone(s);
  const canMark = tab === "prereqs" ? preDone < ALL_PREREQS.length : toMark.length > 0;
  const canClear = tab === "prereqs" ? Object.keys(s.prereqs).length > 0 : toClear.length > 0;

  return (
    <section className="needs" id="needs" aria-labelledby="needsTitle">
      <div className="needs-head">
        <h2 className="section-title" id="needsTitle"><span className="section-num">01</span>Lo que necesitas</h2>
        <div className="spacer"></div>
        <button type="button" className="needs-act mark" id="needsMarkAll" disabled={!canMark} onClick={() => act(true)}>
          ✓ Marcar todo
        </button>
        <button type="button" className="needs-act clear" id="needsClear" disabled={!canClear} onClick={() => act(false)}>
          Limpiar
        </button>
      </div>
      <p className="needs-hint" id="needsHint">
        {tab === "prereqs"
          ? "«Marcar todo» marca los 18 prerrequisitos y «Limpiar» los desmarca. Las dos se pueden deshacer."
          : "«Marcar todo» y «Limpiar» actúan sobre lo que ves: la categoría y la búsqueda actuales. «Limpiar» solo quita lo que marcaste a mano; lo que cubren los pasos ya hechos sigue contando."}
      </p>
      <div className="needs-tabs" role="tablist" aria-label="Lo que necesitas">
        <Tab id="tabPrereqs" tab="prereqs" active={tab === "prereqs"} icon={HERO_ICONS?.prereqs} name="Prerrequisitos"
          done={preDone} total={ALL_PREREQS.length} hint="antes de empezar" />
        <Tab id="tabItems" tab="items" active={tab === "items"} icon={HERO_ICONS?.items} name="Objetos necesarios"
          done={ownedCount(s)} total={ALL_ROWS.length} hint="para los pasos pendientes" />
      </div>
      {tab === "prereqs" ? <PrereqsPanel /> : <ItemsPanel searchRef={searchRef} />}
    </section>
  );
}
