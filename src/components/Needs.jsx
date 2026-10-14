import { useEffect, useRef, useState } from "react";
import { ALL_PREREQS } from "../data/steps.js";
import { HERO_ICONS, imgUrl } from "../lib/assets.js";
import { ALL_ROWS, CATEGORIES, RES_ITEMS, STEPS_WITH_ITEMS, aggregate, rowName } from "../lib/resources.js";
import {
  getState, guideComplete, ownedCount, prereqsDone, restoreMarks, rowHave, setAllPrereqs, setNeedsCollapsed, setNeedsTab,
  setRowsOwned, showToast, soonSteps,
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

// Resumen de lo reunido: se calcula una vez, es la guía entera
const fmt = new Intl.NumberFormat("es", { useGrouping: "always" });
const UNITS = ALL_ROWS.reduce((n, r) => n + r.a[0][1], 0);
const TOP = [...ALL_ROWS].sort((a, b) => b.a[0][1] - a.a[0][1]).slice(0, 6);
const BY_CAT = CATEGORIES.map(([k, label]) => [label.toLowerCase(), ALL_ROWS.filter(r => r.c === k)
  .reduce((n, r) => n + r.a[0][1], 0)]).filter(([, n]) => n > 0);

/**
 * Con la guía completa: una franja que confirma que está todo, que se despliega en el
 * resumen de lo reunido y, desde ahí, en las listas completas.
 */
function DoneStrip({ level, setLevel }) {
  return (
    <>
      <div className="needs-done">
        <span className="needs-done-ok" aria-hidden="true">✓</span>
        <div className="needs-done-head">
          <h2 className="section-title" id="needsTitle"><span className="section-num">01</span>Lo que necesitas</h2>
          <p className="needs-done-title">Todo reunido</p>
        </div>
        <span className="needs-done-chip">
          {HERO_ICONS?.prereqs && <img src={imgUrl(HERO_ICONS.prereqs)} alt="" />}{ALL_PREREQS.length} prerrequisitos
        </span>
        <span className="needs-done-chip">
          {HERO_ICONS?.items && <img src={imgUrl(HERO_ICONS.items)} alt="" />}{ALL_ROWS.length} objetos
        </span>
        <div className="spacer"></div>
        <button type="button" className="needs-done-toggle" id="needsShowSummary" aria-expanded={String(level === "summary")}
          onClick={() => setLevel(level === "summary" ? "strip" : "summary")}>
          {level === "summary" ? "Ocultar resumen ▴" : "Ver resumen ▾"}
        </button>
      </div>
      {level === "summary" && (
        <div className="needs-summary">
          <div className="needs-sum-big">
            <b className="needs-sum-total">{fmt.format(UNITS)}</b>
            <span>unidades reunidas<br />en {ALL_ROWS.length} objetos distintos</span>
          </div>
          <ol className="needs-sum-top" aria-label="Lo que más pesó">
            {TOP.map(r => (
              <li key={r.k}>
                {RES_ITEMS[r.a[0][0]].img && <img src={imgUrl(RES_ITEMS[r.a[0][0]].img)} alt="" />}
                <b>{fmt.format(r.a[0][1])}</b>
                <span>{rowName(r)}</span>
              </li>
            ))}
          </ol>
          <p className="needs-sum-cats">
            {BY_CAT.map(([label, n]) => <span key={label}><b>{fmt.format(n)}</b> {n === 1 ? label.replace(/s$/, "") : label}</span>)}
            <span><b>{ALL_PREREQS.length}</b> prerrequisitos</span>
          </p>
          <button type="button" className="needs-act" id="needsShowLists" onClick={() => setLevel("lists")}>
            Ver listas completas
          </button>
        </div>
      )}
    </>
  );
}

const SOON_ICONS = 6;

function Meter({ label, done, total }) {
  return (
    <span className="needs-meter">
      <span>{label}</span><b>{done}/{total}</b>
      <span className="needs-meter-bar" aria-hidden="true"><i style={{ width: `${(done / total) * 100}%` }}></i></span>
    </span>
  );
}

/**
 * Contraída a mano antes de terminar: lo que piden tus próximos pasos (con sus iconos)
 * y cómo vas. Toda la tarjeta la despliega.
 */
function ProgressStrip({ s }) {
  const soon = aggregate(soonSteps(s).filter(n => STEPS_WITH_ITEMS.includes(n))).filter(r => !rowHave(s, r));
  const icons = soon.slice(0, SOON_ICONS);
  return (
    <>
      <h2 className="sr-only" id="needsTitle">Lo que necesitas</h2>
      <button type="button" className="needs-strip" id="needsExpand" aria-expanded="false"
        onClick={() => setNeedsCollapsed(false)}>
        <span className="needs-strip-head">
          <span className="section-title" aria-hidden="true"><span className="section-num">01</span>Lo que necesitas</span>
          <span className="needs-strip-title">
            {soon.length ? `Pronto: ${soon.length} objetos para tus próximos pasos` : "Nada que reunir para tus próximos pasos"}
          </span>
        </span>
        <span className="needs-strip-icons" aria-hidden="true">
          {icons.map(r => {
            const it = RES_ITEMS[r.a[0][0]];
            return it.img ? <img key={r.k} src={imgUrl(it.img)} alt="" title={rowName(r)} /> : null;
          })}
          {soon.length > icons.length && <span className="more">+{soon.length - icons.length}</span>}
        </span>
        <span className="needs-meters">
          <Meter label="Prerrequisitos" done={prereqsDone(s)} total={ALL_PREREQS.length} />
          <Meter label="Objetos" done={ownedCount(s)} total={ALL_ROWS.length} />
        </span>
        <span className="needs-strip-go">Mostrar <i aria-hidden="true">▾</i></span>
      </button>
    </>
  );
}

/**
 * LO QUE NECESITAS · prerrequisitos y objetos en una sección con dos pestañas.
 * "Marcar todo" y "Limpiar" actúan sobre lo que se ve y se pueden deshacer.
 */
export default function Needs() {
  const s = useAppState();
  const searchRef = useRef(null);
  // Con la guía completa: strip (franja) | summary (resumen) | lists (como siempre)
  const [doneLevel, setDoneLevel] = useState("strip");
  const complete = guideComplete(s);
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
      // Contraída (a mano o por estar completa) no hay buscador: se despliega
      setDoneLevel("lists");
      setNeedsCollapsed(false);
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

  // Actúan sobre la pestaña abierta: van con su lista, no en la cabecera de la sección
  const actions = (
    <div className="needs-actions">
      <button type="button" className="needs-act mark" id="needsMarkAll" disabled={!canMark} onClick={() => act(true)}>
        ✓ Marcar todo
      </button>
      <button type="button" className="needs-act clear" id="needsClear" disabled={!canClear} onClick={() => act(false)}>
        Limpiar
      </button>
    </div>
  );

  if (!complete && s.needsCollapsed) {
    return (
      <section className="needs done" id="needs" aria-labelledby="needsTitle">
        <ProgressStrip s={s} />
      </section>
    );
  }

  if (complete && doneLevel !== "lists") {
    return (
      <section className="needs done" id="needs" aria-labelledby="needsTitle">
        <DoneStrip level={doneLevel} setLevel={setDoneLevel} />
      </section>
    );
  }

  return (
    <section className="needs" id="needs" aria-labelledby="needsTitle">
      <div className="needs-head">
        <h2 className="section-title" id="needsTitle"><span className="section-num">01</span>Lo que necesitas</h2>
        <div className="spacer"></div>
        <button type="button" className="needs-hide" id="needsCollapse" aria-expanded="true"
          onClick={() => (complete ? setDoneLevel("strip") : setNeedsCollapsed(true))}>Ocultar <i aria-hidden="true">▴</i></button>
      </div>
      <div className="needs-tabs" role="tablist" aria-label="Lo que necesitas">
        <Tab id="tabPrereqs" tab="prereqs" active={tab === "prereqs"} icon={HERO_ICONS?.prereqs} name="Prerrequisitos"
          done={preDone} total={ALL_PREREQS.length} hint="antes de empezar" />
        <Tab id="tabItems" tab="items" active={tab === "items"} icon={HERO_ICONS?.items} name="Objetos necesarios"
          done={ownedCount(s)} total={ALL_ROWS.length} hint="para los pasos pendientes" />
      </div>
      <p className="needs-hint" id="needsHint">
        {tab === "prereqs"
          ? "«Marcar todo» marca los 18 prerrequisitos y «Limpiar» los desmarca. Las dos se pueden deshacer."
          : "«Marcar todo» y «Limpiar» actúan sobre lo que ves: la categoría y la búsqueda actuales. «Limpiar» solo quita lo que marcaste a mano; lo que cubren los pasos ya hechos sigue contando."}
      </p>
      {tab === "prereqs" ? <PrereqsPanel actions={actions} /> : <ItemsPanel searchRef={searchRef} actions={actions} />}
    </section>
  );
}
