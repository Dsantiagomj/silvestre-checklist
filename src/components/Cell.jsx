import { memo, useEffect, useRef, useState } from "react";
import { ZONE_COLOR } from "../data/steps.js";
import { assetsFor, imgUrl } from "../lib/assets.js";
import { selectStep } from "../state/store.js";

export function cellLabel(s, done) {
  const icon = assetsFor(s.n)?.icon;
  const extra = icon ? ` — ${icon.label}` : "";
  return `Paso ${s.n} — ${s.zone}${extra}${done ? " — completado" : ""}`;
}

/** Celda del tablero. Pinta el sprite y resuelve su skeleton pase lo que pase. */
function Cell({ step, index, done, selected, dimmed, reveal }) {
  const icon = assetsFor(step.n)?.icon;
  // "loading" → "loaded" | "error". Sin arte la celda vuelve a su forma original, con el número grande.
  const [art, setArt] = useState(icon ? "loading" : "none");
  const [justCompleted, setJustCompleted] = useState(false);
  const wasDone = useRef(done);

  useEffect(() => {
    const before = wasDone.current;
    wasDone.current = done;
    if (before || !done) return;
    setJustCompleted(true);
    const t = setTimeout(() => setJustCompleted(false), 600);
    return () => clearTimeout(t);
  }, [done]);

  const cls = ["cell"];
  if (reveal) cls.push("reveal");
  if (done) cls.push("done");
  if (icon && art !== "error") cls.push("has-art");
  if (art === "loading") cls.push("loading");
  if (justCompleted) cls.push("just-completed");
  if (selected) cls.push("selected");
  if (dimmed) cls.push("dimmed");

  return (
    <button className={cls.join(" ")} data-n={step.n} style={{ "--zone-color": ZONE_COLOR[step.zone], "--i": index }}
      aria-label={cellLabel(step, done)} onClick={() => selectStep(step.n)}>
      <span className="num">{step.n}</span>
      {icon && art !== "error" && (
        <img className={"cell-art" + (art === "loaded" ? " loaded" : "")} loading="lazy" decoding="async"
          alt="" // decorativo: el aria-label de la celda ya lo describe
          src={imgUrl(icon.src)} onLoad={() => setArt("loaded")} onError={() => setArt("error")} />
      )}
    </button>
  );
}

export default memo(Cell);
