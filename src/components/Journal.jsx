import { Fragment, useEffect } from "react";
import { STEPS, TIER_META, ZONE_COLOR } from "../data/steps.js";
import { ZONE_IMG, assetsFor, imgUrl } from "../lib/assets.js";
import { questsOf } from "../lib/quests.js";
import { linkify, missionGuide } from "../lib/guides.js";
import { nextPendingAfter, showcase, stepTitle, stopPoint } from "../lib/journal.js";
import { loadQuests, markSteps, selectStep, toggleStep, useAppState } from "../state/store.js";
import { CoordChip, Objectives, ReqBlock } from "./StepParts.jsx";
import QuestMark from "./QuestMark.jsx";

// Los tres resaltados de la guía (rojo, verde, azul en torrentearcano)
const CALL = {
  stop: { label: "Hasta dónde llegar", icon: "⛔" },
  done: { label: "Lo que se resuelve", icon: "⚔️" },
  tip: { label: "Consejo", icon: "💡" },
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
      <div className="journal-head">
        <span className="journal-num">{step.n}</span>
        <h2 className="journal-title">{stepTitle(step)}</h2>
        <div className="journal-meta">
          <span className="badge zone" style={{ "--zone-color": ZONE_COLOR[step.zone] }}><span className="dot"></span>{step.zone}</span>
          <span className="badge">{TIER_META[step.effort].label}</span>
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
          <i aria-hidden="true">{CALL[kind].icon}</i>
          <div>
            <b>{CALL[kind].label}</b>
            <RichText text={text} />
            {kind === "done" && step.closes && (
              <span className="call-steps">
                Cierra también:
                {step.closes.map(c => (
                  <button key={c} type="button" className="step-chip" data-n={c} onClick={() => selectStep(c)}>Paso {c}</button>
                ))}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Misiones del paso; la que lleva la parada roja va abierta y la marca. */
function Quests({ step, quests, loaded }) {
  if (!loaded) return <p className="asset-note">Cargando misiones…</p>;
  if (!quests.length) return null;
  const stop = stopPoint(step, quests);
  return (
    <section className="journal-quests">
      <h3 className="journal-h">Misiones <span className="n">({quests.length})</span></h3>
      {quests.map((q, i) => {
        let offset = 0;
        return (
          <details className="q-item" key={q.id} open={stop?.quest === q.id || quests.length === 1}>
            <summary>
              <QuestMark className="q-mark" />
              <span className="q-name">{q.n}</span>
              <span className="q-lv">{`nv. ${q.lv}`}</span>
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
                  <Objectives objs={stg.o} stop={here ? { index: stop.index - from, text: stop.text } : null} />
                </Fragment>
              );
            })}
          </details>
        );
      })}
    </section>
  );
}

/** Marcar el paso y seguir; si su combate cierra otros pendientes, ofrecerlos. */
function Actions({ step, s }) {
  const n = step.n;
  const done = !!s.done[n];
  const next = done ? null : nextPendingAfter({ ...s.done, [n]: true }, n);
  const closes = (step.closes || []).filter(c => !s.done[c]);
  function finish() {
    toggleStep(n);
    if (next != null) selectStep(next);
  }
  return (
    <div className="journal-cta">
      <button type="button" className={"btn-primary" + (done ? " is-done" : "")} id="toggleBtn" onClick={done ? () => toggleStep(n) : finish}>
        {done ? "Desmarcar paso" : next != null ? `✓ Paso hecho · ir al ${next}` : "✓ Paso hecho"}
      </button>
      {closes.length > 0 && (
        <span className="journal-also">
          Este paso también cierra el {list(closes)}
          <button type="button" className="btn-secondary" id="closesBtn" onClick={() => markSteps(closes)}>
            Marcar el {list(closes)} también
          </button>
        </span>
      )}
      <div className="detail-nav">
        <button type="button" className="btn-nav" id="prevBtn" disabled={n === 1} onClick={() => selectStep(n - 1)}>← {n > 1 ? `Paso ${n - 1}` : ""}</button>
        <button type="button" className="btn-nav" id="nextBtn" disabled={n === STEPS.length} onClick={() => selectStep(n + 1)}>{n < STEPS.length ? `Paso ${n + 1}` : ""} →</button>
      </div>
    </div>
  );
}

/** Detalle de un paso en el diario. Lo usan el panel (escritorio) y la hoja (móvil). */
export default function Journal({ n, id }) {
  const s = useAppState();
  const step = STEPS[n - 1];
  const quests = s.questsLoaded ? questsOf(n) : [];
  const a = assetsFor(n);
  const reward = a?.icon?.from === "item" && a.bosses?.length ? a.icon : null;

  // Quien abre un paso quiere las misiones ya, sin esperar al reposo
  useEffect(loadQuests, []);

  return (
    <article className="journal" id={id} aria-label={`Paso ${n}`}>
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
        <Quests step={step} quests={quests} loaded={s.questsLoaded} />
        <ReqBlock n={n} open s={s} title="Necesitas" />
        <Actions step={step} s={s} />
        <p className="asset-note">Texto de Sandglass · resaltados de Torrente Arcano · imágenes vía DofusDB</p>
      </div>
    </article>
  );
}
