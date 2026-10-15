import { Fragment, useEffect, useState } from "react";
import { STEPS } from "../data/steps.js";
import { CALL_ICONS, OBJ_ICONS, assetsFor, imgUrl } from "../lib/assets.js";
import { groupsOf, nextWalked, questsOf } from "../lib/quests.js";
import { linkify, missionGuide } from "../lib/guides.js";
import PLANS from "../data/plans.json";
import { CLOSED_BY, RESUMED_IN, doneIcon, list, nextPendingAfter, resolvesHere, stepCalls, stepTitle, stopPoints } from "../lib/journal.js";
import { rowsOf } from "../lib/resources.js";
import {
  closeSteps, closingPlan, loadQuests, pendingCloses, questDoneElsewhere, rowHave, selectStep, setObjective, showOnMap, toggleRowOwned, toggleStep, useAppState,
} from "../state/store.js";
import { CoordChip, Objectives } from "./StepParts.jsx";
import Slot from "./needs/Slot.jsx";
import { useLeaving } from "../lib/leaving.js";
import QuestMark from "./QuestMark.jsx";
import Banner from "./Banner.jsx";

// Los resaltados de la guía: rojo y verde en torrentearcano, y el azul separado por lo
// que dice (import_guide.py). El icono es un objeto del juego (CALL_ICONS); lo que
// también hay que hacer es una misión y lleva la «!» del juego
const CALL = {
  stop: { label: "Hasta dónde llegar" },
  done: { label: "Lo que se resuelve" },
  includes: { label: "Incluye" },
  must: { label: "También hay que" },
  tip: { label: "Consejo" },
  note: { label: "Nota" },
  resumedin: { label: "Se retoma más adelante" },
  closedin: { label: "Se termina más adelante" },
};

/** Texto de la guía con sus misiones y logros enlazados y los incisos como pasos. */
function RichText({ text }) {
  return linkify(text).map((part, i) =>
    part.href ? (
      <a key={i} className="guide-link" href={part.href} target="_blank" rel="noopener">{part.t}</a>
    ) : part.step ? (
      <button key={i} type="button" className="step-ref" data-n={part.step} onClick={() => selectStep(part.step)}>{part.t}</button>
    ) : (
      part.t
    ));
}

/**
 * El objetivo (derecha): el logro con su icono, una frase por lo que pide, la cita de
 * Sandglass y, al pie, los pasos que cierra o donde se cierra.
 */
function Goal({ step, done }) {
  const plan = PLANS[step.n] || [];
  const head = plan.find(e => e.t === "a");
  const closedIn = !done && CLOSED_BY[step.n];
  // Donde se retoma va antes de donde se termina: la guía retoma antes de cerrar (58: 59 y 61)
  const resumedIn = done ? [] : RESUMED_IN[step.n] || [];
  const calls = stepCalls(step);
  return (
    <div className="journal-goal">
      <button type="button" className="journal-to-map" onClick={() => showOnMap(step.n)} title="Volver al mapa con este paso">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 5l5-2 6 2 5-2v12l-5 2-6-2-5 2z" /><path d="M7 3v12M13 5v12" /></svg>
        Ver en el mapa
      </button>
      <div className="goal-head">
        <span className="goal-ach">
          {head?.img ? <img src={imgUrl(head.img)} alt="" /> : <QuestMark />}
          {step.complete && <span className="is-complete" title="Logro completo">✓</span>}
        </span>
        <div>
          {/* Sin enlace: la guía del logro ya va enlazada en el texto de la guía */}
          <h2 className="journal-title">{stepTitle(step)}</h2>
        </div>
      </div>
      <div className="goal-guide">
        {OBJ_ICONS.free && <img src={imgUrl(OBJ_ICONS.free)} alt="" />}
        <div>
          <small className="goal-guide-label">Texto de la guía</small>
          <p className={"journal-base" + (plan.length ? " is-source" : "")}><RichText text={step.base} /></p>
        </div>
      </div>
      {(calls.length > 0 || closedIn || resumedIn.length > 0) && (
        <div className="goal-calls">
          {calls.map(([kind, text], i) => <Call key={i} step={step} kind={kind} text={text} />)}
          {resumedIn.length > 0 && (
            <Call step={step} kind="resumedin">
              Sus misiones se retoman en el paso{" "}
              {resumedIn.map((m, i) => (
                <Fragment key={m}>
                  {i > 0 && (i === resumedIn.length - 1 ? " y " : ", ")}
                  <button type="button" className="step-ref" data-n={m} onClick={() => selectStep(m)}>{m}</button>
                </Fragment>
              ))}.
            </Call>
          )}
          {closedIn && (
            <Call step={step} kind="closedin">
              Sus misiones se terminan en el paso{" "}
              <button type="button" className="step-ref" data-n={closedIn} onClick={() => selectStep(closedIn)}>{closedIn}</button>.
            </Call>
          )}
        </div>
      )}
    </div>
  );
}

