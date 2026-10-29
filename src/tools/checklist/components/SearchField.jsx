import { useRef } from "react";

/**
 * El buscador de la ventana, igual en todas partes (pasos y objetos): lupa a la izquierda
 * y, a la derecha, cuántos coinciden y una × para borrar, o una pista (el atajo) con la
 * caja vacía. Escape también borra. Cada uso guarda su búsqueda y decide qué coincide.
 */
export default function SearchField({ id, matchesId, clearId, value, onChange, placeholder, label, inputRef, matches, total, hint, className = "" }) {
  const own = useRef(null);
  const ref = inputRef ?? own;
  const clear = () => { onChange(""); ref.current?.focus(); };
  const filled = value.trim() !== "";
  return (
    <div className={"search-field " + className}>
      <svg className="search-field-ic" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6" /><path d="M10.4 10.4 14 14" /></svg>
      <input ref={ref} type="search" id={id} value={value} autoComplete="off" placeholder={placeholder} aria-label={label}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          // Con algo escrito, Escape solo borra la búsqueda (no cierra el paso abierto)
          if (e.key === "Escape" && value) { e.stopPropagation(); onChange(""); }
        }} />
      <span className="search-field-end">
        {value ? (
          <>
            {filled && matches != null && <span id={matchesId}><b>{matches}</b> de {total}</span>}
            <button type="button" className="search-field-x" id={clearId} aria-label="Borrar búsqueda"
              onClick={clear}>×</button>
          </>
        ) : hint}
      </span>
    </div>
  );
}
