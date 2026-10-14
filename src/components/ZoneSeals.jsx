import { STEPS, ZONES, ZONE_COLOR } from "../data/steps.js";
import { BRAND_ICON, ZONE_IMG, imgUrl } from "../lib/assets.js";
import { setZone } from "../state/store.js";

const TOTAL = Object.fromEntries(ZONES.map(z => [z, STEPS.filter(st => st.zone === z).length]));

function Seal({ zone, label, img, done, total, active, here, onClick }) {
  const full = done === total;
  return (
    <button type="button" className={"seal" + (full ? " full" : "") + (here ? " here" : "")}
      data-zone={zone} aria-pressed={active} onClick={onClick}
      title={`${label}: ${done} de ${total} pasos`}
      style={{ "--zone-color": zone ? ZONE_COLOR[zone] : "var(--amber)", "--p": `${(done / total) * 100}%` }}>
      <span className="seal-ring">
        <span className="seal-img" style={img ? { backgroundImage: `url(${imgUrl(img)})` } : undefined}></span>
        {full && <span className="seal-ok" aria-hidden="true">✓</span>}
      </span>
      <span className="seal-name">{label}</span>
      <span className="seal-count">{done}/{total}</span>
    </button>
  );
}

/** Sellos de zona: el paisaje de cada una con un anillo de avance. Filtran el diario. */
export default function ZoneSeals({ s, current }) {
  const active = s.filters.zones[0] ?? null;
  const hereZone = current != null ? STEPS[current - 1].zone : null;
  const doneIn = z => STEPS.filter(st => st.zone === z && s.done[st.n]).length;
  return (
    <div className="seals" id="zoneSeals" role="group" aria-label="Zonas">
      <Seal label="Todas" img={BRAND_ICON} done={STEPS.filter(st => s.done[st.n]).length} total={STEPS.length}
        active={active == null} onClick={() => setZone(null)} />
      {ZONES.map(z => (
        <Seal key={z} zone={z} label={z} img={ZONE_IMG[z]?.thumb} done={doneIn(z)} total={TOTAL[z]}
          active={active === z} here={z === hereZone} onClick={() => setZone(z)} />
      ))}
    </div>
  );
}
