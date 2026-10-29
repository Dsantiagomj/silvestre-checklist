// ============================================================================
// LA CARTA QUE SE INCLINA — con el ratón encima se inclina hacia él y el brillo holográfico
// lo sigue (--fx, --fy, que pinta el CSS de cada embebido). La usan el hub
// (src/hub/hub.js) y el inicio (src/inicio/inicio.js).
// ============================================================================
const still = matchMedia("(prefers-reduced-motion: reduce)");

/**
 * Con el ratón por encima, `card` se inclina hacia él hasta `max` grados por lado, con la
 * perspectiva `depth`. Solo con ratón y sin movimiento reducido; al salir vuelve a su sitio.
 */
export function tilt(card, { max = 9, depth = 800 } = {}) {
  card.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse" || still.matches) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    card.style.transform = `perspective(${depth}px) rotateY(${((x - .5) * 2 * max).toFixed(2)}deg) rotateX(${((.5 - y) * 2 * max).toFixed(2)}deg)`;
    card.style.setProperty("--fx", `${(x * 100).toFixed(1)}%`);
    card.style.setProperty("--fy", `${(y * 100).toFixed(1)}%`);
  });
  card.addEventListener("pointerleave", () => { card.style.transform = ""; });
}
