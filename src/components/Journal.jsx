import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { STEPS, TIER_META, ZONE_COLOR } from "../data/steps.js";
import { CALL_ICONS, HEADER_ICONS, OBJ_ICONS, ZONE_IMG, assetsFor, imgUrl } from "../lib/assets.js";
import { MAP_IMG, groupsOf, questsOf } from "../lib/quests.js";
import { achievementGuide, linkify, missionGuide } from "../lib/guides.js";
import PLANS from "../data/plans.json";
import { CLOSED_BY, bannerFigure, doneIcon, nextPendingAfter, optionalMissions, resolvesHere, startMap, stepCalls, stepTitle, stopPoints } from "../lib/journal.js";
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
  closedin: { label: "Se termina más adelante" },
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

// La punta del pendón: lo que baja el centro respecto de los lados (igual que el clip-path)
const TIP = 26;

/** Ancho y alto de un elemento, al día con sus cambios de tamaño. */
function useSize() {
  const ref = useRef(null);
  const [size, setSize] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const measure = () => setSize(prev => {
      const w = el.offsetWidth, h = el.offsetHeight;
      return prev && prev.w === w && prev.h === h ? prev : { w, h };
    });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/**
 * El marco dorado del pendón, con la punta incluida: el borde de fuera y el filete de
 * dentro. Va en SVG porque un borde de CSS no sigue las diagonales del clip-path.
 */
function BannerFrame({ w, h }) {
  // El contorno metido `d` px hacia dentro: los lados y el techo, d; las diagonales de
  // la punta bajan con pendiente TIP / (w/2) y, desplazadas d en su normal, suben d/cos
  const outline = d => {
    const slope = TIP / (w / 2);
    const up = d * Math.hypot(1, slope);
    const side = h - TIP + d * slope - up;
    return `M${d} ${d} H${w - d} V${side} L${w / 2} ${h - up} L${d} ${side} Z`;
  };
  return (
    <svg className="banner-frame" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path className="frame-out" d={outline(1)} />
      <path className="frame-in" d={outline(6)} />
    </svg>
  );
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
  const [ref, size] = useSize();
  return (
    <aside className="journal-banner" ref={ref} style={{ "--zone-color": ZONE_COLOR[step.zone] }}>
      {bg && <div className="journal-bg" style={{ backgroundImage: bg }}></div>}
      {size && <BannerFrame {...size} />}
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

const TIERS = Object.keys(TIER_META);

/** El esfuerzo del paso: relojes de arena del juego, de 1 (trivial) a 5 (épico). */
function Effort({ tier }) {
  const level = TIERS.indexOf(tier) + 1;
  if (!level || !HEADER_ICONS?.reset) return null;
  const label = TIER_META[tier].label;
  return (
    <span className="goal-effort" title={`Esfuerzo: ${label}`} aria-label={`Esfuerzo: ${label}`} role="img">
      {TIERS.map((t, i) => <img key={t} src={imgUrl(HEADER_ICONS.reset)} alt="" className={i < level ? undefined : "off"} />)}
    </span>
  );
}

/**
 * El objetivo (derecha): el logro con su icono, una frase por lo que pide, la cita de
 * Sandglass y, al pie, los pasos que cierra o donde se cierra.
 */
function Goal({ step, done }) {
  const plan = PLANS[step.n] || [];
  const achs = plan.filter(e => e.t === "a");
  const head = achs[0];
  const closedIn = !done && CLOSED_BY[step.n];
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
          <h2 className="journal-title">
            {head && achievementGuide(head.name) && achs.length === 1
              ? <a href={achievementGuide(head.name)} target="_blank" rel="noopener">{stepTitle(step)}</a>
              : stepTitle(step)}
          </h2>
          <Effort tier={step.effort} />
        </div>
      </div>
      <div className="goal-guide">
        {OBJ_ICONS.free && <img src={imgUrl(OBJ_ICONS.free)} alt="" />}
        <div>
          <small className="goal-guide-label">Texto de la guía</small>
          <p className={"journal-base" + (plan.length ? " is-source" : "")}><RichText text={step.base} /></p>
        </div>
      </div>
      {(calls.length > 0 || closedIn) && (
        <div className="goal-calls">
          {calls.map(([kind, text], i) => <Call key={i} step={step} kind={kind} text={text} />)}
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
  // Las misiones que la guía da por opcionales llevan su etiqueta
  const optional = new Set(optionalMissions(step).map(o => o.name.toLowerCase()));
  const items = quests.map((q, i) => {
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
          {optional.has(q.n.toLowerCase()) && <span className="q-optional" title="Opcional pero útil">Opcional</span>}
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
              {img && <img src={imgUrl(img)} alt="" />}
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
