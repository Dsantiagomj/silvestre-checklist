import { useLayoutEffect, useRef, useState } from "react";
import { STEPS, ZONE_COLOR } from "../data/steps.js";
import { currentQuest, questsOf } from "../lib/quests.js";
import { rowsOf } from "../lib/resources.js";
import { stepCalls, stepTitle } from "../lib/journal.js";
import {
  moveObjective, moveQuest, overlayGo, overlayStep, progressPct, rowHave, useAppState,
} from "../state/store.js";
import { Objectives } from "../components/StepParts.jsx";
import { Actions, Call, CurrentQuestDone, GuideCalls, Needs, Quests, Tri } from "../components/Journal.jsx";
import { stepGuide } from "../lib/guides.js";
import { WinBadge } from "../components/Diary.jsx";

const TAB_KEY = "silvestre:overlayTab";
const TABS = [["now", "Ahora"], ["quests", "Misiones"], ["items", "Objetos"], ["guide", "Guía"]];
const readTab = () => {
  const t = localStorage.getItem(TAB_KEY);
  return TABS.some(([k]) => k === t) ? t : "now";
};

/** «Guía ↗», a la guía del paso en Torrente Arcano (stepGuide), en otra pestaña. */
function GuideLink({ step, s }) {
  const href = stepGuide(step, s.questsLoaded ? questsOf(step.n) : []);
  return href ? (
    <a className="q-guide ov-guide-link" href={href} target="_blank" rel="noopener" title="Guía del paso en Torrente Arcano">Guía</a>
  ) : null;
}

/**
 * Las flechas ‹ › entre los objetivos de la misión. La siguiente no pasa del último: ahí
 * lo que queda es completarlo («Completar objetivo»), que termina la misión.
 */
function ObjArrow({ cur, dir }) {
  const prev = dir === "prev";
  return (
    <button type="button" className="ov-q ov-o" data-o={prev ? "-1" : "1"} aria-label={prev ? "Objetivo anterior" : "Objetivo siguiente"}
      disabled={prev ? cur.k === 0 : cur.k >= cur.objs.length - 1} onClick={() => moveObjective(prev ? -1 : 1)}>
      <Tri dir={dir} />
    </button>
  );
}

/** «✓ Completar objetivo»: lo da por hecho y pasa al siguiente; tras el último, termina la misión. */
function ObjButton({ cur }) {
  return (
    <button type="button" className="gbtn go" disabled={!cur} onClick={() => moveObjective(1)}
      title="Da el objetivo por hecho y pasa al siguiente; tras el último, termina la misión">✓ Completar objetivo</button>
  );
}

/** "Objetivo 3 / 12 · misión 1 de 2", con las flechas para cambiar de misión. */
function QuestMeta({ cur }) {
  const { at, walked, objs, k } = cur;
  return (
    <p className="ov-meta">
      Objetivo {k + 1} / {objs.length}
      {" "}· misión{" "}
      <button type="button" className="ov-q" data-q="-1" disabled={!(at > 0)} aria-label="Misión anterior"
        onClick={() => moveQuest(-1)}><Tri dir="prev" /></button>
      {at + 1} de {walked.length}
      <button type="button" className="ov-q" data-q="1" disabled={!(at < walked.length - 1)} aria-label="Misión siguiente"
        onClick={() => moveQuest(1)}><Tri dir="next" /></button>
    </p>
  );
}

/** El objetivo actual, como en la ruta del diario: medallón del juego, zona, lo que se entrega y su /travel. */
function NowCard({ cur }) {
  return (
    <div className="ov-now" data-qid={cur.q.id}>
      <Objectives route objs={[cur.objs[cur.k]]} at={0} />
    </div>
  );
}

/** «Ahora»: dónde parar y qué se resuelve, el objetivo actual y los dos siguientes. */
function NowTab({ step, cur, s }) {
  const calls = stepCalls(step).filter(([kind]) => kind === "stop" || kind === "done");
  const after = cur ? cur.objs.slice(cur.k + 1, cur.k + 3) : [];
  return (
    <>
      {calls.length > 0 && (
        <div className="goal-calls ov-calls">
          {calls.map(([kind, text], i) => <Call key={i} step={step} kind={kind} text={text} />)}
        </div>
      )}
      {cur ? (
        <>
          <section className="ov-sec">
            <div className="ov-qline">
              <h3 className="ov-label">{cur.q.n}</h3>
              <CurrentQuestDone n={step.n} cur={cur} s={s} />
            </div>
            <QuestMeta cur={cur} />
            <NowCard cur={cur} />
            <div className="ov-obj-ctl">
              <ObjArrow cur={cur} dir="prev" />
              <ObjButton cur={cur} />
              <ObjArrow cur={cur} dir="next" />
            </div>
          </section>
          {after.length > 0 && (
            <section className="ov-sec ov-after">
              <h3 className="ov-label">Después</h3>
              <Objectives route objs={after} />
            </section>
          )}
        </>
      ) : (
        <p className="asset-note">{s.questsLoaded ? "Este paso no tiene misiones que recorrer." : "Cargando misiones…"}</p>
      )}
    </>
  );
}

