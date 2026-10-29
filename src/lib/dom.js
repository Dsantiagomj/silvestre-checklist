// ============================================================================
// DOM A MANO — los embebidos pequeños (el hub, el inicio) se pintan sin React para que
// pesen poco; estas dos piezas crean sus nodos.
// ============================================================================

/** Un nodo `tag` con la clase `cls` y los atributos de `attrs`. */
export function el(tag, cls, attrs = {}) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/** Un nodo con texto: el texto va como texto, nunca como HTML. */
export function text(tag, cls, value) {
  const node = el(tag, cls);
  node.textContent = value;
  return node;
}