/** Un aviso de la guía (rojo, verde o azul) con su medallón. */
function Call({ step, kind, text, children }) {
  return (
    <div className={`call ${kind}`}>
      <i aria-hidden="true">
        {kind === "must" ? <QuestMark />
          : kind === "done" ? <img src={imgUrl(doneIcon(step.n))} alt="" />
          : kind === "closedin" ? <img src={imgUrl(OBJ_ICONS.fight)} alt="" />
          : kind === "resumedin" ? <img src={imgUrl(OBJ_ICONS.map)} alt="" />
          : CALL_ICONS[kind] && <img src={imgUrl(CALL_ICONS[kind])} alt="" />}
      </i>
      <div>
        <b>{CALL[kind].label}</b>
        {children ?? <RichText text={text} />}
      </div>
    </div>
  );
}

/**
 * Lo que hay que reunir para el paso, antes de sus misiones: las mismas casillas que
 * «Objetos necesarios». Pulsar una la marca como cogida para este paso (y allí se ve);
 * el icono de la esquina copia el nombre para el mercadillo.
 */
function Needs({ n, s }) {
  const rows = rowsOf(n).map(row => ({ ...row, steps: [n] }));
  if (!rows.length) return null;
  return (
    <section className="journal-needs">
      <h3 className="journal-h"><span className="t">Necesitas</span> <span className="n">({rows.length})</span></h3>
      <div className="slots">
        {rows.map(row => (
          <Slot key={row.k} row={row} have={rowHave(s, row, [n])} onToggle={toggleRowOwned} />
        ))}
      </div>
    </section>
  );
}

/**
 * Hasta dónde vas en cada misión, con el avance que guarda el overlay: las misiones
 * antes de la actual, hechas; en la actual, los objetivos antes del que toca; y
 * cualquiera pasada de su último objetivo. Con el paso hecho, todo; también la que
 * terminó otro paso hecho que la lleva (questDoneElsewhere). Una opcional solo lleva lo
 * suyo: ni el paso hecho ni pasar de largo la terminan. Devuelve el índice (en la lista
 * aplanada) del objetivo actual.
 */
function progressOf(s, n, quests, i, q) {
  const total = q.s.reduce((a, stg) => a + stg.o.length, 0);
  // Hasta `total`: una misión terminada sale toda hecha
  const own = Math.min(s.questObj[q.id] || 0, total);
  const pos = Math.min(s.questPos[n] || 0, quests.length - 1);
  if (q.kind === "optional") return s.questObj[q.id] != null || i === pos ? own : -1;
  if (s.done[n] || i < pos || own >= total || questDoneElsewhere(s, q.id, n)) return total;
  return i === pos ? own : -1;
}

/**
 * Una misión que basta con tener tomada (paso 28, «Luces y sombras»): dónde empieza y
 * la nota, sin objetivos ni «Completar», porque no se hace.
 */
function TakeOnly({ q, open, setOpen }) {
  return (
    <details className="q-item" open={open} onToggle={e => setOpen(q.id, e.currentTarget.open)}>
      <summary>
        <QuestMark className="q-mark" />
        <span className="q-name">{q.n}</span>
        <span className="q-take" title="No hace falta hacerla">Solo tomarla</span>
        <span className="q-lv">{`Niv. ${q.lv}`}</span>
        {missionGuide(q.n) && (
          <a className="q-guide" href={missionGuide(q.n)} target="_blank" rel="noopener" title="Guía en Torrente Arcano">Guía ↗</a>
        )}
      </summary>
      <QuestStart q={q} />
      <p className="q-start q-take-note">No hace falta hacerla: basta con tenerla tomada.</p>
    </details>
  );
}

/** Dónde empieza la misión: el PNJ y su posición, o el templo de tu clase. */
function QuestStart({ q }) {
  if (q.st?.cls) return <p className="q-start">El PNJ que la da depende de tu clase: está en el templo de tu clase.</p>;
  if (!q.st) return null;
  return (
    <p className="q-start">
      Empieza con <b>{q.st.npc || "un PNJ"}</b>{q.st.a ? ` en ${q.st.a}` : ""} <CoordChip x={q.st.x} y={q.st.y} />
    </p>
  );
}