/** El paso entero: cabecera, las cuatro pestañas y la barra del diario. */
function Step({ n, step, cur, s, pick }) {
  const [tab, setTabState] = useState(readTab);
  const setTab = t => {
    localStorage.setItem(TAB_KEY, t);
    setTabState(t);
  };
  const rows = rowsOf(n);
  const left = rows.filter(row => !rowHave(s, { ...row, steps: [n] }, [n])).length;
  return (
    <>
      <header className="ov-head">
        <button type="button" className="ov-num" aria-haspopup="listbox" title="Elegir otro paso" onClick={pick}>{n}</button>
        <div className="ov-head-txt">
          <p className="ov-title">{stepTitle(step)}</p>
          <span className="ov-zone" style={{ "--zone-color": ZONE_COLOR[step.zone] }}>{step.zone}</span>
        </div>
        <GuideLink step={step} s={s} />
        <b className="ov-pct">{progressPct(s)}%</b>
      </header>
      <div className="ov-tabs" role="tablist" aria-label="Overlay">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}>
            {label}{key === "items" && rows.length > 0 && <WinBadge n={left} />}
          </button>
        ))}
      </div>
      <div className="ov-scroll ov-tab-body journal-body" role="tabpanel">
        {tab === "now" && <NowTab step={step} cur={cur} s={s} />}
        {tab === "quests" && <Quests step={step} quests={s.questsLoaded ? questsOf(n) : []} loaded={s.questsLoaded} s={s} />}
        {tab === "items" && (rows.length ? <Needs n={n} s={s} /> : <p className="asset-note">Este paso no pide objetos.</p>)}
        {tab === "guide" && (
          <div className="journal-goal ov-guide">
            <GuideCalls step={step} done={!!s.done[n]} />
          </div>
        )}
      </div>
      <Actions step={step} s={s} />
    </>
  );
}

/**
 * La lista de los 100 pasos, al pulsar el número: el actual señalado y a la vista, los
 * hechos con su ✓ y apagados. Elegir uno lleva el overlay a él (overlayGo); Escape o
 * la ✕ la cierran. Mientras está abierta, el teclado del overlay no cambia de paso.
 */
function StepPicker({ n, s, onClose }) {
  const ref = useRef(null);
  // Solo al abrirla: lo demás (un paso marcado en la página) no la vuelve a desplazar
  const close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    const el = ref.current.querySelector('[aria-current="step"]');
    el?.scrollIntoView({ block: "center" });
    el?.focus({ preventScroll: true });
    const doc = ref.current.ownerDocument;
    const onKey = e => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      close.current();
    };
    doc.addEventListener("keydown", onKey);
    return () => doc.removeEventListener("keydown", onKey);
  }, []);
  const choose = m => {
    onClose();
    overlayGo(m);
  };
  return (
    <div className="ov-picker" ref={ref} role="dialog" aria-label="Elegir paso">
      <div className="ov-picker-head">
        <span className="ov-label">Ir al paso</span>
        <button type="button" className="ov-q ov-picker-x" aria-label="Cerrar" onClick={onClose}>×</button>
      </div>
      <ol className="ov-picker-list ov-scroll">
        {STEPS.map(st => (
          <li key={st.n}>
            <button type="button" className={"ov-pick" + (s.done[st.n] ? " is-done" : "")} data-n={st.n}
              aria-current={st.n === n ? "step" : undefined} onClick={() => choose(st.n)}>
              <b>{st.n}</b>
              <span>{stepTitle(st)}</span>
              {s.done[st.n] && <i aria-label="Hecho">✓</i>}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Contenido del overlay: el paso entero en pestañas, con las piezas del diario. */
export default function OverlayView() {
  const s = useAppState();
  const n = overlayStep(s);
  const step = STEPS[n - 1];
  const cur = s.questsLoaded ? currentQuest(n, s.questPos, s.questObj) : null;
  const [picking, setPicking] = useState(false);
  return (
    <div className="ov journal">
      <Step n={n} step={step} cur={cur} s={s} pick={() => setPicking(true)} />
      {picking && <StepPicker n={n} s={s} onClose={() => setPicking(false)} />}
    </div>
  );
}
