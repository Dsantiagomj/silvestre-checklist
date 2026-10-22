import { Fragment, createContext, useContext, useEffect, useState } from "react";
import { STEPS } from "../data/steps.js";
import { CALL_ICONS, OBJ_ICONS, assetsFor, imgUrl } from "../lib/assets.js";
import { childrenOf, groupsOf, questsOf } from "../lib/quests.js";
import { linkify, missionGuide } from "../lib/guides.js";
import PLANS from "../data/plans.json";
import {
  CLOSED_BY, QUEST_NOTES, RESUMED_IN, bannerFigure, doneIcon, missionNotes, nextPendingAfter, resolvesHere, stepCalls, stepTitle, stopPoints,
} from "../lib/journal.js";
import { rowsOf } from "../lib/resources.js";
import {
  alsoText, closeSteps, closingPlan, getState, loadQuests, optionalDoneBy, pendingCloses, questDoneElsewhere, rowHave, selectStep, setObjective, showOnMap, toggleRowOwned, toggleStep, useAppState,
} from "../state/store.js";
import { CoordChip, Objectives } from "./StepParts.jsx";
import Slot from "./needs/Slot.jsx";
import { useLeaving } from "../lib/leaving.js";
import QuestMark from "./QuestMark.jsx";
import Banner from "./Banner.jsx";

// Los resaltados de la guía: rojo y verde en torrentearcano, y el azul separado por lo
// que dice (import_guide.py). El icono es un objeto del juego (CALL_ICONS); lo que
// también hay que hacer es una misión y lleva la «!» del juego
/**
 * A qué paso llevan los incisos de la guía y los botones de paso. En la página,
 * selectStep; el overlay pone overlayGo, que cambia su paso y no el de la página.
 */
export const StepGo = createContext(selectStep);

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
  const go = useContext(StepGo);
  return linkify(text).map((part, i) =>
    part.href ? (
      <a key={i} className="guide-link" href={part.href} target="_blank" rel="noopener">{part.t}</a>
    ) : part.step ? (
      <button key={i} type="button" className="step-ref" data-n={part.step} onClick={() => go(part.step)}>{part.t}</button>
    ) : (
      part.t
    ));
}

/**
 * El objetivo (derecha): el logro con su icono, una frase por lo que pide, la cita de
 * Sandglass y, al pie, los pasos que cierra o donde se cierra. Debajo, quién da el paso:
 * en escritorio el estandarte es pequeño y su figura va sin nombre.
 */
function Goal({ step, done }) {
  const plan = PLANS[step.n] || [];
  const head = plan.find(e => e.t === "a");
  const fig = bannerFigure(step.n);
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
      <GuideCalls step={step} done={done} />
      {fig && <p className="goal-by">{fig.as}: <b>{fig.name}</b></p>}
    </div>
  );
}

/**
 * El texto de la guía y sus avisos, con dónde se retoman y se terminan sus misiones.
 * Lo usan el objetivo del diario y la pestaña «Guía» del overlay.
 */
export function GuideCalls({ step, done }) {
  const go = useContext(StepGo);
  const plan = PLANS[step.n] || [];
  const closedIn = !done && CLOSED_BY[step.n];
  // Donde se retoma va antes de donde se termina: la guía retoma antes de cerrar (58: 59 y 61)
  const resumedIn = done ? [] : RESUMED_IN[step.n] || [];
  const calls = stepCalls(step);
  return (
    <>
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
                  <button type="button" className="step-ref" data-n={m} onClick={() => go(m)}>{m}</button>
                </Fragment>
              ))}.
            </Call>
          )}
          {closedIn && (
            <Call step={step} kind="closedin">
              Sus misiones se terminan en el paso{" "}
              <button type="button" className="step-ref" data-n={closedIn} onClick={() => go(closedIn)}>{closedIn}</button>.
            </Call>
          )}
        </div>
      )}
    </>
  );
}

