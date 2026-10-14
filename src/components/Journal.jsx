import { Fragment, useEffect, useState } from "react";
import { STEPS, TIER_META, ZONE_COLOR } from "../data/steps.js";
import { CALL_ICONS, ZONE_IMG, assetsFor, imgUrl } from "../lib/assets.js";
import { MAP_IMG, questsOf } from "../lib/quests.js";
import { achievementGuide, linkify, missionGuide } from "../lib/guides.js";
import PLANS from "../data/plans.json";
import { CLOSED_BY, bannerFigure, doneIcon, nextPendingAfter, resolvesHere, startMap, stepCalls, stepTitle, stopPoints } from "../lib/journal.js";
import { rowsOf } from "../lib/resources.js";
import {
  loadQuests, markSteps, rowHave, selectStep, setObjective, showOnMap, toggleRowOwned, toggleStep, useAppState,
} from "../state/store.js";
import { CoordChip, Objectives } from "./StepParts.jsx";
import Slot from "./needs/Slot.jsx";
import { useLeaving } from "../lib/leaving.js";
import QuestMark from "./QuestMark.jsx";

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
};

const list = ns => (ns.length > 1 ? `${ns.slice(0, -1).join(", ")} y ${ns.at(-1)}` : String(ns[0]));

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
 * El estandarte (izquierda): sobre el mapa del juego donde empieza el paso, su número,
 * su zona y lo que lo representa (bannerFigure). Sin mapa, el paisaje de la zona.
 */
function Banner({ step }) {
  const fig = bannerFigure(step.n);
  const map = startMap(step.n);
  const zone = ZONE_IMG[step.zone];
  const bg = [map && `url(${MAP_IMG}${map}.jpg)`, zone && `url(${imgUrl(zone.img)})`].filter(Boolean).join(", ");
  return (
    <aside className="journal-banner" style={{ "--zone-color": ZONE_COLOR[step.zone] }}>
      {bg && <div className="journal-bg" style={{ backgroundImage: bg }}></div>}
      <span className="journal-num">{step.n}</span>
      <span className="banner-zone">{step.zone}</span>
      {fig && (
        <figure className="journal-show" data-kind={fig.kind}>
          <img src={imgUrl(fig.img)} alt="" decoding="async" />
          <figcaption>
            <small className="journal-show-label">{fig.as}</small>
            <b className="journal-show-name">{fig.name}</b>
          </figcaption>
        </figure>
      )}
    </aside>
  );
}

const listSteps = ns => (ns.length > 1 ? `${ns.slice(0, -1).join(", ")} y ${ns.at(-1)}` : String(ns[0]));

/** Una frase con lo que pide el paso de un logro ("Misiones 1 a 7 del logro, hasta X."). */
function goalText(e) {
  const name = k => e.m[k - 1] || "un objetivo del logro";
  if (e.mode === "all") return e.m.length === 1 ? "La misión del logro." : `Las ${e.m.length} misiones del logro.`;
  if (e.mode === "upto") {
    const k = e.on.at(-1);
    return k > 1 ? `Misiones 1 a ${k} del logro, hasta ${name(k)}.` : `Misión 1 del logro: ${name(1)}.`;
  }
  return e.on.length > 1
    ? `Misiones ${listSteps(e.on)} del logro: ${listSteps(e.on.map(name))}.`
    : `Misión ${e.on[0]} del logro: ${name(e.on[0])}.`;
}

/**
 * El objetivo (derecha): el logro con su icono, una frase por lo que pide, la cita de
 * Sandglass y, al pie, los pasos que cierra o donde se cierra.
 */