/** Misiones del paso; la que lleva la parada roja va abierta y la marca. */
function Quests({ step, quests, loaded, s }) {
  // Al abrir el paso todas van plegadas; se abren al pulsarlas o, al terminar una
  // desde sus medallones, la siguiente (Journal se monta de nuevo en cada paso)
  const [opened, setOpened] = useState(() => new Set());
  const setOpen = (id, on) => setOpened(prev => {
    if (prev.has(id) === on) return prev;
    const next = new Set(prev);
    if (on) next.add(id); else next.delete(id);
    return next;
  });
  if (!loaded) return <p className="asset-note">Cargando misiones…</p>;
  if (!quests.length) return null;
  // En un paso que se resuelve solo, el punto del rojo es donde se retoma y se termina:
  // línea verde con lo que se resuelve, en vez de la roja de parar
  // En la línea verde, sin la coletilla "hasta tener que pasar X": esa la dice la roja
  const done = resolvesHere(step) && step.marks.find(m => m[0] === "done")[1]
    .replace(/\s+hasta tener que pasar .+?\.?$/i, ".");
  // La parada que deja el propio verde ("…hasta tener que pasar Kodámade") sigue en rojo
  const stops = stopPoints(step, quests).map(p => (done && !p.followUp ? { ...p, text: done, resume: true } : p));
  // «Completar» sobra si el paso tiene una sola misión obligatoria: la termina «Paso hecho»
  const mandatory = quests.filter(q => q.kind === "mandatory").length;
  const items = quests.map((q, i) => {
    if (q.kind === "take") return <TakeOnly key={q.id} q={q} open={opened.has(q.id)} setOpen={setOpen} />;
    let offset = 0;
    const optional = q.kind === "optional";
    const at = progressOf(s, step.n, quests, i, q);
    const total = q.s.reduce((a, stg) => a + stg.o.length, 0);
    // Terminada en otro paso: sale hecha y aquí no se deshace (se deshace desmarcando ese)
    const elsewhere = !optional && questDoneElsewhere(s, q.id, step.n);
    // Pulsar un objetivo lo da por hecho; uno hecho, vuelve a él. Con el paso hecho,
    // solo en las opcionales, que no se marcan con él
    // También en un paso hecho: deshacer una misión (un clic de más) desmarca el paso
    const pick = k => {
      setObjective(step.n, i, q.id, k, total);
      const next = quests[nextWalked(quests, i)];
      if (k >= total && !optional && next) setOpen(next.id, true);
    };
    // «Completar» la termina de una vez; hecha, vuelve a su inicio. Sin plegarla
    const finished = at >= total;
    const toggleDone = e => {
      e.preventDefault();
      e.stopPropagation();
      pick(finished ? 0 : total);
    };
    return (
      <details className="q-item" key={q.id} open={opened.has(q.id)}
        onToggle={e => setOpen(q.id, e.currentTarget.open)}>
        <summary>
          <QuestMark className="q-mark" />
          <span className="q-name">{q.n}</span>
          {optional && <span className="q-optional" title="Opcional pero útil">Opcional</span>}
          {/* Las opcionales siempre lo llevan: es como se marcan */}
          {(optional || mandatory > 1) && <button type="button" className={"q-done-btn" + (finished ? " is-done" : "")} aria-pressed={finished}
            disabled={!!elsewhere}
            title={elsewhere ? `Completada en el paso ${elsewhere}` : finished ? "Vuelve al inicio de la misión" : "Da la misión por terminada"}
            aria-label={finished ? "Misión completada" : "Completar misión"} onClick={toggleDone}>
            {finished && "✓"}<span className="q-done-txt">{finished ? " Completada" : "Completar"}</span></button>}
          <span className="q-lv">{`Niv. ${q.lv}`}</span>
          {missionGuide(q.n) && (
            <a className="q-guide" href={missionGuide(q.n)} target="_blank" rel="noopener" title="Guía en Torrente Arcano">Guía ↗</a>
          )}
        </summary>
        <QuestStart q={q} />
        {q.s.map((stg, j) => {
          const from = offset;
          offset += stg.o.length;
          const here = stops.filter(p => p.quest === q.id && p.index >= from && p.index < offset);
          return (
            <Fragment key={j}>
              {q.s.length > 1 && <p className="q-stage">Etapa {j + 1}{stg.n && stg.n !== q.n ? ` · ${stg.n}` : ""}</p>}
              <Objectives route objs={stg.o} at={at - from} onPick={elsewhere ? undefined : k => pick(from + k)}
                stops={here.map(p => ({ index: p.index - from, text: p.text, resume: p.resume }))} />
            </Fragment>
          );
        })}
      </details>
    );
  });
  // Si el paso mezcla misiones de varios logros, van bajo un título por logro
  const groups = groupsOf(step.n);
  const grouped = groups && groups.reduce((a, g) => a + g[2], 0) === quests.length ? groups : null;
  return (
    <section className="journal-quests">
      <h3 className="journal-h"><span className="t">Misiones</span> <span className="n">({quests.length})</span></h3>
      {grouped ? grouped.map(([name, img, count], g) => {
        const from = grouped.slice(0, g).reduce((a, x) => a + x[2], 0);
        return (
          <div className="q-group" key={name}>
            <h4 className="q-group-head">
              {/* Las que no son de ningún logro llevan la «!» de misión */}
              {img ? <img src={imgUrl(img)} alt="" /> : <QuestMark className="q-group-mark" />}
              <span className="q-group-name">{name}</span> <span className="q-group-n">· {count}</span>
            </h4>
            {items.slice(from, from + count)}
          </div>
        );
      }) : items}
    </section>
  );
}

