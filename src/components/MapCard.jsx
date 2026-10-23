import { useEffect, useId } from "react";
import { ZONE_COLOR } from "@dofus/steps.js";
import { CALL_ICONS, DOFUS_ROAD, OBJ_ICONS, imgUrl } from "../lib/assets.js";
import { CLOSED_BY, RESUMED_IN, doneIcon, resolvedBoss, stepCalls, stepTitle } from "../lib/journal.js";
import { questsOf } from "../lib/quests.js";
import { rowsOf } from "../lib/resources.js";
import { closeSteps, loadQuests, openInDiary, pendingCloses, toggleStep, useAppState } from "../state/store.js";
import Banner from "./Banner.jsx";
import { AlsoLine, stepLabel } from "./Journal.jsx";

const ROAD_AT = Object.fromEntries(DOFUS_ROAD.map(d => [d.step, d]));
const count = (k, one, many) => `${k} ${k === 1 ? one : many}`;

/** Fichas de pasos ("33", "5"…): llevan a ese paso sin salir del mapa. */
function Chips({ ns, onGo }) {
  return ns.map(c => (
    <button key={c} type="button" className="step-chip" data-n={c} onClick={() => onGo(c)}>{c}</button>
  ));
}

/** Una línea de la ficha con el icono y el rótulo de su aviso (rojo, verde o azul). */
function Line({ kind, icon, label, children }) {
  return (
    <div className={`map-card-line ${kind}`}>
      {icon && <img src={imgUrl(icon)} alt="" />}
      <p><b>{label}</b> {children}</p>
    </div>
  );
}

/**
 * La ficha de un paso en el mapa: a la izquierda su estandarte (el mismo del diario) y a
 * la derecha la zona, el título, lo que se gana, hasta dónde llegar, lo que se resuelve,
 * lo que piden y los botones. En escritorio flota junto al paso (StepMap); en móvil va
 * en la hoja inferior (BottomSheet).
 */
export default function MapCard({ step, done, questsLoaded, onGo, onClose, className = "", children, ...rest }) {
  const titleId = useId();
  const n = step.n;
  // Lo que el paso cierra y sigue pendiente se termina con él, como en el diario
  const s = useAppState();
  const closes = pendingCloses(s, n);
  // Las misiones (para contarlas) llegan en diferido: se piden al abrir la ficha
  useEffect(loadQuests, []);
  const egg = ROAD_AT[n];
  const boss = resolvedBoss(n);
  // Las mismas paradas que el detalle: si el paso se resuelve solo, solo la que deja el verde
  const stops = stepCalls(step).filter(m => m[0] === "stop");
  const later = !done && CLOSED_BY[n];
  // Donde se retoma (sin terminarse) va antes de donde se termina, como en el diario
  const resumed = done ? [] : RESUMED_IN[n] || [];
  const quests = questsLoaded ? questsOf(n).length : null;
  const items = rowsOf(n).length;
  const meta = [quests ? count(quests, "misión", "misiones") : null, items ? count(items, "objeto", "objetos") : null]
    .filter(Boolean).join(" · ");
  return (
    <div className={"map-card" + (className ? ` ${className}` : "")} aria-labelledby={titleId} {...rest}>
      {children}
      <Banner step={step} className="map-card-banner" />
      <div className="map-card-bd">
        <span className="map-card-zone" style={{ "--zone-color": ZONE_COLOR[step.zone] }}>{step.zone}</span>
        <h3 className="map-card-title" id={titleId}>{stepTitle(step)}</h3>
        {(egg || boss) && (
          <ul className="map-card-reward">
            {egg && <li className="egg"><img src={imgUrl(egg.img)} alt="" />Se gana {egg.name}</li>}
            {boss && <li className="boss"><img src={imgUrl(boss.img)} alt="" />Se pasa {boss.name}</li>}
          </ul>
        )}
        {stops.map(([, text], i) => (
          <Line key={i} kind="stop" icon={CALL_ICONS.stop} label="Hasta dónde llegar">{text}</Line>
        ))}
        {step.closes && (
          <Line kind="done" icon={doneIcon(n)} label="Lo que se resuelve">
            Cierra {step.closes.length > 1 ? "los pasos" : "el paso"} <Chips ns={step.closes} onGo={onGo} />
          </Line>
        )}
        {resumed.length > 0 && (
          <Line kind="resumed" icon={OBJ_ICONS.map} label="Se retoma más adelante">
            En el paso <Chips ns={resumed} onGo={onGo} />
          </Line>
        )}
        {later && (
          <Line kind="later" icon={OBJ_ICONS.fight} label="Se termina más adelante">
            En el paso <Chips ns={[later]} onGo={onGo} />
          </Line>
        )}
        {meta && <p className="map-card-meta">{meta}</p>}
        <div className="map-card-cta">
          <button type="button" className={"map-card-done" + (done ? " is-done" : "")}
            onClick={() => (closes.length ? closeSteps(n, closes) : toggleStep(n))}>
            {stepLabel(n, done)}
          </button>
          <button type="button" className="map-card-open" onClick={() => openInDiary(n)}>Abrir en el diario →</button>
        </div>
        <AlsoLine s={s} closes={closes} />
      </div>
      <button type="button" className="map-card-x" aria-label="Cerrar" onClick={onClose}>×</button>
    </div>
  );
}