/** Un aviso de la guía (rojo, verde o azul) con su medallón. */
export function Call({ step, kind, text, children }) {
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
export function Needs({ n, s }) {
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
 * suyo: ni el paso hecho ni pasar de largo la terminan, pero sí el paso que la termina
 * (optionalDoneBy). Devuelve el índice (en la lista
 * aplanada) del objetivo actual.
 */
export function progressOf(s, n, quests, i, q) {
  const total = q.s.reduce((a, stg) => a + stg.o.length, 0);
  // Hasta `total`: una misión terminada sale toda hecha
  const own = Math.min(s.questObj[q.id] || 0, total);
  const pos = Math.min(s.questPos[n] || 0, quests.length - 1);
  if (q.kind === "optional") return optionalDoneBy(s, q.id) ? total : s.questObj[q.id] != null || i === pos ? own : -1;
  if (s.done[n] || i < pos || own >= total || questDoneElsewhere(s, q.id, n)) return total;
  // Una que va por delante con objetivos hechos (se avanzó en ella fuera de orden): los suyos
  return i === pos || (i > pos && own > 0) ? own : -1;
}

/**
 * Una misión que basta con tener tomada (paso 28, «Luces y sombras»): dónde empieza y
 * la nota, sin objetivos ni «Completar», porque no se hace.
 */
function TakeOnly({ q, notes, open, setOpen }) {
  return (
    <details className="q-item" open={open} onToggle={e => setOpen(q.id, e.currentTarget.open)}>
      <summary>
        <QuestMark className="q-mark" />
        <span className="q-name">{q.n}</span>
        <span className="q-take" title="No hace falta hacerla">Solo tomarla</span>
        <span className="q-lv">{`Niv. ${q.lv}`}</span>
        {missionGuide(q.n) && (
          <a className="q-guide" href={missionGuide(q.n)} target="_blank" rel="noopener" title="Guía en Torrente Arcano">Guía</a>
        )}
      </summary>
      <QuestStart q={q} />
      <QuestNotes notes={notes} />
      <p className="q-start q-take-note">No hace falta hacerla: basta con tenerla tomada.</p>
    </details>
  );
}

/**
 * Las notas y los consejos de la guía que hablan de esta misión («Misión 1: El dragón blanco. (Se pasa
 * Miauvisor…)», missionNotes): arriba, junto a dónde empieza, sin el «Misión N: Nombre.».
 */
function QuestNotes({ notes }) {
  return notes.map(({ text, kind = "note" }, i) => (
    <p key={i} className="q-note">
      {CALL_ICONS[kind] && <img src={imgUrl(CALL_ICONS[kind])} alt="" title={CALL[kind].label} />}
      <span><RichText text={text} /></span>
    </p>
  ));
}

/** Dónde empieza la misión: el PNJ y su posición, el templo de tu clase o, en una que
 * depende del alineamiento («Prólogo invernal»), cuál de sus misiones toca, con su guía. */
function QuestStart({ q }) {
  if (q.st?.cls) return <p className="q-start">El PNJ que la da depende de tu clase: está en el templo de tu clase.</p>;
  if (q.st?.ali) {
    return (
      <p className="q-start">
        Depende de tu alineamiento:{" "}
        {q.st.ali.map(([name, side], i) => (
          <Fragment key={name}>
            {i ? (i === q.st.ali.length - 1 ? " o " : ", ") : ""}
            {missionGuide(name) ? <a className="guide-link" href={missionGuide(name)} target="_blank" rel="noopener">{name}</a> : name} ({side})
          </Fragment>
        ))}.
      </p>
    );
  }
  if (!q.st) return null;
  return (
    <p className="q-start">
      Empieza con <b>{q.st.npc || "un PNJ"}</b>{q.st.a ? ` en ${q.st.a}` : ""} <CoordChip x={q.st.x} y={q.st.y} />
    </p>
  );
}

/** «Completar» / «✓ Completada» de una misión; terminada en otro paso, no se pulsa. */
function QuestDone({ finished, elsewhere, onClick }) {
  return (
    <button type="button" className={"q-done-btn" + (finished ? " is-done" : "")} aria-pressed={finished}
      disabled={!!elsewhere}
      title={elsewhere ? `Completada en el paso ${elsewhere}` : finished ? "Vuelve al inicio de la misión" : "Da la misión por terminada"}
      aria-label={finished ? "Misión completada" : "Completar misión"} onClick={onClick}>
      {finished && "✓"}<span className="q-done-txt">{finished ? " Completada" : "Completar"}</span></button>
  );
}

/**
 * El «Completar» de la misión en curso del overlay (cur, de currentQuest): el mismo
 * botón y el mismo avance que en la lista del diario. Nada en una de solo recoger.
 */
export function CurrentQuestDone({ n, cur, s }) {
  const { list, i, q } = cur;
  if (q.kind === "take") return null;
  const total = q.s.reduce((a, stg) => a + stg.o.length, 0);
  const finished = progressOf(s, n, list, i, q) >= total;
  const elsewhere = q.kind === "optional" ? optionalDoneBy(s, q.id) : questDoneElsewhere(s, q.id, n);
  return <QuestDone finished={finished} elsewhere={elsewhere} onClick={() => setObjective(n, i, q.id, finished ? 0 : total, total)} />;
}

/** Misiones del paso; la que lleva la parada roja va abierta y la marca. */
export function Quests({ step, quests, loaded, s }) {
  // Al abrir el paso todas van plegadas; se abren al pulsarlas o, al terminar una
  // desde sus medallones, la siguiente (Journal se monta de nuevo en cada paso). Solo
  // una a la vez: abrir otra pliega la que estaba abierta
  const [openId, setOpenId] = useState(null);
  const setOpen = (id, on) => setOpenId(prev => (on ? id : prev === id ? null : prev));
  if (!loaded) return <p className="asset-note">Cargando misiones…</p>;
  if (!quests.length) return null;
  // En un paso que se resuelve solo, el punto del rojo es donde se retoma y se termina:
  // línea verde con lo que se resuelve, en vez de la roja de parar
  // En la línea verde, sin la coletilla "hasta tener que pasar X": esa la dice la roja
  const done = resolvesHere(step) && step.marks.find(m => m[0] === "done")[1]
    .replace(/\s+hasta tener que pasar .+?\.?$/i, ".");
  // La parada que deja el propio verde ("…hasta tener que pasar Kodámade") sigue en rojo
  // También la de una madre que espera a una hija de otro paso (STOP_AT con `later`)
  const stops = stopPoints(step, quests).map(p => (done && !p.followUp && !p.later ? { ...p, text: done, resume: true } : p));
  const notes = missionNotes(step);
  // Las hijas de cada misión que van en el paso y se hacen (no las de solo tomarla)
  const kidsOf = q => (childrenOf(q.id) || [])
    .map(([index, ids]) => ({ index, items: ids.map(id => quests.find(x => x.id === id)).filter(x => x && x.kind !== "take") }))
    .filter(c => c.items.length);
  // Llevar a una hija: se despliega y se pone a la vista. Sin desplazamiento suave: lo
  // cortaba la altura de la misión al abrirse
  // El requestAnimationFrame de la ventana de la misión: en el overlay, la de la página
  // puede estar en segundo plano y no llegar
  // En escritorio el detalle se desplaza por dentro: se mueve solo él, no la página (que
  // scrollIntoView también desplazaría para llevar la misión arriba de la pantalla)
  const toKid = (id, el) => {
    setOpen(id, true);
    const win = el.ownerDocument.defaultView;
    win.requestAnimationFrame(() => {
      const item = el.closest(".journal-quests")?.querySelector(`.q-item[data-qid="${id}"]`);
      if (!item) return;
      const box = item.closest(".diary-detail");
      if (box && box.scrollHeight > box.clientHeight && win.getComputedStyle(box).overflowY !== "visible") {
        const margin = parseFloat(win.getComputedStyle(item).scrollMarginTop) || 0;
        // Mientras la hija se abre y la que estaba abierta se pliega (solo va una), el detalle
        // cambia de alto y la hija se mueve: el destino se vuelve a medir en cada fotograma
        // hasta que se queda quieta (como mucho, un segundo)
        let still = 0;
        let last = null;
        const follow = left => {
          const to = box.scrollTop + item.getBoundingClientRect().top - box.getBoundingClientRect().top - margin;
          box.scrollTop = to;
          // Quieta: el destino no cambia de un fotograma a otro y ya se ha llegado
          still = last != null && Math.abs(to - last) <= 1 && Math.abs(box.scrollTop - to) <= 1 ? still + 1 : 0;
          last = to;
          if (still < 6 && left > 0) win.requestAnimationFrame(() => follow(left - 1));
        };
        follow(60);
      } else item.scrollIntoView({ block: "start", behavior: "instant" });
    });
  };
  const notesOf = q => [...notes.filter(x => x.name === q.n), ...(QUEST_NOTES[step.n]?.[q.id] ? [{ text: QUEST_NOTES[step.n][q.id] }] : [])];
  const items = quests.map((q, i) => {
    if (q.kind === "take") return <TakeOnly key={q.id} q={q} notes={notesOf(q)} open={openId === q.id} setOpen={setOpen} />;
    let offset = 0;
    const kids = kidsOf(q);
    const optional = q.kind === "optional";
    const at = progressOf(s, step.n, quests, i, q);
    const total = q.s.reduce((a, stg) => a + stg.o.length, 0);
    // Terminada en otro paso: sale hecha y aquí no se deshace (se deshace desmarcando ese)
    // Una opcional, si la termina otro paso hecho (OPTIONAL_DONE_BY: «Arma letal», en el 93)
    const elsewhere = optional ? optionalDoneBy(s, q.id) : questDoneElsewhere(s, q.id, step.n);
    // Pulsar un objetivo lo da por hecho; uno hecho, vuelve a él. Con el paso hecho,
    // solo en las opcionales, que no se marcan con él
    // También en un paso hecho: deshacer una misión (un clic de más) desmarca el paso
    const pick = k => {
      setObjective(step.n, i, q.id, k, total);
      // La que queda en curso: la siguiente sin terminar o, tras una hija, su madre
      const next = quests[getState().questPos[step.n]];
      if (k >= total && !optional && next && next.id !== q.id) setOpen(next.id, true);
    };
    // «Completar» la termina de una vez y la pliega (si hay siguiente, se abre ella);
    // hecha, vuelve a su inicio sin plegarla
    const finished = at >= total;
    const toggleDone = e => {
      e.preventDefault();
      e.stopPropagation();
      if (!finished) setOpen(q.id, false);
      pick(finished ? 0 : total);
    };
    return (
      <details className="q-item" key={q.id} data-qid={q.id} open={openId === q.id}
        onToggle={e => setOpen(q.id, e.currentTarget.open)}>
        <summary>
          <QuestMark className="q-mark" />
          <span className="q-name">{q.n}</span>
          {optional && <span className="q-optional" title="Opcional pero útil">Opcional</span>}
          <QuestDone finished={finished} elsewhere={elsewhere} onClick={toggleDone} />
          <span className="q-lv">{`Niv. ${q.lv}`}</span>
          {missionGuide(q.n) && (
            <a className="q-guide" href={missionGuide(q.n)} target="_blank" rel="noopener" title="Guía en Torrente Arcano">Guía</a>
          )}
        </summary>
        <QuestStart q={q} />
        <QuestNotes notes={notesOf(q)} />
        {q.s.map((stg, j) => {
          const from = offset;
          offset += stg.o.length;
          const here = stops.filter(p => p.quest === q.id && p.index >= from && p.index < offset);
          return (
            <Fragment key={j}>
              {q.s.length > 1 && <p className="q-stage">Etapa {j + 1}{stg.n && stg.n !== q.n ? ` · ${stg.n}` : ""}</p>}
              <Objectives route objs={stg.o} at={at - from} onPick={elsewhere ? undefined : k => pick(from + k)}
                stops={here.map(p => ({ index: p.index - from, text: p.text, resume: p.resume }))}
                kids={kids.filter(c => c.index >= from && c.index < offset).map(c => ({ ...c, index: c.index - from }))} onKid={toKid} />
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
      {/* Las etapas dicen hasta dónde llegar; el camino lo da la guía de cada misión */}
      <p className="q-howto">
        Las etapas sirven para saber hasta dónde llegar en cada misión. Para saber adónde ir y qué hacer, abre su <b>Guía</b> de Torrente Arcano.
      </p>
      {grouped ? grouped.map(([name, img, count], g) => {
        const from = grouped.slice(0, g).reduce((a, x) => a + x[2], 0);
        return (
          <div className="q-group" key={g}>
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

/** El triángulo de los botones de paso, dibujado: el ◀ de texto sale como emoji en algunos sistemas. */
export function Tri({ dir }) {
  return (
    <svg className="tri" viewBox="0 0 10 10" aria-hidden="true">
      <path d={dir === "prev" ? "M8 1.5v7L2 5z" : "M2 1.5v7L8 5z"} />
    </svg>
  );
}

/** El botón de un paso: «✓ Completar paso 34» o, hecho, «Paso completado · deshacer». */
export const stepLabel = (n, done) => (done ? "Paso completado · deshacer" : `✓ Completar paso ${n}`);

/**
 * Bajo el botón del paso, lo que hace además en los pasos que cierra (alsoText): "Además:
 * en el 33 completa «Muchos cuerboks en la cabeza»." Hecho el paso o sin nada pendiente,
 * nada.
 */
export function AlsoLine({ s, closes }) {
  const text = alsoText(s, closes);
  return text ? <p className="cta-also">{text}</p> : null;
}

/**
 * Bajo el botón de un paso que para y termina el combate de otro posterior (CLOSED_BY):
 * marcarlo ya lo daría por hecho a medias. Al completar ese, se marca con él. Los que paran
 * sin que nada los cierre se marcan a mano: sin aviso.
 */
function WaitLine({ n, done }) {
  const by = !done && CLOSED_BY[n];
  return by ? (
    <p className="cta-also cta-wait">
      <b>No lo marques todavía.</b> Llega hasta donde indica y sigue; al completar el paso {by}, este se marca con él.
    </p>
  ) : null;
}

/**
 * El botón del paso: «Completar paso N» marca el paso, termina lo que queda de los que
 * cierra y abre el siguiente pendiente; hecho, lo vuelve a dejar pendiente. Lo usan la
 * barra del diario y el pie del overlay en mini cuando no hay objetivo que completar.
 */
export function StepButton({ step, s, id }) {
  const n = step.n;
  const go = useContext(StepGo);
  const done = !!s.done[n];
  const closes = pendingCloses(s, n);
  // Lo cerrado que quede pendiente (le faltan misiones de antes) puede ser el siguiente
  const closed = closes.length ? closingPlan(s, closes).done : [];
  const next = done ? null : nextPendingAfter({ ...s.done, [n]: true, ...Object.fromEntries(closed.map(c => [c, true])) }, n);
  function finish() {
    if (closes.length) closeSteps(n, closes);
    else toggleStep(n);
    if (next != null) go(next);
  }
  return (
    <button type="button" className={"gbtn go" + (done ? " is-done" : "")} id={id}
      title={done ? "Vuelve a dejar el paso pendiente" : `Marca el paso${next != null ? ` y abre el ${next}` : ""}`}
      onClick={done ? () => toggleStep(n) : finish}>
      {stepLabel(n, done)}
    </button>
  );
}

/**
 * Barra final, con los botones planos del juego: el paso anterior, «Completar paso N»
 * (StepButton) y el siguiente. Si el combate del paso cierra otros que siguen
 * pendientes, el mismo botón termina lo que les queda y una línea debajo lo dice: uno
 * aparte se perdía al avanzar y lo cerrado quedaba pendiente.
 */
export function Actions({ step, s }) {
  const n = step.n;
  const go = useContext(StepGo);
  // En la vista que se va (zoom hacia el mapa) los botones no llevan id
  const live = !useLeaving();
  return (
    <div className="journal-cta">
      <button type="button" className="gbtn" id={live ? "prevBtn" : undefined} disabled={n === 1} aria-label={`Paso ${n - 1}`}
        onClick={() => go(n - 1)}><Tri dir="prev" /> {n > 1 ? n - 1 : ""}</button>
      <div className="journal-cta-main">
        <StepButton step={step} s={s} id={live ? "toggleBtn" : undefined} />
        <AlsoLine s={s} closes={pendingCloses(s, n)} />
        <WaitLine n={n} done={!!s.done[n]} />
      </div>
      <button type="button" className="gbtn" id={live ? "nextBtn" : undefined} disabled={n === STEPS.length} aria-label={`Paso ${n + 1}`}
        onClick={() => go(n + 1)}>{n < STEPS.length ? n + 1 : ""} <Tri dir="next" /></button>
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
      {/* El cuerpo y la barra juntos: en escritorio, el tope hasta donde sube la barra pegada */}
      <div className="journal-main">
        <div className="journal-body">
          <Needs n={n} s={s} />
          <Quests step={step} quests={quests} loaded={s.questsLoaded} s={s} />
          <p className="asset-note">Texto de Sandglass · resaltados de Torrente Arcano · imágenes vía DofusDB</p>
        </div>
        <Actions step={step} s={s} />
      </div>
    </article>
  );
}
