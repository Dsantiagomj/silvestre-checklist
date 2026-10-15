import { useState } from "react";
import { STEPS, ZONE_COLOR } from "../data/steps.js";
import { assetsFor, imgUrl } from "../lib/assets.js";
import { MAP_IMG, coordLabel, currentQuest, locationFor } from "../lib/quests.js";
import {
  moveObjective, moveQuest, overlayGo, overlayStep, progressPct, toggleStep, useAppState,
} from "../state/store.js";
import { CoordChip, Objectives, ReqBlock } from "../components/StepParts.jsx";

/** Mapa del objetivo; si DofusDB no tiene la imagen, la figura desaparece. */
function MapFigure({ loc, where }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <figure className="ov-map">
      <img src={`${MAP_IMG}${loc.m}.jpg`} alt="Mapa del objetivo" loading="lazy" onError={() => setFailed(true)} />
      {where && <figcaption>{loc.carried ? "Última ubicación conocida · " : ""}{where}</figcaption>}
    </figure>
  );
}

function QuestView({ n, a, cur, s }) {
  // Se cuentan las misiones que se hacen: las de solo tomarla no salen
  const { walked, at, q, objs, k } = cur;
  const more = at < walked.length - 1;
  const now = objs[k];
  const upcoming = objs.slice(k + 1, k + 4);
  const loc = locationFor(cur);
  const where = loc ? [loc.a, loc.x != null ? `[${coordLabel(loc.x, loc.y)}]` : ""].filter(Boolean).join(" · ") : "";
  const last = k >= objs.length - 1;
  return (
    <>
      <div className="ov-card ov-qhead">
        <div className="ov-icon">{a.icon ? <img src={imgUrl(a.icon.src)} alt="" /> : <b>{n}</b>}</div>
        <div className="ov-qmeta">
          <p className="ov-title">{q.n}</p>
          <div className="ov-chips">
            {q.st?.npc && <span className="ov-chip">{`💬 ${q.st.npc}`}</span>}
            <span className="ov-chip">{`◎ Nv. ${q.lv}`}</span>
            {q.st?.a && <span className="ov-chip">{`📍 ${q.st.a}`}</span>}
            <CoordChip x={q.st?.x} y={q.st?.y} />
          </div>
        </div>
      </div>
      <div className="ov-switch">
        <button data-q="-1" disabled={!(at > 0)} aria-label="Misión anterior" onClick={() => moveQuest(-1)}>‹</button>
        <span>Misión <b>{at + 1}</b> / {walked.length} <span className="muted">· Paso {n}</span></span>
        <button data-q="1" disabled={!more} aria-label="Misión siguiente" onClick={() => moveQuest(1)}>›</button>
      </div>
      <ReqBlock n={n} open={false} s={s} />
      {/* key: una imagen nueva vuelve a intentarlo aunque la anterior fallara */}
      {loc && <MapFigure key={loc.m} loc={loc} where={where} />}
      {now && (
        <div className="ov-card ov-obj">
          <span className="ov-bang">!</span>
          <div className="ov-obj-body">
            <p className="ov-label">Objetivo <span className="muted">· {k + 1} / {objs.length}</span></p>
            <div className="ov-objbar"><span style={{ width: `${((k + 1) / objs.length) * 100}%` }}></span></div>
            <Objectives objs={[now]} />
          </div>
        </div>
      )}
      {upcoming.length > 0 && (
        <div className="ov-card ov-next">
          <p className="ov-label muted">Después</p>
          <Objectives objs={upcoming} />
        </div>
      )}
      <div className="ov-stagenav">
        <button data-ob="-1" disabled={!(k > 0)} onClick={() => moveObjective(-1)}>‹</button>
        <button data-ob="1" disabled={last && !more} onClick={() => moveObjective(1)}>
          {last ? (more ? "Siguiente misión ›" : "Misión completa") : "Siguiente objetivo ›"}
        </button>
      </div>
    </>
  );
}

/** Contenido del overlay: el paso en curso, su misión y el objetivo actual. */
export default function OverlayView() {
  const s = useAppState();
  const n = overlayStep(s);
  const step = STEPS[n - 1];
  const a = assetsFor(n) || {};
  const done = !!s.done[n];
  const pct = progressPct(s);
  const cur = s.questsLoaded ? currentQuest(n, s.questPos, s.questObj) : null;

  return (
    <div className="ov">
      <div className="ov-top">
        <span className="ov-chip" style={{ "--zone-color": ZONE_COLOR[step.zone] }}><span className="dot"></span>{step.zone}</span>
        {done && <span className="ov-chip done">✓ Hecho</span>}
        <div className="bar-outer"><div className="bar-fill" style={{ width: `${pct}%` }}></div></div>
        <b>{pct}%</b>
      </div>
      {cur ? <QuestView n={n} a={a} cur={cur} s={s} /> : (
        <>
          <div className="ov-card ov-qhead">
            <div className="ov-icon">{a.icon ? <img src={imgUrl(a.icon.src)} alt="" /> : <b>{n}</b>}</div>
            <div>
              <p className="ov-title">Paso {n} <span className="muted">/ {STEPS.length}</span></p>
              {a.icon?.from === "item" && <div className="ov-chips"><span className="ov-chip">{`🎁 ${a.icon.label}`}</span></div>}
            </div>
          </div>
          <ReqBlock n={n} open={false} s={s} />
        </>
      )}
      <details className="ov-card ov-guide" open={!cur}>
        <summary>Indicaciones de la guía · Paso {n}</summary>
        <div className="ov-text">{step.text}</div>
      </details>
      <div className="ov-actions">
        <button data-go={n - 1} disabled={!(n > 1)} aria-label="Paso anterior" onClick={() => overlayGo(n - 1)}>←</button>
        <button className={"ov-toggle" + (done ? " is-done" : "")} data-toggle="" onClick={() => toggleStep(n)}>
          {done ? "Desmarcar paso" : "Marcar paso hecho"}
        </button>
        <button data-go={n + 1} disabled={!(n < STEPS.length)} aria-label="Paso siguiente" onClick={() => overlayGo(n + 1)}>→</button>
      </div>
    </div>
  );
}
