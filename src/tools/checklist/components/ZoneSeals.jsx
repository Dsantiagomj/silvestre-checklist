import { useEffect, useRef, useState } from "react";
import { AnimatePresence, usePresence } from "motion/react";
import { prefersReducedMotion } from "../lib/motion.js";
import { STEPS, ZONES, ZONE_COLOR } from "@dofus/steps.js";
import { BRAND_ICON, ZONE_IMG, imgUrl } from "../lib/assets.js";
import { setZone } from "../state/store.js";
import { useDismiss } from "../lib/useDismiss.js";

const TOTAL = Object.fromEntries(ZONES.map(z => [z, STEPS.filter(st => st.zone === z).length]));

function Seal({ zone, label, img, done, total, active, here, onClick }) {
  const full = done === total;
  return (
    <button type="button" className={"seal" + (full ? " full" : "") + (here ? " here" : "")}
      data-zone={zone} aria-pressed={active} onClick={onClick}
      title={`${label}: ${done} de ${total} pasos`}
      style={{ "--zone-color": zone ? ZONE_COLOR[zone] : "var(--amber)", "--seal-p": `${(done / total) * 100}%` }}>
      <span className="seal-ring">
        {/* Zona del paso abierto: marcador de ubicación encima; el anillo es del filtro */}
        {here && (
          <span className="seal-pin" title="Zona del paso abierto" aria-hidden="true">
            <svg viewBox="0 0 16 20"><path d="M8 19s6-6.2 6-11A6 6 0 0 0 2 8c0 4.8 6 11 6 11z" /><circle cx="8" cy="8" r="2.4" /></svg>
          </span>
        )}
        <span className="seal-img" style={img ? { backgroundImage: `url(${imgUrl(img)})` } : undefined}></span>
        {full && <span className="seal-ok" aria-hidden="true">✓</span>}
      </span>
      <span className="seal-name">{label}</span>
      <span className="seal-count">{done}/{total}</span>
    </button>
  );
}

/**
 * El panel de los sellos. Entra cayendo un poco desde el botón (CSS) y, al cerrarse, se
 * apaga subiendo antes de irse en vez de desaparecer de golpe.
 */
function ZonePop({ children }) {
  const [present, safeToRemove] = usePresence();
  const ref = useRef(null);
  useEffect(() => {
    if (present) return;
    if (prefersReducedMotion()) return safeToRemove();
    ref.current.animate(
      [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-6px) scale(.98)" }],
      { duration: 160, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" },
    ).finished.then(safeToRemove, safeToRemove);
  }, [present]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="zone-pop seals" id={present ? "zoneSeals" : undefined} role="group" aria-label="Zonas" ref={ref} inert={!present}>
      {children}
    </div>
  );
}

/**
 * Zona: un botón con la zona elegida y su avance que despliega los sellos (el paisaje de
 * cada zona con un anillo de avance). Elegir uno filtra los pasos y lo cierra; también
 * se cierra con Escape o pulsando fuera.
 */
export default function ZoneSeals({ s, current }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const active = s.filters.zones[0] ?? null;
  const hereZone = current != null ? STEPS[current - 1].zone : null;
  const doneIn = z => STEPS.filter(st => st.zone === z && s.done[st.n]).length;
  const allDone = STEPS.filter(st => s.done[st.n]).length;

  useDismiss(open, () => setOpen(false), boxRef);

  const pick = z => { setZone(z); setOpen(false); };
  return (
    <div className="zone-menu" ref={boxRef}>
      <button type="button" className="zone-btn" id="zoneBtn" aria-expanded={open} aria-controls="zoneSeals"
        onClick={() => setOpen(o => !o)}>
        {/* En la barra, un marcador en vez del «Zona:» (que sigue para los lectores de pantalla) */}
        <svg className="zone-ic" viewBox="0 0 16 20" aria-hidden="true"><path d="M8 19s6-6.2 6-11A6 6 0 0 0 2 8c0 4.8 6 11 6 11z" /><circle cx="8" cy="8" r="2.4" /></svg>
        <span className="sr-only">Zona:</span> <b>{active ?? "Todas"}</b>
        <span className="zone-count"> · {active ? doneIn(active) : allDone}/{active ? TOTAL[active] : STEPS.length}</span>
        <span className="zone-caret" aria-hidden="true">▾</span>
      </button>
      <AnimatePresence>
        {open && (
          <ZonePop key="pop">
            <Seal label="Todas" img={BRAND_ICON} done={allDone} total={STEPS.length}
              active={active == null} onClick={() => pick(null)} />
            {ZONES.map(z => (
              <Seal key={z} zone={z} label={z} img={ZONE_IMG[z]?.thumb} done={doneIn(z)} total={TOTAL[z]}
                active={active === z} here={z === hereZone} onClick={() => pick(z)} />
            ))}
          </ZonePop>
        )}
      </AnimatePresence>
    </div>
  );
}
