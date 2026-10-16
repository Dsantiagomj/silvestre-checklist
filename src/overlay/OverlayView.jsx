import { useLayoutEffect, useRef, useState } from "react";
import { STEPS, ZONE_COLOR } from "../data/steps.js";
import { currentQuest, flatObjectives, questsOf } from "../lib/quests.js";
import { rowsOf } from "../lib/resources.js";
import { stepCalls, stepTitle } from "../lib/journal.js";
import {
  goQuest, moveObjective, overlayGo, overlayStep, progressPct, rowHave, useAppState,
} from "../state/store.js";
import { Objectives } from "../components/StepParts.jsx";
import { Actions, Call, CurrentQuestDone, GuideCalls, Needs, Quests, Tri, progressOf } from "../components/Journal.jsx";
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

/** La misión `j` de la lista del paso, terminada (el mismo avance que el diario). */
const questFinished = (s, n, list, j) => progressOf(s, n, list, j, list[j]) >= flatObjectives(list[j]).length;

/**
 * Las flechas ◀ ▶ entre los objetivos de la misión. La siguiente no pasa del último: ahí
 * lo que queda es completarlo («Completar objetivo»).
 */
function ObjArrow({ cur, dir }) {
  const prev = dir === "prev";
  return (
    <button type="button" className="ov-stepper-btn" aria-label={prev ? "Objetivo anterior" : "Objetivo siguiente"}
      disabled={prev ? cur.k === 0 : cur.k >= cur.objs.length - 1} onClick={() => moveObjective(prev ? -1 : 1)}>
      <Tri dir={dir} />
    </button>
  );
}

/** [◀ | Objetivo 8 de 9 | ▶]: las flechas y el contador, en una sola pieza. */
function ObjStepper({ cur }) {
  return (
    <div className="ov-stepper" role="group" aria-label="Objetivos de la misión">
      <ObjArrow cur={cur} dir="prev" />
      <span className="ov-stepper-count">Objetivo {cur.k + 1} de {cur.objs.length}</span>
      <ObjArrow cur={cur} dir="next" />
    </div>
  );
}

/** «✓ Completar objetivo»: lo da por hecho y pasa al siguiente. */
function ObjButton() {
  return (
    <button type="button" className="gbtn go ov-objbtn" onClick={() => moveObjective(1)}
      title="Da el objetivo por hecho y pasa al siguiente">✓ Completar objetivo</button>
  );
}

/**
 * El desplegable de la misión: «1 de 2 · La última piedra ▾». Abierto, lista las misiones
 * que se recorren en el paso (cur.walked), las terminadas tachadas y con su ✓, la actual
 * señalada. Elegir una lleva a ella (goQuest). Escape, un clic fuera o elegir la cierran.
 * Los oyentes van en el documento del propio botón: el overlay vive en otra ventana.
 */
function QuestSelect({ n, cur, s }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const btn = useRef(null);
  const { list, walked, at, q } = cur;
  const close = (focus = true) => {
    setOpen(false);
    if (focus) btn.current?.focus();
  };
  useLayoutEffect(() => {
    if (!open) return;
    ref.current.querySelector('[aria-selected="true"]')?.focus();
    const doc = ref.current.ownerDocument;
    const onDown = e => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    doc.addEventListener("pointerdown", onDown);
    return () => doc.removeEventListener("pointerdown", onDown);
  }, [open]);
  const choose = j => {
    close();
    goQuest(j);
  };
  const onKey = e => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const opts = [...ref.current.querySelectorAll('[role="option"]')];
    const i = opts.indexOf(e.target.ownerDocument.activeElement);
    const next = e.key === "Home" ? 0 : e.key === "End" ? opts.length - 1
      : Math.max(0, Math.min(opts.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)));
    opts[next]?.focus();
  };
  return (
    <div className="ov-qsel-wrap" ref={ref} onKeyDown={open ? onKey : undefined}>
      <button type="button" className="ov-qsel" ref={btn} aria-haspopup="listbox" aria-expanded={open}
        aria-controls={open ? "ov-qlist" : undefined} disabled={walked.length < 2}
        title={walked.length < 2 ? undefined : "Elegir otra misión del paso"} onClick={() => setOpen(o => !o)}>
        <small>{at + 1} de {walked.length}</small>
        <span className="ov-qsel-name">{q.n}</span>
        {walked.length > 1 && (
          <svg className="ov-qsel-caret" viewBox="0 0 10 10" aria-hidden="true">
            <path d={open ? "M1 7h8L5 2z" : "M1 3h8L5 8z"} />
          </svg>
        )}
      </button>
      {open && (
        <ul className="ov-qlist ov-scroll" id="ov-qlist" role="listbox" aria-label="Misiones del paso">
          {walked.map((j, w) => {
            const done = questFinished(s, n, list, j);
            return (
              <li key={list[j].id} role="option" aria-selected={w === at} tabIndex={-1}
                className={"ov-qopt" + (done ? " is-done" : "")} onClick={() => choose(w)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    choose(w);
                  }
                }}>
                <span className="ov-qopt-ok" aria-hidden="true">{done ? "✓" : ""}</span>
                <span className="ov-qopt-name">{w + 1} · {list[j].n}</span>
                {done && <span className="sr-only"> (completada)</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
            <div className="ov-qhead">
              <h3 className="ov-label">Misión</h3>
              <CurrentQuestDone n={step.n} cur={cur} s={s} />
            </div>
            <QuestSelect n={step.n} cur={cur} s={s} />
            <NowCard cur={cur} />
            <div className="ov-objbar">
              <ObjStepper cur={cur} />
              <ObjButton />
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