function Goal({ step, done, s }) {
  const plan = PLANS[step.n] || [];
  const achs = plan.filter(e => e.t === "a");
  const head = achs[0];
  const many = achs.length > 1;
  const closedIn = !done && CLOSED_BY[step.n];
  const lineOf = e => (
    <span className="goal-line">
      {e.t === "align"
        ? (e.from != null && e.from < e.n
          ? `Misiones ${e.from} a ${e.n} del alineamiento bontariano.`
          : `Misión ${e.n} del alineamiento bontariano.`)
        : goalText(e)}
    </span>
  );
  const includes = stepCalls(step).filter(([kind]) => kind === "includes");
  const needs = rowsOf(step.n).length > 0;
  return (
    <div className="journal-goal">
      <button type="button" className="journal-to-map" onClick={() => showOnMap(step.n)} title="Volver al mapa con este paso">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 5l5-2 6 2 5-2v12l-5 2-6-2-5 2z" /><path d="M7 3v12M13 5v12" /></svg>
        Ver en el mapa
      </button>
      <div className="goal-head">
        <span className="goal-ach">{head?.img ? <img src={imgUrl(head.img)} alt="" /> : <QuestMark />}</span>
        <div>
          <small className="goal-kind">{head ? `Logro · ${step.zone}` : step.zone}</small>
          <h2 className="journal-title">
            {head && achievementGuide(head.name) && !many
              ? <a href={achievementGuide(head.name)} target="_blank" rel="noopener">{stepTitle(step)}</a>
              : stepTitle(step)}
          </h2>
          {plan.length === 1 && lineOf(plan[0])}
        </div>
      </div>
      {plan.length > 1 && (
        <ul className="goal-lines">
          {plan.map((e, i) => (
            <li key={i}>
              {many && e.t === "a" && (
                <b className="goal-of">
                  {e.img && <img src={imgUrl(e.img)} alt="" />}
                  {achievementGuide(e.name) ? <a href={achievementGuide(e.name)} target="_blank" rel="noopener">{e.name}</a> : e.name}
                </b>
              )}
              {lineOf(e)}
            </li>
          ))}
        </ul>
      )}
      <div className="journal-meta">
        <span className="badge">{TIER_META[step.effort].label}</span>
        {step.complete && <span className="badge is-complete" title="El paso pide el logro entero">Logro completo</span>}
        {done && <span className="badge is-done">✓ Hecho</span>}
      </div>
      <blockquote className={"journal-base" + (plan.length ? " is-source" : "")}><RichText text={step.base} /></blockquote>
      {(includes.length > 0 || needs) && (
        <div className="goal-prep">
          {includes.length > 0 && (
            <div className="prep-card">
              {includes.map(([kind, text], i) => <Call key={i} step={step} kind={kind} text={text} />)}
            </div>
          )}
          {needs && <div className="prep-card"><Needs n={step.n} s={s} /></div>}
        </div>
      )}
      {(closedIn || step.closes) && (
        <div className="goal-foot">
          {closedIn && (
            <button type="button" className="badge closed-in" onClick={() => selectStep(closedIn)}>
              Se cierra en el {closedIn} →
            </button>
          )}
          {step.closes?.map(m => (
            <button key={m} type="button" className="badge closes" data-n={m} onClick={() => selectStep(m)}>
              Cierra el {m} →
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Un aviso de la guía (rojo, verde o azul) con su medallón. */
function Call({ step, kind, text }) {
  return (
    <div className={`call ${kind}`}>
      <i aria-hidden="true">
        {kind === "must" ? <QuestMark />
          : kind === "done" ? <img src={imgUrl(doneIcon(step.n))} alt="" />
          : CALL_ICONS[kind] && <img src={imgUrl(CALL_ICONS[kind])} alt="" />}
      </i>
      <div>
        <b>{CALL[kind].label}</b>
        <RichText text={text} />
      </div>
    </div>
  );
}

/** Rojo, verde y azul de la guía, menos «Incluye», que va con el objetivo. */
function Calls({ step }) {
  const calls = stepCalls(step).filter(([kind]) => kind !== "includes");
  if (!calls.length) return null;
  return (
    <div className="journal-calls">
      {calls.map(([kind, text], i) => <Call key={i} step={step} kind={kind} text={text} />)}
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
 * antes de la actual, hechas; en la actual, los objetivos antes del que toca. Con el
 * paso hecho, todo. Devuelve el índice (en la lista aplanada) del objetivo actual.
 */
function progressOf(s, n, quests, i, q) {
  const total = q.s.reduce((a, stg) => a + stg.o.length, 0);
  if (s.done[n]) return total;
  const pos = Math.min(s.questPos[n] || 0, quests.length - 1);
  if (i < pos) return total;
  if (i > pos) return -1;
  // Hasta `total`: la última misión del paso, terminada, sale toda hecha
  return Math.min(s.questObj[q.id] || 0, total);
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
  return (
    <section className="journal-quests">
      <h3 className="journal-h"><span className="t">Misiones</span> <span className="n">({quests.length})</span></h3>
      {quests.map((q, i) => {
        let offset = 0;
        const at = progressOf(s, step.n, quests, i, q);
        const total = q.s.reduce((a, stg) => a + stg.o.length, 0);
        // Pulsar un objetivo lo da por hecho; uno hecho, vuelve a él
        const pick = s.done[step.n] ? null : k => {
          setObjective(step.n, i, q.id, k, total, quests.length);
          if (k >= total && quests[i + 1]) setOpen(quests[i + 1].id, true);
        };
        return (
          <details className="q-item" key={q.id} open={opened.has(q.id)}
            onToggle={e => setOpen(q.id, e.currentTarget.open)}>
            <summary>
              <QuestMark className="q-mark" />
              <span className="q-name">{q.n}</span>
              <span className="q-lv">{`Niv. ${q.lv}`}</span>
              {missionGuide(q.n) && (
                <a className="q-guide" href={missionGuide(q.n)} target="_blank" rel="noopener" title="Guía en Torrente Arcano">Guía ↗</a>
              )}
            </summary>
            {q.st?.cls && (
              <p className="q-start">El PNJ que la da depende de tu clase: está en el templo de tu clase.</p>
            )}
            {q.st && !q.st.cls && (
              <p className="q-start">
                Empieza con <b>{q.st.npc || "un PNJ"}</b>{q.st.a ? ` en ${q.st.a}` : ""} <CoordChip x={q.st.x} y={q.st.y} />
              </p>
            )}
            {q.s.map((stg, j) => {
              const from = offset;
              offset += stg.o.length;
              const here = stops.filter(p => p.quest === q.id && p.index >= from && p.index < offset);
              return (
                <Fragment key={j}>
                  {q.s.length > 1 && <p className="q-stage">Etapa {j + 1}{stg.n && stg.n !== q.n ? ` · ${stg.n}` : ""}</p>}
                  <Objectives route objs={stg.o} at={at - from} onPick={pick && (k => pick(from + k))}
                    stops={here.map(p => ({ index: p.index - from, text: p.text, resume: p.resume }))} />
                </Fragment>
              );
            })}
          </details>
        );
      })}
    </section>
  );
}

/**
 * Barra final, con los botones planos del juego: el paso anterior, «Paso hecho» (que
 * marca el paso y abre el siguiente pendiente) y el siguiente. Si el combate del paso
 * cierra otros que siguen pendientes, ofrece marcarlos también.
 */
function Actions({ step, s }) {
  const n = step.n;
  // En la vista que se va (zoom hacia el mapa) los botones no llevan id
  const live = !useLeaving();
  const done = !!s.done[n];
  const next = done ? null : nextPendingAfter({ ...s.done, [n]: true }, n);
  const closes = (step.closes || []).filter(c => !s.done[c]);
  function finish() {
    toggleStep(n);
    if (next != null) selectStep(next);
  }
  return (
    <div className="journal-cta">
      <button type="button" className="gbtn" id={live ? "prevBtn" : undefined} disabled={n === 1} aria-label={`Paso ${n - 1}`}
        onClick={() => selectStep(n - 1)}>◀ {n > 1 ? n - 1 : ""}</button>
      <div className="journal-cta-main">
        <button type="button" className={"gbtn go" + (done ? " is-done" : "")} id={live ? "toggleBtn" : undefined}
          title={done ? undefined : next != null ? `Marca el paso y abre el ${next}` : "Marca el paso"}
          onClick={done ? () => toggleStep(n) : finish}>
          {done ? "Desmarcar" : "✓ Paso hecho"}
        </button>
        {closes.length > 0 && (
          <button type="button" className="gbtn" id={live ? "closesBtn" : undefined} title={`Este paso también cierra el ${list(closes)}`}
            onClick={() => markSteps(closes)}>
            Marcar el {list(closes)} también
          </button>
        )}
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
        <Goal step={step} done={!!s.done[n]} s={s} />
      </div>
      <div className="journal-body">
        <Calls step={step} />
        <Quests step={step} quests={quests} loaded={s.questsLoaded} s={s} />
        <p className="asset-note">Texto de Sandglass · resaltados de Torrente Arcano · imágenes vía DofusDB</p>
      </div>
      <Actions step={step} s={s} />
    </article>
  );
}
