// ============================================================================
// LA PÁGINA QUE ALOJA UN EMBEBIDO — su cabecera fija y su columna. Lo usan el del
// Silvestre (src/embed.jsx) y el hub (src/hub/embed.js).
// ============================================================================

/** Hace `fn` como mucho una vez por frame, al cambiar el tamaño, el scroll o `observed`. */
function onLayout(fn, observed) {
  let frame = 0;
  const later = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; fn(); }); };
  fn();
  const ro = new ResizeObserver(later);
  for (const el of observed) ro.observe(el);
  window.addEventListener("resize", later, { passive: true });
  window.addEventListener("scroll", later, { passive: true });
}

/**
 * Lo que tapa arriba la cabecera fija de la página (la de Squarespace, #header), en la
 * variable `name` del anfitrión: el embebido se pega debajo y cabe en lo que queda. Si la
 * página ya la pone en el anfitrión, manda la suya.
 */
export function followPageHeader(host, name) {
  if (host.style.getPropertyValue(name)) return;
  const header = document.getElementById("header") || document.querySelector("body > header");
  if (!header) return;
  onLayout(() => {
    const pos = getComputedStyle(header).position;
    const top = pos === "fixed" || pos === "sticky" ? Math.max(0, Math.round(header.getBoundingClientRect().bottom)) : 0;
    host.style.setProperty(name, `${top}px`);
  }, [header]);
}

/**
 * El anfitrión de borde a borde de la ventana aunque esté en una columna estrecha (el
 * bloque de código de Squarespace): se corre hasta el borde izquierdo y toma el ancho de
 * la ventana sin la barra de scroll, así que no deja scroll horizontal.
 */
export function fillViewportWidth(host) {
  const column = host.parentElement;
  if (!column) return;
  onLayout(() => {
    const box = column.getBoundingClientRect();
    const cs = getComputedStyle(column);
    const left = box.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
    host.style.setProperty("width", `${document.documentElement.clientWidth}px`, "important");
    host.style.setProperty("max-width", "none", "important");
    host.style.setProperty("margin-left", `${-left}px`, "important");
  }, [column, document.documentElement]);
}