/**
 * Barra final, con los botones planos del juego: el paso anterior, «Paso hecho» (que
 * marca el paso y abre el siguiente pendiente) y el siguiente. Si el combate del paso
 * cierra otros que siguen pendientes, el mismo botón termina lo que les queda («Hecho,
 * y termina el 33»): uno aparte se perdía al avanzar y lo cerrado quedaba pendiente.
 */
function Actions({ step, s }) {
  const n = step.n;
  // En la vista que se va (zoom hacia el mapa) los botones no llevan id
  const live = !useLeaving();
  const done = !!s.done[n];
  const closes = pendingCloses(s, n);
  // Lo cerrado que quede pendiente (le faltan misiones de antes) puede ser el siguiente
  const closed = closes.length ? closingPlan(s, closes).done : [];
  const next = done ? null : nextPendingAfter({ ...s.done, [n]: true, ...Object.fromEntries(closed.map(c => [c, true])) }, n);
  function finish() {
    if (closes.length) closeSteps(n, closes);
    else toggleStep(n);
    if (next != null) selectStep(next);
  }
  const label = closes.length ? `✓ Hecho, y termina el ${list(closes)}` : "✓ Paso hecho";
  return (
    <div className="journal-cta">
      <button type="button" className="gbtn" id={live ? "prevBtn" : undefined} disabled={n === 1} aria-label={`Paso ${n - 1}`}
        onClick={() => selectStep(n - 1)}>◀ {n > 1 ? n - 1 : ""}</button>
      <div className="journal-cta-main">
        <button type="button" className={"gbtn go" + (done ? " is-done" : "")} id={live ? "toggleBtn" : undefined}
          title={done ? undefined : (closes.length ? `Termina lo que queda del ${list(closes)}, que este paso cierra` : "Marca el paso")
            + (next != null ? `${closes.length ? "," : ""} y abre el ${next}` : "")}
          onClick={done ? () => toggleStep(n) : finish}>
          {done ? "Desmarcar" : label}
        </button>
      </div>
      <button type="button" className="gbtn" id={live ? "nextBtn" : undefined} disabled={n === STEPS.length} aria-label={`Paso ${n + 1}`}
        onClick={() => selectStep(n + 1)}>{n < STEPS.length ? n + 1 : ""} ▶</button>
    </div>
  );
}

/** Detalle de un paso en el diario. Lo usan el panel (escritorio) y la hoja (móvil). */
export default function Journal({ n, id }) {
  const s = useAppState();
  const leaving = useLeaving();
  const step = STEPS[n - 1];
  const quests = s.questsLoaded ? questsOf(n) : [];
  const a = assetsFor(n);

  // Quien abre un paso quiere las misiones ya, sin esperar al reposo
  useEffect(loadQuests, []);

  return (
    <article className="journal" id={leaving ? undefined : id} aria-label={`Paso ${n}`}>
      <div className="journal-top">
        <Banner step={step} />
        <Goal step={step} done={!!s.done[n]} />
      </div>
      <div className="journal-body">
        <Needs n={n} s={s} />
        <Quests step={step} quests={quests} loaded={s.questsLoaded} s={s} />
        <p className="asset-note">Texto de Sandglass · resaltados de Torrente Arcano · imágenes vía DofusDB</p>
      </div>
      <Actions step={step} s={s} />
    </article>
  );
}
