import { ZONES, ZONE_COLOR } from "../data/steps.js";
import {
  clearFilters, hasActiveFilters, setPendingFilter, setSearch, toggleZone, useAppState,
} from "../state/store.js";

/** FILTROS */
export default function Filters() {
  const s = useAppState();
  const { zones, pending, search } = s.filters;
  return (
    <section className="filters" aria-label="Filtros">
      <div className="filter-row">
        <span className="lbl">Zonas:</span>
        <div className="chips-scroll" id="zoneChips">
          {ZONES.map(z => (
            <button key={z} className={"chip" + (zones.includes(z) ? " active" : "")} data-type="zone" data-value={z}
              style={{ "--zone-color": ZONE_COLOR[z] }} onClick={() => toggleZone(z)}>
              <span className="dot"></span>{z}
            </button>
          ))}
          {/* Tiers eliminados del UI — el sistema interno de pesos sigue activo
              pero no se exponen badges/chips de esfuerzo al usuario */}
        </div>
      </div>
      <div className="filter-row">
        <input type="search" className="search" id="searchInput" placeholder="🔎 Buscar por número o texto del paso…"
          aria-label="Buscar paso" value={search} onChange={e => setSearch(e.target.value)} />
        <label className="toggle">
          <input type="checkbox" id="pendingToggle" checked={pending} onChange={e => setPendingFilter(e.target.checked)} />
          <span className="sw"></span>
          Solo pendientes
        </label>
        <button className={"clear-btn" + (hasActiveFilters(s) ? "" : " hidden")} id="clearBtn" onClick={clearFilters}>Limpiar filtros</button>
      </div>
    </section>
  );
}
