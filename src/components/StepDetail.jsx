import { Fragment, useEffect } from "react";
import { STEPS, ZONE_COLOR } from "../data/steps.js";
import { assetsFor, imgUrl, mergeItems } from "../lib/assets.js";
import { questsOf } from "../lib/quests.js";
import {
  clearSelection, closeSheet, goToNextPending, isMobile, loadQuests, selectStep, toggleStep, useAppState,
} from "../state/store.js";
import { CoordChip, Objectives, ReqBlock } from "./StepParts.jsx";

const LABEL = { item: "Recompensa", boss: "Jefe", category: "Categoría" };

/** Bloque "Misiones (N)" del panel de detalle: cada misión se despliega. */
function QuestsBlock({ n, loaded }) {
  if (!loaded) return <p className="asset-note">Cargando misiones…</p>;
  const list = questsOf(n);
  if (!list.length) return null;
  return (
    <details className="req quests-block">
      <summary>Misiones <span className="n">({list.length})</span></summary>
      <div className="q-list">
        {list.map((q, i) => (
          <details className="q-item" key={q.id}>
            <summary>
              <span className="q-num">{i + 1}</span>
              <span className="q-name">{q.n}</span>
              <span className="q-lv">{`nv. ${q.lv}`}</span>
            </summary>
            {q.st && (
              <p className="q-start">
                Empieza con <b>{q.st.npc || "un PNJ"}</b>{q.st.a ? ` en ${q.st.a}` : ""} <CoordChip x={q.st.x} y={q.st.y} />
              </p>
            )}
            {q.s.map((stg, j) => (
              <Fragment key={j}>
                <p className="q-stage">Etapa {j + 1}{stg.n && stg.n !== q.n ? ` · ${stg.n}` : ""}</p>
                <Objectives objs={stg.o} />
              </Fragment>
            ))}
          </details>
        ))}
      </div>
    </details>
  );
}

/** Bloque de assets del paso: recompensa destacada + jefes + mazmorras/misiones. */
function AssetBlock({ n, owned, questsLoaded }) {
  const a = assetsFor(n);
  if (!a) return null;
  const ach = a.achievements?.[0];
  const chips = [
    ...(a.dungeons || []).map(d => `🏰 ${d.name}`),
    ...(a.quests || []).map(q => `📜 ${q.name}`),
  ];
  // Igual que la versión vanilla: la nota sale solo si el bloque muestra algo.
  const hasContent = !!a.icon || a.bosses?.length > 0 || chips.length > 0 ||
    mergeItems(a.items || []).length > 0 || !questsLoaded || questsOf(n).length > 0;

  return (
    <>
      {a.icon && (
        <div className="detail-art">
          <div className="detail-art-main">
            <img src={imgUrl(a.icon.src)} alt="" loading="lazy" decoding="async" />
          </div>
          <div className="detail-art-meta">
            <p className="detail-art-label">{LABEL[a.icon.from] || "Asset"}</p>
            <p className="detail-art-name">{a.icon.label}</p>
            {ach && <p className="detail-art-sub">Logro: {ach.name}</p>}
          </div>
        </div>
      )}
      {a.bosses?.length > 0 && (
        <div className="boss-row">
          {a.bosses.map((b, i) => (
            <span key={i} className="boss-chip" title={`Jefe: ${b.name}`}>
              <img src={imgUrl(b.img)} alt="" loading="lazy" decoding="async" />
              {" "}{b.name}{" "}
            </span>
          ))}
        </div>
      )}
      {chips.length > 0 && (
        <div className="detail-badges">
          {chips.map((c, i) => <span key={i} className="badge">{c}</span>)}
        </div>
      )}
      <ReqBlock n={n} open owned={owned} />
      <QuestsBlock n={n} loaded={questsLoaded} />
      {hasContent ? <p className="asset-note">Assets vía DofusDB · emparejados automáticamente</p> : null}
    </>
  );
}

/** Contenido del detalle de un paso. Lo usan el panel (escritorio) y la hoja (móvil). */
export default function StepDetail({ n }) {
  const s = useAppState();
  const step = STEPS[n - 1];
  const done = !!s.done[n];
  const prev = n > 1 ? n - 1 : null;
  const next = n < STEPS.length ? n + 1 : null;

  // Quien abre un paso quiere las misiones ya, sin esperar al reposo
  useEffect(loadQuests, []);

  function close() {
    if (isMobile()) closeSheet();
    else clearSelection();
  }

  return (
    <>
      <div className="detail-head">
        <div className="detail-num-wrap">
          <p className="detail-num-eyebrow">{done ? "✓ Completado" : "Etapa"} {step.n}/100</p>
          <h2 className="detail-num">Paso {step.n}</h2>
        </div>
        <button className="detail-close" id="detailCloseBtn" aria-label="Cerrar detalle" onClick={close}>×</button>
      </div>
      <div className="detail-body">
        <div className="detail-badges">
          <span className="badge zone" style={{ "--zone-color": ZONE_COLOR[step.zone] }}><span className="dot"></span>{step.zone}</span>
        </div>
        <AssetBlock n={n} owned={s.owned} questsLoaded={s.questsLoaded} />
        <div className="detail-text">{step.text}</div>
        <div className="detail-cta">
          <button className={"btn-primary" + (done ? " is-done" : "")} id="toggleBtn" onClick={() => toggleStep(n)}>
            {done ? "Desmarcar paso" : "Marcar como completado"}
          </button>
          <div className="detail-nav">
            <button className="btn-nav" id="prevBtn" disabled={!prev} onClick={() => selectStep(n - 1)}>← Paso {prev || ""}</button>
            <button className="btn-nav" id="nextBtn" disabled={!next} onClick={() => selectStep(n + 1)}>Paso {next || ""} →</button>
          </div>
          <button className="btn-secondary" id="goNextBtn" onClick={goToNextPending}>Ir al siguiente pendiente</button>
        </div>
      </div>
    </>
  );
}
