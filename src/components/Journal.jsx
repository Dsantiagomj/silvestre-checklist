import { Fragment, useEffect } from "react";
import { STEPS, TIER_META, ZONE_COLOR } from "../data/steps.js";
import { CALL_ICONS, ZONE_IMG, assetsFor, imgUrl } from "../lib/assets.js";
import { questsOf } from "../lib/quests.js";
import { linkify, missionGuide } from "../lib/guides.js";
import { nextPendingAfter, showcase, stepTitle, stopPoint } from "../lib/journal.js";
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

/** Cabecera de escenario: el paisaje de la zona, el paso y su jefe o su icono. */
function Hero({ step, done, quests }) {
  const show = showcase(step.n);
  const zone = ZONE_IMG[step.zone];
  return (
    <div className="journal-hero">
      {zone && <div className="journal-bg" style={{ backgroundImage: `url(${imgUrl(zone.img)})` }}></div>}
      <button type="button" className="journal-to-map" onClick={() => showOnMap(step.n)} title="Volver al mapa con este paso">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 5l5-2 6 2 5-2v12l-5 2-6-2-5 2z" /><path d="M7 3v12M13 5v12" /></svg>
        Ver en el mapa
      </button>
      <div className="journal-head">
        <span className="journal-num">{step.n}</span>
        <h2 className="journal-title">{stepTitle(step)}</h2>
        <div className="journal-meta">
          <span className="badge zone" style={{ "--zone-color": ZONE_COLOR[step.zone] }}><span className="dot"></span>{step.zone}</span>
          <span className="badge">{TIER_META[step.effort].label}</span>
          {step.complete && <span className="badge is-complete" title="El paso pide el logro entero">Logro completo</span>}
          {quests.length > 0 && <span className="badge">{quests.length} {quests.length === 1 ? "misión" : "misiones"}</span>}
          {done && <span className="badge is-done">✓ Hecho</span>}
        </div>
      </div>
      {show && (
        <figure className="journal-show">
          <img src={imgUrl(show.img)} alt="" decoding="async" />
          <figcaption>
            <small className="journal-show-label">{show.label}</small>
            <b className="journal-show-name">{show.name}</b>
          </figcaption>
        </figure>
      )}
    </div>
  );
}

/** Rojo, verde y azul de la guía; el verde enlaza los pasos que cierra. */
function Calls({ step }) {
  if (!step.marks) return null;
  return (
    <div className="journal-calls">
      {step.marks.map(([kind, text], i) => (
        <div key={i} className={`call ${kind}`}>
          <i aria-hidden="true">
            {kind === "must" ? <QuestMark /> : CALL_ICONS[kind] && <img src={imgUrl(CALL_ICONS[kind])} alt="" />}
          </i>
          <div>
            <b>{CALL[kind].label}</b>
            <RichText text={text} />
          </div>
        </div>
      ))}
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
  if (!loaded) return <p className="asset-note">Cargando misiones…</p>;
  if (!quests.length) return null;
  const stop = stopPoint(step, quests);
  // La misión en curso (la del avance del overlay o del diario) va abierta
  const pos = Math.min(s.questPos[step.n] || 0, quests.length - 1);
  return (
    <section className="journal-quests">
      <h3 className="journal-h"><span className="t">Misiones</span> <span className="n">({quests.length})</span></h3>
      {quests.map((q, i) => {
        let offset = 0;
        const at = progressOf(s, step.n, quests, i, q);
        const total = q.s.reduce((a, stg) => a + stg.o.length, 0);
        // Pulsar un objetivo lo da por hecho; uno hecho, vuelve a él
        const pick = s.done[step.n] ? null : k => setObjective(step.n, i, q.id, k, total, quests.length);
        return (
          <details className="q-item" key={q.id}
            open={stop?.quest === q.id || quests.length === 1 || (!s.done[step.n] && i === pos)}>
            <summary>
              <QuestMark className="q-mark" />
              <span className="q-name">{q.n}</span>
              <span className="q-lv">{`Niv. ${q.lv}`}</span>
              {missionGuide(q.n) && (
                <a className="q-guide" href={missionGuide(q.n)} target="_blank" rel="noopener" title="Guía en Torrente Arcano">Guía ↗</a>
              )}
            </summary>
            {q.st && (
              <p className="q-start">
                Empieza con <b>{q.st.npc || "un PNJ"}</b>{q.st.a ? ` en ${q.st.a}` : ""} <CoordChip x={q.st.x} y={q.st.y} />
              </p>
            )}
            {q.s.map((stg, j) => {
              const from = offset;
              offset += stg.o.length;
              const here = stop?.quest === q.id && stop.index >= from && stop.index < offset;
              return (
                <Fragment key={j}>
                  {q.s.length > 1 && <p className="q-stage">Etapa {j + 1}{stg.n && stg.n !== q.n ? ` · ${stg.n}` : ""}</p>}
                  <Objectives route objs={stg.o} at={at - from} onPick={pick && (k => pick(from + k))}
                    stop={here ? { index: stop.index - from, text: stop.text } : null} />
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
  const reward = a?.icon?.from === "item" && a.bosses?.length ? a.icon : null;

  // Quien abre un paso quiere las misiones ya, sin esperar al reposo
  useEffect(loadQuests, []);

  return (
    <article className="journal" id={leaving ? undefined : id} aria-label={`Paso ${n}`}>
      <Hero step={step} done={!!s.done[n]} quests={quests} />
      <div className="journal-body">
        <p className="journal-base"><RichText text={step.base} /></p>
        <Calls step={step} />
        {(reward || a?.bosses?.length > 1) && (
          <div className="journal-extras">
            {reward && (
              <span className="journal-reward">
                <img src={imgUrl(reward.src)} alt="" loading="lazy" />
                <span>Recompensa: <b className="journal-reward-name">{reward.label}</b></span>
              </span>
            )}
            {a.bosses.length > 1 && (
              <div className="boss-row">
                {a.bosses.map(b => (
                  <span key={b.id} className="boss-chip" title={`Jefe: ${b.name}`}>
                    <img src={imgUrl(b.img)} alt="" loading="lazy" decoding="async" /> {b.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        <Needs n={n} s={s} />
        <Quests step={step} quests={quests} loaded={s.questsLoaded} s={s} />
        <Actions step={step} s={s} />
        <p className="asset-note">Texto de Sandglass · resaltados de Torrente Arcano · imágenes vía DofusDB</p>
      </div>
    </article>
  );
}
