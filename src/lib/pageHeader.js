// ============================================================================
// LA PÁGINA QUE ALOJA UN EMBEBIDO — su cabecera fija y su columna. Lo usan el del
// Silvestre (src/embed.jsx), el hub (src/hub/embed.js) y el inicio (src/inicio/embed.js).
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

const px = v => parseFloat(v) || 0;

/** Lo que la página pinta debajo del anfitrión: sus hermanos siguientes y los rellenos de abajo. */
function heightBelow(host) {
  let sum = px(getComputedStyle(host).marginBottom);
  for (let node = host; node.parentElement && node !== document.body; node = node.parentElement) {
    for (let sib = node.nextElementSibling; sib; sib = sib.nextElementSibling) {
      const cs = getComputedStyle(sib);
      if (cs.display === "none" || cs.position === "absolute" || cs.position === "fixed") continue;
      sum += sib.getBoundingClientRect().height + px(cs.marginTop) + px(cs.marginBottom);
    }
    const pcs = getComputedStyle(node.parentElement);
    sum += px(pcs.paddingBottom) + px(pcs.borderBottomWidth);
  }
  return sum;
}

/**
 * El alto del anfitrión en la variable `name`: lo que deja la ventana entre lo que va encima
 * (la cabecera fija y el relleno que la compensa) y lo que va debajo (el pie), sin scroll.
 * Si eso queda por debajo de `min` (un móvil, con un pie alto), llena la pantalla bajo la
 * cabecera fija y el pie queda debajo.
 */
export function fitBetweenHeaderAndFooter(host, name, min) {
  const header = document.getElementById("header") || document.querySelector("body > header");
  onLayout(() => {
    const pos = header && getComputedStyle(header).position;
    const fixedTop = pos === "fixed" || pos === "sticky" ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
    const above = Math.max(fixedTop, host.getBoundingClientRect().top + window.scrollY);
    const fit = window.innerHeight - above - heightBelow(host);
    const h = fit >= min ? fit : window.innerHeight - fixedTop;
    host.style.setProperty(name, `${Math.floor(h)}px`);
  }, [document.body, ...(header ? [header] : [])]);
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
